import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { verifySignedQR } from '@/lib/services/qrSecurity';
import { QRVerifyRequest, QRVerifyResponse } from '@/lib/qr/contract';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: 'جلسة العمل غير صالحة. يرجى تسجيل الدخول أولاً',
        errorCode: 'UNAUTHENTICATED',
      };
      return NextResponse.json(denied, { status: 401 });
    }

    const body: QRVerifyRequest = await request.json();

    if (!body || !body.token) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: 'رمز الـ QR مفقود في الطلب',
        errorCode: 'MALFORMED',
      };
      return NextResponse.json(denied, { status: 400 });
    }

    // 1. Cryptographic HMAC verification & 30s window check
    const verification = verifySignedQR(body.token, 30);

    if (!verification.valid || !verification.payload) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: verification.error || 'رمز الـ QR غير صالح أو منتهي الصلاحية',
        errorCode: verification.errorCode || 'INVALID_SIGNATURE',
      };
      return NextResponse.json(denied, { status: 400 });
    }

    const { gym_id, member_id, nonce } = verification.payload;

    // 2. Anti-Replay: Check if nonce already exists in public.qr_nonces
    const { data: existingNonce } = await supabase
      .from('qr_nonces')
      .select('nonce')
      .eq('nonce', nonce)
      .maybeSingle();

    if (existingNonce) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: 'تم استخدام رمز الـ QR هذا مسبقاً (هجوم إعادة استخدام مرفوض)',
        errorCode: 'REPLAY',
      };
      return NextResponse.json(denied, { status: 409 });
    }

    // 3. Insert nonce to block any replay attack permanently
    const { error: nonceInsertError } = await supabase
      .from('qr_nonces')
      .insert({
        nonce,
        gym_id,
        member_id,
        used_at: new Date().toISOString(),
      });

    if (nonceInsertError) {
      // If primary key collision occurred concurrently
      if (nonceInsertError.code === '23505') {
        const denied: QRVerifyResponse = {
          allowed: false,
          error: 'تم استخدام رمز الـ QR هذا في اللحظة ذاتها (محاولة تكرار)',
          errorCode: 'REPLAY',
        };
        return NextResponse.json(denied, { status: 409 });
      }
    }

    // 4. Verify member status in database
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, full_name, phone, status')
      .eq('id', member_id)
      .maybeSingle();

    if (memberErr || !member) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: 'لم يتم العثور على سجل المشترك في قاعدة البيانات',
        errorCode: 'INACTIVE_MEMBER',
      };
      return NextResponse.json(denied, { status: 200 });
    }

    if (member.status !== 'active') {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: `حساب المشترك غير نشط (الحالة الحالية: ${member.status})`,
        errorCode: 'INACTIVE_MEMBER',
      };
      return NextResponse.json(denied, { status: 200 });
    }

    // 5. Verify active subscription with end_date > now()
    const nowIso = new Date().toISOString();
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, end_date, status, plan:plans(name)')
      .eq('member_id', member_id)
      .eq('status', 'active')
      .gte('end_date', nowIso)
      .order('end_date', { ascending: false })
      .limit(1);

    const activeSub = subscriptions && subscriptions.length > 0 ? subscriptions[0] : null;

    if (!activeSub) {
      const denied: QRVerifyResponse = {
        allowed: false,
        error: 'لا يوجد اشتراك سارٍ لهذا المشترك أو انتهت مدة الاشتراك',
        errorCode: 'NO_SUBSCRIPTION',
      };
      return NextResponse.json(denied, { status: 200 });
    }

    // 6. Record successful entry into public.visits
    const { data: visitRecord, error: visitErr } = await supabase
      .from('visits')
      .insert({
        gym_id,
        member_id,
        branch_id: body.branch_id || null,
        scanned_by: user.id,
        method: 'qr',
        source: 'online',
        entered_at: nowIso,
      })
      .select('id')
      .single();

    const planName = (activeSub.plan as any)?.name || 'اشتراك رياضي';

    const allowedResponse: QRVerifyResponse = {
      allowed: true,
      member: {
        id: member.id,
        full_name: member.full_name,
        phone: member.phone,
      },
      subscription: {
        end_date: activeSub.end_date,
        plan_name: planName,
      },
      visit_id: visitRecord?.id || 'vis-recorded',
    };

    return NextResponse.json(allowedResponse, { status: 200 });
  } catch (err: any) {
    const errorResponse: QRVerifyResponse = {
      allowed: false,
      error: err.message || 'حدث خطأ تقني في التحقق من الرمز',
      errorCode: 'SERVER_ERROR',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
