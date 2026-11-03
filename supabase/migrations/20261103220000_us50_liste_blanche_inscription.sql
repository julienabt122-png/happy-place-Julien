-- ============================================================
-- US-50 (étape 2) : seule une adresse de la liste blanche peut créer un compte
-- ============================================================
-- Vaut pour la connexion Google comme pour l'inscription par e-mail + mot de passe.
-- Une adresse absente de allowed_users, ou dont la date de départ est passée, est refusée
-- à la création du compte. Un admin ajoute la personne dans la gestion avant sa première connexion.
-- Les connexions anonymes (sans e-mail) sont refusées aussi.

CREATE OR REPLACE FUNCTION private.bloquer_inscription_hors_liste()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NEW.email IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.allowed_users u
     WHERE lower(u.email) = lower(NEW.email)
       AND (u.departure_date IS NULL OR u.departure_date > current_date)
  ) THEN
    RAISE EXCEPTION 'Cette adresse n''est pas autorisée à utiliser Happy Place. Demande à un admin de t''ajouter.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bloquer_inscription_hors_liste ON auth.users;
CREATE TRIGGER bloquer_inscription_hors_liste
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.bloquer_inscription_hors_liste();
