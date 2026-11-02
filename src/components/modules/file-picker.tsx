import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * Zone d'ajout de fichier (maquette « Nouvelle demande ») : bouton cadré de 56 px,
 * bordure qui fonce et fond gris au survol, contour de focus 2 px (règle globale).
 * Le contrôle du type et de la taille reste dans `onChange`, chez l'appelant.
 */
export function FilePicker({
  id,
  accept,
  fileName,
  onChange,
  compact = false,
  label = "Ajouter un fichier",
  disabled = false,
}: {
  id: string;
  accept: string;
  /** Nom du fichier choisi, sinon « Aucun fichier sélectionné ». */
  fileName?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Variante en ligne : bouton de 44 px et nom du fichier à côté (fenêtres d'import). */
  compact?: boolean;
  label?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={compact ? "flex flex-wrap items-center gap-3" : "flex flex-col gap-1.5"}>
      {/* Champ natif masqué : le libellé du formulaire (for) et le bouton l'ouvrent. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        tabIndex={-1}
        className="sr-only"
        disabled={disabled}
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`border-outline bg-card px-4 hover:border-primary hover:bg-secondary ${
          compact ? "h-11" : "h-14 w-full"
        }`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
          attach_file
        </span>
        {label}
      </Button>
      <p className="text-sm text-on-surface-variant wrap-anywhere" aria-live="polite">
        {fileName || "Aucun fichier sélectionné"}
      </p>
    </div>
  );
}
