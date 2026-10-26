import crypto from 'crypto';

export interface QRPayload {
  gym_id: string;
  member_id: string;
  timestamp: number; // in seconds
  nonce: string;
}

export interface SignedQRToken {
  payload: QRPayload;
  signature: string;
  token: string;
  expires_in_seconds: number;
}

export function getQRSecret(): string {
  const secret = process.env.QR_SIGNING_SECRET || process.env.NEXT_PUBLIC_QR_SIGNING_SECRET;
  if (!secret) {
    throw new Error('QR_SIGNING_SECRET is not configured on the server');
  }
  return secret;
}

/**
 * توليد رمز QR موقّع بـ HMAC-SHA256 مع نافذة صلاحية 30 ثانية ورقم Nonce فريد
 */
export function generateSignedQR(gymId: string, memberId: string): SignedQRToken {
  const secret = getQRSecret();
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();

  const dataToSign = `${gymId}:${memberId}:${timestamp}:${nonce}`;
  const signature = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

  const tokenPayload = {
    gym_id: gymId,
    member_id: memberId,
    timestamp,
    nonce,
    sig: signature,
  };

  const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');

  return {
    payload: { gym_id: gymId, member_id: memberId, timestamp, nonce },
    signature,
    token,
    expires_in_seconds: 30,
  };
}

export interface QRVerificationResult {
  valid: boolean;
  error?: string;
  errorCode?: 'EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED' | 'FUTURE_TIMESTAMP';
  payload?: QRPayload;
}

/**
 * التحقق الرياضي من صحة توقيع HMAC وصلاحية الـ 30 ثانية
 */
export function verifySignedQR(tokenString: string, allowedWindowSeconds = 30): QRVerificationResult {
  try {
    const secret = getQRSecret();
    const decodedStr = Buffer.from(tokenString, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decodedStr);

    const { gym_id, member_id, timestamp, nonce, sig } = parsed;

    if (!gym_id || !member_id || !timestamp || !nonce || !sig) {
      return { valid: false, error: 'رمز الـ QR غير مكتمل أو تالف', errorCode: 'MALFORMED' };
    }

    // 1. Verify HMAC Signature
    const dataToSign = `${gym_id}:${member_id}:${timestamp}:${nonce}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(dataToSign).digest('hex');

    // Constant-time comparison to prevent timing attacks
    const sigBuffer = Buffer.from(sig);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'توقيع رمز الـ QR غير صالح ومزوّر', errorCode: 'INVALID_SIGNATURE' };
    }

    // 2. Verify 30s Time Window
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const diff = currentTimestamp - Number(timestamp);

    // If generated more than 5s in the future (clock drift protection)
    if (diff < -5) {
      return { valid: false, error: 'توقيت رمز الـ QR غير متزامن مع الخادم', errorCode: 'FUTURE_TIMESTAMP' };
    }

    // If older than allowed window (default 30 seconds)
    if (diff > allowedWindowSeconds) {
      return {
        valid: false,
        error: `انتهت صلاحية رمز الـ QR (${diff} ثانية مضت، الحد الأقصى 30 ثانية)`,
        errorCode: 'EXPIRED',
      };
    }

    return {
      valid: true,
      payload: { gym_id, member_id, timestamp: Number(timestamp), nonce },
    };
  } catch {
    return { valid: false, error: 'فشل فك تشفير رمز الـ QR', errorCode: 'MALFORMED' };
  }
}
