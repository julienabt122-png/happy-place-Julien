import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import { NewsImage, NewsLinks, NewsMediaEditor } from "@/components/news-media";
import { NewsReader } from "@/components/news-reader";
import { usePublishDraft } from "@/components/modules/use-publish-draft";
import type { AppRole } from "@/lib/auth";
import { deleteDraftNews, fetchNews, saveDraftNews, timeAgo, type News } from "@/lib/dashboard";
import {
  emptyMedia,
  linkErrors,
  mediaFromNews,
  toNewsLinks,
  type MediaDraft,
} from "@/lib/news-media";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** Nom affiché de l'auteur : nom complet du profil, sinon nom, sinon adresse e-mail. */
export function userDisplayName(user: User | null | undefined, email: string) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return (
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email
  );
}

export function NewsModule({ role, email, name }: { role: AppRole; email: string; name: string }) {
  const qc = useQueryClient();
  const isAdmin = role === "admin";
  const canWriteNews = role === "admin" || role === "manager";
  const myEmail = email.toLowerCase();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaDraft>(emptyMedia);
  const [showLinkErrs, setShowLinkErrs] = useState(false);
  const newsLinkErrs = showLinkErrs ? linkErrors(media.links) : {};
  const [readingNews, setReadingNews] = useState<News | null>(null);

  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const onError = (e: unknown) => toast.error((e as Error).message);

  const saveDraft = useMutation({
    mutationFn: saveDraftNews,
    onSuccess: () => {
      setTitle("");
      setBody("");
      setEditingNewsId(null);
      setMedia(emptyMedia());
      setShowLinkErrs(false);
      toast.success("Brouillon enregistré");
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError,
  });

  const publishDraft = usePublishDraft();

  const removeDraft = useMutation({
    mutationFn: (n: { id: string; image_path?: string | null }) =>
      deleteDraftNews(n.id, n.image_path),
    onSuccess: () => {
      toast.success("Brouillon supprimé");
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError,
  });

  const visibleDrafts = news.data?.filter((n) => n.status === "brouillon") ?? [];
  const drafts = visibleDrafts.length;
  const published = news.data?.filter((n) => n.status === "publiée") ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[32px] font-semibold leading-tight text-primary">
        Actualités
      </h1>
      <ModuleCard
        main
        icon="newspaper"
        title="Actualités du cabinet"
        counter={
          canWriteNews ? `${drafts} brouillon${drafts > 1 ? "s" : ""} en attente` : undefined
        }
      >
        <div className="flex flex-col gap-md p-6">
          {canWriteNews && (
            <form
              className="space-y-md"
              onSubmit={(e) => {
                e.preventDefault();
                if (!title.trim()) return;
                setShowLinkErrs(true);
                if (Object.keys(linkErrors(media.links)).length) {
                  toast.error("Corrige les liens invalides avant d'enregistrer.");
                  return;
                }
                saveDraft.mutate({
                  links: toNewsLinks(media.links),
                  media,
                  id: editingNewsId ?? undefined,
                  title: title.trim(),
                  body,
                  author: name,
                  author_email: myEmail,
                });
              }}
            >
              <div className="space-y-xs">
                <label
                  htmlFor="news-title"
                  className="font-label-md text-label-md text-on-surface-variant block"
                >
                  TITRE
                </label>
                <input
                  id="news-title"
                  className="w-full bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none transition-colors font-headline-sm text-headline-sm px-0 py-xs"
                  placeholder="Saisis un titre…"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-xs">
                <label
                  htmlFor="news-body"
                  className="font-label-md text-label-md text-on-surface-variant block"
                >
                  CONTENU
                </label>
                <textarea
                  id="news-body"
                  className="w-full bg-card border border-outline-variant focus:border-primary focus:outline-none p-sm font-body-md"
                  placeholder="Rédige l'actualité…"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-sm">
                <NewsMediaEditor
                  value={media}
                  onChange={setMedia}
                  linkErrs={newsLinkErrs}
                  disabled={saveDraft.isPending}
                  title={title}
                />
                <div className="flex items-center gap-sm">
                  {editingNewsId && (
                    <button
                      type="button"
                      className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
                      onClick={() => {
                        setEditingNewsId(null);
                        setTitle("");
                        setBody("");
                        setMedia(emptyMedia());
                        setShowLinkErrs(false);
                      }}
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saveDraft.isPending}
                    className="px-lg py-xs bg-primary text-on-primary font-label-md text-label-md disabled:opacity-50"
                  >
                    {saveDraft.isPending ? "Enregistrement…" : "Enregistrer le brouillon"}
                  </button>
                </div>
              </div>
            </form>
          )}
          <div className={canWriteNews ? "mt-md pt-md border-t border-outline-variant" : ""}>
            {canWriteNews && visibleDrafts.length > 0 && (
              <>
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-sm">
                  BROUILLONS
                </h3>
                <div className="space-y-xs mb-md">
                  {visibleDrafts.map((n) => {
                    const own = (n.author_email ?? "").toLowerCase() === myEmail;
                    const allowed = isAdmin || own;
                    return (
                      <div
                        key={n.id}
                        className="flex items-center justify-between gap-sm p-sm bg-surface-container"
                      >
                        <div className="flex items-center gap-md min-w-0">
                          <Icon name="draft" className="text-on-surface-variant" />
                          <div className="min-w-0">
                            <p className="font-body-md text-primary flex items-center gap-xs">
                              <span className="truncate">{n.title}</span>
                              <span className="shrink-0 border border-outline-variant px-xs font-label-sm text-label-sm text-on-surface-variant">
                                Brouillon
                              </span>
                            </p>
                            <p className="text-xs text-on-surface-variant uppercase font-label-sm">
                              Créé {timeAgo(n.created_at)} • Par {n.author}
                            </p>
                          </div>
                        </div>
                        {allowed && (
                          <div className="flex items-center gap-sm shrink-0">
                            <button
                              type="button"
                              className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary"
                              onClick={() => {
                                setEditingNewsId(n.id);
                                setTitle(n.title);
                                setBody(n.body ?? "");
                                setMedia(mediaFromNews(n));
                                setShowLinkErrs(false);
                              }}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className="font-label-sm text-label-sm text-error"
                              disabled={removeDraft.isPending}
                              onClick={() => {
                                if (window.confirm(`Supprimer le brouillon « ${n.title} » ?`))
                                  removeDraft.mutate(n);
                              }}
                            >
                              Supprimer
                            </button>
                            <button
                              type="button"
                              className="px-sm py-1 bg-primary text-on-primary font-label-sm text-label-sm disabled:opacity-50"
                              disabled={publishDraft.pending}
                              onClick={() => publishDraft.publish(n)}
                            >
                              Publier
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-sm">PUBLIÉES</h3>
            <div className="space-y-xs">
              {news.isLoading && (
                <p className="text-body-sm text-on-surface-variant">Chargement…</p>
              )}
              {news.isError && (
                <p className="text-body-sm text-error">Les actualités sont indisponibles.</p>
              )}
              {news.data && published.length === 0 && (
                <EmptyState message="Aucune actualité publiée pour le moment." />
              )}
              {published.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  onClick={() => setReadingNews(n)}
                  aria-haspopup="dialog"
                  className="w-full text-left p-sm bg-surface-container hover:bg-surface-container-high transition-colors cursor-pointer group min-w-0 overflow-hidden space-y-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {n.image_path && <NewsImage path={n.image_path} alt={n.title} />}
                  <div className="flex items-center justify-between gap-sm min-w-0">
                    <div className="flex items-center gap-md min-w-0">
                      <Icon name="article" className="text-on-surface-variant" />
                      <div className="min-w-0">
                        <p className="font-body-md text-primary group-hover:underline wrap-anywhere">
                          {n.title}
                        </p>
                        <p className="text-xs text-on-surface-variant uppercase font-label-sm">
                          Publiée {timeAgo(n.created_at)} • Par {n.author}
                        </p>
                      </div>
                    </div>
                    {isAdmin && <Icon name="edit" className="text-on-surface-variant" />}
                  </div>
                  <NewsLinks links={n.links} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ModuleCard>
      <NewsReader news={readingNews} onClose={() => setReadingNews(null)} />
    </div>
  );
}
