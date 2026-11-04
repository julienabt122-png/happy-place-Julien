import { Link } from "@tanstack/react-router";

const TAB =
  "-mb-px inline-flex h-11 items-center border-b-2 border-transparent px-0 text-sm font-medium text-on-surface-variant hover:border-[#C4C7C7] hover:text-primary";
const TAB_ACTIVE =
  "-mb-px inline-flex h-11 items-center border-b-2 border-primary px-0 text-sm font-semibold text-primary";

/** Sections de la gestion (maquettes) : « Utilisateurs », « Équipes » et « Modération », juste sous l'en-tête de page. */
export function ManageTabs() {
  return (
    <nav aria-label="Sections de la gestion" className="flex gap-6 border-b border-outline-variant">
      <Link
        to="/manage/users"
        className={TAB}
        activeProps={{ className: TAB_ACTIVE, "aria-current": "page" }}
      >
        Utilisateurs
      </Link>
      <Link
        to="/manage/teams"
        className={TAB}
        activeProps={{ className: TAB_ACTIVE, "aria-current": "page" }}
      >
        Équipes
      </Link>
      <Link
        to="/manage/moderation"
        className={TAB}
        activeProps={{ className: TAB_ACTIVE, "aria-current": "page" }}
      >
        Modération
      </Link>
    </nav>
  );
}
