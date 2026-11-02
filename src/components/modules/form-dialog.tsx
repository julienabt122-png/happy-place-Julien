import type { ReactNode, RefObject } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useReturnFocus } from "@/lib/use-return-focus";

/**
 * Fenêtre de formulaire (spec-interface § 2) : Dialog shadcn, bandeau de 56 px, corps de 24 px.
 * Échap ferme, le focus initial va au premier champ et revient au déclencheur à la fermeture.
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  returnFocusRef,
  initialFocusRef,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Bouton qui ouvre la fenêtre : le focus lui revient à la fermeture. */
  trigger?: ReactNode;
  /**
   * Sans `trigger` : bouton d'origine à qui rendre le focus. S'il a disparu
   * (ligne mise à jour après un refus), le focus passe au contenu principal.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /**
   * Champ qui reçoit le focus à l'ouverture (le premier à saisir). Sans cette option,
   * Radix donne le focus au premier élément atteignable, qui peut être un champ en lecture seule.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  // Sans déclencheur ni bouton d'origine fourni : on retient le bouton actif à l'ouverture.
  const autoReturnFocus = useReturnFocus(open);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        onOpenAutoFocus={
          initialFocusRef
            ? (e) => {
                if (initialFocusRef.current) {
                  e.preventDefault();
                  initialFocusRef.current.focus();
                }
              }
            : undefined
        }
        onCloseAutoFocus={
          returnFocusRef
            ? (e) => {
                e.preventDefault();
                const opener = returnFocusRef.current;
                (opener?.isConnected ? opener : document.getElementById("contenu"))?.focus();
              }
            : trigger
              ? undefined
              : autoReturnFocus
        }
        className="max-h-[90vh] w-[640px] max-w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0"
      >
        <div className="flex h-14 items-center border-b border-outline-variant bg-secondary pl-6 pr-14">
          <DialogTitle className="font-display text-[18px] font-bold leading-tight text-primary">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">{description}</DialogDescription>
        </div>
        <div className="p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
