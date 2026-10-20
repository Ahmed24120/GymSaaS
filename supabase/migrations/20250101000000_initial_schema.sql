-- ==============================================================================
-- GymSaaS Platform - Initial Database Schema & Row Level Security (RLS)
-- Location: Nouakchott, Mauritania
-- Target: Supabase (PostgreSQL 15+)
-- Reference: AGENTS.md (Section 5, 6, 7)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. ENUMS & TYPES
-- ==============================================================================
CREATE TYPE gym_status AS ENUM ('trial', 'active', 'suspended');
CREATE TYPE user_language AS ENUM ('ar', 'fr');
CREATE TYPE staff_role AS ENUM ('gym_owner', 'receptionist');
CREATE TYPE member_status AS ENUM ('active', 'inactive', 'expired');
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'paused', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'bankily', 'masrvi', 'sedad');
CREATE TYPE payment_status AS ENUM ('completed', 'cancelled');
CREATE TYPE visit_method AS ENUM ('qr', 'manual');
CREATE TYPE visit_source AS ENUM ('online', 'offline_sync');
CREATE TYPE notification_type AS ENUM ('expiry_warning', 'announcement', 'general', 'welcome');
CREATE TYPE platform_sub_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
CREATE TYPE platform_sub_period AS ENUM ('monthly', 'yearly');
CREATE TYPE ad_status AS ENUM ('active', 'paused', 'archived');

-- ==============================================================================
-- 3. CORE TABLES
-- ==============================================================================

-- 3.1 GYMS (الصالة الرياضية)
CREATE TABLE public.gyms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    city TEXT NOT NULL DEFAULT 'Nouakchott',
    status gym_status NOT NULL DEFAULT 'trial',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.2 BRANCHES (الفروع - فرع رئيسي افتراضي لكل صالة)
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Branch',
    address TEXT,
    phone TEXT,
    is_main BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 PROFILES (حسابات المستخدمين المرتبطة بـ auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    language user_language NOT NULL DEFAULT 'ar',
    is_super_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 GYM_STAFF (فريق العمل وصلاحيات الوصول لكل صالة)
CREATE TABLE public.gym_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    role staff_role NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_gym_staff_user UNIQUE (gym_id, user_id)
);

-- 3.5 MEMBERS (الأعضاء - مفصولون تماماً عن جدول profiles)
CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    photo_path TEXT, -- مسار خاص في Supabase Storage
    status member_status NOT NULL DEFAULT 'inactive',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6 PLANS (باقات الاشتراكات - مبالغ صحيحة بالـ MRU)
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    price_mru INTEGER NOT NULL CHECK (price_mru >= 0),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.7 SUBSCRIPTIONS (اشتراكات الأعضاء)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMPTZ NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.8 PAYMENTS (سجل المدفوعات المالية - غير قابل للحذف إطلاقاً)
-- حماية الاشتراك المرتبط من الحذف عبر RESTRICT
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
    amount_mru INTEGER NOT NULL CHECK (amount_mru >= 0),
    method payment_method NOT NULL,
    transaction_ref TEXT,
    recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status payment_status NOT NULL DEFAULT 'completed',
    cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.9 VISITS (حركات الدخول)
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    scanned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    method visit_method NOT NULL DEFAULT 'qr',
    source visit_source NOT NULL DEFAULT 'online',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.10 ANNOUNCEMENTS (إعلانات الصالة للأعضاء)
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.11 NOTIFICATIONS (إشعارات وتنبيهات الأعضاء)
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.12 AUDIT_LOGS (سجل التدقيق الأمني - للإدراج الآلي فقط دون تعديل أو مسح)
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before JSONB,
    after JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.13 PLATFORM_SUBSCRIPTIONS (اشتراك الصالة الرياضية في المنصة SaaS)
CREATE TABLE public.platform_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE UNIQUE,
    plan TEXT NOT NULL DEFAULT 'standard',
    price_mru INTEGER NOT NULL DEFAULT 3000,
    period platform_sub_period NOT NULL DEFAULT 'monthly',
    status platform_sub_status NOT NULL DEFAULT 'trial',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.14 ADS (إعلانات المنصة التجارية - يديرها السوبر أدمن)
CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser TEXT NOT NULL,
    title TEXT,
    image_url TEXT NOT NULL,
    target_link TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status ad_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.15 QR_NONCES (منع إعادة استخدام رمز QR)
CREATE TABLE public.qr_nonces (
    nonce TEXT PRIMARY KEY,
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 4. INDEXES
-- ==============================================================================
CREATE INDEX idx_branches_gym_id ON public.branches(gym_id);
CREATE INDEX idx_gym_staff_user_id ON public.gym_staff(user_id);
CREATE INDEX idx_gym_staff_gym_id ON public.gym_staff(gym_id);
CREATE INDEX idx_members_gym_id ON public.members(gym_id);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_phone ON public.members(gym_id, phone);
CREATE INDEX idx_plans_gym_id ON public.plans(gym_id);
CREATE INDEX idx_subscriptions_gym_id ON public.subscriptions(gym_id);
CREATE INDEX idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(gym_id, status);
CREATE INDEX idx_payments_gym_id ON public.payments(gym_id);
CREATE INDEX idx_payments_member_id ON public.payments(member_id);
CREATE INDEX idx_payments_created_at ON public.payments(gym_id, created_at);
CREATE INDEX idx_visits_gym_id ON public.visits(gym_id);
CREATE INDEX idx_visits_member_id ON public.visits(member_id);
CREATE INDEX idx_visits_entered_at ON public.visits(gym_id, entered_at);
CREATE INDEX idx_audit_logs_gym_id ON public.audit_logs(gym_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(gym_id, created_at);

-- ==============================================================================
-- 5. SECURITY DEFINER HELPER FUNCTIONS
-- ==============================================================================

-- التحقق من السوبر أدمن
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = p_user_id AND is_super_admin = true
    );
$$;

-- التحقق من صلاحية رؤية البروفايل لمنع الـ Infinite Recursion
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id UUID, p_viewer_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_target_id = p_viewer_id
    OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = p_viewer_id AND is_super_admin = true
    )
    OR EXISTS (
        SELECT 1 FROM public.gym_staff gs
        JOIN public.members m ON m.gym_id = gs.gym_id
        WHERE gs.user_id = p_viewer_id AND m.user_id = p_target_id AND gs.is_active = true
    );
$$;

-- التحقق من انتماء المستخدم لطاقم الصالة
CREATE OR REPLACE FUNCTION public.is_gym_staff(p_gym_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.gym_staff
        WHERE gym_id = p_gym_id
          AND user_id = p_user_id
          AND is_active = true
    );
$$;

-- التحقق هل المستخدم مالك للصالة أو سوبر أدمن
CREATE OR REPLACE FUNCTION public.is_gym_owner(p_gym_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_super_admin(p_user_id) OR EXISTS (
        SELECT 1 FROM public.gym_staff
        WHERE gym_id = p_gym_id
          AND user_id = p_user_id
          AND role = 'gym_owner'
          AND is_active = true
    );
$$;

-- التحقق هل المستخدم عضو في الصالة
CREATE OR REPLACE FUNCTION public.is_gym_member(p_gym_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.members
        WHERE gym_id = p_gym_id
          AND user_id = p_user_id
    );
$$;

-- الصالات المرتبطة بالمستخدم
CREATE OR REPLACE FUNCTION public.get_user_gym_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS TABLE(gym_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT gym_id FROM public.gym_staff WHERE user_id = p_user_id AND is_active = true
    UNION
    SELECT gym_id FROM public.members WHERE user_id = p_user_id;
$$;

-- ==============================================================================
-- 6. BUSINESS LOGIC & AUDIT TRIGGERS
-- ==============================================================================

-- مزامنة إنشاء البروفايل تلقائياً مع حسابات Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, language)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
        NEW.phone,
        COALESCE((NEW.raw_user_meta_data->>'language')::user_language, 'ar'::user_language)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- دالة التدقيق العامة (Security Definer تتولى الإدراج أوتوماتيكياً)
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_gym_id UUID;
    v_entity_id TEXT;
    v_before JSONB := NULL;
    v_after JSONB := NULL;
    v_actor UUID := auth.uid();
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_gym_id := OLD.gym_id;
        v_entity_id := OLD.id::text;
        v_before := to_jsonb(OLD);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_gym_id := NEW.gym_id;
        v_entity_id := NEW.id::text;
        v_before := to_jsonb(OLD);
        v_after := to_jsonb(NEW);
    ELSIF (TG_OP = 'INSERT') THEN
        v_gym_id := NEW.gym_id;
        v_entity_id := NEW.id::text;
        v_after := to_jsonb(NEW);
    END IF;

    INSERT INTO public.audit_logs (
        gym_id,
        actor_id,
        action,
        entity,
        entity_id,
        before,
        after
    ) VALUES (
        v_gym_id,
        v_actor,
        TG_OP,
        TG_TABLE_NAME,
        v_entity_id,
        v_before,
        v_after
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ربط المشغلات التلقائية
CREATE TRIGGER trg_audit_members
    AFTER INSERT OR UPDATE OR DELETE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_subscriptions
    AFTER INSERT OR UPDATE OR DELETE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_payments
    AFTER INSERT OR UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_plans
    AFTER INSERT OR UPDATE OR DELETE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER trg_audit_gym_staff
    AFTER INSERT OR UPDATE OR DELETE ON public.gym_staff
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

-- حساب تاريخ نهاية الاشتراك خادمياً
CREATE OR REPLACE FUNCTION public.calculate_subscription_end_date()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_duration_days INTEGER;
BEGIN
    SELECT duration_days INTO v_duration_days
    FROM public.plans
    WHERE id = NEW.plan_id AND gym_id = NEW.gym_id;

    IF v_duration_days IS NULL THEN
        RAISE EXCEPTION 'Invalid plan or plan does not belong to the gym';
    END IF;

    IF NEW.end_date IS NULL THEN
        NEW.end_date := NEW.start_date + (v_duration_days || ' days')::INTERVAL;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_subscription_end_date
    BEFORE INSERT ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.calculate_subscription_end_date();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 7.1 PROFILES (مؤمنة بدالة خادمة لمنع أي دوران تكراري نهائياً)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.can_view_profile(id));

CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid() OR public.is_super_admin())
    WITH CHECK (id = auth.uid() OR public.is_super_admin());

-- 7.2 GYMS
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gyms_select_policy" ON public.gyms
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR id IN (SELECT public.get_user_gym_ids())
    );

CREATE POLICY "gyms_admin_full_access" ON public.gyms
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

CREATE POLICY "gyms_owner_update" ON public.gyms
    FOR UPDATE TO authenticated
    USING (public.is_gym_owner(id))
    WITH CHECK (public.is_gym_owner(id));

-- 7.3 BRANCHES
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "branches_select_policy" ON public.branches
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR gym_id IN (SELECT public.get_user_gym_ids())
    );

CREATE POLICY "branches_owner_manage" ON public.branches
    FOR ALL TO authenticated
    USING (public.is_gym_owner(gym_id))
    WITH CHECK (public.is_gym_owner(gym_id));

-- 7.4 GYM_STAFF
ALTER TABLE public.gym_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gym_staff_select_policy" ON public.gym_staff
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

CREATE POLICY "gym_staff_owner_manage" ON public.gym_staff
    FOR ALL TO authenticated
    USING (public.is_gym_owner(gym_id))
    WITH CHECK (public.is_gym_owner(gym_id));

-- 7.5 MEMBERS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_policy" ON public.members
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR user_id = auth.uid()
    );

CREATE POLICY "members_staff_insert" ON public.members
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

CREATE POLICY "members_staff_update" ON public.members
    FOR UPDATE TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

CREATE POLICY "members_owner_delete" ON public.members
    FOR DELETE TO authenticated
    USING (public.is_gym_owner(gym_id));

-- 7.6 PLANS (باقات الاشتراك: الموظف لا يستطيع تعديل أو حذف الأسعار)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_policy" ON public.plans
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR public.is_gym_member(gym_id)
    );

CREATE POLICY "plans_owner_manage" ON public.plans
    FOR ALL TO authenticated
    USING (public.is_gym_owner(gym_id))
    WITH CHECK (public.is_gym_owner(gym_id));

-- 7.7 SUBSCRIPTIONS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_select_policy" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    );

CREATE POLICY "subscriptions_staff_manage" ON public.subscriptions
    FOR ALL TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    )
    WITH CHECK (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

-- 7.8 PAYMENTS (الدفع: لا حذف نهائي، الموظف يسجل فقط، والمالك يُلغي بصلاحية وتدقيق)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select_policy" ON public.payments
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    );

CREATE POLICY "payments_staff_insert" ON public.payments
    FOR INSERT TO authenticated
    WITH CHECK (
        (public.is_super_admin() OR public.is_gym_staff(gym_id))
        AND recorded_by = auth.uid()
    );

CREATE POLICY "payments_owner_update" ON public.payments
    FOR UPDATE TO authenticated
    USING (public.is_gym_owner(gym_id))
    WITH CHECK (public.is_gym_owner(gym_id));

-- لا توجد سياسة DELETE على جدول payments نهائياً

-- 7.9 VISITS
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_select_policy" ON public.visits
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    );

CREATE POLICY "visits_staff_insert" ON public.visits
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

-- 7.10 ANNOUNCEMENTS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select_policy" ON public.announcements
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR public.is_gym_member(gym_id)
    );

CREATE POLICY "announcements_owner_manage" ON public.announcements
    FOR ALL TO authenticated
    USING (public.is_gym_owner(gym_id))
    WITH CHECK (public.is_gym_owner(gym_id));

-- 7.11 NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
        OR member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    );

CREATE POLICY "notifications_member_update_read" ON public.notifications
    FOR UPDATE TO authenticated
    USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()))
    WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

CREATE POLICY "notifications_staff_insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_super_admin()
        OR public.is_gym_staff(gym_id)
    );

-- 7.12 AUDIT_LOGS (للاطلاع فقط لمالك الصالة والسوبر أدمن، لا تعديل أو حذف، والإدراج تلقائي بالـ Trigger)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_gym_owner(gym_id));

-- تم حذف سياسة INSERT المباشرة لأن مشغل التدقيق audit_trigger_fn() يعمل بصلاحية SECURITY DEFINER

-- 7.13 PLATFORM_SUBSCRIPTIONS (اشتراك SaaS)
ALTER TABLE public.platform_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_subscriptions_select" ON public.platform_subscriptions
    FOR SELECT TO authenticated
    USING (
        public.is_super_admin()
        OR public.is_gym_owner(gym_id)
    );

CREATE POLICY "platform_subscriptions_admin_manage" ON public.platform_subscriptions
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 7.14 ADS (إعلانات المنصة التجارية)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ads_select_public" ON public.ads
    FOR SELECT TO authenticated
    USING (status = 'active');

CREATE POLICY "ads_admin_manage" ON public.ads
    FOR ALL TO authenticated
    USING (public.is_super_admin())
    WITH CHECK (public.is_super_admin());

-- 7.15 QR_NONCES (سجل التوكنات المستخدمة)
ALTER TABLE public.qr_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qr_nonces_staff_access" ON public.qr_nonces
    FOR ALL TO authenticated
    USING (public.is_gym_staff(gym_id))
    WITH CHECK (public.is_gym_staff(gym_id));
