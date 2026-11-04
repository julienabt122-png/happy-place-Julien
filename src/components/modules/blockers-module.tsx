import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable, ListFooter, Td, Tr, type DataColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { FilterBar, FilterChips, FilterSelect, SearchField } from "@/components/filter-bar";
import { ModuleCard } from "@/components/module-card";
import { PageHeader, SummaryLink } from "@/components/page-header";
import { BlockerFormDialog } from "@/components/modules/blocker-form-dialog";
import { BlockerReader } from "@/components/modules/blocker-reader";
import { ModerationDialog } from "@/components/modules/moderation-dialog";
import { BlockerStatusTag, SeverityTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { useTableSort } from "@/lib/table-sort";
import { fetchAllBlockers, type Blocker } from "@/lib/dashboard";
import { masquerElement, reafficherElement, supprimerDefinitivement } from "@/lib/moderation";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { plural } from "@/lib/plural";

type StatusFilter = "all" | "open" | "progress" | "resolved";

// Les valeurs enregistrées en base restent OUVERT, EN COURS, SURVEILLANCE, RÉSOLU.
const STATUS_BY_FILTER: Record<Exclude<StatusFilter, "all">, string> = {
  open: "OUVERT",
  progress: "EN COURS",
  resolved: "RÉSOLU",
};

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critique" },
  { value: "warning", label: "Attention" },
  { value: "info", label: "Information" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** Rangs pour le tri par gravité : du plus grave au moins grave, puis du plus urgent au résolu. */
const SEVERITY_RANK: Record<string, number> = { critical: 0, warning: 1, info: 2 };
const STATUS_RANK: Record<string, number> = {
  OUVERT: 0,
  "EN COURS": 1,
  SURVEILLANCE: 2,
  RÉSOLU: 3,
};

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

export function BlockersModule({ role }: { role: AppRole }) {
  const qc = useQueryClient();
  // Écriture réservée à l'admin (la base refuse les autres rôles) : eux ne voient aucune action.
  const isAdmin = role === "admin";
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const [reading, setReading] = useState<Blocker | null>(null);
  const [editing, setEditing] = useState<Blocker | null>(null);
  const [cible, setCible] = useState<Blocker | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const list = useQuery({ queryKey: ["blockers", "all"], queryFn: fetchAllBlockers, retry: false });

  // Modération : un point bloquant visible est d'abord masqué ; masqué, il peut être supprimé ou réaffiché.
  const action = useMutation({
    mutationFn: ({ b, motif }: { b: Blocker; motif: string }) =>
      b.masque_le
        ? supprimerDefinitivement("point_bloquant", b.id, motif)
        : masquerElement("point_bloquant", b.id, motif),
    onSuccess: (_r, { b }) => {
      toast.success(b.masque_le ? "Point bloquant supprimé" : "Point bloquant masqué");
      qc.invalidateQueries({ queryKey: ["blockers"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setCible(null),
  });

  const reafficher = useMutation({
    mutationFn: (b: Blocker) => reafficherElement("point_bloquant", b.id),
    onSuccess: () => {
      toast.success("Point bloquant réaffiché");
      qc.invalidateQueries({ queryKey: ["blockers"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setCible(null),
  });

  const all = useMemo(() => list.data ?? [], [list.data]);
  const openCount = all.filter((b) => b.status === "OUVERT").length;
  const needle = query.trim().toLowerCase();
  const filtered = all.filter(
    (b) =>
      (filter === "all" || b.status === STATUS_BY_FILTER[filter]) &&
      (!severity || b.severity === severity) &&
      (!needle ||
        b.title.toLowerCase().includes(needle) ||
        (b.description ?? "").toLowerCase().includes(needle) ||
        b.department.toLowerCase().includes(needle)),
  );
  const sort = useTableSort(filtered, {
    titre: (b) => b.title,
    gravite: (b) => (SEVERITY_RANK[b.severity] ?? 9) * 10 + (STATUS_RANK[b.status] ?? 9),
  });
  const shown = sort.rows.slice(0, limit);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setLimit(LIST_PAGE_SIZE);
  }

  const columns: DataColumn[] = [
    { label: "Point bloquant", sortKey: "titre" },
    { label: "Criticité et statut", className: "w-[176px]", sortKey: "gravite" },
    ...(isAdmin ? [{ label: "Actions", className: "w-[256px] text-right" }] : []),
  ];

  const createButton = (
    <BlockerFormDialog
      trigger={
        <Button type="button">
          <Icon name="add" className="text-[20px]" /> Ajouter un point bloquant
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Points bloquants"
        actions={isAdmin ? createButton : undefined}
        summary={
          list.data && (
            <>
              {openCount > 0 ? (
                <SummaryLink onClick={() => changeFilter("open")}>
                  {plural(openCount, "ouvert", "ouverts")}
                </SummaryLink>
              ) : (
                <span className="font-semibold text-primary">Aucun point ouvert</span>
              )}{" "}
              · {plural(all.length, "point bloquant", "points bloquants")} au total
            </>
          )
        }
      />

      <FilterBar
        chips={
          <FilterChips
            label="Filtrer par statut"
            value={filter}
            onChange={changeFilter}
            options={[
              { id: "all", label: "Tous" },
              { id: "open", label: "Ouverts" },
              { id: "progress", label: "En cours" },
              { id: "resolved", label: "Résolus" },
            ]}
          />
        }
        right={
          <>
            <SearchField
              id="blockers-recherche"
              label="Rechercher un point bloquant"
              placeholder="Rechercher un point bloquant…"
              value={query}
              onChange={(v) => {
                setQuery(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
            <FilterSelect
              id="blockers-criticite"
              label="Filtrer par criticité"
              prefix="Criticité"
              value={severity}
              options={SEVERITY_OPTIONS}
              onChange={(v) => {
                setSeverity(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
          </>
        }
      />

      <ModuleCard
        main
        icon="warning"
        title="Liste des points bloquants"
        counter={list.data ? plural(openCount, "ouvert", "ouverts") : undefined}
        counterTone="dark"
        footer={
          list.data && filtered.length > 0 ? (
            <ListFooter
              label={`${plural(shown.length, "point bloquant affiché", "points bloquants affichés")} sur ${filtered.length.toLocaleString("fr-FR")}`}
              hasMore={filtered.length > limit}
              onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
            />
          ) : undefined
        }
      >
        {list.isLoading && <LoadingState label="Chargement des points bloquants…" />}
        {list.isError && (
          <ErrorState
            message="Impossible de charger les points bloquants. Réessaie dans un instant."
            onRetry={() => void list.refetch()}
          />
        )}
        {list.data && all.length === 0 && (
          <EmptyState
            message="Aucun point bloquant pour le moment."
            action={isAdmin ? createButton : undefined}
          />
        )}
        {list.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState message="Aucun point bloquant ne correspond à ces filtres." />
        )}
        {shown.length > 0 && (
          <DataTable
            label="Liste des points bloquants"
            columns={columns}
            sort={sort.sort}
            onSort={sort.onSort}
          >
            {shown.map((b) => (
              <Tr key={b.id}>
                <Td>
                  <div className="min-w-0">
                    <h3 className="mb-1 text-base font-semibold text-primary wrap-anywhere">
                      {b.title}
                    </h3>
                    <div className="mb-1.5 font-label-sm text-xs text-on-surface-variant">
                      {b.department} · {longDate(b.created_at ?? b.updated_at)}
                    </div>
                    {b.description && (
                      <p className="mb-2 line-clamp-1 text-sm leading-relaxed text-on-surface-variant wrap-anywhere">
                        {b.description}
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      aria-haspopup="dialog"
                      aria-label={`Voir le détail : ${b.title}`}
                      onClick={() => setReading(b)}
                      className="-ml-3"
                    >
                      Voir le détail
                    </Button>
                  </div>
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-2">
                    <SeverityTag severity={b.severity} />
                    <BlockerStatusTag status={b.status} />
                  </div>
                </Td>
                {isAdmin && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={`Modifier : ${b.title}`}
                        onClick={() => setEditing(b)}
                        className="px-3.5"
                      >
                        <Icon name="edit" className="text-[18px]" /> Modifier
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={
                          b.masque_le
                            ? `Supprimer définitivement : ${b.title}`
                            : `Masquer : ${b.title}`
                        }
                        aria-haspopup="dialog"
                        onClick={(e) => {
                          openerRef.current = e.currentTarget;
                          setCible(b);
                        }}
                        className="px-3.5"
                      >
                        <Icon
                          name={b.masque_le ? "delete" : "visibility_off"}
                          className="text-[18px]"
                        />{" "}
                        {b.masque_le ? "Supprimer" : "Masquer"}
                      </Button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </DataTable>
        )}
      </ModuleCard>

      <BlockerReader
        blocker={reading}
        onClose={() => setReading(null)}
        onModerate={
          isAdmin
            ? (b) => {
                setReading(null);
                setCible(b);
              }
            : undefined
        }
      />
      {editing && (
        <BlockerFormDialog blocker={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
      <ModerationDialog
        open={!!cible}
        onOpenChange={(o) => !o && !action.isPending && setCible(null)}
        mode={cible?.masque_le ? "supprimer" : "masquer"}
        titre={cible?.title ?? ""}
        pending={action.isPending || reafficher.isPending}
        onConfirm={(motif) => cible && action.mutate({ b: cible, motif })}
        onReafficher={cible?.masque_le ? () => cible && reafficher.mutate(cible) : undefined}
        returnFocusRef={openerRef}
      />
    </div>
  );
}
