-- US-46 : résumé hebdomadaire personnalisé. La fonction n'a PAS de droits élevés (SECURITY INVOKER) :
-- elle lit l'e-mail de la session en cours, donc elle ne voit que ce que le compte appelant a le droit de lire (RLS).
-- Le résumé de chaque compte est calculé en se plaçant sous son rôle (voir l'Edge Function digest-data).

CREATE OR REPLACE FUNCTION public.mon_resume_hebdo(p_depuis timestamptz DEFAULT (now() - interval '7 days'))
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  _email text := lower(auth.jwt() ->> 'email');
  _role public.app_role := private.current_app_role();
  _prenom text;
  _keys text[];
  _depart date;
  _res jsonb;
BEGIN
  IF _email IS NULL OR _role IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT u.first_name, u.home_metric_keys, u.departure_date
    INTO _prenom, _keys, _depart
    FROM public.allowed_users u WHERE u.email = _email;
  IF _depart IS NOT NULL AND _depart <= current_date THEN
    RETURN NULL;
  END IF;
  _keys := coalesce(_keys, ARRAY['training_kpi', 'active_users']);

  WITH perimetre AS (
    SELECT s.id, s.team, s.content, s.status, s.created_at
      FROM public.submissions s
     WHERE s.submitted_by_email IS DISTINCT FROM _email
       AND ((_role = 'manager' AND private.can_review_team(s.team))
         OR (_role = 'admin' AND NOT EXISTS (
               SELECT 1 FROM public.manager_teams mt WHERE lower(mt.team) = lower(s.team))))
  )
  SELECT jsonb_build_object(
    'email', _email, 'prenom', _prenom, 'role', _role::text, 'depuis', p_depuis, 'jusqua', now(),
    'mes_decisions', coalesce((
      SELECT jsonb_agg(jsonb_build_object('contenu', left(s.content, 140), 'statut', h.new_status::text,
               'motif', CASE WHEN h.new_status = 'refusée' THEN h.rejection_note END, 'date', h.changed_at)
             ORDER BY h.changed_at DESC)
        FROM public.submission_status_history h JOIN public.submissions s ON s.id = h.submission_id
       WHERE s.submitted_by_email = _email AND h.new_status IN ('validée', 'refusée') AND h.changed_at >= p_depuis), '[]'::jsonb),
    'validees_entreprise', coalesce((
      SELECT jsonb_agg(jsonb_build_object('contenu', left(s.content, 140), 'equipe', s.team, 'date', d.validated_at)
             ORDER BY d.validated_at DESC)
        FROM public.dates_validation_demandes() d JOIN public.submissions s ON s.id = d.submission_id
       WHERE s.status = 'validée' AND d.validated_at >= p_depuis AND s.submitted_by_email IS DISTINCT FROM _email), '[]'::jsonb),
    'actus', coalesce((
      SELECT jsonb_agg(jsonb_build_object('titre', n.title, 'extrait', left(n.body, 200), 'date', n.published_at)
             ORDER BY n.published_at DESC)
        FROM public.news n WHERE n.status = 'publiée' AND n.published_at >= p_depuis), '[]'::jsonb),
    'points_bloquants', coalesce((
      SELECT jsonb_agg(jsonb_build_object('titre', b.title, 'gravite', b.severity, 'de', h.old_status::text,
               'vers', h.new_status::text, 'date', h.changed_at)
             ORDER BY h.changed_at DESC)
        FROM public.blocker_status_history h JOIN public.blockers b ON b.id = h.blocker_id
       WHERE h.changed_at >= p_depuis), '[]'::jsonb),
    'indicateurs', coalesce((
      SELECT jsonb_agg(jsonb_build_object('cle', m.key, 'libelle', m.label, 'valeur', m.value, 'unite', m.unit,
               'avant', (SELECT mh.value FROM public.metrics_history mh
                          WHERE mh.metric_key = m.key AND mh.recorded_at < p_depuis ORDER BY mh.recorded_at DESC LIMIT 1),
               'mis_a_jour_cette_semaine', m.updated_at >= p_depuis, 'maj', m.updated_at)
             ORDER BY m.label)
        FROM public.metrics m WHERE m.key = ANY(_keys)), '[]'::jsonb),
    'a_traiter', CASE WHEN _role IN ('manager', 'admin') THEN jsonb_build_object(
      'nouvelles', coalesce((
        SELECT jsonb_agg(jsonb_build_object('contenu', left(p.content, 140), 'equipe', p.team, 'date', p.created_at)
               ORDER BY p.created_at DESC)
          FROM perimetre p WHERE p.created_at >= p_depuis), '[]'::jsonb),
      'changements', coalesce((
        SELECT jsonb_agg(jsonb_build_object('contenu', left(p.content, 140), 'equipe', p.team, 'de', h.old_status::text,
                 'vers', h.new_status::text, 'date', h.changed_at)
               ORDER BY h.changed_at DESC)
          FROM public.submission_status_history h JOIN perimetre p ON p.id = h.submission_id
         WHERE h.changed_at >= p_depuis AND h.old_status IS NOT NULL AND h.changed_by_email IS DISTINCT FROM _email), '[]'::jsonb),
      'en_attente', coalesce((
        SELECT jsonb_agg(jsonb_build_object('contenu', left(p.content, 140), 'equipe', p.team,
                 'depuis_jours', current_date - p.created_at::date)
               ORDER BY p.created_at)
          FROM perimetre p WHERE p.status = 'en attente'), '[]'::jsonb)
    ) END,
    'ouverts', jsonb_build_object(
      'mes_demandes_en_attente', coalesce((
        SELECT jsonb_agg(jsonb_build_object('contenu', left(s.content, 140), 'depuis_jours', current_date - s.created_at::date)
               ORDER BY s.created_at)
          FROM public.submissions s WHERE s.submitted_by_email = _email AND s.status = 'en attente'), '[]'::jsonb),
      'points_bloquants_non_resolus', coalesce((
        SELECT jsonb_agg(jsonb_build_object('titre', b.title, 'statut', b.status::text, 'depuis_jours', current_date - b.created_at::date)
               ORDER BY b.created_at)
          FROM public.blockers b WHERE b.status <> 'RÉSOLU'), '[]'::jsonb),
      'indicateurs_perimes', coalesce((
        SELECT jsonb_agg(m.label ORDER BY m.label)
          FROM public.metrics m WHERE m.key = ANY(_keys) AND m.updated_at < now() - interval '14 days'), '[]'::jsonb))
  ) INTO _res FROM (SELECT 1) x;

  RETURN _res;
END
$function$;

REVOKE ALL ON FUNCTION public.mon_resume_hebdo(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mon_resume_hebdo(timestamptz) TO authenticated, service_role;

-- Retour arrière (à ne lancer que par une nouvelle migration) :
-- DROP FUNCTION IF EXISTS public.mon_resume_hebdo(timestamptz);
