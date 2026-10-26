-- ==============================================================================
-- GymSaaS — Demo Data Cleanup Script
-- Safely deletes ONLY rows created by demo_data.sql. Leaves all production, seed,
-- and user data completely untouched!
-- ==============================================================================

DO $$
BEGIN
    -- 1. Delete Demo Visits
    DELETE FROM public.visits
    WHERE member_id IN (
        SELECT id FROM public.members WHERE notes = 'DEMO_SEED'
    );

    -- 2. Delete Demo Payments
    DELETE FROM public.payments
    WHERE transaction_ref LIKE 'TX-DEMO-%'
       OR transaction_ref = 'TX-CANCELLED-001'
       OR id BETWEEN 'f0000000-0000-0000-0000-000000000001' AND 'f0000000-0000-0000-0000-000000000040';

    -- 3. Delete Demo Subscriptions
    DELETE FROM public.subscriptions
    WHERE id BETWEEN 'e0000000-0000-0000-0000-000000000001' AND 'e0000000-0000-0000-0000-000000000040'
       OR member_id IN (SELECT id FROM public.members WHERE notes = 'DEMO_SEED');

    -- 4. Delete Demo Members
    DELETE FROM public.members
    WHERE notes = 'DEMO_SEED'
       OR id BETWEEN 'd0000000-0000-0000-0000-000000000001' AND 'd0000000-0000-0000-0000-000000000040';

END $$;
