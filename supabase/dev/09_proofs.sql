-- الغرض: إثباتات قاعدة البيانات (أمن، عزل، دفع، إلغاء، تدقيق، إعادة استخدام nonce) بهوية حسابات الاختبار.
-- كل الكتابات تُنفَّذ داخل معاملة فرعية تنتهي بـ RAISE ثم تُلتقط => ROLLBACK مضمون، ولا يبقى أي أثر.
-- النتيجة: جدول واحد (test / attendu / obtenu / resultat) كآخر استعلام.
-- المتطلبات: تنفيذ 00..08 و demo_data و 05 و 06 و 10. الحسابات: admin@gymsaas.mr، owner@elitegym.mr،
--   reception@elitegym.mr، member@elitegym.mr (مرتبط بعضو d..001)، staffb@championgym.mr (صالة B).
-- المخاطر: يعدّل مؤقتًا (ثم يتراجع): حالة الصالة A، صلاحيات الاستقبال، وفخ إدراج على payments باسم zz_proof_force_fail.
-- التراجع: لا شيء لأن كل شيء يُلغى. إن توقف التنفيذ بشكل غير متوقع: DROP TRIGGER IF EXISTS zz_proof_force_fail ON public.payments;
--          DROP FUNCTION IF EXISTS public.zz_proof_force_fail();
-- ملاحظة: تُنفَّذ بدور postgres في SQL Editor (يبدّل إلى authenticated عبر SET LOCAL ROLE).

CREATE OR REPLACE FUNCTION pg_temp.val(p_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE v text;
BEGIN
    EXECUTE p_sql INTO v;
    RETURN coalesce(v, 'NULL');
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END $f$;

CREATE OR REPLACE FUNCTION pg_temp.try(p_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN 'OK:' || n;
EXCEPTION WHEN OTHERS THEN
    RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END $f$;

CREATE OR REPLACE FUNCTION pg_temp.rec(rep jsonb, t text, e text, g text) RETURNS jsonb LANGUAGE sql AS $f$
    SELECT rep || jsonb_build_array(jsonb_build_object('t', t, 'e', e, 'g', g, 'p', (g ~ e)));
$f$;

CREATE OR REPLACE FUNCTION pg_temp.logout() RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
    EXECUTE 'RESET ROLE';
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.role', '', true);
END $f$;

CREATE OR REPLACE FUNCTION pg_temp.login(p_email text) RETURNS uuid LANGUAGE plpgsql AS $f$
DECLARE v uuid;
BEGIN
    EXECUTE 'RESET ROLE';
    SELECT id INTO v FROM auth.users WHERE email = p_email;
    PERFORM set_config('request.jwt.claim.sub', v::text, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    EXECUTE 'SET LOCAL ROLE authenticated';
    RETURN v;
END $f$;

CREATE OR REPLACE FUNCTION pg_temp.run_proofs()
RETURNS TABLE(test text, attendu text, obtenu text, resultat text) LANGUAGE plpgsql AS $f$
DECLARE
    rep jsonb := '[]'::jsonb;
    gA constant uuid := 'a0000000-0000-0000-0000-000000000001';
    gB constant uuid := 'a1000000-0000-0000-0000-000000000002';
    brA constant uuid := 'b0000000-0000-0000-0000-000000000001';
    planA constant uuid := 'c0000000-0000-0000-0000-000000000001';
    planB constant uuid := 'c1000000-0000-0000-0000-000000000002';
    mA1 constant uuid := 'd0000000-0000-0000-0000-000000000001';
    mA2 constant uuid := 'd0000000-0000-0000-0000-000000000004'; -- actif (d..002 vient du seed et est expiré)
    mA3 constant uuid := 'd0000000-0000-0000-0000-000000000003';
    mA29 constant uuid := 'd0000000-0000-0000-0000-000000000029';
    mExpired constant uuid := 'd0000000-0000-0000-0000-000000000033';
    mB constant uuid := 'd1000000-0000-0000-0000-000000000002';
    v_owner uuid; v_rec uuid; v_mem uuid; v_staffb uuid;
    v_missing text; v_r text; v_res text; v_old_end timestamptz; v_new_end timestamptz;
    v_newm uuid; v_failm uuid; v_pay uuid; v_sub uuid; v_pay_rec uuid; v_n text;
BEGIN
    -- مقدّمة: وجود الحسابات
    SELECT string_agg(e, ', ') INTO v_missing FROM unnest(ARRAY['admin@gymsaas.mr','owner@elitegym.mr',
        'reception@elitegym.mr','member@elitegym.mr','staffb@championgym.mr']) e
        WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = e);
    IF v_missing IS NOT NULL THEN
        RETURN QUERY SELECT 'PRECHECK comptes manquants'::text, 'aucun'::text, v_missing, 'FAIL'::text;
        RETURN;
    END IF;
    IF to_regprocedure('public.verify_and_record_visit(text,uuid,uuid)') IS NULL
       OR to_regprocedure('public.record_payment(uuid,uuid,integer,public.payment_method,text,uuid)') IS NULL THEN
        RETURN QUERY SELECT 'PRECHECK RPC 05/06 absents'::text, 'présents'::text, 'absents'::text, 'FAIL'::text;
        RETURN;
    END IF;

    BEGIN  -- معاملة فرعية: تُلغى بالكامل في النهاية
        -- 00 هوية
        v_owner := pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, '00 auth.uid() = UUID simulé (owner)', '^true$',
            pg_temp.val('SELECT (auth.uid() = ' || quote_literal(v_owner) || '::uuid)::text'));
        PERFORM pg_temp.logout();

        -- (b) تصعيد الصلاحيات
        v_rec := pg_temp.login('reception@elitegym.mr');
        v_r := pg_temp.try(format('UPDATE public.profiles SET is_super_admin=true WHERE id=%L', v_rec));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'b1 réception: UPDATE profiles.is_super_admin refusé (état final)', '^false$',
            pg_temp.val(format('SELECT is_super_admin::text FROM public.profiles WHERE id=%L', v_rec)));
        rep := pg_temp.rec(rep, 'b2 réponse de l''UPDATE (0 ligne ou erreur)', '^(OK:0|ERR:)', v_r);

        -- (c) العزل بين الصالتين
        PERFORM pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, 'c0 owner A voit ses membres (contrôle positif)', '^([4-9][0-9]|[1-9][0-9]{2,})$',
            pg_temp.val(format('SELECT count(*)::text FROM public.members WHERE gym_id=%L', gA)));
        rep := pg_temp.rec(rep, 'c1 owner A lit members de B', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.members WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c2 owner A lit payments de B', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.payments WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c3 owner A lit subscriptions de B', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.subscriptions WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c4 owner A lit visits de B', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.visits WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c5 owner A UPDATE members de B', '^(OK:0|ERR:)', pg_temp.try(format('UPDATE public.members SET full_name=''HACK'' WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c6 owner A DELETE members de B', '^(OK:0|ERR:)', pg_temp.try(format('DELETE FROM public.members WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c7 owner A UPDATE payments de B', '^(OK:0|ERR:)', pg_temp.try(format('UPDATE public.payments SET amount_mru=1 WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c8 owner A DELETE payments de B', '^(OK:0|ERR:)', pg_temp.try(format('DELETE FROM public.payments WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c9 owner A UPDATE subscriptions de B', '^(OK:0|ERR:)', pg_temp.try(format('UPDATE public.subscriptions SET status=''cancelled'' WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c10 owner A DELETE subscriptions de B', '^(OK:0|ERR:)', pg_temp.try(format('DELETE FROM public.subscriptions WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c11 owner A UPDATE/DELETE visits de B', '^(OK:0|ERR:)', pg_temp.try(format('DELETE FROM public.visits WHERE gym_id=%L', gB)));
        rep := pg_temp.rec(rep, 'c12 owner A record_payment sur membre de B', '^ERR:42501',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mB, planB)));
        rep := pg_temp.rec(rep, 'c13 owner A scanne un membre de B', '^ERR:42501',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-cross-gym', mB)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'c14 données B intactes après les tentatives', '^عضو الصالة B$',
            pg_temp.val(format('SELECT full_name FROM public.members WHERE id=%L', mB)));
        rep := pg_temp.rec(rep, 'c15 paiement B toujours présent', '^[1-9]', pg_temp.val(format('SELECT count(*)::text FROM public.payments WHERE gym_id=%L', gB)));
        -- عكسيًا: موظف B لا يرى A
        PERFORM pg_temp.login('staffb@championgym.mr');
        rep := pg_temp.rec(rep, 'c16 staff B lit members de A', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.members WHERE gym_id=%L', gA)));
        rep := pg_temp.rec(rep, 'c17 staff B UPDATE members de A', '^(OK:0|ERR:)', pg_temp.try(format('UPDATE public.members SET full_name=''HACK'' WHERE gym_id=%L', gA)));
        rep := pg_temp.rec(rep, 'c18 staff B DELETE payments de A', '^(OK:0|ERR:)', pg_temp.try(format('DELETE FROM public.payments WHERE gym_id=%L', gA)));
        PERFORM pg_temp.logout();

        -- (d) صالة معلّقة
        rep := pg_temp.rec(rep, 'd0 mise en suspension de la salle A (setup)', '^OK:1$',
            pg_temp.try(format('UPDATE public.gyms SET status=''suspended'' WHERE id=%L', gA)));
        PERFORM pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, 'd1 staff: membres visibles salle suspendue', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.members WHERE gym_id=%L', gA)));
        rep := pg_temp.rec(rep, 'd2 staff: record_payment refusé', '^ERR:42501',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mA3, planA)));
        rep := pg_temp.rec(rep, 'd3 staff: scan refusé', '^ERR:42501',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-suspended', mA3)));
        PERFORM pg_temp.logout();
        PERFORM pg_temp.login('member@elitegym.mr');
        rep := pg_temp.rec(rep, 'd4 membre: sa propre fiche invisible salle suspendue', '^0$',
            pg_temp.val('SELECT count(*)::text FROM public.members WHERE user_id=auth.uid()'));
        rep := pg_temp.rec(rep, 'd5 membre: abonnements invisibles salle suspendue', '^0$',
            pg_temp.val('SELECT count(*)::text FROM public.subscriptions'));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'd6 réactivation de la salle A (setup)', '^OK:1$',
            pg_temp.try(format('UPDATE public.gyms SET status=''active'' WHERE id=%L', gA)));

        -- (e) record_payment
        v_old_end := (SELECT max(end_date) FROM public.subscriptions WHERE member_id = mA29 AND status = 'active');
        PERFORM pg_temp.login('owner@elitegym.mr');
        v_res := pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mA29, planA));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'e1 record_payment 1500 réussit (renouvellement)', '^true$', (v_res !~ '^ERR:')::text);
        IF v_res !~ '^ERR:' THEN
            v_new_end := ((v_res::jsonb) -> 'subscription' ->> 'end_date')::timestamptz;
            rep := pg_temp.rec(rep, 'e2 montant enregistré', '^1500$', (v_res::jsonb) ->> 'amount_mru');
            rep := pg_temp.rec(rep, 'e3 renouvellement conserve les jours restants (nouvelle fin - ancienne fin)', '^30 days$', (v_new_end - v_old_end)::text);
        ELSE
            rep := pg_temp.rec(rep, 'e2 erreur record_payment', 'aucune', v_res);
        END IF;
        -- membre neuf
        PERFORM pg_temp.login('owner@elitegym.mr');
        v_n := pg_temp.val(format('INSERT INTO public.members(gym_id,branch_id,full_name,phone) VALUES (%L,%L,''Proof Nouveau'',''39999991'') RETURNING id::text', gA, brA));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'e4 nouveau membre naît non actif', '^inactive$',
            pg_temp.val(format('SELECT status::text FROM public.members WHERE id=%L', CASE WHEN v_n ~ '^ERR' THEN NULL ELSE v_n END::uuid)));
        v_newm := CASE WHEN v_n ~ '^ERR' THEN NULL ELSE v_n::uuid END;
        PERFORM pg_temp.login('owner@elitegym.mr');
        v_res := pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''bankily'',''REF-PROOF'')::text', v_newm, planA));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'e5 paiement du nouveau membre', '^true$', (v_res !~ '^ERR:')::text);
        IF v_res !~ '^ERR:' THEN
            v_pay := ((v_res::jsonb) ->> 'id')::uuid;
            v_sub := ((v_res::jsonb) -> 'subscription' ->> 'id')::uuid;
        END IF;
        rep := pg_temp.rec(rep, 'e6 le membre devient actif via record_payment uniquement', '^active$',
            pg_temp.val(format('SELECT status::text FROM public.members WHERE id=%L', v_newm)));
        -- فشل قسري بعد إدراج الاشتراك: لا كتابة جزئية
        PERFORM pg_temp.login('owner@elitegym.mr');
        v_n := pg_temp.val(format('INSERT INTO public.members(gym_id,branch_id,full_name,phone) VALUES (%L,%L,''Proof Echec'',''39999992'') RETURNING id::text', gA, brA));
        PERFORM pg_temp.logout();
        v_failm := CASE WHEN v_n ~ '^ERR' THEN NULL ELSE v_n::uuid END;
        EXECUTE 'CREATE OR REPLACE FUNCTION public.zz_proof_force_fail() RETURNS trigger LANGUAGE plpgsql AS $t$ BEGIN RAISE EXCEPTION ''FORCED_FAILURE''; END $t$';
        EXECUTE 'CREATE TRIGGER zz_proof_force_fail BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION public.zz_proof_force_fail()';
        PERFORM pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, 'e7 échec forcé après insertion de l''abonnement', '^ERR:',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', v_failm, planA)));
        PERFORM pg_temp.logout();
        EXECUTE 'DROP TRIGGER IF EXISTS zz_proof_force_fail ON public.payments';
        EXECUTE 'DROP FUNCTION IF EXISTS public.zz_proof_force_fail()';
        rep := pg_temp.rec(rep, 'e8 aucun abonnement partiel', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.subscriptions WHERE member_id=%L', v_failm)));
        rep := pg_temp.rec(rep, 'e9 aucun paiement partiel', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.payments WHERE member_id=%L', v_failm)));
        rep := pg_temp.rec(rep, 'e10 statut membre inchangé', '^inactive$', pg_temp.val(format('SELECT status::text FROM public.members WHERE id=%L', v_failm)));
        rep := pg_temp.rec(rep, 'e11 aucune ligne d''audit partielle (members UPDATE)', '^0$',
            pg_temp.val(format('SELECT count(*)::text FROM public.audit_logs WHERE entity=''members'' AND entity_id=%L AND action=''UPDATE''', v_failm::text)));
        PERFORM pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, 'e12 1500.5 refusé', '^ERR:',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500.5,''cash'')::text', v_failm, planA)));
        rep := pg_temp.rec(rep, 'e13 montant 0 refusé', '^ERR:22023',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,0,''cash'')::text', v_failm, planA)));
        rep := pg_temp.rec(rep, 'e14 plan d''une autre salle refusé', '^ERR:23503',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', v_failm, planB)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'e15 toujours aucun abonnement après les refus', '^0$', pg_temp.val(format('SELECT count(*)::text FROM public.subscriptions WHERE member_id=%L', v_failm)));

        -- (f) إلغاء ناعم + تدقيق + عدم قابلية التعديل
        PERFORM pg_temp.login('owner@elitegym.mr');
        rep := pg_temp.rec(rep, 'f0 avant annulation: la visite est acceptée (contrôle positif)', '^\{',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-nonce-before', v_newm)));
        rep := pg_temp.rec(rep, 'f1 motif trop court refusé', '^ERR:22023', pg_temp.val(format('SELECT public.cancel_payment(%L,''ab'')::text', v_pay)));
        rep := pg_temp.rec(rep, 'f2 annulation avec motif', '^\{', pg_temp.val(format('SELECT public.cancel_payment(%L,''motif de test annulation'')::text', v_pay)));
        rep := pg_temp.rec(rep, 'f3 DELETE payments refusé', '^ERR:', pg_temp.try(format('DELETE FROM public.payments WHERE id=%L', v_pay)));
        rep := pg_temp.rec(rep, 'f4 UPDATE montant refusé', '^ERR:', pg_temp.try(format('UPDATE public.payments SET amount_mru=1 WHERE id=%L', v_pay)));
        rep := pg_temp.rec(rep, 'f5 UPDATE audit_logs refusé', '^ERR:', pg_temp.try('UPDATE public.audit_logs SET action=''X'''));
        rep := pg_temp.rec(rep, 'f6 DELETE audit_logs refusé', '^ERR:', pg_temp.try('DELETE FROM public.audit_logs'));
        rep := pg_temp.rec(rep, 'f7 ré-annulation refusée', '^ERR:', pg_temp.val(format('SELECT public.cancel_payment(%L,''deuxieme tentative'')::text', v_pay)));
        rep := pg_temp.rec(rep, 'f8 après annulation: entrée refusée (NO_ACTIVE_SUBSCRIPTION)', '^ERR:P0001:NO_ACTIVE_SUBSCRIPTION$',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-nonce-after', v_newm)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'f9 paiement soft-cancelled (statut conservé, ligne non supprimée)', '^cancelled$',
            pg_temp.val(format('SELECT status::text FROM public.payments WHERE id=%L', v_pay)));
        rep := pg_temp.rec(rep, 'f10 abonnement lié passé à cancelled', '^cancelled$',
            pg_temp.val(format('SELECT status::text FROM public.subscriptions WHERE id=%L', v_sub)));
        rep := pg_temp.rec(rep, 'f11 audit_logs: motif + exécutant de l''annulation', '^1$',
            pg_temp.val(format('SELECT count(*)::text FROM public.audit_logs WHERE entity=''payments'' AND entity_id=%L AND action=''UPDATE'' AND actor_id=%L AND after->>''status''=''cancelled'' AND after->>''cancellation_reason''=''motif de test annulation'' AND after->>''cancelled_by''=%L',
                v_pay::text, v_owner, v_owner::text)));
        rep := pg_temp.rec(rep, 'f12 audit_logs: abonnement annulé tracé', '^[1-9]',
            pg_temp.val(format('SELECT count(*)::text FROM public.audit_logs WHERE entity=''subscriptions'' AND entity_id=%L AND action=''UPDATE'' AND after->>''status''=''cancelled''', v_sub::text)));

        -- (g) صلاحيات الاستقبال
        rep := pg_temp.rec(rep, 'g0 retrait des permissions de la réception (setup)', '^OK:1$',
            pg_temp.try(format('UPDATE public.gym_staff SET permissions=''{}''::jsonb WHERE user_id=%L AND gym_id=%L', v_rec, gA)));
        PERFORM pg_temp.login('reception@elitegym.mr');
        rep := pg_temp.rec(rep, 'g1 réception sans can_record_payments refusée', '^ERR:42501',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mA3, planA)));
        rep := pg_temp.rec(rep, 'g2 réception sans can_scan_qr refusée', '^ERR:42501',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-noperm', mA3)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'g3 restauration des permissions (setup)', '^OK:1$',
            pg_temp.try(format('UPDATE public.gym_staff SET permissions=''{"can_manage_members":true,"can_record_payments":true,"can_scan_qr":true}''::jsonb WHERE user_id=%L AND gym_id=%L', v_rec, gA)));
        PERFORM pg_temp.login('reception@elitegym.mr');
        v_res := pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mA3, planA));
        rep := pg_temp.rec(rep, 'g4 réception avec la permission peut encaisser', '^true$', (v_res !~ '^ERR:')::text);
        IF v_res !~ '^ERR:' THEN v_pay_rec := ((v_res::jsonb) ->> 'id')::uuid; END IF;
        rep := pg_temp.rec(rep, 'g5 réception ne peut pas annuler un paiement', '^ERR:42501',
            pg_temp.val(format('SELECT public.cancel_payment(%L,''tentative reception'')::text', v_pay_rec)));
        rep := pg_temp.rec(rep, 'g6 réception ne peut pas changer un prix', '^(OK:0|ERR:)',
            pg_temp.try(format('UPDATE public.plans SET price_mru=1 WHERE id=%L', planA)));
        rep := pg_temp.rec(rep, 'g7 réception ne peut pas créer un plan', '^ERR:',
            pg_temp.try(format('INSERT INTO public.plans(gym_id,name,duration_days,price_mru) VALUES (%L,''x'',30,1)', gA)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'g8 prix du plan inchangé', '^1500$', pg_temp.val(format('SELECT price_mru::text FROM public.plans WHERE id=%L', planA)));
        rep := pg_temp.rec(rep, 'g9 paiement de la réception toujours completed', '^completed$',
            pg_temp.val(format('SELECT status::text FROM public.payments WHERE id=%L', v_pay_rec)));

        -- (a) إعادة استخدام nonce + حالات الرفض الأخرى
        PERFORM pg_temp.login('reception@elitegym.mr');
        rep := pg_temp.rec(rep, 'a1 premier scan d''un nonce', '^\{',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-nonce-replay', mA2)));
        rep := pg_temp.rec(rep, 'a2 même nonce rejoué refusé (REPLAY)', '^ERR:23505',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-nonce-replay', mA2)));
        rep := pg_temp.rec(rep, 'a3 membre expiré refusé', '^ERR:P0001',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-nonce-expired', mExpired)));
        PERFORM pg_temp.logout();
        rep := pg_temp.rec(rep, 'a4 un seul enregistrement de visite pour le nonce rejoué', '^1$',
            pg_temp.val('SELECT count(*)::text FROM public.visits WHERE qr_nonce=''proof-nonce-replay'''));

        -- المنتسب (member) لا يملك صلاحيات الموظف
        PERFORM pg_temp.login('member@elitegym.mr');
        rep := pg_temp.rec(rep, 'm1 membre voit uniquement sa fiche', '^1$', pg_temp.val('SELECT count(*)::text FROM public.members'));
        rep := pg_temp.rec(rep, 'm2 membre ne voit aucun paiement d''un autre', '^0$',
            pg_temp.val(format('SELECT count(*)::text FROM public.payments WHERE member_id<>%L', mA1)));
        rep := pg_temp.rec(rep, 'm3 membre ne peut pas enregistrer un paiement', '^ERR:42501',
            pg_temp.val(format('SELECT public.record_payment(%L,%L,1500,''cash'')::text', mA1, planA)));
        rep := pg_temp.rec(rep, 'm4 membre ne peut pas scanner', '^ERR:42501',
            pg_temp.val(format('SELECT public.verify_and_record_visit(%L,%L,NULL)::text', 'proof-member', mA1)));
        PERFORM pg_temp.logout();

        RAISE EXCEPTION 'PROOF_ROLLBACK' USING ERRCODE = 'P9999';
    EXCEPTION
        WHEN SQLSTATE 'P9999' THEN NULL;
        WHEN OTHERS THEN
            rep := pg_temp.rec(rep, 'ERREUR SCRIPT (arrêt inattendu)', '^$', SQLSTATE || ': ' || SQLERRM);
    END;

    RETURN QUERY
    SELECT x ->> 't', x ->> 'e', x ->> 'g', CASE WHEN (x ->> 'p')::boolean THEN 'PASS' ELSE 'FAIL' END
    FROM jsonb_array_elements(rep) WITH ORDINALITY AS a(x, n) ORDER BY n;
END $f$;

SELECT * FROM pg_temp.run_proofs();
