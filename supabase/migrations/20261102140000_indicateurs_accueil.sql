-- ============================================================
-- Choix des indicateurs de l'accueil, par utilisateur
-- ============================================================
-- allowed_users est le profil de l'utilisateur. On y ajoute la liste ordonnée des clés
-- d'indicateurs (public.metrics.key) qu'il veut voir sur son accueil, et une fonction pour
-- l'enregistrer. NULL = affichage par défaut (training_kpi et active_users).
-- Migration additive : rien n'est modifié ni supprimé. La lecture de sa propre ligne passe par la
-- politique existante « Users see own entry » ; aucune politique nouvelle. L'écriture directe reste
-- réservée aux admins (« Admins manage whitelist ») ; seule la fonction ci-dessous permet à une
-- personne d'enregistrer son propre choix.
-- À lancer ensuite : select * from private.run_smoke_tests();  (toutes les lignes ok = true)

ALTER TABLE public.allowed_users
  ADD COLUMN IF NOT EXISTS home_metric_keys text[];

-- Garde-fou contre une écriture directe d'un admin : au plus 4 indicateurs, au moins 1 si renseigné.
-- (L'existence des clés dans public.metrics est vérifiée par la fonction ; Postgres ne sait pas
-- poser une clé étrangère sur un tableau.)
ALTER TABLE public.allowed_users
  ADD CONSTRAINT allowed_users_home_metric_keys_len
  CHECK (home_metric_keys IS NULL OR cardinality(home_metric_keys) BETWEEN 1 AND 4);

CREATE OR REPLACE FUNCTION public.definir_mes_indicateurs(_keys text[])
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _clean text[];
  _unknown text;
  _saved text[];
BEGIN
  IF _uid IS NULL AND _email IS NULL THEN
    RAISE EXCEPTION 'Session introuvable : recharge la page.' USING ERRCODE = '42501';
  END IF;

  -- Compte anonyme : l'adresse interne est lue dans auth.users (comme marquer_accueil_vu)
  IF _email IS NULL THEN
    SELECT lower(u.email) INTO _email FROM auth.users u WHERE u.id = _uid;
  END IF;

  IF _email IS NULL OR _email = '' THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  -- Garde-fou de taille avant tout traitement
  IF cardinality(_keys) > 50 THEN
    RAISE EXCEPTION 'Trop d''indicateurs sélectionnés.' USING ERRCODE = '22023';
  END IF;

  -- Clés nettoyées : espaces retirés, valeurs vides et doublons supprimés, ordre choisi conservé
  -- (première occurrence de chaque clé). Un tableau NULL donne une liste vide.
  SELECT coalesce(array_agg(t.k ORDER BY t.pos), '{}'::text[])
    INTO _clean
    FROM (
      SELECT s.k, min(s.ord) AS pos
        FROM (
          SELECT nullif(btrim(x.v), '') AS k, x.ord
            FROM unnest(_keys) WITH ORDINALITY AS x(v, ord)
        ) s
       WHERE s.k IS NOT NULL
       GROUP BY s.k
    ) t;

  IF cardinality(_clean) NOT BETWEEN 1 AND 4 THEN
    RAISE EXCEPTION 'Choisis entre 1 et 4 indicateurs.' USING ERRCODE = '22023';
  END IF;

  -- Chaque clé doit exister dans public.metrics
  SELECT c.k INTO _unknown
    FROM unnest(_clean) WITH ORDINALITY AS c(k, ord)
   WHERE NOT EXISTS (SELECT 1 FROM public.metrics m WHERE m.key = c.k)
   ORDER BY c.ord
   LIMIT 1;
  IF _unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Indicateur inconnu : %.', _unknown USING ERRCODE = '22023';
  END IF;

  -- Ne touche que la ligne de l'appelant
  UPDATE public.allowed_users
     SET home_metric_keys = _clean
   WHERE email = _email
  RETURNING home_metric_keys INTO _saved;

  IF _saved IS NULL THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  RETURN _saved;
END;
$$;

REVOKE ALL ON FUNCTION public.definir_mes_indicateurs(text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.definir_mes_indicateurs(text[]) TO authenticated;

COMMENT ON FUNCTION public.definir_mes_indicateurs(text[]) IS
  'La personne connectée choisit de 1 à 4 indicateurs (clés de public.metrics, ordre conservé) pour son accueil. Ne touche que sa propre ligne.';

-- ============================================================
-- MIGRATION INVERSE (à lancer à la main dans le SQL Editor pour annuler ; ne fait pas partie de la migration)
-- ============================================================
-- DROP FUNCTION IF EXISTS public.definir_mes_indicateurs(text[]);
-- ALTER TABLE public.allowed_users DROP CONSTRAINT IF EXISTS allowed_users_home_metric_keys_len;
-- ALTER TABLE public.allowed_users DROP COLUMN IF EXISTS home_metric_keys;
