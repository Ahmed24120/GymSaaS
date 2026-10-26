import { createClient } from '@/lib/supabase/client';
import { Result, toAppError } from '@/lib/types/auth';

export interface AuditRecord {
  id: string;
  gym_id: string;
  actor_id?: string | null;
  action: string;
  entity: string;
  entity_id: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  created_at: string;
  actor?: { id: string; full_name: string } | null;
}

export async function getAuditLogs(): Promise<Result<AuditRecord[]>> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:profiles!audit_logs_actor_id_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { ok: false, error: toAppError(error) };
    return { ok: true, value: (data || []) as AuditRecord[] };
  } catch (err) {
    return { ok: false, error: toAppError(err) };
  }
}
