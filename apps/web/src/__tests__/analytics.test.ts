import { describe, it, expect } from 'vitest';
import { analyzeMemberChurn } from '../lib/services/analytics';

describe('Analytics & Churn Prediction', () => {
  const memberId = 'mem-101';
  const memberName = 'محمد الأمين ولد فال';
  const phone = '45112233';

  it('classifies member inactive for 7 days as medium risk', () => {
    const lastVisit = new Date(Date.now() - 8 * 86400000).toISOString();
    const analysis = analyzeMemberChurn(memberId, memberName, phone, lastVisit);

    expect(analysis.riskLevel).toBe('medium');
    expect(analysis.daysSinceLastVisit).toBe(8);
    expect(analysis.whatsappLink).toContain('22245112233');
    expect(analysis.whatsappLink).toContain(encodeURIComponent(memberName));
  });

  it('classifies member inactive for 14 days as high risk', () => {
    const lastVisit = new Date(Date.now() - 15 * 86400000).toISOString();
    const analysis = analyzeMemberChurn(memberId, memberName, phone, lastVisit);

    expect(analysis.riskLevel).toBe('high');
    expect(analysis.daysSinceLastVisit).toBe(15);
  });

  it('classifies member inactive for 21+ days as critical risk', () => {
    const lastVisit = new Date(Date.now() - 25 * 86400000).toISOString();
    const analysis = analyzeMemberChurn(memberId, memberName, phone, lastVisit);

    expect(analysis.riskLevel).toBe('critical');
    expect(analysis.daysSinceLastVisit).toBe(25);
  });

  it('classifies recent member as low risk', () => {
    const lastVisit = new Date(Date.now() - 2 * 86400000).toISOString();
    const analysis = analyzeMemberChurn(memberId, memberName, phone, lastVisit);

    expect(analysis.riskLevel).toBe('low');
  });
});
