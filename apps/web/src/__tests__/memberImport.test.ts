import { describe, expect, it, vi } from 'vitest';
import { persistMemberRows, type ImportCandidate } from '../app/dashboard/import-excel/importMembers';
import type { createMember } from '../lib/data/members';

describe('member import persistence with a stubbed writer', () => {
  it('writes only seven accepted rows and preserves three rejected rows', async () => {
    const rows: ImportCandidate[] = Array.from({ length: 10 }, (_, index) => ({
      fullName: `عضو اختبار ${index}`, phone: `4000000${index}`, isValid: index < 7,
      status: index < 7 ? 'pending' : 'rejected', failureReason: index < 7 ? undefined : index === 9 ? 'duplicate' : 'invalid',
    }));
    const save = vi.fn(async (_params: Parameters<typeof createMember>[0]) => ({ ok: true, value: { id: 'member' } }));
    const progress = vi.fn();
    const result = await persistMemberRows(rows, progress, save as unknown as typeof createMember);
    expect(save).toHaveBeenCalledTimes(7);
    expect(save.mock.calls.every((call) => Object.keys(call[0] || {}).sort().join(',') === 'full_name,phone')).toBe(true);
    expect(result.imported).toBe(7);
    expect(result.failed).toBe(0);
    expect(result.rows.filter((row) => row.status === 'rejected')).toHaveLength(3);
    expect(progress).toHaveBeenLastCalledWith(100);
    expect(rows[0].status).toBe('pending');
  });
  it('reports database rejection and thrown errors without counting them as imported', async () => {
    const rows: ImportCandidate[] = ['ألف', 'باء', 'جيم'].map((fullName) => ({ fullName, phone: '40000001', isValid: true, status: 'pending' }));
    const save = vi.fn().mockResolvedValueOnce({ ok: false, error: { message: 'denied' } }).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ok: true, value: { id: 'member' } });
    const result = await persistMemberRows(rows, () => {}, save);
    expect(result.imported).toBe(1);
    expect(result.failed).toBe(2);
    expect(result.rows[0].failureReason).toBe('denied');
    expect(result.rows[1].status).toBe('failed');
  });
});
