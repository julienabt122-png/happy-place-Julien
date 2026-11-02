import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { deleteSubmission, type Submission } from "@/lib/dashboard";

/**
 * Suppression d'une demande par l'admin, avec confirmation. Même suppression que l'ancienne page
 * /manage/submissions : l'historique part avec la demande (cascade) et la pièce jointe est mise en
 * file de suppression par la base. Le bouton n'est proposé qu'à l'admin ; la politique
 * « Admins manage submissions » fait foi. `request(s, opener)` ouvre la confirmation.
 */
export function useDeleteSubmission(): {
  pending: boolean;
  request: (s: Submission, opener?: HTMLElement | null) => void;
  confirmDialog: ReactNode;
} {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Submission | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const remove = useMutation({
    mutationFn: (s: Submission) => deleteSubmission(s.id),
    onSuccess: () => {
      toast.success("Demande supprimée");
      // Préfixe commun : liste, accueil, « Mes demandes », validées, décideur et décisions.
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: () => toast.error("Impossible de supprimer cette demande. Réessaie dans un instant."),
    onSettled: () => setTarget(null),
  });

  return {
    pending: remove.isPending,
    request: (s, opener) => {
      if (opener) openerRef.current = opener;
      setTarget(s);
    },
    confirmDialog: (
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && !remove.isPending && setTarget(null)}
        title="Supprimer cette demande ?"
        message={
          target
            ? `La demande de ${target.author_name} sera supprimée pour tout le monde, avec son historique de décisions${target.attachment_path ? " et sa pièce jointe" : ""}. Cette action est définitive.`
            : ""
        }
        confirmLabel="Supprimer"
        pending={remove.isPending}
        returnFocusRef={openerRef}
        onConfirm={() => target && remove.mutate(target)}
      />
    ),
  };
}
