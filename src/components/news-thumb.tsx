import { useQuery } from "@tanstack/react-query";
import { signedNewsImageUrl } from "@/lib/news-media";

/** Vignette 64 x 48 d'une actualité : l'image si elle existe, sinon une tuile avec icône. */
export function NewsThumb({ path }: { path?: string | null }) {
  // Même clé de cache que NewsImage : l'URL signée n'est demandée qu'une fois.
  const q = useQuery({
    queryKey: ["news-image", path],
    queryFn: () => signedNewsImageUrl(path as string),
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    retry: false,
  });
  return (
    <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-outline-variant bg-secondary">
      {q.data ? (
        <img src={q.data} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-outline">
          newspaper
        </span>
      )}
    </div>
  );
}
