import { resolveGymId } from './gym';
import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface PlanRecord {
  id: string;
  gym_id: string;
  name: string;
  description?: string | null;
  duration_days: number;
  price_mru: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getPlans(): Promise<Result<PlanRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price_mru', { ascending: true });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as PlanRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function createPlan(params: {
  gym_id?: string;
  name: string;
  description?: string;
  duration_days: number;
  price_mru: number;
}): Promise<Result<PlanRecord>> {
  try {
    const supabase = createClient();

    const gymRes = await resolveGymId(supabase);
    if (!gymRes.ok) return { ok: false, error: gymRes.error };
    const gymId = gymRes.value;

    const { data, error } = await supabase
      .from('plans')
      .insert({
        gym_id: gymId,
        name: params.name.trim(),
        description: params.description?.trim() || null,
        duration_days: Math.round(Number(params.duration_days)),
        price_mru: Math.round(Number(params.price_mru)),
        active: true,
      })
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as PlanRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function togglePlanActive(id: string, active: boolean): Promise<Result<PlanRecord>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('plans')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as PlanRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
