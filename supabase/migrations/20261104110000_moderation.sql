-- ============================================================
-- Modération (admins uniquement) : masquer, réafficher, supprimer définitivement
-- ============================================================
-- Éléments concernés : demandes (submissions), actualités (news), points bloquants (blockers).
-- Un élément masqué n'est visible que par les admins, partout : écrans, résumés, documents de départ.
-- Toute action est tracée dans moderation_journal. La suppression définitive n'est possible
-- que pour un élément déjà masqué (deux temps).

-- 1. Colonnes de masquage
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS masque_le timestamptz,
  ADD COLUMN IF NOT EXISTS masque_par text,
  ADD COLUMN IF NOT EXISTS masque_motif text;
ALTER TABLE public.news
  ADD COLUMN IF NOT EXISTS masque_le timestamptz,
  ADD COLUMN IF NOT EXISTS masque_par text,
  ADD COLUMN IF NOT EXISTS masque_motif text;
ALTER TABLE public.blockers
  ADD COLUMN IF NOT EXISTS masque_le timestamptz,
  ADD COLUMN IF NOT EXISTS masque_par text,
  ADD COLUMN IF NOT EXISTS masque_motif text;

-- 2. Journal de modération (lecture admin ; écriture uniquement par les fonctions ci-dessous)
CREATE TABLE IF NOT EXISTS public.moderation_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('masquer', 'reafficher', 'supprimer')),
  type_element text NOT NULL CHECK (type_element IN ('demande', 'actualite', 'point_bloquant')),
  element_id uuid NOT NULL,
  libelle text,
  motif text,
  auteur_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_journal ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.moderation_journal FROM anon, authenticated;
DROP POLICY IF EXISTS "Admins lisent le journal de modération" ON public.moderation_journal;
CREATE POLICY "Admins lisent le journal de modération" ON public.moderation_journal
  FOR SELECT TO authenticated USING (private.is_admin());

-- 3. Règles de lecture : un élément masqué n'est visible que par les admins
DROP POLICY IF EXISTS "Allowed read submissions" ON public.submissions;
CREATE POLICY "Allowed read submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    private.is_allowed()
    AND (masque_le IS NULL OR private.is_admin())
    AND (
      private.is_admin()
      OR ((private.current_app_role() = 'manager'::app_role) AND private.can_review_team(team))
      OR (submitted_by_email = lower((auth.jwt() ->> 'email'::text)))
      OR (status = 'validée'::submission_status)
    )
  );

DROP POLICY IF EXISTS "Managers review assigned submissions" ON public.submissions;
CREATE POLICY "Managers review assigned submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    (private.current_app_role() = 'manager'::app_role)
    AND private.can_review_team(team)
    AND (status = 'en attente'::submission_status)
    AND masque_le IS NULL
  );

DROP POLICY IF EXISTS "Allowed read published news" ON public.news;
CREATE POLICY "Allowed read published news" ON public.news
  FOR SELECT TO authenticated
  USING (
    private.is_allowed()
    AND (masque_le IS NULL OR private.is_admin())
    AND (
      (status = 'publiée'::news_status)
      OR private.is_admin()
      OR ((private.current_app_role() = 'manager'::app_role) AND (author_email = lower((auth.jwt() ->> 'email'::text))))
    )
  );

DROP POLICY IF EXISTS "Manager update own draft news" ON public.news;
CREATE POLICY "Manager update own draft news" ON public.news
  FOR UPDATE TO authenticated
  USING (
    (private.current_app_role() = 'manager'::app_role)
    AND (status = 'brouillon'::news_status)
    AND (author_email = lower((auth.jwt() ->> 'email'::text)))
    AND masque_le IS NULL
  );

DROP POLICY IF EXISTS "Manager update own published news" ON public.news;
CREATE POLICY "Manager update own published news" ON public.news
  FOR UPDATE TO authenticated
  USING (
    (private.current_app_role() = 'manager'::app_role)
    AND (status = 'publiée'::news_status)
    AND (author_email = lower((auth.jwt() ->> 'email'::text)))
    AND masque_le IS NULL
  );

DROP POLICY IF EXISTS "Allowed read" ON public.blockers;
CREATE POLICY "Allowed read" ON public.blockers
  FOR SELECT TO authenticated
  USING (private.is_allowed() AND (masque_le IS NULL OR private.is_admin()));

DROP POLICY IF EXISTS "Read history of blockers" ON public.blocker_status_history;
CREATE POLICY "Read history of blockers" ON public.blocker_status_history
  FOR SELECT TO authenticated
  USING (
    private.is_allowed()
    AND (
      private.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.blockers b
         WHERE b.id = blocker_status_history.blocker_id AND b.masque_le IS NULL
      )
    )
  );

-- 4. Fonctions qui lisent sans passer par les règles : elles excluent aussi les éléments masqués
CREATE OR REPLACE FUNCTION public.dates_validation_demandes()
RETURNS TABLE(submission_id uuid, validated_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT h.submission_id, max(h.changed_at) AS validated_at
    FROM public.submission_status_history h
    JOIN public.submissions s ON s.id = h.submission_id
   WHERE private.is_allowed()
     AND s.status = 'validée'::public.submission_status
     AND h.new_status = 'validée'::public.submission_status
     AND (s.masque_le IS NULL OR private.is_admin())
   GROUP BY h.submission_id
$$;

CREATE OR REPLACE FUNCTION private.departure_documents(_email text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'submission_id', s.id, 'path', s.attachment_path, 'name', s.attachment_name,
           'created_at', s.created_at, 'excerpt', left(s.content, 60)) ORDER BY s.created_at), '[]'::jsonb)
  FROM public.submissions s
  WHERE lower(s.submitted_by_email) = lower(_email)
    AND s.attachment_path IS NOT NULL
    AND (s.masque_le IS NULL OR private.is_admin())
$$;

-- 5. Actions de modération (admins uniquement)
CREATE OR REPLACE FUNCTION public.masquer_element(_type text, _id uuid, _motif text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _libelle text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Réservé aux admins.' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(_motif, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Indique un motif pour masquer cet élément.';
  END IF;
  IF _type = 'demande' THEN
    UPDATE public.submissions SET masque_le = now(), masque_par = _email, masque_motif = _motif
     WHERE id = _id AND masque_le IS NULL
    RETURNING left(content, 80) INTO _libelle;
  ELSIF _type = 'actualite' THEN
    UPDATE public.news SET masque_le = now(), masque_par = _email, masque_motif = _motif
     WHERE id = _id AND masque_le IS NULL
    RETURNING title INTO _libelle;
  ELSIF _type = 'point_bloquant' THEN
    UPDATE public.blockers SET masque_le = now(), masque_par = _email, masque_motif = _motif
     WHERE id = _id AND masque_le IS NULL
    RETURNING title INTO _libelle;
  ELSE
    RAISE EXCEPTION 'Type d''élément inconnu.';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Élément introuvable ou déjà masqué.';
  END IF;
  INSERT INTO public.moderation_journal (action, type_element, element_id, libelle, motif, auteur_email)
  VALUES ('masquer', _type, _id, _libelle, _motif, _email);
END;
$$;

CREATE OR REPLACE FUNCTION public.reafficher_element(_type text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _libelle text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Réservé aux admins.' USING ERRCODE = '42501';
  END IF;
  IF _type = 'demande' THEN
    UPDATE public.submissions SET masque_le = NULL, masque_par = NULL, masque_motif = NULL
     WHERE id = _id AND masque_le IS NOT NULL
    RETURNING left(content, 80) INTO _libelle;
  ELSIF _type = 'actualite' THEN
    UPDATE public.news SET masque_le = NULL, masque_par = NULL, masque_motif = NULL
     WHERE id = _id AND masque_le IS NOT NULL
    RETURNING title INTO _libelle;
  ELSIF _type = 'point_bloquant' THEN
    UPDATE public.blockers SET masque_le = NULL, masque_par = NULL, masque_motif = NULL
     WHERE id = _id AND masque_le IS NOT NULL
    RETURNING title INTO _libelle;
  ELSE
    RAISE EXCEPTION 'Type d''élément inconnu.';
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Élément introuvable ou non masqué.';
  END IF;
  INSERT INTO public.moderation_journal (action, type_element, element_id, libelle, auteur_email)
  VALUES ('reafficher', _type, _id, _libelle, _email);
END;
$$;

-- Suppression définitive : seulement pour un élément déjà masqué. Les historiques partent avec (cascade).
-- Les pièces jointes des demandes passent par la file de suppression existante.
-- Les images d'actualité sont supprimées par l'application avant l'appel (règle du projet).
CREATE OR REPLACE FUNCTION public.supprimer_definitivement(_type text, _id uuid, _motif text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _libelle text;
  _piece text;
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Réservé aux admins.' USING ERRCODE = '42501';
  END IF;
  IF nullif(btrim(coalesce(_motif, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Indique un motif pour supprimer cet élément.';
  END IF;
  IF _type = 'demande' THEN
    SELECT left(content, 80), attachment_path INTO _libelle, _piece
      FROM public.submissions WHERE id = _id AND masque_le IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Masque d''abord la demande avant de la supprimer.';
    END IF;
    IF _piece IS NOT NULL THEN
      INSERT INTO public.attachment_deletion_queue (path, delete_after)
      VALUES (_piece, now())
      ON CONFLICT (path) DO NOTHING;
    END IF;
    DELETE FROM public.submissions WHERE id = _id;
  ELSIF _type = 'actualite' THEN
    SELECT title INTO _libelle FROM public.news WHERE id = _id AND masque_le IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Masque d''abord l''actualité avant de la supprimer.';
    END IF;
    DELETE FROM public.news WHERE id = _id;
  ELSIF _type = 'point_bloquant' THEN
    SELECT title INTO _libelle FROM public.blockers WHERE id = _id AND masque_le IS NOT NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Masque d''abord le point bloquant avant de le supprimer.';
    END IF;
    DELETE FROM public.blockers WHERE id = _id;
  ELSE
    RAISE EXCEPTION 'Type d''élément inconnu.';
  END IF;
  INSERT INTO public.moderation_journal (action, type_element, element_id, libelle, motif, auteur_email)
  VALUES ('supprimer', _type, _id, _libelle, _motif, _email);
END;
$$;

REVOKE ALL ON FUNCTION public.masquer_element(text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.masquer_element(text, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.reafficher_element(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reafficher_element(text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.supprimer_definitivement(text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.supprimer_definitivement(text, uuid, text) TO authenticated;
