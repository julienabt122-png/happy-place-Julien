import { useId, useState, type RefObject } from "react";
import { FormDialog } from "@/components/modules/form-dialog";
import { Button } from "@/components/ui/button";

/**
 * Fenêtre de modération (admins) : demande un motif, puis masque ou supprime définitivement.
 * Une fois masqué, un élément peut être réaffiché depuis la même fenêtre.
 */
export function ModerationDialog({
  open,
  onOpenChange,
  mode,
  titre,
  pending,
  onConfirm,
  onReafficher,
  returnFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "masquer" | "supprimer";
  titre: string;
  pending: boolean;
  onConfirm: (motif: string) => void;
  onReafficher?: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "masquer" ? "Masquer cet élément ?" : "Supprimer définitivement ?"}
      description={
        mode === "masquer"
          ? `« ${titre} » ne sera plus visible que par les admins. Tu pourras le réafficher.`
          : `« ${titre} » sera supprimé pour de bon, avec son historique. Cette action ne peut pas être annulée.`
      }
      returnFocusRef={returnFocusRef}
    >
      {open && (
        <Inner
          mode={mode}
          pending={pending}
          onConfirm={onConfirm}
          onReafficher={onReafficher}
          onCancel={() => onOpenChange(false)}
        />
      )}
    </FormDialog>
  );
}

function Inner({
  mode,
  pending,
  onConfirm,
  onReafficher,
  onCancel,
}: {
  mode: "masquer" | "supprimer";
  pending: boolean;
  onConfirm: (motif: string) => void;
  onReafficher?: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const [motif, setMotif] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!motif.trim()) return setErr("Indique le motif : il est conservé dans le journal.");
    setErr(null);
    onConfirm(motif.trim());
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <label
          htmlFor={`${id}-motif`}
          className="font-label-md text-[13px] font-medium text-primary"
        >
          Motif (obligatoire)
        </label>
        <textarea
          id={`${id}-motif`}
          autoFocus
          rows={3}
          maxLength={500}
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          aria-describedby={`${id}-aide`}
          className="w-full rounded-[4px] border border-outline bg-card p-3 text-base text-on-surface"
        />
        <p id={`${id}-aide`} className="text-sm text-on-surface-variant">
          Le motif est enregistré dans le journal de modération.
        </p>
        {err && (
          <p role="alert" className="text-body-sm text-error">
            {err}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {mode === "supprimer" && onReafficher && (
            <Button type="button" variant="link" disabled={pending} onClick={onReafficher}>
              Réafficher
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "En cours…" : mode === "masquer" ? "Masquer" : "Supprimer définitivement"}
          </Button>
        </div>
      </div>
    </form>
  );
}
