import { Linkify } from "@/components/linkify";
import { ReaderDialog } from "@/components/modules/reader-dialog";
import { BlockerStatusTag, InfoTag, SeverityTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { Blocker } from "@/lib/dashboard";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

/** Fenêtre de lecture d'un point bloquant (« Voir le détail »), sur le gabarit commun des lecteurs. */
export function BlockerReader({
  blocker,
  onClose,
  onModerate,
}: {
  blocker: Blocker | null;
  onClose: () => void;
  /** « Masquer » / « Supprimer » (admin seulement) : fourni seulement si l'utilisateur a le droit. */
  onModerate?: (b: Blocker) => void;
}) {
  return (
    <ReaderDialog
      open={!!blocker}
      onClose={onClose}
      title={blocker?.title ?? ""}
      description="Détail du point bloquant."
      tags={
        blocker && (
          <>
            <SeverityTag severity={blocker.severity} />
            <BlockerStatusTag status={blocker.status} />
            {blocker.masque_le && <InfoTag>Masqué</InfoTag>}
          </>
        )
      }
      meta={
        blocker &&
        `${blocker.department} · Créé le ${longDate(blocker.created_at ?? blocker.updated_at)} · Mis à jour le ${longDate(blocker.updated_at)}`
      }
      actions={
        blocker &&
        onModerate && (
          <Button
            type="button"
            variant="outline"
            aria-label={
              blocker.masque_le
                ? `Supprimer définitivement : ${blocker.title}`
                : `Masquer : ${blocker.title}`
            }
            onClick={() => onModerate(blocker)}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {blocker.masque_le ? "delete" : "visibility_off"}
            </span>{" "}
            {blocker.masque_le ? "Supprimer" : "Masquer"}
          </Button>
        )
      }
    >
      {blocker?.description ? (
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground wrap-anywhere">
          <Linkify text={blocker.description} />
        </p>
      ) : (
        <p className="text-sm text-on-surface-variant">Aucune description.</p>
      )}
    </ReaderDialog>
  );
}
