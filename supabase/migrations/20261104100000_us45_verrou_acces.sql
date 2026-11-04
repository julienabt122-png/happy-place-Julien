-- ============================================================
-- US-45 (verrou d'accès) : un compte retiré ne peut pas revenir seul
-- ============================================================
-- 1. choisir_mon_role ne crée plus de ligne. Seule une personne déjà dans la liste blanche,
--    dont la date de départ n'est pas passée, peut choisir son rôle et son équipe.
-- 2. couper_acces(id) : un admin retire immédiatement l'accès d'une personne. La ligne
--    allowed_users est supprimée : rôles et équipes managées partent avec (cascade), et les
--    déclencheurs existants (anonymisation, notification) s'appliquent comme pour un départ.

CREATE OR REPLACE FUNCTION public.choisir_mon_role(
  _role public.app_role,
  _first_name text,
  _last_name text,
  _team text DEFAULT NULL
)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _first text := nullif(btrim(coalesce(_first_name, '')), '');
  _last text := nullif(btrim(coalesce(_last_name, '')), '');
  _t text := nullif(btrim(coalesce(_team, '')), '');
  _id uuid;
  _depart date;
  _actuel public.app_role;
BEGIN
  IF _email IS NULL THEN
    RAISE EXCEPTION 'Connecte-toi avant de choisir un rôle.' USING ERRCODE = '42501';
  END IF;
  IF _role IS NULL THEN
    RAISE EXCEPTION 'Choisis un rôle.';
  END IF;
  IF _first IS NULL OR _last IS NULL THEN
    RAISE EXCEPTION 'Renseigne ton prénom et ton nom.';
  END IF;

  -- Liste blanche : la ligne doit déjà exister. Cette fonction ne crée jamais de personne.
  SELECT a.id, a.departure_date INTO _id, _depart
    FROM public.allowed_users a
   WHERE a.email = _email;
  IF _id IS NULL THEN
    RAISE EXCEPTION 'Cette adresse n''est pas dans la liste des personnes autorisées.' USING ERRCODE = '42501';
  END IF;
  IF _depart IS NOT NULL AND _depart <= current_date THEN
    RAISE EXCEPTION 'Ton accès a pris fin.' USING ERRCODE = '42501';
  END IF;

  -- Le rôle admin ne peut pas être pris par soi-même : il faut déjà l'être.
  IF _role = 'admin' THEN
    SELECT r.role INTO _actuel FROM public.allowed_user_roles r WHERE r.allowed_user_id = _id;
    IF _actuel IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Le rôle admin est attribué par un admin depuis la gestion.' USING ERRCODE = '42501';
    END IF;
    _t := NULL;
  ELSE
    IF _t IS NULL THEN
      RAISE EXCEPTION 'Choisis une équipe.';
    END IF;
    SELECT t.name INTO _t FROM public.teams t
     WHERE lower(t.name) = lower(_t) AND NOT t.is_reserved;
    IF _t IS NULL THEN
      RAISE EXCEPTION 'Équipe inconnue : choisis une équipe de la liste.';
    END IF;
  END IF;

  UPDATE public.allowed_users
     SET first_name = _first,
         last_name = _last,
         team = CASE WHEN _role = 'collaborateur' THEN _t END
   WHERE id = _id;

  -- Indicateur de transaction : autorise le changement de son propre rôle par ce seul chemin (US-45).
  PERFORM set_config('app.role_via_choisir', 'on', true);

  BEGIN
    INSERT INTO public.allowed_user_roles (allowed_user_id, role)
    VALUES (_id, _role)
    ON CONFLICT (allowed_user_id) DO UPDATE
      SET role = excluded.role, updated_at = now();
  EXCEPTION WHEN raise_exception THEN
    -- Déclenché par private.protect_last_admin_role()
    RAISE EXCEPTION 'Tu es le dernier admin : un autre membre doit devenir admin avant que tu changes de rôle.';
  END;

  DELETE FROM public.manager_teams WHERE allowed_user_id = _id;
  IF _role = 'manager' THEN
    INSERT INTO public.manager_teams (allowed_user_id, team) VALUES (_id, _t);
  END IF;

  RETURN _role;
END;
$$;

REVOKE ALL ON FUNCTION public.choisir_mon_role(public.app_role, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.choisir_mon_role(public.app_role, text, text, text) TO authenticated;

-- Couper l'accès immédiatement (admin uniquement). Pas de retour possible seul : plus de ligne, plus de choix.
CREATE OR REPLACE FUNCTION public.couper_acces(_allowed_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
BEGIN
  IF NOT private.is_admin() THEN
    RAISE EXCEPTION 'Réservé aux admins.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.allowed_users WHERE id = _allowed_user_id AND email = _email
  ) THEN
    RAISE EXCEPTION 'Tu ne peux pas couper ton propre accès.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.allowed_users WHERE id = _allowed_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Personne introuvable.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.couper_acces(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.couper_acces(uuid) TO authenticated;
