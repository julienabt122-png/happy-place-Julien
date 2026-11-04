import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Barre de filtres (maquettes) : boutons-filtres à gauche, recherche et liste déroulante à droite. */
export function FilterBar({ chips, right }: { chips?: ReactNode; right: ReactNode }) {
  return (
    <section aria-label="Filtres" className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2">{chips}</div>
      <div className="flex flex-wrap items-center gap-4">{right}</div>
    </section>
  );
}

/** Boutons-filtres exclusifs : l'actif a un contour de 2 px et un fond gris (`aria-pressed`). */
export function FilterChips<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  /** `count` facultatif : nombre d'éléments du filtre, affiché dans la pastille. */
  options: { id: T; label: string; count?: number }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      {options.map((o) => (
        <Button
          key={o.id}
          type="button"
          variant="outline"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`px-4 font-label-md text-[13px] ${
            value === o.id
              ? "border-2 bg-secondary font-semibold"
              : "border-outline bg-card font-medium"
          }`}
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1.5 font-label-sm text-xs text-on-surface-variant">{o.count}</span>
          )}
        </Button>
      ))}
    </div>
  );
}

/** Recherche de 280 px : libellé masqué relié au champ, icône loupe. */
export function SearchField({
  id,
  label,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex h-11 w-[280px] max-w-full items-center gap-2 rounded-[4px] border border-outline bg-card px-3">
      <span
        aria-hidden="true"
        className="material-symbols-outlined text-[22px] text-on-surface-variant"
      >
        search
      </span>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="-my-px h-[calc(100%+2px)] w-full bg-transparent font-label-md text-[13px] text-primary placeholder:text-on-surface-variant"
      />
    </div>
  );
}

/**
 * Liste déroulante de 180 px, native (clavier et lecteur d'écran) : la première option est
 * « {préfixe} : Toutes » (ou « Tous » avec `all="Tous"`) et correspond à la valeur vide.
 */
export function FilterSelect({
  id,
  label,
  prefix,
  all = "Toutes",
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  prefix: string;
  all?: "Toutes" | "Tous";
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-[180px] cursor-pointer rounded-[4px] border border-outline bg-card px-3 font-label-md text-sm text-primary hover:bg-secondary"
      >
        <option value="">{`${prefix} : ${all}`}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
