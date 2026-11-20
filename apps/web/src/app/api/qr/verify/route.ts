import { NextRequest, NextResponse } from 'next/server';
import { getRequestContext } from '@/lib/supabase/request';
import { verifySignedQR } from '@/lib/services/qrSecurity';
import { QRVerifyAllowed, QRVerifyDenied, QRVerifyRequest } from '@/lib/qr/contract';

function deny(status: number, errorCode: QRVerifyDenied['errorCode'], error: string) {
  const body: QRVerifyDenied = { allowed: false, error, errorCode };
  return NextResponse.json(body, { status });
}

/** Traduit toute erreur du RPC verify_and_record_visit en refus explicite (jamais d'entrée inventée). */
function mapRpcError(err: { code?: string; message?: string }) {
  const code = err.code ?? '';
  const msg = err.message ?? '';
  if (code === '23505' || msg.includes('REPLAY')) {
    return deny(409, 'REPLAY', 'تم استخدام رمز الـ QR هذا مسبقاً');
  }
  if (code === '42501') {
    if (msg.includes('GYM_SUSPENDED')) return deny(403, 'GYM_SUSPENDED', 'الصالة معلّقة');
    if (msg.includes('UNAUTHENTICATED')) return deny(401, 'UNAUTHENTICATED', 'جلسة العمل غير صالحة');
    return deny(403, 'FORBIDDEN', 'ليست لديك صلاحية مسح الرموز لهذه الصالة');
  }
  if (code === 'P0001') {
    if (msg.includes('NO_ACTIVE_SUBSCRIPTION')) return deny(200, 'NO_SUBSCRIPTION', 'لا يوجد اشتراك سارٍ لهذا المشترك أو انتهت مدته');
    return deny(200, 'INACTIVE_MEMBER', 'حساب المشترك غير نشط');
  }
  if (code === 'PGRST205' || code === 'PGRST202' || code === '42P01' || code === '42883') {
    return deny(503, 'SERVICE_UNAVAILABLE', 'خدمة التحقق غير مهيأة في قاعدة البيانات');
  }
  return deny(500, 'SERVER_ERROR', 'تعذر تسجيل الدخول؛ حاول مجدداً');
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, authError } = await getRequestContext(request);
    if (authError || !user) {
      return deny(401, 'UNAUTHENTICATED', 'جلسة العمل غير صالحة. يرجى تسجيل الدخول أولاً');
    }

    const body: QRVerifyRequest = await request.json().catch(() => null as any);
    if (!body || !body.token || typeof body.token !== 'string') {
      return deny(400, 'MALFORMED', 'رمز الـ QR مفقود في الطلب');
    }

    // HMAC (timingSafeEqual) + fenêtre de 30 s
    const verification = verifySignedQR(body.token, 30);
    if (!verification.valid || !verification.payload) {
      return deny(400, verification.errorCode || 'INVALID_SIGNATURE', verification.error || 'رمز الـ QR غير صالح أو منتهي الصلاحية');
    }
    const { member_id, nonce } = verification.payload;

    // Anti-rejeu, membre, abonnement et visite : une seule transaction côté base.
    const { data, error } = await supabase.rpc('verify_and_record_visit', {
      p_nonce: nonce,
      p_member_id: member_id,
      p_branch_id: body.branch_id ?? null,
    });
    if (error) return mapRpcError(error);

    const result = data as QRVerifyAllowed | null;
    if (!result || result.allowed !== true || !result.visit_id) {
      return deny(500, 'SERVER_ERROR', 'استجابة غير متوقعة من خدمة التحقق');
    }
    return NextResponse.json(result, { status: 200 });
  } catch {
    return deny(500, 'SERVER_ERROR', 'حدث خطأ تقني في التحقق من الرمز');
  }
}
