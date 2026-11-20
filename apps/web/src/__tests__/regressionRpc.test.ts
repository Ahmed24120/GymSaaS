import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const rpcState = vi.hoisted(() => ({ error: null as null | { code?: string; message?: string }, calls: [] as any[] }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'employee' } }, error: null }) },
  rpc: async (name: string, args: any) => { rpcState.calls.push({ name, args });
    return rpcState.error ? { data: null, error: rpcState.error } : { data: null, error: null }; },
}) }));
vi.mock('@/lib/services/qrSecurity', () => ({ verifySignedQR: () => ({ valid: true, payload: { gym_id: 'g', member_id: 'm', nonce: 'n' } }) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'employee' } } }) },
  rpc: async (name: string, args: any) => { rpcState.calls.push({ name, args }); return { data: { id: 'p' }, error: null }; },
}) }));
import { POST } from '../app/api/qr/verify/route';
import { recordPayment } from '../lib/data/payments';

beforeEach(() => { rpcState.error = null; rpcState.calls = []; });
const verify = () => POST(new NextRequest('http://localhost/api/qr/verify', { method: 'POST', body: JSON.stringify({ token: 't' }) }));

describe('Non-régression QR verify : chaque erreur RPC => refus cohérent', () => {
  const cases: Array<[string, { code: string; message?: string }, number, string]> = [
    ['PGRST205 (table absente)', { code: 'PGRST205' }, 503, 'SERVICE_UNAVAILABLE'],
    ['42501 permission', { code: '42501', message: 'SCAN_PERMISSION_REQUIRED' }, 403, 'FORBIDDEN'],
    ['42501 salle suspendue', { code: '42501', message: 'GYM_SUSPENDED' }, 403, 'GYM_SUSPENDED'],
    ['23505 rejeu', { code: '23505', message: 'REPLAY' }, 409, 'REPLAY'],
    ['P0001 abonnement', { code: 'P0001', message: 'NO_ACTIVE_SUBSCRIPTION' }, 200, 'NO_SUBSCRIPTION'],
    ['P0001 membre', { code: 'P0001', message: 'INACTIVE_MEMBER' }, 200, 'INACTIVE_MEMBER'],
    ['erreur inconnue', { code: 'XX000' }, 500, 'SERVER_ERROR'],
  ];
  for (const [name, error, status, errorCode] of cases) {
    it(name, async () => {
      rpcState.error = error;
      const res = await verify();
      const body = await res.json();
      expect(res.status).toBe(status);
      expect(body.allowed).toBe(false);
      expect(body.errorCode).toBe(errorCode);
      expect(body.visit_id).toBeUndefined();
    });
  }
  it('une réponse RPC vide n’invente jamais d’identifiant de visite', async () => {
    const body = await (await verify()).json();
    expect(body.allowed).toBe(false);
    expect(body.visit_id).toBeUndefined();
  });
});

describe('Non-régression paiements : RPC seulement, entiers stricts', () => {
  it('appelle record_payment sans gym_id ni durée client', async () => {
    const res = await recordPayment({ member_id: 'm', plan_id: 'p', amount_mru: 1500, method: 'cash', gym_id: 'evil', duration_days: 9999 });
    expect(res.ok).toBe(true);
    expect(rpcState.calls[0].name).toBe('record_payment');
    expect(Object.keys(rpcState.calls[0].args)).not.toContain('p_gym_id');
    expect(Object.keys(rpcState.calls[0].args)).not.toContain('p_duration_days');
    expect(rpcState.calls[0].args.p_amount_mru).toBe(1500);
  });
  for (const bad of [1500.5, 0, -5, NaN, Infinity]) {
    it(`rejette ${bad} sans appeler la base`, async () => {
      expect((await recordPayment({ member_id: 'm', plan_id: 'p', amount_mru: bad, method: 'cash' })).ok).toBe(false);
      expect(rpcState.calls.length).toBe(0);
    });
  }
});

import { cancelPayment } from '../lib/data/payments';
describe('Non-régression annulation : RPC cancel_payment uniquement', () => {
  it('appelle cancel_payment avec le motif nettoyé (pas d\'UPDATE direct)', async () => {
    const res = await cancelPayment('pay-1', '  motif valable  ');
    expect(res.ok).toBe(true);
    expect(rpcState.calls[0]).toEqual({ name: 'cancel_payment', args: { p_payment_id: 'pay-1', p_reason: 'motif valable' } });
  });
  it('rejette un motif < 3 caractères sans appeler la base', async () => {
    expect((await cancelPayment('pay-1', 'ab')).ok).toBe(false);
    expect(rpcState.calls.length).toBe(0);
  });
});
