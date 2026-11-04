import type { User } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable, ListFooter, Td, Tr, type DataColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { FilterBar, FilterChips, FilterSelect, SearchField } from "@/components/filter-bar";
import { ModuleCard } from "@/components/module-card";
import { PageHeader, SummaryLink } from "@/components/page-header";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { NewsDraftDialog } from "@/components/modules/news-draft-dialog";
import { useDeleteNews } from "@/components/modules/use-delete-news";
import { usePublishDraft } from "@/components/modules/use-publish-draft";
import { NewsReader } from "@/components/news-reader";
import { NewsThumb } from "@/components/news-thumb";
import { NewsStatusTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { dateValue, useTableSort } from "@/lib/table-sort";
import { deleteDraftNews, fetchNews, timeAgo, type News } from "@/lib/dashboard";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { canEditPublishedNews } from "@/lib/news-permissions";
import { plural } from "@/lib/plural";

type StatusFilter = "all" | "drafts" | "published";

const STATUS_BY_FILTER: Record<Exclude<StatusFilter, "all">, string> = {
  drafts: "brouillon",
  published: "publiée",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

/** Nom affiché de l'auteur : nom complet du profil, sinon nom, sinon adresse e-mail. */
export function userDisplayName(user: User | null | undefined, email: string) {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  return (
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email
  );
}

export function NewsModule({
  role,
  email,
  name,
  initialFilter,
}: {
  role: AppRole;
  email: string;
  name: string;
  /** Filtre de départ (lien « N brouillons à publier » de l'accueil). */
  initialFilter?: "drafts";
}) {
  const qc = useQueryClient();
  const isAdmin = role === "admin";
  // Brouillons : admin et manager (leurs propres brouillons) ; les autres rôles ne voient que les publiées.
  const canWriteNews = role === "admin" || role === "manager";
  const myEmail = email.toLowerCase();
  const [filter, setFilter] = useState<StatusFilter>(initialFilter ?? "all");
  // Le lien de l'accueil peut arriver alors que la page est déjà ouverte.
  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);
  const [query, setQuery] = useState("");
  const [author, setAuthor] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const [readingNews, setReadingNews] = useState<News | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<News | null>(null);
  const [editing, setEditing] = useState<News | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  // Bouton d'origine de la lecture ou de la modification : le focus lui revient à la fermeture.
  const openerRef = useRef<HTMLElement | null>(null);
  function startEdit(n: News, opener?: HTMLElement) {
    if (opener) openerRef.current = opener;
    setEditing(n);
    setEditOpen(true);
  }

  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const publishDraft = usePublishDraft();
  const deleteNewsAction = useDeleteNews();

  const removeDraft = useMutation({
    mutationFn: (n: { id: string; image_path?: string | null }) =>
      deleteDraftNews(n.id, n.image_path),
    onSuccess: () => {
      toast.success("Brouillon supprimé");
      qc.invalidateQueries({ queryKey: ["news"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setDraftToDelete(null),
  });

  const all = useMemo(() => news.data ?? [], [news.data]);
  const draftCount = all.filter((n) => n.status === "brouillon").length;
  const authors = useMemo(
    () => [...new Set(all.map((n) => n.author))].sort((a, b) => a.localeCompare(b, "fr")),
    [all],
  );
  const needle = query.trim().toLowerCase();
  const filtered = all.filter(
    (n) =>
      (filter === "all" || n.status === STATUS_BY_FILTER[filter]) &&
      (!author || n.author === author) &&
      (!needle ||
        n.title.toLowerCase().includes(needle) ||
        (n.body ?? "").toLowerCase().includes(needle) ||
        n.author.toLowerCase().includes(needle)),
  );
  // Brouillons à publier : du plus ancien au plus récent, pour traiter d'abord ceux qui attendent le plus.
  const ordered =
    filter === "drafts"
      ? [...filtered].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
      : filtered;
  const sort = useTableSort(
    ordered,
    {
      titre: (n) => n.title,
      statut: (n) => n.status,
      date: (n) => dateValue(n.created_at),
    },
    ["date"],
  );
  const shown = sort.rows.slice(0, limit);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setLimit(LIST_PAGE_SIZE);
  }

  const columns: DataColumn[] = [
    { label: "Actualité", sortKey: "titre" },
    { label: "Statut", className: "w-[120px]", sortKey: "statut" },
    { label: "Date", className: "w-[144px]", sortKey: "date" },
    ...(canWriteNews ? [{ label: "Actions", className: "w-[380px] text-right" }] : []),
  ];

  const createButton = (
    <NewsDraftDialog
      email={email}
      fallbackName={name}
      trigger={
        <Button type="button">
          <Icon name="add" className="text-[20px]" /> Ajouter une actualité
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Actualités"
        actions={canWriteNews ? createButton : undefined}
        summary={
          news.data && (
            <>
              {canWriteNews && (
                <>
                  {draftCount > 0 ? (
                    <SummaryLink onClick={() => changeFilter("drafts")}>
                      {plural(draftCount, "brouillon", "brouillons")}
                    </SummaryLink>
                  ) : (
                    <span className="font-semibold text-primary">Aucun brouillon</span>
                  )}{" "}
                  ·{" "}
                </>
              )}
              {plural(all.length, "actualité", "actualités")} au total
            </>
          )
        }
      />

      <FilterBar
        chips={
          canWriteNews ? (
            <FilterChips
              label="Filtrer par statut"
              value={filter}
              onChange={changeFilter}
              options={[
                { id: "all", label: "Toutes" },
                { id: "drafts", label: "Brouillons" },
                { id: "published", label: "Publiées" },
              ]}
            />
          ) : undefined
        }
        right={
          <>
            <SearchField
              id="actualites-recherche"
              label="Rechercher une actualité"
              placeholder="Rechercher une actualité…"
              value={query}
              onChange={(v) => {
                setQuery(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
            <FilterSelect
              id="actualites-auteur"
              label="Filtrer par auteur"
              prefix="Auteur"
              all="Tous"
              value={author}
              options={authors.map((a) => ({ value: a, label: a }))}
              onChange={(v) => {
                setAuthor(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
          </>
        }
      />

      <ModuleCard
        main
        icon="newspaper"
        title="Liste des actualités"
        counter={canWriteNews ? plural(draftCount, "brouillon", "brouillons") : undefined}
        counterTone="dark"
        footer={
          news.data && filtered.length > 0 ? (
            <ListFooter
              label={`${plural(shown.length, "actualité affichée", "actualités affichées")} sur ${filtered.length.toLocaleString("fr-FR")}`}
              hasMore={filtered.length > limit}
              onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
            />
          ) : undefined
        }
      >
        {news.isLoading && <LoadingState label="Chargement des actualités…" />}
        {news.isError && (
          <ErrorState
            message="Impossible de charger les actualités. Réessaie dans un instant."
            onRetry={() => void news.refetch()}
          />
        )}
        {news.data && all.length === 0 && (
          <EmptyState
            message={
              canWriteNews ? "Aucune actualité pour le moment." : "Aucune actualité publiée."
            }
            action={canWriteNews ? createButton : undefined}
          />
        )}
        {news.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState message="Aucune actualité ne correspond à ces filtres." />
        )}
        {shown.length > 0 && (
          <DataTable
            label="Liste des actualités"
            columns={columns}
            sort={sort.sort}
            onSort={sort.onSort}
          >
            {shown.map((n) => {
              // Mêmes règles qu'avant : sur un brouillon, l'admin, ou le manager sur ses propres brouillons.
              const canEditDraft =
                n.status === "brouillon" &&
                (isAdmin || (n.author_email ?? "").toLowerCase() === myEmail);
              return (
                <Tr key={n.id}>
                  <Td>
                    <div className="flex items-start gap-4">
                      <NewsThumb path={n.image_path} tall />
                      <div className="min-w-0 flex-1">
                        <h3 className="mb-1 text-base font-semibold text-primary wrap-anywhere">
                          {n.title}
                        </h3>
                        <div className="mb-1.5 font-label-sm text-xs text-on-surface-variant">
                          {n.author}
                        </div>
                        {n.body && (
                          <p className="mb-2 line-clamp-2 text-sm leading-relaxed text-on-surface-variant wrap-anywhere">
                            {n.body}
                          </p>
                        )}
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          aria-haspopup="dialog"
                          aria-label={`Voir le détail : ${n.title}`}
                          onClick={(e) => {
                            openerRef.current = e.currentTarget;
                            setReadingNews(n);
                          }}
                          className="-ml-3"
                        >
                          Voir le détail
                        </Button>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <NewsStatusTag status={n.status} />
                  </Td>
                  <Td>
                    <span className="font-label-sm text-xs font-medium text-on-surface-variant">
                      {longDate(n.created_at)}
                    </span>
                    {n.status === "brouillon" && (
                      <span className="mt-1 block font-label-sm text-xs text-on-surface-variant">
                        Créé {timeAgo(n.created_at)}
                      </span>
                    )}
                  </Td>
                  {canWriteNews && (
                    <Td className="text-right">
                      {canEditPublishedNews(role, email, n) && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            aria-label={`Modifier : ${n.title}`}
                            onClick={(e) => startEdit(n, e.currentTarget)}
                            className="px-3.5"
                          >
                            <Icon name="edit" className="text-[18px]" /> Modifier
                          </Button>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="outline"
                              aria-haspopup="dialog"
                              aria-label={
                                n.masque_le
                                  ? `Supprimer définitivement l'actualité ${n.title}`
                                  : `Masquer l'actualité ${n.title}`
                              }
                              disabled={deleteNewsAction.pending}
                              onClick={(e) => deleteNewsAction.request(n, e.currentTarget)}
                              className="px-3.5"
                            >
                              <Icon
                                name={n.masque_le ? "delete" : "visibility_off"}
                                className="text-[18px]"
                              />{" "}
                              {n.masque_le ? "Supprimer" : "Masquer"}
                            </Button>
                          )}
                        </div>
                      )}
                      {canEditDraft && (
                        <div className="flex items-center justify-end gap-2">
                          <NewsDraftDialog
                            email={email}
                            fallbackName={name}
                            draft={n}
                            trigger={
                              <Button
                                type="button"
                                variant="outline"
                                aria-label={`Modifier : ${n.title}`}
                                className="px-3.5"
                              >
                                <Icon name="edit" className="text-[18px]" /> Modifier
                              </Button>
                            }
                          />
                          <Button
                            type="button"
                            variant="outline"
                            aria-label={`Supprimer : ${n.title}`}
                            disabled={removeDraft.isPending}
                            onClick={() => setDraftToDelete(n)}
                            className="px-3.5"
                          >
                            <Icon name="delete" className="text-[18px]" /> Supprimer
                          </Button>
                          <Button
                            type="button"
                            aria-label={`Publier : ${n.title}`}
                            disabled={publishDraft.pending}
                            onClick={() => publishDraft.publish(n)}
                            className="px-3.5"
                          >
                            Publier
                          </Button>
                        </div>
                      )}
                    </Td>
                  )}
                </Tr>
              );
            })}
          </DataTable>
        )}
      </ModuleCard>

      <NewsReader
        news={readingNews}
        onClose={() => setReadingNews(null)}
        onEdit={
          readingNews && canEditPublishedNews(role, email, readingNews)
            ? (n) => {
                setReadingNews(null);
                startEdit(n);
              }
            : undefined
        }
        onDelete={
          readingNews && isAdmin && canEditPublishedNews(role, email, readingNews)
            ? (n) => {
                setReadingNews(null);
                deleteNewsAction.request(n, openerRef.current);
              }
            : undefined
        }
      />
      {deleteNewsAction.confirmDialog}
      <NewsDraftDialog
        email={email}
        fallbackName={name}
        draft={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        returnFocusRef={openerRef}
      />
      {publishDraft.confirmDialog}
      <ConfirmDialog
        open={!!draftToDelete}
        onOpenChange={(o) => !o && setDraftToDelete(null)}
        title="Supprimer le brouillon"
        message={draftToDelete ? `Supprimer le brouillon « ${draftToDelete.title} » ?` : ""}
        confirmLabel="Supprimer le brouillon"
        pending={removeDraft.isPending}
        onConfirm={() => draftToDelete && removeDraft.mutate(draftToDelete)}
      />
    </div>
  );
}
