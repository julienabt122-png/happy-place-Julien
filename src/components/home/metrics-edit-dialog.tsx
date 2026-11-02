import { useState, type ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { FormFooter } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { MetricFormDialog } from "@/components/modules/metric-form-dialog";
import { metricLabel } from "@/components/modules/metrics-module";
import { Button } from "@/components/ui/button";
import { formatMetricValue, type Metric } from "@/lib/dashboard";

/**
 * Fenêtre « Modifier les indicateurs » (admin seulement : le bouton n'est pas rendu pour les autres rôles).
 * Liste les indicateurs ; « Modifier » ouvre le MetricFormDialog existant (le focus revient à ce bouton).
 * `trigger` : bouton d'ouverture de la liste (le focus lui revient). Les droits restent ceux de la base.
 */
export function MetricsEditDialog({
  metrics,
  trigger,
}: {
  metrics: UseQueryResult<Metric[]>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const list = metrics.data ?? [];
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Modifier les indicateurs"
      description="Choisis l'indicateur à modifier."
      trigger={trigger}
    >
      {metrics.isError && (
        <p role="alert" className="text-sm text-error">
          Impossible de charger les indicateurs. Réessaie dans un instant.
        </p>
      )}
      {!metrics.isError && !metrics.data && (
        <p className="text-sm text-on-surface-variant">Chargement des indicateurs…</p>
      )}
      {metrics.data && list.length === 0 && (
        <p className="text-sm text-on-surface-variant">Aucun indicateur pour le moment.</p>
      )}
      {list.length > 0 && (
        <ul className="divide-y divide-outline-variant border-y border-outline-variant">
          {list.map((m) => {
            const label = metricLabel(m, m.label);
            return (
              <li key={m.key} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary wrap-anywhere">{label}</p>
                  <p className="font-label-sm text-xs text-on-surface-variant">
                    {formatMetricValue(m.value, m.unit).replace(/%$/, " %")}
                  </p>
                </div>
                <MetricFormDialog
                  metric={m}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      aria-label={`Modifier : ${label}`}
                      aria-haspopup="dialog"
                      className="shrink-0 px-3.5"
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        edit
                      </span>{" "}
                      Modifier
                    </Button>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      <FormFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Fermer
        </Button>
      </FormFooter>
    </FormDialog>
  );
}
