// Test script reading credentials strictly from process.env without writing to disk
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing Supabase URL or Anon key in .env.local');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

const email = process.env.TEST_EMAIL || 'admin@gymsaas.mr';
const password = process.env.TEST_PASSWORD;

async function run() {
  if (!password) {
    console.log(`[INFO] TEST_PASSWORD non fourni dans les variables d'environnement.`);
    console.log(`Le flux d'authentification est actif dans l'application web (/login).`);
    console.log(`Pour tester en ligne de commande : TEST_EMAIL=... TEST_PASSWORD=... node scripts/test_auth_session.mjs`);
    return;
  }

  console.log(`[AUTH] Tentative de connexion avec : ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`[AUTH_ERR] Échec de connexion :`, error.message);
    return;
  }

  console.log(`[AUTH_OK] Connecté avec succès ! User ID: ${data.user.id}`);

  // Test queries as authenticated user
  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }
  });

  const { count: gymsCount, error: gErr } = await client.from('gyms').select('*', { count: 'exact', head: true });
  const { count: membersCount, error: mErr } = await client.from('members').select('*', { count: 'exact', head: true });
  const { count: paymentsCount, error: pErr } = await client.from('payments').select('*', { count: 'exact', head: true });
  const { count: plansCount, error: plErr } = await client.from('plans').select('*', { count: 'exact', head: true });

  console.log(`[DATA_COUNTS]`);
  console.log(` - gyms: ${gErr ? 'Erreur RLS' : gymsCount}`);
  console.log(` - members: ${mErr ? 'Erreur RLS' : membersCount}`);
  console.log(` - payments: ${pErr ? 'Erreur RLS' : paymentsCount}`);
  console.log(` - plans: ${plErr ? 'Erreur RLS' : plansCount}`);

  // Check roles for current user
  const { data: profile } = await client.from('profiles').select('id, full_name, is_super_admin').eq('id', data.user.id).single();
  const { data: staff } = await client.from('gym_staff').select('role, is_active').eq('user_id', data.user.id);
  console.log(`[PROFILE]`, profile);
  console.log(`[STAFF]`, staff);
}

run().catch(console.error);
