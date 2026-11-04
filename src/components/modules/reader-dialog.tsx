import { useRef, type ReactNode } from "react";
import { FormFooter } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { Button } from "@/components/ui/button";

/**
 * Gabarit commun des fenêtres de lecture (demande, actualité, point bloquant) : bandeau titre,
 * tags, ligne de repères en mono, contenu, puis pied fixe avec les actions à gauche et « Fermer » à droite.
 * Le focus initial est sur « Fermer », Échap ferme et le focus revient au bouton d'origine.
 */
export function ReaderDialog({
  open,
  onClose,
  title,
  description,
  tags,
  meta,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Lue par les lecteurs d'écran seulement (ex. « Détail du point bloquant. »). */
  description: string;
  tags?: ReactNode;
  meta?: ReactNode;
  /** Boutons d'action, alignés à gauche du pied (Refuser, Valider, Modifier, Masquer…). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description={description}
      initialFocusRef={closeRef}
    >
      <div className="space-y-6">
        {tags && <div className="flex flex-wrap items-center gap-2">{tags}</div>}
        {meta && <p className="font-label-sm text-xs text-on-surface-variant">{meta}</p>}
        {children}
        <FormFooter>
          {actions && <div className="mr-auto flex flex-wrap items-center gap-2">{actions}</div>}
          <Button ref={closeRef} type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </FormFooter>
      </div>
    </FormDialog>
  );
}
