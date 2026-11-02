import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import type { AppRole } from "@/lib/auth";
import { deltaText, fetchMetrics, TREND_LABELS, updateMetric, type Metric } from "@/lib/dashboard";

export function trendText(m: Metric | undefined) {
  return m ? TREND_LABELS[m.trend] : "";
}

export function metricOf(metrics: Metric[] | undefined, key: string) {
  return metrics?.find((m) => m.key === key);
}

export function formatMetric(m: Metric | undefined, fallback: string) {
  if (!m) return fallback;
  const v = Number(m.value);
  const formatted = m.unit === "%" ? v.toFixed(1) : v.toLocaleString("fr-FR");
  return `${formatted}${m.unit ?? ""}`;
}

export function metricLabel(metric: Metric | undefined, fallback: string) {
  if (!metric) return fallback;
  if (metric.key === "training_kpi") return "Taux de placement";
  if (metric.key === "active_users") return "Missions actives";
  return metric.label;
}

export function MetricsModule({ role }: { role: AppRole }) {
  const qc = useQueryClient();
  const isAdmin = role === "admin";
  const [nps, setNps] = useState<string>("");
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });
  const npsMetric = metricOf(metrics.data, "nps");

  const saveMetric = useMutation({
    mutationFn: updateMetric,
    onSuccess: () => {
      toast.success("KPI mis à jour");
      qc.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[32px] font-semibold leading-tight text-primary">
        Indicateurs
      </h1>
      <ModuleCard main icon="monitoring" title="Indicateurs du cabinet">
        <div className="p-6">
          {metrics.isLoading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
          {metrics.isError && (
            <p className="text-body-sm text-error">Les indicateurs sont indisponibles.</p>
          )}
          {metrics.data?.length === 0 && <EmptyState message="Aucun indicateur pour le moment." />}
          <ul className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-3">
            {metrics.data?.map((m) => (
              <li key={m.key} className="p-sm bg-card border border-outline-variant text-center">
                <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  {metricLabel(m, m.label)}
                </p>
                <p className="font-display text-[32px] text-primary">{formatMetric(m, "—")}</p>
                <p className="text-[10px] text-on-surface-variant font-label-sm">
                  {trendText(m)}
                  {deltaText(m) && ` · ${deltaText(m)}`}
                </p>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <div className="mt-md space-y-xs border-t border-outline-variant pt-md">
              <label
                htmlFor="nps-input"
                className="font-label-sm text-label-sm text-on-surface-variant block"
              >
                MODIFIER LE NPS CANDIDATS
              </label>
              <div className="flex gap-xs">
                <input
                  id="nps-input"
                  className="flex-grow bg-card border border-outline-variant p-xs font-label-md focus:outline-none focus:border-primary"
                  type="number"
                  value={nps !== "" ? nps : (npsMetric?.value ?? "")}
                  onChange={(e) => setNps(e.target.value)}
                />
                <button
                  onClick={() =>
                    saveMetric.mutate({
                      key: "nps",
                      value: Number(nps !== "" ? nps : (npsMetric?.value ?? 0)),
                    })
                  }
                  disabled={saveMetric.isPending}
                  className="bg-primary text-on-primary px-sm font-label-md text-label-md disabled:opacity-50"
                >
                  METTRE À JOUR
                </button>
              </div>
              <p className="text-[10px] text-on-surface-variant italic">
                {npsMetric
                  ? `Tendance : ${trendText(npsMetric)}${
                      deltaText(npsMetric) ? ` · ${deltaText(npsMetric)}` : ""
                    }`
                  : "Mis à jour à partir des retours candidats."}
              </p>
            </div>
          )}
        </div>
      </ModuleCard>
    </div>
  );
}
