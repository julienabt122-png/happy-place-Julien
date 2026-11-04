import { IconTip } from "@/components/ui/tooltip";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  MAX_NEWS_LINKS,
  NEWS_IMAGE_TYPES,
  imageError,
  linkDisplay,
  signedNewsImageUrl,
  type MediaDraft,
  type NewsLink,
} from "@/lib/news-media";

function I({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export function NewsImage({
  path,
  alt,
  className = "",
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const q = useQuery({
    queryKey: ["news-image", path],
    queryFn: () => signedNewsImageUrl(path),
    staleTime: 50 * 60 * 1000,
    retry: false,
  });
  if (!q.data) return null;
  return (
    <img
      src={q.data}
      alt={alt}
      className={`w-full max-h-60 object-cover border border-outline-variant ${className}`}
    />
  );
}

export function NewsLinks({ links }: { links: unknown }) {
  const list = Array.isArray(links) ? (links as NewsLink[]) : [];
  if (!list.length) return null;
  return (
    <ul className="space-y-1 min-w-0">
      {list.map((l, i) => (
        <li key={i} className="min-w-0">
          <a
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-start gap-1 max-w-full text-primary underline underline-offset-2 font-body-sm text-body-sm wrap-anywhere"
          >
            <span className="wrap-anywhere">{linkDisplay(l)}</span>
            <I name="open_in_new" className="text-sm shrink-0" />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Boutons et champs « Ajouter un média » / « Ajouter un lien » d'un formulaire d'actualité. */
export function NewsMediaEditor({
  value,
  onChange,
  linkErrs,
  disabled,
  title,
}: {
  value: MediaDraft;
  onChange: (v: MediaDraft) => void;
  linkErrs: Record<number, string>;
  disabled?: boolean;
  title: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [imgError, setImgError] = useState<string | null>(null);
  const preview = useMemo(
    () => (value.file ? URL.createObjectURL(value.file) : null),
    [value.file],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const showExisting = !value.file && value.existingPath && !value.removeExisting;
  const hasImage = !!value.file || !!showExisting;
  const full = value.links.length >= MAX_NEWS_LINKS;

  const pick = () => input.current?.click();

  return (
    <div className="space-y-sm min-w-0">
      <input
        ref={input}
        type="file"
        accept={NEWS_IMAGE_TYPES.join(",")}
        className="hidden"
        data-testid="news-image-input"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const err = imageError(f);
          setImgError(err);
          if (err) {
            toast.error(err);
            return;
          }
          onChange({ ...value, file: f });
        }}
      />
      {hasImage && (
        <div className="space-y-xs">
          {preview ? (
            <img
              src={preview}
              alt={title || "Aperçu de l'image"}
              className="w-full max-w-xs max-h-40 object-cover border border-outline-variant"
            />
          ) : (
            showExisting && (
              <NewsImage
                path={value.existingPath!}
                alt={title || "Image de l'actualité"}
                className="max-w-xs max-h-40"
              />
            )
          )}
          <div className="flex gap-sm">
            <Button type="button" variant="link" size="sm" disabled={disabled} onClick={pick}>
              Remplacer
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              disabled={disabled}
              onClick={() =>
                onChange({ ...value, file: null, removeExisting: !!value.existingPath })
              }
            >
              Retirer
            </Button>
          </div>
        </div>
      )}
      {imgError && (
        <p role="alert" className="text-body-sm text-error">
          {imgError}
        </p>
      )}

      {value.links.map((l, i) => (
        <div key={i} className="space-y-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-xs min-w-0">
            <input
              aria-label={`Adresse du lien ${i + 1}`}
              placeholder="https://…"
              maxLength={2000}
              value={l.url}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...value,
                  links: value.links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)),
                })
              }
              className="min-w-0 flex-[2] bg-card border border-outline-variant p-xs font-body-sm focus:outline-none focus:border-primary"
            />
            <div className="flex gap-xs min-w-0 flex-1">
              <input
                aria-label={`Libellé du lien ${i + 1} (facultatif)`}
                placeholder="Libellé (facultatif)"
                maxLength={80}
                value={l.label}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    ...value,
                    links: value.links.map((x, j) =>
                      j === i ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                className="min-w-0 flex-1 bg-card border border-outline-variant p-xs font-body-sm focus:outline-none focus:border-primary"
              />
              <IconTip label={`Retirer le lien ${i + 1}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Retirer le lien ${i + 1}`}
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...value, links: value.links.filter((_, j) => j !== i) })
                  }
                >
                  <I name="close" />
                </Button>
              </IconTip>
            </div>
          </div>
          {linkErrs[i] && (
            <p role="alert" className="text-body-sm text-error">
              {linkErrs[i]}
            </p>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-sm items-center">
        <Button type="button" variant="outline" disabled={disabled} onClick={pick}>
          <I name="image" /> {hasImage ? "Changer le média" : "Ajouter un média"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || full}
          title={full ? "3 liens maximum" : undefined}
          onClick={() => onChange({ ...value, links: [...value.links, { url: "", label: "" }] })}
        >
          <I name="link" /> Ajouter un lien
        </Button>
        {full && (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            3 liens maximum
          </span>
        )}
      </div>
    </div>
  );
}
