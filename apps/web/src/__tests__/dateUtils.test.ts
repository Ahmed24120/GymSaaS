import { describe, it, expect } from 'vitest';
import {
  formatDateNouakchott,
  formatDateLatin,
  calculateSubscriptionEndDate,
  getDaysRemaining,
} from '../lib/services/dateUtils';

describe('Date & Subscription Utilities (Africa/Nouakchott)', () => {
  it('formats dates in Africa/Nouakchott timezone', () => {
    const formatted = formatDateNouakchott('2025-01-15T12:00:00Z');
    expect(formatted).not.toBe('—');
    expect(formatDateNouakchott(null)).toBe('—');
  });

  it('calculates subscription end date correctly for 30 days', () => {
    const start = new Date('2025-01-01T10:00:00Z');
    const end = calculateSubscriptionEndDate(start, 30);
    expect(end.getDate()).toBe(31);
    expect(end.getMonth()).toBe(0); // January
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('handles month transitions correctly (e.g., January 31 + 30 days)', () => {
    const start = new Date('2025-01-31T00:00:00Z');
    const end = calculateSubscriptionEndDate(start, 30);
    // Jan 31 + 30 days = March 2 in 2025 (non-leap year has 28 days in Feb)
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(2);
  });

  it('correctly calculates leap year days (Feb 2024 has 29 days)', () => {
    const start2024 = new Date('2024-02-01T00:00:00Z');
    const end2024 = calculateSubscriptionEndDate(start2024, 28);
    expect(end2024.getDate()).toBe(29);
    expect(end2024.getMonth()).toBe(1); // February in leap year
  });

  it('calculates remaining days accurately', () => {
    const futureDate = new Date(Date.now() + 5 * 86400000).toISOString();
    const remaining = getDaysRemaining(futureDate);
    expect(remaining).toBeGreaterThanOrEqual(4);
    expect(remaining).toBeLessThanOrEqual(6);

    const pastDate = new Date(Date.now() - 5 * 86400000).toISOString();
    const pastRemaining = getDaysRemaining(pastDate);
    expect(pastRemaining).toBeLessThan(0);
  });
});
