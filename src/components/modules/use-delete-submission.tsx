import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ModerationDialog } from "@/components/modules/moderation-dialog";
import type { Submission } from "@/lib/dashboard";
import { masquerElement, reafficherElement, supprimerDefinitivement } from "@/lib/moderation";

/**
 * Modération d'une demande (admin) : une demande visible est d'abord masquée ; une demande masquée
 * peut être supprimée définitivement (son historique et sa pièce jointe partent) ou réaffichée.
 * `request(s, opener)` ouvre la fenêtre ; le focus revient à `opener` à la fermeture.
 */
export function useDeleteSubmission(): {
  pending: boolean;
  request: (s: Submission, opener?: HTMLElement | null) => void;
  confirmDialog: ReactNode;
} {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Submission | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Préfixe commun : liste, accueil, « Mes demandes », validées, décideur et décisions.
  const rafraichir = () => qc.invalidateQueries({ queryKey: ["submissions"] });

  const action = useMutation({
    mutationFn: ({ s, motif }: { s: Submission; motif: string }) =>
      s.masque_le
        ? supprimerDefinitivement("demande", s.id, motif)
        : masquerElement("demande", s.id, motif),
    onSuccess: (_r, { s }) => {
      toast.success(s.masque_le ? "Demande supprimée" : "Demande masquée");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setTarget(null),
  });

  const reafficher = useMutation({
    mutationFn: (s: Submission) => reafficherElement("demande", s.id),
    onSuccess: () => {
      toast.success("Demande réaffichée");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setTarget(null),
  });

  return {
    pending: action.isPending || reafficher.isPending,
    request: (s, opener) => {
      if (opener) openerRef.current = opener;
      setTarget(s);
    },
    confirmDialog: (
      <ModerationDialog
        open={!!target}
        onOpenChange={(o) => !o && !action.isPending && setTarget(null)}
        mode={target?.masque_le ? "supprimer" : "masquer"}
        titre={target ? `Demande de ${target.author_name}` : ""}
        pending={action.isPending || reafficher.isPending}
        onConfirm={(motif) => target && action.mutate({ s: target, motif })}
        onReafficher={target?.masque_le ? () => target && reafficher.mutate(target) : undefined}
        returnFocusRef={openerRef}
      />
    ),
  };
}
