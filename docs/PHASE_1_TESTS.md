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

## 02 — تخزين nonce غير قابل للتعديل

نفّذ `02_qr_nonces_hardening.sql` بعد01. التنظيف يحذف فقط سجلات تجاوزت عشر دقائق، بحد1000 سجل في الاستدعاء؛ `REVOKE TRUNCATE` يسحب صلاحية ولا ينفذ تفريغًا. تاريخ `used_at` يُفرض خادميًا.

```sql
SELECT has_table_privilege('authenticated','public.qr_nonces','UPDATE') AS can_update,
       has_table_privilege('authenticated','public.qr_nonces','DELETE') AS can_delete,
       has_function_privilege('authenticated','public.purge_expired_qr_nonces()','EXECUTE') AS can_purge;
-- المتوقع false, false, false
SELECT policyname, cmd, permissive FROM pg_policies
WHERE schemaname='public' AND tablename='qr_nonces';
```

الدليل المحلي [02-sql-local.txt](evidence/phase1/02-sql-local.txt): ثماني حالات ناجحة، تشمل رفض nonce مكرر وتعديل وحذف nonce وكتابة صالة أخرى، وفرض التاريخ. اختبار حفظ nonce منفردًا خاص بالمرحلة02؛ بعد06 سيشترط وجود زيارة في المعاملة نفسها، وهو تشديد إضافي مقصود. على Supabase لم تُنفّذ هذه الحالات.

## 03 — الصالة المعلقة

نفّذ `03_gym_status_guard.sql`. القيد الإضافي يشمل سياسات قراءة العضو الذاتية، وليس دوال الطاقم وحدها. يستطيع super_admin إدارة الصالة المعلقة وإعادة تفعيلها، بينما تبقى جلسة Auth والملف الشخصي الذاتي متاحين للخروج وإدارة الحساب. لا يُمنع حساب الشخص من صالة أخرى نشطة.

في معاملة اختبار، علّق صالة بواسطة مشرف المنصة، ثم بدّل الدور إلىauthenticated وضع UUID موظفها أو عضوها في `request.jwt.claim.sub`. افحص:

```sql
SELECT public.is_gym_staff('<GYM_UUID>'), public.is_gym_member('<GYM_UUID>');
SELECT id FROM public.members WHERE gym_id='<GYM_UUID>';
SELECT id FROM public.visits WHERE gym_id='<GYM_UUID>';
-- staff/member: false أو صفر صفوف. super_admin: يستطيع إدارة الصالة.
```

أعد التفعيل أوROLLBACK قبل متابعة الاختبارات. [03-sql-local.txt](evidence/phase1/03-sql-local.txt) يسجل تسع حالات ناجحة محليًا، تشمل رفض تغيير حالة الصالة بواسطة مالكها ومنع انتحال user_id في دوال العضوية. حالة Supabase: غير مختبر.

## 04 — الصلاحيات والإلغاء

نفّذ `04_permissions_enforcement.sql`. للموظف العادي تُقرأ قيم JSON **boolean** فقط؛ القيمة المفقودة و`"true"` النصية مرفوضتان. المفاتيح المسموح بها للاستقبال: `can_manage_members`, `can_import_members`, `can_record_payments`, `can_scan_qr`. الاستيراد يسمح بالإدراج فقط، ولا يفعّل الاشتراك. مالك الصالة يملك الإدارة ضمن صالته؛ تغيير السعر والإلغاء وإدارة الموظفين لا تُمنح للاستقبال حتى إذا وضعها أحد فيJSON.

```sql
-- نفّذ بهوية استقبال اختبار بعد SET LOCAL ROLE authenticated وset_config داخل BEGIN/ROLLBACK.
SELECT public.has_staff_permission('<GYM_UUID>', 'can_record_payments');
SELECT public.has_staff_permission('<GYM_UUID>', 'can_manage_plans');
SELECT public.has_staff_permission('<GYM_UUID>', 'can_cancel_payments');
-- الأخيران false للاستقبال. اسحب صلاحية الدفع من جلسة المالك وأعد المحاولة.
```

RPC الإلغاء: `public.cancel_payment(p_payment_id uuid,p_reason text)`؛ يلزم سبب بثلاثة أحرف على الأقل وصلاحية المالك، ويُفرض author والتوقيت خادميًا. التدقيق تلقائي في المعاملة نفسها؛ لاDELETE للدفع ولاINSERT/UPDATE/DELETE مباشرة للتدقيق. تعديل السعر مقيد بالمالك عبرRLS. [04-sql-local.txt](evidence/phase1/04-sql-local.txt) يسجل18 حالة ناجحة محليًا، تشمل سبب الإلغاء والمنفذ فيaudit ورفض الإلغاء من الاستقبال. لا إثبات على Supabase بعد.

## 05 — معاملة الدفع

نفّذ `05_record_payment_rpc.sql`. إذا فشل التحقق من علاقة تاريخية بين صالتين، يتراجع الملف نفسه؛ لا تحذف السجلات ولا تتجاوز التحقق. تبقى الملفات السابقة مطبقة، وتبقى Preview متوقفة حتى معالجة السبب.

العقد: `record_payment(p_member_id uuid,p_plan_id uuid,p_amount_mru integer,p_method payment_method,p_transaction_ref text DEFAULT NULL,p_branch_id uuid DEFAULT NULL)` يعيدJSON للدفع مع العضو والاشتراك والباقة والمحصل. **لا gym_id أوstart/end من العميل**. المدة مأخوذة من الباقة الحالية بالأيام؛ التجديد يبدأ من آخر نهاية فعالة أو الآن، ويُحسب في `Africa/Nouakchott`. المشغلات الأصلية تكتب التدقيق في المعاملة نفسها.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','<OWNER_OR_ALLOWED_RECEPTION_UUID>',true);
SELECT public.record_payment(
    p_member_id => '<MEMBER_UUID>', p_plan_id => '<PLAN_UUID>',
    p_amount_mru => 1500, p_method => 'cash', p_transaction_ref => 'TEST_ONLY'
);
SET CONSTRAINTS ALL IMMEDIATE;
SELECT id,amount_mru,recorded_by FROM public.payments WHERE member_id='<MEMBER_UUID>';
ROLLBACK;
```

للكسر أرسل1500.5 كما هو دون تحويله إلىinteger أولًا؛ المتوقع خطأ نوع/إدخال ولا كتابات. لا تختبر بقيمة تم تقريبها قبل وصولها للدالة. الصفر والسالب يرفضان بـ22023. `SECURITY INVOKER` يبقي RLS فعالة. مشغلات مؤجلة تمنع اشتراكًا بلا دفع وتفعيلًا جديدًا بلا اشتراك مدفوع. الربط القديم الذي ينشئ الاشتراك في طلب منفصل سيفشل حتى المرحلة2، وهذا مقصود.

[05-sql-local.txt](evidence/phase1/05-sql-local.txt):29 حالة محلية ناجحة. شمل الاختبار أخطاء قسرية عند إدخال الدفع وبعد إدخال الدفع والتدقيق أثناء التفعيل؛ جميع العدادات وحالة العضو عادت كما كانت. لا اختبارات تزامن متعددة الاتصالات ولاPostgREST حقيقي ولاقاعدة Supabase في هذا الدليل.

## 06 — nonce والزيارة في معاملة واحدة

نفّذ `06_nonce_visit_atomic.sql` بعد نجاح05. يضيف `visits.qr_nonce` وفهرسًا فريدًا، ويحافظ على الزيارات السابقة دون اصطناع nonce لها. الزيارات الجديدة بطريقةQR تتطلب nonce، وحفظnonce جديد يتطلب زيارة مقابلة في المعاملة نفسها. فشل أي خطوة يرفع خطأSQL ويرجع الكتابتين؛ لاJSON فشل بعد كتابة جزئية.

العقد: `verify_and_record_visit(p_nonce text,p_member_id uuid,p_branch_id uuid DEFAULT NULL)` يعيد استجابةQR ناجحة بمعرّف زيارة فعلي. التكرار يرفع `23505 / REPLAY`؛ عدم وجود اشتراك جارٍ يرفع `P0001 / NO_ACTIVE_SUBSCRIPTION`، والصلاحية المفقودة أو الصالة المعلقة ترفع42501. API في المرحلة2 يجب أن يرفض **كل** أخطاءRPC، بما فيها فقد الجدول/الدالة أو انقطاع التخزين.

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','<ALLOWED_RECEPTION_UUID>',true);
SELECT public.verify_and_record_visit('TEST_NONCE_UNIQUE','<ACTIVE_MEMBER_UUID>','<BRANCH_UUID>');
SET CONSTRAINTS ALL IMMEDIATE;
SELECT id,qr_nonce FROM public.visits WHERE qr_nonce='TEST_NONCE_UNIQUE';
ROLLBACK;
```

التوقيع وانتهاء الرمز بعد30 ثانية ما زالا مسؤولية خادمAPI؛ لا ترسل secret للدالة أو للجوال. صاحب صلاحية الدخول يستطيع تسجيل دخول يدوي مصرح به؛ RPC وحدها ليست إثبات أن مصدر الطلب كاميرا أو رمزًا موقعًا. إثبات HMAC وexpiry الحقيقيين ينتظر ربطAPI واختبارات المرحلة3.

[06-sql-local.txt](evidence/phase1/06-sql-local.txt):41 حالة محلية ناجحة للمجموعة، تشمل نجاح زيارة حقيقية، رفض التكرار، تراجعnonce عند فشل زيارة قسري، رفض اشتراك مستقبلي أو منتهٍ أو عضو غير نشط، منع الدخول إلى صالة معلقة حتى منRPC المشرف العام، وبقاء البحث/الدخول اليدوي خاضعًا للاشتراك. أُعيدت الملفات الستة على بيانات الاختبار بعد الكتابات؛ لم تتغير سجلات المدفوعات. التزامن بين اتصالات متعددة وSupabase الحقيقي غير مختبرين.

## فحص قبل التطبيق والتراجع

قبل01، على قاعدة الاختبار فقط، تحقق من المخطط الأصلي وRLS:

```sql
SELECT version();
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity;
-- المتوقع صفر جداول عمل دونRLS؛ إن ظهرت جداول فتوقف وأرسل أسماءها فقط.
SELECT schemaname,tablename,policyname,permissive,cmd FROM pg_policies
WHERE schemaname='public' ORDER BY tablename,policyname;
```

احتفظ بتصدير schema قبل التطبيق في مكان محلي آمن، لا فيGit أوchat. كل ملف معاملة مستقلة؛ فشل الملف يترك الملفات السابقة مطبقة. عند الحاجة لتراجع بعدCOMMIT: أوقفPreview، احتفظ بالأدلة، واستعد نسخة قاعدة الاختبار السابقة كاملة أو أصلح للأمام بملفNN جديد يراجعه المالك. استعادة دالة وحدها مع سياسات أحدث قد لا تكفي. لا يوجد تراجع آلي يعيد ثغرة تصعيد أو يسمح بحذف المدفوعات. لا تحذف عمودqr_nonce أو بياناته لإرضاء عميل قديم.

يمكن إعادة الاختبارات المحلية من [توثيق المشغّل](PHASE_1_LOCAL_HARNESS.md). المراجع: [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)، [أمان الدوال](https://www.postgresql.org/docs/current/sql-createfunction.html)، [PGlite](https://pglite.dev/docs/api).
