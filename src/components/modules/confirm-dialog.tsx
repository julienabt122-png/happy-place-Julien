import type { RefObject } from "react";
import { FormFooter } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { Button } from "@/components/ui/button";

/**
 * Fenêtre de confirmation (remplace window.confirm) : gabarit des fenêtres, « Annuler » (outline)
 * puis le bouton de confirmation en `default`, jamais rouge (charte). Échap ferme.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  pending = false,
  returnFocusRef,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  /** Bouton d'origine à qui rendre le focus (sinon : l'élément actif à l'ouverture). */
  returnFocusRef?: RefObject<HTMLElement | null>;
  onConfirm: () => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={message}
      returnFocusRef={returnFocusRef}
    >
      <p className="font-body-md text-base text-foreground">{message}</p>
      <FormFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button type="button" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </FormFooter>
    </FormDialog>
  );
}
