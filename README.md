# GymSaaS — Plateforme SaaS de gestion de salles de sport (Nouakchott, Mauritanie)

منصة سحابية متكاملة متعددة الصالات (Multi-Tenant SaaS) لإدارة الاشتراكات، المدفوعات المالية، حركات الدخول عبر QR الديناميكي، والمحاسبة بالـ MRU (الأوقية الجديدة).

---

## 🏗️ هيكلة المشروع (Monorepo Architecture)

```text
GymSaaS/
├── supabase/
│   └── migrations/
│       └── 20250101000000_initial_schema.sql  # سكربت التهجير الكامل وقواعد RLS والتدقيق
├── apps/
│   ├── web/                                   # تطبيق الويب الإداري (Next.js 14 App Router)
│   │   ├── src/app/dashboard/                 # لوحة تحكم صاحب الصالة (مؤشرات، اشتراكات، مدفوعات)
│   │   ├── src/components/                    # مكونات الواجهة (RTL + ألوان رياضية متطورة)
│   │   └── src/lib/supabase/                  # عملاء Supabase SSR (Browser, Server, Middleware)
│   └── mobile/                                # تطبيق الجوال (React Native / Expo SDK 51)
│       ├── App.tsx                            # المكون الجذري مع محول الأدوار (عضو / استقبال)
│       └── src/
│           ├── screens/MemberQRScreen.tsx     # شاشة العضو: رمز QR ديناميكي كل 30 ثانية
│           ├── screens/ReceptionistScannerScreen.tsx # شاشة الاستقبال: ماسح الكاميرا وشاشات الأخضر/الأحمر
│           └── services/qrSecurity.ts         # خدمة توقيع وفحص التوكنات الخادمية (HMAC/Nonce)
├── AGENTS.md                                  # وثيقة المرجع والمعايير الصارمة للمشروع
└── package.json                               # إعداد الـ Workspaces
```

---

## 🚀 تشغيل النظام محلياً (Quick Start)

### 1. تثبيت الحزم (Install Dependencies)
```bash
npm install
```

### 2. تشغيل تطبيق الويب (Next.js Dashboard)
```bash
npm run dev:web
# يفتح النظام على الرابط: http://localhost:3000
```
- **المسارات المتاحة**:
  - `/login`: شاشة الدخول مع أزرار التجربة السريعة (مالك الصالة، الاستقبال، السوبر أدمن).
  - `/dashboard`: لوحة المؤشرات المالية وحركات الدخول المباشرة.
  - `/dashboard/members`: إدارة وبحث الأعضاء وتجديد الاشتراكات.
  - `/dashboard/payments`: سجل المدفوعات وتوزيع طرق الدفع (بنكيلي، مصرفي، سداد، كاش) وإلغاء المدفوعات محاسبياً.
  - `/dashboard/visits`: سجل حركات الدخول المباشرة.
  - `/dashboard/plans`: إدارة وباقات الاشتراكات بالـ MRU.
  - `/dashboard/audit`: سجل التدقيق والأمان غير القابل للتعديل.
  - `/mobile`: محاكي تطبيق الجوال على الويب.

### 3. تشغيل تطبيق الجوال (Expo Mobile App)
```bash
cd apps/mobile
npx expo start
```
- يمكنك مسح رمز الاستجابة السريعة عبر تطبيق **Expo Go** على هاتفك (iOS / Android).

---

## 🔒 الضوابط غير القابلة للتفاوض (Non-Negotiable Rules)
- **عزل الصالات 100%**: كل الجداول تحمل `gym_id NOT NULL` وسياسات أمان صفوف RLS مفعلة بالكامل.
- **النزاهة المالية**: مبالغ الـ MRU أعداد صحيحة حصراً، ومنع الحذف الفيزيائي للمدفوعات نهائياً (Soft-Cancel فقط).
- **سجل التدقيق (Audit Logs)**: تدوين آلي ومحمي عبر مشغلات قواعد البيانات Triggers لأي تغيير حساس.
- **حماية QR**: توكنات موقعة خادمياً مدتها 30 ثانية مع منع إعادة الاستخدام عبر Nonce.
