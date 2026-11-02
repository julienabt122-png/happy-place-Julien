import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export type Crumb = { label: string; to: LinkProps["to"] };

/**
 * En-tête commun des pages de module (maquettes « Page module ») : titre, boutons d'action à droite,
 * phrase de synthèse dessous. Pas de fil d'Ariane par défaut (il ferait doublon avec le titre) :
 * `crumbs` ne sert que là où il y a une vraie hiérarchie (Gestion et ses sous-pages).
 */
export function PageHeader({
  title,
  crumbs,
  actions,
  summary,
}: {
  title: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <section>
      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Fil d'Ariane" className="mb-3 flex items-center gap-1.5 text-sm">
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1.5">
              <Link
                to={c.to}
                className="rounded-sm text-on-surface-variant underline hover:text-primary"
              >
                {c.label}
              </Link>
              <span aria-hidden="true" className="text-outline">
                /
              </span>
            </span>
          ))}
          <span aria-current="page" className="font-medium text-primary">
            {title}
          </span>
        </nav>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-4">
        {/* Le nom de la page est affiché une seule fois, dans le bandeau blanc de l'en-tête (AppShell). */}
        <h1 className="sr-only">{title}</h1>
        {actions && <div className="flex items-center gap-4">{actions}</div>}
      </div>
      {summary && <p className="text-base text-foreground">{summary}</p>}
    </section>
  );
}

/** Compte cliquable de la phrase de synthèse (libellé souligné, graisse 600). */
export function SummaryLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button
      type="button"
      variant="link"
      onClick={onClick}
      className="h-auto p-0 text-base font-semibold"
    >
      {children}
    </Button>
  );
}
