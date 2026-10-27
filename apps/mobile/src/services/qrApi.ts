/**
 * Service API Mobile pour les opérations QR Code (HMAC-SHA256)
 * RÈGLE ABSOLUE : Jamais de secret local. Tout passe par l'API déployée.
 */

export interface QRTokenResponse {
  token: string;
  member_id: string;
  gym_id: string;
  expires_in: number;
  generated_at: string;
}

export interface FetchQRResult {
  success: boolean;
  data?: QRTokenResponse;
  error?: string;
}

export interface QRVerifyResult {
  ok: boolean;
  status: number;
  data?: any;
  error?: string;
}

export async function fetchSignedQRToken(memberId: string): Promise<FetchQRResult> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/api/qr?member_id=${encodeURIComponent(memberId)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errBody.error || `Erreur serveur (${response.status})`,
      };
    }

    const data: QRTokenResponse = await response.json();
    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'تعذر الاتصال بخادم الـ QR. تأكد من اتصال الإنترنت.',
    };
  }
}

export async function verifySignedQRToken(token: string, branchId?: string): Promise<QRVerifyResult> {
  try {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/api/qr/verify`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ token, branch_id: branchId }),
    });

    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 500,
      error: err.message || 'تعذر الاتصال بخادم التحقق من الـ QR.',
    };
  }
}
