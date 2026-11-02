import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { metricLabel } from "@/components/modules/metrics-module";
import { deleteMetric, type Metric } from "@/lib/dashboard";

/**
 * Suppression d'un indicateur par l'admin, avec confirmation. Même suppression que l'ancienne page
 * /manage/metrics ; la base supprime aussi son historique de valeurs (déclencheur). Le bouton n'est
 * proposé qu'à l'admin ; la politique « Admin write » fait foi. L'accueil ignore une clé disparue.
 */
export function useDeleteMetric(): {
  pending: boolean;
  request: (m: Metric, opener?: HTMLElement | null) => void;
  confirmDialog: ReactNode;
} {
  const qc = useQueryClient();
  const [target, setTarget] = useState<Metric | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const remove = useMutation({
    mutationFn: (m: Metric) => deleteMetric(m.key),
    onSuccess: () => {
      toast.success("Indicateur supprimé");
      qc.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: () => toast.error("Impossible de supprimer cet indicateur. Réessaie dans un instant."),
    onSettled: () => setTarget(null),
  });

  return {
    pending: remove.isPending,
    request: (m, opener) => {
      if (opener) openerRef.current = opener;
      setTarget(m);
    },
    confirmDialog: (
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && !remove.isPending && setTarget(null)}
        title="Supprimer cet indicateur ?"
        message={
          target
            ? `L'indicateur « ${metricLabel(target, target.label)} » sera supprimé pour tout le monde, y compris des accueils où il est affiché. Cette action est définitive.`
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
