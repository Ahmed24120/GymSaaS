# GymSaaS — Plateforme SaaS de gestion de salles de sport (Nouakchott, Mauritanie)

منصة سحابية متكاملة متعددة الصالات (Multi-Tenant SaaS) لإدارة الاشتراكات، المدفوعات المالية بالعملة الموريتانية (MRU)، حركات الدخول عبر QR الديناميكي، والمحاسبة الآمنة.

---

## 📋 المتطلبات الأساسية (Prerequisites)

- **Node.js**: إصدار 20.x أو 22.x (البيئة المعتمدة على Vercel عبر حقل `engines` في `package.json`).
- **npm**: إصدار 9.x أو أحدث
- **مشروع Supabase**: مفعل فيه ملحق `pgcrypto` مع تطبيق التهجيرات ومستخدمي التطوير.
- **مفتاح سري لتوقيع الـ QR**: مولّد بواسطة `openssl rand -base64 32` (سري بالكامل على الخادم، لا يُسبق بـ `NEXT_PUBLIC_`).

---

## ⚙️ متغيرات البيئة (Environment Variables)

### 1. تطبيق الويب (`apps/web/.env.local`)
```bash
# Supabase (Clés publiques anonymes uniquement)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Clé secrète de signature HMAC-SHA256 (SERVEUR UNIQUEMENT — JAMAIS côté client)
QR_SIGNING_SECRET=<base64-32-byte-secret>
```

### 2. تطبيق الجوال Expo (`apps/mobile/.env`)
```bash
# URL de l'API web déployée pour GET /api/qr
EXPO_PUBLIC_API_URL=https://<your-gymsaas-deployment>.vercel.app

# Supabase (Clés publiques anonymes uniquement)
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> [!WARNING]
> لا تضع مفتاح `service_role` في تطبيقات العميل نهائياً. الوصول للبيانات مقيد بجلسة المستخدم الموثقة (`authenticated`) وقواعد RLS الصارمة لكل صالة رياضية.

---

## 👥 حسابات الاختبار والتقييم (Test Accounts)

تم تجهيز 3 حسابات رئيسية لتقييم جميع الأدوار والصلاحيات (البريد الإلكتروني فقط):

| الحساب | الدور الصلاحياتي | الوصف ونطاق الوصول |
|---|---|---|
| `admin@gymsaas.mr` | **Super Admin** | إدارة الصالات، تفعيل/تعليق الاشتراكات، نشر الإعلانات العامة |
| `owner@elitegym.mr` | **Gym Owner** | إدارة الصالة الكاملة، الفروع، الموظفين، التقارير والمدفوعات |
| `reception@elitegym.mr` | **Receptionist** | فحص QR للأعضاء، تسجيل الدخول اليدوي، بيع وتجديد الباقات السريع |

*(كلمات المرور تُدخل يدوياً عبر واجهة تسجيل الدخول ولا تُخزن في المستودع).*

---

## 🏗️ هيكلة النظام والبيانات (Architecture)

| الطبقة / المكون | التقنية المستخدمة | الدور الوظيفي |
|---|---|---|
| **Web Frontend** | Next.js 14 (App Router) + TailwindCSS | واجهة المستخدم RTL، متجاوبة بالكامل (375px / 768px / 1280px) |
| **PWA Mobile** | Web App Manifest + Service Worker Ready | شاشة `/mobile` قابلة للتثبيت كـ PWA مع أيقونات و theme-color |
| **Data Layer** | `apps/web/src/lib/data/*.ts` | استعلامات معزولة بنمط `Result<T, AppError>` بدون تسريب Supabase للصفحات |
| **QR Security** | HMAC-SHA256 + Nonce Check | توقيع خادمي مشفر مع نافذة صلاحية 30 ثانية ومقارنة بـ `timingSafeEqual` |
| **Anti-Replay Storage** | جدول `public.qr_nonces` (PostgreSQL) | تخزين دائم مع RLS وتفريغ تلقائي عبر Trigger للـ nonces القديمة |
| **Financial Integrity** | MRU (أعداد صحيحة حصراً) | حظر الكسور نهائياً، إلغاء محاسبي ناعم `Soft-Cancel` وسجل تدقيق `audit_logs` |
| **Mobile App (Native)** | Expo SDK 51 + React Native | 6 شاشات أصلية (QR، اشتراك، زيارات، أهداف وStreak، إعلانات، ملف) |

---

## 🚀 أوامر التشغيل والفحص (Commands)

### 1. تطبيق الويب (`apps/web`)
```bash
# تثبيت الحزم
npm install

# تشغيل بيئة التطوير
npm run dev:web

# الفحص الشامل المجمع (TypeScript + ESLint + Vitest + Next.js Build)
cd apps/web && npm run check
```

### 2. تطبيق الجوال (`apps/mobile`)
```bash
cd apps/mobile

# فحص الأنواع (TypeScript)
npx tsc --noEmit

# فحص صحة تكوين Expo (17/17 passed)
npx expo-doctor

# اختبار تصدير الحزمة (Bundle Export)
npx expo export --platform web

# تجربة التطبيق عبر Expo Go (Tunnel)
npx expo start --tunnel

# بناء حزمة APK تجريبية للأندرويد عبر EAS
eas login
eas build -p android --profile preview
```

---

## 📊 حالة الميزات (المنجز الفعلي مقابل المؤجل)

| الميزة / الوظيفة | الحالة | ملاحظات |
|---|---|---|
| تطهير كامل من الـ `mockData` | **مكتمل ✅** | 0 استيراد للبيانات الوهمية في كود الإنتاج |
| عقد موحد للـ QR (`lib/qr/contract.ts`) | **مكتمل ✅** | مصدر وحيد للأنواع مستورد من جميع الواجهات و API |
| منع إعادة استخدام الـ QR (Anti-Replay) | **مكتمل ✅** | دائم في PostgreSQL (`qr_nonces.sql`) عبر مفتاح أساسي فريد وترجر تنظيف |
| إلغاء المدفوعات الآمن (Soft-Cancel) | **مكتمل ✅** | يوثق المنفذ والسبب وتاريخ الإلغاء في `audit_logs` تلقائياً عبر Database Trigger |
| استيراد ملفات Excel للعملاء | **مكتمل ✅** | فحص أرقام موريتانيا (222...) وكشف المكرر وإخراج تقرير مفصل بالمرفوضات |
| اختبارات الوحدة (Vitest) | **مكتمل ✅** | 24 اختبار يغطي الأمان، التشفير، العملة، التواريخ، الاستيراد والتحليلات |
| صفحة خطأ مخصصة 404 و 403 | **مكتمل ✅** | واجهات عربية متكاملة بروابط رجوع وتوجيه صحيح وأزرار >= 44px |
| سكريبت تجريبي للمُقيِّم (`DEMO_SCRIPT.md`) | **مكتمل ✅** | سيناريو مفصل لمدة 5 دقائق لتقييم الـ 3 حسابات باللغة العربية |
| تطبيق الجوال Expo Native | **مكتمل ✅** | 6 شاشات، اتصال حقيقي بـ `/api/qr` و Supabase، لا أسرار محلية، EAS ready |
| PWA لشاشة `/mobile` | **مكتمل ✅** | `manifest.webmanifest` متوافق مع معايير PWA وقابل للتثبيت |
| نشر التطبيق في متاجر Google Play و App Store | **مؤجل (خارج MVP)** | يتطلب حسابات مطورين رسمية وتوقيع نهائي؛ متوفر حالياً كـ APK Preview و PWA |
| الشاشتان 24 و 25 (أتمتة تسويق WhatsApp وبوابة تحليلات متقدمة) | **مؤجل (خارج MVP)** | خارج نطاق الـ MVP المعتمد لليوم |
| اختبارات Playwright الآلية | **مؤجل** | يتطلب تنزيل حزم Chromium في بيئة السيرفر |

---

## 📄 الوثائق التكميلية

- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md): خطوات التقييم العملي خطوة بخطوة باللغة العربية.
- [`TESTING.md`](./TESTING.md): سيناريوهات الاختبارات الوظيفية والأمنية المفصلة.
- [`PROGRESS.md`](./PROGRESS.md): سجل التتبع الدقيق ومخرجات الفحوصات وجدول الـ 25 شاشة.
- [`HANDOFF.md`](./HANDOFF.md): بروتوكول التسليم والتحديث بين فريقي البناء والاختبار.
- [`supabase/dev/qr_nonces.sql`](./supabase/dev/qr_nonces.sql): سكربت إنشاء جدول الـ nonces وترجر التنظيف التلقائي.
- [`supabase/dev/multi_tenant_test.sql`](./supabase/dev/multi_tenant_test.sql): سكربت إثبات العزل بين صالتين.
- [`supabase/dev/demo_data.sql`](./supabase/dev/demo_data.sql): سكربت تعبئة 40 عضواً موريتانياً للعرض (يُشغّل بموافقة يدوية).
- [`supabase/dev/demo_cleanup.sql`](./supabase/dev/demo_cleanup.sql): سكربت تنظيف بيانات العرض بأمان.
