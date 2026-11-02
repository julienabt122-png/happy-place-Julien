-- ============================================================
-- US-06 : « accueil vu » sur le profil
-- ============================================================
-- allowed_users est le profil de l'utilisateur (pas une liste blanche).
-- On y ajoute la date à laquelle la personne a vu l'accueil, et une fonction
-- pour la poser. Migration additive : rien n'est modifié ni supprimé.
-- La colonne reste protégée par la RLS existante (écriture réservée aux admins) ;
-- seule la fonction ci-dessous permet à une personne de poser sa propre marque.

ALTER TABLE public.allowed_users
  ADD COLUMN IF NOT EXISTS welcome_seen_at timestamptz;

CREATE OR REPLACE FUNCTION public.marquer_accueil_vu()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _seen timestamptz;
BEGIN
  IF _uid IS NULL AND _email IS NULL THEN
    RAISE EXCEPTION 'Session introuvable : recharge la page.' USING ERRCODE = '42501';
  END IF;

  -- Compte anonyme : l'adresse interne est lue dans auth.users (comme choisir_mon_role)
  IF _email IS NULL THEN
    SELECT lower(u.email) INTO _email FROM auth.users u WHERE u.id = _uid;
  END IF;

  IF _email IS NULL OR _email = '' THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  -- Première vue conservée : un second appel ne change rien
  UPDATE public.allowed_users
     SET welcome_seen_at = coalesce(welcome_seen_at, now())
   WHERE email = _email
  RETURNING welcome_seen_at INTO _seen;

  IF _seen IS NULL THEN
    RAISE EXCEPTION 'Choisis d''abord ton rôle.';
  END IF;

  RETURN _seen;
END;
$$;

REVOKE ALL ON FUNCTION public.marquer_accueil_vu() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.marquer_accueil_vu() TO authenticated;

COMMENT ON FUNCTION public.marquer_accueil_vu() IS
  'La personne connectée marque l''accueil comme vu (première date conservée). Ne touche que sa propre ligne.';
