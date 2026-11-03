-- ============================================================
-- US-49 : adresse de contact pour recevoir le résumé hebdomadaire
-- ============================================================
-- Les comptes de l'appli sont anonymes : leur adresse « email » est une adresse interne
-- (clé du profil), qui ne reçoit pas de mail. On ajoute une adresse de contact réelle,
-- posée par la personne elle-même à l'écran « Choisis ton rôle ». Migration additive.

ALTER TABLE public.allowed_users
  ADD COLUMN IF NOT EXISTS contact_email text;

ALTER TABLE public.allowed_users
  DROP CONSTRAINT IF EXISTS allowed_users_contact_email_format;
ALTER TABLE public.allowed_users
  ADD CONSTRAINT allowed_users_contact_email_format
  CHECK (contact_email IS NULL OR contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

CREATE OR REPLACE FUNCTION public.definir_mon_email_contact(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cle text := lower(nullif(auth.jwt() ->> 'email', ''));
  _contact text := lower(btrim(coalesce(_email, '')));
  _trouve text;
BEGIN
  IF _uid IS NULL AND _cle IS NULL THEN
    RAISE EXCEPTION 'Session introuvable : recharge la page.' USING ERRCODE = '42501';
  END IF;

  -- Compte anonyme : l'adresse interne est lue dans auth.users (comme choisir_mon_role)
  IF _cle IS NULL THEN
    SELECT lower(u.email) INTO _cle FROM auth.users u WHERE u.id = _uid;
  END IF;
  IF _cle IS NULL OR _cle = '' THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  IF _contact !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Renseigne une adresse e-mail valide.';
  END IF;

  UPDATE public.allowed_users
     SET contact_email = _contact
   WHERE email = _cle
  RETURNING contact_email INTO _trouve;

  IF _trouve IS NULL THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  RETURN _trouve;
END;
$$;

REVOKE ALL ON FUNCTION public.definir_mon_email_contact(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.definir_mon_email_contact(text) TO authenticated;

COMMENT ON FUNCTION public.definir_mon_email_contact(text) IS
  'La personne connectée pose l''adresse e-mail où recevoir son résumé hebdomadaire. Ne touche que sa propre ligne.';
