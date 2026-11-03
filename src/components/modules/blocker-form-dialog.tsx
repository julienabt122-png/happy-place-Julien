import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CharCounter } from "@/components/expandable-card";
import {
  ErrorSummary,
  Field,
  FormActions,
  Select,
  TextArea,
  TextInput,
} from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { createBlocker, updateBlocker, type Blocker, type BlockerInput } from "@/lib/dashboard";
import { blockerSchema, validate, type FieldErrors } from "@/lib/manage-schemas";

const empty: BlockerInput = {
  title: "",
  description: "",
  department: "",
  severity: "warning",
  status: "EN COURS",
};

/**
 * Fenêtre « Nouveau point bloquant » (création) ou « Modifier le point bloquant » (`blocker` fourni).
 * Un seul exemplaire pour l'accueil, /points-bloquants et /manage/blockers. Deux façons de l'ouvrir :
 * `trigger` (bouton, le focus lui revient) ou `open` / `onOpenChange` (pilotée par la page).
 * Droits : ceux de la base (écriture réservée à l'admin), les boutons ne sont montrés qu'à l'admin.
 */
export function BlockerFormDialog({
  blocker = null,
  trigger,
  open,
  onOpenChange,
}: {
  blocker?: Blocker | null;
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
      title={blocker ? "Modifier le point bloquant" : "Nouveau point bloquant"}
      description="Renseigne le point bloquant, puis enregistre-le."
      trigger={trigger}
    >
      {/* Monté seulement quand la fenêtre est ouverte : le formulaire repart de zéro à chaque ouverture. */}
      <BlockerForm blocker={blocker} onDone={() => setOpen(false)} />
    </FormDialog>
  );
}

function BlockerForm({ blocker, onDone }: { blocker: Blocker | null; onDone: () => void }) {
  const qc = useQueryClient();
  const id = useId();
  const [form, setForm] = useState<BlockerInput>(
    blocker
      ? {
          title: blocker.title,
          description: blocker.description ?? "",
          department: blocker.department,
          severity: blocker.severity,
          status: blocker.status,
        }
      : { ...empty },
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: (input: BlockerInput) =>
      blocker ? updateBlocker(blocker.id, input) : createBlocker(input),
    onSuccess: () => {
      toast.success(blocker ? "Point bloquant modifié" : "Point bloquant créé");
      qc.invalidateQueries({ queryKey: ["blockers"] });
      onDone();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = validate(blockerSchema, form);
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
      <Field label="Titre" htmlFor={`${id}-titre`} error={errors.title}>
        <TextInput
          id={`${id}-titre`}
          value={form.title}
          maxLength={160}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </Field>
      <Field label="Description" htmlFor={`${id}-description`} error={errors.description}>
        <TextArea
          id={`${id}-description`}
          rows={4}
          value={form.description}
          maxLength={2000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <CharCounter value={form.description} max={2000} />
      </Field>
      <Field label="Pôle concerné" htmlFor={`${id}-pole`} error={errors.department}>
        <TextInput
          id={`${id}-pole`}
          value={form.department}
          maxLength={60}
          placeholder="Ex. Data & IA"
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Sévérité" htmlFor={`${id}-severite`} error={errors.severity}>
          <Select
            id={`${id}-severite`}
            value={form.severity}
            onChange={(e) => setForm({ ...form, severity: e.target.value })}
          >
            <option value="critical">Critique</option>
            <option value="warning">Avertissement</option>
            <option value="info">Information</option>
          </Select>
        </Field>
        <Field label="Statut" htmlFor={`${id}-statut`} error={errors.status}>
          {/* Libellés en casse de phrase ; les valeurs enregistrées en base ne changent pas. */}
          <Select
            id={`${id}-statut`}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="OUVERT">Ouvert</option>
            <option value="EN COURS">En cours</option>
            <option value="SURVEILLANCE">Surveillance</option>
            {blocker && (
              <option
                value="RÉSOLU"
                disabled={form.status === "OUVERT"}
                title={form.status === "OUVERT" ? "Passe d'abord par « En cours »" : undefined}
              >
                Résolu
              </option>
            )}
          </Select>
        </Field>
      </div>
      <FormActions pending={save.isPending} onCancel={onDone} />
    </form>
  );
}
