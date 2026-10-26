/**
 * GymSaaS — Mauritanian Ouguiya (MRU) Currency Formatter
 * خدمة التنسيق المالي الموحدة بالـ MRU (الأوقية الجديدة)
 * الالتزام بقواعد AGENTS.md: أعداد صحيحة دائماً (Integers only) دون أرقام عشرية
 */

export function formatMRU(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 MRU';
  }

  // تحويل المبلغ إلى عدد صحيح حصراً
  const intAmount = Math.round(Number(amount));
  return `${intAmount.toLocaleString('en-US')} MRU`;
}

export function formatMRUArabic(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '0 أوقية';
  }

  const intAmount = Math.round(Number(amount));
  return `${intAmount.toLocaleString('ar-MR')} أوقية جديدة`;
}

export function parseMRUInput(val: string): number {
  const sanitized = val.replace(/[^0-9]/g, '');
  const parsed = parseInt(sanitized, 10);
  return isNaN(parsed) ? 0 : parsed;
}
