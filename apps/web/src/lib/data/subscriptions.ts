import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';
import { calculateEndDate } from '@/lib/services/dateUtils';

export interface SubscriptionRecord {
  id: string;
  gym_id: string;
  member_id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'paused' | 'cancelled';
  created_at: string;
  updated_at: string;
  plan?: { id: string; name: string; duration_days: number; price_mru: number } | null;
  member?: { id: string; full_name: string; phone: string } | null;
}

export async function createSubscription(params: {
  gym_id?: string;
  member_id: string;
  plan_id: string;
  duration_days: number;
  start_date?: string;
}): Promise<Result<SubscriptionRecord>> {
  try {
    const supabase = createClient();

    let gymId = params.gym_id;
    if (!gymId) {
      const { data: gym } = await supabase.from('gyms').select('id').limit(1).single();
      gymId = gym?.id || 'a0000000-0000-0000-0000-000000000001';
    }

    const startDateStr = params.start_date || new Date().toISOString();
    const startDateObj = new Date(startDateStr);
    const endDateObj = calculateEndDate(startDateObj, params.duration_days);
    const endDateStr = endDateObj.toISOString();

    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        gym_id: gymId,
        member_id: params.member_id,
        plan_id: params.plan_id,
        start_date: startDateStr,
        end_date: endDateStr,
        status: 'active',
      })
      .select('*, plan:plans(*)')
      .single();

    if (error) return { ok: false, error: toAppError(error) };

    // Also update member status to active
    await supabase
      .from('members')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', params.member_id);

    return { ok: true, value: data as SubscriptionRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
