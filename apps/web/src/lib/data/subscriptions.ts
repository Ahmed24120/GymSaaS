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

// Création/renouvellement : uniquement via le RPC record_payment (lib/data/payments.ts).
