import { SignedQRToken, VerificationResult, Member } from '../types';
import { verifySignedQRToken } from './qrApi';

/**
 * Service de sécurité QR Mobile
 * RÈGLE ABSOLUE : Le pseudo-HMAC local et tout secret ont été supprimés.
 * Les jetons sont générés exclusivement par le serveur web Next.js via GET /api/qr.
 */

/**
 * Vérification côté serveur via l'API REST de GymSaaS
 */
export async function verifyQRTokenViaAPI(
  qrString: string,
  branchId?: string
): Promise<VerificationResult> {
  try {
    const res = await verifySignedQRToken(qrString, branchId);

    if (res.ok && res.data?.allowed) {
      const allowedData = res.data;
      const member: Member = {
        id: allowedData.member?.id || '',
        gym_id: '',
        gym_name: 'GymSaaS Gym',
        branch_name: 'الفرع الرئيسي',
        full_name: allowedData.member?.full_name || '',
        phone: allowedData.member?.phone || '',
        status: 'active',
        plan_name: allowedData.subscription?.plan_name || 'اشتراك رياضي',
        end_date: allowedData.subscription?.end_date || '',
      };

      return {
        valid: true,
        code: 'SUCCESS',
        message: 'تم التحقق بنجاح وتوثيق حركة الدخول في جدول الزيارات.',
        member,
        visit_time: new Date().toLocaleTimeString('ar-MR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      };
    }

    const errCode = res.data?.errorCode || 'INVALID_SIGNATURE';
    let code: VerificationResult['code'] = 'INVALID_SIGNATURE';
    if (errCode === 'EXPIRED') code = 'EXPIRED_TOKEN';
    else if (errCode === 'NO_SUBSCRIPTION') code = 'EXPIRED_SUBSCRIPTION';
    else if (errCode === 'REPLAY') code = 'REPLAY_ATTACK';

    return {
      valid: false,
      code,
      message: res.data?.error || 'فشل التحقق من رمز الـ QR',
    };
  } catch (err: any) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: err.message || 'خطأ في الاتصال بخادم التحقق',
    };
  }
}
