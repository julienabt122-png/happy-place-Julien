import { forwardRef, type ReactNode } from "react";
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

// Champ de saisie (spec-interface § 2) : bordure 1 px #747878, rayon 4 px, texte Inter 16 px,
// texte indicatif en mono 13 px. Le contour de focus 2 px vient de la règle globale.
const inputBase =
  "w-full min-h-11 rounded-[4px] border border-outline bg-card p-3 font-body-md text-base text-on-surface placeholder:font-label-md placeholder:text-[13px] placeholder:text-on-surface-variant";

const labelBase = "block font-label-md text-[13px] font-medium text-primary";

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  /** Identifiant du champ : relie le libellé à sa saisie. */
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-xs">
      <label htmlFor={htmlFor} className={labelBase}>
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

/**
 * Champ prérempli en lecture seule : fond #EFEDED, icône « lock », atteignable au clavier
 * (`aria-readonly`). `describedBy` pointe vers l'aide affichée sous les champs.
 */
export function ReadOnlyField({
  id,
  label,
  value,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  describedBy?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      <div className="flex h-11 items-center justify-between rounded-[4px] border border-outline bg-secondary px-3">
        <input
          id={id}
          type="text"
          readOnly
          aria-readonly="true"
          aria-describedby={describedBy}
          value={value}
          className="w-full cursor-default select-text border-0 bg-transparent p-0 font-body-md text-base text-foreground"
        />
        <ManageIcon name="lock" className="ml-2 shrink-0 text-[18px] text-on-surface-variant" />
      </div>
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputBase} ${props.className ?? ""}`} />;
}

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea(props, ref) {
  return <textarea ref={ref} {...props} className={`${inputBase} ${props.className ?? ""}`} />;
});

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
    <FormFooter>
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : submitLabel}
      </Button>
    </FormFooter>
  );
}

/**
 * Pied de fenêtre (maquettes) : bordure haute, marges de 24 px, 16 px entre les boutons.
 * Posé dans le corps d'un FormDialog (p-6) : les marges négatives le font toucher les bords,
 * et `sticky` le garde visible en bas quand le contenu défile.
 */
export function FormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-4 border-t border-outline-variant bg-card p-6">
      {children}
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
      <FormFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="button" onClick={onConfirm} disabled={pending}>
          {pending ? "Suppression…" : "Supprimer"}
        </Button>
      </FormFooter>
    </Modal>
  );
}
