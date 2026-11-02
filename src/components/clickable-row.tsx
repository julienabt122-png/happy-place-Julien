import type { ReactNode } from "react";

const ACCENTS = {
  pink: "border-l-4 border-l-highlight-hover",
  dark: "border-l-4 border-l-primary",
} as const;

const FOCUS_WITHIN =
  "has-[[data-row-main]:focus-visible]:outline-2 has-[[data-row-main]:focus-visible]:outline-offset-2 has-[[data-row-main]:focus-visible]:outline-primary";

/**
 * Ligne cliquable d'une liste (spec-interface § 2) : le bouton principal (`RowMainButton`)
 * s'étend sur toute la ligne, les boutons d'action se posent au-dessus avec `relative z-10`.
 * `accent` : liseré à gauche (rose : demande à traiter, anthracite : point critique).
 * `flat` : ligne sans cadre, séparée par un filet (actualités).
 */
export function ClickableRow({
  accent,
  flat = false,
  className = "",
  children,
}: {
  accent?: keyof typeof ACCENTS;
  flat?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const look = flat
    ? `-mx-3 rounded-[4px] px-3 py-2.5 hover:bg-secondary has-[[data-row-main]:focus-visible]:bg-secondary ${FOCUS_WITHIN}`
    : `rounded-[4px] border border-outline-variant bg-card hover:border-outline hover:bg-secondary has-[[data-row-main]:focus-visible]:border-outline has-[[data-row-main]:focus-visible]:bg-secondary ${FOCUS_WITHIN} ${
        accent ? ACCENTS[accent] : ""
      }`;
  return (
    <div
      className={`group relative cursor-pointer transition-colors duration-150 ${look} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Bouton principal d'une ligne. `kind="dialog"` (défaut) ouvre une fenêtre de détail,
 * `kind="page"` mène à une autre page : pas d'annonce de fenêtre, libellé « Ouvrir : … ».
 */
export function RowMainButton({
  label,
  onOpen,
  kind = "dialog",
  className = "",
  children,
}: {
  label: string;
  onOpen: () => void;
  kind?: "dialog" | "page";
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-row-main=""
      aria-haspopup={kind === "dialog" ? "dialog" : undefined}
      aria-label={kind === "dialog" ? `Ouvrir le détail : ${label}` : `Ouvrir : ${label}`}
      onClick={onOpen}
      className={`text-left after:absolute after:inset-0 focus-visible:outline-none ${className}`}
    >
      {children}
    </button>
  );
}

/** Chevron qui apparaît au survol ou au focus de la ligne. */
export function RowChevron() {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined text-[20px] text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100 group-has-[[data-row-main]:focus-visible]:opacity-100"
    >
      chevron_right
    </span>
  );
}
