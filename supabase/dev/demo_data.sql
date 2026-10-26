-- ==============================================================================
-- GymSaaS — Demo Realistic Data (Mauritanian Seed: 40 Members, Visits & Payments)
-- IDEMPOTENT: Uses ON CONFLICT / deterministic UUIDs
-- WARNING: DO NOT EXECUTE WITHOUT USER CONFIRMATION!
-- Target Gym: a0000000-0000-0000-0000-000000000001 (Elite Gym Tevragh Zeina)
-- ==============================================================================

DO $$
DECLARE
    v_gym_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_branch_id UUID := 'b0000000-0000-0000-0000-000000000001';
    v_admin_id UUID := '00000000-0000-0000-0000-000000000001';
    v_plan_monthly UUID := 'c0000000-0000-0000-0000-000000000001';
    v_plan_quarterly UUID := 'c0000000-0000-0000-0000-000000000002';
    v_plan_annual UUID := 'c0000000-0000-0000-0000-000000000003';
BEGIN
    -- 1. Insert 40 Mauritanian Members
    INSERT INTO public.members (id, gym_id, branch_id, full_name, phone, status, notes)
    VALUES
        ('d0000000-0000-0000-0000-000000000001', v_gym_id, v_branch_id, 'محمد الأمين ولد فال', '45112233', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000002', v_gym_id, v_branch_id, 'فاطمة بنت الشيخ', '36224455', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000003', v_gym_id, v_branch_id, 'سيدي ولد اعلي', '22998877', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000004', v_gym_id, v_branch_id, 'مريم بنت المختار', '41223344', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000005', v_gym_id, v_branch_id, 'عبد الله ولد بونا', '33445566', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000006', v_gym_id, v_branch_id, 'عائشة بنت أحمد', '26778899', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000007', v_gym_id, v_branch_id, 'إبراهيم ولد السالك', '48123456', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000008', v_gym_id, v_branch_id, 'زينب بنت محمد محمود', '37894512', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000009', v_gym_id, v_branch_id, 'المختار ولد داداه', '27456789', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000010', v_gym_id, v_branch_id, 'خديجة بنت الحضرامي', '49654321', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000011', v_gym_id, v_branch_id, 'الحسن ولد بلال', '32112244', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000012', v_gym_id, v_branch_id, 'سلمى بنت البشير', '22338811', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000013', v_gym_id, v_branch_id, 'أحمد ولد المصطفى', '46771122', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000014', v_gym_id, v_branch_id, 'ميمونة بنت سيدي', '38992233', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000015', v_gym_id, v_branch_id, 'عمر ولد الشيخ أحمد', '29114455', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000016', v_gym_id, v_branch_id, 'هند بنت محمد عالي', '44883322', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000017', v_gym_id, v_branch_id, 'ببكر ولد محمد', '34556677', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000018', v_gym_id, v_branch_id, 'منى بنت سيدي عثمان', '24667788', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000019', v_gym_id, v_branch_id, 'محمد محمود ولد بيه', '47118899', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000020', v_gym_id, v_branch_id, 'توتو بنت بلال', '36227766', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000021', v_gym_id, v_branch_id, 'الشيخ ولد عبد الرحمن', '23441199', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000022', v_gym_id, v_branch_id, 'لالة بنت اعمر', '42558833', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000023', v_gym_id, v_branch_id, 'سعد بوه ولد الشيخ', '39113355', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000024', v_gym_id, v_branch_id, 'أم كلثوم بنت المامي', '28776644', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000025', v_gym_id, v_branch_id, 'يعقوب ولد حمود', '45992211', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000026', v_gym_id, v_branch_id, 'آمنة بنت محمدن', '33884422', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000027', v_gym_id, v_branch_id, 'جمال ولد حبيب', '25661133', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000028', v_gym_id, v_branch_id, 'سارة بنت حمادي', '41337788', 'active', 'DEMO_SEED'),
        -- Expiring in 5 days
        ('d0000000-0000-0000-0000-000000000029', v_gym_id, v_branch_id, 'سالم ولد ببانه', '46115599', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000030', v_gym_id, v_branch_id, 'نجاة بنت بوبكر', '37446688', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000031', v_gym_id, v_branch_id, 'حمادي ولد مولاي', '22557733', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000032', v_gym_id, v_branch_id, 'فاطمة بنت ابياه', '48991144', 'active', 'DEMO_SEED'),
        -- Expired subscriptions
        ('d0000000-0000-0000-0000-000000000033', v_gym_id, v_branch_id, 'المصطفى ولد عبدي', '32881155', 'expired', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000034', v_gym_id, v_branch_id, 'عائشة بنت كابر', '27993366', 'expired', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000035', v_gym_id, v_branch_id, 'أحمدو ولد النمين', '43118877', 'expired', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000036', v_gym_id, v_branch_id, 'مريم بنت صمب', '38445511', 'expired', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000037', v_gym_id, v_branch_id, 'داوود ولد كان', '29554422', 'expired', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000038', v_gym_id, v_branch_id, 'زينب بنت سيدي محمد', '44226688', 'expired', 'DEMO_SEED'),
        -- Inactive / churn risk
        ('d0000000-0000-0000-0000-000000000039', v_gym_id, v_branch_id, 'محمد ولد الشيخ المهدي', '35667799', 'active', 'DEMO_SEED'),
        ('d0000000-0000-0000-0000-000000000040', v_gym_id, v_branch_id, 'خديجة بنت آبيه', '26113377', 'active', 'DEMO_SEED')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Insert Subscriptions
    -- Active subscriptions (valid for next 25 days)
    INSERT INTO public.subscriptions (id, gym_id, member_id, plan_id, start_date, end_date, status)
    SELECT
        ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_plan_monthly,
        now() - INTERVAL '5 days',
        now() + INTERVAL '25 days',
        'active'
    FROM generate_series(1, 28) i
    ON CONFLICT (id) DO NOTHING;

    -- Subscriptions expiring in 5 days
    INSERT INTO public.subscriptions (id, gym_id, member_id, plan_id, start_date, end_date, status)
    SELECT
        ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_plan_monthly,
        now() - INTERVAL '25 days',
        now() + INTERVAL '5 days',
        'active'
    FROM generate_series(29, 32) i
    ON CONFLICT (id) DO NOTHING;

    -- Expired subscriptions (ended 10 days ago)
    INSERT INTO public.subscriptions (id, gym_id, member_id, plan_id, start_date, end_date, status)
    SELECT
        ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_plan_monthly,
        now() - INTERVAL '40 days',
        now() - INTERVAL '10 days',
        'expired'
    FROM generate_series(33, 38) i
    ON CONFLICT (id) DO NOTHING;

    -- Subscriptions for churn members (active but last visit > 16 days ago)
    INSERT INTO public.subscriptions (id, gym_id, member_id, plan_id, start_date, end_date, status)
    SELECT
        ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_plan_quarterly,
        now() - INTERVAL '30 days',
        now() + INTERVAL '60 days',
        'active'
    FROM generate_series(39, 40) i
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert Payments
    -- 34 Completed payments
    INSERT INTO public.payments (id, gym_id, member_id, subscription_id, amount_mru, method, transaction_ref, recorded_by, status, created_at)
    SELECT
        ('f0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        ('e0000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        1500,
        CASE (i % 4)
            WHEN 0 THEN 'bankily'::payment_method
            WHEN 1 THEN 'masrvi'::payment_method
            WHEN 2 THEN 'sedad'::payment_method
            ELSE 'cash'::payment_method
        END,
        'TX-DEMO-' || i,
        v_admin_id,
        'completed',
        now() - ((35 - i) || ' days')::INTERVAL
    FROM generate_series(1, 34) i
    ON CONFLICT (id) DO NOTHING;

    -- 1 Soft-Cancelled Payment (Item d of BLOC 2)
    INSERT INTO public.payments (
        id, gym_id, member_id, subscription_id, amount_mru, method, transaction_ref,
        recorded_by, status, cancelled_by, cancelled_at, cancellation_reason, created_at
    )
    VALUES (
        'f0000000-0000-0000-0000-000000000035',
        v_gym_id,
        'd0000000-0000-0000-0000-000000000035',
        'e0000000-0000-0000-0000-000000000035',
        1500,
        'bankily',
        'TX-CANCELLED-001',
        v_admin_id,
        'cancelled',
        v_admin_id,
        now() - INTERVAL '2 days',
        'طلب المشترك استرداد المبلغ خلال 24 ساعة بسبب ظروف السفر الطارئة إلى انواذيبو',
        now() - INTERVAL '3 days'
    )
    ON CONFLICT (id) DO NOTHING;

    -- 4. Insert Visits over the last 8 weeks (Peak hours: 7 AM and 18 PM)
    INSERT INTO public.visits (id, gym_id, member_id, branch_id, scanned_by, entered_at, method, source)
    SELECT
        gen_random_uuid(),
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(((i % 28) + 1)::text, 12, '0'))::UUID,
        v_branch_id,
        v_admin_id,
        now() - ((i % 30) || ' days')::INTERVAL + (CASE WHEN (i % 2 = 0) THEN TIME '18:30:00' ELSE TIME '07:15:00' END),
        CASE WHEN (i % 3 = 0) THEN 'manual'::visit_method ELSE 'qr'::visit_method END,
        'online'::visit_source
    FROM generate_series(1, 60) i;

END $$;
