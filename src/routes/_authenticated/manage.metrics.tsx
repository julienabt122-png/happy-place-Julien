import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDelete, ManageIcon, RowActions } from "@/components/manage/crud-ui";
import { MetricHistory } from "@/components/manage/metric-history";
import { MetricFormDialog } from "@/components/modules/metric-form-dialog";
import { Button } from "@/components/ui/button";
import {
  deleteMetric,
  fetchMetrics,
  deltaText,
  formatMetricValue,
  TREND_LABELS,
  type Metric,
} from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage/metrics")({
  head: () => ({
    meta: [
      { title: "Gestion des indicateurs — Happy Place" },
      { name: "description", content: "Créez, modifiez et supprimez les indicateurs de Happy Place." },
      { property: "og:title", content: "Gestion des indicateurs — Happy Place" },
      { property: "og:description", content: "Gérez les indicateurs de performance dans Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageMetrics,
});

function ManageMetrics() {
  const qc = useQueryClient();
  // Fenêtre de création (metric: null) ou de modification ; le formulaire est le composant partagé.
  const [dialog, setDialog] = useState<{ metric: Metric | null } | null>(null);
  const [toDelete, setToDelete] = useState<Metric | null>(null);

  const list = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });
  const onError = (e: unknown) => toast.error((e as Error).message);

  const remove = useMutation({
    mutationFn: (key: string) => deleteMetric(key),
    onSuccess: () => {
      toast.success("Indicateur supprimé");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["metrics"] });
    },
    onError,
  });

  return (
    <section className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="font-headline-sm text-headline-sm text-primary">
          Indicateurs ({list.data?.length ?? 0})
        </h2>
        <Button type="button" onClick={() => setDialog({ metric: null })}>
          <ManageIcon name="add" className="text-[18px]" /> Nouvel indicateur
        </Button>
      </div>

      {list.isLoading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
      {list.isError && (
        <p className="text-body-sm text-error">Impossible de charger les indicateurs.</p>
      )}

      <div className="space-y-xs">
        {list.data?.map((m) => (
          <article
            key={m.key}
            className="flex items-start justify-between gap-sm p-sm bg-card border border-outline-variant"
          >
            <div className="min-w-0 [overflow-wrap:anywhere]">
              <p className="font-body-md text-primary font-bold">
                {m.label} — {formatMetricValue(m.value, m.unit)}
              </p>
              <p className="text-[11px] font-label-sm text-on-surface-variant mt-xs">
                {m.key} • {TREND_LABELS[m.trend]}
                {m.previous_value != null && (
                  <>
                    {deltaText(m) && ` · ${deltaText(m)}`}
                    {` · avant : ${formatMetricValue(m.previous_value, m.unit).replace(/%$/, " %")}`}
                  </>
                )}
              </p>
              <MetricHistory metricKey={m.key} unit={m.unit} />
            </div>
            <RowActions onEdit={() => setDialog({ metric: m })} onDelete={() => setToDelete(m)} />
          </article>
        ))}
        {list.data?.length === 0 && (
          <p className="text-body-sm italic text-on-surface-variant">Aucun indicateur.</p>
        )}
      </div>

      {dialog && (
        <MetricFormDialog metric={dialog.metric} open onOpenChange={(o) => !o && setDialog(null)} />
      )}

      {toDelete && (
        <ConfirmDelete
          label={toDelete.label}
          pending={remove.isPending}
          onCancel={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.key)}
        />
      )}
    </section>
  );
}
