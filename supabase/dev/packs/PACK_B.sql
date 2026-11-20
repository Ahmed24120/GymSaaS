
-- ===== 05_record_payment_rpc.sql =====
-- الغرض: BUG-PAY-01/02 وBUG-DATE-01 وBUG-TENANT-01؛ دفع وتجديد وتفعيل وتدقيق ذري.
-- المخاطر: يرفض إنشاء اشتراك منفردًا أو تعديل فترته؛ العميل القديم يتوقف حتى ربط RPC في المرحلة2.
-- قيود العلاقات تُفحص على البيانات الموجودة: أي ربط تاريخي بين صالتين يوقف الملف بلا تصحيح/حذف تلقائي.
-- الاختبار: RPC بمبلغ1500، ثم1500.5 و0 وخطأ دفع قسري؛ تحقق من عدم بقاء اشتراك/تفعيل/تدقيق جزئي.
-- التراجع: ROLLBACK عند فشل المعاملة؛ بعد COMMIT أوقف Preview واستعد schema والدوال المحفوظة
-- في مراجعة مستقلة. لا تحذف المدفوعات أو التدقيق ولا تعطل RLS لإعادة العميل القديم.
BEGIN;
DO $$ BEGIN
    IF to_regprocedure('public.has_staff_permission(uuid,text)') IS NULL THEN RAISE EXCEPTION 'APPLY_04_FIRST'; END IF;
END $$;

-- موجود في المخطط الأصلي في الأسطر475–477؛ يُعاد إنشاؤه أيضًا لإصلاح انحراف قاعدة الاختبار.
-- الدالة موجودة في المخطط الأصلي، ويستبدل تعريفها أدناه داخل المعاملة نفسها.
DROP TRIGGER IF EXISTS trg_calculate_subscription_end_date ON public.subscriptions;
CREATE TRIGGER trg_calculate_subscription_end_date BEFORE INSERT ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.calculate_subscription_end_date();
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger
        WHERE tgrelid='public.subscriptions'::regclass
          AND tgname='trg_calculate_subscription_end_date'
          AND tgfoid='public.calculate_subscription_end_date()'::regprocedure
          AND tgtype=7 AND tgenabled='O' AND NOT tgisinternal) THEN
        RAISE EXCEPTION '05_DATE_TRIGGER_MISSING_OR_INVALID: expected enabled BEFORE INSERT FOR EACH ROW';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_branches_gym_id_id ON public.branches(gym_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_members_gym_id_id ON public.members(gym_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_plans_gym_id_id ON public.plans(gym_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_gym_member_id ON public.subscriptions(gym_id,member_id,id);

DO $$ DECLARE r record; BEGIN
    FOR r IN SELECT * FROM (VALUES
        ('gym_staff','fk_staff_branch_gym','(gym_id,branch_id)','branches','(gym_id,id)'),
        ('members','fk_member_branch_gym','(gym_id,branch_id)','branches','(gym_id,id)'),
        ('subscriptions','fk_subscription_member_gym','(gym_id,member_id)','members','(gym_id,id)'),
        ('subscriptions','fk_subscription_plan_gym','(gym_id,plan_id)','plans','(gym_id,id)'),
        ('payments','fk_payment_member_gym','(gym_id,member_id)','members','(gym_id,id)'),
        ('payments','fk_payment_subscription_member_gym','(gym_id,member_id,subscription_id)','subscriptions','(gym_id,member_id,id)'),
        ('visits','fk_visit_member_gym','(gym_id,member_id)','members','(gym_id,id)'),
        ('visits','fk_visit_branch_gym','(gym_id,branch_id)','branches','(gym_id,id)'),
        ('qr_nonces','fk_nonce_member_gym','(gym_id,member_id)','members','(gym_id,id)'),
        ('notifications','fk_notification_member_gym','(gym_id,member_id)','members','(gym_id,id)')
    ) AS f(tab,con,cols,ref_tab,ref_cols) LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=format('public.%I',r.tab)::regclass AND conname=r.con) THEN
            EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY %s REFERENCES public.%I %s NOT VALID',r.tab,r.con,r.cols,r.ref_tab,r.ref_cols);
        END IF;
        EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',r.tab,r.con);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.guard_tenant_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF NEW.gym_id IS DISTINCT FROM OLD.gym_id THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='TENANT_IDENTITY_IMMUTABLE';
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_tenant_identity() FROM PUBLIC, anon, authenticated;
DO $$ DECLARE t text; BEGIN
    FOREACH t IN ARRAY ARRAY['branches','members','plans','gym_staff','subscriptions','payments','visits','qr_nonces','notifications','announcements','platform_subscriptions'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_guard_tenant_identity ON public.%I',t);
        EXECUTE format('CREATE TRIGGER trg_guard_tenant_identity BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.guard_tenant_identity()',t);
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.calculate_subscription_end_date()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
SET timezone = 'Africa/Nouakchott' AS $$
DECLARE v_gym uuid; v_days integer; v_previous timestamptz;
BEGIN
    SELECT gym_id INTO v_gym FROM public.members WHERE id=NEW.member_id;
    IF NOT FOUND OR auth.uid() IS NULL OR NOT public.has_staff_permission(v_gym,'can_record_payments') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='RECORD_PAYMENT_FORBIDDEN';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || v_gym::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || NEW.member_id::text,0));
    IF NOT EXISTS (SELECT 1 FROM public.gyms WHERE id=v_gym AND status<>'suspended') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='GYM_SUSPENDED';
    END IF;
    IF NEW.gym_id IS NOT NULL AND NEW.gym_id<>v_gym THEN
        RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='SUBSCRIPTION_GYM_MISMATCH';
    END IF;
    SELECT duration_days INTO v_days FROM public.plans WHERE id=NEW.plan_id AND gym_id=v_gym AND active;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='PLAN_GYM_MISMATCH_OR_INACTIVE'; END IF;
    SELECT max(end_date) INTO v_previous FROM public.subscriptions
        WHERE gym_id=v_gym AND member_id=NEW.member_id AND status='active';
    NEW.gym_id := v_gym;
    NEW.start_date := greatest(clock_timestamp(),coalesce(v_previous,'-infinity'::timestamptz));
    NEW.end_date := ((NEW.start_date AT TIME ZONE 'Africa/Nouakchott') + make_interval(days=>v_days)) AT TIME ZONE 'Africa/Nouakchott';
    NEW.status := 'active';
    NEW.created_at := clock_timestamp();
    NEW.updated_at := NEW.created_at;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.calculate_subscription_end_date() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_subscription_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || OLD.gym_id::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || OLD.member_id::text,0));
    IF NOT public.has_staff_permission(OLD.gym_id,'can_cancel_payments')
       OR (to_jsonb(NEW) - ARRAY['status','updated_at']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','updated_at'])
       OR NEW.status NOT IN ('cancelled','expired') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='SUBSCRIPTION_TERMS_IMMUTABLE';
    END IF;
    NEW.updated_at:=clock_timestamp();
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_subscription_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_subscription_update ON public.subscriptions;
CREATE TRIGGER trg_guard_subscription_update BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.guard_subscription_update();

CREATE OR REPLACE FUNCTION public.guard_payment_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF auth.uid() IS NULL OR NEW.recorded_by<>auth.uid()
       OR NOT public.has_staff_permission(NEW.gym_id,'can_record_payments') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='RECORD_PAYMENT_FORBIDDEN';
    END IF;
    IF NEW.amount_mru<=0 OR NEW.status<>'completed' OR NEW.cancelled_by IS NOT NULL
       OR NEW.cancelled_at IS NOT NULL OR NEW.cancellation_reason IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='INVALID_PAYMENT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.id=NEW.subscription_id
        AND s.gym_id=NEW.gym_id AND s.member_id=NEW.member_id) THEN
        RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='PAYMENT_SUBSCRIPTION_GYM_MISMATCH';
    END IF;
    NEW.created_at:=clock_timestamp();
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_payment_insert() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_payment_insert ON public.payments;
CREATE TRIGGER trg_guard_payment_insert BEFORE INSERT ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.guard_payment_insert();

-- شرط مؤجل إلى نهاية المعاملة: INSERT منفرد للاشتراك لا يتيح تفعيلًا مجانيًا.
CREATE OR REPLACE FUNCTION public.require_subscription_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.payments p WHERE p.subscription_id=NEW.id
        AND p.gym_id=NEW.gym_id AND p.member_id=NEW.member_id AND p.status='completed' AND p.amount_mru>0) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='SUBSCRIPTION_REQUIRES_PAYMENT';
    END IF;
    RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.require_subscription_payment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_require_subscription_payment ON public.subscriptions;
CREATE CONSTRAINT TRIGGER trg_require_subscription_payment AFTER INSERT ON public.subscriptions
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.require_subscription_payment();

CREATE OR REPLACE FUNCTION public.require_paid_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp AS $$
BEGIN
    IF TG_OP='UPDATE' AND OLD.status=NEW.status THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.subscriptions s JOIN public.payments p ON p.subscription_id=s.id
        AND p.gym_id=s.gym_id AND p.member_id=s.member_id
        WHERE s.member_id=NEW.id AND s.gym_id=NEW.gym_id AND s.status='active'
          AND s.start_date<=clock_timestamp() AND s.end_date>=clock_timestamp()
          AND p.status='completed' AND p.amount_mru>0) THEN
        RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='MEMBER_ACTIVATION_REQUIRES_PAYMENT';
    END IF;
    RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.require_paid_activation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_require_paid_activation ON public.members;
CREATE CONSTRAINT TRIGGER trg_require_paid_activation AFTER INSERT OR UPDATE ON public.members
    DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.status='active')
    EXECUTE FUNCTION public.require_paid_activation();

CREATE OR REPLACE FUNCTION public.record_payment(
    p_member_id uuid, p_plan_id uuid, p_amount_mru integer, p_method public.payment_method,
    p_transaction_ref text DEFAULT NULL, p_branch_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp
SET timezone = 'Africa/Nouakchott' AS $$
DECLARE v_member public.members%ROWTYPE; v_plan public.plans%ROWTYPE;
    v_sub public.subscriptions%ROWTYPE; v_pay public.payments%ROWTYPE; v_recorder jsonb;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='UNAUTHENTICATED'; END IF;
    IF p_amount_mru IS NULL OR p_amount_mru<=0 OR p_method IS NULL THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='POSITIVE_INTEGER_MRU_REQUIRED';
    END IF;
    SELECT * INTO v_member FROM public.members WHERE id=p_member_id;
    IF NOT FOUND OR NOT public.has_staff_permission(v_member.gym_id,'can_record_payments') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='RECORD_PAYMENT_FORBIDDEN';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || v_member.gym_id::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || p_member_id::text,0));
    IF NOT EXISTS (SELECT 1 FROM public.gyms WHERE id=v_member.gym_id AND status<>'suspended') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='GYM_SUSPENDED';
    END IF;
    SELECT * INTO v_plan FROM public.plans WHERE id=p_plan_id AND gym_id=v_member.gym_id AND active;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='PLAN_GYM_MISMATCH_OR_INACTIVE'; END IF;
    IF p_branch_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.branches WHERE id=p_branch_id AND gym_id=v_member.gym_id
    ) THEN RAISE EXCEPTION USING ERRCODE='23503', MESSAGE='BRANCH_GYM_MISMATCH'; END IF;
    INSERT INTO public.subscriptions(gym_id,member_id,plan_id,start_date,end_date,status)
    VALUES(v_member.gym_id,v_member.id,v_plan.id,clock_timestamp(),NULL,'active') RETURNING * INTO v_sub;
    INSERT INTO public.payments(gym_id,member_id,subscription_id,amount_mru,method,transaction_ref,recorded_by)
    VALUES(v_member.gym_id,v_member.id,v_sub.id,p_amount_mru,p_method,nullif(btrim(p_transaction_ref),''),auth.uid())
    RETURNING * INTO v_pay;
    UPDATE public.members SET status='active',updated_at=clock_timestamp() WHERE id=v_member.id;
    -- مشغلات التدقيق الأصلية تكتب داخل المعاملة نفسها؛ لا إدراج يدوي أو سجل مكرر.
    SELECT jsonb_build_object('id',id,'full_name',full_name) INTO v_recorder FROM public.profiles WHERE id=auth.uid();
    RETURN to_jsonb(v_pay) || jsonb_build_object(
        'member',jsonb_build_object('id',v_member.id,'full_name',v_member.full_name,'phone',v_member.phone),
        'subscription',jsonb_build_object('id',v_sub.id,'start_date',v_sub.start_date,'end_date',v_sub.end_date,
            'plan',jsonb_build_object('id',v_plan.id,'name',v_plan.name)), 'recorder',v_recorder);
END $$;
REVOKE ALL ON FUNCTION public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid) TO authenticated;

DO $$ BEGIN
    IF (SELECT prosecdef FROM pg_proc WHERE oid='public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid)'::regprocedure) THEN
        RAISE EXCEPTION '05 verification failed: RPC must be SECURITY INVOKER';
    END IF;
END $$;
COMMIT;
SELECT '05_record_payment_rpc applied; runtime verification still required' AS result;

-- ===== 06_nonce_visit_atomic.sql =====
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

-- ===== 10_cancel_payment_subscription.sql =====
-- الغرض: cancel_payment ينفّذ في معاملة واحدة: إلغاء الدفعة (soft-cancel) + تحويل الاشتراك المرتبط إلى 'cancelled'.
-- بعدها يرفض verify_and_record_visit الدخول (NO_ACTIVE_SUBSCRIPTION). الصلاحية can_cancel_payments، السبب >= 3 أحرف،
-- والتدقيق عبر المشغلات القائمة (trg_audit_payments / trg_audit_subscriptions). لا يعدّل 04.
-- المخاطر: يستبدل تعريف public.cancel_payment(uuid,text) من 04 (التوقيع نفسه). حالة العضو status لا تتغير (لا صلاحية can_manage_members مضمونة).
-- الاختبار: 09_proofs.sql (قسم f). التراجع: أعد تنفيذ تعريف cancel_payment من 04_permissions_enforcement.sql.
-- يُنفَّذ بعد 06 (الحزمة B).
BEGIN;
DO $$ BEGIN
    IF to_regprocedure('public.verify_and_record_visit(text,uuid,uuid)') IS NULL
       OR to_regprocedure('public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid)') IS NULL THEN
        RAISE EXCEPTION 'APPLY_05_AND_06_FIRST';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_payment(p_payment_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER
SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE v_payment public.payments%ROWTYPE; v_sub_status public.subscription_status;
BEGIN
    IF auth.uid() IS NULL OR length(btrim(coalesce(p_reason,'')))<3 THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='CANCELLATION_REASON_REQUIRED';
    END IF;
    SELECT * INTO v_payment FROM public.payments WHERE id=p_payment_id;
    IF NOT FOUND OR NOT public.has_staff_permission(v_payment.gym_id,'can_cancel_payments') THEN
        RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='CANCEL_PAYMENT_FORBIDDEN';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended('gym:' || v_payment.gym_id::text,0));
    PERFORM pg_advisory_xact_lock(hashtextextended('member:' || v_payment.member_id::text,0));
    IF v_payment.status<>'completed' THEN
        RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='PAYMENT_NOT_CANCELLABLE';
    END IF;
    UPDATE public.payments SET status='cancelled', cancelled_by=auth.uid(),
        cancelled_at=clock_timestamp(), cancellation_reason=btrim(p_reason)
    WHERE id=p_payment_id RETURNING * INTO v_payment;
    UPDATE public.subscriptions SET status='cancelled'
    WHERE id=v_payment.subscription_id AND gym_id=v_payment.gym_id AND status IN ('active','paused');
    SELECT status INTO v_sub_status FROM public.subscriptions WHERE id=v_payment.subscription_id;
    RETURN to_jsonb(v_payment) || jsonb_build_object('subscription_status', v_sub_status);
END $$;
REVOKE ALL ON FUNCTION public.cancel_payment(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_payment(uuid,text) TO authenticated;

DO $$ BEGIN
    IF (SELECT prosecdef FROM pg_proc WHERE oid='public.cancel_payment(uuid,text)'::regprocedure) THEN
        RAISE EXCEPTION '10 verification failed: cancel_payment must be SECURITY INVOKER';
    END IF;
END $$;
COMMIT;
SELECT '10_cancel_payment_subscription applied; runtime verification still required (09_proofs.sql)' AS result;
