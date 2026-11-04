import { useMutation } from "@tanstack/react-query";
import { useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable, ListFooter, Td, Tr, type DataColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { FilterBar, FilterChips, SearchField } from "@/components/filter-bar";
import { Field, FormActions, TextInput } from "@/components/manage/crud-ui";
import { ManageTabs } from "@/components/manage/manage-tabs";
import {
  createTeam,
  deleteTeam,
  longDate,
  renameTeam,
  teamSchema,
  useAllowedUsers,
  useRefreshUsers,
  useTeams,
  userDisplayName,
  type TeamRow,
} from "@/components/manage/users-data";
import { ModuleCard } from "@/components/module-card";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { FormDialog } from "@/components/modules/form-dialog";
import { PageHeader, SummaryLink } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { plural } from "@/lib/plural";
import { dateValue, useTableSort } from "@/lib/table-sort";

type ManagerFilter = "all" | "without" | "with";

const COLUMNS: DataColumn[] = [
  { label: "Équipe", sortKey: "nom" },
  { label: "Managers", className: "w-[260px]" },
  { label: "Membres", className: "w-[140px]", sortKey: "membres" },
  { label: "Créée le", className: "w-[160px]", sortKey: "date" },
  { label: "Actions", className: "w-[260px] text-right" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** Page Gestion « Équipes » (maquette) : liste filtrable, ajout, renommage, suppression. */
export function TeamsModule() {
  const refresh = useRefreshUsers();
  const teams = useTeams();
  const users = useAllowedUsers();
  const [filter, setFilter] = useState<ManagerFilter>("all");
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const [renaming, setRenaming] = useState<TeamRow | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleting, setDeleting] = useState<TeamRow | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const all = useMemo(() => teams.data ?? [], [teams.data]);
  const people = useMemo(() => users.data ?? [], [users.data]);
  const managersOf = (t: string) =>
    people.filter((u) => u.role === "manager" && u.teams.includes(t)).map(userDisplayName);
  const membersOf = (t: string) =>
    people.filter(
      (u) =>
        (u.role === "collaborateur" && u.team === t) ||
        (u.role === "manager" && u.teams.includes(t)),
    ).length;
  const withoutManager = (t: TeamRow) => !t.is_reserved && managersOf(t.name).length === 0;
  const withoutCount = users.data ? all.filter(withoutManager).length : 0;

  const needle = query.trim().toLowerCase();
  const filtered = all.filter(
    (t) =>
      (filter === "all" ||
        (filter === "without" ? withoutManager(t) : !t.is_reserved && !withoutManager(t))) &&
      (!needle || t.name.toLowerCase().includes(needle)),
  );
  const sort = useTableSort(filtered, {
    nom: (t) => t.name,
    membres: (t) => membersOf(t.name),
    date: (t) => dateValue(t.created_at),
  });
  const shown = sort.rows.slice(0, limit);
  const loading = teams.isLoading || users.isLoading;
  const failed = teams.isError || users.isError;

  const remove = useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      toast.success("Équipe supprimée");
      refresh();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setDeleting(null),
  });

  function changeFilter(next: ManagerFilter) {
    setFilter(next);
    setLimit(LIST_PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipes"
        summary="Gérer les personnes autorisées à se connecter et leurs équipes. Réservé aux admins."
        actions={
          <TeamFormDialog
            trigger={
              <Button type="button">
                <Icon name="add" className="text-[18px]" /> Ajouter une équipe
              </Button>
            }
          />
        }
      />
      <ManageTabs />

      {teams.data && users.data && (
        <p className="text-base text-foreground">
          {withoutCount > 0 ? (
            <SummaryLink onClick={() => changeFilter("without")}>
              {withoutCount} sans manager
            </SummaryLink>
          ) : (
            <span className="font-semibold text-primary">Aucune équipe sans manager</span>
          )}{" "}
          · {plural(all.length, "équipe", "équipes")} au total. Une équipe sans manager ne peut pas
          voir ses demandes tranchées par un manager : l'admin les traite.
        </p>
      )}

      <FilterBar
        chips={
          <FilterChips
            label="Filtrer par présence d'un manager"
            value={filter}
            onChange={changeFilter}
            options={[
              { id: "all", label: "Toutes" },
              { id: "without", label: "Sans manager" },
              { id: "with", label: "Avec manager" },
            ]}
          />
        }
        right={
          <SearchField
            id="equipes-recherche"
            label="Rechercher une équipe"
            placeholder="Rechercher une équipe…"
            value={query}
            onChange={(v) => {
              setQuery(v);
              setLimit(LIST_PAGE_SIZE);
            }}
          />
        }
      ></FilterBar>

      <ModuleCard
        id="equipes-liste"
        icon="groups"
        title="Liste des équipes"
        counter={users.data && teams.data ? `${withoutCount} sans manager` : undefined}
        footer={
          teams.data && filtered.length > 0 ? (
            <ListFooter
              label={`${plural(shown.length, "équipe affichée", "équipes affichées")} sur ${filtered.length.toLocaleString("fr-FR")}`}
              hasMore={filtered.length > limit}
              onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
            />
          ) : undefined
        }
      >
        {loading && <LoadingState label="Chargement des équipes…" />}
        {failed && (
          <ErrorState
            message="Impossible de charger les équipes. Réessaie dans un instant."
            onRetry={() => {
              void teams.refetch();
              void users.refetch();
            }}
          />
        )}
        {teams.data && users.data && all.length === 0 && (
          <EmptyState message="Aucune équipe pour le moment." />
        )}
        {teams.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState message="Aucune équipe ne correspond à ces filtres." />
        )}
        {shown.length > 0 && users.data && (
          <DataTable
            label="Liste des équipes"
            columns={COLUMNS}
            sort={sort.sort}
            onSort={sort.onSort}
          >
            {shown.map((t) => {
              const managers = managersOf(t.name);
              return (
                <Tr key={t.name}>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-base font-semibold text-primary wrap-anywhere">
                      {t.is_reserved && <Icon name="lock" className="text-[18px]" />}
                      {t.name}
                      {t.is_reserved && <span className="sr-only"> (équipe réservée)</span>}
                    </span>
                  </Td>
                  <Td>
                    {t.is_reserved ? (
                      <span className="text-sm text-primary">—</span>
                    ) : managers.length === 0 ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                        <Icon name="warning" className="text-[18px]" />
                        Aucun manager
                      </span>
                    ) : (
                      <span className="text-sm text-primary wrap-anywhere">
                        {managers.join(", ")}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="text-sm text-primary">
                      {plural(membersOf(t.name), "membre", "membres")}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      {longDate(t.created_at)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    {!t.is_reserved && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          aria-haspopup="dialog"
                          aria-label={`Modifier l'équipe ${t.name}`}
                          onClick={(e) => {
                            openerRef.current = e.currentTarget;
                            setRenaming(t);
                            setRenameOpen(true);
                          }}
                          className="px-3.5"
                        >
                          <Icon name="edit" className="text-[18px]" /> Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          aria-haspopup="dialog"
                          aria-label={`Supprimer l'équipe ${t.name}`}
                          disabled={remove.isPending}
                          onClick={(e) => {
                            openerRef.current = e.currentTarget;
                            setDeleting(t);
                          }}
                          className="px-3.5"
                        >
                          <Icon name="delete" className="text-[18px]" /> Supprimer
                        </Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        )}
      </ModuleCard>

      <TeamFormDialog
        team={renaming}
        open={renameOpen}
        onOpenChange={setRenameOpen}
        returnFocusRef={openerRef}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Supprimer l'équipe"
        message={deleting ? `Supprimer l'équipe « ${deleting.name} » ?` : ""}
        confirmLabel="Supprimer l'équipe"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.name)}
      />
    </div>
  );
}

/** Fenêtre « Ajouter une équipe » (avec `trigger`) ou « Modifier l'équipe » (`team`, pilotée par la page). */
function TeamFormDialog({
  team = null,
  trigger,
  open: openProp,
  onOpenChange,
  returnFocusRef,
}: {
  team?: TeamRow | null;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const [inner, setInner] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : inner;
  const setOpen = (o: boolean) => (controlled ? onOpenChange?.(o) : setInner(o));
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={team ? "Modifier l'équipe" : "Ajouter une équipe"}
      description={team ? "Renomme l'équipe." : "Donne un nom à la nouvelle équipe."}
      trigger={trigger}
      returnFocusRef={returnFocusRef}
    >
      <TeamForm key={team?.name ?? "new"} team={team} onDone={() => setOpen(false)} />
    </FormDialog>
  );
}

function TeamForm({ team, onDone }: { team: TeamRow | null; onDone: () => void }) {
  const id = useId();
  const refresh = useRefreshUsers();
  const [name, setName] = useState(team?.name ?? "");
  const [err, setErr] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (n: string) => (team ? renameTeam({ from: team.name, to: n }) : createTeam(n)),
    onSuccess: () => {
      toast.success(team ? "Équipe renommée" : "Équipe ajoutée");
      refresh();
      onDone();
    },
    onError: (e: unknown) => setErr((e as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = teamSchema.safeParse(name);
    if (!p.success) return setErr(p.error.issues[0].message);
    setErr(null);
    save.mutate(p.data);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <Field label="Nom de l'équipe (obligatoire)" htmlFor={`${id}-nom`} error={err ?? undefined}>
        <TextInput
          id={`${id}-nom`}
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <FormActions pending={save.isPending} submitLabel="Enregistrer" onCancel={onDone} />
    </form>
  );
}
