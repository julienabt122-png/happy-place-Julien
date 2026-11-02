import { useRef } from "react";
import { FormFooter } from "@/components/manage/crud-ui";
import { Linkify } from "@/components/linkify";
import { FormDialog } from "@/components/modules/form-dialog";
import { BlockerStatusTag, SeverityTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { Blocker } from "@/lib/dashboard";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

/**
 * Fenêtre de lecture d'un point bloquant (« Voir le détail »), lecture seule. Même gabarit que les
 * autres fenêtres ; le focus initial est sur « Fermer », Échap ferme et le focus revient au bouton d'origine.
 */
export function BlockerReader({
  blocker,
  onClose,
}: {
  blocker: Blocker | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <FormDialog
      open={!!blocker}
      onOpenChange={(o) => !o && onClose()}
      title={blocker?.title ?? ""}
      description="Détail du point bloquant."
      initialFocusRef={closeRef}
    >
      {blocker && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityTag severity={blocker.severity} />
            <BlockerStatusTag status={blocker.status} />
          </div>
          <p className="font-label-sm text-xs text-on-surface-variant">
            {blocker.department} · Créé le {longDate(blocker.created_at ?? blocker.updated_at)} ·
            Mis à jour le {longDate(blocker.updated_at)}
          </p>
          {blocker.description ? (
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground wrap-anywhere">
              <Linkify text={blocker.description} />
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant">Aucune description.</p>
          )}
          <FormFooter>
            <Button ref={closeRef} type="button" variant="outline" onClick={onClose}>
              Fermer
            </Button>
          </FormFooter>
        </div>
      )}
    </FormDialog>
  );
}
