import { useCallback, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";
export type SortState = { key: string; dir: SortDir } | null;

/** Valeur comparable d'une cellule : texte, nombre, date (déjà en nombre) ou absente. */
export type SortValue = string | number | null | undefined;

const collator = new Intl.Collator("fr", { sensitivity: "base", numeric: true });

function compare(a: SortValue, b: SortValue): number {
  // Les cellules vides passent toujours en dernier, quel que soit le sens.
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return collator.compare(String(a), String(b));
}

/** Date ISO vers nombre triable (absente : null). */
export const dateValue = (iso: string | null | undefined): number | null =>
  iso ? new Date(iso).getTime() : null;

/**
 * Tri par colonne d'une liste de module. 1er clic : croissant, 2e : décroissant, 3e : ordre d'origine.
 * Le tri est stable : à valeurs égales, l'ordre d'origine est conservé.
 */
export function useTableSort<T>(rows: T[], accessors: Record<string, (row: T) => SortValue>) {
  const [sort, setSort] = useState<SortState>(null);

  const toggle = useCallback((key: string) => {
    setSort((cur) => {
      if (!cur || cur.key !== key) return { key, dir: "asc" };
      if (cur.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }, []);

  const sorted = useMemo(() => {
    const get = sort ? accessors[sort.key] : undefined;
    if (!sort || !get) return rows;
    const sign = sort.dir === "asc" ? 1 : -1;
    return rows
      .map((row, i) => ({ row, i }))
      .sort((x, y) => {
        const a = get(x.row);
        const b = get(y.row);
        const aEmpty = a === null || a === undefined || a === "";
        const bEmpty = b === null || b === undefined || b === "";
        // Vides toujours en dernier : on n'inverse pas leur place.
        if (aEmpty || bEmpty) return compare(a, b) || x.i - y.i;
        return sign * compare(a, b) || x.i - y.i;
      })
      .map((x) => x.row);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- les accesseurs sont recréés à chaque rendu
  }, [rows, sort]);

  return { rows: sorted, sort, onSort: toggle };
}
