-- ============================================================
-- Historique des demandes : enregistrer le nom de la personne qui décide
-- ============================================================
-- Avant : le nom venait des métadonnées du jeton (full_name / name), à défaut de l'e-mail du jeton.
-- Un compte anonyme (version élèves) n'a ni l'un ni l'autre : la base écrivait un nom vide et marquait
-- la décision comme « automatique ». Après : l'e-mail est retrouvé comme dans marquer_accueil_vu (jeton,
-- sinon auth.users par auth.uid()), et le nom vient du profil allowed_users (prénom + nom), à défaut
-- des métadonnées du jeton. Jamais d'adresse e-mail à la place d'un nom.
-- Migration additive : le déclencheur record_submission_status et la table ne changent pas.
-- Dérogation à la règle « pas de migration après le 2026-11-02 » : accordée par Julien le 2026-11-03.
-- À lancer ensuite : select * from private.run_smoke_tests();  (toutes les lignes ok = true)

CREATE OR REPLACE FUNCTION private.record_submission_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _name text;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    -- Compte anonyme : l'adresse interne est lue dans auth.users (comme marquer_accueil_vu)
    IF _email IS NULL AND _uid IS NOT NULL THEN
      SELECT nullif(lower(u.email), '') INTO _email FROM auth.users u WHERE u.id = _uid;
    END IF;

    -- Nom : prénom + nom du profil ; à défaut, nom des métadonnées du jeton
    IF _email IS NOT NULL THEN
      SELECT nullif(btrim(concat_ws(' ', nullif(btrim(au.first_name), ''), nullif(btrim(au.last_name), ''))), '')
        INTO _name
        FROM public.allowed_users au
       WHERE au.email = _email;
    END IF;
    IF _name IS NULL THEN
      _name := coalesce(
        nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
        nullif(btrim(auth.jwt() -> 'user_metadata' ->> 'name'), '')
      );
    END IF;
    -- Jamais d'adresse e-mail à la place d'un nom
    IF _name LIKE '%@%' THEN
      _name := NULL;
    END IF;

    INSERT INTO public.submission_status_history
      (submission_id, old_status, new_status, changed_by_email, changed_by_name, is_automatic, rejection_category, rejection_note)
    VALUES
      (NEW.id,
       CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
       NEW.status,
       _email,
       _name,
       -- « automatique » seulement sans e-mail ni session (tâche planifiée sous postgres, par exemple)
       (_email IS NULL AND _uid IS NULL),
       CASE WHEN NEW.status = 'refusée'::public.submission_status THEN NEW.rejection_category END,
       CASE WHEN NEW.status = 'refusée'::public.submission_status THEN NEW.rejection_note END);
  END IF;
  RETURN NEW;
END
$function$;

-- ------------------------------------------------------------
-- Rattrapage des décisions déjà enregistrées : un seul UPDATE, rejouable sans effet.
-- Ne touche que changed_by_name, et seulement les lignes dont l'e-mail correspond à une personne
-- connue ayant un prénom ou un nom, quand le nom est vide ou ressemble à une adresse e-mail.
-- Les lignes sans e-mail ne sont pas modifiées.
-- ------------------------------------------------------------
UPDATE public.submission_status_history h
   SET changed_by_name = p.full_name
  FROM (
    SELECT au.email,
           nullif(btrim(concat_ws(' ', nullif(btrim(au.first_name), ''), nullif(btrim(au.last_name), ''))), '') AS full_name
      FROM public.allowed_users au
  ) p
 WHERE p.full_name IS NOT NULL
   AND p.email = lower(h.changed_by_email)
   AND (h.changed_by_name IS NULL OR btrim(h.changed_by_name) = '' OR h.changed_by_name LIKE '%@%')
   AND h.changed_by_name IS DISTINCT FROM p.full_name;

-- ============================================================
-- MIGRATION INVERSE (à lancer à la main dans le SQL Editor pour annuler ; ne fait pas partie de la migration)
-- Restaure la fonction à l'identique de 20261006163825_cafe9ae6-9472-4c91-b125-cde664a6bbf5.sql.
-- Le rattrapage des noms n'est pas annulé (il ne fait que remplir des noms vides ou de type e-mail).
-- ============================================================
-- CREATE OR REPLACE FUNCTION private.record_submission_status()
-- RETURNS trigger
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path TO 'public', 'private'
-- AS $function$
-- DECLARE
--   _email text := lower(nullif(auth.jwt() ->> 'email', ''));
--   _name text := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', _email);
-- BEGIN
--   IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
--     INSERT INTO public.submission_status_history
--       (submission_id, old_status, new_status, changed_by_email, changed_by_name, is_automatic, rejection_category, rejection_note)
--     VALUES
--       (NEW.id,
--        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
--        NEW.status,
--        _email,
--        CASE WHEN _email IS NULL THEN NULL ELSE _name END,
--        _email IS NULL,
--        CASE WHEN NEW.status = 'refusée'::public.submission_status THEN NEW.rejection_category END,
--        CASE WHEN NEW.status = 'refusée'::public.submission_status THEN NEW.rejection_note END);
--   END IF;
--   RETURN NEW;
-- END
-- $function$;
