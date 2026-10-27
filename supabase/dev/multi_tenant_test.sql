-- ==============================================================================
-- GymSaaS — Test d'Isolation Multi-Salles (Multi-Tenant RLS Test)
-- Fichier : supabase/dev/multi_tenant_test.sql
-- Démontre l'isolation stricte entre la Salle A (Elite Gym) et la Salle B (Champion Gym)
-- ==============================================================================

DO $$
DECLARE
    v_gym_a UUID := 'a0000000-0000-0000-0000-000000000001';
    v_gym_b UUID := 'a0000000-0000-0000-0000-000000000002';
    v_branch_b UUID := 'b0000000-0000-0000-0000-000000000002';
    v_member_b UUID := 'd0000000-0000-0000-0000-000000000099';
BEGIN
    -- 1. Créer la Salle B si elle n'existe pas
    INSERT INTO public.gyms (id, name, slug, phone, currency)
    VALUES (v_gym_b, 'صالة البطل — لكصر', 'champion-gym-ksar', '+222 45 99 99 99', 'MRU')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Créer une succursale pour la Salle B
    INSERT INTO public.branches (id, gym_id, name, is_main)
    VALUES (v_branch_b, v_gym_b, 'فرع لكصر الرئيسي', true)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insérer un adhérent appartenant exclusivement à la Salle B
    INSERT INTO public.members (id, gym_id, branch_id, full_name, phone, status, notes)
    VALUES (v_member_b, v_gym_b, v_branch_b, 'سيدي ولد حبيب الله (صالة لكصر)', '49998877', 'active', 'TEST_ISOLATION_B')
    ON CONFLICT (id) DO NOTHING;
END $$;

-- ==============================================================================
-- Requêtes de vérification d'isolation RLS (à exécuter dans Supabase SQL Editor) :
-- ==============================================================================
-- 1. En tant que personnel de la Salle A (owner@elitegym.mr) :
--    SELECT id, full_name, gym_id FROM public.members WHERE notes = 'TEST_ISOLATION_B';
--    --> RÉSULTAT ATTENDU : 0 lignes retournées (bloqué par la politique RLS is_gym_staff).

-- 2. Vérification directe des politiques actives :
--    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
--    FROM pg_policies
--    WHERE tablename IN ('members', 'payments', 'subscriptions', 'visits', 'qr_nonces')
--    ORDER BY tablename;
--    --> Toutes les tables exigent public.is_gym_staff(gym_id) = true.
