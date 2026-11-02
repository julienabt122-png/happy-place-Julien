import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandHeader } from "@/components/brand-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, type AppRole } from "@/lib/auth";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

const ROLE_LABELS: Record<AppRole, string> = {
  admin: "ADMIN",
  manager: "MANAGER",
  collaborateur: "COLLABORATEUR",
};

const MAIN_ENTRIES = [
  { to: "/", label: "Accueil", icon: "home" },
  { to: "/demandes", label: "Demandes", icon: "inbox" },
  { to: "/actualites", label: "Actualités", icon: "newspaper" },
  { to: "/points-bloquants", label: "Points bloquants", icon: "warning" },
  { to: "/indicateurs", label: "Indicateurs", icon: "monitoring" },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Accueil",
  "/demandes": "Demandes",
  "/actualites": "Actualités",
  "/points-bloquants": "Points bloquants",
  "/indicateurs": "Indicateurs",
  "/manage": "Gestion",
};

function pageTitle(pathname: string) {
  const clean = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
  if (PAGE_TITLES[clean]) return PAGE_TITLES[clean];
  if (clean.startsWith("/manage")) return PAGE_TITLES["/manage"];
  return "";
}

const ENTRY_BASE =
  "flex h-12 items-center gap-3 border-l-4 px-6 font-body-md text-sm outline-offset-[-4px]";
const ENTRY_IDLE = `${ENTRY_BASE} border-transparent font-medium text-on-surface-variant hover:bg-hover-gris`;
const ENTRY_ACTIVE = "border-primary bg-highlight font-bold text-primary";

/** Cadre commun des pages connectées : lien d'évitement, en-tête 64 px, menu 240 px. */
export function AppShell({
  email,
  role,
  children,
}: {
  email: string;
  role: AppRole;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-surface font-body-md">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-[4px] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-primary"
      >
        Aller au contenu principal
      </a>

      <header className="z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-outline-variant bg-card">
        <div className="flex h-full min-w-0 flex-1 items-center">
          <BrandHeader variant="identity" />
          <nav aria-label="Fil d'Ariane" className="min-w-0 px-10">
            <ol className="flex items-center gap-1.5 text-sm">
              {pathname.replace(/\/$/, "") !== "" && (
                <>
                  <li>
                    <Link
                      to="/"
                      className="rounded-[4px] text-on-surface-variant underline hover:text-primary"
                    >
                      Accueil
                    </Link>
                  </li>
                  <li aria-hidden="true" className="text-outline">
                    &gt;
                  </li>
                </>
              )}
              <li
                aria-current="page"
                className="truncate font-display text-base font-semibold text-primary"
              >
                {pageTitle(pathname)}
              </li>
            </ol>
          </nav>
        </div>
        <div className="flex shrink-0 items-center gap-4 pr-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-11 items-center gap-2.5 rounded-[4px] border border-outline-variant bg-card px-3 hover:bg-hover-gris"
              >
                <Icon name="person" />
                <span className="font-body-md text-sm font-medium text-foreground">{email}</span>
                <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-[11px] leading-tight text-primary">
                  {ROLE_LABELS[role]}
                </span>
                <Icon name="expand_more" className="text-base text-on-surface-variant" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[220px] rounded-[8px] border-primary bg-card p-1"
            >
              <DropdownMenuItem
                asChild
                className="h-11 cursor-pointer rounded-[4px] px-3 text-sm focus:bg-hover-gris"
              >
                <Link to="/choisir-role">
                  <Icon name="swap_horiz" className="mr-2 text-[20px]" />
                  Changer de rôle
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-11 cursor-pointer rounded-[4px] px-3 text-sm focus:bg-hover-gris"
                onSelect={() => void signOut()}
              >
                <Icon name="logout" className="mr-2 text-[20px]" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            aria-label="Aide"
            aria-disabled="true"
            title="Aide (bientôt disponible)"
            className="flex h-11 w-11 items-center justify-center rounded-[4px] border border-outline-variant bg-card hover:bg-hover-gris"
          >
            <Icon name="help_outline" />
          </button>
        </div>
      </header>

      <div className="flex w-full flex-1">
        <aside className="min-h-[calc(100vh-4rem)] w-[240px] shrink-0 border-r border-outline-variant bg-card py-6">
          <nav aria-label="Navigation principale" className="flex flex-col">
            {MAIN_ENTRIES.map((e) => (
              <Link
                key={e.to}
                to={e.to}
                activeOptions={{ exact: e.to === "/" }}
                className={ENTRY_IDLE}
                activeProps={{ className: `${ENTRY_BASE} ${ENTRY_ACTIVE}`, "aria-current": "page" }}
              >
                <Icon name={e.icon} className="text-primary" />
                {e.label}
              </Link>
            ))}
          </nav>
          <div className="mx-6 my-4 border-t border-outline-variant" />
          <div className="flex flex-col">
            {isAdmin && (
              <Link
                to="/manage"
                className={ENTRY_IDLE}
                activeProps={{ className: `${ENTRY_BASE} ${ENTRY_ACTIVE}`, "aria-current": "page" }}
              >
                <Icon name="admin_panel_settings" className="text-primary" />
                Gestion
              </Link>
            )}
            <button
              type="button"
              aria-disabled="true"
              title="Aide (bientôt disponible)"
              className={`${ENTRY_IDLE} w-full text-left`}
            >
              <Icon name="help_outline" className="text-primary" />
              Aide
            </button>
          </div>
        </aside>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1280px] flex-1 p-10 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
