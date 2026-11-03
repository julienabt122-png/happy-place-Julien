-- ============================================================
-- US-50 (étape 1) : personne ne peut s'attribuer le rôle admin en choisissant son rôle
-- ============================================================
-- Avant : choisir_mon_role acceptait « admin » pour n'importe quel compte connecté.
-- Après : seul un compte qui est déjà admin peut (re)choisir « admin ».
-- Un admin attribue toujours le rôle admin à un autre utilisateur depuis la gestion
-- (règle US-45 : seule la propre ligne est protégée).
-- Le premier admin se crée à la main dans Supabase (voir la story).

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

  -- Le rôle admin ne peut pas être pris par soi-même : il faut déjà l'être.
  IF _role = 'admin' THEN
    SELECT r.role INTO _actuel
      FROM public.allowed_users a
      JOIN public.allowed_user_roles r ON r.allowed_user_id = a.id
     WHERE a.email = _email;
    IF _actuel IS DISTINCT FROM 'admin' THEN
      RAISE EXCEPTION 'Le rôle admin est attribué par un admin depuis la gestion.' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF _role = 'admin' THEN
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

  INSERT INTO public.allowed_users (email, first_name, last_name, team)
  VALUES (_email, _first, _last, CASE WHEN _role = 'collaborateur' THEN _t END)
  ON CONFLICT (email) DO UPDATE
    SET first_name = excluded.first_name,
        last_name = excluded.last_name,
        team = excluded.team
  RETURNING id INTO _id;

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
