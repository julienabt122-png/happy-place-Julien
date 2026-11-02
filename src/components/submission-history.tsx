import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABELS } from "@/components/status-tag";

type Row = {
  id: string;
  changed_at: string;
  old_status: string | null;
  new_status: string;
  changed_by_name: string | null;
  is_automatic: boolean;
  rejection_category: string | null;
};

/**
 * Historique d'UNE demande, lu à l'ouverture de sa fenêtre (droits de lecture actuels de la base).
 * Seules les colonnes utiles sont lues : jamais d'adresse e-mail ni de note libre de refus.
 */
function useSubmissionHistory(submissionId: string) {
  return useQuery({
    queryKey: ["submissions", "history", submissionId],
    retry: false,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase
        .from("submission_status_history")
        .select(
          "id, changed_at, old_status, new_status, changed_by_name, is_automatic, rejection_category",
        )
        .eq("submission_id", submissionId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

/** « Envoyée » à la création, « Remise en attente » quand une décision est annulée, sinon le nouveau statut. */
function stepLabel(r: Row) {
  if (r.new_status === "en attente") return r.old_status ? "Remise en attente" : "Envoyée";
  if (r.new_status === "validée") return "Validée";
  if (r.new_status === "refusée") return "Refusée";
  return STATUS_LABELS[r.new_status] ?? r.new_status;
}

/** « 27 octobre 2026, 09:12 » */
function stepDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { dateStyle: "long" });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

/** Section « Historique » de la fenêtre de détail d'une demande : du plus récent au plus ancien. */
export function SubmissionHistory({ submissionId }: { submissionId: string }) {
  const history = useSubmissionHistory(submissionId);
  return (
    <section
      aria-label="Historique des actions"
      className="space-y-2 border-t border-outline-variant pt-md"
    >
      <h3 className="font-label-md text-label-md text-primary">Historique</h3>
      {history.isLoading && (
        <p className="text-body-sm text-on-surface-variant">Chargement de l'historique…</p>
      )}
      {history.isError && (
        <p role="alert" className="text-body-sm text-error">
          Impossible de charger l'historique. Réessaie dans un instant.
        </p>
      )}
      {history.data && history.data.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Aucun changement enregistré.</p>
      )}
      {history.data && history.data.length > 0 && (
        <ol className="space-y-3">
          {history.data.map((r) => {
            const name = r.changed_by_name?.trim();
            // Jamais d'adresse e-mail à l'écran : un nom qui en ressemble à une est ignoré.
            const by = name && !name.includes("@") ? name : null;
            return (
              <li key={r.id} className="flex flex-col gap-0.5">
                <span className="font-body-md text-sm font-semibold text-primary">
                  {stepLabel(r)}
                </span>
                <span className="font-label-sm text-xs text-on-surface-variant">
                  {stepDate(r.changed_at)}
                  {by ? ` · Par ${by}` : ""}
                  {r.is_automatic ? " · Automatique" : ""}
                </span>
                {r.new_status === "refusée" && r.rejection_category && (
                  <span className="font-label-sm text-xs text-on-surface-variant wrap-anywhere">
                    Motif : {r.rejection_category}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
