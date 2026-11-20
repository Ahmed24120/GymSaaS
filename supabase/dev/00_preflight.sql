-- الغرض: فحص قراءة فقط قبل تطبيق أي ملف. لا يكتب شيئًا.
-- المخاطر: لا شيء (SELECT فقط). الاختبار: شغّله وأرسل النتائج. التراجع: غير لازم.
SELECT 'version' AS check_name, version() AS result;
SELECT 'tables_without_rls' AS check_name, coalesce(string_agg(c.relname, ', '), 'NONE') AS result
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
SELECT 'subscriptions_triggers' AS check_name, tgname AS result
FROM pg_trigger WHERE tgrelid='public.subscriptions'::regclass AND NOT tgisinternal;
SELECT 'policies' AS check_name, tablename || '.' || policyname AS result
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;
