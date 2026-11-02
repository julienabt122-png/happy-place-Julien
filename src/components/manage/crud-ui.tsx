import type { ReactNode } from "react";
import { FormDialog } from "@/components/modules/form-dialog";
import { Button } from "@/components/ui/button";
import type { FieldErrors } from "@/lib/manage-schemas";

export function ManageIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

const inputBase =
  "w-full bg-card border border-outline-variant focus:border-primary focus:outline-none p-sm font-body-md text-on-surface";

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-xs">
      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase block">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

/**
 * Fenêtre des pages /manage, montée tant qu'elle est affichée. Reconstruite sur le Dialog
 * shadcn (FormDialog) : Échap ferme, le focus revient au bouton d'origine.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <FormDialog open onOpenChange={(o) => !o && onClose()} title={title} description={title}>
      {children}
    </FormDialog>
  );
}

export function FormActions({
  pending,
  onCancel,
  submitLabel = "Enregistrer",
}: {
  pending?: boolean;
  onCancel: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex justify-end gap-xs pt-sm">
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : submitLabel}
      </Button>
    </div>
  );
}

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const count = Object.keys(errors).length;
  if (!count) return null;
  return (
    <div
      role="alert"
      className="text-body-sm text-error border border-error/40 bg-error-container/30 p-sm wrap-anywhere"
    >
      <p>
        {count} champ{count > 1 ? "s" : ""} à corriger avant l'enregistrement.
      </p>
      <ul className="mt-xs list-disc pl-md">
        {Object.entries(errors).map(([k, m]) => (
          <li key={k}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

export function RowActions({
  onEdit,
  onDelete,
  deleting,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="flex gap-xs shrink-0">
      <Button type="button" variant="outline" size="sm" onClick={onEdit}>
        Modifier
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onDelete} disabled={deleting}>
        Supprimer
      </Button>
    </div>
  );
}

export function ConfirmDelete({
  label,
  onCancel,
  onConfirm,
  pending,
}: {
  label: string;
  onCancel: () => void;
  onConfirm: () => void;
  pending?: boolean;
}) {
  return (
    <Modal title="Confirmer la suppression" onClose={onCancel}>
      <p className="font-body-md text-on-surface">
        Supprimer définitivement <strong className="text-primary">{label}</strong> ? Cette action
        est irréversible.
      </p>
      <div className="flex justify-end gap-xs pt-sm">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" onClick={onConfirm} disabled={pending}>
          {pending ? "Suppression…" : "Supprimer"}
        </Button>
      </div>
    </Modal>
  );
}
