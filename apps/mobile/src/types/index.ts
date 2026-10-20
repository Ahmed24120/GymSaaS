export type MemberStatus = 'active' | 'inactive' | 'expired';

export interface Member {
  id: string;
  gym_id: string;
  gym_name: string;
  branch_name: string;
  full_name: string;
  phone: string;
  photo_url?: string;
  status: MemberStatus;
  plan_name: string;
  end_date: string;
}

export interface SignedQRToken {
  member_id: string;
  gym_id: string;
  issued_at: number;
  expires_at: number;
  nonce: string;
  signature: string;
}

export interface VerificationResult {
  valid: boolean;
  code: 'SUCCESS' | 'EXPIRED_TOKEN' | 'EXPIRED_SUBSCRIPTION' | 'WRONG_GYM' | 'REPLAY_ATTACK' | 'INVALID_SIGNATURE';
  message: string;
  member?: Member;
  visit_time?: string;
}
