# مشغّل الاختبار المحلي للمرحلة الأولى

هذا توثيق قابل لإعادة التنفيذ، وليس اختبارًا متصلًا بـSupabase. انسخ الكتلتين إلى الملفين المحددين داخل .tools المستثنى منGit. لا تغير ملفات apps أو الاختبارات الأصلية. يلزم Node22، ومن جذر المستودع ثبّت المحرك المعزول:

npm.cmd install --prefix .tools/sql-phase1 --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.12

ثم node .tools/phase1-sql-test.mjs 6 وnode .tools/phase1-check.mjs 06. يعمل الأول في قاعدة ذاكرة محلية؛ يحاكي auth.uid، ويقرأ نسخة المخطط مع حذف تصريحات EXTENSION من الذاكرة فقط لأن gen_random_uuid متاحة. الملف الأصلي لا يتغير. الثاني يتحقق من استثناء الخمسة، ويسجل Exit الحقيقي لكل أمر؛ لا يجعل check أخضر. فشل إضافي يمنع الدمج.

## .tools/phase1-sql-test.mjs

```javascript
import { PGlite } from './sql-phase1/node_modules/@electric-sql/pglite/dist/index.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const tag = Number(process.argv[2] || 1);
const names = ['01_profiles_lockdown', '02_qr_nonces_hardening', '03_gym_status_guard', '04_permissions_enforcement', '05_record_payment_rpc', '06_nonce_visit_atomic'];
const pg = await PGlite.create();
const log = [`UTC: ${new Date().toISOString()}`, 'LOCAL PGlite PostgreSQL only. Auth emulated; not Supabase/PostgREST proof. No network database used.'];
let passed = 0;
const ids = { owner: '10000000-0000-0000-0000-000000000001', reception: '10000000-0000-0000-0000-000000000002', memberUser: '10000000-0000-0000-0000-000000000003', ownerB: '10000000-0000-0000-0000-000000000004', admin: '10000000-0000-0000-0000-000000000005', gym: '20000000-0000-0000-0000-000000000001', gymB: '20000000-0000-0000-0000-000000000002', branch: '30000000-0000-0000-0000-000000000001', branchB: '30000000-0000-0000-0000-000000000002', member: '40000000-0000-0000-0000-000000000001', memberB: '40000000-0000-0000-0000-000000000002', plan: '50000000-0000-0000-0000-000000000001', planB: '50000000-0000-0000-0000-000000000002' };
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function q(sql, args) {
  log.push(`SQL: ${sql}`, ...(args ? [`fixture parameters: ${JSON.stringify(args)}`] : []));
  try { const result = await pg.query(sql, args); log.push(JSON.stringify(result)); return result; }
  catch (error) { log.push(`ERROR ${error.code}: ${error.message}`); throw error; }
}
async function asUser(user, sql, args) {
  await pg.exec('BEGIN; SET LOCAL ROLE authenticated;');
  await pg.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [user]);
  try { const result = await q(sql, args); await pg.exec('COMMIT'); return result; }
  catch (error) { log.push(`ROLLBACK after SQLSTATE ${error.code}: ${error.message}`); await pg.exec('ROLLBACK'); throw error; }
}
async function rejects(user, sql, args, codes = ['42501']) {
  try { await asUser(user, sql, args); } catch (error) { assert(codes.includes(error.code), `Unexpected SQLSTATE ${error.code}`); return; }
  throw new Error('Expected SQL rejection');
}
async function test(name, action) { await action(); passed++; log.push(`PASS ${name}`); }
const paySql = 'SELECT public.record_payment($1,$2,$3,$4::public.payment_method,$5,$6) AS payment';
const payArgs = (member=ids.member, amount=1500, reference='FIXTURE') => [member,ids.plan,amount,'cash',reference,ids.branch];
const state = async (member) => (await q('SELECT (SELECT count(*) FROM public.subscriptions) AS subscriptions,(SELECT count(*) FROM public.payments) AS payments,(SELECT count(*) FROM public.audit_logs) AS audits,(SELECT status FROM public.members WHERE id=$1) AS member_status',[member])).rows[0];
let firstPayment;
try {
  await pg.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, phone text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth, public TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
  const schema = readFileSync('supabase/migrations/20250101000000_initial_schema.sql', 'utf8').replace(/^CREATE EXTENSION[^\r\n]+/gm, '-- extension declaration omitted locally; gen_random_uuid is built in');
  await pg.exec(schema);
  await pg.exec('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;');
  for (const user of ['owner', 'reception', 'memberUser', 'ownerB', 'admin']) await pg.query('INSERT INTO auth.users(id) VALUES ($1)', [ids[user]]);
  await pg.query('UPDATE public.profiles SET is_super_admin=true WHERE id=$1', [ids.admin]);
  await pg.query("INSERT INTO public.gyms(id,name,status) VALUES($1,'Fixture A','active'),($2,'Fixture B','active')", [ids.gym, ids.gymB]);
  await pg.query("INSERT INTO public.branches(id,gym_id,name) VALUES($1,$2,'A'),($3,$4,'B')", [ids.branch, ids.gym, ids.branchB, ids.gymB]);
  await pg.query("INSERT INTO public.gym_staff(gym_id,user_id,role,permissions) VALUES ($1,$2,'gym_owner','{}'),($3,$4,'gym_owner','{}'),($1,$5,'receptionist',$6::jsonb)", [ids.gym, ids.owner, ids.gymB, ids.ownerB, ids.reception, JSON.stringify({ can_manage_members: true, can_record_payments: true, can_scan_qr: true, can_import_members: true })]);
  await pg.query("INSERT INTO public.members(id,gym_id,branch_id,user_id,full_name,phone) VALUES($1,$2,$3,$4,'Fixture Member A','40000001'),($5,$6,$7,NULL,'Fixture Member B','40000002')", [ids.member, ids.gym, ids.branch, ids.memberUser, ids.memberB, ids.gymB, ids.branchB]);
  await pg.query("INSERT INTO public.plans(id,gym_id,name,duration_days,price_mru) VALUES($1,$2,'Monthly A',30,1500),($3,$4,'Monthly B',30,1500)", [ids.plan, ids.gym, ids.planB, ids.gymB]);
  await pg.query("INSERT INTO public.visits(gym_id,member_id,branch_id,scanned_by,method) VALUES($1,$2,$3,$4,'manual')", [ids.gym, ids.member, ids.branch, ids.owner]);
  if (tag >= 5) {
    await pg.query("INSERT INTO public.members(id,gym_id,branch_id,full_name,phone,status) VALUES('40000000-0000-0000-0000-000000000006',$1,$2,'Fixture expired member','40000006','expired')", [ids.gym,ids.branch]);
    await pg.query("INSERT INTO public.subscriptions(id,gym_id,member_id,plan_id,start_date,end_date,status) VALUES('70000000-0000-0000-0000-000000000001',$1,'40000000-0000-0000-0000-000000000006',$2,now()-interval '32 days',now()-interval '2 days','active')", [ids.gym,ids.plan]);
    await pg.query("INSERT INTO public.payments(gym_id,member_id,subscription_id,amount_mru,method,recorded_by) VALUES($1,'40000000-0000-0000-0000-000000000006','70000000-0000-0000-0000-000000000001',1500,'cash',$2)", [ids.gym,ids.owner]);
  }
  if (tag >= 6) {
    await pg.query("INSERT INTO public.members(id,gym_id,branch_id,full_name,phone,status) VALUES('40000000-0000-0000-0000-000000000007',$1,$2,'Fixture expired entrance','40000007','active')", [ids.gym,ids.branch]);
    await pg.query("INSERT INTO public.subscriptions(id,gym_id,member_id,plan_id,start_date,end_date,status) VALUES('70000000-0000-0000-0000-000000000007',$1,'40000000-0000-0000-0000-000000000007',$2,now()-interval '32 days',now()-interval '2 days','active')", [ids.gym,ids.plan]);
    await pg.query("INSERT INTO public.payments(gym_id,member_id,subscription_id,amount_mru,method,recorded_by) VALUES($1,'40000000-0000-0000-0000-000000000007','70000000-0000-0000-0000-000000000007',1500,'cash',$2)", [ids.gym,ids.owner]);
  }
  log.push(`Engine: ${JSON.stringify((await pg.query('SELECT version()')).rows)}`);
  for (let n = 0; n < tag; n++) {
    const script = readFileSync(`supabase/dev/${names[n]}.sql`, 'utf8');
    log.push(`APPLY ${names[n]} (twice, idempotence)`);
    await pg.exec(script); await pg.exec(script);
  }
  await test('01 own profile cannot elevate to super admin', () => rejects(ids.owner, 'UPDATE public.profiles SET is_super_admin=true WHERE id=$1', [ids.owner]));
  await test('01 normal profile fields remain editable', async () => {
    const result = await asUser(ids.owner, "UPDATE public.profiles SET full_name='Owner renamed' WHERE id=$1 RETURNING full_name", [ids.owner]);
    assert(result.rows.length === 1, 'Self update unexpectedly blocked');
  });
  await test('01 existing super admin can change flag', async () => {
    await asUser(ids.admin, 'UPDATE public.profiles SET is_super_admin=true WHERE id=$1', [ids.ownerB]);
    await asUser(ids.admin, 'UPDATE public.profiles SET is_super_admin=false WHERE id=$1', [ids.ownerB]);
  });
  if (tag === 2) {
    await test('02 nonce persists and server overrides forged used_at', async () => {
      const result = await asUser(ids.reception, "INSERT INTO public.qr_nonces(nonce,gym_id,member_id,used_at) VALUES('fixture-nonce',$1,$2,'2000-01-01') RETURNING used_at > now()-interval '1 minute' AS recent", [ids.gym, ids.member]);
      assert(result.rows[0].recent, 'Client could backdate nonce');
    });
    await test('02 duplicate nonce rejected', () => rejects(ids.reception, "INSERT INTO public.qr_nonces(nonce,gym_id,member_id) VALUES('fixture-nonce',$1,$2)", [ids.gym, ids.member], ['23505']));
    await test('02 nonce update rejected', () => rejects(ids.reception, "UPDATE public.qr_nonces SET nonce='changed' WHERE nonce='fixture-nonce'"));
    await test('02 nonce delete rejected', () => rejects(ids.reception, "DELETE FROM public.qr_nonces WHERE nonce='fixture-nonce'"));
    await test('02 cross gym nonce rejected', () => rejects(ids.reception, "INSERT INTO public.qr_nonces(nonce,gym_id,member_id) VALUES('cross-gym',$1,$2)", [ids.gymB, ids.memberB]));
  }
  if (tag >= 3) {
    await test('03 active gym data visible to staff and own member', async () => {
      for (const user of [ids.owner, ids.memberUser]) {
        const result = await asUser(user, 'SELECT id FROM public.members WHERE id=$1', [ids.member]);
        assert(result.rows.length === 1, 'Active gym unexpectedly hidden');
      }
    });
    await test('03 owner cannot change platform gym status', () => rejects(ids.owner, "UPDATE public.gyms SET status='suspended' WHERE id=$1", [ids.gym]));
    await test('03 cannot impersonate another user in membership helper', async () => {
      const result = await asUser(ids.owner, 'SELECT public.is_gym_staff($1,$2) AS allowed', [ids.gymB, ids.ownerB]);
      assert(result.rows[0].allowed === false, 'Caller could query as another user');
    });
    await asUser(ids.admin, "UPDATE public.gyms SET status='suspended' WHERE id=$1", [ids.gym]);
    await test('03 suspended staff/member helpers deny access', async () => {
      const s = await asUser(ids.reception, 'SELECT public.is_gym_staff($1) AS allowed', [ids.gym]);
      const m = await asUser(ids.memberUser, 'SELECT public.is_gym_member($1) AS allowed', [ids.gym]);
      assert(s.rows[0].allowed === false && m.rows[0].allowed === false, 'Suspension bypass');
    });
    await test('03 old member self-read policy cannot bypass suspension', async () => {
      for (const user of [ids.reception, ids.memberUser]) {
        for (const table of ['members', 'visits']) {
          const result = await asUser(user, `SELECT id FROM public.${table} WHERE gym_id=$1`, [ids.gym]);
          assert(result.rows.length === 0, 'Suspended gym leaked rows');
        }
      }
    });
    await test('03 super admin retains management access to suspended gym', async () => {
      const result = await asUser(ids.admin, 'SELECT id FROM public.gyms WHERE id=$1', [ids.gym]);
      assert(result.rows.length === 1, 'Super admin management blocked');
    });
    await asUser(ids.admin, "UPDATE public.gyms SET status='active' WHERE id=$1", [ids.gym]);
  }
  if (tag >= 4) {
    await test('04 missing/unknown permissions deny; owner recognized', async () => {
      const result = await asUser(ids.reception, "SELECT public.has_staff_permission($1,'unknown') AS unknown, public.has_staff_permission($1,'can_record_payments') AS payment", [ids.gym]);
      assert(result.rows[0].unknown === false && result.rows[0].payment === true, 'Permission lookup incorrect');
      const owner = await asUser(ids.owner, "SELECT public.has_staff_permission($1,'can_manage_plans') AS allowed", [ids.gym]);
      assert(owner.rows[0].allowed === true, 'Owner permission lost');
    });
    await asUser(ids.owner, "UPDATE public.gym_staff SET permissions=permissions || '{\"can_manage_plans\":true,\"can_cancel_payments\":true}'::jsonb WHERE user_id=$1 AND gym_id=$2", [ids.reception, ids.gym]);
    await test('04 receptionist cannot gain owner-only abilities via JSON', async () => {
      const result = await asUser(ids.reception, "SELECT public.has_staff_permission($1,'can_manage_plans') AS price,public.has_staff_permission($1,'can_cancel_payments') AS cancel", [ids.gym]);
      assert(result.rows[0].price === false && result.rows[0].cancel === false, 'Receptionist gained owner abilities');
      const update = await asUser(ids.reception, 'UPDATE public.plans SET price_mru=999 WHERE id=$1 RETURNING id', [ids.plan]);
      assert(update.rows.length === 0, 'Receptionist changed price');
    });
    await asUser(ids.owner, "UPDATE public.gym_staff SET permissions=(permissions - 'can_record_payments' - 'can_manage_members') || '{\"can_record_payments\":\"true\"}'::jsonb WHERE user_id=$1 AND gym_id=$2", [ids.reception, ids.gym]);
    await test('04 JSON string true is not boolean authorization', async () => {
      const result = await asUser(ids.reception, "SELECT public.has_staff_permission($1,'can_record_payments') AS allowed", [ids.gym]);
      assert(result.rows[0].allowed === false, 'String permission treated as boolean');
    });
    await test('04 payment write denied without payment permission', () => rejects(ids.reception, "INSERT INTO public.payments(gym_id,member_id,amount_mru,method,recorded_by) VALUES($1,$2,1500,'cash',$3)", [ids.gym, ids.member, ids.reception]));
    await test('04 import-only staff can insert but cannot edit member', async () => {
      await asUser(ids.reception, "INSERT INTO public.members(gym_id,full_name,phone) VALUES($1,'Fixture imported member','40000003')", [ids.gym]);
      const result = await asUser(ids.reception, "UPDATE public.members SET full_name='Unauthorized change' WHERE id=$1 RETURNING id", [ids.member]);
      assert(result.rows.length === 0, 'Import permission allowed editing');
    });
    await test('04 payment deletion forbidden', () => rejects(ids.owner, 'DELETE FROM public.payments WHERE member_id=$1', [ids.member]));
    await test('04 audit mutation forbidden', () => rejects(ids.owner, "UPDATE public.audit_logs SET action='changed' WHERE gym_id=$1", [ids.gym]));
    if (tag === 4) {
      const payment = await asUser(ids.owner, "INSERT INTO public.payments(gym_id,member_id,amount_mru,method,recorded_by) VALUES($1,$2,1500,'cash',$3) RETURNING id", [ids.gym, ids.member, ids.owner]);
      const paymentId = payment.rows[0].id;
      await test('04 receptionist soft-cancel RPC denied', () => rejects(ids.reception, 'SELECT public.cancel_payment($1,$2)', [paymentId, 'Fixture correction']));
      await test('04 owner cancellation records actor and reason in immutable audit', async () => {
        await asUser(ids.owner, 'SELECT public.cancel_payment($1,$2)', [paymentId, 'Fixture correction']);
        const audit = await asUser(ids.owner, "SELECT actor_id, after->>'cancellation_reason' AS reason FROM public.audit_logs WHERE entity='payments' AND entity_id=$1 AND action='UPDATE'", [paymentId]);
        assert(audit.rows.length === 1 && audit.rows[0].actor_id === ids.owner && audit.rows[0].reason === 'Fixture correction', 'Cancellation audit incorrect');
      });
    }
    await asUser(ids.owner, "UPDATE public.gym_staff SET permissions=permissions || '{\"can_record_payments\":true,\"can_manage_members\":true}'::jsonb WHERE user_id=$1 AND gym_id=$2", [ids.reception, ids.gym]);
  }
  if (tag >= 5) {
    await test('05 payment activates member and records subscription/payment/audit atomically', async () => {
      const before = await state(ids.member);
      const result = await asUser(ids.reception, paySql, payArgs());
      firstPayment = result.rows[0].payment;
      assert(firstPayment.amount_mru === 1500 && firstPayment.recorded_by === ids.reception && firstPayment.gym_id === ids.gym, 'Payment identity/amount incorrect');
      const after = await state(ids.member);
      assert(after.subscriptions === before.subscriptions+1 && after.payments === before.payments+1 && after.member_status === 'active', 'Payment did not activate atomically');
      const audit = await asUser(ids.owner, "SELECT entity,actor_id FROM public.audit_logs WHERE entity_id IN ($1,$2) ORDER BY entity", [firstPayment.id, firstPayment.subscription_id]);
      assert(audit.rows.length === 2 && audit.rows.every((row) => row.actor_id === ids.reception), 'Financial audit missing');
    });
    await test('05 fraction/zero/negative rejected without writes', async () => {
      const before = await state(ids.member);
      await rejects(ids.reception, paySql, payArgs(ids.member,1500.5), ['22P02','22003','42883']);
      await rejects(ids.reception, paySql, payArgs(ids.member,0), ['22023']);
      await rejects(ids.reception, paySql, payArgs(ids.member,-1), ['22023']);
      assert(JSON.stringify(before) === JSON.stringify(await state(ids.member)), 'Invalid amount changed state');
    });
    const failureMember = '40000000-0000-0000-0000-000000000005';
    await asUser(ids.owner, "INSERT INTO public.members(id,gym_id,branch_id,full_name,phone) VALUES($1,$2,$3,'Fixture rollback member','40000005')", [failureMember,ids.gym,ids.branch]);
    await pg.exec(`CREATE FUNCTION public.fixture_reject_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.transaction_ref='FIXTURE_FORCE_FAILURE' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='FIXTURE_FORCED_PAYMENT_FAILURE'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER zz_fixture_reject_payment BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_payment();`);
    await test('05 forced payment failure rolls back subscription/member/audit', async () => {
      const before = await state(failureMember);
      await rejects(ids.reception, paySql, payArgs(failureMember,1500,'FIXTURE_FORCE_FAILURE'), ['23514']);
      assert(JSON.stringify(before) === JSON.stringify(await state(failureMember)), 'Partial payment state survived');
    });
    await pg.exec('DROP TRIGGER zz_fixture_reject_payment ON public.payments; DROP FUNCTION public.fixture_reject_payment();');
    await pg.exec(`CREATE FUNCTION public.fixture_reject_activation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.id='40000000-0000-0000-0000-000000000005'::uuid AND NEW.status='active' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='FIXTURE_FORCED_ACTIVATION_FAILURE'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER zz_fixture_reject_activation AFTER UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_activation();`);
    await test('05 late activation failure rolls back even payment and audit already inserted', async () => {
      const before = await state(failureMember);
      await rejects(ids.reception, paySql, payArgs(failureMember), ['23514']);
      assert(JSON.stringify(before) === JSON.stringify(await state(failureMember)), 'Late failure left financial state');
    });
    await pg.exec('DROP TRIGGER zz_fixture_reject_activation ON public.members; DROP FUNCTION public.fixture_reject_activation();');
    await test('05 early renewal starts at existing end and preserves paid days', async () => {
      const result = await asUser(ids.reception, paySql, payArgs());
      assert(result.rows[0].payment.subscription.start_date === firstPayment.subscription.end_date, 'Remaining days lost');
    });
    await test('05 renewal after expiry starts now rather than old expiry', async () => {
      const result = await asUser(ids.reception, paySql, payArgs('40000000-0000-0000-0000-000000000006'));
      const period = await asUser(ids.owner, "SELECT start_date > now()-interval '1 minute' AND start_date<=clock_timestamp() AS starts_now FROM public.subscriptions WHERE id=$1", [result.rows[0].payment.subscription_id]);
      assert(period.rows[0].starts_now, 'Expired renewal did not start now');
    });
    await test('05 unpaid direct subscription and member activation rejected at commit', async () => {
      const before = await state(failureMember);
      await rejects(ids.owner, "INSERT INTO public.subscriptions(gym_id,member_id,plan_id,end_date) VALUES($1,$2,$3,'2099-01-01')", [ids.gym,failureMember,ids.plan], ['23514']);
      await rejects(ids.owner, "UPDATE public.members SET status='active' WHERE id=$1", [failureMember], ['23514']);
      assert(JSON.stringify(before) === JSON.stringify(await state(failureMember)), 'Unpaid activation survived');
    });
    await test('05 cross-gym member/plan/branch refused', async () => {
      await rejects(ids.reception, paySql, payArgs(ids.memberB));
      const plan = payArgs(); plan[1]=ids.planB;
      await rejects(ids.reception, paySql, plan, ['23503']);
      const branch = payArgs(); branch[5]=ids.branchB;
      await rejects(ids.reception, paySql, branch, ['23503']);
      await rejects(ids.owner, "INSERT INTO public.members(gym_id,branch_id,full_name,phone) VALUES($1,$2,'Fixture wrong branch','40000006')", [ids.gym,ids.branchB], ['23503']);
    });
    await test('05 changing subscription dates denied', () => rejects(ids.owner, "UPDATE public.subscriptions SET end_date='2099-01-01' WHERE id=$1", [firstPayment.subscription_id]));
    await test('05 member role cannot record own payment', () => rejects(ids.memberUser, paySql, payArgs()));
    await asUser(ids.owner, "UPDATE public.gym_staff SET permissions=permissions || '{\"can_record_payments\":false}'::jsonb WHERE user_id=$1 AND gym_id=$2", [ids.reception,ids.gym]);
    await test('05 RPC rejects receptionist without payment permission', () => rejects(ids.reception, paySql, payArgs()));
    await asUser(ids.owner, "UPDATE public.gym_staff SET permissions=permissions || '{\"can_record_payments\":true}'::jsonb WHERE user_id=$1 AND gym_id=$2", [ids.reception,ids.gym]);
    await test('05 paid soft-cancel records reason and actor', async () => {
      await rejects(ids.reception, 'SELECT public.cancel_payment($1,$2)', [firstPayment.id,'Fixture refund']);
      await asUser(ids.owner, 'SELECT public.cancel_payment($1,$2)', [firstPayment.id,'Fixture refund']);
      const result = await asUser(ids.owner, "SELECT actor_id,after->>'cancellation_reason' AS reason FROM public.audit_logs WHERE entity='payments' AND entity_id=$1 AND action='UPDATE'", [firstPayment.id]);
      assert(result.rows.length === 1 && result.rows[0].actor_id === ids.owner && result.rows[0].reason === 'Fixture refund', 'Soft cancel audit wrong');
    });
    const b = [ids.memberB,ids.planB,1500,'cash','FIXTURE_B',ids.branchB];
    await asUser(ids.ownerB, paySql, b);
    await asUser(ids.ownerB, "INSERT INTO public.visits(gym_id,member_id,branch_id,scanned_by,method) VALUES($1,$2,$3,$4,'manual')", [ids.gymB,ids.memberB,ids.branchB,ids.ownerB]);
    await test('05 A cannot read/update/delete B members/payments/subscriptions/visits', async () => {
      for (const table of ['members','payments','subscriptions','visits']) {
        const rows = await asUser(ids.owner, `SELECT id FROM public.${table} WHERE gym_id=$1`, [ids.gymB]);
        assert(rows.rows.length === 0, `Cross-gym read: ${table}`);
        const update = await asUser(ids.owner, `UPDATE public.${table} SET gym_id=gym_id WHERE gym_id=$1 RETURNING id`, [ids.gymB]);
        assert(update.rows.length === 0, `Cross-gym update: ${table}`);
        if (['payments','subscriptions'].includes(table)) await rejects(ids.owner, `DELETE FROM public.${table} WHERE gym_id=$1`, [ids.gymB]);
        else {
          const deleted = await asUser(ids.owner, `DELETE FROM public.${table} WHERE gym_id=$1 RETURNING id`, [ids.gymB]);
          assert(deleted.rows.length === 0, `Cross-gym delete: ${table}`);
        }
      }
    });
  }
  if (tag >= 6) {
    const scanSql = 'SELECT public.verify_and_record_visit($1,$2,$3) AS verification';
    const scanState = async () => (await q('SELECT (SELECT count(*) FROM public.qr_nonces) AS nonces,(SELECT count(*) FROM public.visits) AS visits')).rows[0];
    await test('06 first QR RPC records an actual visit and nonce', async () => {
      const result = await asUser(ids.reception, scanSql, ['fixture-qr-valid',ids.member,ids.branch]);
      const value = result.rows[0].verification;
      assert(value.allowed === true && /^[0-9a-f-]{36}$/.test(value.visit_id), 'Missing database visit id');
      const stored = await asUser(ids.owner, "SELECT id FROM public.visits WHERE id=$1 AND qr_nonce='fixture-qr-valid'", [value.visit_id]);
      assert(stored.rows.length === 1, 'Returned id does not exist');
    });
    await test('06 identical nonce rejected as REPLAY without second visit', async () => {
      const before = await scanState();
      await rejects(ids.reception, scanSql, ['fixture-qr-valid',ids.member,ids.branch], ['23505']);
      assert(JSON.stringify(before) === JSON.stringify(await scanState()), 'Replay changed visits/nonces');
    });
    await test('06 used nonce cannot be updated or deleted', async () => {
      await rejects(ids.reception, "UPDATE public.qr_nonces SET used_at='2000-01-01' WHERE nonce='fixture-qr-valid'");
      await rejects(ids.reception, "DELETE FROM public.qr_nonces WHERE nonce='fixture-qr-valid'");
    });
    await pg.exec(`CREATE FUNCTION public.fixture_reject_visit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.qr_nonce='fixture-visit-failure' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='FIXTURE_FORCED_VISIT_FAILURE'; END IF;
      RETURN NEW; END $$;
      CREATE TRIGGER zz_fixture_reject_visit BEFORE INSERT ON public.visits FOR EACH ROW EXECUTE FUNCTION public.fixture_reject_visit();`);
    await test('06 forced visit failure rolls back nonce consumption', async () => {
      const before = await scanState();
      await rejects(ids.reception, scanSql, ['fixture-visit-failure',ids.member,ids.branch], ['23514']);
      assert(JSON.stringify(before) === JSON.stringify(await scanState()), 'Visit failure consumed nonce');
    });
    await pg.exec('DROP TRIGGER zz_fixture_reject_visit ON public.visits; DROP FUNCTION public.fixture_reject_visit();');
    await test('06 standalone nonce cannot commit', async () => {
      const before = await scanState();
      await rejects(ids.reception, "INSERT INTO public.qr_nonces(nonce,gym_id,member_id) VALUES('fixture-orphan-nonce',$1,$2)", [ids.gym,ids.member], ['23514']);
      assert(JSON.stringify(before) === JSON.stringify(await scanState()), 'Orphan nonce survived');
    });
    await test('06 QR visit without nonce cannot be forged via table API', () => rejects(ids.reception, "INSERT INTO public.visits(gym_id,member_id,branch_id,scanned_by,method) VALUES($1,$2,$3,$4,'qr')", [ids.gym,ids.member,ids.branch,ids.reception], ['23514']));
    await test('06 inactive/expired/foreign member and foreign branch refused', async () => {
      const before = await scanState();
      await rejects(ids.reception, scanSql, ['fixture-inactive','40000000-0000-0000-0000-000000000005',ids.branch], ['P0001']);
      await rejects(ids.reception, scanSql, ['fixture-expired','40000000-0000-0000-0000-000000000007',ids.branch], ['P0001']);
      await rejects(ids.reception, scanSql, ['fixture-foreign',ids.memberB,ids.branchB]);
      await rejects(ids.reception, scanSql, ['fixture-branch',ids.member,ids.branchB], ['23503']);
      assert(JSON.stringify(before) === JSON.stringify(await scanState()), 'Denied scan changed state');
    });
    const futureMember = '40000000-0000-0000-0000-000000000008';
    await asUser(ids.owner, "INSERT INTO public.members(id,gym_id,branch_id,full_name,phone) VALUES($1,$2,$3,'Fixture future member','40000008')", [futureMember,ids.gym,ids.branch]);
    const initial = await asUser(ids.reception,paySql,payArgs(futureMember));
    await asUser(ids.reception,paySql,payArgs(futureMember));
    await asUser(ids.owner,"UPDATE public.subscriptions SET status='cancelled' WHERE id=$1",[initial.rows[0].payment.subscription_id]);
    await test('06 future-only subscription cannot enter before its start_date', () => rejects(ids.reception,scanSql,['fixture-future',futureMember,ids.branch],['P0001']));
    await asUser(ids.owner,"UPDATE public.gym_staff SET permissions=permissions || '{\"can_scan_qr\":false}'::jsonb WHERE user_id=$1 AND gym_id=$2",[ids.reception,ids.gym]);
    await test('06 scan permission enforced inside RPC', () => rejects(ids.reception,scanSql,['fixture-denied',ids.member,ids.branch]));
    await asUser(ids.owner,"UPDATE public.gym_staff SET permissions=permissions || '{\"can_scan_qr\":true}'::jsonb WHERE user_id=$1 AND gym_id=$2",[ids.reception,ids.gym]);
    await asUser(ids.admin,"UPDATE public.gyms SET status='suspended' WHERE id=$1",[ids.gym]);
    await test('06 suspended gym refuses scan even for super admin RPC', () => rejects(ids.admin,scanSql,['fixture-suspended',ids.member,ids.branch]));
    await asUser(ids.admin,"UPDATE public.gyms SET status='active' WHERE id=$1",[ids.gym]);
    await test('06 manual entry fallback still validates active subscription', async () => {
      const result = await asUser(ids.reception,"INSERT INTO public.visits(gym_id,member_id,branch_id,scanned_by,method) VALUES($1,$2,$3,$4,'manual') RETURNING id",[ids.gym,ids.member,ids.branch,ids.reception]);
      assert(result.rows.length === 1,'Manual entry rejected');
    });
    await test('06 all six patches can be reapplied to populated data without changing records', async () => {
      const before = await q("SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY p.id)::text) AS payments FROM public.payments p");
      for (const name of names) await pg.exec(readFileSync(`supabase/dev/${name}.sql`,'utf8'));
      const after = await q("SELECT md5(jsonb_agg(to_jsonb(p) ORDER BY p.id)::text) AS payments FROM public.payments p");
      assert(before.rows[0].payments === after.rows[0].payments,'Patch reapplication changed financial data');
      const rls = await q("SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity");
      assert(rls.rows.length===0,'A business table has RLS disabled');
      const anon = await q("SELECT has_function_privilege('anon','public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid)','EXECUTE') AS payment,has_function_privilege('anon','public.verify_and_record_visit(text,uuid,uuid)','EXECUTE') AS scan");
      assert(anon.rows[0].payment===false && anon.rows[0].scan===false,'Anonymous RPC execute grant');
    });
  }
  log.push(`LOCAL SQL RESULT: ${passed} passed, 0 failed; applied steps 01..${String(tag).padStart(2, '0')}`);
} catch (error) {
  log.push(`LOCAL SQL FAILED: ${error.code || ''} ${error.message}`);
  process.exitCode = 1;
} finally {
  await pg.close();
  mkdirSync('docs/evidence/phase1', { recursive: true });
  const output = log.join('\n');
  writeFileSync(`docs/evidence/phase1/${String(tag).padStart(2, '0')}-sql-local.txt`, output);
  console.log(output);
}

```

## .tools/phase1-check.mjs

```javascript
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const tag = process.argv[2];
if (!/^0[1-6]$/.test(tag)) throw new Error('Expected SQL step 01..06');
const node = path.join(root, '.tools/node22/node_modules/node/bin/node.exe');
const web = path.join(root, 'apps/web');
const env = { ...process.env, PATH: `${path.dirname(node)};${process.env.PATH}`, NO_COLOR: '1' };
delete env.FORCE_COLOR;
const run = (args) => spawnSync(node, args, { cwd: web, env, encoding: 'utf8', maxBuffer: 10e6 });
const npm = path.join(process.env.ProgramFiles, 'nodejs/node_modules/npm/bin/npm-cli.js');
const check = run([npm, 'run', 'check']);
const checkText = `${check.stdout || ''}${check.stderr || ''}`;
const failures = [...checkText.matchAll(/^\s*FAIL\s+([^\r\n]+)/gm)].map((match) => match[1]);
const expected = { 'BUG-QR-01:': 2, 'BUG-QR-02:': 1, 'BUG-PAY-01:': 1, 'BUG-PAY-02:': 1 };
const knownOnly = check.status === 1 && failures.length === 5 && Object.entries(expected).every(([key, count]) => failures.filter((line) => line.includes(key)).length === count)
  && /Tests\s+5 failed \| 49 passed \(54\)/.test(checkText) && checkText.includes('No ESLint warnings or errors');
const tsc = run(['node_modules/typescript/bin/tsc', '--noEmit']);
const lint = run(['node_modules/next/dist/bin/next', 'lint']);
const build = run(['node_modules/next/dist/bin/next', 'build']);
const output = [`UTC: ${new Date().toISOString()}`, `Step: ${tag}`, 'Phase 1 exception: exactly five existing failures allowed; no app/test source changes.',
  `npm run check exit=${check.status}`, checkText,
  `tsc --noEmit exit=${tsc.status}`, tsc.stdout || '', tsc.stderr || '',
  `next lint exit=${lint.status}`, lint.stdout || '', lint.stderr || '',
  `next build exit=${build.status}`, build.stdout || '', build.stderr || '',
  `Expected five failures only: ${knownOnly}`].join('\n');
mkdirSync(path.join(root, 'docs/evidence/phase1'), { recursive: true });
writeFileSync(path.join(root, `docs/evidence/phase1/${tag}-web-check.txt`), output);
process.stdout.write(output);
if (!knownOnly || tsc.status !== 0 || lint.status !== 0 || build.status !== 0) process.exitCode = 1;

```