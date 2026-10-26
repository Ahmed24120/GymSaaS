import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { generateSignedQR } from '@/lib/services/qrSecurity';
import { QRTokenResponse } from '@/lib/qr/contract';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'غير مصرّح بالدخول. يرجى تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    let memberId = searchParams.get('member_id');

    // If no member_id provided in query param, find member linked to user
    if (!memberId) {
      // Check if user is staff or member
      const { data: staffMember } = await supabase
        .from('gym_staff')
        .select('gym_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (staffMember) {
        // Find first active member in this gym
        const { data: firstMember } = await supabase
          .from('members')
          .select('id')
          .eq('gym_id', staffMember.gym_id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (firstMember) {
          memberId = firstMember.id;
        }
      }
    }

    if (!memberId) {
      return NextResponse.json(
        { error: 'معرّف المشترك (member_id) مطلوب لتوليد رمز الـ QR' },
        { status: 400 }
      );
    }

    // Query member
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, gym_id, full_name, status')
      .eq('id', memberId)
      .maybeSingle();

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'لم يتم العثور على بيانات المشترك' },
        { status: 404 }
      );
    }

    // Generate HMAC-SHA256 token with 30s rotation window
    const signedQR = generateSignedQR(member.gym_id, member.id);

    const response: QRTokenResponse = {
      token: signedQR.token,
      member_id: member.id,
      gym_id: member.gym_id,
      expires_in: 30,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'حدث خطأ في توليد رمز الـ QR' },
      { status: 500 }
    );
  }
}
