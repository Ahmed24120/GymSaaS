# إعادة اختبار إصلاح المشغّل

محلي فقط: PGlite0.5.12 وPostgreSQL18.6، محاكاةAuth دون Supabase. الأمر من الجذر: `node .tools/phase1-trigger-audit.mjs`. المصدر أدناه؛ لا تعديل لاختباراتapps أوassertions.

~~~javascript
import { PGlite } from './sql-phase1/node_modules/@electric-sql/pglite/dist/index.js';
import { readFileSync, writeFileSync } from 'node:fs';
const pg = await PGlite.create();
const log = [`UTC ${new Date().toISOString()}`, 'LOCAL PGlite only; emulated Auth, no Supabase connection.'];
const sql = (name) => readFileSync(`supabase/dev/${name}.sql`, 'utf8');
let passed = 0;
async function q(text) { log.push(`SQL: ${text}`); const result = await pg.query(text); log.push(JSON.stringify(result.rows)); return result.rows; }
try {
  await pg.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, phone text, raw_user_meta_data jsonb DEFAULT '{}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth,public TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
  await pg.exec(sql('../migrations/20250101000000_initial_schema').replace(/^CREATE EXTENSION[^\r\n]+/gm,'-- omitted locally'));
  await pg.exec('GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;');
  for (const file of ['01_profiles_lockdown','02_qr_nonces_hardening','03_gym_status_guard','04_permissions_enforcement']) await pg.exec(sql(file));
  for (const [name,damage] of [
    ['missing','DROP TRIGGER trg_calculate_subscription_end_date ON public.subscriptions'],
    ['wrong timing',`DROP TRIGGER trg_calculate_subscription_end_date ON public.subscriptions; CREATE TRIGGER trg_calculate_subscription_end_date AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.calculate_subscription_end_date()`],
    ['disabled','ALTER TABLE public.subscriptions DISABLE TRIGGER trg_calculate_subscription_end_date'],
  ]) {
    log.push(`DAMAGE: ${damage}`); await pg.exec(damage);
    await pg.exec(sql('05_record_payment_rpc'));
    const rows = await q("SELECT tgname,tgtype,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE tgrelid='public.subscriptions'::regclass AND tgname='trg_calculate_subscription_end_date'");
    if (rows.length!==1 || rows[0].tgtype!==7 || rows[0].tgenabled!=='O') throw new Error('Trigger was not repaired');
    log.push(`PASS repair ${name} trigger`); passed++;
  }
  log.push(`TRIGGER AUDIT RESULT: ${passed} passed, 0 failed`);
} catch(e) { log.push(`FAIL ${e.code || ''} ${e.message}`); process.exitCode=1; }
finally { await pg.close(); writeFileSync('docs/evidence/phase1-audit/trigger-repair.txt',log.join('\n')); console.log(log.join('\n')); }

~~~
