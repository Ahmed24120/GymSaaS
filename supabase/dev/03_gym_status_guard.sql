-- الغرض: BUG-SUSPEND-01؛ رفض بيانات الصالة المعلقة حتى عبر سياسات قراءة العضو الذاتية.
-- المخاطر: الجلسة في Auth تبقى قائمة، لكن RLS يحجب بيانات الصالة؛ middleware يتبع في المرحلة2.
-- الاستثناء: super_admin قائم يستطيع إدارة الصالات المعلقة؛ RPC الدفع والدخول ترفض التعليق للجميع.
-- الاختبار: تعليق صالة اختبار، ثم قراءة staff/member مع SET LOCAL ROLE authenticated؛ صفر صفوف.
-- التراجع: ROLLBACK عند الخطأ؛ بعد COMMIT أوقف Preview واستعد تعريفات الدوال والسياسات
-- من نسخة ما قبل التغيير بمراجعة المالك، دون تعطيل RLS أو إتاحة الصالة أثناء التراجع.
BEGIN;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qr_nonces' AND policyname='qr_nonces_insert') THEN
        RAISE EXCEPTION 'APPLY_02_FIRST';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.gym_access_allowed(p_gym_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL AND (
        public.is_super_admin() OR EXISTS (
            SELECT 1 FROM public.gyms g WHERE g.id=p_gym_id AND g.status<>'suspended'
              AND (EXISTS (SELECT 1 FROM public.gym_staff s WHERE s.gym_id=g.id AND s.user_id=auth.uid() AND s.is_active)
                OR EXISTS (SELECT 1 FROM public.members m WHERE m.gym_id=g.id AND m.user_id=auth.uid()))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_gym_staff(p_gym_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL AND (
        public.is_super_admin() OR (p_user_id=auth.uid() AND EXISTS (
            SELECT 1 FROM public.gym_staff s JOIN public.gyms g ON g.id=s.gym_id
            WHERE s.gym_id=p_gym_id AND s.user_id=p_user_id AND s.is_active AND g.status<>'suspended'
        ))
    );
$$;
CREATE OR REPLACE FUNCTION public.is_gym_owner(p_gym_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL AND (
        public.is_super_admin() OR (p_user_id=auth.uid() AND EXISTS (
            SELECT 1 FROM public.gym_staff s JOIN public.gyms g ON g.id=s.gym_id
            WHERE s.gym_id=p_gym_id AND s.user_id=p_user_id AND s.is_active
              AND s.role='gym_owner' AND g.status<>'suspended'
        ))
    );
$$;
CREATE OR REPLACE FUNCTION public.is_gym_member(p_gym_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL AND (
        public.is_super_admin() OR (p_user_id=auth.uid() AND EXISTS (
            SELECT 1 FROM public.members m JOIN public.gyms g ON g.id=m.gym_id
            WHERE m.gym_id=p_gym_id AND m.user_id=p_user_id AND g.status<>'suspended'
        ))
    );
$$;
CREATE OR REPLACE FUNCTION public.get_user_gym_ids(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(gym_id uuid) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT g.id FROM public.gyms g
    WHERE auth.uid() IS NOT NULL AND (p_user_id=auth.uid() OR public.is_super_admin())
      AND (g.status<>'suspended' OR public.is_super_admin())
      AND (EXISTS (SELECT 1 FROM public.gym_staff s WHERE s.gym_id=g.id AND s.user_id=p_user_id AND s.is_active)
        OR EXISTS (SELECT 1 FROM public.members m WHERE m.gym_id=g.id AND m.user_id=p_user_id));
$$;
CREATE OR REPLACE FUNCTION public.can_view_profile(p_target_id uuid, p_viewer_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL AND (p_viewer_id=auth.uid() OR public.is_super_admin()) AND (
        p_target_id=p_viewer_id OR public.is_super_admin() OR EXISTS (
            SELECT 1 FROM public.gym_staff s JOIN public.gyms g ON g.id=s.gym_id
            JOIN public.members m ON m.gym_id=g.id
            WHERE s.user_id=p_viewer_id AND s.is_active AND g.status<>'suspended' AND m.user_id=p_target_id
        )
    );
$$;

REVOKE ALL ON FUNCTION public.gym_access_allowed(uuid), public.is_gym_staff(uuid,uuid),
    public.is_gym_owner(uuid,uuid), public.is_gym_member(uuid,uuid),
    public.get_user_gym_ids(uuid), public.can_view_profile(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gym_access_allowed(uuid), public.is_gym_staff(uuid,uuid),
    public.is_gym_owner(uuid,uuid), public.is_gym_member(uuid,uuid),
    public.get_user_gym_ids(uuid), public.can_view_profile(uuid,uuid) TO authenticated;

-- سياسة مقيدة إضافية: لا تكفي OR user_id=auth.uid() القديمة لتجاوز التعليق.
DO $$ DECLARE v_table text; BEGIN
    FOREACH v_table IN ARRAY ARRAY['branches','gym_staff','members','plans','subscriptions','payments',
        'visits','announcements','notifications','audit_logs','platform_subscriptions','qr_nonces'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS gym_status_guard ON public.%I', v_table);
        EXECUTE format('CREATE POLICY gym_status_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.gym_access_allowed(gym_id)) WITH CHECK (public.gym_access_allowed(gym_id))', v_table);
    END LOOP;
END $$;
DROP POLICY IF EXISTS gym_status_guard ON public.gyms;
CREATE POLICY gym_status_guard ON public.gyms AS RESTRICTIVE FOR ALL TO authenticated
    USING (public.gym_access_allowed(id)) WITH CHECK (public.gym_access_allowed(id));

CREATE OR REPLACE FUNCTION public.guard_gym_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || NEW.id::text, 0));
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        public.is_super_admin() OR (auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin'))
    ) THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='GYM_STATUS_ADMIN_ONLY';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_gym_status_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_gym_status_change ON public.gyms;
CREATE TRIGGER trg_guard_gym_status_change BEFORE UPDATE ON public.gyms
    FOR EACH ROW EXECUTE FUNCTION public.guard_gym_status_change();

DO $$ BEGIN
    IF (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND policyname='gym_status_guard' AND permissive='RESTRICTIVE') <> 13 THEN
        RAISE EXCEPTION '03 verification failed: gym status policies missing';
    END IF;
END $$;
COMMIT;
SELECT '03_gym_status_guard applied; runtime verification still required' AS result;
