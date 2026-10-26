import { createClient } from '@/lib/supabase/client';
import { Result, AppError, toAppError } from '@/lib/types/auth';

export interface MemberRecord {
  id: string;
  gym_id: string;
  branch_id?: string | null;
  user_id?: string | null;
  full_name: string;
  phone: string;
  photo_path?: string | null;
  status: 'active' | 'inactive' | 'expired';
  created_at: string;
  updated_at: string;
  // Joins
  branch?: { id: string; name: string } | null;
  active_subscription?: {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    plan?: { id: string; name: string; price_mru: number } | null;
  } | null;
}

export async function getMembers(): Promise<Result<MemberRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('members')
      .select(`
        *,
        branch:branches(id, name),
        subscriptions(
          id, start_date, end_date, status,
          plan:plans(id, name, price_mru)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };

    const mapped: MemberRecord[] = (data || []).map((m: any) => {
      // Find latest or active subscription
      const subs = m.subscriptions || [];
      const activeSub = subs.find((s: any) => s.status === 'active') || subs[0] || null;
      return {
        ...m,
        branch: m.branch || null,
        active_subscription: activeSub,
      };
    });

    return { ok: true, value: mapped };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function createMember(params: {
  gym_id?: string;
  branch_id?: string | null;
  full_name: string;
  phone: string;
  photo_path?: string | null;
}): Promise<Result<MemberRecord>> {
  try {
    const supabase = createClient();

    // Default to first user gym if not supplied
    let gymId = params.gym_id;
    if (!gymId) {
      const { data: gym } = await supabase.from('gyms').select('id').limit(1).single();
      gymId = gym?.id || 'a0000000-0000-0000-0000-000000000001';
    }

    const { data, error } = await supabase
      .from('members')
      .insert({
        gym_id: gymId,
        branch_id: params.branch_id || null,
        full_name: params.full_name.trim(),
        phone: params.phone.trim(),
        photo_path: params.photo_path || null,
        status: 'inactive', // Active only once subscription/payment is made
      })
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as MemberRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function updateMember(
  id: string,
  updates: Partial<Pick<MemberRecord, 'full_name' | 'phone' | 'branch_id' | 'status' | 'photo_path'>>
): Promise<Result<MemberRecord>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('members')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as MemberRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
