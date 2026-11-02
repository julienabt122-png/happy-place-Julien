import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AttachmentLink } from "@/components/attachment-link";
import { EmptyState } from "@/components/empty-state";
import { Linkify } from "@/components/linkify";
import { ModuleCard } from "@/components/module-card";
import { SubmitIdeaAction } from "@/components/modules/submit-idea";
import {
  canModerateSubmission,
  useExportReport,
  useMyTeams,
  useSubmissionReview,
} from "@/components/modules/submission-actions";
import { STATUS_LABELS, StatusTag } from "@/components/status-tag";
import { SubmissionReader } from "@/components/submission-reader";
import type { AppRole } from "@/lib/auth";
import { fetchAllSubmissions, type Submission } from "@/lib/dashboard";
import { plural } from "@/lib/plural";

const PAGE = 10;

type StatusFilter = "all" | "pending" | "validated" | "refused";

const STATUS_BY_FILTER: Record<Exclude<StatusFilter, "all">, string> = {
  pending: "en attente",
  validated: "validée",
  refused: "refusée",
};

const FIELD =
  "h-11 rounded-[4px] border border-outline bg-card px-3 font-label-md text-[13px] text-primary";

export function SubmissionsModule({ role, email }: { role: AppRole; email: string }) {
  const isAdmin = role === "admin";
  const myTeams = useMyTeams(role, email);
  const [reading, setReading] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState("");
  const [limit, setLimit] = useState(PAGE);

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

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setLimit(PAGE);
  }

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "Toutes" },
    { id: "pending", label: canReview ? "À traiter" : "En attente" },
    { id: "validated", label: "Validées" },
    { id: "refused", label: "Refusées" },
  ];

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-[32px] font-semibold leading-tight text-primary">
            Demandes
          </h1>
          <div className="flex items-center gap-4">
            <button
              type="button"
              disabled={exportReport.isPending}
              onClick={() => exportReport.mutate()}
              className="flex h-11 items-center gap-2 rounded-[4px] border border-primary bg-transparent px-4 text-sm font-semibold text-primary hover:bg-secondary disabled:opacity-50"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                download
              </span>
              {exportReport.isPending ? "Export en cours…" : "Exporter"}
            </button>
            <SubmitIdeaAction
              role={role}
              email={email}
              className="flex h-11 items-center gap-2 rounded-[4px] bg-primary px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#4F5252]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                add
              </span>
              Faire une demande
            </SubmitIdeaAction>
          </div>
        </div>
        {list.data && (
          <p className="text-base text-foreground">
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => changeFilter("pending")}
                className="rounded-[4px] font-semibold text-primary underline"
              >
                {plural(pendingCount, "demande", "demandes")} {pendingLabel}
              </button>
            ) : (
              <span className="font-semibold text-primary">Aucune demande {pendingLabel}</span>
            )}{" "}
            · {plural(all.length, "demande", "demandes")} au total
          </p>
        )}
      </section>

      <section aria-label="Filtres" className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="group"
          aria-label="Filtrer par statut"
          className="flex flex-wrap items-center gap-2"
        >
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => changeFilter(f.id)}
              className={`h-11 rounded-[4px] px-4 font-label-md text-[13px] text-primary transition-colors hover:bg-secondary ${
                filter === f.id
                  ? "border-2 border-primary bg-secondary font-semibold"
                  : "border border-outline bg-card font-medium"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-11 w-[280px] max-w-full items-center gap-2 rounded-[4px] border border-outline bg-card px-3">
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-[22px] text-on-surface-variant"
            >
              search
            </span>
            <label htmlFor="demandes-recherche" className="sr-only">
              Rechercher une demande
            </label>
            <input
              id="demandes-recherche"
              type="search"
              value={query}
              placeholder="Rechercher une demande…"
              onChange={(e) => {
                setQuery(e.target.value);
                setLimit(PAGE);
              }}
              className="w-full bg-transparent font-label-md text-[13px] text-primary placeholder:text-on-surface-variant"
            />
          </div>
          <div>
            <label htmlFor="demandes-equipe" className="sr-only">
              Filtrer par équipe
            </label>
            <select
              id="demandes-equipe"
              value={team}
              onChange={(e) => {
                setTeam(e.target.value);
                setLimit(PAGE);
              }}
              className={FIELD}
            >
              <option value="">Équipe : Toutes</option>
              {teams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <ModuleCard
        main
        icon="inbox"
        title="Liste des demandes"
        counter={pendingCount > 0 ? `${pendingCount} ${pendingLabel}` : undefined}
        counterTone="dark"
        footer={
          list.data && filtered.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-label-sm text-xs font-medium text-on-surface-variant">
                {plural(shown.length, "demande affichée", "demandes affichées")} sur{" "}
                {filtered.length.toLocaleString("fr-FR")}
              </p>
              {filtered.length > limit && (
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE)}
                  className="h-11 rounded-[4px] border border-primary bg-transparent px-5 text-sm font-semibold text-primary hover:bg-secondary"
                >
                  Afficher plus
                </button>
              )}
            </div>
          ) : undefined
        }
      >
        {list.isLoading && <p className="p-6 text-base text-on-surface-variant">Chargement…</p>}
        {list.isError && (
          <div role="alert" className="flex flex-wrap items-center gap-3 p-6 text-error">
            <span aria-hidden="true" className="material-symbols-outlined">
              error
            </span>
            <p className="text-base">Les demandes sont indisponibles.</p>
            <button
              type="button"
              onClick={() => void list.refetch()}
              className="h-11 rounded-[4px] border border-primary px-4 text-sm font-semibold text-primary hover:bg-secondary"
            >
              Réessayer
            </button>
          </div>
        )}
        {list.data && all.length === 0 && (
          <EmptyState
            message="Aucune demande pour le moment."
            action={
              <SubmitIdeaAction
                role={role}
                email={email}
                className="h-11 rounded-[4px] bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-[#4F5252]"
              >
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
                  {s.status === "refusée" && s.rejection_category && (
                    <p className="mb-1.5 font-label-sm text-xs text-on-surface-variant">
                      Motif : {s.rejection_category}
                    </p>
                  )}
                  <AttachmentLink path={s.attachment_path} name={s.attachment_name} />
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    aria-label={`Voir le détail : demande de ${s.author_name}`}
                    onClick={() => setReading(s)}
                    className="-ml-3 inline-flex h-11 items-center rounded-[4px] px-3 text-sm font-semibold text-primary underline hover:bg-secondary"
                  >
                    Voir le détail
                  </button>
                </div>
                <div className="w-[120px] shrink-0 pt-0.5">
                  <StatusTag status={s.status} />
                </div>
                {canReview && (
                  <div className="flex w-[176px] shrink-0 items-center justify-end gap-2 pt-0.5">
                    {canModerate(s) && (
                      <>
                        <button
                          type="button"
                          onClick={() => startReject(s)}
                          className="h-11 rounded-[4px] border border-primary bg-transparent px-3.5 text-sm font-semibold text-primary hover:bg-secondary"
                        >
                          Refuser
                        </button>
                        <button
                          type="button"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: s.id, status: "validée" })}
                          className="h-11 rounded-[4px] bg-primary px-3.5 text-sm font-semibold text-on-primary hover:bg-[#4F5252] disabled:opacity-50"
                        >
                          Valider
                        </button>
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
