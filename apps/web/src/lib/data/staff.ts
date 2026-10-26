import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface StaffRecord {
  id: string;
  gym_id: string;
  user_id: string;
  branch_id?: string | null;
  role: 'gym_owner' | 'receptionist';
  permissions: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profile?: { id: string; full_name: string; phone?: string | null } | null;
  branch?: { id: string; name: string } | null;
}

export async function getStaff(): Promise<Result<StaffRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gym_staff')
      .select(`
        *,
        profile:profiles(id, full_name, phone),
        branch:branches(id, name)
      `)
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as StaffRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
