import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

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
  member_id: string;
  plan_id: string;
  amount_mru: number;
  method: 'cash' | 'bankily' | 'masrvi' | 'sedad';
  transaction_ref?: string;
  /** @deprecated ignoré : la salle est déduite côté serveur (RLS / RPC). */
  gym_id?: string;
  /** @deprecated ignoré : la durée vient du plan en base ; aucune date de fin n'est calculée côté client. */
  duration_days?: number;
}): Promise<Result<PaymentRecord>> {
  try {
    // Montants MRU entiers stricts : aucun arrondi, les non-entiers sont rejetés.
    if (typeof params.amount_mru !== 'number' || !Number.isSafeInteger(params.amount_mru) || params.amount_mru <= 0) {
      return { ok: false, error: { code: 'invalid_amount', message: 'المبلغ يجب أن يكون عددًا صحيحًا موجبًا بالأوقية' } };
    }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, error: { code: 'unauthorized', message: 'يجب تسجيل الدخول أولاً' } };
    }

    // Paiement + abonnement + activation + audit : une seule transaction (RPC record_payment).
    const { data, error } = await supabase.rpc('record_payment', {
      p_member_id: params.member_id,
      p_plan_id: params.plan_id,
      p_amount_mru: params.amount_mru,
      p_method: params.method,
      p_transaction_ref: params.transaction_ref?.trim() || null,
    });
    if (error || !data) return { ok: false, error: toAppError(error ?? new Error('record_payment: réponse vide')) };
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

    // RPC cancel_payment (10_cancel_payment_subscription.sql) : annule le paiement ET l'abonnement lié
    // dans une seule transaction ; permission can_cancel_payments, audit par les triggers.
    const { data, error } = await supabase.rpc('cancel_payment', {
      p_payment_id: paymentId,
      p_reason: reason.trim(),
    });
    if (error || !data) return { ok: false, error: toAppError(error ?? new Error('cancel_payment: réponse vide')) };
    return { ok: true, value: data as PaymentRecord };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
