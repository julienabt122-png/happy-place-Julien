-- ============================================================
-- Indicateurs : périmètre et définition saisis en base
-- ============================================================
-- Dérogation à la règle « pas de migration après le 2026-11-02 » accordée par Julien le 2026-11-03.
-- Appliquée le 2026-11-03 (tests de fumée 13/13 avant et après).
-- Ajoute scope (entreprise ou individuel) et definition (texte facultatif de 1 à 400 caractères) à
-- public.metrics, reprend les 8 définitions d'origine, et étend la vue metrics_with_trend.

ALTER TABLE public.metrics
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'entreprise',
  ADD COLUMN IF NOT EXISTS definition text;

ALTER TABLE public.metrics
  ADD CONSTRAINT metrics_scope_check CHECK (scope IN ('entreprise', 'individuel')),
  ADD CONSTRAINT metrics_definition_len CHECK (definition IS NULL OR char_length(definition) BETWEEN 1 AND 400);

UPDATE public.metrics m
   SET definition = v.definition
  FROM (VALUES
    ('training_kpi',   'Part des candidats présentés à un client qui ont été embauchés.'),
    ('active_users',   'Nombre de missions de recrutement en cours de traitement.'),
    ('engagement',     'Part des offres faites aux candidats qui sont acceptées.'),
    ('absenteeism',    'Part des candidats contactés qui répondent à la sollicitation.'),
    ('nps',            'Score de recommandation donné par les candidats à l''issue du processus : part de ceux qui recommanderaient le cabinet moins part de ceux qui ne le recommanderaient pas.'),
    ('open_positions', 'Nombre de postes confiés par les clients et pas encore pourvus.'),
    ('training_hours', 'Nombre d''entretiens réalisés avec des candidats.'),
    ('turnover',       'Nombre moyen de jours entre l''ouverture d''un poste et l''embauche.')
  ) AS v(key, definition)
 WHERE m.key = v.key AND m.definition IS NULL;

CREATE OR REPLACE VIEW public.metrics_with_trend WITH (security_invoker = true) AS
 SELECT m.key, m.label, m.value, m.unit, m.updated_at,
        p.value AS previous_value,
        CASE
          WHEN p.value IS NULL OR p.value = m.value THEN 'stable'::text
          WHEN m.value > p.value THEN 'hausse'::text
          ELSE 'baisse'::text
        END AS trend,
        CASE WHEN p.value IS NULL THEN NULL::numeric ELSE m.value - p.value END AS delta,
        m.scope,
        m.definition
   FROM public.metrics m
   LEFT JOIN LATERAL (SELECT h.value FROM public.metrics_history h
                       WHERE h.metric_key = m.key
                       ORDER BY h.recorded_at DESC OFFSET 1 LIMIT 1) p ON true;

-- ============================================================
-- MIGRATION INVERSE (à lancer à la main dans le SQL Editor pour annuler ; ne fait pas partie de la migration)
-- Recrée la vue d'origine (celle de 20261006162220), sans scope ni definition, puis retire les colonnes.
-- ============================================================
-- DROP VIEW public.metrics_with_trend;
-- CREATE VIEW public.metrics_with_trend WITH (security_invoker = true) AS
-- SELECT m.key,
--     m.label,
--     m.value,
--     m.unit,
--     m.updated_at,
--     p.value AS previous_value,
--     CASE
--         WHEN p.value IS NULL OR p.value = m.value THEN 'stable'::text
--         WHEN m.value > p.value THEN 'hausse'::text
--         ELSE 'baisse'::text
--     END AS trend,
--     CASE WHEN p.value IS NULL THEN NULL ELSE m.value - p.value END AS delta
-- FROM public.metrics m
-- LEFT JOIN LATERAL (
--     SELECT h.value
--     FROM public.metrics_history h
--     WHERE h.metric_key = m.key
--     ORDER BY h.recorded_at DESC
--     OFFSET 1
--     LIMIT 1
-- ) p ON true;
-- GRANT SELECT ON public.metrics_with_trend TO authenticated;
-- ALTER TABLE public.metrics
--   DROP CONSTRAINT metrics_definition_len,
--   DROP CONSTRAINT metrics_scope_check,
--   DROP COLUMN definition,
--   DROP COLUMN scope;
