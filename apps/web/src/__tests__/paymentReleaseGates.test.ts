import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ activated: false, paymentFails: false, amount: 0 }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'employee' } } }) },
  from: () => {
    const chain: any = { insert: (value: any) => { state.amount = value.amount_mru; return chain; }, select: () => chain,
      single: async () => ({ data: state.paymentFails ? null : { id: 'payment', amount_mru: state.amount },
        error: state.paymentFails ? { message: 'insert denied' } : null }) };
    return chain;
  },
}) }));
vi.mock('@/lib/data/subscriptions', () => ({ createSubscription: async () => {
  state.activated = true;
  return { ok: true, value: { id: 'subscription' } };
} }));
import { recordPayment } from '../lib/data/payments';

beforeEach(() => Object.assign(state, { activated: false, paymentFails: false, amount: 0 }));
const pay = (amount_mru = 1500) => recordPayment({ gym_id: 'gym', member_id: 'member', plan_id: 'plan', duration_days: 30, amount_mru, method: 'cash' });

describe('Payment release gates — stubbed persistence, no real transactions', () => {
  it('BUG-PAY-01: does not leave an activated subscription after payment rejection', async () => {
    state.paymentFails = true;
    expect((await pay()).ok).toBe(false);
    expect(state.activated).toBe(false);
  });
  it('BUG-PAY-02: rejects fractional MRU without activating subscription', async () => {
    expect((await pay(1500.5)).ok).toBe(false);
    expect(state.activated).toBe(false);
  });
});
