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
