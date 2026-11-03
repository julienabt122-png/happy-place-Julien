-- ============================================================
-- Actualités publiées modifiables par leur manager + « qui tranche ma demande »
-- ============================================================
-- Migration additive : aucune table ni colonne modifiée. Ne modifie aucune migration existante.
-- À lancer ensuite : select * from private.run_smoke_tests();  (toutes les lignes ok = true)
--
-- PARTIE A : un manager modifie ses propres actualités publiées.
-- PARTIE B : un collaborateur voit les managers de son équipe, un manager voit les admins.

-- ------------------------------------------------------------
-- A1. Politique : un manager met à jour SES actualités publiées.
-- USING et WITH CHECK identiques : il ne peut ni changer l'auteur ni (avec A3) dépublier.
-- ------------------------------------------------------------
CREATE POLICY "Manager update own published news" ON public.news
  FOR UPDATE TO authenticated
  USING (
    private.current_app_role() = 'manager'::public.app_role
    AND status = 'publiée'::public.news_status
    AND author_email = lower(auth.jwt() ->> 'email')
  )
  WITH CHECK (
    private.current_app_role() = 'manager'::public.app_role
    AND status = 'publiée'::public.news_status
    AND author_email = lower(auth.jwt() ->> 'email')
  );

-- ------------------------------------------------------------
-- A2. Images : le manager gère aussi les images de ses actualités publiées.
-- Même signature, mêmes droits ; seule la liste des statuts autorisés change.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.can_edit_news_media(_news_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.is_admin() OR EXISTS (
    SELECT 1 FROM public.news n
    WHERE n.id::text = _news_id
      AND private.current_app_role() = 'manager'
      AND n.status IN ('brouillon', 'publiée')
      AND n.author_email = lower(auth.jwt() ->> 'email'))
$$;
REVOKE EXECUTE ON FUNCTION private.can_edit_news_media(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.can_edit_news_media(text) TO authenticated;

-- ------------------------------------------------------------
-- A3. Garde-fou : un manager ne repasse pas une actualité publiée en brouillon.
-- Nécessaire car la politique « Manager update own draft news » accepte 'brouillon'
-- dans son WITH CHECK et que les politiques permissives se combinent par OU.
-- Sans effet pour l'admin ni hors session utilisateur (rôle null).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.block_manager_unpublish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, private AS $$
BEGIN
  IF OLD.status = 'publiée'::public.news_status
     AND NEW.status IS DISTINCT FROM 'publiée'::public.news_status
     AND private.current_app_role() = 'manager'::public.app_role THEN
    RAISE EXCEPTION 'Une actualité publiée ne peut pas repasser en brouillon.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.block_manager_unpublish() FROM public, anon;

CREATE TRIGGER block_manager_unpublish BEFORE UPDATE OF status ON public.news
FOR EACH ROW EXECUTE FUNCTION private.block_manager_unpublish();

-- ------------------------------------------------------------
-- B. Qui doit trancher ma demande ?
--   collaborateur : les managers de son équipe (role = 'manager')
--   manager       : les admins (role = 'admin')
--   admin         : aucune ligne
-- Prénom et nom seulement, jamais d'e-mail. Seule la ligne de l'appelant décide du résultat.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.qui_tranche_ma_demande()
RETURNS TABLE (first_name text, last_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(nullif(auth.jwt() ->> 'email', ''));
  _me uuid;
  _role public.app_role;
  _team text;
BEGIN
  -- Compte anonyme : l'adresse interne est lue dans auth.users (comme marquer_accueil_vu)
  IF _email IS NULL AND _uid IS NOT NULL THEN
    SELECT lower(u.email) INTO _email FROM auth.users u WHERE u.id = _uid;
  END IF;
  IF _email IS NULL OR _email = '' THEN
    RETURN;
  END IF;

  SELECT au.id, ar.role, au.team INTO _me, _role, _team
    FROM public.allowed_users au
    LEFT JOIN public.allowed_user_roles ar ON ar.allowed_user_id = au.id
   WHERE au.email = _email;
  IF _me IS NULL THEN
    RETURN;
  END IF;

  IF _role = 'collaborateur'::public.app_role THEN
    IF _team IS NULL THEN
      RETURN;
    END IF;
    RETURN QUERY
      SELECT nullif(btrim(m.first_name), '')::text,
             nullif(btrim(m.last_name), '')::text,
             'manager'::text
        FROM public.allowed_users m
        JOIN public.allowed_user_roles mr ON mr.allowed_user_id = m.id
         AND mr.role = 'manager'::public.app_role
        JOIN public.manager_teams mt ON mt.allowed_user_id = m.id
       WHERE lower(mt.team) = lower(_team)
         AND (nullif(btrim(m.first_name), '') IS NOT NULL OR nullif(btrim(m.last_name), '') IS NOT NULL)
       ORDER BY nullif(btrim(m.last_name), '') NULLS LAST, nullif(btrim(m.first_name), '') NULLS LAST;
  ELSIF _role = 'manager'::public.app_role THEN
    RETURN QUERY
      SELECT nullif(btrim(a.first_name), '')::text,
             nullif(btrim(a.last_name), '')::text,
             'admin'::text
        FROM public.allowed_users a
        JOIN public.allowed_user_roles ar2 ON ar2.allowed_user_id = a.id
         AND ar2.role = 'admin'::public.app_role
       WHERE (nullif(btrim(a.first_name), '') IS NOT NULL OR nullif(btrim(a.last_name), '') IS NOT NULL)
       ORDER BY nullif(btrim(a.last_name), '') NULLS LAST, nullif(btrim(a.first_name), '') NULLS LAST;
  END IF;
  -- admin (ou rôle absent) : aucune ligne
END;
$$;

REVOKE ALL ON FUNCTION public.qui_tranche_ma_demande() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.qui_tranche_ma_demande() TO authenticated;

COMMENT ON FUNCTION public.qui_tranche_ma_demande() IS
  'Prénom, nom et rôle de ceux qui tranchent les demandes de l''appelant : managers de son équipe (collaborateur) ou admins (manager). Jamais d''e-mail.';

-- ============================================================
-- MIGRATION INVERSE (à lancer à la main dans le SQL Editor pour annuler ; ne fait pas partie de la migration)
-- ============================================================
-- DROP FUNCTION IF EXISTS public.qui_tranche_ma_demande();
-- DROP TRIGGER IF EXISTS block_manager_unpublish ON public.news;
-- DROP FUNCTION IF EXISTS private.block_manager_unpublish();
-- DROP POLICY IF EXISTS "Manager update own published news" ON public.news;
-- CREATE OR REPLACE FUNCTION private.can_edit_news_media(_news_id text)
-- RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
--   SELECT private.is_admin() OR EXISTS (
--     SELECT 1 FROM public.news n
--     WHERE n.id::text = _news_id
--       AND private.current_app_role() = 'manager'
--       AND n.status = 'brouillon'
--       AND n.author_email = lower(auth.jwt() ->> 'email'))
-- $$;
-- REVOKE EXECUTE ON FUNCTION private.can_edit_news_media(text) FROM public, anon;
-- GRANT EXECUTE ON FUNCTION private.can_edit_news_media(text) TO authenticated;
