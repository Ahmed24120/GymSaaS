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
