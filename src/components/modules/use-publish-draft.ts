import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { publishDraftNews } from "@/lib/dashboard";

/** Publier un brouillon d'actualité (même confirmation et mêmes messages qu'à l'origine). */
export function usePublishDraft() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: publishDraftNews,
    onSuccess: () => {
      toast.success("Actualité publiée");
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  return {
    pending: mutation.isPending,
    publish: (n: { id: string; title: string }) => {
      if (window.confirm(`Publier l'actualité « ${n.title} » ? Elle sera visible par tous.`)) {
        mutation.mutate(n.id);
      }
    },
  };
}
