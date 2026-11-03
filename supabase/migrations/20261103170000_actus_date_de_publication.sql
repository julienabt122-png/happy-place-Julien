-- US-46 : date de publication d'une actualité (news.created_at est la date de création du brouillon).
-- Sert au résumé hebdomadaire : « nouvelle actu publiée cette semaine ».

ALTER TABLE public.news ADD COLUMN published_at timestamptz;

-- Point de départ : pour les actus déjà publiées, on retient la date de création (approximation).
UPDATE public.news SET published_at = created_at WHERE status = 'publiée';

CREATE OR REPLACE FUNCTION private.set_news_published_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'private'
AS $f$
BEGIN
  IF NEW.status = 'publiée' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'publiée') THEN
    NEW.published_at := now();
  ELSIF NEW.status <> 'publiée' THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END
$f$;

CREATE TRIGGER set_news_published_at
  BEFORE INSERT OR UPDATE OF status ON public.news
  FOR EACH ROW EXECUTE FUNCTION private.set_news_published_at();

-- Retour arrière (à ne lancer que par une nouvelle migration) :
-- DROP TRIGGER IF EXISTS set_news_published_at ON public.news;
-- DROP FUNCTION IF EXISTS private.set_news_published_at();
-- ALTER TABLE public.news DROP COLUMN IF EXISTS published_at;
