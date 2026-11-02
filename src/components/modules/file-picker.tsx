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
}: {
  id: string;
  accept: string;
  /** Nom du fichier choisi, sinon « Aucun fichier sélectionné ». */
  fileName?: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      {/* Champ natif masqué : le libellé du formulaire (for) et le bouton l'ouvrent. */}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        tabIndex={-1}
        className="sr-only"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="h-14 w-full border-outline bg-card px-4 hover:border-primary hover:bg-secondary"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
          attach_file
        </span>
        Ajouter un fichier
      </Button>
      <p className="text-sm text-on-surface-variant wrap-anywhere" aria-live="polite">
        {fileName || "Aucun fichier sélectionné"}
      </p>
    </div>
  );
}
