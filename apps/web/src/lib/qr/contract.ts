/**
 * GymSaaS — QR Contract (Single Source of Truth)
 * Importé par : /api/qr/route.ts, /api/qr/verify/route.ts, /mobile, /dashboard/reception, tests vitest
 * Ne jamais dupliquer ces types ailleurs.
 */

/** Réponse de GET /api/qr?member_id=UUID */
export interface QRTokenResponse {
  token: string;
  member_id: string;
  gym_id: string;
  expires_in: 30;
  generated_at: string; // ISO 8601
}

/** Corps de POST /api/qr/verify */
export interface QRVerifyRequest {
  token: string;
  branch_id?: string;
}

/** Réponse de POST /api/qr/verify — allowed=true */
export interface QRVerifyAllowed {
  allowed: true;
  member: {
    id: string;
    full_name: string;
    phone: string;
  };
  subscription: {
    end_date: string;
    plan_name: string;
  };
  visit_id: string;
}

/** Réponse de POST /api/qr/verify — allowed=false */
export interface QRVerifyDenied {
  allowed: false;
  error: string;
  errorCode: 'EXPIRED' | 'INVALID_SIGNATURE' | 'MALFORMED' | 'FUTURE_TIMESTAMP' | 'REPLAY' | 'INACTIVE_MEMBER' | 'NO_SUBSCRIPTION' | 'UNAUTHENTICATED' | 'SERVER_ERROR';
}

export type QRVerifyResponse = QRVerifyAllowed | QRVerifyDenied;
