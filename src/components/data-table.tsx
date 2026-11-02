import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type DataColumn = {
  label: string;
  /** Largeur fixe (ex. « w-[176px] ») et alignement (ex. « text-right ») de la colonne. */
  className?: string;
};

/**
 * Vrai `<table>` des pages de module (spec-interface § 2) : en-tête mono 12 px sur #FBF9F8,
 * `th scope="col"`, filets entre les lignes. Les lignes se font avec `Tr` et `Td`.
 */
export function DataTable({
  label,
  columns,
  children,
}: {
  label: string;
  columns: DataColumn[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full border-collapse text-left">
        <thead>
          <tr className="h-10 border-b border-outline-variant bg-background font-label-sm text-xs font-medium text-on-surface-variant">
            {columns.map((c) => (
              <th key={c.label} scope="col" className={`px-6 ${c.className ?? ""}`}>
                {c.label}
              </th>
            ))}
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
