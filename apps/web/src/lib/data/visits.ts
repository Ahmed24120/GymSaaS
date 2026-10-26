import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface VisitRecord {
  id: string;
  gym_id: string;
  member_id: string;
  branch_id?: string | null;
  scanned_by?: string | null;
  entered_at: string;
  method: 'qr' | 'manual';
  source: 'online' | 'offline_sync';
  created_at: string;
  // Joins
  member?: { id: string; full_name: string; phone: string; photo_path?: string } | null;
  branch?: { id: string; name: string } | null;
}

export async function getVisits(): Promise<Result<VisitRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('visits')
      .select(`
        *,
        member:members(id, full_name, phone, photo_path),
        branch:branches(id, name)
      `)
      .order('entered_at', { ascending: false })
      .limit(100);

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as VisitRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function recordVisit(params: {
  gym_id?: string;
  member_id: string;
  branch_id?: string | null;
  method: 'qr' | 'manual';
}): Promise<Result<VisitRecord>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let gymId = params.gym_id;
    if (!gymId) {
      const { data: gym } = await supabase.from('gyms').select('id').limit(1).single();
      gymId = gym?.id || 'a0000000-0000-0000-0000-000000000001';
    }

    const { data, error } = await supabase
      .from('visits')
      .insert({
        gym_id: gymId,
        member_id: params.member_id,
        branch_id: params.branch_id || null,
        scanned_by: user?.id || null,
        method: params.method,
        source: 'online',
        entered_at: new Date().toISOString(),
      })
      .select(`
        *,
        member:members(id, full_name, phone, photo_path),
        branch:branches(id, name)
      `)
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as VisitRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
