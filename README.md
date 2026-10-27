# GymSaaS

منصة إدارة صالات رياضية متعددة المستأجرين في نواكشوط. الويب Next.js وTypeScript، والبيانات والمصادقة Supabase، والجوال في `apps/mobile`.

**حالة تدقيق2026-10-27: NO-GO.** بناء الويب ناجح محليًا، لكن5 اختبارات إصدار تفشل، ولم يُعتمد رابط عام أو هاتف حقيقي. [نتائج الاختبار والأدلة](TESTING.md) و[العيوب والمسؤوليات](BUGS.md) هما مرجع حالة الإصدار. الادعاءات السابقة في PROGRESS.md لا تُعد نتائج اختبار مستقلة.

## التشغيل

Node **22.x** وnpm. ثُبتت تبعيات الويب في مجلده بقفل مستقل لتفادي تعارض تبعيات الجوال الحالي؛ لا تستخدم force أو legacy-peer-deps.

```powershell
cd apps/web
npm.cmd ci --workspaces=false
npm.cmd run check
npm.cmd run dev
```

في Windows يُستخدم `npm.cmd` إذا منعت سياسة PowerShell تشغيل npm.ps1. `check` يفحص الأنواع وESLint وVitest ثم البناء، ويتوقف الآن عند5 اختبارات حمراء حقيقية. `npm run build` مستقل نجح في التدقيق، ولا يعني أن بوابات الإصدار نجحت.

أضف الإعدادات الحقيقية محليًا داخل `apps/web/.env.local` المستثنى من Git، أو في واجهة Vercel. الأسماء المطلوبة فقط:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `QR_SIGNING_SECRET`

المفتاح الثالث خادمي فقط، بلا بادئة `NEXT_PUBLIC_` أو `EXPO_PUBLIC_`، وتكون قيمته نفسها لكل الخدمات الخادمة التي تولّد/تتحقق من QR في البيئة الواحدة. لا يوضع في تطبيق Expo. لا تُرسل القيم في chat أو screenshots أو commits. لا مفتاح بصلاحيات إدارية في العميل، ولا GRANT إلى anon.

## حسابات الاختبار

هذه عناوين مذكورة في المشروع؛ وجودها وصلاحياتها في Supabase المستهدف **لم يُتحقق منهما**:

| الدور | البريد فقط |
|---|---|
| المدير العام | `admin@gymsaas.mr` |
| مالك الصالة | `owner@elitegym.mr` |
| الاستقبال | `reception@elitegym.mr` |

لم يُثبت عنوان حساب عضو أو حساب صالة ثانية. يلزمان قبل S3 واختبار العزل. كلمات المرور تُدخل محليًا في المتصفح، ولا تُخزن في الوثائق.

## تجهيز Vercel خطوة بخطوة

هذه خطوات تحضير للمشغل؛ لم يتم إنشاء مشروع أو إدخال أسرار أو نشر عام بواسطة هذا التدقيق.

1. يجب أن يحتوي `feat/mvp-complete` أولًا على إصلاحات `cx/work` و`ag/work` التي ستُنشر. نشر الفرع القديم لا ينشر تغييرات هذا التدقيق. لا دمج إلى main أو force-push هنا.
2. افتح [Vercel](https://vercel.com) ← **Add New Project** ← استورد `Ahmed24120/GymSaaS`.
3. اضبط **Root Directory = `apps/web`**، و**Framework Preset = Next.js**، و**Node.js Version =22.x**. تثبيت22 مثبت كذلك في `apps/web/package.json`.
4. الإعدادات من `apps/web/vercel.json`: **Install Command = `npm ci --workspaces=false`**، **Build Command = `npm run build`**، وOutput Directory الافتراضي لـNext.js. القفل المستعمل `apps/web/package-lock.json`.
5. في **Environment Variables** أدخل الأسماء الثلاثة أعلاه بنفسك من إعدادات Supabase/مدير الأسرار. اختر بيئة Preview/Production المناسبة ولا تنس إعادة النشر بعد تحديث القيم. لا تستخدم قيمة QR جديدة في خدمة تحقق مرتبطة بمولد آخر دون تنسيق.
6. اجعل الفرع المختبر **`feat/mvp-complete`**. إذا اختارت شاشة الاستيراد الفرع الافتراضي، اذهب إلى **Settings → Environments → Production → Branch Tracking** واختر الفرع، أو من Deployments أنشئ Deployment للفرع نفسه. سجل hash من تفاصيل النشر وتأكد أنه يتضمن الإصلاحات. بعد نجاح بوابات GO ونقل النسخة المعتمدة إلىmain يمكن تحويل تتبع Production إلى **`main`**.
7. اضغط **Deploy** بعد تجهيز الإعدادات. انسخ الرابط العام وhash من تفاصيل Deployment. نشر Preview للمراجعة لا يُعتبر موافقة إطلاق للعملاء.
8. في Supabase ← **Authentication → URL Configuration**: اضبط **Site URL** إلى `https://<deployment-host>`، و**Redirect URLs** إلى `https://<deployment-host>/**` كما طلب بروتوكول النشر. لا تدخل هذه placeholders حرفيًا. في الإنتاج يفضّل توثيق مسارات التحويل المحددة عند اعتمادها.
9. تحقّق من وجود schema والسياسات وجدولnonces في البيئة المستهدفة. لا تنفّذ `demo_data.sql` أو تغيّر migrations/seed أثناء هذه العملية؛ أي إصلاح لقاعدة البيانات يمر على صاحب نطاقه ومراجعته.
10. نفّذ [S1–S6](TESTING.md) على الرابط نفسه وعلى هاتف حقيقي؛ لا تعتمد محاكاة375px بديلًا للهاتف. سجّل النتيجة والأدلة ووقت الاختبار وhash لكل حالة. يبقى **NO-GO** حتى ينجحS1/S2/S3/S6 ولا تبقى موانع مفتوحة.

المراجع الرسمية للإعدادات: [Monorepos في Vercel](https://vercel.com/docs/monorepos)، [إصدار Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)، [فرع الإنتاج](https://vercel.com/docs/git#production-branch)، [روابط التحويل في Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

استيراد Excel يحفظ الأعضاء فقط؛ اختر الباقة وسجّل الدفع والتفعيل لاحقًا بعد التأكد من استلام المال. لا يُنشئ الاستيراد إيرادات نقدية تلقائية.

## ما يثبت حاليًا

بناء إنتاج محلي ناجح على Node22، و49 اختبار وحدة ناجحًا مقابل5 اختبارات إصدار فاشلة، و4 فحوص Playwright محلية ناجحة مقابل3 skipped. Lighthouse لصفحة الدخول محليًا:95 للأداء و98 للإتاحة. ليست هذه نتائج للوحة بعد الدخول أو لتشغيل عام. [نص العرض العربي لخمس دقائق](DEMO_SCRIPT.md) مشروط بإغلاق الموانع وتوفر بيئة اختبار.
