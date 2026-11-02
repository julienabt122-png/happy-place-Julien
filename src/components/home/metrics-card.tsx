import type { UseQueryResult } from "@tanstack/react-query";
import { ModuleCard } from "@/components/module-card";
import { metricLabel, metricOf } from "@/components/modules/metrics-module";
import { formatMetricValue, trendSentence, type Metric } from "@/lib/dashboard";

const SHOWN = [
  { key: "training_kpi", fallback: "Taux de placement" },
  { key: "active_users", fallback: "Missions actives" },
] as const;

function TrendMark({ trend }: { trend: Metric["trend"] }) {
  if (trend === "stable")
    return (
      <svg
        aria-hidden="true"
        focusable="false"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        className="shrink-0 text-outline"
      >
        <rect x="2" y="2" width="10" height="10" fill="currentColor" />
      </svg>
    );
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      className={`shrink-0 ${trend === "hausse" ? "text-success" : "text-error"}`}
    >
      <path d={trend === "hausse" ? "M7 2 L13 12 H1 Z" : "M7 12 L13 2 H1 Z"} fill="currentColor" />
    </svg>
  );
}

/** Bandeau Indicateurs de l'accueil : taux de placement et missions actives. */
export function MetricsCard({ metrics }: { metrics: UseQueryResult<Metric[]> }) {
  return (
    <ModuleCard
      id="indicateurs"
      icon="monitoring"
      title="Indicateurs"
      seeAllTo="/indicateurs"
      seeAllLabel="Voir tout : indicateurs"
    >
      <div className="p-6">
        {metrics.isError && (
          <p className="mb-3 text-body-sm text-error">Les indicateurs sont indisponibles.</p>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {SHOWN.map(({ key, fallback }) => {
            const m = metricOf(metrics.data, key);
            return (
              <div
                key={key}
                className="flex flex-col justify-between gap-3 rounded-[4px] border border-outline-variant bg-background p-4"
              >
                <span className="font-label-sm text-xs text-on-surface-variant">
                  {metricLabel(m, fallback)}
                </span>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-label-md text-[32px] font-bold leading-none text-foreground">
                    {m ? formatMetricValue(m.value, m.unit).replace(/%$/, " %") : "—"}
                  </span>
                  {m && (
                    <span className="inline-flex items-center gap-1.5 font-label-sm text-xs text-on-surface-variant">
                      <TrendMark trend={m.trend} />
                      {trendSentence(m)}
                    </span>
                  )}
                </div>
                {m?.updated_at && (
                  <div className="border-t border-outline-variant pt-1">
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      Mis à jour le{" "}
                      {new Date(m.updated_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ModuleCard>
  );
}
