import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const backend = vi.hoisted(() => ({ nonceError: null as null | { code: string }, visitError: null as null | { code: string } }));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'receptionist' } }, error: null }) },
  from(table: string) {
    let inserting = false;
    const result = () => table === 'qr_nonces' ? { data: null, error: inserting ? backend.nonceError : null }
      : table === 'members' ? { data: { id: 'member', full_name: 'عضو اختبار', phone: '40000000', status: 'active' }, error: null }
      : table === 'subscriptions' ? { data: [{ id: 'subscription', end_date: '2099-01-01', plan: { name: 'Monthly' } }], error: null }
      : { data: backend.visitError ? null : { id: 'visit' }, error: backend.visitError };
    const chain: any = { select: () => chain, eq: () => chain, gte: () => chain, order: () => chain, limit: () => chain,
      insert: () => { inserting = true; return chain; }, maybeSingle: async () => result(), single: async () => result(),
      then: (resolve: any) => Promise.resolve(result()).then(resolve) };
    return chain;
  },
}) }));
vi.mock('@/lib/services/qrSecurity', () => ({ verifySignedQR: () => ({ valid: true, payload: { gym_id: 'gym-a', member_id: 'member', nonce: 'nonce' } }) }));
import { POST } from '../app/api/qr/verify/route';

beforeEach(() => Object.assign(backend, { nonceError: null, visitError: null }));
const verify = () => POST(new NextRequest('http://localhost/api/qr/verify', { method: 'POST', body: JSON.stringify({ token: 'fixture-token' }) }));

describe('QR release gates — real route with stubbed database responses', () => {
  it('accepts a recorded visit', async () => {
    expect((await (await verify()).json()).allowed).toBe(true);
  });
  it('rejects simultaneous nonce collision', async () => {
    backend.nonceError = { code: '23505' };
    expect((await (await verify()).json()).errorCode).toBe('REPLAY');
  });
  it('BUG-QR-01: denies entry when persistent nonce storage is missing', async () => {
    backend.nonceError = { code: 'PGRST205' };
    expect((await (await verify()).json()).allowed).toBe(false);
  });
  it('BUG-QR-01: denies entry when nonce insertion is forbidden', async () => {
    backend.nonceError = { code: '42501' };
    expect((await (await verify()).json()).allowed).toBe(false);
  });
  it('BUG-QR-02: denies entry when visit insertion fails', async () => {
    backend.visitError = { code: '42501' };
    expect((await (await verify()).json()).allowed).toBe(false);
  });
});
