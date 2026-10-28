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
