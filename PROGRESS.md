# سجل التقدم والتسليم — GymSaaS
# PROGRESS.md — État final du projet

**الموقع:** نواكشوط، موريتانيا  
**البيئة:** Next.js 14 (App Router) + Supabase + TailwindCSS  
**تاريخ آخر تحديث:** 2026-10-26

---

## ✅ ملخص المراحل النهائي

| المرحلة | الوصف | الحالة |
|---------|-------|--------|
| **المرحلة A** | ربط المستخدمين الحقيقيين (`dev_users.sql`) + فحص البيانات | **مكتملة** ✅ |
| **المرحلة B** | مكونات واجهة المستخدم المتجاوبة (`components/ui/*`) + RTL | **مكتملة** ✅ |
| **المرحلة C** | طبقة البيانات `lib/data/*.ts` + جميع الشاشات بدون `mockData` | **مكتملة** ✅ |
| **المرحلة D** | QR ديناميكي (HMAC) + Anti-replay (`qr_nonces`) + الاستقبال | **مكتملة** ✅ |
| **المرحلة E** | استيراد Excel + السوبر أدمن + `/mobile` حقيقي | **مكتملة** ✅ |
| **المرحلة F** | بيانات عرض، vitest 24 اختبار، توثيق كامل | **مكتملة** ✅ |

---

## BLOC 1 — أدلة الحالة الفعلية

### 1. غياب البيانات الوهمية (mockData)

```
grep -rn "mockData" apps/web/src --include=*.ts --include=*.tsx -l
→ No mockData found (خروج بكود 0 بدون نتائج)
```

**ملف `lib/data/` الحالي:**
```
audit.ts  branches.ts  dashboard.ts  index.ts  members.ts
payments.ts  plans.ts  staff.ts  subscriptions.ts  superAdmin.ts  visits.ts
```

### 2. مكونات `components/ui/` الحالية:
```
BottomNav.tsx  DataTable.tsx  EmptyState.tsx  ErrorBoundary.tsx
Modal.tsx  PageHeader.tsx  Skeleton.tsx  StatCard.tsx  index.ts
```

### 3. Soft-Cancel

الإلغاء الأمني موجود في [`apps/web/src/lib/data/payments.ts`](apps/web/src/lib/data/payments.ts) عبر دالة `softCancelPayment()`:
- لا يُحذف أي سجل
- يُحدَّث حقل `cancelled_at` + `cancelled_by` + `cancel_reason` في جدول `payments`
- يُنشأ سطر في `audit_logs` عبر Trigger قاعدة البيانات
- مصدر الإلغاء: كود التهجير `supabase/migrations/20250101000000_initial_schema.sql`

---

## BLOC 2 — العقد الوحيد للـ QR

**ملف:** [`apps/web/src/lib/qr/contract.ts`](apps/web/src/lib/qr/contract.ts)  
**مستورد من:**
- `apps/web/src/app/api/qr/route.ts`
- `apps/web/src/app/api/qr/verify/route.ts`
- `apps/web/src/app/dashboard/reception/page.tsx`
- `apps/web/src/app/mobile/page.tsx`
- `apps/web/src/__tests__/qrSecurity.test.ts`

**لا توجد تعريفات مكررة** للأنواع في أي ملف آخر.

---

## BLOC 3 — Anti-Replay

**جدول التخزين:** `public.qr_nonces` (PostgreSQL / Supabase — دائم، غير In-Memory)  
**الحقول:** `nonce TEXT PRIMARY KEY`, `used_at TIMESTAMPTZ`  
**المنطق:** عند مسح QR، يُدرج الـ nonce → إذا كان موجوداً مسبقاً (خطأ `23505`) → مرفوض "replay"

**حد Serverless:** لا يوجد — التخزين في PostgreSQL الدائم، لا يُفقد عند إعادة تشغيل الدالة.

**ملاحظة:** يجب تشغيل `supabase/dev/create_qr_nonces.sql` إذا لم يكن الجدول موجوداً في المخطط الأصلي.

---

## BLOC 4 — اختبارات vitest

**الأمر:** `cd apps/web && npx vitest run`

**النتيجة الأخيرة (2026-10-26):**
```
✓ src/__tests__/excelValidation.test.ts  (4 tests)  5ms
✓ src/__tests__/analytics.test.ts        (4 tests)  6ms
✓ src/__tests__/qrSecurity.test.ts       (6 tests)  8ms
✓ src/__tests__/currency.test.ts         (5 tests) 24ms
✓ src/__tests__/dateUtils.test.ts        (5 tests) 26ms

Test Files  5 passed (5)
     Tests  24 passed (24)
  Duration  459ms
```

---

## BLOC 5 — بناء النظام النهائي

```
tsc --noEmit    → 0 أخطاء ✅
next lint       → ✔ No ESLint warnings or errors ✅
vitest run      → 24/24 passed ✅
next build      → exit code 0 ✅
```

**مسارات البناء (21 مساراً):**
```
Route (app)                         Size     First Load JS
┌ ○ /                               138 B          87.4 kB
├ ○ /403                            175 B          96.2 kB
├ ƒ /api/qr                         0 B                0 B
├ ƒ /api/qr/verify                  0 B                0 B
├ ○ /dashboard                      10.6 kB         183 kB
├ ○ /dashboard/audit                8.03 kB         168 kB
├ ○ /dashboard/branches             3.55 kB         167 kB
├ ○ /dashboard/import-excel         146 kB          306 kB
├ ○ /dashboard/members              6.13 kB         170 kB
├ ○ /dashboard/payments             6.38 kB         174 kB
├ ○ /dashboard/plans                3.85 kB         167 kB
├ ○ /dashboard/reception            8.47 kB         168 kB
├ ○ /dashboard/reports              7.21 kB         167 kB
├ ○ /dashboard/staff                2.8 kB          166 kB
├ ○ /dashboard/visits               12.7 kB         173 kB
├ ○ /login                          4.39 kB         160 kB
├ ○ /mobile                         11.3 kB         180 kB
└ ○ /super-admin                    6.91 kB         175 kB
```

---

## BLOC 6 — npm audit

```bash
cd apps/web && npm audit --omit=dev
```
**نتيجة:** 2 ثغرات (1 عالية في `postcss`، 1 حرجة في `next@14.x`)  
**لم يُطبق `--force`** — الإصلاح يتطلب `next@16` (تغيير جذري خارج نطاق المهمة).

---

## جدول الشاشات الـ 25

| # | المسار | الاسم | الحالة |
|---|--------|-------|--------|
| 1 | `/login` | شاشة الدخول | ✅ حقيقي |
| 2 | `/dashboard` | لوحة المؤشرات | ✅ حقيقي |
| 3 | `/dashboard/members` | قائمة الأعضاء | ✅ حقيقي |
| 4 | `/dashboard/members/[id]` | ملف العضو | ⚠️ يفتح في نافذة modal |
| 5 | `/dashboard/plans` | الباقات | ✅ حقيقي |
| 6 | `/dashboard/payments` | المدفوعات | ✅ حقيقي |
| 7 | `/dashboard/visits` | الزيارات | ✅ حقيقي |
| 8 | `/dashboard/branches` | الفروع | ✅ حقيقي |
| 9 | `/dashboard/staff` | الموظفون | ✅ حقيقي |
| 10 | `/dashboard/audit` | سجل التدقيق | ✅ حقيقي |
| 11 | `/dashboard/reception` | شاشة الاستقبال | ✅ حقيقي |
| 12 | `/dashboard/reports` | التقارير | ✅ حقيقي |
| 13 | `/dashboard/import-excel` | استيراد Excel | ✅ حقيقي |
| 14 | `/mobile` | شاشة العضو (QR) | ✅ حقيقي |
| 15 | `/super-admin` | لوحة السوبر أدمن | ✅ حقيقي |
| 16 | `/403` | صفحة الرفض | ✅ حقيقي |
| 17 | `/not-found` (404) | صفحة غير موجودة | ✅ حقيقي |
| 18 | `/api/qr` | API توليد QR | ✅ حقيقي |
| 19 | `/api/qr/verify` | API التحقق من QR | ✅ حقيقي |
| 20-25 | — | شاشات متقدمة (تحليلات متعمقة، إدارة عروض، تقارير مخصصة) | **خارج نطاق MVP** |

---

## BLOC 7 — الثغرات الموثقة (ليس مثالياً)

| البند | الحالة |
|-------|--------|
| Playwright E2E | **غير مثبت** — يحتاج تثبيت Chromium (موافقة المستخدم مطلوبة) |
| اختبار مسح QR بكاميرا حقيقية | **غير ممكن** في بيئة CLI — يحتاج HTTPS + متصفح |
| تشغيل `demo_data.sql` | **لم يُنفَّذ** — يجب تشغيله يدوياً في Supabase SQL Editor |
| تطبيق Expo (`apps/mobile/`) | بنية موجودة — **لم يُختبر** على جهاز حقيقي |
| WhatsApp / SMS integration | **مؤجل** — يحتاج API خارجي |
| اختبار عزل متعدد الصالات (RLS) | **موثق في TESTING.md** — يحتاج 2 صالة مُدرجة في demo_data |
