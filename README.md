# GymSaaS — Plateforme SaaS de gestion de salles de sport (Nouakchott, Mauritanie)

منصة سحابية متكاملة متعددة الصالات (Multi-Tenant SaaS) لإدارة الاشتراكات، المدفوعات المالية بالعملة الموريتانية (MRU)، حركات الدخول عبر QR الديناميكي، والمحاسبة الآمنة.

---

## 📋 المتطلبات الأساسية (Prerequisites)

- **Node.js**: إصدار 18.x أو 20.x
- **npm**: إصدار 9.x أو أحدث
- **مشروع Supabase**: مفعل فيه ملحق `pgcrypto` مع تطبيق التهجيرات ومستخدمي التطوير.
- **مفتاح سري لتوقيع الـ QR**: مولّد بواسطة `openssl rand -base64 32`.

---

## ⚙️ متغيرات البيئة (Environment Variables)

قم بإنشاء ملف `apps/web/.env.local` يحتوي على الأسماء التالية (**دون تسريب أي قيم سرية في المستودع**):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# QR Dynamic HMAC-SHA256 Secret (Base64 32 bytes)
QR_SIGNING_SECRET=<base64-32-byte-secret>
```

> [!WARNING]
> لا تضع مفتاح `service_role` في تطبيق العميل إطلاقاً. الوصول للبيانات مقيد بجلسة المستخدم الموثقة (`authenticated`) وقواعد RLS الصارمة.

---

## 👥 حسابات الاختبار والتقييم (Test Accounts)

تم تجهيز 3 حسابات رئيسية لتقييم جميع الأدوار والصلاحيات:

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
| **Web Frontend** | Next.js 14 (App Router) + TailwindCSS | واجهة المستخدم RTL، متجاوبة (جوال، تابلت، حاسوب) |
| **Data Layer** | `apps/web/src/lib/data/*.ts` | استعلامات معزولة بنمط `Result<T, AppError>` بدون تسريب Supabase للصفحات |
| **QR Security** | HMAC-SHA256 + Nonce Check | توقيع خادمي مشفر مع نافذة صلاحية 30 ثانية ومنع إعادة الاستخدام |
| **Anti-Replay Storage** | جدول `public.qr_nonces` (PostgreSQL) | تخزين دائم للـ nonces لمنع تكرار مسح الرمز نفسه |
| **Financial Integrity** | MRU (أعداد صحيحة حصراً) | حظر الكسور نهائياً، إلغاء محاسبي ناعم `Soft-Cancel` وسجل تدقيق `audit_logs` |
| **Mobile Web App** | `/mobile` (Next.js) | واجهة عضو مع QR ديناميكي مباشر ومؤشرات الالتزام |

---

## 🚀 أوامر التشغيل والفحص (Commands)

### 1. تثبيت الحزم (Install)
```bash
npm install
```

### 2. تشغيل بيئة التطوير (Development)
```bash
npm run dev:web
# يفتح على http://localhost:3000
```

### 3. الفحص الشامل واختبارات الوحدة (Quality Checks)
```bash
# من داخل مجلد apps/web:
cd apps/web

# فحص الأنواع (TypeScript):
npx tsc --noEmit

# فحص المعايير (ESLint):
npm run lint

# تشغيل اختبارات vitest (24 اختبار وحدة):
npm run test

# بناء المشروع الإنتاجي (Production Build):
npm run build

# الفحص الكامل المجمع:
npm run check
```

---

## 📊 حالة الميزات (المنجز الفعلي مقابل المؤجل)

| الميزة / الوظيفة | الحالة | ملاحظات |
|---|---|---|
| تطهير كامل من الـ `mockData` | **مكتمل ✅** | 0 استيراد للبيانات الوهمية في كود الإنتاج |
| عقد موحد للـ QR (`lib/qr/contract.ts`) | **مكتمل ✅** | مصدر وحيد للأنواع مستورد من جميع الواجهات و API |
| منع إعادة استخدام الـ QR (Anti-Replay) | **مكتمل ✅** | مسجل في جدول `qr_nonces` الدائم في قاعدة البيانات |
| إلغاء المدفوعات الآمن (Soft-Cancel) | **مكتمل ✅** | يوثق المنفذ والسبب وتاريخ الإلغاء في `audit_logs` |
| استيراد ملفات Excel للعملاء | **مكتمل ✅** | مكتبة `xlsx` مع فحص أرقام موريتانيا (222...) وكشف المكرر |
| اختبارات الوحدة (Vitest) | **مكتمل ✅** | 24 اختبار يغطي الأمان، العملة، التواريخ، الاستيراد والتحليلات |
| صفحة خطأ مخصصة 404 و 403 | **مكتمل ✅** | واجهات عربية متكاملة بروابط رجوع وتوجيه صحيح |
| سكريبت تجريبي للمُقيِّم (`DEMO_SCRIPT.md`) | **مكتمل ✅** | سيناريو مفصل لمدة 5 دقائق لتقييم الـ 3 حسابات |
| اختبارات Playwright الآلية | **مؤجل** | يتطلب تنزيل متصفحات Chromium في البيئة |
| إرسال رسائل WhatsApp / SMS تلقائية | **مؤجل** | يتطلب ربط بوابات دفع ورسائل محلية عبر مزودي خدمة خارجيين |
| تطبيق الجوال Native (Expo) | **بنية تجريبية** | الكود متوفر في `apps/mobile/` والبديل الجاهز هو `/mobile` |

---

## 📄 الوثائق التكميلية

- [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md): خطوات التقييم العملي خطوة بخطوة باللغة العربية.
- [`TESTING.md`](./TESTING.md): سيناريوهات الاختبارات الوظيفية والأمنية المفصلة.
- [`PROGRESS.md`](./PROGRESS.md): سجل التتبع الدقيق ومخرجات الفحوصات وجدول الـ 25 شاشة.
- [`supabase/dev/demo_data.sql`](./supabase/dev/demo_data.sql): سكربت تعبئة 40 عضواً موريتانياً للعرض (يُشغّل يدوياً).
- [`supabase/dev/demo_cleanup.sql`](./supabase/dev/demo_cleanup.sql): سكربت تنظيف بيانات العرض بأمان.
