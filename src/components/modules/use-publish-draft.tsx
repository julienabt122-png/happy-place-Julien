import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { publishDraftNews } from "@/lib/dashboard";

/**
 * Publier un brouillon d'actualité, avec une fenêtre de confirmation (Dialog).
 * `confirmDialog` est à placer dans le JSX de la page ; `publish(n)` l'ouvre.
 */
export function usePublishDraft() {
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ id: string; title: string } | null>(null);
  const mutation = useMutation({
    mutationFn: publishDraftNews,
    onSuccess: () => {
      toast.success("Actualité publiée");
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setTarget(null),
  });
  return {
    pending: mutation.isPending,
    publish: (n: { id: string; title: string }) => setTarget(n),
    confirmDialog: (
      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title="Publier l'actualité"
        message={
          target ? `Publier l'actualité « ${target.title} » ? Elle sera visible par tous.` : ""
        }
        confirmLabel="Publier l'actualité"
        pending={mutation.isPending}
        onConfirm={() => target && mutation.mutate(target.id)}
      />
    ),
  };
}
