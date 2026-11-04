import { Linkify } from "@/components/linkify";
import { AttachmentLink } from "@/components/attachment-link";
import { formatExactDate } from "@/components/expandable-card";
import { ReaderDialog } from "@/components/modules/reader-dialog";
import { StatusTag } from "@/components/status-tag";
import { SubmissionHistory } from "@/components/submission-history";
import { Button } from "@/components/ui/button";
import type { Submission } from "@/lib/dashboard";

/** Fenêtre de lecture d'une demande, sur le gabarit commun des lecteurs. */
export function SubmissionReader({
  submission: s,
  onClose,
  onReject,
  onApprove,
  approving,
  showHistory = false,
}: {
  submission: Submission | null;
  /** Conservé pour compatibilité : le tag de statut affiche déjà le libellé. */
  statusLabel?: string;
  onClose: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  approving?: boolean;
  /** Historique des décisions : seulement pour ma demande, ou en tant qu'admin / manager de l'équipe. */
  showHistory?: boolean;
}) {
  return (
    <ReaderDialog
      open={!!s}
      onClose={onClose}
      title={s?.author_name ?? ""}
      description="Détail de la demande."
      tags={s && <StatusTag status={s.status} />}
      meta={s && `${s.team} · Soumise le ${formatExactDate(s.created_at)}`}
      actions={
        onReject || onApprove ? (
          <>
            {onReject && (
              <Button type="button" variant="outline" onClick={onReject}>
                Refuser
              </Button>
            )}
            {onApprove && (
              <Button type="button" disabled={approving} onClick={onApprove}>
                Valider
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {s && (
        <>
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground wrap-anywhere">
            <Linkify text={s.content} />
          </p>
          <AttachmentLink path={s.attachment_path} name={s.attachment_name} />
          {s.status === "refusée" && s.rejection_category && (
            <div className="rounded-[4px] border border-error bg-error-container p-3 text-sm text-on-error-container wrap-anywhere">
              <p className="font-semibold">Motif : {s.rejection_category}</p>
              <p className="whitespace-pre-line">
                Raison : <Linkify text={s.rejection_note ?? ""} />
              </p>
            </div>
          )}
          {showHistory && <SubmissionHistory submissionId={s.id} />}
        </>
      )}
    </ReaderDialog>
  );
}
