-- ============================================================
-- Historique des demandes : confidentialité (politique) + dates de validation
-- ============================================================
-- Avant : « Read history of readable submissions » laissait lire l'historique de TOUTE demande lisible,
-- donc celui des demandes validées de toutes les équipes (décideur, dates, motifs).
-- Après : l'historique n'est lisible que par l'admin, le manager de l'équipe de la demande et son auteur.
-- Le bloc « Demandes validées » (accueil, « Par équipe ») n'a besoin que de la date de validation :
-- elle passe par une fonction qui ne renvoie rien d'autre (ni nom, ni e-mail, ni motif).
-- Dérogation à la règle « pas de migration après le 2026-11-02 » accordée par Julien le 2026-11-03.
-- À lancer ensuite : select * from private.run_smoke_tests();  (toutes les lignes ok = true)

DROP POLICY IF EXISTS "Read history of readable submissions" ON public.submission_status_history;

CREATE POLICY "Read history of readable submissions" ON public.submission_status_history
  FOR SELECT TO authenticated
  USING (
    private.is_allowed() AND EXISTS (
      SELECT 1
        FROM public.submissions s
       WHERE s.id = submission_status_history.submission_id
         AND (
           private.is_admin()
           OR (private.current_app_role() = 'manager'::public.app_role AND private.can_review_team(s.team))
           OR s.submitted_by_email = lower(auth.jwt() ->> 'email')
         )
    )
  );

-- Date de validation (la plus récente) de chaque demande actuellement validée, toutes équipes.
-- Mêmes demandes que celles que tout utilisateur connu peut déjà lire (statut « validée »).
CREATE OR REPLACE FUNCTION public.dates_validation_demandes()
RETURNS TABLE (submission_id uuid, validated_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT h.submission_id, max(h.changed_at) AS validated_at
    FROM public.submission_status_history h
    JOIN public.submissions s ON s.id = h.submission_id
   WHERE private.is_allowed()
     AND s.status = 'validée'::public.submission_status
     AND h.new_status = 'validée'::public.submission_status
   GROUP BY h.submission_id
$$;

REVOKE ALL ON FUNCTION public.dates_validation_demandes() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dates_validation_demandes() TO authenticated;

COMMENT ON FUNCTION public.dates_validation_demandes() IS
  'Date de validation (max changed_at) des demandes actuellement validées. Aucune autre colonne de l''historique n''est exposée.';

-- ============================================================
-- MIGRATION INVERSE (à lancer à la main dans le SQL Editor pour annuler ; ne fait pas partie de la migration)
-- Restaure la politique d'origine (20261006163825). Annuler SANS rétablir la lecture directe dans le code
-- n'est pas nécessaire : fetchValidatedSubmissions fonctionnerait aussi avec l'ancienne politique.
-- ============================================================
-- DROP FUNCTION IF EXISTS public.dates_validation_demandes();
-- DROP POLICY IF EXISTS "Read history of readable submissions" ON public.submission_status_history;
-- CREATE POLICY "Read history of readable submissions" ON public.submission_status_history
--   FOR SELECT TO authenticated
--   USING (private.is_allowed() AND EXISTS (
--     SELECT 1 FROM public.submissions s WHERE s.id = submission_id
--   ));
