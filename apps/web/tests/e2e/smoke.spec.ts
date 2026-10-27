import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import path from 'node:path';

test('S6: anonymous protected routes redirect to login', async ({ page }) => {
  for (const route of ['/dashboard', '/dashboard/members', '/dashboard/reception', '/super-admin', '/mobile']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?next=/);
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
  }
});

for (const width of [375, 768, 1280]) {
  test(`login responsive and console at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) errors.push(`${message.type()}: ${message.text()}`);
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/login');
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `tests/evidence/login-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

const authDir = process.env.E2E_AUTH_DIR || path.resolve('tests/.auth');
const ownerState = path.join(authDir, 'owner.json');
const receptionistState = path.join(authDir, 'receptionist.json');

test.describe('authenticated checks — require private test sessions', () => {
  test('S1 smoke: owner KPI, member form, and list reload (read only)', async ({ browser }) => {
    test.skip(!existsSync(ownerState), 'لم تتوفر جلسة مالك اختبار محلية؛ لم يُختبر السيناريو');
    const context = await browser.newContext({ storageState: ownerState });
    const page = await context.newPage();
    await page.goto(`${test.info().project.use.baseURL}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'لوحة تحكم إدارة الصالة' })).toBeVisible();
    await page.goto(`${test.info().project.use.baseURL}/dashboard/members`);
    await page.getByRole('button', { name: 'عضو جديد', exact: true }).last().click();
    await expect(page.getByRole('dialog', { name: 'تسجيل عضو جديد' })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'قائمة المشتركين' })).toBeVisible();
    // هذا فحص قراءة وفتح النموذج فقط؛ الدفع والإلغاء يتطلبان سيناريو S1 اليدوي.
    await context.close();
  });

  test('S2 smoke: receptionist name/phone search and invalid QR', async ({ browser }) => {
    test.skip(!existsSync(receptionistState), 'لم تتوفر جلسة استقبال اختبار محلية؛ لم يُختبر السيناريو');
    const context = await browser.newContext({ storageState: receptionistState });
    const page = await context.newPage();
    await page.goto(`${test.info().project.use.baseURL}/dashboard/reception`);
    await expect(page.getByLabel('البحث بالاسم أو الهاتف')).toBeVisible();
    await page.getByLabel('البحث بالاسم أو الهاتف').fill('اسم غير موجود للاختبار');
    await expect(page.getByRole('heading', { name: 'عضو غير مسجل في النظام' })).toBeVisible();
    await page.getByLabel('البحث بالاسم أو الهاتف').fill('00000000');
    await expect(page.getByRole('heading', { name: 'عضو غير مسجل في النظام' })).toBeVisible();
    await page.getByLabel('رمز QR', { exact: true }).fill('invalid-token');
    await page.getByRole('button', { name: 'فحص الرمز', exact: true }).click();
    await expect(page.getByText('الدخول مرفوض ❌', { exact: true })).toBeVisible();
    await context.close();
  });

  test('S6 smoke: receptionist role denial and logout', async ({ browser }) => {
    test.skip(!existsSync(receptionistState), 'لم تتوفر جلسة استقبال اختبار محلية؛ لم يُختبر السيناريو');
    const context = await browser.newContext({ storageState: receptionistState });
    const page = await context.newPage();
    await page.goto(`${test.info().project.use.baseURL}/super-admin`);
    await expect(page).toHaveURL(/\/403$/);
    await page.goto(`${test.info().project.use.baseURL}/dashboard/reception`);
    await page.getByTitle('تسجيل الخروج', { exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto(`${test.info().project.use.baseURL}/dashboard`);
    await expect(page).toHaveURL(/\/login\?next=/);
    await context.close();
  });
});
