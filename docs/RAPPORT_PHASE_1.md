# RAPPORT PHASE 1 — 2026-10-28

**الحكم: NO-GO. تسليم ملفات SQL للمراجعة والتنفيذ اليدوي، وليس إعلان نجاح قاعدة Supabase.** آخر commit SQL مرفوع على `cx/work`: `21630f9aa14853f5dc7e58c68e11a3073e8bcfcb`. الفرع `feat/mvp-complete` لم يُدمج فيه شيء، ولم يبدأ نشرPreview أوالمرحلة2.

## 1. المنفّذ مع الدليل

أنشئت [ARCHITECTURE.md](ARCHITECTURE.md) قبل كتابة SQL، ثم ستة إصلاحات متسلسلة، كل منها على فرعfix منcx/work، مع commit صغير وfetch وشجرة نظيفة قبل الدمج. يتضمن كل ملف الغرض والمخاطر والاختبار والتراجع، ومعاملةBEGIN/COMMIT قابلة لإعادة التنفيذ.

اختبار المجموعة على **PostgreSQL18.6 عبرPGlite0.5.12 محليًا** نجح في41 حالة. Auth وامتيازاتauthenticated محاكاة محلية؛ لم يتصل المشغّل بقاعدة خارجية. أُعيد تطبيق الملفات مرتين ثم على بيانات مدفوعات ناتجة عن الاختبار، وبصمة سجلات المدفوعات لم تتغير. نُفّذ RLS والمشغلات والقيود فعليًا في المحرك المحلي.

```text
node .tools/phase1-sql-test.mjs 6
LOCAL SQL RESULT: 41 passed, 0 failed; applied steps 01..06
```

[الاستعلامات والخروج الخام](evidence/phase1/06-sql-local.txt)، [مصدر المشغّل القابل لإعادة التنفيذ](PHASE_1_LOCAL_HARNESS.md)، [بصمات الملفات والتدقيق الثابت](evidence/phase1/sql-inventory.txt).

عند كل ملف01..06 نُفّذت فحوص الويب دون أي تعديل تحتapps:

```text
npm run check exit=1
Tests 5 failed | 49 passed (54)
tsc --noEmit exit=0
next lint exit=0
next build exit=0
Expected five failures only: true
```

الخمسة نفسها: QR-01 مرتان، QR-02، PAY-01، PAY-02. لا اختبار إضافي فاشل ولا اختبار أصلي معدّل أومعطّل أوتم تجاهله. [الخروج النهائي الكامل](evidence/phase1/06-web-check.txt)، والملفات01..05 محفوظة بجانبه. تحذيراتwebpack cache موجودة في الخروج الخام، ولا تعني فشل البناء.

## 2. غير منفّذ / غير مختبر

لم ينفذ Codex الملفات على Supabase؛ صاحب المشروع وحده ينفذها فيSQL Editor. لم تُستخدم جلسات حقيقية أوPostgREST. Docker مثبت لكن محركه غير مشغّل، لذلك كان المحرك المحلي18 بدل اختبارPostgreSQL15 الأصلي. لا إثبات تزامن من اتصالات مستقلة، ولاS1/S2/S3/S6 على رابط عام أوهاتف حقيقي. الواجهة وربطRPC وBearer لم تتغير، ولم تُعد فحوصPlaywright أوLighthouse في هذه المرحلة لأنapps لم تتغير. نتائج27 أكتوبر تبقى تاريخية فيTESTING.md.

لم تُعدّل migrations أوseed.sql، ولم يُنفذdemo_data.sql أوmulti_tenant_test.sql القديم. لا مفاتيح إدارية في الشيفرة الجديدة، ولاGRANT إلىanon، ولاpush بالقوة.

## 3. حالة العيوب

|العيب|الحالة|الدليل وحده العملي|
|---|---|---|
|BUG-SEC-01|مصحح محليًا؛ مفتوح علىSupabase|01: رفض التصعيد42501 وبقاء التعديل الذاتي الطبيعي|
|BUG-QR-03|مصحح محليًا؛ مفتوح علىSupabase|02: INSERT/SELECT فقط، منعUPDATE/DELETE، توقيت خادمي وتنظيف مقيد|
|BUG-SUSPEND-01|مصحح فيRLS المحلية؛ الربط والتحقق الحقيقي مفتوحان|03: سياسات مقيدة تغلق OR الخاصة بعضو الصالة، واستثناء إداري للمشرف|
|BUG-SEC-02|تحقق قاعدة جاهز محليًا؛ واجهة الإدارة مفتوحة|04: قيمboolean صريحة، رفض صلاحية مسحوبة، رفض السعر والإلغاء من الاستقبال|
|BUG-PAY-01/02، DATE-01، TENANT-01|SQL جاهز محليًا؛ مفتوح للتطبيق والتحقق الحقيقي|05: معاملة ذرية، رفض1500.5، تجديد يحفظ المتبقي، مفاتيح مركبة وحظر الربط العابر|
|BUG-QR-04|SQL جاهز محليًا؛ ربطAPI مفتوح|06: nonce وزيارة ذريان، بداية ونهاية الاشتراك، تراجع عند الفشل|
|BUG-QR-01/02|مفتوح|API القديم ما زال يبتلع أخطاء الكتابة؛3 اختبارات حمراء محفوظة|
|BUG-MOBILE-01/02/03، QR-05، DEPS-01، INSTALL-01، PERF-01|مفتوحة|لا تغييرات تطبيق/حزم ضمن استثناء المرحلة1|
|BUG-STAFF-01، SCAN-01، PHOTO-01، ADS-01|مفتوحة|التنفيذ/العرض والتحقق بعد المرحلة1؛ لا شيء محاكى على أنه مكتمل|
|BUG-I18N-01، PHASE-01|قرار مؤجل للمالك|لا تنفيذ فرنسية أوتوسيع نطاق دون موافقة|

التفاصيل المرجعية وخطوات إعادة الإنتاج في[BUGS.md](../BUGS.md). لا عيب أُغلق نهائيًا اعتمادًا علىPGlite.

## 4. الملفات والـcommits

|الرقم|commit الإصلاح|دمجه المرفوع إلىcx/work|
|---|---|---|
|01|61b3bd6|a4437df|
|02|74bd980|1fd2557|
|03|bf2e7cd|0a88042|
|04|f6a797f|4a77f66|
|05|dfa5c6d|30cefff|
|06|bf93f61|21630f9|

الملفات المعدلة/المضافة بالنسبة إلىc5228b1:

- `supabase/dev/01_profiles_lockdown.sql`
- `supabase/dev/02_qr_nonces_hardening.sql`
- `supabase/dev/03_gym_status_guard.sql`
- `supabase/dev/04_permissions_enforcement.sql`
- `supabase/dev/05_record_payment_rpc.sql`
- `supabase/dev/06_nonce_visit_atomic.sql`
- `docs/ARCHITECTURE.md`
- `docs/PHASE_1_TESTS.md`
- `docs/PHASE_1_LOCAL_HARNESS.md`
- `docs/RAPPORT_PHASE_1.md`
- `docs/evidence/phase1/01-sql-local.txt`
- `docs/evidence/phase1/01-web-check.txt`
- `docs/evidence/phase1/02-sql-local.txt`
- `docs/evidence/phase1/02-web-check.txt`
- `docs/evidence/phase1/03-sql-local.txt`
- `docs/evidence/phase1/03-web-check.txt`
- `docs/evidence/phase1/04-sql-local.txt`
- `docs/evidence/phase1/04-web-check.txt`
- `docs/evidence/phase1/05-sql-local.txt`
- `docs/evidence/phase1/05-web-check.txt`
- `docs/evidence/phase1/06-sql-local.txt`
- `docs/evidence/phase1/06-web-check.txt`
- `docs/evidence/phase1/sql-inventory.txt`
- `docs/evidence/phase1/git-scope.txt`
- `HANDOFF.md`
- `BUGS.md`
- `TESTING.md`

استثناء المالك موثق بتاريخ28 أكتوبر فيHANDOFF.md على أساسhash c5228b1: SQL والوثائق فقط، الخمسة المعروفة فقط، وtsc/lint/build ناجحة. **ينتهي عند بدء المرحلة2**؛ من حينها لا دمج دونcheck أخضر بالكامل. hash تجميع وثائق التقرير النهائي يظهر في سجلGit ورسالة التسليم؛ hashSQL المختبر أعلاه مستقل عن التوثيق اللاحق.

## 5. المخاطر الباقية والجديدة

- تطبيق05/06 يمنع كتابات العميل القديم المنفصلة؛ أبقِPreview متوقفة حتى ربط التطبيق بالـRPC. لا ترجع إلى السياسات الضعيفة لإرضاء الواجهة القديمة.
- أي بيانات تاريخية بعلاقات صالة خاطئة قد توقف التحقق من المفاتيح المركبة؛ لا تصحيح أوحذف تلقائي. يلزم تحديد السجلات ومعالجتها بمراجعة المالك.
- صلاحيات استقبال فارغة تعني الرفض. أسماء المفاتيح الصريحة وتقييد السعر والإلغاء موثقة فيدليل المرحلة؛ يلزم ضبط حسابات الاختبار المقصودة.
- سكربت العزل القديم يشير إلىأعمدة غير موجودة؛ لا يُنفذ ولا يُعد دليلًا. نحتاج اختبارًا مطابقًا على القاعدة الحقيقية لاحقًا.
- RPC الزيارة لا تتحقق منHMAC؛ API يجب أن يتحقق أولًا ويرفض كل خطأRPC. إثبات مصدر«كاميرا» ليس قدرة لقاعدة البيانات؛ الدخول اليدوي صلاحية موظف معتمدة أيضًا.
- الثغرة الحرجة فيNext وxlsx وبقية موانع التطبيق باقية. تعليمات النشر القديمة فيREADME ليست إذنًا للنشر أثناء هذا الاستثناء. المرحلة5 ستكونPreview فقط.

## 6. إجراء صاحب المشروع الآن

على **قاعدة اختبار معزولة**، احتفظ بنسخة schema آمنة وافحصRLS كما في[الدليل](PHASE_1_TESTS.md)، ثم نفّذ بالتسلسل:

1. [01_profiles_lockdown.sql](../supabase/dev/01_profiles_lockdown.sql)، ثم أرسل `exécuté 01`.
2. [02_qr_nonces_hardening.sql](../supabase/dev/02_qr_nonces_hardening.sql)، ثم `exécuté 02`.
3. [03_gym_status_guard.sql](../supabase/dev/03_gym_status_guard.sql)، ثم `exécuté 03`.
4. [04_permissions_enforcement.sql](../supabase/dev/04_permissions_enforcement.sql)، ثم `exécuté 04`.
5. [05_record_payment_rpc.sql](../supabase/dev/05_record_payment_rpc.sql)، ثم `exécuté 05`.
6. [06_nonce_visit_atomic.sql](../supabase/dev/06_nonce_visit_atomic.sql)، ثم `exécuté 06`.

إذا فشل ملف فتوقف عند رقمه وأرسل نص الخطأ بعد إزالة أي أسرار. لا تشغّل الملف القديمqr_nonces.sql بعد02 لأنه يعيدFOR ALL. لا تُرسل كلمات مرور أوجلسات أوkeys. حفظ جلسات الاختبار محليًا سيُطلب عند مرحلة الإثبات، لا فيchat.

## 7. الباقي والمرحلة التالية

1. تأكيد تنفيذ01..06، ثم أمرالمالك `continue`.
2. المرحلة2: ربطAPI وlib/data بالـRPC، فشل مغلق، تحقق مبالغ دون تقريب، مصادقةBearer وعقدQR موحد، وبيانات عضو صادقة؛ إصلاح الاختبارات الخمسة من الشيفرة دون تخفيفassertions، وإغلاق بقية عيوب التطبيق بالترتيب المصرح به. كل دمج يحتاجcheck أخضر كاملًا. أي ترقية رئيسية تحتاج موافقة صريحة وفرعًا مستقلًا.
3. المرحلة3: أدلة3a–3g علىقاعدة الاختبار الحقيقية، بما فيها التزامن وRLS والدفع والإلغاء والصلاحيات.
4. المرحلة4: Playwright بالجلسات الفعلية ولقطاتdashboard/members/reception/mobile والمقاساتالثلاثة، ثمLighthouse للوحة بعد الدخول وهاتف حقيقي.
5. المرحلة5: PR إلىfeat/mvp-complete بعدcheck أخضر، ثمPreview فقط واختبارhash المنشور.
6. المرحلة6: توحيد الوثائق والتقدم وجدول25 شاشة؛24 و25 خارج النطاق؛ الفرنسية والنطاق قرارات منفصلة للمالك.

**توقف: انتظار تأكيدات تنفيذSQL ثمcontinue. لا انتقال تلقائي للمرحلة2.**
