import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataTable, ListFooter, Td, Tr, type DataColumn } from "@/components/data-table";
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import { PageHeader } from "@/components/page-header";
import { InfoTag, StaleTag } from "@/components/status-tag";
import { MetricFormDialog } from "@/components/modules/metric-form-dialog";
import { useDeleteMetric } from "@/components/modules/use-delete-metric";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import { fetchMetrics, formatMetricValue, trendSentence, type Metric } from "@/lib/dashboard";
import { LIST_PAGE_SIZE } from "@/lib/list-page";
import { isMetricStale } from "@/lib/metric-stale";
import { resolveMetricInfo } from "@/lib/metric-definitions";
import { plural } from "@/lib/plural";

export function metricOf(metrics: Metric[] | undefined, key: string) {
  return metrics?.find((m) => m.key === key);
}

export function metricLabel(metric: Metric | undefined, fallback: string) {
  if (!metric) return fallback;
  if (metric.key === "training_kpi") return "Taux de placement";
  if (metric.key === "active_users") return "Missions actives";
  return metric.label;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export function MetricsModule({ role }: { role: AppRole }) {
  // Création et modification réservées à l'admin (la base refuse les autres rôles).
  const isAdmin = role === "admin";
  const [editing, setEditing] = useState<Metric | null>(null);
  const [limit, setLimit] = useState(LIST_PAGE_SIZE);
  const deleteMetricAction = useDeleteMetric();
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });
  const all = metrics.data ?? [];
  const shown = all.slice(0, limit);
  const staleCount = all.filter((m) => isMetricStale(m.updated_at)).length;

  const columns: DataColumn[] = [
    { label: "Indicateur" },
    { label: "Périmètre", className: "w-[140px]" },
    { label: "Valeur", className: "w-[184px]" },
    { label: "Mise à jour", className: "w-[176px]" },
    ...(isAdmin ? [{ label: "Actions", className: "w-[136px] text-right" }] : []),
  ];

  const createButton = (
    <MetricFormDialog
      trigger={
        <Button type="button">
          <Icon name="add" className="text-[20px]" /> Ajouter un indicateur
        </Button>
      }
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Indicateurs"
        actions={isAdmin ? createButton : undefined}
        summary={
          metrics.data &&
          `${staleCount > 0 ? `${staleCount} à mettre à jour · ` : ""}${plural(all.length, "indicateur", "indicateurs")} au total`
        }
      />

      <ModuleCard
        main
        icon="monitoring"
        title="Liste des indicateurs"
        counter={
          metrics.data
            ? staleCount > 0
              ? `${staleCount} à mettre à jour`
              : plural(all.length, "indicateur", "indicateurs")
            : undefined
        }
        counterTone="dark"
        footer={
          metrics.data && all.length > 0 ? (
            <div className="flex flex-col items-center gap-4">
              <ListFooter
                label={`${plural(shown.length, "indicateur affiché", "indicateurs affichés")} sur ${all.length.toLocaleString("fr-FR")}`}
                hasMore={all.length > limit}
                onMore={() => setLimit((l) => l + LIST_PAGE_SIZE)}
              />
              <p className="text-sm text-on-surface-variant">
                La définition et la valeur sont visibles par tous les rôles. Seul un admin peut
                créer et modifier un indicateur.
              </p>
            </div>
          ) : undefined
        }
      >
        {metrics.isLoading && <LoadingState label="Chargement des indicateurs…" />}
        {metrics.isError && (
          <ErrorState
            message="Impossible de charger les indicateurs. Réessaie dans un instant."
            onRetry={() => void metrics.refetch()}
          />
        )}
        {metrics.data && all.length === 0 && (
          <EmptyState
            message="Aucun indicateur pour le moment."
            action={isAdmin ? createButton : undefined}
          />
        )}
        {all.length > 0 && (
          <DataTable label="Liste des indicateurs" columns={columns}>
            {shown.map((m) => {
              const label = metricLabel(m, m.label);
              return (
                <Tr key={m.key}>
                  <Td>
                    <div className="min-w-0 pr-4">
                      <h3 className="mb-1 text-base font-semibold text-primary wrap-anywhere">
                        {label}
                      </h3>
                      <p className="font-label-sm text-xs text-on-surface-variant">
                        {resolveMetricInfo(m.key, m).definition ?? "Définition à renseigner"}
                      </p>
                    </div>
                  </Td>
                  <Td>
                    {resolveMetricInfo(m.key, m).scope ? (
                      <InfoTag>{resolveMetricInfo(m.key, m).scope}</InfoTag>
                    ) : (
                      <span className="text-sm text-on-surface-variant">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-col">
                      <span className="text-[24px] font-semibold leading-tight text-primary">
                        {formatMetricValue(m.value, m.unit).replace(/%$/, " %")}
                      </span>
                      <span className="mt-1 whitespace-nowrap font-label-sm text-xs text-on-surface-variant">
                        {trendSentence(m)}
                      </span>
                    </div>
                  </Td>
                  <Td>
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      {m.updated_at
                        ? new Date(m.updated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })
                        : "—"}
                    </span>
                    {isMetricStale(m.updated_at) && (
                      <div className="mt-1.5">
                        <StaleTag />
                      </div>
                    )}
                  </Td>
                  {isAdmin && (
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Modifier : ${label}`}
                          onClick={() => setEditing(m)}
                          className="px-3.5"
                        >
                          <Icon name="edit" className="text-[18px]" /> Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          aria-haspopup="dialog"
                          aria-label={`Supprimer l'indicateur ${label}`}
                          disabled={deleteMetricAction.pending}
                          onClick={(e) => deleteMetricAction.request(m, e.currentTarget)}
                          className="px-3.5"
                        >
                          <Icon name="delete" className="text-[18px]" /> Supprimer
                        </Button>
                      </div>
                    </Td>
                  )}
                </Tr>
              );
            })}
          </DataTable>
        )}
      </ModuleCard>

      {deleteMetricAction.confirmDialog}
      {editing && (
        <MetricFormDialog metric={editing} open onOpenChange={(o) => !o && setEditing(null)} />
      )}
    </div>
  );
}
