-- الغرض: BUG-QR-04؛ حفظ nonce والزيارة ذريًا، مع فحص البداية والنهاية والصلاحية والصالة.
-- المخاطر: INSERT nonce منفردًا وQR visit بلا nonce يصبحان مرفوضين؛ يلزم ربط API في المرحلة2.
-- HMAC وانتهاء الرمز مسؤولية API قبل RPC؛ هذه الدالة ليست مدقق توقيع ولا تحتوي سرًا.
-- الاختبار: نجاح أول، REPLAY للثاني، رفض اشتراك مستقبلي/منتهٍ، وفشل زيارة قسري دون استهلاك nonce.
-- التراجع: ROLLBACK عند الخطأ؛ بعد COMMIT أوقف Preview واستعد تعريفات المشغلات والدوال
-- السابقة بمراجعة المالك. احتفظ بعمود qr_nonce والبيانات؛ لا حذف جماعي ولا تعطيل RLS.
BEGIN;
DO $$ BEGIN
    IF to_regprocedure('public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid)') IS NULL THEN
        RAISE EXCEPTION 'APPLY_05_FIRST';
    END IF;
END $$;

ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS qr_nonce text;
CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_qr_nonce ON public.visits(qr_nonce) WHERE qr_nonce IS NOT NULL;

CREATE OR REPLACE FUNCTION public.guard_visit_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_member public.members%ROWTYPE; v_now timestamptz:=clock_timestamp();
BEGIN
    SELECT * INTO v_member FROM public.members WHERE id=NEW.member_id;
    IF NOT FOUND OR auth.uid() IS NULL OR NOT public.has_staff_permission(v_member.gym_id,'can_scan_qr') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='SCAN_PERMISSION_REQUIRED';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || v_member.gym_id::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || v_member.id::text,0));
    IF NOT EXISTS (SELECT 1 FROM public.gyms WHERE id=v_member.gym_id AND status<>'suspended') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='GYM_SUSPENDED';
    END IF;
    IF NEW.gym_id IS DISTINCT FROM v_member.gym_id THEN
        RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='VISIT_GYM_MISMATCH';
    END IF;
    IF v_member.status<>'active' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INACTIVE_MEMBER'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions WHERE gym_id=v_member.gym_id AND member_id=v_member.id
        AND status='active' AND start_date<=v_now AND end_date>=v_now) THEN
        RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='NO_ACTIVE_SUBSCRIPTION';
    END IF;
    IF NEW.branch_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.branches WHERE id=NEW.branch_id AND gym_id=v_member.gym_id) THEN
        RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='BRANCH_GYM_MISMATCH';
    END IF;
    IF NEW.method='qr' THEN
        IF NEW.qr_nonce IS NULL OR NOT EXISTS (SELECT 1 FROM public.qr_nonces
            WHERE nonce=NEW.qr_nonce AND gym_id=v_member.gym_id AND member_id=v_member.id
              AND used_at>=v_now-interval '1 minute') THEN
            RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='QR_NONCE_REQUIRED';
        END IF;
    ELSIF NEW.qr_nonce IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='MANUAL_VISIT_CANNOT_CONSUME_QR';
    END IF;
    NEW.scanned_by:=auth.uid();
    NEW.entered_at:=v_now;
    NEW.created_at:=v_now;
    NEW.source:='online';
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_visit_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_visit_insert ON public.visits;
CREATE TRIGGER trg_guard_visit_insert BEFORE INSERT ON public.visits
    FOR EACH ROW EXECUTE FUNCTION public.guard_visit_insert();

CREATE OR REPLACE FUNCTION public.require_nonce_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.visits v WHERE v.qr_nonce=NEW.nonce
        AND v.member_id=NEW.member_id AND v.gym_id=NEW.gym_id AND v.method='qr') THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='NONCE_REQUIRES_VISIT';
    END IF;
    RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.require_nonce_visit() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_require_nonce_visit ON public.qr_nonces;
CREATE CONSTRAINT TRIGGER trg_require_nonce_visit AFTER INSERT ON public.qr_nonces
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_nonce_visit();

CREATE OR REPLACE FUNCTION public.verify_and_record_visit(
    p_nonce text, p_member_id uuid, p_branch_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_member public.members%ROWTYPE; v_sub public.subscriptions%ROWTYPE;
    v_branch uuid; v_visit uuid; v_plan_name text; v_now timestamptz;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='UNAUTHENTICATED'; END IF;
    IF p_nonce IS NULL OR btrim(p_nonce)='' OR octet_length(p_nonce)>256 THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_NONCE';
    END IF;
    SELECT * INTO v_member FROM public.members WHERE id=p_member_id;
    IF NOT FOUND OR NOT public.has_staff_permission(v_member.gym_id,'can_scan_qr') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='SCAN_PERMISSION_REQUIRED';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || v_member.gym_id::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || v_member.id::text,0));
    v_now:=clock_timestamp();
    IF NOT EXISTS (SELECT 1 FROM public.gyms WHERE id=v_member.gym_id AND status<>'suspended') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='GYM_SUSPENDED';
    END IF;
    IF v_member.status<>'active' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='INACTIVE_MEMBER'; END IF;
    SELECT * INTO v_sub FROM public.subscriptions WHERE gym_id=v_member.gym_id AND member_id=v_member.id
        AND status='active' AND start_date<=v_now AND end_date>=v_now ORDER BY end_date DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='NO_ACTIVE_SUBSCRIPTION'; END IF;
    v_branch:=coalesce(p_branch_id,v_member.branch_id);
    IF v_branch IS NULL THEN
        SELECT id INTO v_branch FROM public.branches WHERE gym_id=v_member.gym_id ORDER BY is_main DESC,created_at,id LIMIT 1;
    END IF;
    IF v_branch IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.branches WHERE id=v_branch AND gym_id=v_member.gym_id) THEN
        RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='BRANCH_GYM_MISMATCH';
    END IF;
    INSERT INTO public.qr_nonces(nonce,gym_id,member_id) VALUES(p_nonce,v_member.gym_id,v_member.id);
    INSERT INTO public.visits(gym_id,member_id,branch_id,scanned_by,method,source,qr_nonce)
    VALUES(v_member.gym_id,v_member.id,v_branch,auth.uid(),'qr','online',p_nonce) RETURNING id INTO v_visit;
    SELECT name INTO v_plan_name FROM public.plans WHERE id=v_sub.plan_id AND gym_id=v_member.gym_id;
    RETURN jsonb_build_object('allowed',true,'member',jsonb_build_object('id',v_member.id,'full_name',v_member.full_name,'phone',v_member.phone),
        'subscription',jsonb_build_object('end_date',v_sub.end_date,'plan_name',v_plan_name),'visit_id',v_visit);
EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='REPLAY';
END $$;
REVOKE ALL ON FUNCTION public.verify_and_record_visit(text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_and_record_visit(text,uuid,uuid) TO authenticated;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.qr_nonces'::regclass AND tgname='trg_require_nonce_visit' AND tgdeferrable AND tginitdeferred) THEN
        RAISE EXCEPTION '06 verification failed: atomic nonce guard missing';
    END IF;
END $$;
COMMIT;
SELECT '06_nonce_visit_atomic applied; runtime verification still required' AS result;
