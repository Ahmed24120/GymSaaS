/**
 * GymSaaS — Date & Subscription Calculation Utilities
 * خدمة حساب التواريخ وضبط الفترات الزمنية لمنطقة Africa/Nouakchott
 */

export function formatDateNouakchott(
  dateInput: string | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return '—';

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Nouakchott',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };

  return new Intl.DateTimeFormat('ar-MR', options).format(date);
}

export function formatDateLatin(
  dateInput: string | Date | null | undefined
): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Nouakchott',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * حساب تاريخ نهاية الاشتراك استناداً إلى تاريخ البدء وعدد الأيام
 */
export function calculateSubscriptionEndDate(startDate: Date, durationDays: number): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + durationDays);
  end.setHours(23, 59, 59, 999);
  return end;
}

export const calculateEndDate = calculateSubscriptionEndDate;

/**
 * حساب الأيام المتبقية حتى نهاية الاشتراك
 */
export function getDaysRemaining(endDateInput: string | Date): number {
  const endDate = typeof endDateInput === 'string' ? new Date(endDateInput) : endDateInput;
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
