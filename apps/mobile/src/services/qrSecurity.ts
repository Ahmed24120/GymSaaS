import { SignedQRToken, VerificationResult, Member } from '../types';

// Mock DB of registered gym members (compatible with Supabase DB state)
export const mockMembersDB: Record<string, Member> = {
  'mem-001': {
    id: 'mem-001',
    gym_id: 'gym-001',
    gym_name: 'Gym SaaS Pilot (نواكشوط - تفرغ زينة)',
    branch_name: 'الفرع الرئيسي - تفرغ زينة',
    full_name: 'محمد الأمين ولد فال (عضو نشط)',
    phone: '+222 46 80 12 34',
    photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    plan_name: 'اشتراك ربع سنوي (3 أشهر)',
    end_date: '2026-11-30T23:59:59Z',
  },
  'mem-002': {
    id: 'mem-002',
    gym_id: 'gym-001',
    gym_name: 'Gym SaaS Pilot (نواكشوط - تفرغ زينة)',
    branch_name: 'الفرع الرئيسي - تفرغ زينة',
    full_name: 'أحمد ولد المختار (عضو نشط)',
    phone: '+222 36 15 24 33',
    photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    status: 'active',
    plan_name: 'اشتراك شهري عادي (1 شهر)',
    end_date: '2026-10-20T23:59:59Z',
  },
  'mem-003': {
    id: 'mem-003',
    gym_id: 'gym-001',
    gym_name: 'Gym SaaS Pilot (نواكشوط - تفرغ زينة)',
    branch_name: 'فرع لكصر (Ksar)',
    full_name: 'سيدي محمد ولد الشيخ (عضو منتهي)',
    phone: '+222 22 99 88 77',
    photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    status: 'expired',
    plan_name: 'اشتراك شهري عادي (منتهي)',
    end_date: '2026-09-30T23:59:59Z',
  },
  'mem-999': {
    id: 'mem-999',
    gym_id: 'gym-other-999', // صالة أخرى لاختبار عزل الصالات Multi-Tenant
    gym_name: 'صالة الرياضة الدولية (صالة أخرى)',
    branch_name: 'عرفات',
    full_name: 'عثمان ولد حبيب الله (صالة أخرى)',
    phone: '+222 49 11 22 33',
    photo_url: undefined,
    status: 'active',
    plan_name: 'اشتراك شهري',
    end_date: '2026-12-31T23:59:59Z',
  },
};

// Set to prevent QR replay attacks (Anti-Replay Nonce Cache)
const usedNoncesCache = new Set<string>();

const HMAC_SECRET_KEY = 'supabase-jwt-server-signed-secret-key-nkc';

/**
 * Basic pseudo-HMAC simulation for client/demo edge function
 */
function createSignature(payload: string): string {
  let hash = 0;
  const combined = payload + ':' + HMAC_SECRET_KEY;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sig_' + Math.abs(hash).toString(16);
}

/**
 * Generate a dynamic QR token valid for exactly 30 seconds
 * (Section 7.2 of AGENTS.md)
 */
export function generateDynamicQRToken(memberId: string, gymId: string): string {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 30; // 30 seconds validity
  const nonce = 'n_' + Math.random().toString(36).substring(2, 9) + '_' + now;

  const rawPayload = `${memberId}|${gymId}|${now}|${expiresAt}|${nonce}`;
  const signature = createSignature(rawPayload);

  const token: SignedQRToken = {
    member_id: memberId,
    gym_id: gymId,
    issued_at: now,
    expires_at: expiresAt,
    nonce: nonce,
    signature: signature,
  };

  return JSON.stringify(token);
}

/**
 * Server-Side Verification:
 * Validates signature, expiry, gym isolation, and anti-replay nonce
 */
export function verifyQRTokenServerSide(
  qrString: string,
  receptionistGymId: string
): VerificationResult {
  try {
    const token: SignedQRToken = JSON.parse(qrString);

    if (!token.member_id || !token.gym_id || !token.expires_at || !token.signature || !token.nonce) {
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
        message: 'بيانات رمز الـ QR غير مكتملة أو تالفة.',
      };
    }

    // 1. Verify Signature
    const rawPayload = `${token.member_id}|${token.gym_id}|${token.issued_at}|${token.expires_at}|${token.nonce}`;
    const expectedSignature = createSignature(rawPayload);

    if (token.signature !== expectedSignature) {
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
        message: 'التوقيع الرقمي للرمز مزور أو تم التلاعب به.',
      };
    }

    // 2. Check Expiration (~30s window)
    const now = Math.floor(Date.now() / 1000);
    if (now > token.expires_at) {
      return {
        valid: false,
        code: 'EXPIRED_TOKEN',
        message: 'انتهت صلاحية رمز الـ QR المؤقت (تجاوز 30 ثانية). يرجى تحديث الرمز.',
      };
    }

    // 3. Multi-Tenant Check: Member must belong to this gym
    if (token.gym_id !== receptionistGymId) {
      return {
        valid: false,
        code: 'WRONG_GYM',
        message: 'عذراً! هذا العضو مسجل في صالة رياضية أخرى ولا ينتمي لهذه الصالة.',
      };
    }

    // 4. Anti-Replay Check (Nonce)
    if (usedNoncesCache.has(token.nonce)) {
      return {
        valid: false,
        code: 'REPLAY_ATTACK',
        message: 'تم استخدام هذا الرمز من قبل مسبقاً (محاولة إعادة استخدام مرفوضة).',
      };
    }
    // Mark nonce as consumed
    usedNoncesCache.add(token.nonce);

    // 5. Check Member Record & Subscription Status
    const member = mockMembersDB[token.member_id];
    if (!member) {
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
        message: 'لم يتم العثور على سجل العضو في قاعدة البيانات.',
      };
    }

    if (member.status !== 'active') {
      return {
        valid: false,
        code: 'EXPIRED_SUBSCRIPTION',
        message: `اشتراك العضو منتهي الصلاحية بتاريخ ${new Date(member.end_date).toLocaleDateString('ar-MR')}.`,
        member: member,
      };
    }

    // 6. Success: Entry Recorded
    return {
      valid: true,
      code: 'SUCCESS',
      message: 'تم التحقق بنجاح وتوثيق حركة الدخول في جدول الزيارات.',
      member: member,
      visit_time: new Date().toLocaleTimeString('ar-MR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    };
  } catch (err) {
    return {
      valid: false,
      code: 'INVALID_SIGNATURE',
      message: 'صيغة رمز الـ QR غير صالحة للقراءة.',
    };
  }
}
