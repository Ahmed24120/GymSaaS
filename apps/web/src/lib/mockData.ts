import {
  Gym,
  Branch,
  Member,
  Plan,
  Subscription,
  Payment,
  Visit,
  AuditLog,
  PlatformSubscription,
  Advertisement,
  GymStaff,
  Profile
} from '@/types/database';


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

// ==============================================================================
// بيانات صاحب المنصة (Super Admin Datasets - الشاشات: 2، 17، 21)
// ==============================================================================

export const mockGymsList: Gym[] = [
  {
    id: 'gym-001',
    name: 'صالة النخبة للرياضة والرشاقة (Elite Gym)',
    slug: 'elite-gym',
    city: 'نواكشوط (تفرغ زينة)',
    status: 'active',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z'
  },
  {
    id: 'gym-002',
    name: 'صالة القوة الحديدية (Iron Fitness)',
    slug: 'iron-fitness',
    city: 'نواكشوط (لكصر)',
    status: 'active',
    created_at: '2026-02-15T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z'
  },
  {
    id: 'gym-003',
    name: 'مركز الأبطال الرياضي (Champions Center)',
    slug: 'champions-center',
    city: 'نواكشوط (عرفات)',
    status: 'active',
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z'
  },
  {
    id: 'gym-004',
    name: 'نادي تفرغ زينة للياقة (TZ Fitness Club)',
    slug: 'tz-fitness-club',
    city: 'نواكشوط (تفرغ زينة)',
    status: 'active',
    created_at: '2026-04-10T00:00:00Z',
    updated_at: '2026-04-10T00:00:00Z'
  },
  {
    id: 'gym-005',
    name: 'أكاديمية الساحل الرياضية (Sahel Gym)',
    slug: 'sahel-gym',
    city: 'نواذيبو (المنطقة الحرة)',
    status: 'trial',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  },
  {
    id: 'gym-006',
    name: 'مركز السبخة لبناء الأجسام',
    slug: 'sebkha-bodybuilding',
    city: 'نواكشوط (السبخة)',
    status: 'suspended',
    created_at: '2026-01-20T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z'
  }
];

export const mockPlatformSubscriptions: PlatformSubscription[] = [
  {
    id: 'ps-001',
    gym_id: 'gym-001',
    amount: 3000, // 3,000 MRU شهرياً للمنصة
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-10-31T23:59:59Z',
    status: 'active',
    gym: mockGymsList[0]
  },
  {
    id: 'ps-002',
    gym_id: 'gym-002',
    amount: 3000,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-10-31T23:59:59Z',
    status: 'active',
    gym: mockGymsList[1]
  },
  {
    id: 'ps-003',
    gym_id: 'gym-003',
    amount: 3000,
    start_date: '2026-10-05T00:00:00Z',
    end_date: '2026-11-04T23:59:59Z',
    status: 'active',
    gym: mockGymsList[2]
  },
  {
    id: 'ps-004',
    gym_id: 'gym-004',
    amount: 3000,
    start_date: '2026-09-15T00:00:00Z',
    end_date: '2026-10-14T23:59:59Z',
    status: 'suspended',
    gym: mockGymsList[3]
  },
  {
    id: 'ps-005',
    gym_id: 'gym-005',
    amount: 0,
    start_date: '2026-10-01T00:00:00Z',
    end_date: '2026-10-31T23:59:59Z',
    status: 'trial',
    gym: mockGymsList[4]
  }
];

export const mockSuperAdminMetrics = {
  totalGyms: 14,
  activeGyms: 11,
  trialGyms: 2,
  suspendedGyms: 1,
  totalPlatformMembers: 1248,
  monthlyPlatformRevenueMRU: 33000, // 11 active gyms * 3,000 MRU
  platformFeePerGymMRU: 3000,
  activeAdsCount: 4
};

export const mockAdvertisements: Advertisement[] = [
  {
    id: 'ad-001',
    title: 'تطبيق بنكيلي — ادفع اشتراكك الرياضي فوراً وبأمان',
    content: 'ادفع اشتراك الصالة عبر بنكيلي واستفد من سحوبات شهرية على اشتراكات مجانية!',
    image_url: 'https://images.unsplash.com/photo-1556742049-0a67e5572293?w=800',
    link_url: 'https://bankily.mr',
    start_date: '2026-10-01',
    end_date: '2026-11-30',
    status: 'active',
    advertiser: 'بنك المعاملات الإسلامية (BIM - Bankily)',
    views_count: 3420,
    clicks_count: 418
  },
  {
    id: 'ad-002',
    title: 'بروتين ومكملات صحية معتمدة — متجر فتنس نواكشوط',
    content: 'خصم 15% لمشتركي منصة GymSaaS على مكملات Whey Protein والكرياتين الأصلية.',
    image_url: 'https://images.unsplash.com/photo-1579722821273-0f6c7d44362f?w=800',
    link_url: 'https://fitness-nouakchott.mr',
    start_date: '2026-09-15',
    end_date: '2026-10-31',
    status: 'active',
    advertiser: 'Fitness Nutrition Mauritanie',
    views_count: 5120,
    clicks_count: 890
  },
  {
    id: 'ad-003',
    title: 'عصير طبيعي 100% بعد التمرين — ركن الطاقة',
    content: 'استمتع بمشروب البروتين الطبيعي الطازج بعد كل تمرين عند فرع تفرغ زينة.',
    image_url: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
    start_date: '2026-10-10',
    end_date: '2026-11-10',
    status: 'active',
    advertiser: 'ركن الطاقة والعصائر الطبيعية',
    views_count: 1840,
    clicks_count: 215
  }
];

export const mockStaffList: GymStaff[] = [
  {
    id: 'stf-001',
    gym_id: 'gym-001',
    user_id: 'usr-admin',
    branch_id: 'br-001',
    role: 'gym_owner',
    permissions: {
      can_manage_members: true,
      can_manage_plans: true,
      can_cancel_payments: true,
      can_view_audit_logs: true,
      can_manage_staff: true,
      can_export_reports: true
    },
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    profile: {
      id: 'usr-admin',
      full_name: 'أحمد سالم ولد المصطفى',
      phone: '+222 45 00 11 22',
      language: 'ar',
      is_super_admin: false,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    }
  },
  {
    id: 'stf-002',
    gym_id: 'gym-001',
    user_id: 'usr-receptionist',
    branch_id: 'br-001',
    role: 'receptionist',
    permissions: {
      can_manage_members: true,
      can_manage_plans: false, // لا يمكنه تغيير الأسعار طبقاً لـ AGENTS.md
      can_cancel_payments: false, // لا يمكنه إلغاء المدفوعات نهائياً
      can_view_audit_logs: false,
      can_manage_staff: false,
      can_export_reports: false
    },
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    profile: {
      id: 'usr-receptionist',
      full_name: 'مريم بنت المختار (موظفة استقبال)',
      phone: '+222 46 12 34 56',
      language: 'ar',
      is_super_admin: false,
      created_at: '2026-02-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z'
    }
  },
  {
    id: 'stf-003',
    gym_id: 'gym-001',
    user_id: 'usr-rec-2',
    branch_id: 'br-002',
    role: 'receptionist',
    permissions: {
      can_manage_members: true,
      can_manage_plans: false,
      can_cancel_payments: false,
      can_view_audit_logs: false,
      can_manage_staff: false,
      can_export_reports: false
    },
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    profile: {
      id: 'usr-rec-2',
      full_name: 'يعقوب ولد سيدي (استقبال فرع لكصر)',
      phone: '+222 47 88 99 00',
      language: 'ar',
      is_super_admin: false,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-01T00:00:00Z'
    }
  }
];

