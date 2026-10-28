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
