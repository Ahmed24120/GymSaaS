export type GymStatus = 'trial' | 'active' | 'suspended';
export type UserLanguage = 'ar' | 'fr';
export type StaffRole = 'gym_owner' | 'receptionist';
export type MemberStatus = 'active' | 'inactive' | 'expired';
export type SubscriptionStatus = 'active' | 'expired' | 'paused' | 'cancelled';
export type PaymentMethod = 'cash' | 'bankily' | 'masrvi' | 'sedad';
export type PaymentStatus = 'completed' | 'cancelled';
export type VisitMethod = 'qr' | 'manual';
export type VisitSource = 'online' | 'offline_sync';
export type NotificationType = 'expiry_warning' | 'announcement' | 'general' | 'welcome';

export interface Gym {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  status: GymStatus;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  gym_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_main: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  language: UserLanguage;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface GymStaff {
  id: string;
  gym_id: string;
  user_id: string;
  branch_id: string | null;
  role: StaffRole;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface Member {
  id: string;
  gym_id: string;
  branch_id: string | null;
  user_id: string | null;
  full_name: string;
  phone: string;
  photo_path: string | null;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  active_subscription?: Subscription | null;
}

export interface Plan {
  id: string;
  gym_id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price_mru: number; // Integer MRU only
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
  plan?: Plan;
  member?: Member;
}

export interface Payment {
  id: string;
  gym_id: string;
  member_id: string;
  subscription_id: string | null;
  amount_mru: number; // Integer MRU
  method: PaymentMethod;
  transaction_ref: string | null;
  recorded_by: string;
  status: PaymentStatus;
  cancelled_by: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  member?: Member;
  recorder_profile?: Profile;
  canceller_profile?: Profile;
}

export interface Visit {
  id: string;
  gym_id: string;
  member_id: string;
  branch_id: string | null;
  scanned_by: string | null;
  entered_at: string;
  method: VisitMethod;
  source: VisitSource;
  created_at: string;
  member?: Member;
}

export interface AuditLog {
  id: string;
  gym_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string;
  before: Record<string, any> | null;
  after: Record<string, any> | null;
  created_at: string;
  actor_profile?: Profile;
}
