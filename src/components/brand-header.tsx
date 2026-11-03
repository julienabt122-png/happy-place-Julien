import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import sharkLogo from "@/assets/bigger-boat-shark.png";
import { supabase } from "@/integrations/supabase/client";

/**
 * Seul composant d'identité de l'app (logo et « BIGGER BOAT »).
 * - `page` : bandeau complet, pour /auth et /choisir-role.
 * - `identity` : bloc de 240 px posé à gauche de l'en-tête de l'AppShell.
 */
export function BrandHeader({ variant = "page" }: { variant?: "page" | "identity" }) {
  if (variant === "identity") {
    return (
      <Link
        to="/"
        aria-label="Bigger Boat, accueil"
        className="flex h-full w-[240px] shrink-0 items-center gap-3 border-r border-outline-variant px-6 outline-offset-[-4px]"
      >
        <img
          src={sharkLogo}
          alt=""
          width={1024}
          height={1024}
          className="h-8 w-10 shrink-0 object-contain"
        />
        <span className="truncate font-display text-xl font-bold tracking-tight text-primary">
          BIGGER BOAT
        </span>
      </Link>
    );
  }
  return <PageBrandHeader />;
}

function PageBrandHeader() {
  // Version élèves : lien « Changer de rôle » visible dès qu'on est connecté.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(!!session),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-outline-variant bg-surface-container-lowest">
      <div className="mx-auto flex min-h-16 w-full max-w-interface items-center justify-between gap-md px-sm py-xs md:px-md">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-sm"
          aria-label="Bigger Boat — accueil"
        >
          <img
            src={sharkLogo}
            alt=""
            width={1024}
            height={1024}
            className="h-11 w-14 shrink-0 object-contain"
          />
          <span className="font-label-md text-lg font-bold uppercase text-primary">
            Bigger Boat
          </span>
        </Link>
        <div className="flex items-center gap-md">
          {signedIn && pathname !== "/choisir-role" && (
            <Link
              to="/choisir-role"
              className="font-label-sm text-label-sm uppercase text-primary underline-offset-2 hover:underline"
            >
              Changer de rôle
            </Link>
          )}
          <span className="font-label-sm text-label-sm uppercase text-on-surface-variant">
            Happy Place
          </span>
        </div>
      </div>
    </header>
  );
}
