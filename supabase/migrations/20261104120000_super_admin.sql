-- ============================================================
-- Super admin : un compte que même les autres admins ne peuvent ni rétrograder ni retirer
-- ============================================================
-- Le drapeau super_admin ne se pose et ne se retire que directement dans la base (éditeur SQL).
-- Depuis l'application (session connectée), le rôle et l'accès du super admin sont verrouillés.
-- « Depuis la base » = aucune session connectée (auth.jwt() est vide), donc l'éditeur SQL et les migrations.

ALTER TABLE public.allowed_users ADD COLUMN IF NOT EXISTS super_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.operation_base()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT auth.jwt() IS NULL
$$;

CREATE OR REPLACE FUNCTION private.proteger_super_admin_utilisateurs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF private.operation_base() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    IF OLD.super_admin THEN
      RAISE EXCEPTION 'Ce compte est protégé (super admin) : il ne peut pas être retiré depuis l''application.' USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.super_admin IS DISTINCT FROM OLD.super_admin THEN
    RAISE EXCEPTION 'Le statut de super admin ne se modifie que directement dans la base.' USING ERRCODE = '42501';
  END IF;
  IF OLD.super_admin AND (NEW.email IS DISTINCT FROM OLD.email OR NEW.departure_date IS DISTINCT FROM OLD.departure_date) THEN
    RAISE EXCEPTION 'L''accès d''un super admin ne peut pas être modifié depuis l''application.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_super_admin_utilisateurs ON public.allowed_users;
CREATE TRIGGER proteger_super_admin_utilisateurs
  BEFORE UPDATE OR DELETE ON public.allowed_users
  FOR EACH ROW EXECUTE FUNCTION private.proteger_super_admin_utilisateurs();

CREATE OR REPLACE FUNCTION private.proteger_super_admin_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _super boolean;
BEGIN
  IF private.operation_base() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  SELECT a.super_admin INTO _super FROM public.allowed_users a WHERE a.id = OLD.allowed_user_id;
  IF coalesce(_super, false) THEN
    RAISE EXCEPTION 'Le rôle d''un super admin ne peut pas être modifié depuis l''application.' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_super_admin_roles ON public.allowed_user_roles;
CREATE TRIGGER proteger_super_admin_roles
  BEFORE UPDATE OR DELETE ON public.allowed_user_roles
  FOR EACH ROW EXECUTE FUNCTION private.proteger_super_admin_roles();

-- Attribution du drapeau au compte de Julien (posée ici, comme décidé le 2026-11-04).
UPDATE public.allowed_users SET super_admin = true WHERE lower(email) = 'julienabt122@gmail.com';
