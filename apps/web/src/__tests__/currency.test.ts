import { describe, it, expect } from 'vitest';
import { formatMRU, formatMRUArabic, parseMRUInput } from '../lib/services/currency';

describe('MRU Currency Formatter', () => {
  it('formats standard integer amounts with MRU suffix', () => {
    expect(formatMRU(1500)).toBe('1,500 MRU');
    expect(formatMRU(4000)).toBe('4,000 MRU');
    expect(formatMRU(14000)).toBe('14,000 MRU');
  });

  it('strictly rounds fractional amounts to nearest integer (no decimals allowed in MRU)', () => {
    expect(formatMRU(1500.4)).toBe('1,500 MRU');
    expect(formatMRU(1500.6)).toBe('1,501 MRU');
    expect(formatMRU('2999.99')).toBe('3,000 MRU');
  });

  it('handles null, undefined, and non-numeric inputs safely', () => {
    expect(formatMRU(null)).toBe('0 MRU');
    expect(formatMRU(undefined)).toBe('0 MRU');
    expect(formatMRU('invalid')).toBe('0 MRU');
  });

  it('formats Arabic localized currency string', () => {
    const arabic = formatMRUArabic(1500);
    expect(arabic).toContain('أوقية');
  });

  it('parses dirty MRU inputs into clean integer numbers', () => {
    expect(parseMRUInput('1,500 MRU')).toBe(1500);
    expect(parseMRUInput('  4000 ')).toBe(4000);
    expect(parseMRUInput('abc')).toBe(0);
  });
});
