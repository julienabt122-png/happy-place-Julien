import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandHeader } from "@/components/brand-header";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { profileFullName, useMyProfile } from "@/components/modules/use-my-profile";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWelcomeSeen } from "@/components/welcome/use-welcome-seen";
import { WelcomeModal } from "@/components/welcome/welcome-modal";
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

// Formulaire de retour des utilisateurs (Tally, plan gratuit).
const FEEDBACK_URL = "https://tally.so/r/X5LvRO";

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
  const profile = useMyProfile(email);
  const welcomeSeen = useWelcomeSeen(email);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeAutoShown, setWelcomeAutoShown] = useState(false);
  // Mobile (moins de 768 px) : le menu est replié derrière un bouton.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Le menu se referme quand on change de page.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Échap referme le menu mobile et rend le focus au bouton.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // Première arrivée dans le cadre (accueil non encore vu) : la modale s'ouvre une seule fois.
  // AppShell n'enveloppe que les pages connectées : /auth et /choisir-role n'en font pas partie.
  useEffect(() => {
    if (welcomeSeen.data === false && !welcomeAutoShown) {
      setWelcomeAutoShown(true);
      setWelcomeOpen(true);
    }
  }, [welcomeSeen.data, welcomeAutoShown]);

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
          <Button
            ref={menuButtonRef}
            type="button"
            variant="outline"
            size="icon"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuOpen((o) => !o)}
            className="ml-3 shrink-0 border-outline-variant bg-card hover:bg-hover-gris md:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </Button>
          <BrandHeader variant="identity" />
          {pathname.replace(/\/$/, "") === "" ? (
            // Accueil : « Accueil » en fil d'Ariane (maquettes d'accueil).
            <nav aria-label="Fil d'Ariane" className="min-w-0 px-4 md:px-10">
              <ol>
                <li
                  aria-current="page"
                  className="truncate font-display text-base font-semibold text-primary"
                >
                  Accueil
                </li>
              </ol>
            </nav>
          ) : (
            // Autres pages : le nom de la page seul ; le fil d'Ariane est dans le contenu (PageHeader).
            <p className="min-w-0 truncate px-4 md:px-10 font-display text-base font-semibold text-primary">
              {pageTitle(pathname)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pr-3 md:gap-4 md:pr-8">
          {(role === "admin" || role === "manager") && (
            <NotificationBell role={role} email={email} />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2.5 border-outline-variant bg-card px-3 hover:bg-hover-gris"
              >
                <Icon name="person" />
                <span className="font-body-md text-sm font-medium text-foreground">
                  {profileFullName(profile.data) || profile.data?.contactEmail || email}
                </span>
                <span className="rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-[11px] leading-tight text-primary">
                  {ROLE_LABELS[role]}
                </span>
                <Icon name="expand_more" className="text-base text-on-surface-variant" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[220px] rounded-[8px] border-primary bg-card p-1"
            >
              {profile.data?.contactEmail && (
                <p className="px-3 py-2 font-label-sm text-[13px] text-on-surface-variant">
                  Mail : {profile.data.contactEmail}
                </p>
              )}
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Aide"
            aria-haspopup="dialog"
            onClick={() => setWelcomeOpen(true)}
            className="border-outline-variant bg-card hover:bg-hover-gris"
          >
            <Icon name="help_outline" />
          </Button>
        </div>
      </header>

      <div className="flex w-full flex-1">
        <aside
          id="menu-principal"
          className={`${menuOpen ? "fixed inset-y-0 left-0 top-16 z-30 block overflow-y-auto" : "hidden"} w-[240px] shrink-0 border-r border-outline-variant bg-card py-6 md:static md:z-auto md:block md:min-h-[calc(100vh-4rem)]`}
        >
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
            <Button
              type="button"
              variant="ghost"
              aria-haspopup="dialog"
              onClick={() => setWelcomeOpen(true)}
              className={`${ENTRY_IDLE} w-full justify-start rounded-none`}
            >
              <Icon name="help_outline" className="text-primary" />
              Aide
            </Button>
            <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className={ENTRY_IDLE}>
              <Icon name="rate_review" className="text-primary" />
              Donner mon avis sur Happy Place
              <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
            </a>
          </div>
        </aside>

        <main
          id="contenu"
          tabIndex={-1}
          className="mx-auto w-full min-w-0 max-w-[1280px] flex-1 p-4 outline-none md:p-10"
        >
          {children}
        </main>
      </div>
      <WelcomeModal
        open={welcomeOpen}
        onOpenChange={setWelcomeOpen}
        role={role}
        email={email}
        firstName={profile.data?.firstName ?? null}
      />
    </div>
  );
}
