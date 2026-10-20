import { Gym, Branch, Member, Plan, Subscription, Payment, Visit, AuditLog } from '@/types/database';

export const mockGym: Gym = {
  id: 'gym-001',
  name: 'Gym SaaS Pilot (نواكشوط - تفرغ زينة)',
  slug: 'gym-saas-pilot',
  city: 'Nouakchott (تفرغ زينة)',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

export const mockBranches: Branch[] = [
  {
    id: 'br-001',
    gym_id: 'gym-001',
    name: 'الفرع الرئيسي - تفرغ زينة (Pilot)',
    address: 'شارع المختار ولد داداه، تفرغ زينة، نواكشوط',
    phone: '+222 45 25 10 20',
    is_main: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'br-002',
    gym_id: 'gym-001',
    name: 'فرع لكصر (Ksar)',
    address: 'قرب كارفور ولد اماه، لكصر، نواكشوط',
    phone: '+222 45 29 30 40',
    is_main: false,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z'
  }
];

export const mockPlans: Plan[] = [
  {
    id: 'plan-001',
    gym_id: 'gym-001',
    name: 'اشتراك شهري عادي (1 شهر)',
    description: 'دخول يومي غير محدود مع استخدام كامل الأجهزة وغرفة الساونا',
    duration_days: 30,
    price_mru: 1500, // أوقية جديدة
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'plan-002',
    gym_id: 'gym-001',
    name: 'اشتراك ربع سنوي (3 أشهر)',
    description: 'توفير 11% + قياسات مجانية شهرية للدهون والعضلات',
    duration_days: 90,
    price_mru: 4000,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'plan-003',
    gym_id: 'gym-001',
    name: 'اشتراك سنوي ذهبي (12 شهر)',
    description: 'العرض الأوفر مع تجميد مجاني لمدة شهر ومتابعة مدرب خاص',
    duration_days: 365,
    price_mru: 14000,
    active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  }
];

export const mockMembers: Member[] = [
  {
    id: 'mem-001',
    gym_id: 'gym-001',
    branch_id: 'br-001',
    user_id: 'usr-001',
    full_name: 'محمد الأمين ولد فال (عضو نشط)',
    phone: '+222 46 80 12 34',
    photo_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    status: 'active',
    created_at: '2026-08-10T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
    active_subscription: {
      id: 'sub-001',
      gym_id: 'gym-001',
      member_id: 'mem-001',
      plan_id: 'plan-002',
      start_date: '2026-09-01T00:00:00Z',
      end_date: '2026-11-30T23:59:59Z',
      status: 'active',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
      plan: {
        id: 'plan-002',
        gym_id: 'gym-001',
        name: 'اشتراك ربع سنوي (3 أشهر)',
        description: 'توفير 11%',
        duration_days: 90,
        price_mru: 4000,
        active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    }
  },
  {
    id: 'mem-002',
    gym_id: 'gym-001',
    branch_id: 'br-001',
    user_id: null,
    full_name: 'أحمد ولد المختار (عضو نشط)',
    phone: '+222 36 15 24 33',
    photo_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    status: 'active',
    created_at: '2026-09-20T12:00:00Z',
    updated_at: '2026-09-20T12:00:00Z',
    active_subscription: {
      id: 'sub-002',
      gym_id: 'gym-001',
      member_id: 'mem-002',
      plan_id: 'plan-001',
      start_date: '2026-09-20T00:00:00Z',
      end_date: '2026-10-20T23:59:59Z',
      status: 'active',
      created_at: '2026-09-20T00:00:00Z',
      updated_at: '2026-09-20T00:00:00Z',
      plan: {
        id: 'plan-001',
        gym_id: 'gym-001',
        name: 'اشتراك شهري عادي (1 شهر)',
        description: 'دخول يومي',
        duration_days: 30,
        price_mru: 1500,
        active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    }
  },
  {
    id: 'mem-003',
    gym_id: 'gym-001',
    branch_id: 'br-002',
    user_id: null,
    full_name: 'سيدي محمد ولد الشيخ (عضو منتهي)',
    phone: '+222 22 99 88 77',
    photo_path: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
    status: 'expired',
    created_at: '2026-07-01T14:30:00Z',
    updated_at: '2026-10-01T00:00:00Z',
    active_subscription: {
      id: 'sub-003',
      gym_id: 'gym-001',
      member_id: 'mem-003',
      plan_id: 'plan-001',
      start_date: '2026-08-30T00:00:00Z',
      end_date: '2026-09-30T23:59:59Z',
      status: 'expired',
      created_at: '2026-08-30T00:00:00Z',
      updated_at: '2026-09-30T23:59:59Z',
      plan: {
        id: 'plan-001',
        gym_id: 'gym-001',
        name: 'اشتراك شهري عادي (1 شهر)',
        description: 'دخول يومي',
        duration_days: 30,
        price_mru: 1500,
        active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    }
  },
  {
    id: 'mem-004',
    gym_id: 'gym-001',
    branch_id: 'br-001',
    user_id: 'usr-004',
    full_name: 'فاطمة بنت أحمدو (عضو سنوي نشط)',
    phone: '+222 41 23 45 67',
    photo_path: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    status: 'active',
    created_at: '2026-05-15T09:00:00Z',
    updated_at: '2026-05-15T09:00:00Z',
    active_subscription: {
      id: 'sub-004',
      gym_id: 'gym-001',
      member_id: 'mem-004',
      plan_id: 'plan-003',
      start_date: '2026-05-15T00:00:00Z',
      end_date: '2027-05-15T23:59:59Z',
      status: 'active',
      created_at: '2026-05-15T00:00:00Z',
      updated_at: '2026-05-15T00:00:00Z',
      plan: {
        id: 'plan-003',
        gym_id: 'gym-001',
        name: 'اشتراك سنوي ذهبي (12 شهر)',
        description: 'العرض الأوفر',
        duration_days: 365,
        price_mru: 14000,
        active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z'
      }
    }
  }
];

export const mockPayments: Payment[] = [
  {
    id: 'pay-001',
    gym_id: 'gym-001',
    member_id: 'mem-001',
    subscription_id: 'sub-001',
    amount_mru: 4000,
    method: 'bankily',
    transaction_ref: 'BNK-9823412',
    recorded_by: 'usr-admin',
    status: 'completed',
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: '2026-09-01T10:15:00Z'
  },
  {
    id: 'pay-002',
    gym_id: 'gym-001',
    member_id: 'mem-002',
    subscription_id: 'sub-002',
    amount_mru: 1500,
    method: 'cash',
    transaction_ref: null,
    recorded_by: 'usr-receptionist',
    status: 'completed',
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: '2026-09-20T16:40:00Z'
  },
  {
    id: 'pay-003',
    gym_id: 'gym-001',
    member_id: 'mem-004',
    subscription_id: 'sub-004',
    amount_mru: 14000,
    method: 'masrvi',
    transaction_ref: 'MSR-773120',
    recorded_by: 'usr-admin',
    status: 'completed',
    cancelled_by: null,
    cancelled_at: null,
    cancellation_reason: null,
    created_at: '2026-05-15T09:30:00Z'
  },
  {
    id: 'pay-004',
    gym_id: 'gym-001',
    member_id: 'mem-002',
    subscription_id: 'sub-002',
    amount_mru: 1500,
    method: 'sedad',
    transaction_ref: 'SDD-44102',
    recorded_by: 'usr-receptionist',
    status: 'cancelled',
    cancelled_by: 'usr-admin',
    cancelled_at: '2026-09-21T10:00:00Z',
    cancellation_reason: 'تم التكرار عن طريق الخطأ واسترجاع المبلغ للعميل نقداً',
    created_at: '2026-09-21T09:00:00Z'
  }
];

export const mockVisits: Visit[] = [
  {
    id: 'vis-001',
    gym_id: 'gym-001',
    member_id: 'mem-001',
    branch_id: 'br-001',
    scanned_by: 'usr-receptionist',
    entered_at: '2026-10-11T08:30:00Z',
    method: 'qr',
    source: 'online',
    created_at: '2026-10-11T08:30:00Z'
  },
  {
    id: 'vis-002',
    gym_id: 'gym-001',
    member_id: 'mem-002',
    branch_id: 'br-001',
    scanned_by: 'usr-receptionist',
    entered_at: '2026-10-11T09:15:00Z',
    method: 'qr',
    source: 'online',
    created_at: '2026-10-11T09:15:00Z'
  },
  {
    id: 'vis-003',
    gym_id: 'gym-001',
    member_id: 'mem-004',
    branch_id: 'br-001',
    scanned_by: 'usr-receptionist',
    entered_at: '2026-10-11T10:05:00Z',
    method: 'manual',
    source: 'online',
    created_at: '2026-10-11T10:05:00Z'
  },
  {
    id: 'vis-004',
    gym_id: 'gym-001',
    member_id: 'mem-001',
    branch_id: 'br-001',
    scanned_by: 'usr-receptionist',
    entered_at: '2026-10-12T07:45:00Z',
    method: 'qr',
    source: 'online',
    created_at: '2026-10-12T07:45:00Z'
  },
  {
    id: 'vis-005',
    gym_id: 'gym-001',
    member_id: 'mem-002',
    branch_id: 'br-001',
    scanned_by: 'usr-receptionist',
    entered_at: '2026-10-12T18:20:00Z',
    method: 'qr',
    source: 'online',
    created_at: '2026-10-12T18:20:00Z'
  }
];

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'aud-001',
    gym_id: 'gym-001',
    actor_id: 'usr-admin',
    action: 'CREATE_MEMBER',
    entity: 'members',
    entity_id: 'mem-001',
    before: null,
    after: { full_name: 'محمد الأمين ولد فال', phone: '+222 46 80 12 34', status: 'active' },
    created_at: '2026-08-10T10:00:00Z'
  },
  {
    id: 'aud-002',
    gym_id: 'gym-001',
    actor_id: 'usr-admin',
    action: 'RECORD_PAYMENT',
    entity: 'payments',
    entity_id: 'pay-001',
    before: null,
    after: { amount_mru: 4000, method: 'bankily', status: 'completed' },
    created_at: '2026-09-01T10:15:00Z'
  },
  {
    id: 'aud-003',
    gym_id: 'gym-001',
    actor_id: 'usr-admin',
    action: 'CANCEL_PAYMENT',
    entity: 'payments',
    entity_id: 'pay-004',
    before: { status: 'completed' },
    after: { status: 'cancelled', cancellation_reason: 'تم التكرار عن طريق الخطأ واسترجاع المبلغ للعميل نقداً' },
    created_at: '2026-09-21T10:00:00Z'
  },
  {
    id: 'aud-004',
    gym_id: 'gym-001',
    actor_id: 'usr-receptionist',
    action: 'QR_CHECKIN',
    entity: 'visits',
    entity_id: 'vis-001',
    before: null,
    after: { member_id: 'mem-001', method: 'qr', source: 'online' },
    created_at: '2026-10-11T08:30:00Z'
  },
  {
    id: 'aud-005',
    gym_id: 'gym-001',
    actor_id: 'usr-admin',
    action: 'UPDATE_PLAN_PRICE',
    entity: 'plans',
    entity_id: 'plan-001',
    before: { price_mru: 1400 },
    after: { price_mru: 1500 },
    created_at: '2026-01-01T00:00:00Z'
  }
];

export const mockDashboardMetrics = {
  totalMembers: 148,
  activeMembers: 116,
  expiredMembers: 24,
  expiringSoon: 8,
  todayVisits: 42,
  todayRevenueMRU: 5500, // أوقية جديدة
  monthlyRevenueMRU: 86500, // أوقية جديدة
  currency: 'MRU'
};

// Seed credentials for Pilot Release testing
export const pilotTestAccounts = {
  gym_owner: {
    email: 'owner@gymsaas.mr',
    password: 'password123',
    role: 'gym_owner',
    title: 'المدير العام (مالك الصالة)'
  },
  receptionist: {
    email: 'reception@gymsaas.mr',
    password: 'password123',
    role: 'receptionist',
    title: 'موظف الاستقبال والمبيعات'
  },
  super_admin: {
    email: 'admin@gymsaas.mr',
    password: 'password123',
    role: 'super_admin',
    title: 'مدير المنصة العام'
  }
};
