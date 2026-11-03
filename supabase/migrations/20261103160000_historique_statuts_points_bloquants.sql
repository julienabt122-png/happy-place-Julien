-- US-46 : historique des statuts des points bloquants (création et chaque changement de statut).
-- Sert au résumé hebdomadaire. Modèle : submission_status_history.

CREATE TABLE public.blocker_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.blockers(id) ON DELETE CASCADE,
  old_status public.blocker_status,
  new_status public.blocker_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX blocker_status_history_blocker_idx
  ON public.blocker_status_history (blocker_id, changed_at);

GRANT SELECT ON public.blocker_status_history TO authenticated;
GRANT ALL ON public.blocker_status_history TO service_role;

ALTER TABLE public.blocker_status_history ENABLE ROW LEVEL SECURITY;

-- Même visibilité que les points bloquants : tout compte autorisé les lit.
CREATE POLICY "Read history of blockers" ON public.blocker_status_history
  FOR SELECT TO authenticated
  USING (private.is_allowed());

CREATE OR REPLACE FUNCTION private.record_blocker_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.blocker_status_history (blocker_id, old_status, new_status)
    VALUES (NEW.id, CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END, NEW.status);
  END IF;
  RETURN NEW;
END
$function$;

CREATE TRIGGER record_blocker_status
  AFTER INSERT OR UPDATE ON public.blockers
  FOR EACH ROW EXECUTE FUNCTION private.record_blocker_status();

-- Point de départ : un enregistrement par point bloquant existant.
INSERT INTO public.blocker_status_history (blocker_id, old_status, new_status, changed_at)
SELECT id, NULL, status, created_at FROM public.blockers;

-- Retour arrière (à ne lancer que par une nouvelle migration) :
-- DROP TRIGGER IF EXISTS record_blocker_status ON public.blockers;
-- DROP FUNCTION IF EXISTS private.record_blocker_status();
-- DROP TABLE IF EXISTS public.blocker_status_history;
