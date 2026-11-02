import { useState, type ReactNode } from "react";
import { ClickableRow, RowChevron, RowMainButton } from "@/components/clickable-row";
import { EmptyState } from "@/components/empty-state";
import type { HomeDemandes, DemandesTab } from "@/components/home/use-home-demandes";
import { ModuleCard } from "@/components/module-card";
import {
  canModerateSubmission,
  useExportReport,
  useSubmissionReview,
} from "@/components/modules/submission-actions";
import { SubmitIdeaAction } from "@/components/modules/submit-idea";
import { InfoTag, STATUS_LABELS, StatusTag } from "@/components/status-tag";
import { SubmissionReader } from "@/components/submission-reader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AppRole } from "@/lib/auth";
import { timeAgo, type Submission } from "@/lib/dashboard";

/** Nombre de lignes montrées dans chaque onglet : « Voir tout » mène à /demandes. */
const PREVIEW = 3;

const BTN_PRIMARY =
  "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[4px] bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-[#4F5252]";
const BTN_SECONDARY =
  "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[4px] border border-primary bg-transparent px-4 text-sm font-semibold text-primary transition-colors hover:bg-hover-gris disabled:opacity-50";

const TAB_TRIGGER =
  "-mb-px h-11 gap-2 rounded-none rounded-t-sm border-b-2 border-transparent bg-transparent px-0 py-0 text-sm font-medium text-on-surface-variant shadow-none hover:border-[#C4C7C7] hover:text-primary focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-primary data-[state=active]:shadow-none";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** « 28 octobre 2026 à 11 h 22 » */
function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-FR", { dateStyle: "long" });
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} à ${hh} h ${mm}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });
}

function Count({ n, active = false }: { n: number | undefined; active?: boolean }) {
  return (
    <span
      className={`rounded bg-secondary px-1.5 py-0.5 font-label-sm text-xs ${
        active ? "text-primary" : "text-on-surface-variant"
      }`}
    >
      {n ?? "…"}
    </span>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-body-md text-[14px] font-semibold text-primary">{title}</h3>
      <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-xs text-primary">
        {count}
      </span>
    </div>
  );
}

function excerpt(text: string) {
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

export function DemandesCard({
  role,
  email,
  data,
  tab,
  onTabChange,
}: {
  role: AppRole;
  email: string;
  data: HomeDemandes;
  tab: DemandesTab;
  onTabChange: (tab: DemandesTab) => void;
}) {
  const canReview = role === "admin" || role === "manager";
  const [reading, setReading] = useState<Submission | null>(null);
  const [team, setTeam] = useState("");
  const exportReport = useExportReport(email);
  const { review, startReject, rejectDialog } = useSubmissionReview({
    onApproved: (id) => setReading((r) => (r?.id === id ? null : r)),
  });
  const canModerate = (s: Submission) => canModerateSubmission(role, data.myTeams.data ?? [], s);

  const myEmail = email.toLowerCase();
  const mine = data.mine.data ?? [];
  const ongoing = mine.filter((s) => s.status === "en attente");
  const decisions = mine.filter((s) => s.status !== "en attente");
  const validated = data.validated.data ?? [];
  const teams = [...new Set(validated.map((s) => s.team))].sort((a, b) => a.localeCompare(b, "fr"));
  const validatedShown = validated.filter((s) => !team || s.team === team).slice(0, PREVIEW);

  return (
    <ModuleCard
      main
      id="demandes"
      icon="inbox"
      title="Demandes"
      seeAllTo="/demandes"
      seeAllLabel="Voir tout : demandes"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <SubmitIdeaAction role={role} email={email} className={BTN_PRIMARY}>
            <Icon name="add" className="text-[18px]" /> Faire une demande
          </SubmitIdeaAction>
          <button
            type="button"
            aria-label="Exporter mes demandes au format CSV"
            title="Exporter mes demandes au format CSV"
            disabled={exportReport.isPending}
            onClick={() => exportReport.mutate()}
            className={BTN_SECONDARY}
          >
            <Icon name="download" className="text-[18px]" />
            {exportReport.isPending ? "Export en cours…" : "Exporter mes demandes"}
          </button>
        </div>
      }
    >
      <Tabs
        value={tab}
        onValueChange={(v) => onTabChange(v as DemandesTab)}
        className="flex flex-1 flex-col"
      >
        <TabsList
          aria-label="Catégories de demandes"
          className="h-auto w-full justify-start gap-6 rounded-none border-b border-outline-variant bg-transparent p-0 px-6 pt-2 text-foreground"
        >
          {canReview && (
            <TabsTrigger value="a-traiter" className={TAB_TRIGGER}>
              À traiter <Count n={data.toReview.length} active={tab === "a-traiter"} />
            </TabsTrigger>
          )}
          <TabsTrigger value="mes-demandes" className={TAB_TRIGGER}>
            Mes demandes <Count n={data.mine.data?.length} active={tab === "mes-demandes"} />
          </TabsTrigger>
          <TabsTrigger value="par-equipe" className={TAB_TRIGGER}>
            Par équipe <Count n={data.validated.data?.length} active={tab === "par-equipe"} />
          </TabsTrigger>
        </TabsList>

        {canReview && (
          <TabsContent
            value="a-traiter"
            className="mt-0 flex flex-1 flex-col gap-2.5 p-6 focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            {data.submissions.isError && (
              <p className="text-body-sm text-error">Les demandes sont indisponibles.</p>
            )}
            {data.submissions.data && data.toReview.length === 0 && (
              <EmptyState message="Rien à traiter pour le moment." />
            )}
            {data.toReview.slice(0, PREVIEW).map((s) => (
              <ClickableRow
                key={s.id}
                accent="pink"
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 p-4"
              >
                <RowMainButton
                  label={`demande de ${s.author_name}, ${excerpt(s.content)}`}
                  onOpen={() => setReading(s)}
                  className="text-sm font-semibold text-primary wrap-anywhere"
                >
                  {s.author_name}{" "}
                  <span className="font-normal text-on-surface-variant">· {s.team}</span>
                </RowMainButton>
                <div className="flex items-center justify-end gap-1.5 font-label-sm text-xs text-on-surface-variant">
                  <span>Soumise {timeAgo(s.created_at)}</span>
                  <RowChevron />
                </div>
                <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant wrap-anywhere">
                  {s.content}
                </p>
                <div className="relative z-10 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    aria-label={`Refuser la demande de ${s.author_name}`}
                    onClick={() => startReject(s)}
                    className="h-11 rounded-[4px] border border-primary px-4 text-sm text-foreground transition-colors hover:bg-hover-gris"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    aria-label={`Valider la demande de ${s.author_name}`}
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: s.id, status: "validée" })}
                    className="h-11 rounded-[4px] bg-primary px-4 text-sm text-on-primary transition-colors hover:bg-[#4F5252] disabled:opacity-50"
                  >
                    Valider
                  </button>
                </div>
              </ClickableRow>
            ))}
          </TabsContent>
        )}

        <TabsContent
          value="mes-demandes"
          className="mt-0 flex flex-1 flex-col gap-4 p-6 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          {data.mine.isError && (
            <p className="text-body-sm text-error">Tes demandes sont indisponibles.</p>
          )}
          <div className="flex flex-col gap-2.5">
            <SectionHeader title="Demandes en cours" count={ongoing.length} />
            {data.mine.data && ongoing.length === 0 && (
              <div className="w-full rounded-[4px] border border-outline-variant bg-background p-4 text-sm text-on-surface-variant">
                Aucune demande en cours. Utilise « Faire une demande » pour en créer une.
              </div>
            )}
            {ongoing.slice(0, PREVIEW).map((s) => (
              <MyRow key={s.id} s={s} onOpen={() => setReading(s)} />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            <SectionHeader title="Dernières décisions" count={decisions.length} />
            {data.mine.data && decisions.length === 0 && (
              <div className="w-full rounded-[4px] border border-outline-variant bg-background p-4 text-sm text-on-surface-variant">
                Aucune décision pour le moment.
              </div>
            )}
            {decisions.slice(0, PREVIEW).map((s) => (
              <MyRow key={s.id} s={s} onOpen={() => setReading(s)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent
          value="par-equipe"
          className="mt-0 flex flex-1 flex-col gap-2.5 p-6 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <div className="mb-1 flex items-center justify-between gap-3">
            <h3 className="font-body-md text-[14px] font-semibold text-primary">
              Demandes validées
            </h3>
            <div>
              <label htmlFor="home-equipe" className="sr-only">
                Filtrer par équipe
              </label>
              <select
                id="home-equipe"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="h-11 cursor-pointer rounded-[4px] border border-outline bg-card px-3 text-sm text-primary"
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
          {data.validated.isError && (
            <p className="text-body-sm text-error">Les demandes validées sont indisponibles.</p>
          )}
          {data.validated.data && validatedShown.length === 0 && (
            <EmptyState message="Aucune demande validée pour le moment." />
          )}
          {validatedShown.map((s) => (
            <ClickableRow key={s.id} className="p-3">
              <RowMainButton
                label={`demande validée de ${s.author_name}, ${excerpt(s.content)}`}
                onOpen={() => setReading(s)}
                className="block w-full"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-foreground">{s.author_name}</span>{" "}
                    <span className="text-on-surface-variant">· {s.team}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {(s.submitted_by_email ?? "").toLowerCase() === myEmail && (
                      <InfoTag>Ma demande</InfoTag>
                    )}
                    <StatusTag status="validée" />
                    <RowChevron />
                  </span>
                </span>
                <span className="mt-2 block truncate text-sm text-primary">{s.content}</span>
                <span className="mt-1.5 block font-label-sm text-xs text-on-surface-variant">
                  {s.validated_at
                    ? `Validée le ${formatDateTime(s.validated_at)}`
                    : `Soumise le ${formatDate(s.created_at)}`}
                </span>
              </RowMainButton>
            </ClickableRow>
          ))}
        </TabsContent>
      </Tabs>

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
    </ModuleCard>
  );
}

/** Ligne de « Mes demandes » : en cours ou décision (date de soumission, voir D4 : pas de date de décision). */
function MyRow({ s, onOpen }: { s: Submission; onOpen: () => void }): ReactNode {
  const pending = s.status === "en attente";
  return (
    <ClickableRow className="p-4">
      <RowMainButton
        label={`ma demande ${STATUS_LABELS[s.status]?.toLowerCase() ?? s.status}, ${excerpt(s.content)}`}
        onOpen={onOpen}
        className="flex w-full flex-col gap-2"
      >
        <span className="flex items-center justify-between gap-2">
          <span className="font-label-sm text-xs text-on-surface-variant">
            {pending
              ? `Soumise ${timeAgo(s.created_at)}`
              : `Soumise le ${formatDate(s.created_at)}`}
          </span>
          <span className="flex items-center gap-2">
            <StatusTag status={s.status} />
            <RowChevron />
          </span>
        </span>
        <span className="line-clamp-2 text-sm text-primary wrap-anywhere">{s.content}</span>
        {pending && (
          <span className="font-label-sm text-xs text-on-surface-variant">
            En attente de décision
          </span>
        )}
        {s.status === "refusée" && s.rejection_category && (
          <span className="font-label-sm text-xs text-on-surface-variant">
            Motif : {s.rejection_category}
          </span>
        )}
      </RowMainButton>
    </ClickableRow>
  );
}
