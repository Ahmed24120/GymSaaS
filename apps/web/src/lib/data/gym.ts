import type { SupabaseClient } from '@supabase/supabase-js';
import { Result } from '@/lib/types/auth';

/**
 * Déduit la salle de l'utilisateur authentifié depuis gym_staff (filtré par RLS).
 * Aucune valeur de gym_id venant du client n'est utilisée et aucun identifiant de démo n'est supposé.
 * La sécurité réelle reste la RLS : un gym_id faux est de toute façon refusé par la base.
 */
export async function resolveGymId(supabase: SupabaseClient): Promise<Result<string>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: { code: 'unauthorized', message: 'يجب تسجيل الدخول أولاً' } };
  const { data, error } = await supabase
    .from('gym_staff')
    .select('gym_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error || !data?.gym_id) {
    return { ok: false, error: { code: 'no_gym', message: 'لا توجد صالة مرتبطة بحسابك' } };
  }
  return { ok: true, value: data.gym_id as string };
}
