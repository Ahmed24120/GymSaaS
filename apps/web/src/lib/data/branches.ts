import { resolveGymId } from './gym';
import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface BranchRecord {
  id: string;
  gym_id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_main: boolean;
  created_at: string;
  updated_at: string;
}

export async function getBranches(): Promise<Result<BranchRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('is_main', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as BranchRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function createBranch(params: {
  gym_id?: string;
  name: string;
  address?: string;
  phone?: string;
  is_main?: boolean;
}): Promise<Result<BranchRecord>> {
  try {
    const supabase = createClient();

    const gymRes = await resolveGymId(supabase);
    if (!gymRes.ok) return { ok: false, error: gymRes.error };
    const gymId = gymRes.value;

    const { data, error } = await supabase
      .from('branches')
      .insert({
        gym_id: gymId,
        name: params.name.trim(),
        address: params.address?.trim() || null,
        phone: params.phone?.trim() || null,
        is_main: !!params.is_main,
      })
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as BranchRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
