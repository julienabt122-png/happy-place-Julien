import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ModerationDialog } from "@/components/modules/moderation-dialog";
import type { News } from "@/lib/dashboard";
import { masquerElement, reafficherElement, supprimerDefinitivement } from "@/lib/moderation";

/**
 * Modération d'une actualité (admin) : une actualité visible est d'abord masquée ; une actualité
 * déjà masquée peut être supprimée définitivement ou réaffichée. Le motif est demandé et journalisé.
 * `request(n, opener)` ouvre la fenêtre ; le focus revient à `opener` à la fermeture.
 */
export function useDeleteNews(): {
  pending: boolean;
  request: (n: News, opener?: HTMLElement | null) => void;
  confirmDialog: ReactNode;
} {
  const qc = useQueryClient();
  const [target, setTarget] = useState<News | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const rafraichir = () => qc.invalidateQueries({ queryKey: ["news"] });

  const action = useMutation({
    mutationFn: ({ n, motif }: { n: News; motif: string }) =>
      n.masque_le
        ? supprimerDefinitivement("actualite", n.id, motif, n.image_path)
        : masquerElement("actualite", n.id, motif),
    onSuccess: (_r, { n }) => {
      toast.success(n.masque_le ? "Actualité supprimée" : "Actualité masquée");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setTarget(null),
  });

  const reafficher = useMutation({
    mutationFn: (n: News) => reafficherElement("actualite", n.id),
    onSuccess: () => {
      toast.success("Actualité réaffichée");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setTarget(null),
  });

  return {
    pending: action.isPending || reafficher.isPending,
    request: (n, opener) => {
      if (opener) openerRef.current = opener;
      setTarget(n);
    },
    confirmDialog: (
      <ModerationDialog
        open={!!target}
        onOpenChange={(o) => !o && !action.isPending && setTarget(null)}
        mode={target?.masque_le ? "supprimer" : "masquer"}
        titre={target?.title ?? ""}
        pending={action.isPending || reafficher.isPending}
        onConfirm={(motif) => target && action.mutate({ n: target, motif })}
        onReafficher={target?.masque_le ? () => target && reafficher.mutate(target) : undefined}
        returnFocusRef={openerRef}
      />
    ),
  };
}
