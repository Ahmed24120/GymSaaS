-- ==============================================================================
-- GymSaaS Pilot Seed Data (Nouakchott, Mauritanie)
-- Location: Tevragh Zeina & Ksar
-- Reference: AGENTS.md
-- ==============================================================================

-- 1. Insert Pilot Gym
INSERT INTO public.gyms (id, name, slug, city, status)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Gym SaaS Pilot (نواكشوط - تفرغ زينة)',
    'gym-saas-pilot',
    'Nouakchott (تفرغ زينة)',
    'active'
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert Pilot Branches
INSERT INTO public.branches (id, gym_id, name, address, phone, is_main)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'الفرع الرئيسي - تفرغ زينة (Pilot)',
    'شارع المختار ولد داداه، تفرغ زينة، نواكشوط',
    '+222 45 25 10 20',
    true
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'فرع لكصر (Ksar)',
    'قرب كارفور ولد اماه، لكصر، نواكشوط',
    '+222 45 29 30 40',
    false
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert Subscription Plans (Integer MRU)
INSERT INTO public.plans (id, gym_id, name, description, duration_days, price_mru, active)
VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'اشتراك شهري عادي (1 شهر)',
    'دخول يومي غير محدود مع استخدام كامل الأجهزة وغرفة الساونا',
    30,
    1500,
    true
),
(
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'اشتراك ربع سنوي (3 أشهر)',
    'توفير 11% + قياسات مجانية شهرية للدهون والعضلات',
    90,
    4000,
    true
),
(
    'c0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'اشتراك سنوي ذهبي (12 شهر)',
    'العرض الأوفر مع تجميد مجاني لمدة شهر ومتابعة مدرب خاص',
    365,
    14000,
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert Pilot Members (One Active, One Expired)
INSERT INTO public.members (id, gym_id, branch_id, full_name, phone, status)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'محمد الأمين ولد فال (عضو نشط)',
    '+222 46 80 12 34',
    'active'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'سيدي محمد ولد الشيخ (عضو منتهي)',
    '+222 22 99 88 77',
    'expired'
) ON CONFLICT (id) DO NOTHING;

-- 5. Subscriptions
INSERT INTO public.subscriptions (id, gym_id, member_id, plan_id, start_date, end_date, status)
VALUES
(
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000002',
    timezone('utc'::text, now() - interval '10 days'),
    timezone('utc'::text, now() + interval '80 days'),
    'active'
),
(
    'e0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    timezone('utc'::text, now() - interval '40 days'),
    timezone('utc'::text, now() - interval '10 days'),
    'expired'
) ON CONFLICT (id) DO NOTHING;
