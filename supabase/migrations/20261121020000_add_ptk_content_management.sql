
-- =====================================================
-- PTK : GESTION DU CONTENU DU SITE
-- Présentations, objectifs, modules et domaines
-- =====================================================


-- 1. TABLE DES CONTENUS DES PAGES

CREATE TABLE public.contenus_pages (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    page TEXT NOT NULL CHECK (
        page IN ('camp_technologique', 'formations_numeriques')
    ),

    cle TEXT NOT NULL UNIQUE,
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,

    ordre INTEGER NOT NULL DEFAULT 0,
    est_publie BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 2. TABLE DES ELEMENTS DES PROGRAMMES

CREATE TABLE public.elements_programme (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    programme TEXT NOT NULL CHECK (
        programme IN (
            'camp_technologique',
            'formation_numerique',
            'commun'
        )
    ),

    type_element TEXT NOT NULL CHECK (
        type_element IN (
            'objectif',
            'module',
            'domaine',
            'pedagogie'
        )
    ),

    titre TEXT NOT NULL,
    description TEXT NOT NULL,

    icone TEXT,
    ordre INTEGER NOT NULL DEFAULT 0,
    est_publie BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 3. INDEX POUR LES RECHERCHES

CREATE INDEX contenus_pages_page_index
ON public.contenus_pages(page);

CREATE INDEX elements_programme_type_index
ON public.elements_programme(programme, type_element);


-- 4. MISE A JOUR AUTOMATIQUE DES DATES

CREATE TRIGGER contenus_pages_updated_at
BEFORE UPDATE ON public.contenus_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER elements_programme_updated_at
BEFORE UPDATE ON public.elements_programme
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();


-- 5. ACTIVATION DE LA SECURITE RLS

ALTER TABLE public.contenus_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elements_programme ENABLE ROW LEVEL SECURITY;


-- 6. LECTURE DES CONTENUS PUBLIES

CREATE POLICY "Lecture des contenus publies"
ON public.contenus_pages
FOR SELECT
TO anon, authenticated
USING (
    est_publie = TRUE
    OR public.is_ptk_president()
);

CREATE POLICY "Lecture des elements publies"
ON public.elements_programme
FOR SELECT
TO anon, authenticated
USING (
    est_publie = TRUE
    OR public.is_ptk_president()
);


-- 7. GESTION RESERVEE AU PRESIDENT

CREATE POLICY "President gere les contenus"
ON public.contenus_pages
FOR ALL
TO authenticated
USING (public.is_ptk_president())
WITH CHECK (public.is_ptk_president());

CREATE POLICY "President gere les elements"
ON public.elements_programme
FOR ALL
TO authenticated
USING (public.is_ptk_president())
WITH CHECK (public.is_ptk_president());


-- 8. AUTORISATIONS SQL

GRANT SELECT ON public.contenus_pages
TO anon, authenticated;

GRANT SELECT ON public.elements_programme
TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.contenus_pages
TO authenticated;

GRANT INSERT, UPDATE, DELETE
ON public.elements_programme
TO authenticated;

GRANT USAGE, SELECT
ON SEQUENCE public.contenus_pages_id_seq
TO authenticated;

GRANT USAGE, SELECT
ON SEQUENCE public.elements_programme_id_seq
TO authenticated;


-- 9. CORRECTION DE LA LECTURE DES ADMINISTRATEURS

GRANT SELECT ON public.admin_users
TO authenticated;


-- FIN DE LA MIGRATION
