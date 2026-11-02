import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorSummary, Field, FormActions, TextInput } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { createMetric, updateMetricRow, type Metric, type MetricInput } from "@/lib/dashboard";
import { metricSchema, validate, type FieldErrors } from "@/lib/manage-schemas";

type FormState = { key: string; label: string; value: string; unit: string };

const empty: FormState = { key: "", label: "", value: "", unit: "" };

/**
 * Fenêtre « Nouvel indicateur » (création) ou « Modifier l'indicateur » (`metric` fourni). Un seul
 * exemplaire pour la page Indicateurs et /manage/metrics. Ouverture par `trigger` (bouton, le focus lui
 * revient) ou pilotée par la page (`open` / `onOpenChange`). Droits : ceux de la base (admin seulement).
 */
export function MetricFormDialog({
  metric = null,
  trigger,
  open,
  onOpenChange,
}: {
  metric?: Metric | null;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  return (
    <FormDialog
      open={isOpen}
      onOpenChange={setOpen}
      title={metric ? "Modifier l'indicateur" : "Nouvel indicateur"}
      description="Renseigne l'indicateur, puis enregistre-le."
      trigger={trigger}
    >
      {/* Monté seulement quand la fenêtre est ouverte : le formulaire repart de zéro à chaque ouverture. */}
      <MetricForm metric={metric} onDone={() => setOpen(false)} />
    </FormDialog>
  );
}

function MetricForm({ metric, onDone }: { metric: Metric | null; onDone: () => void }) {
  const qc = useQueryClient();
  const id = useId();
  const [form, setForm] = useState<FormState>(
    metric
      ? {
          key: metric.key,
          label: metric.label,
          value: String(metric.value),
          unit: metric.unit ?? "",
        }
      : { ...empty },
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (input: MetricInput) =>
      metric ? updateMetricRow(metric.key, input) : createMetric(input),
    onSuccess: async () => {
      toast.success(metric ? "Indicateur modifié" : "Indicateur créé");
      await qc.invalidateQueries({ queryKey: ["metrics"] });
      onDone();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = form.value.trim().replace(",", ".");
    const candidate = {
      key: form.key,
      label: form.label,
      value: raw === "" || Number.isNaN(Number(raw)) ? Number.NaN : Number(raw),
      unit: form.unit.trim() === "" ? null : form.unit,
    };
    const res = validate(metricSchema, candidate);
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    save.mutate(res.data);
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <ErrorSummary errors={errors} />
      <Field label="Clé technique" htmlFor={`${id}-cle`} error={errors.key}>
        <TextInput
          id={`${id}-cle`}
          value={form.key}
          disabled={!!metric}
          maxLength={40}
          placeholder="ex : taux_placement"
          onChange={(e) => setForm({ ...form, key: e.target.value })}
        />
      </Field>
      <Field label="Libellé" htmlFor={`${id}-libelle`} error={errors.label}>
        <TextInput
          id={`${id}-libelle`}
          value={form.label}
          maxLength={60}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Valeur" htmlFor={`${id}-valeur`} error={errors.value}>
          <TextInput
            id={`${id}-valeur`}
            value={form.value}
            inputMode="decimal"
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </Field>
        <Field label="Unité (optionnel)" htmlFor={`${id}-unite`} error={errors.unit}>
          <TextInput
            id={`${id}-unite`}
            value={form.unit}
            maxLength={8}
            placeholder="%"
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
        </Field>
      </div>
      <FormActions pending={save.isPending} onCancel={onDone} />
    </form>
  );
}
