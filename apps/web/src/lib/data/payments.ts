import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';
import { createSubscription } from './subscriptions';

export interface PaymentRecord {
  id: string;
  gym_id: string;
  member_id: string;
  subscription_id: string;
  amount_mru: number;
  method: 'cash' | 'bankily' | 'masrvi' | 'sedad';
  transaction_ref?: string | null;
  recorded_by: string;
  status: 'completed' | 'cancelled';
  cancelled_by?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  // Joins
  member?: { id: string; full_name: string; phone: string } | null;
  subscription?: {
    id: string;
    start_date: string;
    end_date: string;
    plan?: { id: string; name: string } | null;
  } | null;
  recorder?: { id: string; full_name: string } | null;
  canceller?: { id: string; full_name: string } | null;
}

export async function getPayments(): Promise<Result<PaymentRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        member:members(id, full_name, phone),
        subscription:subscriptions(
          id, start_date, end_date,
          plan:plans(id, name)
        ),
        recorder:profiles!payments_recorded_by_fkey(id, full_name),
        canceller:profiles!payments_cancelled_by_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as PaymentRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function recordPayment(params: {
  gym_id?: string;
  member_id: string;
  plan_id: string;
  duration_days: number;
  amount_mru: number;
  method: 'cash' | 'bankily' | 'masrvi' | 'sedad';
  transaction_ref?: string;
}): Promise<Result<PaymentRecord>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: { code: 'unauthorized', message: 'يجب تسجيل الدخول أولاً' } };
    }

    let gymId = params.gym_id;
    if (!gymId) {
      const { data: gym } = await supabase.from('gyms').select('id').limit(1).single();
      gymId = gym?.id || 'a0000000-0000-0000-0000-000000000001';
    }

    // 1. Create or renew subscription first
    const subRes = await createSubscription({
      gym_id: gymId,
      member_id: params.member_id,
      plan_id: params.plan_id,
      duration_days: params.duration_days,
    });

    if (!subRes.ok) return { ok: false, error: subRes.error };

    // 2. Insert payment record (amount is integer MRU)
    const { data, error } = await supabase
      .from('payments')
      .insert({
        gym_id: gymId,
        member_id: params.member_id,
        subscription_id: subRes.value.id,
        amount_mru: Math.round(Number(params.amount_mru)),
        method: params.method,
        transaction_ref: params.transaction_ref?.trim() || null,
        recorded_by: user.id,
        status: 'completed',
      })
      .select(`
        *,
        member:members(id, full_name, phone),
        subscription:subscriptions(id, start_date, end_date, plan:plans(id, name))
      `)
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as PaymentRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}

export async function cancelPayment(
  paymentId: string,
  reason: string
): Promise<Result<PaymentRecord>> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: { code: 'unauthorized', message: 'يجب تسجيل الدخول أولاً' } };
    }

    if (!reason || reason.trim().length < 3) {
      return {
        ok: false,
        error: { code: 'invalid_reason', message: 'يجب كتابة سبب الإلغاء بشكل مفصل' },
      };
    }

    // Soft-cancel: Never delete physically, update status, cancelled_by, cancelled_at, and reason.
    // Trigger trg_audit_payments automatically logs this update to public.audit_logs!
    const { data, error } = await supabase
      .from('payments')
      .update({
        status: 'cancelled',
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason.trim(),
      })
      .eq('id', paymentId)
      .select(`
        *,
        member:members(id, full_name, phone),
        subscription:subscriptions(id, start_date, end_date, plan:plans(id, name)),
        canceller:profiles!payments_cancelled_by_fkey(id, full_name)
      `)
      .single();

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: data as PaymentRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
