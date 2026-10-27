import { createMember } from '@/lib/data/members';

export interface ImportCandidate {
  fullName: string;
  phone: string;
  isValid: boolean;
  status: 'pending' | 'imported' | 'failed' | 'rejected';
  failureReason?: string;
}

export async function persistMemberRows<T extends ImportCandidate>(
  input: T[],
  onProgress: (progress: number) => void,
  saveMember: typeof createMember = createMember,
) {
  const rows = input.map((row) => ({ ...row }));
  const pending = rows.filter((row) => row.isValid && row.status === 'pending');
  let imported = 0;
  let failed = 0;
  for (let index = 0; index < pending.length; index++) {
    const row = pending[index];
    try {
      // استيراد الأعضاء لا يثبت استلام أموال، لذلك لا يُنشئ أي دفعة أو اشتراك.
      const result = await saveMember({ full_name: row.fullName, phone: row.phone });
      if (result.ok) {
        row.status = 'imported';
        imported++;
      } else {
        row.status = 'failed';
        row.failureReason = result.error.message;
        failed++;
      }
    } catch {
      row.status = 'failed';
      row.failureReason = 'تعذر حفظ العضو. تحقق من القائمة قبل إعادة المحاولة.';
      failed++;
    }
    onProgress(Math.round(((index + 1) / pending.length) * 100));
  }
  return { rows, imported, failed };
}
