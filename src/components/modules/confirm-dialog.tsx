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
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel: string;
  pending?: boolean;
  onConfirm: () => void;
}) {
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={title} description={message}>
      <p className="font-body-md text-base text-foreground">{message}</p>
      <div className="mt-6 flex justify-end gap-4 border-t border-outline-variant pt-6">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Annuler
        </Button>
        <Button type="button" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </FormDialog>
  );
}
