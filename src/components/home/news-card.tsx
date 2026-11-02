import { Link, useNavigate } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ClickableRow, RowChevron, RowMainButton } from "@/components/clickable-row";
import { EmptyState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import { NewsDraftDialog } from "@/components/modules/news-draft-dialog";
import { useDeleteNews } from "@/components/modules/use-delete-news";
import { usePublishDraft } from "@/components/modules/use-publish-draft";
import { NewsReader } from "@/components/news-reader";
import { NewsThumb } from "@/components/news-thumb";
import { NewTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { timeAgo, type News } from "@/lib/dashboard";
import { isNewsNew } from "@/lib/news-recent";
import { canEditPublishedNews } from "@/lib/news-permissions";
import { plural } from "@/lib/plural";

/** Nombre d'actualités montrées : « Voir tout » mène à /actualites. */
const PREVIEW = 3;
const DAY = 24 * 60 * 60 * 1000;

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export function NewsCard({
  role,
  email,
  fallbackName,
  news,
}: {
  role: AppRole;
  email: string;
  /** Auteur des nouveaux brouillons quand le profil n'a ni prénom ni nom. */
  fallbackName: string;
  news: UseQueryResult<News[]>;
}) {
  const navigate = useNavigate();
  const [reading, setReading] = useState<News | null>(null);
  const [editing, setEditing] = useState<News | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Bouton d'origine : le focus lui revient après la modification.
  const openerRef = useRef<HTMLElement | null>(null);
  function openReading(n: News) {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setReading(n);
  }
  const publishDraft = usePublishDraft();
  const deleteNewsAction = useDeleteNews();
  const canReview = role === "admin" || role === "manager";

  const all = news.data ?? [];
  const published = all.filter((n) => n.status === "publiée");
  const drafts = all.filter((n) => n.status === "brouillon");
  // Un manager retrouve ses brouillons ici ; l'admin voit seulement le nombre à publier (pied de carte).
  const myDrafts = drafts.filter(
    (n) => (n.author_email ?? "").toLowerCase() === email.toLowerCase(),
  );
  const oldestDays =
    drafts.length > 0
      ? Math.floor(
          (Date.now() - Math.min(...drafts.map((n) => new Date(n.created_at).getTime()))) / DAY,
        )
      : 0;

  return (
    <ModuleCard
      id="actualites"
      icon="newspaper"
      title="Actualités du cabinet"
      seeAllTo="/actualites"
      seeAllLabel="Voir tout : actualités"
      footer={
        canReview ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <NewsDraftDialog
              email={email}
              fallbackName={fallbackName}
              trigger={
                <Button type="button">
                  <Icon name="edit_note" className="text-[18px]" /> Rédiger une actualité
                </Button>
              }
            />
            {role === "admin" && drafts.length > 0 && (
              <div className="flex flex-col items-end gap-0.5 text-right">
                <Link
                  to="/actualites"
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-primary"
                >
                  <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
                    {plural(drafts.length, "brouillon à publier", "brouillons à publier")}
                  </span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
                <span className="font-label-sm text-xs text-on-surface-variant">
                  {oldestDays > 0
                    ? `Le plus ancien depuis ${plural(oldestDays, "jour", "jours")}`
                    : "Le plus ancien date d'aujourd'hui"}
                </span>
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3 p-6">
        {news.isError && (
          <p className="text-body-sm text-error">Les actualités sont indisponibles.</p>
        )}
        {news.data && published.length === 0 && (
          <EmptyState bare message="Aucune actualité publiée pour le moment." />
        )}
        <div className="flex flex-col">
          {published.slice(0, PREVIEW).map((n, i) => (
            <div key={n.id}>
              {i > 0 && <div aria-hidden="true" className="h-px bg-outline-variant" />}
              <ClickableRow flat>
                <RowMainButton
                  label={n.title}
                  onOpen={() => openReading(n)}
                  className="flex w-full items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <NewsThumb path={n.image_path} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-primary wrap-anywhere">
                        {n.title}
                      </span>
                      <span className="font-label-sm text-xs text-on-surface-variant">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {isNewsNew(n.created_at) && <NewTag />}
                    <RowChevron />
                  </span>
                </RowMainButton>
              </ClickableRow>
            </div>
          ))}
        </div>

        {role === "manager" && (
          <div className="mt-1 flex flex-col gap-2.5 border-t border-outline-variant pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-body-md text-[14px] font-semibold text-primary">
                Mes brouillons
              </h3>
              <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-xs text-primary">
                {myDrafts.length}
              </span>
            </div>
            {news.data && myDrafts.length === 0 && (
              <p className="text-sm text-on-surface-variant">Aucun brouillon en cours.</p>
            )}
            {myDrafts.map((n) => (
              <ClickableRow key={n.id} className="flex items-center justify-between gap-4 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-outline-variant bg-secondary"
                  >
                    <Icon name="edit_note" className="text-[22px] text-on-surface-variant" />
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <RowMainButton
                      kind="page"
                      label={`brouillon, ${n.title}`}
                      onOpen={() => void navigate({ to: "/actualites" })}
                      className="block w-full truncate text-sm font-medium text-primary"
                    >
                      {n.title}
                    </RowMainButton>
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      Créé {timeAgo(n.created_at)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  aria-label={`Publier : ${n.title}`}
                  disabled={publishDraft.pending}
                  onClick={() => publishDraft.publish(n)}
                  className="relative z-10 shrink-0 px-4"
                >
                  Publier
                </Button>
              </ClickableRow>
            ))}
          </div>
        )}
      </div>
      <NewsReader
        news={reading}
        onClose={() => setReading(null)}
        onEdit={
          reading && canEditPublishedNews(role, email, reading)
            ? (n) => {
                setReading(null);
                setEditing(n);
                setEditOpen(true);
              }
            : undefined
        }
        onDelete={
          reading && role === "admin" && canEditPublishedNews(role, email, reading)
            ? (n) => {
                setReading(null);
                deleteNewsAction.request(n, openerRef.current);
              }
            : undefined
        }
      />
      {deleteNewsAction.confirmDialog}
      <NewsDraftDialog
        email={email}
        fallbackName={fallbackName}
        draft={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        returnFocusRef={openerRef}
      />
      {publishDraft.confirmDialog}
    </ModuleCard>
  );
}
