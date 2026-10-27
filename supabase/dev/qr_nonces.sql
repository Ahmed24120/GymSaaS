-- ==============================================================================
-- GymSaaS — Anti-Replay Nonce Persistence & Cleanup (Serverless Safe)
-- Fichier : supabase/dev/qr_nonces.sql
-- Stockage persistant dans PostgreSQL (remplace tout cache en mémoire éphémère de Vercel)
-- RLS activée, insertion unique sur nonce, purge automatique des nonces > 10 min
-- ==============================================================================

-- 1. Table qr_nonces (clé primaire sur nonce garantissant l'unicité stricte)
CREATE TABLE IF NOT EXISTS public.qr_nonces (
    nonce TEXT PRIMARY KEY,
    gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Index pour accélérer la recherche et la purge
CREATE INDEX IF NOT EXISTS idx_qr_nonces_used_at ON public.qr_nonces(used_at);
CREATE INDEX IF NOT EXISTS idx_qr_nonces_gym_id ON public.qr_nonces(gym_id);

-- 3. Activation du Row Level Security (RLS)
ALTER TABLE public.qr_nonces ENABLE ROW LEVEL SECURITY;

-- 4. Politique de sécurité : le personnel de la salle peut insérer et vérifier les nonces
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'qr_nonces' AND policyname = 'qr_nonces_staff_access'
    ) THEN
        CREATE POLICY "qr_nonces_staff_access" ON public.qr_nonces
            FOR ALL TO authenticated
            USING (public.is_gym_staff(gym_id))
            WITH CHECK (public.is_gym_staff(gym_id));
    END IF;
END $$;

-- 5. Fonction de purge automatique des nonces expirés (> 10 minutes)
-- Comme le QR expire au bout de 30 secondes, tout nonce de plus de 10 minutes
-- ne peut plus jamais être réutilisé même sans nonce check.
CREATE OR REPLACE FUNCTION public.purge_expired_qr_nonces()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.qr_nonces
    WHERE used_at < (timezone('utc'::text, now()) - INTERVAL '10 minutes');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Déclencheur (Trigger) exécutant la purge après chaque batch d'insertion
DROP TRIGGER IF EXISTS trg_purge_expired_qr_nonces ON public.qr_nonces;
CREATE TRIGGER trg_purge_expired_qr_nonces
    AFTER INSERT ON public.qr_nonces
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.purge_expired_qr_nonces();
