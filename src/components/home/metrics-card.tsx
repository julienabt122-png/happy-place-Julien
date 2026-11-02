import type { UseQueryResult } from "@tanstack/react-query";
import { MetricsChoiceDialog } from "@/components/home/metrics-choice-dialog";
import { MetricsEditDialog } from "@/components/home/metrics-edit-dialog";
import { resolveHomeKeys } from "@/components/home/home-metrics";
import { ModuleCard } from "@/components/module-card";
import { metricLabel, metricOf } from "@/components/modules/metrics-module";
import { Button } from "@/components/ui/button";
import { useHomeMetricKeys } from "@/components/welcome/use-welcome-seen";
import type { AppRole } from "@/lib/auth";
import { formatMetricValue, trendSentence, type Metric } from "@/lib/dashboard";

/** Libellés de repli tant que la liste des indicateurs n'est pas chargée (les deux indicateurs par défaut). */
const FALLBACK_LABELS: Record<string, string> = {
  training_kpi: "Taux de placement",
  active_users: "Missions actives",
};

/** 1 carte : pleine largeur ; 2 : deux colonnes ; 3 : trois ; 4 : 2 x 2, puis 4 colonnes en grand écran. Une colonne sur petit écran. */
const GRID_BY_COUNT: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
};

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

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

/**
 * Bandeau Indicateurs de l'accueil : les indicateurs choisis par la personne (de 1 à 4, dans l'ordre
 * choisi), sinon taux de placement et missions actives. Une clé disparue de `metrics` est ignorée.
 */
export function MetricsCard({
  role,
  email,
  metrics,
}: {
  role: AppRole;
  email: string;
  metrics: UseQueryResult<Metric[]>;
}) {
  const stored = useHomeMetricKeys(email);
  const keys = resolveHomeKeys(stored.data, metrics.data);
  return (
    <ModuleCard
      id="indicateurs"
      icon="monitoring"
      title="Indicateurs"
      seeAllTo="/indicateurs"
      seeAllLabel="Voir tout : indicateurs"
      footer={
        <div className="flex flex-wrap items-center gap-4">
          {role === "admin" && (
            <MetricsEditDialog
              metrics={metrics}
              trigger={
                <Button type="button" aria-haspopup="dialog">
                  <Icon name="edit" className="text-[18px]" /> Modifier les indicateurs
                </Button>
              }
            />
          )}
          <MetricsChoiceDialog
            email={email}
            metrics={metrics}
            trigger={
              <Button
                type="button"
                variant={role === "admin" ? "outline" : "default"}
                aria-haspopup="dialog"
                title="Modifier les indicateurs affichés sur mon tableau de bord"
                aria-label="Choisir mes indicateurs : modifier ceux affichés sur mon tableau de bord"
              >
                <Icon name="tune" className="text-[18px]" /> Choisir mes indicateurs
              </Button>
            }
          />
        </div>
      }
    >
      <div className="p-6">
        {metrics.isError && (
          <p className="mb-3 text-body-sm text-error">Les indicateurs sont indisponibles.</p>
        )}
        {metrics.data && keys.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            Aucun indicateur à afficher pour le moment.
          </p>
        )}
        <div className={`grid gap-6 ${GRID_BY_COUNT[keys.length] ?? GRID_BY_COUNT[2]}`}>
          {keys.map((key) => {
            const m = metricOf(metrics.data, key);
            return (
              <div
                key={key}
                className="flex flex-col justify-between gap-3 rounded-[4px] border border-outline-variant bg-background p-4"
              >
                <span className="font-label-sm text-xs text-on-surface-variant">
                  {metricLabel(m, FALLBACK_LABELS[key] ?? "…")}
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
