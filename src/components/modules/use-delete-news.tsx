import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { deleteNews, type News } from "@/lib/dashboard";

/**
 * Suppression d'une actualité par l'admin (publiée ou brouillon), avec confirmation. Même suppression
 * que l'ancienne page /manage/news (image jointe retirée, puis ligne supprimée). Le bouton n'est
 * proposé qu'à l'admin ; la politique « Admin write » de la base fait foi.
 * `request(n, opener)` ouvre la confirmation ; le focus revient à `opener` à la fermeture.
 */
export function useDeleteNews(): {
  pending: boolean;
  request: (n: News, opener?: HTMLElement | null) => void;
  confirmDialog: ReactNode;
} {
  const qc = useQueryClient();
  const [target, setTarget] = useState<News | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const remove = useMutation({
    mutationFn: (n: News) => deleteNews(n.id, n.image_path),
    onSuccess: () => {
      toast.success("Actualité supprimée");
      // Page Actualités et accueil lisent la même liste ["news"].
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError: () =>
      toast.error("Impossible de supprimer cette actualité. Réessaie dans un instant."),
    onSettled: () => setTarget(null),
  });

  return {
    pending: remove.isPending,
    request: (n, opener) => {
      if (opener) openerRef.current = opener;
      setTarget(n);
    },
    confirmDialog: (
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && !remove.isPending && setTarget(null)}
        title="Supprimer cette actualité ?"
        message={
          target
            ? `« ${target.title} » sera supprimée pour tout le monde. Cette action est définitive.`
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
