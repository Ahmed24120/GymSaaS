import { createClient } from '@supabase/supabase-js';

// Récupération des variables d'environnement publiques Expo
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

/**
 * Client Supabase officiel pour l'application Mobile (Expo)
 * RÈGLE ABSOLUE : Utilise exclusivement la clé publique anonyme (anon key).
 * Jamais de service_role côté client mobile !
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
