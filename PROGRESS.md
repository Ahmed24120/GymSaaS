# سجل التقدم والتسليم — GymSaaS
# PROGRESS.md — État d'avancement officiel (Constructeur)

**الموقع:** نواكشوط، موريتانيا  
**البيئة:** Next.js 14 (App Router) + Supabase PostgreSQL + Expo SDK 51 + TailwindCSS  
**تاريخ التحديث:** 2026-10-27  

---

## 📌 ملخص الحالات الإجمالية

| الكتلة | الوصف | الحالة | الإثبات |
|---|---|---|---|
| **BLOC 1** | إثباتات الحالة الأمنية والفعلية | **مكتمل ✅** | 0 mockData، تشفير HMAC-SHA256 مع `timingSafeEqual`، حظر Replay، حظر 403، عزل الصالات RLS |
| **BLOC 2** | تطبيق الجوال Expo Native الحقيقي | **مكتمل ✅** | إزالة pseudo-HMAC، جلب من API، 6 شاشات أصلية، tsc 0 أخطاء، expo-doctor 17/17، export bundle ناجح |
| **BLOC 3** | جاهزية نشر الويب (Vercel & PWA) | **مكتمل ✅** | manifest.ts PWA، ترويسات الأمان في next.config، عزل تام لـ QR_SIGNING_SECRET على الخادم |
| **BLOC 4** | اللمسات النهائية وتدقيق الحزم | **مكتمل ✅** | خلو تام من TODO/Lorem، صفحة 404 عربية، npm run check أخضر بالكامل (22/22 مساراً) |

---

## 🔍 تفاصيل الكتل والأدلة الخام (Raw Proofs)

### BLOC 1 : الأدلة الأمنية والوظيفية
1. **خلو تام من mockData:**
   ```bash
   grep -rn "mockData" apps/web/src
   # Exit code 1 (0 matches found)
   ```
2. **عقد الـ QR الموحد:**
   - الملف: `apps/web/src/lib/qr/contract.ts` (Single Source of Truth مستورد حصراً).
3. **التشفير ومقاومة هجمات التوقيت:**
   - مقارنة التوقيع في `apps/web/src/lib/services/qrSecurity.ts` تتم بـ `crypto.timingSafeEqual`.
   - اختبارات Vitest (6 اختبارات أمنية): توقيع صحيح، رفض تزوير التوقيع، رفض انتهاء الصلاحية > 30 ثانية، رفض الطوابع الزمنية المستقبلية.
4. **Anti-Replay دائم في السيرفرلس (Serverless-Safe):**
   - تم إنشاء سكربت `supabase/dev/qr_nonces.sql`.
   - التخزين في جدول `public.qr_nonces` مع قيد فريد على المفتاح الأساسي `nonce TEXT PRIMARY KEY`.
   - مشغل قاعدة بيانات تلقائي (Database Trigger) لتفريغ nonces القديمة (> 10 دقائق) دورياً.
5. **التحكم بالصلاحيات والأدوار (Middleware 403):**
   - المسارات المحمية في `apps/web/src/lib/supabase/middleware.ts` تفحص دور المستخدم الفعلي من جدول `profiles` و `gym_staff`.
   - أي محاولة من موظف استقبال أو مالك لفتح `/super-admin` تحول تلقائياً إلى صفحة `/403`.
6. **الإلغاء المحاسبي الناعم (Soft-Cancel):**
   - لا يتم حذف أي سجل مالي من جدول `payments`.
   - تحديث `status = 'cancelled'` و `cancellation_reason` و `cancelled_by`.
   - مشغل قاعدة البيانات `trg_audit_payments` يوثق العملية تلقائياً في `public.audit_logs`.
7. **استيراد ملفات Excel للعملاء:**
   - خوارزمية فحص أرقام الهواتف الموريتانية (`45112233`, `36998877`, `22334455`)، فحص طول الاسم >= 3 أحرف، كشف التكرار داخل نفس الملف وكشف التكرار مع قاعدة البيانات.
   - في دفعة من 10 صفوف (منها اسمان قصيران ورقم هاتف مكرر): يتم قبول 7 أعضاء ورفض 3 مع تقرير تفصيلي بالأسباب.
8. **عزل الصالات (Multi-Tenant Isolation):**
   - سكربت `supabase/dev/multi_tenant_test.sql` يوضح عزل الصالة A عن الصالة B.
   - سياسات RLS تفحص `public.is_gym_staff(gym_id)` لضمان عدم رؤية أي موظف لبيانات صالة أخرى.

---

### BLOC 2 : تطبيق الجوال الأصلي (Expo Native)
1. **إزالة pseudo-HMAC المحلي:**
   - تم حذف دالة `createSignature` ومفتاح الـ HMAC المحلي والمصفوفات الوهمية من `apps/mobile`.
   - الرمز يُجلب حصراً من مسار الويب `GET /api/qr?member_id=...` عبر `apps/mobile/src/services/qrApi.ts`.
2. **اتصال Supabase حقيقي وآمن:**
   - `apps/mobile/src/services/supabase.ts` يستخدم المفتاح العام `EXPO_PUBLIC_SUPABASE_ANON_KEY` فقط. لا وجود لمفتاح `service_role` إطلاقاً.
3. **الشاشات الست الأصلية:**
   - `MemberQRScreen.tsx`: رمز QR ديناميكي مع عداد 30 ثانية وشريط وقت متحرك وأزرار تحكم >= 44px.
   - `SubscriptionScreen.tsx`: تفاصيل الباقة، تاريخ البدء والانتهاء، والسعر بالـ MRU، والأيام المتبقية، وحالة الاشتراك.
   - `VisitsHistoryScreen.tsx`: سجل حركات الدخول الموثقة من جدول `visits`.
   - `GoalsStreakScreen.tsx` (الشاشة 22): أهداف التمارين الأسبوعية، عداد الأسابيع المتتالية (Streak)، والأوسمة التحفيزية.
   - `AnnouncementsScreen.tsx`: إعلانات الصالة والعروض الخاصة وروابط التواصل.
   - `ProfileScreen.tsx`: بيانات العضوية، الصالة والفرع، وزر تسجيل الخروج.
4. **فحوصات الجودة للأجهزة الذكية:**
   - `npx tsc --noEmit` في `apps/mobile`: **0 أخطاء (Code 0)**.
   - `npx expo-doctor`: **17/17 checks passed. No issues detected!**
   - `npx expo export --platform web`: **تم تجميع 345 موديول بنجاح وإنشاء مجلد dist (Code 0)**.
5. **ملف EAS Build:**
   - تم إنشاء `apps/mobile/eas.json` بملف تعريف `preview` لإنتاج حزم Android APK المستقلة.
6. **طريقة التشغيل التجريبي على الهاتف:**
   - عبر Expo Go: تشغيل الأمر `npx expo start --tunnel`.

---

### BLOC 3 : جاهزية نشر الويب (Next.js & Vercel)
1. **تطبيق الويب التقدمي (PWA):**
   - ملف `apps/web/src/app/manifest.ts` يولد تلقائياً `/manifest.webmanifest`.
   - توفير أيقونات التطبيق في `apps/web/public/` (أيقونات 192x192 و 512x512 و favicon).
2. **ترويسات الأمان الصارمة:**
   - ملف `apps/web/next.config.mjs` يتضمن: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
3. **حماية الأسرار:**
   - `apps/web/src/lib/services/qrSecurity.ts` يقرأ `QR_SIGNING_SECRET` حصراً من متغيرات بيئة الخادم ويرفض أي متغير مسبوق بـ `NEXT_PUBLIC_`.
4. **ملف `.env.example` المحدث:**
   - يتضمن أسماء المتغيرات الثلاثة فقط بدون أي قيم سرية.
5. **الشاشتان 24 و 25:**
   - موثقتان صراحة كـ "خارج نطاق الـ MVP لليوم".

---

### BLOC 4 : المخرجات النهائية المجمعة
1. **مخرجات `npm run check` في `apps/web`:**
   ```
   > @gymsaas/web@0.1.0 check
   > tsc --noEmit && next lint && vitest run && next build

   ✔ No ESLint warnings or errors
   ✓ src/__tests__/excelValidation.test.ts (4 tests)
   ✓ src/__tests__/analytics.test.ts (4 tests)
   ✓ src/__tests__/currency.test.ts (5 tests)
   ✓ src/__tests__/dateUtils.test.ts (5 tests)
   ✓ src/__tests__/qrSecurity.test.ts (6 tests)
   Test Files  5 passed (5)
   Tests       24 passed (24)

   ✓ Compiled successfully
   ✓ Generating static pages (22/22)
   Route (app)                              Size     First Load JS
   ┌ ○ /                                    142 B          87.4 kB
   ├ ○ /_not-found                          142 B          87.4 kB
   ├ ○ /403                                 177 B          96.2 kB
   ├ ƒ /api/qr                              0 B                0 B
   ├ ƒ /api/qr/verify                       0 B                0 B
   ├ ○ /dashboard                           10.6 kB         183 kB
   ├ ○ /dashboard/audit                     8.03 kB         168 kB
   ├ ○ /dashboard/branches                  3.55 kB         167 kB
   ├ ○ /dashboard/import-excel              146 kB          306 kB
   ├ ○ /dashboard/members                   6.13 kB         170 kB
   ├ ○ /dashboard/payments                  6.38 kB         174 kB
   ├ ○ /dashboard/plans                     3.85 kB         167 kB
   ├ ○ /dashboard/reception                 8.47 kB         168 kB
   ├ ○ /dashboard/reports                   7.21 kB         167 kB
   ├ ○ /dashboard/staff                     2.8 kB          166 kB
   ├ ○ /dashboard/visits                    12.7 kB         173 kB
   ├ ○ /login                               4.39 kB         160 kB
   ├ ○ /manifest.webmanifest                0 B                0 B
   ├ ○ /mobile                              11.3 kB         180 kB
   └ ○ /super-admin                         6.91 kB         175 kB
   ```
2. **فحص الثغرات الحزمية (npm audit --omit=dev):**
   - تم تشغيله لكل من الويب والجوال دون استعمال `--force`. التحديثات الجذرية مؤجلة لتجنب كسر توافقية Next 14 و Expo 51.

---

## 📝 ما يجب تنفيذه من قبل المستخدم (Action Items)

1. **تشغيل SQL في Supabase SQL Editor:**
   - الترتيب الأول: تشغيل ملف `supabase/dev/qr_nonces.sql` لضمان عمل جدول الـ Anti-Replay وتريجر التنظيف التلقائي.
   - الترتيب الثاني (اختياري للاختبار): تشغيل ملف `supabase/dev/multi_tenant_test.sql` لاختبار عزل الصالتين.
2. **إعداد النشر على Vercel:**
   - استيراد المستودع من GitHub (`Ahmed24120/GymSaaS`).
   - تحديد Root Directory: `apps/web`.
   - إدخال متغيرات البيئة الثلاثة:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `QR_SIGNING_SECRET` (بدون NEXT_PUBLIC_).
