import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SortState } from "@/lib/table-sort";

export type DataColumn = {
  label: string;
  /** Largeur fixe (ex. « w-[176px] ») et alignement (ex. « text-right ») de la colonne. */
  className?: string;
  /** Rend la colonne triable (clé reconnue par `useTableSort`). Absent : colonne non triable. */
  sortKey?: string;
};

/**
 * Vrai `<table>` des pages de module (spec-interface § 2) : en-tête mono 12 px sur #FBF9F8,
 * `th scope="col"`, filets entre les lignes. Les lignes se font avec `Tr` et `Td`.
 */
export function DataTable({
  label,
  columns,
  sort,
  onSort,
  children,
}: {
  label: string;
  columns: DataColumn[];
  /** Tri en cours (avec `onSort`, active les en-têtes cliquables des colonnes qui ont une `sortKey`). */
  sort?: SortState;
  onSort?: (key: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-outline-variant bg-background font-label-sm text-xs font-medium text-on-surface-variant">
            {columns.map((c) => {
              const active = c.sortKey && sort?.key === c.sortKey ? sort : null;
              return (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={
                    c.sortKey && onSort
                      ? active
                        ? active.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={`px-6 ${c.className ?? ""}`}
                >
                  {c.sortKey && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.sortKey as string)}
                      aria-label={`Trier par ${c.label.toLowerCase()}${
                        active
                          ? active.dir === "asc"
                            ? ", croissant, cliquer pour inverser"
                            : ", décroissant, cliquer pour revenir à l'ordre d'origine"
                          : ""
                      }`}
                      className={`-mx-2 inline-flex min-h-11 items-center gap-1 rounded-[4px] px-2 hover:bg-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        active ? "font-semibold text-primary" : ""
                      }`}
                    >
                      {c.label}
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                        {active
                          ? active.dir === "asc"
                            ? "arrow_upward"
                            : "arrow_downward"
                          : "unfold_more"}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="transition-colors hover:bg-background">{children}</tr>;
}

export function Td({ className = "", children }: { className?: string; children: ReactNode }) {
  return <td className={`px-6 py-5 align-top ${className}`}>{children}</td>;
}

/** Pied de carte : « 6 points bloquants affichés sur 14 » et « Afficher plus ». */
export function ListFooter({
  label,
  hasMore,
  onMore,
}: {
  label: string;
  hasMore: boolean;
  onMore: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="font-label-sm text-xs font-medium text-on-surface-variant">{label}</p>
      {hasMore && (
        <Button type="button" variant="outline" className="px-6" onClick={onMore}>
          Afficher plus
        </Button>
      )}
    </div>
  );
}
