-- ==============================================================================
-- GymSaaS - Dev Users Mapping Script (Idempotent)
-- File: supabase/dev/dev_users.sql
-- Maps auth.users (by email) to public.profiles and public.gym_staff
-- Linked with Pilot Gym: a0000000-0000-0000-0000-000000000001
-- ==============================================================================

DO $$
DECLARE
    v_gym_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_branch_id UUID := 'b0000000-0000-0000-0000-000000000001'; -- Main branch
    v_admin_id UUID;
    v_owner_id UUID;
    v_reception_id UUID;
BEGIN
    -- 1. Get user IDs from auth.users by email
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@gymsaas.mr';
    SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@elitegym.mr';
    SELECT id INTO v_reception_id FROM auth.users WHERE email = 'reception@elitegym.mr';

    -- 2. Link Super Admin: admin@gymsaas.mr
    IF v_admin_id IS NOT NULL THEN
        -- Upsert profile with is_super_admin = true
        INSERT INTO public.profiles (id, full_name, phone, language, is_super_admin)
        VALUES (v_admin_id, 'سوبر أدمن المنصة', '+222 45 00 00 01', 'ar', true)
        ON CONFLICT (id) DO UPDATE
        SET is_super_admin = true,
            full_name = EXCLUDED.full_name;
    END IF;

    -- 3. Link Gym Owner: owner@elitegym.mr
    IF v_owner_id IS NOT NULL THEN
        -- Upsert profile
        INSERT INTO public.profiles (id, full_name, phone, language, is_super_admin)
        VALUES (v_owner_id, 'مالك الصالة التجريبية', '+222 45 00 00 02', 'ar', false)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name;

        -- Upsert gym_staff as gym_owner
        INSERT INTO public.gym_staff (gym_id, user_id, branch_id, role, is_active)
        VALUES (v_gym_id, v_owner_id, v_branch_id, 'gym_owner', true)
        ON CONFLICT (gym_id, user_id) DO UPDATE
        SET role = 'gym_owner',
            is_active = true,
            branch_id = EXCLUDED.branch_id;
    END IF;

    -- 4. Link Receptionist: reception@elitegym.mr
    IF v_reception_id IS NOT NULL THEN
        -- Upsert profile
        INSERT INTO public.profiles (id, full_name, phone, language, is_super_admin)
        VALUES (v_reception_id, 'موظف الاستقبال', '+222 45 00 00 03', 'ar', false)
        ON CONFLICT (id) DO UPDATE
        SET full_name = EXCLUDED.full_name;

        -- Upsert gym_staff as receptionist
        INSERT INTO public.gym_staff (gym_id, user_id, branch_id, role, is_active)
        VALUES (v_gym_id, v_reception_id, v_branch_id, 'receptionist', true)
        ON CONFLICT (gym_id, user_id) DO UPDATE
        SET role = 'receptionist',
            is_active = true,
            branch_id = EXCLUDED.branch_id;
    END IF;
END $$;
