import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AttachmentLink } from "@/components/attachment-link";
import { ListFooter } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { FilterBar, FilterChips, FilterSelect, SearchField } from "@/components/filter-bar";
import { Linkify } from "@/components/linkify";
import { ModuleCard } from "@/components/module-card";
import { PageHeader, SummaryLink } from "@/components/page-header";
import { SubmitIdeaAction } from "@/components/modules/submit-idea";
import {
  canModerateSubmission,
  useExportReport,
  useMyTeams,
  useSubmissionReview,
} from "@/components/modules/submission-actions";
import { STATUS_LABELS, StatusTag } from "@/components/status-tag";
import { SubmissionReader } from "@/components/submission-reader";
import { SubmissionTracking } from "@/components/submission-tracking";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { fetchAllSubmissions, type Submission } from "@/lib/dashboard";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { plural } from "@/lib/plural";
import { useDeciders, useDecisions } from "@/lib/use-submission-tracking";

type StatusFilter = "all" | "pending" | "validated" | "refused";

const STATUS_BY_FILTER: Record<Exclude<StatusFilter, "all">, string> = {
  pending: "en attente",
  validated: "validée",
  refused: "refusée",
};

export function SubmissionsModule({ role, email }: { role: AppRole; email: string }) {
  const isAdmin = role === "admin";
  const myTeams = useMyTeams(role, email);
  const [reading, setReading] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);

  const list = useQuery({
    queryKey: ["submissions", "all"],
    queryFn: fetchAllSubmissions,
    retry: false,
  });
  const exportReport = useExportReport(email);
  const { review, startReject, rejectDialog } = useSubmissionReview({
    onApproved: (id) => setReading((r) => (r?.id === id ? null : r)),
  });

  const canModerate = (s: Submission) => canModerateSubmission(role, myTeams.data ?? [], s);
  const canReview = isAdmin || role === "manager";
  const pendingLabel = canReview ? "à traiter" : "en attente";

  const all = useMemo(() => list.data ?? [], [list.data]);
  const pendingCount = all.filter((s) => s.status === "en attente").length;
  const teams = useMemo(
    () => [...new Set(all.map((s) => s.team))].sort((a, b) => a.localeCompare(b, "fr")),
    [all],
  );
  const needle = query.trim().toLowerCase();
  const filtered = all.filter(
    (s) =>
      (filter === "all" || s.status === STATUS_BY_FILTER[filter]) &&
      (!team || s.team === team) &&
      (!needle ||
        s.author_name.toLowerCase().includes(needle) ||
        s.team.toLowerCase().includes(needle) ||
        s.content.toLowerCase().includes(needle)),
  );
  const shown = filtered.slice(0, limit);

  // Suivi de MES demandes affichées : une requête pour le décideur, une lecture d'historique
  // limitée aux identifiants de mes propres demandes déjà décidées.
  const myEmail = email.toLowerCase();
  const isMine = (s: Submission) => (s.submitted_by_email ?? "").toLowerCase() === myEmail;
  const myShown = shown.filter(isMine);
  const deciders = useDeciders(myShown.some((s) => s.status === "en attente"));
  const decisionHistory = useDecisions(
    myShown.filter((s) => s.status === "validée" || s.status === "refusée").map((s) => s.id),
  );

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setLimit(LIST_PAGE_SIZE);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demandes"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              aria-label="Mes demandes en attente ou validées des 30 derniers jours, au format CSV"
              title="Mes demandes en attente ou validées des 30 derniers jours, au format CSV"
              disabled={exportReport.isPending}
              onClick={() => exportReport.mutate()}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                download
              </span>
              {exportReport.isPending ? "Export en cours…" : "Exporter mes demandes"}
            </Button>
            <SubmitIdeaAction role={role} email={email}>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                add
              </span>
              Faire une demande
            </SubmitIdeaAction>
          </>
        }
        summary={
          list.data && (
            <>
              {pendingCount > 0 ? (
                <SummaryLink onClick={() => changeFilter("pending")}>
                  {plural(pendingCount, "demande", "demandes")} {pendingLabel}
                </SummaryLink>
              ) : (
                <span className="font-semibold text-primary">Aucune demande {pendingLabel}</span>
              )}{" "}
              · {plural(all.length, "demande", "demandes")} au total
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
              { id: "all", label: "Toutes" },
              { id: "pending", label: canReview ? "À traiter" : "En attente" },
              { id: "validated", label: "Validées" },
              { id: "refused", label: "Refusées" },
            ]}
          />
        }
        right={
          <>
            <SearchField
              id="demandes-recherche"
              label="Rechercher une demande"
              placeholder="Rechercher une demande…"
              value={query}
              onChange={(v) => {
                setQuery(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
            <FilterSelect
              id="demandes-equipe"
              label="Filtrer par équipe"
              prefix="Équipe"
              value={team}
              options={teams.map((t) => ({ value: t, label: t }))}
              onChange={(v) => {
                setTeam(v);
                setLimit(LIST_PAGE_SIZE);
              }}
            />
          </>
        }
      />

      <ModuleCard
        main
        icon="inbox"
        title="Liste des demandes"
        counter={pendingCount > 0 ? `${pendingCount} ${pendingLabel}` : undefined}
        counterTone="dark"
        footer={
          list.data && filtered.length > 0 ? (
            <ListFooter
              label={`${plural(shown.length, "demande affichée", "demandes affichées")} sur ${filtered.length.toLocaleString("fr-FR")}`}
              hasMore={filtered.length > limit}
              onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
            />
          ) : undefined
        }
      >
        {list.isLoading && <LoadingState label="Chargement des demandes…" />}
        {list.isError && (
          <ErrorState
            message="Impossible de charger les demandes. Réessaie dans un instant."
            onRetry={() => void list.refetch()}
          />
        )}
        {list.data && all.length === 0 && (
          <EmptyState
            message="Aucune demande pour le moment."
            action={
              <SubmitIdeaAction role={role} email={email}>
                Faire une demande
              </SubmitIdeaAction>
            }
          />
        )}
        {list.data && all.length > 0 && filtered.length === 0 && (
          <EmptyState message="Aucune demande ne correspond à ces filtres." />
        )}
        {shown.length > 0 && (
          <ul className="divide-y divide-outline-variant">
            {shown.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-6 p-6">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="text-base font-semibold text-primary wrap-anywhere">
                      {s.author_name}
                    </span>
                    <span className="font-label-sm text-xs font-medium text-on-surface-variant">
                      {s.team} ·{" "}
                      {new Date(s.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                    </span>
                  </div>
                  <p className="mb-1.5 line-clamp-3 whitespace-pre-line text-base leading-relaxed text-foreground wrap-anywhere">
                    <Linkify text={s.content} />
                  </p>
                  <div className="mb-1.5 space-y-0.5">
                    <SubmissionTracking
                      s={s}
                      mine={isMine(s)}
                      deciders={deciders.data}
                      decision={decisionHistory.data?.[s.id]}
                    />
                  </div>
                  <AttachmentLink path={s.attachment_path} name={s.attachment_name} />
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    aria-haspopup="dialog"
                    aria-label={`Voir le détail : demande de ${s.author_name}`}
                    onClick={() => setReading(s)}
                    className="-ml-3"
                  >
                    Voir le détail
                  </Button>
                </div>
                <div className="w-[120px] shrink-0 pt-0.5">
                  <StatusTag status={s.status} />
                </div>
                {canReview && (
                  <div className="flex w-[176px] shrink-0 items-center justify-end gap-2 pt-0.5">
                    {canModerate(s) && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => startReject(s)}
                          className="px-3.5"
                        >
                          Refuser
                        </Button>
                        <Button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: s.id, status: "validée" })}
                          className="px-3.5"
                        >
                          Valider
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </ModuleCard>

      <SubmissionReader
        submission={reading}
        statusLabel={reading ? (STATUS_LABELS[reading.status] ?? reading.status) : undefined}
        onClose={() => setReading(null)}
        onReject={
          reading && canModerate(reading)
            ? () => {
                setReading(null);
                startReject(reading);
              }
            : undefined
        }
        onApprove={
          reading && canModerate(reading)
            ? () => review.mutate({ id: reading.id, status: "validée" })
            : undefined
        }
        approving={review.isPending}
      />
      {rejectDialog}
    </div>
  );
}
