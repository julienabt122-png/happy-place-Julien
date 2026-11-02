import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Linkify } from "@/components/linkify";
import { AttachmentLink } from "@/components/attachment-link";
import { formatExactDate } from "@/components/expandable-card";
import { STATUS_LABELS } from "@/components/status-tag";
import { SubmissionHistory } from "@/components/submission-history";
import { Button } from "@/components/ui/button";
import type { Submission } from "@/lib/dashboard";
import { useReturnFocus } from "@/lib/use-return-focus";

/** Grande fenêtre de lecture d'une demande (focus piégé, Échap, clic fond). */
export function SubmissionReader({
  submission: s,
  statusLabel,
  onClose,
  onReject,
  onApprove,
  approving,
}: {
  submission: Submission | null;
  statusLabel?: string;
  onClose: () => void;
  onReject?: () => void;
  onApprove?: () => void;
  approving?: boolean;
}) {
  const returnFocus = useReturnFocus(!!s);
  return (
    <DialogPrimitive.Root open={!!s} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
        {s && (
          <DialogPrimitive.Content
            onCloseAutoFocus={returnFocus}
            className="fixed z-50 inset-0 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:w-[min(48rem,calc(100vw-2rem))] h-dvh md:h-auto md:max-h-[85vh] flex flex-col bg-surface-container-lowest border border-outline shadow-lg focus:outline-none"
          >
            <div className="flex items-start justify-between gap-sm border-b border-outline-variant p-md">
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-headline-sm text-headline-sm text-primary wrap-anywhere">
                  {s.author_name}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="font-label-sm text-label-sm text-on-surface-variant">
                  {s.team} • {statusLabel ?? STATUS_LABELS[s.status] ?? s.status} • Soumise le {formatExactDate(s.created_at)}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Fermer">
                  <span aria-hidden="true" className="material-symbols-outlined">close</span>
                </Button>
              </DialogPrimitive.Close>
            </div>
            <div className="flex-1 overflow-y-auto p-md space-y-md">
              <p className="font-body-md text-body-md text-on-surface whitespace-pre-line wrap-anywhere">
                <Linkify text={s.content} />
              </p>
              <AttachmentLink path={s.attachment_path} name={s.attachment_name} />
              {s.status === "refusée" && s.rejection_category && (
                <div className="p-sm bg-error-container text-on-error-container text-body-sm wrap-anywhere">
                  <p className="font-bold">Motif : {s.rejection_category}</p>
                  <p className="whitespace-pre-line">Raison : <Linkify text={s.rejection_note ?? ""} /></p>
                </div>
              )}
              <SubmissionHistory submissionId={s.id} />
            </div>
            {(onReject || onApprove) && (
              <div className="flex gap-xs border-t border-outline-variant p-md">
                {onReject && (
                  <Button type="button" variant="outline" onClick={onReject} className="flex-1">
                    Refuser
                  </Button>
                )}
                {onApprove && (
                  <Button type="button" disabled={approving} onClick={onApprove} className="flex-1">
                    Valider
                  </Button>
                )}
              </div>
            )}
          </DialogPrimitive.Content>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
