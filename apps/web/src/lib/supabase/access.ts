import type { SupabaseClient } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'gym_owner' | 'receptionist' | 'member';

export async function resolveUserRole(supabase: SupabaseClient, userId: string): Promise<UserRole | null> {
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('is_super_admin').eq('id', userId).maybeSingle();
  if (profileError) return null;
  if (profile?.is_super_admin === true) return 'super_admin';
  const { data: staff, error: staffError } = await supabase.from('gym_staff')
    .select('role').eq('user_id', userId).eq('is_active', true);
  if (staffError) return null;
  if (staff?.some((row) => row.role === 'gym_owner')) return 'gym_owner';
  if (staff?.some((row) => row.role === 'receptionist')) return 'receptionist';
  const { data: members, error: memberError } = await supabase.from('members')
    .select('id').eq('user_id', userId).limit(1);
  return !memberError && members?.length ? 'member' : null;
}

export function homeForRole(role: UserRole): string {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'member') return '/mobile';
  if (role === 'receptionist') return '/dashboard/reception';
  return '/dashboard';
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  if (/^\/super-admin(?:\/|$)/.test(pathname)) return role === 'super_admin';
  if (/^\/mobile(?:\/|$)/.test(pathname)) return ['member', 'gym_owner', 'receptionist'].includes(role);
  if (/^\/dashboard(?:\/|$)/.test(pathname)) {
    if (role === 'gym_owner') return true;
    return role === 'receptionist' && !/^\/dashboard\/(plans|staff|branches|audit|reports)(?:\/|$)/.test(pathname);
  }
  return true;
}
