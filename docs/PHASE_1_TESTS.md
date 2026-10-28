# تنفيذ وفحص المرحلة الأولى

هذه تعليمات لقاعدة **اختبار فقط**. لم ينفّذ Codex أي SQL على Supabase. أوقف استعمال Preview أثناء تطبيق المجموعة؛ بعض الكتابات القديمة ستُرفض إلى أن تُربط RPC في المرحلة الثانية. لا تشغّل سكربت العزل القديم لأنه يشير إلى أعمدة غير موجودة (`gyms.phone/currency`, `members.notes`). لا تشغّل demo_data.sql.

قبل التنفيذ احتفظ بنسخة schema/السياسات والدوال الحالية من مشروع الاختبار. سجّل المشروع وإصدار PostgreSQL ووقت التنفيذ دون مفاتيح. اختبارات PGlite المحلية تستخدم PostgreSQL18 مع محاكاة `auth.uid()`؛ ليست إثباتًا لـPostgREST أو إصدار Supabase المستهدف أو التزامن بين اتصالات مستقلة.

## 01 — حماية راية المدير العام

نفّذ `supabase/dev/01_profiles_lockdown.sql`. يظهر:

```text
01_profiles_lockdown applied; runtime verification still required
```

ثم نفّذ الاختبار التالي بعد استبدال UUID بحساب مستخدم اختبار عادي موجود. كل التغييرات في معاملة تُلغى. عدم ظهور استثناء يعني فشل الاختبار، فلا تنتقل للإطلاق.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<NORMAL_TEST_USER_UUID>', true);
SELECT current_user, auth.uid();
UPDATE public.profiles SET is_super_admin = true WHERE id = auth.uid();
-- المتوقع: ERROR 42501: ADMIN_FLAG_CHANGE_FORBIDDEN
ROLLBACK;
```

إذا aborted المعاملة، أرسل `ROLLBACK;` وحده قبل متابعة الأوامر. يجب كذلك أن يبقى تعديل الاسم الذاتي ممكنًا، وأن يسمح لمشرف منصة قائم بتغيير الراية من جلسة اختبار تخصه. لا تستخدم جلسة postgres لإثبات منع مستخدم authenticated.

دليل محلي: [01-sql-local.txt](evidence/phase1/01-sql-local.txt). تنفيذ الملف مرتين نجح محليًا؛ فحص التصعيد رفضهSQLSTATE42501. حالة Supabase: **غير منفّذ وغير مختبر**.
