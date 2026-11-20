
-- ===== 01_profiles_lockdown.sql =====
-- الغرض: BUG-SEC-01؛ منع تغيير is_super_admin بواسطة مستخدم عادي، حتى في صفه.
-- المخاطر: يمنع ترقية المشرف عبر أي عميل غير مخول؛ تهيئة المشرف الأول من SQL Editor فقط.
-- الاختبار: فحص المشغل أدناه؛ واختبار UPDATE بدور authenticated في docs/PHASE_1_TESTS.md.
-- التراجع: الخطأ قبل COMMIT يعيد المعاملة كلها. بعد الاعتماد أوقف Preview وأعد تعريف
-- الدالة من نسخة pg_get_functiondef المحفوظة قبل التنفيذ؛ لا تزل الحماية على نظام متاح.
-- التنفيذ: قاعدة اختبار فقط، بواسطة المالك؛ لا يعد هذا إثباتًا لتنفيذ Supabase.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_admin_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
    v_changes_admin boolean;
BEGIN
    v_changes_admin := CASE WHEN TG_OP = 'INSERT'
        THEN NEW.is_super_admin
        ELSE NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin END;

    IF v_changes_admin AND NOT (
        public.is_super_admin()
        OR (auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin'))
    ) THEN
        RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'ADMIN_FLAG_CHANGE_FORBIDDEN';
    END IF;
    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_admin_flag() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_profile_admin_flag ON public.profiles;
CREATE TRIGGER trg_guard_profile_admin_flag
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.guard_profile_admin_flag();

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.profiles'::regclass
          AND tgname = 'trg_guard_profile_admin_flag' AND tgenabled = 'O'
    ) THEN
        RAISE EXCEPTION '01 verification failed: profile guard missing';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_class WHERE oid = 'public.profiles'::regclass AND NOT relrowsecurity) THEN
        RAISE EXCEPTION '01 verification failed: profiles RLS missing';
    END IF;
END;
$$;

COMMIT;
SELECT '01_profiles_lockdown applied; runtime verification still required' AS result;

-- ===== 02_qr_nonces_hardening.sql =====
-- الغرض: BUG-QR-03؛ nonce دائم لا يستطيع authenticated تعديله أو حذفه.
-- المخاطر: أي عميل كان يعدل nonce سيفشل؛ التنظيف محدود بألف سجل تجاوز عمره عشر دقائق.
-- الاختبار: إعادة التنفيذ وفحص الامتيازات أدناه؛ اختبارات INSERT/UPDATE/DELETE في دليل المرحلة.
-- التراجع: ROLLBACK قبل COMMIT؛ بعده استعد تعريفات الدوال والسياسات المحفوظة مسبقًا
-- في نافذة صيانة مع Preview متوقف؛ لا تعِد سياسة FOR ALL أثناء إتاحة التطبيق.
BEGIN;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.profiles'::regclass AND tgname='trg_guard_profile_admin_flag') THEN
        RAISE EXCEPTION 'APPLY_01_FIRST';
    END IF;
END $$;

ALTER TABLE public.qr_nonces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS qr_nonces_staff_access ON public.qr_nonces;
DROP POLICY IF EXISTS qr_nonces_select ON public.qr_nonces;
DROP POLICY IF EXISTS qr_nonces_insert ON public.qr_nonces;
CREATE POLICY qr_nonces_select ON public.qr_nonces FOR SELECT TO authenticated
    USING (public.is_gym_staff(gym_id));
CREATE POLICY qr_nonces_insert ON public.qr_nonces FOR INSERT TO authenticated
    WITH CHECK (public.is_gym_staff(gym_id) AND EXISTS (
        SELECT 1 FROM public.members m WHERE m.id=member_id AND m.gym_id=qr_nonces.gym_id
    ));

-- سحب صلاحية التفريغ؛ ليس تنفيذ أمر لتفريغ الجدول.
REVOKE UPDATE, DELETE, TRUNCATE ON public.qr_nonces FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (nonce, gym_id, member_id, used_at) ON public.qr_nonces FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.qr_nonces TO authenticated;

CREATE OR REPLACE FUNCTION public.stamp_qr_nonce()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF NEW.nonce IS NULL OR btrim(NEW.nonce)='' OR octet_length(NEW.nonce)>256 THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_NONCE';
    END IF;
    -- لا يُسمح للعميل بتقديم تاريخ قديم لاستدراج وظيفة التنظيف.
    NEW.used_at := clock_timestamp();
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.stamp_qr_nonce() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_stamp_qr_nonce ON public.qr_nonces;
CREATE TRIGGER trg_stamp_qr_nonce BEFORE INSERT ON public.qr_nonces
    FOR EACH ROW EXECUTE FUNCTION public.stamp_qr_nonce();

CREATE INDEX IF NOT EXISTS idx_qr_nonces_used_at ON public.qr_nonces(used_at);
CREATE OR REPLACE FUNCTION public.purge_expired_qr_nonces()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    DELETE FROM public.qr_nonces WHERE nonce IN (
        SELECT nonce FROM public.qr_nonces
        WHERE used_at < clock_timestamp() - interval '10 minutes'
        ORDER BY used_at LIMIT 1000
    );
    RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.purge_expired_qr_nonces() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_purge_expired_qr_nonces ON public.qr_nonces;
CREATE TRIGGER trg_purge_expired_qr_nonces AFTER INSERT ON public.qr_nonces
    FOR EACH STATEMENT EXECUTE FUNCTION public.purge_expired_qr_nonces();

DO $$ BEGIN
    IF has_table_privilege('authenticated','public.qr_nonces','UPDATE')
       OR has_table_privilege('authenticated','public.qr_nonces','DELETE')
       OR has_table_privilege('authenticated','public.qr_nonces','TRUNCATE')
       OR has_function_privilege('authenticated','public.purge_expired_qr_nonces()','EXECUTE') THEN
        RAISE EXCEPTION '02 verification failed: unsafe nonce privileges';
    END IF;
END $$;
COMMIT;
SELECT '02_qr_nonces_hardening applied; runtime verification still required' AS result;

-- ===== 03_gym_status_guard.sql =====
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

-- ===== 04_permissions_enforcement.sql =====
-- الغرض: BUG-SEC-02؛ تحقق صلاحيات الطاقم في قاعدة البيانات، وحماية الإلغاء والتدقيق.
-- المخاطر: permissions الفارغة للموظف تعني رفضًا، لا منحًا افتراضيًا. راجع حسابات الاختبار.
-- الاختبار: اسحب can_record_payments من موظف؛ RPC والكتابة المباشرة يجب أن تُرفضا.
-- التراجع: ROLLBACK عند الخطأ؛ بعد COMMIT أوقف Preview واستعد تعريفات الدوال والسياسات
-- والامتيازات المحفوظة مسبقًا؛ لا تمنح anon ولا تعِد حذف المدفوعات أو تعديل التدقيق.
BEGIN;
DO $$ BEGIN
    IF to_regprocedure('public.gym_access_allowed(uuid)') IS NULL THEN RAISE EXCEPTION 'APPLY_03_FIRST'; END IF;
END $$;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_staff_permission(p_gym_id uuid, p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
    SELECT auth.uid() IS NOT NULL
      AND p_permission = ANY (ARRAY['can_manage_members','can_import_members','can_record_payments',
        'can_scan_qr','can_manage_plans','can_cancel_payments','can_manage_staff','can_view_audit_logs','can_export_reports'])
      AND (public.is_super_admin() OR EXISTS (
        SELECT 1 FROM public.gym_staff s JOIN public.gyms g ON g.id=s.gym_id
        WHERE s.gym_id=p_gym_id AND s.user_id=auth.uid() AND s.is_active AND g.status<>'suspended'
          AND (s.role='gym_owner' OR (
            p_permission=ANY(ARRAY['can_manage_members','can_import_members','can_record_payments','can_scan_qr'])
            AND s.permissions -> p_permission = 'true'::jsonb
          ))
      ));
$$;
REVOKE ALL ON FUNCTION public.has_staff_permission(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_staff_permission(uuid,text) TO authenticated;

DROP POLICY IF EXISTS members_staff_insert ON public.members;
CREATE POLICY members_staff_insert ON public.members FOR INSERT TO authenticated WITH CHECK (
    public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_import_members')
);
DROP POLICY IF EXISTS members_staff_update ON public.members;
CREATE POLICY members_staff_update ON public.members FOR UPDATE TO authenticated
    USING (public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_record_payments'))
    WITH CHECK (public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_record_payments'));
DROP POLICY IF EXISTS members_insert_permission ON public.members;
CREATE POLICY members_insert_permission ON public.members AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (
    public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_import_members')
);
DROP POLICY IF EXISTS members_update_permission ON public.members;
CREATE POLICY members_update_permission ON public.members AS RESTRICTIVE FOR UPDATE TO authenticated
    USING (public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_record_payments'))
    WITH CHECK (public.has_staff_permission(gym_id,'can_manage_members') OR public.has_staff_permission(gym_id,'can_record_payments'));

CREATE OR REPLACE FUNCTION public.guard_member_edit_permission()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF auth.uid() IS NULL AND session_user IN ('postgres','supabase_admin') THEN RETURN NEW; END IF;
    IF NOT public.has_staff_permission(OLD.gym_id,'can_manage_members') THEN
        IF NOT public.has_staff_permission(OLD.gym_id,'can_record_payments')
           OR (to_jsonb(NEW) - ARRAY['status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','updated_at'])
           OR NEW.status<>'active' THEN
            RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='MEMBER_EDIT_PERMISSION_REQUIRED';
        END IF;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_member_edit_permission() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_member_edit_permission ON public.members;
CREATE TRIGGER trg_guard_member_edit_permission BEFORE UPDATE ON public.members
    FOR EACH ROW EXECUTE FUNCTION public.guard_member_edit_permission();

DROP POLICY IF EXISTS subscriptions_staff_manage ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_staff_insert ON public.subscriptions;
CREATE POLICY subscriptions_staff_insert ON public.subscriptions FOR INSERT TO authenticated
    WITH CHECK (public.has_staff_permission(gym_id,'can_record_payments'));
DROP POLICY IF EXISTS subscriptions_owner_update ON public.subscriptions;
CREATE POLICY subscriptions_owner_update ON public.subscriptions FOR UPDATE TO authenticated
    USING (public.has_staff_permission(gym_id,'can_cancel_payments'))
    WITH CHECK (public.has_staff_permission(gym_id,'can_cancel_payments'));
REVOKE DELETE, TRUNCATE ON public.subscriptions FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS payments_staff_insert ON public.payments;
CREATE POLICY payments_staff_insert ON public.payments FOR INSERT TO authenticated
    WITH CHECK (public.has_staff_permission(gym_id,'can_record_payments') AND recorded_by=auth.uid() AND amount_mru>0);
DROP POLICY IF EXISTS payments_owner_update ON public.payments;
CREATE POLICY payments_owner_update ON public.payments FOR UPDATE TO authenticated
    USING (public.has_staff_permission(gym_id,'can_cancel_payments'))
    WITH CHECK (public.has_staff_permission(gym_id,'can_cancel_payments'));
DROP POLICY IF EXISTS payments_insert_permission ON public.payments;
CREATE POLICY payments_insert_permission ON public.payments AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (public.has_staff_permission(gym_id,'can_record_payments') AND recorded_by=auth.uid() AND amount_mru>0);
DROP POLICY IF EXISTS payments_update_permission ON public.payments;
CREATE POLICY payments_update_permission ON public.payments AS RESTRICTIVE FOR UPDATE TO authenticated
    USING (public.has_staff_permission(gym_id,'can_cancel_payments'))
    WITH CHECK (public.has_staff_permission(gym_id,'can_cancel_payments'));

DO $$ DECLARE v_operation text; BEGIN
    FOREACH v_operation IN ARRAY ARRAY['INSERT','UPDATE','DELETE'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS plans_permission_%s ON public.plans', lower(v_operation));
        IF v_operation='INSERT' THEN
            EXECUTE 'CREATE POLICY plans_permission_insert ON public.plans AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.has_staff_permission(gym_id,''can_manage_plans''))';
        ELSIF v_operation='UPDATE' THEN
            EXECUTE 'CREATE POLICY plans_permission_update ON public.plans AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.has_staff_permission(gym_id,''can_manage_plans'')) WITH CHECK (public.has_staff_permission(gym_id,''can_manage_plans''))';
        ELSE
            EXECUTE 'CREATE POLICY plans_permission_delete ON public.plans AS RESTRICTIVE FOR DELETE TO authenticated USING (public.has_staff_permission(gym_id,''can_manage_plans''))';
        END IF;
    END LOOP;
END $$;
DROP POLICY IF EXISTS visits_scan_permission ON public.visits;
CREATE POLICY visits_scan_permission ON public.visits AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (public.has_staff_permission(gym_id,'can_scan_qr') AND scanned_by=auth.uid());
DROP POLICY IF EXISTS qr_nonce_scan_permission ON public.qr_nonces;
CREATE POLICY qr_nonce_scan_permission ON public.qr_nonces AS RESTRICTIVE FOR INSERT TO authenticated
    WITH CHECK (public.has_staff_permission(gym_id,'can_scan_qr'));

CREATE OR REPLACE FUNCTION public.guard_payment_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF TG_OP='DELETE' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='PAYMENT_DELETE_FORBIDDEN'; END IF;
    IF NOT public.has_staff_permission(OLD.gym_id,'can_cancel_payments')
       OR OLD.status<>'completed' OR NEW.status<>'cancelled'
       OR length(btrim(coalesce(NEW.cancellation_reason,'')))<3
       OR (to_jsonb(NEW) - ARRAY['status','cancelled_by','cancelled_at','cancellation_reason'])
          IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','cancelled_by','cancelled_at','cancellation_reason']) THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='PAYMENT_ONLY_SOFT_CANCEL_ALLOWED';
    END IF;
    NEW.cancelled_by := auth.uid();
    NEW.cancelled_at := clock_timestamp();
    NEW.cancellation_reason := btrim(NEW.cancellation_reason);
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_payment_mutation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_payment_mutation ON public.payments;
CREATE TRIGGER trg_guard_payment_mutation BEFORE UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.guard_payment_mutation();
REVOKE DELETE, TRUNCATE ON public.payments FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reject_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='AUDIT_LOG_IMMUTABLE';
END $$;
REVOKE ALL ON FUNCTION public.reject_audit_mutation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_reject_audit_mutation ON public.audit_logs;
CREATE TRIGGER trg_reject_audit_mutation BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_payment public.payments%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL OR length(btrim(coalesce(p_reason,'')))<3 THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='CANCELLATION_REASON_REQUIRED';
    END IF;
    SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id;
    IF NOT FOUND OR NOT public.has_staff_permission(v_payment.gym_id,'can_cancel_payments') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='CANCEL_PAYMENT_FORBIDDEN';
    END IF;
    UPDATE public.payments SET status='cancelled', cancelled_by=auth.uid(),
        cancelled_at=clock_timestamp(), cancellation_reason=btrim(p_reason)
    WHERE id=p_payment_id RETURNING * INTO v_payment;
    RETURN to_jsonb(v_payment);
END $$;
REVOKE ALL ON FUNCTION public.cancel_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment(uuid,text) TO authenticated;

DO $$ BEGIN
    IF has_table_privilege('authenticated','public.payments','DELETE')
       OR has_table_privilege('authenticated','public.audit_logs','UPDATE')
       OR has_table_privilege('authenticated','public.audit_logs','DELETE') THEN
        RAISE EXCEPTION '04 verification failed: mutable financial history';
    END IF;
END $$;
COMMIT;
SELECT '04_permissions_enforcement applied; runtime verification still required' AS result;

-- ===== dev_users.sql =====
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

-- ===== demo_data.sql =====
-- ==============================================================================
-- GymSaaS — Demo Realistic Data (Mauritanian Seed: 40 Members, Visits & Payments)
-- IDEMPOTENT: Uses ON CONFLICT / deterministic UUIDs
-- ORDRE: exécuter AVANT 05 et 06 (leurs triggers interdisent toute écriture sans auth.uid()).
-- Lignes de démo reconnaissables par UUID: d0000000-..-0001..0040 (membres), e0..(abonnements), f0..(paiements), 0a000000-..(visites).
-- Cohérence: membre expiré => status 'expired'; abonnement 'expired'.
-- Target Gym: a0000000-0000-0000-0000-000000000001 (Elite Gym Tevragh Zeina)
-- ==============================================================================

DO $$
DECLARE
    v_gym_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_branch_id UUID := 'b0000000-0000-0000-0000-000000000001';
    v_admin_id UUID;
    v_plan_monthly UUID := 'c0000000-0000-0000-0000-000000000001';
    v_plan_quarterly UUID := 'c0000000-0000-0000-0000-000000000002';
    v_plan_annual UUID := 'c0000000-0000-0000-0000-000000000003';
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'owner@elitegym.mr';
    IF v_admin_id IS NULL THEN RAISE EXCEPTION 'demo_data: owner@elitegym.mr introuvable (exécuter dev_users.sql après création du compte)'; END IF;
    -- 1. Insert 40 Mauritanian Members
    INSERT INTO public.members (id, gym_id, branch_id, full_name, phone, status)
    VALUES
        ('d0000000-0000-0000-0000-000000000001', v_gym_id, v_branch_id, 'محمد الأمين ولد فال', '45112233', 'active'),
        ('d0000000-0000-0000-0000-000000000002', v_gym_id, v_branch_id, 'فاطمة بنت الشيخ', '36224455', 'active'),
        ('d0000000-0000-0000-0000-000000000003', v_gym_id, v_branch_id, 'سيدي ولد اعلي', '22998877', 'active'),
        ('d0000000-0000-0000-0000-000000000004', v_gym_id, v_branch_id, 'مريم بنت المختار', '41223344', 'active'),
        ('d0000000-0000-0000-0000-000000000005', v_gym_id, v_branch_id, 'عبد الله ولد بونا', '33445566', 'active'),
        ('d0000000-0000-0000-0000-000000000006', v_gym_id, v_branch_id, 'عائشة بنت أحمد', '26778899', 'active'),
        ('d0000000-0000-0000-0000-000000000007', v_gym_id, v_branch_id, 'إبراهيم ولد السالك', '48123456', 'active'),
        ('d0000000-0000-0000-0000-000000000008', v_gym_id, v_branch_id, 'زينب بنت محمد محمود', '37894512', 'active'),
        ('d0000000-0000-0000-0000-000000000009', v_gym_id, v_branch_id, 'المختار ولد داداه', '27456789', 'active'),
        ('d0000000-0000-0000-0000-000000000010', v_gym_id, v_branch_id, 'خديجة بنت الحضرامي', '49654321', 'active'),
        ('d0000000-0000-0000-0000-000000000011', v_gym_id, v_branch_id, 'الحسن ولد بلال', '32112244', 'active'),
        ('d0000000-0000-0000-0000-000000000012', v_gym_id, v_branch_id, 'سلمى بنت البشير', '22338811', 'active'),
        ('d0000000-0000-0000-0000-000000000013', v_gym_id, v_branch_id, 'أحمد ولد المصطفى', '46771122', 'active'),
        ('d0000000-0000-0000-0000-000000000014', v_gym_id, v_branch_id, 'ميمونة بنت سيدي', '38992233', 'active'),
        ('d0000000-0000-0000-0000-000000000015', v_gym_id, v_branch_id, 'عمر ولد الشيخ أحمد', '29114455', 'active'),
        ('d0000000-0000-0000-0000-000000000016', v_gym_id, v_branch_id, 'هند بنت محمد عالي', '44883322', 'active'),
        ('d0000000-0000-0000-0000-000000000017', v_gym_id, v_branch_id, 'ببكر ولد محمد', '34556677', 'active'),
        ('d0000000-0000-0000-0000-000000000018', v_gym_id, v_branch_id, 'منى بنت سيدي عثمان', '24667788', 'active'),
        ('d0000000-0000-0000-0000-000000000019', v_gym_id, v_branch_id, 'محمد محمود ولد بيه', '47118899', 'active'),
        ('d0000000-0000-0000-0000-000000000020', v_gym_id, v_branch_id, 'توتو بنت بلال', '36227766', 'active'),
        ('d0000000-0000-0000-0000-000000000021', v_gym_id, v_branch_id, 'الشيخ ولد عبد الرحمن', '23441199', 'active'),
        ('d0000000-0000-0000-0000-000000000022', v_gym_id, v_branch_id, 'لالة بنت اعمر', '42558833', 'active'),
        ('d0000000-0000-0000-0000-000000000023', v_gym_id, v_branch_id, 'سعد بوه ولد الشيخ', '39113355', 'active'),
        ('d0000000-0000-0000-0000-000000000024', v_gym_id, v_branch_id, 'أم كلثوم بنت المامي', '28776644', 'active'),
        ('d0000000-0000-0000-0000-000000000025', v_gym_id, v_branch_id, 'يعقوب ولد حمود', '45992211', 'active'),
        ('d0000000-0000-0000-0000-000000000026', v_gym_id, v_branch_id, 'آمنة بنت محمدن', '33884422', 'active'),
        ('d0000000-0000-0000-0000-000000000027', v_gym_id, v_branch_id, 'جمال ولد حبيب', '25661133', 'active'),
        ('d0000000-0000-0000-0000-000000000028', v_gym_id, v_branch_id, 'سارة بنت حمادي', '41337788', 'active'),
        -- Expiring in 5 days
        ('d0000000-0000-0000-0000-000000000029', v_gym_id, v_branch_id, 'سالم ولد ببانه', '46115599', 'active'),
        ('d0000000-0000-0000-0000-000000000030', v_gym_id, v_branch_id, 'نجاة بنت بوبكر', '37446688', 'active'),
        ('d0000000-0000-0000-0000-000000000031', v_gym_id, v_branch_id, 'حمادي ولد مولاي', '22557733', 'active'),
        ('d0000000-0000-0000-0000-000000000032', v_gym_id, v_branch_id, 'فاطمة بنت ابياه', '48991144', 'active'),
        -- Expired subscriptions
        ('d0000000-0000-0000-0000-000000000033', v_gym_id, v_branch_id, 'المصطفى ولد عبدي', '32881155', 'expired'),
        ('d0000000-0000-0000-0000-000000000034', v_gym_id, v_branch_id, 'عائشة بنت كابر', '27993366', 'expired'),
        ('d0000000-0000-0000-0000-000000000035', v_gym_id, v_branch_id, 'أحمدو ولد النمين', '43118877', 'expired'),
        ('d0000000-0000-0000-0000-000000000036', v_gym_id, v_branch_id, 'مريم بنت صمب', '38445511', 'expired'),
        ('d0000000-0000-0000-0000-000000000037', v_gym_id, v_branch_id, 'داوود ولد كان', '29554422', 'expired'),
        ('d0000000-0000-0000-0000-000000000038', v_gym_id, v_branch_id, 'زينب بنت سيدي محمد', '44226688', 'expired'),
        -- Inactive / churn risk
        ('d0000000-0000-0000-0000-000000000039', v_gym_id, v_branch_id, 'محمد ولد الشيخ المهدي', '35667799', 'active'),
        ('d0000000-0000-0000-0000-000000000040', v_gym_id, v_branch_id, 'خديجة بنت آبيه', '26113377', 'active')
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
        ('0a000000-0000-0000-0000-' || LPAD(i::text, 12, '0'))::UUID,
        v_gym_id,
        ('d0000000-0000-0000-0000-' || LPAD(((i % 28) + 1)::text, 12, '0'))::UUID,
        v_branch_id,
        v_admin_id,
        now() - ((i % 30) || ' days')::INTERVAL + (CASE WHEN (i % 2 = 0) THEN TIME '18:30:00' ELSE TIME '07:15:00' END),
        CASE WHEN (i % 3 = 0) THEN 'manual'::visit_method ELSE 'qr'::visit_method END,
        'online'::visit_source
    FROM generate_series(1, 60) i
    ON CONFLICT (id) DO NOTHING;

END $$;

-- ===== 07_gym_b_fixture.sql =====
-- الغرض: صالة B للاختبار (عزل المستأجرين) بمعرّفات ثابتة وأعمدة حقيقية.
-- المخاطر: يضيف صفوفًا ثابتة (ON CONFLICT DO NOTHING)؛ لا يحذف شيئًا.
-- الاختبار: SELECT count(*) FROM members WHERE gym_id='a1000000-0000-0000-0000-000000000002' → 1.
-- التراجع: حذف الصفوف ذات المعرّفات a1.. / b1.. / c1.. / d1.. / e1.. / f1.. يدويًا (صالة B فقط).
-- يعمل قبل 05 و06 (المشغلات اللاحقة تمنع الكتابة بلا auth.uid()). يتطلب owner@elitegym.mr كمسجّل للدفع.
DO $$
DECLARE
  v_gym uuid := 'a1000000-0000-0000-0000-000000000002';
  v_branch uuid := 'b1000000-0000-0000-0000-000000000002';
  v_plan uuid := 'c1000000-0000-0000-0000-000000000002';
  v_member uuid := 'd1000000-0000-0000-0000-000000000002';
  v_sub uuid := 'e1000000-0000-0000-0000-000000000002';
  v_pay uuid := 'f1000000-0000-0000-0000-000000000002';
  v_actor uuid;
BEGIN
  SELECT id INTO v_actor FROM auth.users WHERE email='owner@elitegym.mr';
  IF v_actor IS NULL THEN RAISE EXCEPTION '07: owner@elitegym.mr introuvable dans auth.users'; END IF;
  INSERT INTO public.gyms(id,name,slug,city,status) VALUES (v_gym,'Gym B Test','gym-b-test','Nouadhibou','active') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.branches(id,gym_id,name,is_main) VALUES (v_branch,v_gym,'Branche principale B',true) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.plans(id,gym_id,name,duration_days,price_mru,active) VALUES (v_plan,v_gym,'Mensuel B',30,1500,true) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.members(id,gym_id,branch_id,full_name,phone,status) VALUES (v_member,v_gym,v_branch,'عضو الصالة B','30000002','inactive') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.subscriptions(id,gym_id,member_id,plan_id,start_date,status) VALUES (v_sub,v_gym,v_member,v_plan,now(),'active') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.payments(id,gym_id,member_id,subscription_id,amount_mru,method,transaction_ref,recorded_by,status)
    VALUES (v_pay,v_gym,v_member,v_sub,1500,'cash','FIXTURE-B',v_actor,'completed') ON CONFLICT (id) DO NOTHING;
  UPDATE public.members SET status='active' WHERE id=v_member AND status<>'active';
END $$;

-- ربط staffb@championgym.mr بالصالة B (إن وُجد الحساب)
DO $$
DECLARE v_u uuid; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='staffb@championgym.mr';
  IF v_u IS NULL THEN RAISE NOTICE 'staffb@championgym.mr absent: lien ignoré'; RETURN; END IF;
  INSERT INTO public.profiles(id,full_name,phone,language,is_super_admin) VALUES (v_u,'Staff B','+222 45 00 00 09','ar',false)
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.gym_staff(gym_id,user_id,branch_id,role,is_active,permissions)
    VALUES ('a1000000-0000-0000-0000-000000000002',v_u,'b1000000-0000-0000-0000-000000000002','gym_owner',true,'{}'::jsonb)
    ON CONFLICT (gym_id,user_id) DO UPDATE SET is_active=true, role='gym_owner';
END $$;

-- ربط member@elitegym.mr بعضو من الصالة A (d..001 من demo_data)
DO $$
DECLARE v_u uuid; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='member@elitegym.mr';
  IF v_u IS NULL THEN RAISE NOTICE 'member@elitegym.mr absent: lien ignoré'; RETURN; END IF;
  INSERT INTO public.profiles(id,full_name,phone,language,is_super_admin) VALUES (v_u,'Membre Test','+222 45 00 00 10','ar',false)
    ON CONFLICT (id) DO NOTHING;
  UPDATE public.members SET user_id=v_u WHERE id='d0000000-0000-0000-0000-000000000001' AND user_id IS DISTINCT FROM v_u;
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public.members WHERE user_id=v_u) THEN
    RAISE NOTICE 'Aucun membre d..001: exécutez demo_data.sql puis relancez ce bloc';
  END IF;
END $$;
SELECT '07_gym_b_fixture applied' AS result;

-- ===== 08_dev_permissions.sql =====
-- الغرض: منح reception@elitegym.mr صلاحيات الاستقبال الأساسية فقط (لا can_cancel_payments ولا can_manage_plans).
-- المخاطر: تعديل permissions لموظف واحد. الاختبار: SELECT permissions FROM gym_staff JOIN auth.users ... .
-- التراجع: UPDATE gym_staff SET permissions='{}' للموظف نفسه.
DO $$
DECLARE v_u uuid; v_n int; BEGIN
  SELECT id INTO v_u FROM auth.users WHERE email='reception@elitegym.mr';
  IF v_u IS NULL THEN RAISE EXCEPTION '08: reception@elitegym.mr introuvable'; END IF;
  UPDATE public.gym_staff SET permissions = coalesce(permissions,'{}'::jsonb)
      || '{"can_manage_members":true,"can_record_payments":true,"can_scan_qr":true}'::jsonb
   WHERE user_id=v_u AND gym_id='a0000000-0000-0000-0000-000000000001';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n<>1 THEN RAISE EXCEPTION '08: gym_staff de la réception introuvable (exécutez dev_users.sql)'; END IF;
END $$;
SELECT '08_dev_permissions applied' AS result;
