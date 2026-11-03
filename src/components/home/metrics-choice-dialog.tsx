import { useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FormFooter } from "@/components/manage/crud-ui";
import { MAX_HOME_METRICS, resolveHomeKeys } from "@/components/home/home-metrics";
import { FormDialog } from "@/components/modules/form-dialog";
import { metricLabel } from "@/components/modules/metrics-module";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { homePrefsKey, useHomeMetricKeys } from "@/components/welcome/use-welcome-seen";
import { supabase } from "@/integrations/supabase/client";
import type { Metric } from "@/lib/dashboard";

/** Messages écrits en français par la fonction : seuls ceux-là s'affichent tels quels, jamais un code technique. */
const FUNCTION_MESSAGE = /^(Choisis |Indicateur inconnu|Trop d'|Session introuvable)/;

/**
 * Fenêtre « Choisir mes indicateurs » : de 1 à 4 indicateurs affichés sur MON accueil (les 3 rôles).
 * Enregistre par public.definir_mes_indicateurs ; le tableau renvoyé met à jour l'affichage.
 * Libellés de public.metrics, jamais les clés techniques. `trigger` : bouton d'ouverture (le focus lui revient).
 */
export function MetricsChoiceDialog({
  email,
  metrics,
  trigger,
}: {
  email: string;
  metrics: UseQueryResult<Metric[]>;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const stored = useHomeMetricKeys(email);
  const ready = !!metrics.data && metrics.data.length > 0 && !stored.isLoading;
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Choisir mes indicateurs"
      description="Choisis de 1 à 4 indicateurs à afficher sur ton accueil."
      trigger={trigger}
    >
      {/* Monté seulement quand la fenêtre est ouverte et les indicateurs chargés : les cases partent des bonnes valeurs. */}
      {ready ? (
        <ChoiceForm
          email={email}
          metrics={metrics.data ?? []}
          initial={resolveHomeKeys(stored.data, metrics.data)}
          onDone={() => setOpen(false)}
        />
      ) : (
        <>
          <p
            role={metrics.isError ? "alert" : undefined}
            className={`text-sm ${metrics.isError ? "text-error" : "text-on-surface-variant"}`}
          >
            {metrics.isError
              ? "Impossible de charger les indicateurs. Réessaie dans un instant."
              : metrics.data
                ? "Aucun indicateur disponible pour le moment."
                : "Chargement des indicateurs…"}
          </p>
          <FormFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="button" disabled>
              Enregistrer
            </Button>
          </FormFooter>
        </>
      )}
    </FormDialog>
  );
}

function ChoiceForm({
  email,
  metrics,
  initial,
  onDone,
}: {
  email: string;
  metrics: Metric[];
  initial: string[];
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const id = useId();
  // Ordre de cochage conservé : c'est l'ordre d'affichage sur l'accueil.
  const [selected, setSelected] = useState<string[]>(initial);
  const count = selected.length;
  const full = count >= MAX_HOME_METRICS;

  const save = useMutation({
    mutationFn: async (keys: string[]) => {
      const { data, error } = await supabase.rpc("definir_mes_indicateurs", { _keys: keys });
      if (error) {
        throw new Error(
          FUNCTION_MESSAGE.test(error.message)
            ? error.message
            : "L'enregistrement a échoué. Réessaie.",
        );
      }
      return data;
    },
    onSuccess: (saved) => {
      // Le tableau renvoyé par la fonction met à jour l'affichage, sans nouvelle lecture.
      qc.setQueryData(homePrefsKey(email), (old: { seen: boolean } | undefined) => ({
        seen: old?.seen ?? true,
        homeMetricKeys: saved,
      }));
      toast.success("Indicateurs enregistrés");
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function toggle(key: string, checked: boolean) {
    setSelected((cur) =>
      checked
        ? cur.includes(key) || cur.length >= MAX_HOME_METRICS
          ? cur
          : [...cur, key]
        : cur.filter((k) => k !== key),
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (count >= 1 && count <= MAX_HOME_METRICS && !save.isPending) save.mutate(selected);
      }}
      className="space-y-4"
      noValidate
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-on-surface-variant">
          Coche de 1 à {MAX_HOME_METRICS} indicateurs. Ils s'affichent dans l'ordre où tu les
          coches.
        </p>
        <span
          aria-live="polite"
          className="shrink-0 rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-xs text-primary"
        >
          {count} sur {MAX_HOME_METRICS}
        </span>
      </div>
      <ul className="divide-y divide-outline-variant border-y border-outline-variant">
        {metrics.map((m) => {
          const checked = selected.includes(m.key);
          const disabled = !checked && full;
          const label = metricLabel(m, m.label);
          return (
            <li key={m.key}>
              <label
                htmlFor={`${id}-${m.key}`}
                className={`flex min-h-11 items-center gap-3 py-2 text-sm ${
                  disabled
                    ? "cursor-not-allowed text-on-surface-variant"
                    : "cursor-pointer text-primary"
                }`}
              >
                <Checkbox
                  id={`${id}-${m.key}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => toggle(m.key, v === true)}
                  className="h-5 w-5 rounded-[4px] shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-0"
                />
                <span className="min-w-0 wrap-anywhere">{label}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {count === 0 && (
        <p role="alert" className="text-sm text-error">
          Choisis au moins 1 indicateur.
        </p>
      )}
      {full && (
        <p className="text-sm text-on-surface-variant">
          Tu as choisi {MAX_HOME_METRICS} indicateurs, le maximum. Décoche-en un pour en choisir un
          autre.
        </p>
      )}
      <FormFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Annuler
        </Button>
        <Button type="submit" disabled={count === 0 || save.isPending}>
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </FormFooter>
    </form>
  );
}
