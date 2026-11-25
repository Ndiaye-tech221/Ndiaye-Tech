
-- =====================================================
-- PASSERELLE TECH KEDOUGOU (PTK)
-- Base de donnees : activites et inscriptions
-- =====================================================


-- 1. TABLE DES ADMINISTRATEURS
-- Seul le president sera autorise a administrer le systeme.

CREATE TABLE public.admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'president'
        CHECK (role = 'president'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. FONCTION DE VERIFICATION DU PRESIDENT

CREATE OR REPLACE FUNCTION public.is_ptk_president()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.admin_users
        WHERE user_id = (SELECT auth.uid())
          AND role = 'president'
    );
$$;


-- 3. TABLE DES ACTIVITES PTK
-- Camp technologique et formations numeriques.

CREATE TABLE public.formations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nom TEXT NOT NULL,
    description TEXT,

    type TEXT NOT NULL CHECK (
        type IN ('camp_technologique', 'formation_numerique')
    ),

    prix_cfa INTEGER NOT NULL DEFAULT 0
        CHECK (prix_cfa >= 0),

    date_debut DATE,
    date_fin DATE,

    date_ouverture_inscriptions DATE,
    date_cloture_inscriptions DATE,

    nombre_places INTEGER
        CHECK (nombre_places IS NULL OR nombre_places > 0),

    statut_activite TEXT NOT NULL DEFAULT 'planifiee'
        CHECK (
            statut_activite IN (
                'planifiee',
                'en_cours',
                'terminee',
                'annulee'
            )
        ),

    statut_inscriptions TEXT NOT NULL DEFAULT 'non_ouvertes'
        CHECK (
            statut_inscriptions IN (
                'non_ouvertes',
                'ouvertes',
                'fermees'
            )
        ),

    est_publiee BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (
        date_debut IS NULL
        OR date_fin IS NULL
        OR date_fin >= date_debut
    ),

    CHECK (
        date_ouverture_inscriptions IS NULL
        OR date_cloture_inscriptions IS NULL
        OR date_cloture_inscriptions >= date_ouverture_inscriptions
    ),

    CHECK (
        type <> 'camp_technologique'
        OR prix_cfa = 0
    )
);


-- 4. TABLE DES INSCRIPTIONS

CREATE TABLE public.inscriptions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    formation_id BIGINT NOT NULL
        REFERENCES public.formations(id) ON DELETE RESTRICT,

    nom_complet TEXT NOT NULL
        CHECK (char_length(trim(nom_complet)) >= 3),

    email TEXT NOT NULL
        CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),

    telephone TEXT NOT NULL,

    message TEXT,

    statut TEXT NOT NULL DEFAULT 'en_attente'
        CHECK (
            statut IN (
                'en_attente',
                'acceptee',
                'refusee',
                'annulee'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 5. EVITER LES DOUBLONS
-- Une meme adresse email ne peut s'inscrire deux fois
-- a la meme activite.

CREATE UNIQUE INDEX inscriptions_email_formation_unique
ON public.inscriptions (formation_id, LOWER(email));


-- 6. INDEX POUR ACCELERER LES RECHERCHES

CREATE INDEX formations_type_index
ON public.formations(type);

CREATE INDEX formations_statut_index
ON public.formations(statut_inscriptions);

CREATE INDEX inscriptions_formation_index
ON public.inscriptions(formation_id);

CREATE INDEX inscriptions_statut_index
ON public.inscriptions(statut);


-- 7. MISE A JOUR AUTOMATIQUE DE updated_at

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER formations_updated_at
BEFORE UPDATE ON public.formations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


-- 8. CONTROLE DES INSCRIPTIONS
-- Verifie que les inscriptions sont ouvertes
-- et qu'il reste des places.

CREATE OR REPLACE FUNCTION public.verifier_inscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    activite RECORD;
    total_inscriptions INTEGER;
BEGIN

    SELECT *
    INTO activite
    FROM public.formations
    WHERE id = NEW.formation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cette activite n existe pas.';
    END IF;

    IF activite.est_publiee = FALSE THEN
        RAISE EXCEPTION 'Cette activite n est pas disponible.';
    END IF;

    IF activite.statut_inscriptions <> 'ouvertes' THEN
        RAISE EXCEPTION 'Les inscriptions sont fermees.';
    END IF;

    IF activite.date_ouverture_inscriptions IS NOT NULL
       AND CURRENT_DATE < activite.date_ouverture_inscriptions THEN
        RAISE EXCEPTION 'Les inscriptions ne sont pas encore ouvertes.';
    END IF;

    IF activite.date_cloture_inscriptions IS NOT NULL
       AND CURRENT_DATE > activite.date_cloture_inscriptions THEN
        RAISE EXCEPTION 'La periode d inscription est terminee.';
    END IF;

    IF activite.nombre_places IS NOT NULL THEN

        SELECT COUNT(*)::INTEGER
        INTO total_inscriptions
        FROM public.inscriptions
        WHERE formation_id = NEW.formation_id
          AND statut <> 'annulee';

        IF total_inscriptions >= activite.nombre_places THEN
            RAISE EXCEPTION 'Toutes les places sont reservees.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER verifier_inscription_avant_creation
BEFORE INSERT ON public.inscriptions
FOR EACH ROW
EXECUTE FUNCTION public.verifier_inscription();


-- 9. ACTIVATION DE LA SECURITE RLS

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscriptions ENABLE ROW LEVEL SECURITY;


-- 10. POLITIQUES DE SECURITE : ADMINISTRATEURS

CREATE POLICY "President gere les activites"
ON public.formations
FOR ALL
TO authenticated
USING (public.is_ptk_president())
WITH CHECK (public.is_ptk_president());


CREATE POLICY "President consulte les administrateurs"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.is_ptk_president());


-- 11. POLITIQUES DE SECURITE : ACTIVITES PUBLIQUES

CREATE POLICY "Visiteurs consultent les activites publiees"
ON public.formations
FOR SELECT
TO anon, authenticated
USING (
    est_publiee = TRUE
    OR public.is_ptk_president()
);


-- 12. POLITIQUES DE SECURITE : INSCRIPTIONS

CREATE POLICY "Visiteurs peuvent s inscrire"
ON public.inscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.formations f
        WHERE f.id = formation_id
          AND f.est_publiee = TRUE
          AND f.statut_inscriptions = 'ouvertes'
          AND (
              f.date_ouverture_inscriptions IS NULL
              OR CURRENT_DATE >= f.date_ouverture_inscriptions
          )
          AND (
              f.date_cloture_inscriptions IS NULL
              OR CURRENT_DATE <= f.date_cloture_inscriptions
          )
    )
);


CREATE POLICY "President consulte les inscriptions"
ON public.inscriptions
FOR SELECT
TO authenticated
USING (public.is_ptk_president());


CREATE POLICY "President modifie les inscriptions"
ON public.inscriptions
FOR UPDATE
TO authenticated
USING (public.is_ptk_president())
WITH CHECK (public.is_ptk_president());


CREATE POLICY "President supprime les inscriptions"
ON public.inscriptions
FOR DELETE
TO authenticated
USING (public.is_ptk_president());


-- 13. AUTORISATIONS D ACCES

GRANT EXECUTE ON FUNCTION public.is_ptk_president()
TO authenticated;

GRANT SELECT ON public.formations TO anon, authenticated;

GRANT INSERT ON public.inscriptions TO authenticated;
GRANT INSERT (
    formation_id,
    nom_complet,
    email,
    telephone,
    message
) ON public.inscriptions TO anon;

GRANT SELECT, UPDATE, DELETE
ON public.inscriptions TO authenticated;

GRANT USAGE, SELECT
ON SEQUENCE public.inscriptions_id_seq
TO anon, authenticated;

GRANT USAGE, SELECT
ON SEQUENCE public.formations_id_seq
TO authenticated;

REVOKE ALL ON public.admin_users FROM anon, authenticated;


-- =====================================================
-- 14. CORRECTION DES PERMISSIONS
-- =====================================================

-- Le president peut creer, modifier et supprimer les activites.
GRANT INSERT, UPDATE, DELETE
ON public.formations
TO authenticated;

-- Les visiteurs ne peuvent envoyer que les informations
-- necessaires a une inscription.
REVOKE INSERT ON public.inscriptions FROM authenticated;

GRANT INSERT (
    formation_id,
    nom_complet,
    email,
    telephone,
    message
)
ON public.inscriptions
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_ptk_president() TO anon, authenticated;

-- FIN DU SCHEMA INITIAL PTK
