import { Linkify } from "@/components/linkify";
import { formatExactDate } from "@/components/expandable-card";
import { NewsImage, NewsLinks } from "@/components/news-media";
import { ReaderDialog } from "@/components/modules/reader-dialog";
import { InfoTag, NewsStatusTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { News } from "@/lib/dashboard";

/** Fenêtre de lecture d'une actualité (lecture seule), sur le gabarit commun des lecteurs. */
export function NewsReader({
  news: n,
  onClose,
  onEdit,
  onDelete,
}: {
  news: News | null;
  onClose: () => void;
  /** Bouton « Modifier » (admin, ou manager auteur) : fourni seulement si l'utilisateur a le droit. */
  onEdit?: (n: News) => void;
  /** Bouton « Masquer » / « Supprimer » (admin seulement) : fourni seulement si l'utilisateur a le droit. */
  onDelete?: (n: News) => void;
}) {
  return (
    <ReaderDialog
      open={!!n}
      onClose={onClose}
      title={n?.title ?? ""}
      description="Détail de l'actualité."
      tags={
        n && (
          <>
            <NewsStatusTag status={n.status} />
            {n.masque_le && <InfoTag>Masquée</InfoTag>}
          </>
        )
      }
      meta={n && `Par ${n.author} · ${formatExactDate(n.created_at)}`}
      actions={
        n && (onEdit || onDelete) ? (
          <>
            {onEdit && (
              <Button
                type="button"
                variant="outline"
                aria-label={`Modifier : ${n.title}`}
                onClick={() => onEdit(n)}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  edit
                </span>{" "}
                Modifier
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="outline"
                aria-label={
                  n.masque_le
                    ? `Supprimer définitivement l'actualité ${n.title}`
                    : `Masquer l'actualité ${n.title}`
                }
                onClick={() => onDelete(n)}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  {n.masque_le ? "delete" : "visibility_off"}
                </span>{" "}
                {n.masque_le ? "Supprimer" : "Masquer"}
              </Button>
            )}
          </>
        ) : undefined
      }
    >
      {n?.image_path && <NewsImage path={n.image_path} alt={n.title} />}
      {n?.body && (
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground wrap-anywhere">
          <Linkify text={n.body} />
        </p>
      )}
      {n && <NewsLinks links={n.links} />}
    </ReaderDialog>
  );
}
