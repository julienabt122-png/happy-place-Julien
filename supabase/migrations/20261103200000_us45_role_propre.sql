-- ============================================================
-- US-45 : un admin ne peut pas modifier son propre rôle ni retirer son propre accès depuis la gestion
-- ============================================================
-- Avant : la gestion (manage.users) faisait un UPDATE direct sur allowed_user_roles.
-- Un admin pouvait donc se rétrograder ou se désactiver par accident.
-- Après : deux règles en base, indépendantes de l'interface.
--
-- Le changement de rôle depuis l'en-tête (« Changer de rôle ») passe par
-- public.choisir_mon_role : ce chemin reste autorisé, il pose un indicateur
-- de transaction (app.role_via_choisir) que la règle reconnaît.
-- Ce choix reste à trancher avec Julien (cf. écran /choisir-role).

-- 1. Règle sur le rôle : pas de modification de son propre rôle hors choisir_mon_role
CREATE OR REPLACE FUNCTION private.protect_own_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;
  IF current_setting('app.role_via_choisir', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.allowed_users a
     WHERE a.id = NEW.allowed_user_id AND a.email = _email
  ) THEN
    RAISE EXCEPTION 'Tu ne peux pas modifier ton propre rôle depuis la gestion. Demande à un autre admin.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_own_role ON public.allowed_user_roles;
CREATE TRIGGER protect_own_role
  BEFORE UPDATE OF role ON public.allowed_user_roles
  FOR EACH ROW EXECUTE FUNCTION private.protect_own_role();

-- 2. Règle sur l'accès : pas de retrait de son propre accès (date de départ sur sa propre ligne)
CREATE OR REPLACE FUNCTION private.protect_own_departure()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
BEGIN
  IF NEW.departure_date IS NOT DISTINCT FROM OLD.departure_date THEN
    RETURN NEW;
  END IF;
  IF NEW.email = _email THEN
    RAISE EXCEPTION 'Tu ne peux pas retirer ton propre accès. Demande à un autre admin.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_own_departure ON public.allowed_users;
CREATE TRIGGER protect_own_departure
  BEFORE UPDATE OF departure_date ON public.allowed_users
  FOR EACH ROW EXECUTE FUNCTION private.protect_own_departure();

-- 3. choisir_mon_role : identique à la version précédente, plus l'indicateur de transaction
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

  -- Indicateur de transaction : autorise le changement de son propre rôle par ce seul chemin.
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
