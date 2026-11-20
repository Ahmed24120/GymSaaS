import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { createServerSupabase } from './server';

/**
 * Contexte Supabase d'une route API : accepte `Authorization: Bearer <access_token Supabase>`
 * (application mobile) et sinon utilise les cookies (web). Dans les deux cas la requête reste
 * soumise à la RLS ; aucune clé service_role n'est utilisée.
 */
export async function getRequestContext(request: NextRequest) {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '');
  if (!match) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.auth.getUser();
    return { supabase, user: data?.user ?? null, authError: error };
  }
  const token = match[1].trim();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    }
  );
  const { data, error } = await supabase.auth.getUser(token);
  return { supabase, user: data?.user ?? null, authError: error };
}
