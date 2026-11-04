import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable, ListFooter, Td, Tr, type DataColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { FilterBar, FilterChips, FilterSelect, SearchField } from "@/components/filter-bar";
import { BulkImportDialog } from "@/components/manage/bulk-import";
import { ManageTabs } from "@/components/manage/manage-tabs";
import { UserAddDialog } from "@/components/manage/user-add-dialog";
import { UserEditDialog } from "@/components/manage/user-edit-dialog";
import {
  formatDay,
  longDate,
  minDepartureDate,
  ROLE_LABELS,
  selectableTeamNames,
  setDepartureDate,
  useAllowedUsers,
  useRefreshUsers,
  useTeams,
  userDisplayName,
  type AppRole,
  type UserRow,
} from "@/components/manage/users-data";
import { ModuleCard } from "@/components/module-card";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { InfoTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import { countAttachmentDeletionQueue, processAttachmentDeletionQueue } from "@/lib/dashboard";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { plural } from "@/lib/plural";
import { dateValue, useTableSort } from "@/lib/table-sort";

type RoleFilter = "all" | AppRole;

const ROLE_ICONS: Record<AppRole, string> = {
  admin: "shield_person",
  manager: "supervisor_account",
  collaborateur: "person",
};

const COLUMNS: DataColumn[] = [
  { label: "Utilisateur", sortKey: "nom" },
  { label: "Rôle", className: "w-[180px]", sortKey: "role" },
  { label: "Équipe", className: "w-[200px]", sortKey: "equipe" },
  { label: "Ajouté le", className: "w-[160px]", sortKey: "date" },
  { label: "Actions", className: "w-[300px] text-right" },
];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** Page Gestion « Utilisateurs » (maquette) : liste filtrable, ajout, import CSV, modification, retrait d'accès. */
export function UsersModule({ me }: { me: string }) {
  const qc = useQueryClient();
  const refresh = useRefreshUsers();
  const list = useAllowedUsers();
  const teams = useTeams();
  const selectable = selectableTeamNames(teams.data);
  const [filter, setFilter] = useState<RoleFilter>("all");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [retiring, setRetiring] = useState<UserRow | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const adminCount = all.filter((u) => u.role === "admin").length;
  const needle = query.trim().toLowerCase();
  const filtered = all.filter(
    (u) =>
      (filter === "all" || u.role === filter) &&
      (!team || (u.role === "collaborateur" ? u.team === team : u.teams.includes(team))) &&
      (!needle ||
        userDisplayName(u).toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle)),
  );
  const sort = useTableSort(filtered, {
    nom: (u) => userDisplayName(u),
    role: (u) => ROLE_LABELS[u.role],
    equipe: (u) => (u.role === "collaborateur" ? u.team : u.teams.join(", ")),
    date: (u) => dateValue(u.created_at),
  });
  const shown = sort.rows.slice(0, limit);
  const minDeparture = minDepartureDate();

  const queue = useQuery({
    queryKey: ["attachment_deletion_queue"],
    queryFn: countAttachmentDeletionQueue,
  });
  const retry = useMutation({
    mutationFn: processAttachmentDeletionQueue,
    onSuccess: (r) => {
      if (r.remaining > 0) toast.error(`${r.remaining} document(s) n'ont pas pu être supprimés.`);
      else toast.success(`${r.deleted} document(s) supprimé(s)`);
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["attachment_deletion_queue"] }),
  });

  const retire = useMutation({
    mutationFn: setDepartureDate,
    onSuccess: (d) => {
      toast.success(d ? `Départ programmé le ${formatDay(d)}` : "Départ annulé");
      refresh();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
    onSettled: () => setRetiring(null),
  });

  function startRetire(u: UserRow) {
    if (u.departure_date && u.departure_date <= minDeparture) {
      toast.info(`Départ déjà programmé le ${formatDay(u.departure_date)}`);
      return;
    }
    setEditOpen(false);
    setRetiring(u);
  }

  function changeFilter(next: RoleFilter) {
    setFilter(next);
    setLimit(LIST_PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        summary="Gérer les personnes autorisées à se connecter et leurs équipes. Réservé aux admins."
        actions={
          <>
            <BulkImportDialog
              onImported={refresh}
              trigger={
                <Button type="button" variant="outline">
                  <Icon name="upload_file" className="text-[18px]" /> Importer un fichier CSV
                </Button>
              }
            />
            <UserAddDialog
              teams={selectable}
              trigger={
                <Button type="button">
                  <Icon name="add" className="text-[18px]" /> Ajouter un utilisateur
                </Button>
              }
            />
          </>
        }
      />
      <ManageTabs />

      {(queue.data ?? 0) > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-error">{queue.data} document(s) en attente de suppression</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => retry.mutate()}
            disabled={retry.isPending}
          >
            {retry.isPending ? "…" : "Réessayer"}
          </Button>
        </div>
      )}

      {list.data && (
        <p className="text-base text-foreground">
          {plural(adminCount, "admin", "admins")} ·{" "}
          {plural(all.length, "utilisateur", "utilisateurs")} au total. Chaque personne choisit son
          rôle à sa première connexion ; tu peux le modifier ici. Un import accepte 500 lignes au
          maximum.
        </p>
      )}

      <FilterBar
        chips={
          <FilterChips
            label="Filtrer par rôle"
            value={filter}
            onChange={changeFilter}
            options={[
              { id: "all", label: "Tous" },
              { id: "admin", label: "Admins" },
              { id: "manager", label: "Managers" },
              { id: "collaborateur", label: "Collaborateurs" },
            ]}
          />
        }
        right={
          <>
            <SearchField
              id="utilisateurs-recherche"
              label="Rechercher un utilisateur"
              placeholder="Rechercher un utilisateur…"
              value={query}
              onChange={(v) => {
                setQuery(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
            <FilterSelect
              id="utilisateurs-equipe"
              label="Filtrer par équipe"
              prefix="Équipe"
              value={team}
              options={selectable.map((t) => ({ value: t, label: t }))}
              onChange={(v) => {
                setTeam(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
          </>
        }
      />

      <ModuleCard
        id="utilisateurs-liste"
        icon="group"
        title="Liste des utilisateurs autorisés"
        counter={list.data ? plural(all.length, "utilisateur", "utilisateurs") : undefined}
        footer={
          list.data && filtered.length > 0 ? (
            <ListFooter
              label={`${plural(shown.length, "utilisateur affiché", "utilisateurs affichés")} sur ${filtered.length.toLocaleString("fr-FR")}`}
              hasMore={filtered.length > limit}
              onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
            />
          ) : undefined
        }
      >
        {list.isLoading && <LoadingState label="Chargement des utilisateurs…" />}
        {list.isError && (
          <ErrorState
            message="Impossible de charger les utilisateurs. Réessaie dans un instant."
            onRetry={() => void list.refetch()}
          />
        )}
        {list.data && all.length === 0 && (
          <EmptyState message="Aucun utilisateur pour le moment." />
        )}
        {list.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState message="Aucun utilisateur ne correspond à ces filtres." />
        )}
        {shown.length > 0 && (
          <DataTable
            label="Liste des utilisateurs"
            columns={COLUMNS}
            sort={sort.sort}
            onSort={sort.onSort}
          >
            {shown.map((u) => {
              const name = userDisplayName(u);
              const isMe = u.email === me;
              return (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-primary wrap-anywhere">
                        {name}
                        {isMe && " (toi)"}
                      </span>
                      {u.departure_date && <InfoTag>Part le {formatDay(u.departure_date)}</InfoTag>}
                    </div>
                    {name !== u.email && (
                      <div className="font-label-sm text-xs text-on-surface-variant wrap-anywhere">
                        {u.email}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                      <Icon name={ROLE_ICONS[u.role]} className="text-[18px]" />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </Td>
                  <Td>
                    <span className="text-sm text-primary wrap-anywhere">
                      {u.role === "collaborateur"
                        ? (u.team ?? "Aucune équipe définie")
                        : u.role === "manager" && u.teams.length > 0
                          ? u.teams.join(", ")
                          : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      {longDate(u.created_at)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        aria-haspopup="dialog"
                        aria-label={`Modifier ${name}`}
                        onClick={(e) => {
                          openerRef.current = e.currentTarget;
                          setEditing(u);
                          setEditOpen(true);
                        }}
                        className="px-3.5"
                      >
                        <Icon name="edit" className="text-[18px]" /> Modifier
                      </Button>
                      {u.departure_date && (
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Annuler le départ de ${name}`}
                          disabled={retire.isPending}
                          onClick={() => retire.mutate({ id: u.id, date: null })}
                          className="px-3.5"
                        >
                          <Icon name="event_busy" className="text-[18px]" /> Annuler le départ
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        aria-haspopup="dialog"
                        aria-label={`Retirer l'accès de ${name}`}
                        disabled={isMe || retire.isPending}
                        title={isMe ? "Tu ne peux pas programmer ton propre départ" : undefined}
                        onClick={(e) => {
                          openerRef.current = e.currentTarget;
                          startRetire(u);
                        }}
                        className="px-3.5"
                      >
                        <Icon name="person_remove" className="text-[18px]" /> Retirer l'accès
                      </Button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </DataTable>
        )}
      </ModuleCard>

      <UserEditDialog
        user={editing}
        open={editOpen}
        onOpenChange={setEditOpen}
        returnFocusRef={openerRef}
        teams={selectable}
        me={me}
        onRetire={startRetire}
      />
      <ConfirmDialog
        open={!!retiring}
        onOpenChange={(o) => !o && setRetiring(null)}
        title="Retirer l'accès"
        message={
          retiring
            ? `Retirer l'accès de ${retiring.email} ? Son accès sera supprimé le ${formatDay(minDeparture)}, dans 7 jours. Son manager et les admins sont prévenus dès maintenant et pourront télécharger ses documents d'ici là. Tu peux annuler avec « Annuler le départ ».`
            : ""
        }
        confirmLabel="Retirer l'accès"
        pending={retire.isPending}
        onConfirm={() => retiring && retire.mutate({ id: retiring.id, date: minDeparture })}
      />
    </div>
  );
}
