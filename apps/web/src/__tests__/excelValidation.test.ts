import { describe, it, expect } from 'vitest';

export function validatePhoneMRU(phoneStr: string): boolean {
  const cleaned = phoneStr.replace(/[\s\-\(\)]/g, '');
  return /^(\+?222|00222)?[234][0-9]{7}$/.test(cleaned);
}

export function normalizePhone(phoneStr: string): string {
  return phoneStr.replace(/[\s\-\(\)]/g, '').replace(/^(\+222|00222|222)/, '');
}

describe('Excel Import Validation (Mauritanian Standards)', () => {
  it('accepts valid Mauritanian 8-digit mobile phones', () => {
    // Mauritels (4x), Chinguitel (2x), Mattel (3x)
    expect(validatePhoneMRU('45112233')).toBe(true);
    expect(validatePhoneMRU('22334455')).toBe(true);
    expect(validatePhoneMRU('36998877')).toBe(true);
    expect(validatePhoneMRU('+222 45 11 22 33')).toBe(true);
    expect(validatePhoneMRU('00222 36 99 88 77')).toBe(true);
    expect(validatePhoneMRU('22245112233')).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(validatePhoneMRU('12345678')).toBe(false); // starts with 1
    expect(validatePhoneMRU('4511223')).toBe(false); // 7 digits
    expect(validatePhoneMRU('451122339')).toBe(false); // 9 digits
    expect(validatePhoneMRU('phone_number')).toBe(false);
    expect(validatePhoneMRU('')).toBe(false);
  });

  it('normalizes phones to 8-digit standard for duplicate detection', () => {
    expect(normalizePhone('+222 45 11 22 33')).toBe('45112233');
    expect(normalizePhone('00222 45 11 22 33')).toBe('45112233');
    expect(normalizePhone('45112233')).toBe('45112233');
  });

  it('detects duplicate phones inside a batch', () => {
    const rawBatch = [
      { name: 'محمد', phone: '+222 45 11 22 33' },
      { name: 'فاطمة', phone: '36998877' },
      { name: 'أحمد', phone: '45112233' }, // Duplicate of row 1!
    ];

    const seen = new Set<string>();
    const duplicates: number[] = [];

    rawBatch.forEach((item, idx) => {
      const norm = normalizePhone(item.phone);
      if (seen.has(norm)) {
        duplicates.push(idx);
      } else {
        seen.add(norm);
      }
    });

    expect(duplicates).toEqual([2]);
  });
});
