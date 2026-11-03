import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type ModulePath = "/demandes" | "/actualites" | "/points-bloquants" | "/indicateurs";

/**
 * Carte à bandeau (spec-interface § 2). `main` ajoute le liseré anthracite : une seule par écran.
 * `counterTone="dark"` : compteur sombre (carte principale), sinon compteur discret.
 */
export function ModuleCard({
  id,
  icon,
  title,
  counter,
  counterTone = "quiet",
  main = false,
  seeAllTo,
  seeAllLabel,
  headerAction,
  children,
  footer,
  className = "",
}: {
  id?: string;
  icon: string;
  title: string;
  counter?: string;
  counterTone?: "quiet" | "dark";
  main?: boolean;
  seeAllTo?: ModulePath;
  seeAllLabel?: string;
  headerAction?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`flex flex-col overflow-hidden rounded-[8px] border border-outline-variant bg-card ${
        main ? "border-t-[3px] border-t-primary" : ""
      } ${className}`}
    >
      <div className="flex h-14 items-center justify-between gap-4 border-b border-outline-variant bg-secondary px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-primary">
            {icon}
          </span>
          <h2 className="truncate font-display text-[18px] font-bold text-primary">{title}</h2>
          {counter &&
            (counterTone === "dark" ? (
              <span className="shrink-0 rounded-[4px] bg-primary px-2 py-0.5 font-label-sm text-[11px] text-on-primary">
                {counter}
              </span>
            ) : (
              <span className="shrink-0 font-label-sm text-xs text-on-surface-variant">
                {counter}
              </span>
            ))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {headerAction}
          {seeAllTo && (
            <Link
              to={seeAllTo}
              aria-label={seeAllLabel}
              className="group inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-primary"
            >
              <span className="underline decoration-1 underline-offset-4 group-hover:decoration-2">
                Voir tout
              </span>
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                arrow_forward
              </span>
            </Link>
          )}
        </div>
      </div>
      {children}
      {footer && <div className="mt-auto border-t border-outline-variant p-6">{footer}</div>}
    </section>
  );
}
