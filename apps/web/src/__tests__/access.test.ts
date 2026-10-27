import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { canAccessPath, homeForRole } from '../lib/supabase/access';

const state = vi.hoisted(() => ({ user: null as null | { id: string }, admin: false, role: '', member: false, fail: false }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: any) => ({
    auth: { getUser: async () => {
      if (state.fail) throw new Error('offline');
      options.cookies.setAll([{ name: 'refreshed', value: 'test-cookie', options: { httpOnly: true } }]);
      return { data: { user: state.user }, error: null };
    } },
    from: (table: string) => {
      const result = { data: table === 'profiles' ? { is_super_admin: state.admin }
        : table === 'gym_staff' ? (state.role ? [{ role: state.role }] : [])
        : state.member ? [{ id: 'member' }] : [], error: null };
      const chain: any = { select: () => chain, eq: () => chain, limit: () => chain,
        maybeSingle: async () => result, then: (resolve: any) => Promise.resolve(result).then(resolve) };
      return chain;
    },
  }),
}));
import { updateSession } from '../lib/supabase/middleware';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-public-key');
  Object.assign(state, { user: null, admin: false, role: '', member: false, fail: false });
});
afterEach(() => vi.unstubAllEnvs());

describe('S6 route authorization (stubbed identity, not live RLS)', () => {
  it.each(['/dashboard', '/dashboard/payments', '/super-admin', '/mobile'])('redirects anonymous %s', async (path) => {
    const result = await updateSession(new NextRequest(`http://localhost${path}`));
    expect(new URL(result.headers.get('location')!).pathname).toBe('/login');
    expect(result.cookies.get('refreshed')?.value).toBe('test-cookie');
  });
  it('fails closed without environment', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    expect((await updateSession(new NextRequest('http://localhost/dashboard'))).status).toBe(307);
  });
  it('fails closed when authentication is unavailable', async () => {
    state.fail = true;
    expect(new URL((await updateSession(new NextRequest('http://localhost/dashboard'))).headers.get('location')!).pathname).toBe('/login');
  });
  it.each(['gym_owner', 'receptionist'])('denies super admin to %s', async (role) => {
    Object.assign(state, { user: { id: 'test-user' }, role });
    const result = await updateSession(new NextRequest('http://localhost/super-admin'));
    expect(new URL(result.headers.get('location')!).pathname).toBe('/403');
    expect(result.cookies.get('refreshed')?.value).toBe('test-cookie');
  });
  it.each([['super_admin', '/super-admin'], ['member', '/mobile'], ['receptionist', '/dashboard/reception'], ['gym_owner', '/dashboard']])('routes %s login to %s', async (role, home) => {
    Object.assign(state, { user: { id: 'test-user' }, admin: role === 'super_admin', member: role === 'member', role: ['gym_owner', 'receptionist'].includes(role) ? role : '' });
    expect(new URL((await updateSession(new NextRequest('http://localhost/login'))).headers.get('location')!).pathname).toBe(home);
  });
  it('denies unknown roles', async () => {
    state.user = { id: 'test-user' };
    expect(new URL((await updateSession(new NextRequest('http://localhost/dashboard'))).headers.get('location')!).pathname).toBe('/403');
  });
  it('restricts owner pages for receptionist and rejects member dashboard', () => {
    for (const path of ['plans', 'staff', 'branches', 'audit', 'reports']) expect(canAccessPath('receptionist', `/dashboard/${path}`)).toBe(false);
    expect(canAccessPath('receptionist', '/dashboard/reception')).toBe(true);
    expect(canAccessPath('member', '/dashboard')).toBe(false);
    expect(homeForRole('member')).toBe('/mobile');
  });
});
