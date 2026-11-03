import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";

// US-50 : connexion avec Google uniquement.
// Plus de session anonyme : sans adresse Google vérifiée, personne n'entre.
// Une fois connecté, l'écran /choisir-role ne sert qu'à choisir collaborateur ou manager ;
// le rôle admin est attribué par un admin dans la gestion.

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Happy Place" },
      { name: "description", content: "Happy Place, le dashboard interne de Bigger Boat." },
    ],
  }),
  component: EntreePage,
});

function EntreePage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        navigate({ to: "/" });
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function connecter() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (err) {
      setBusy(false);
      setError(`Impossible de lancer la connexion Google : ${err.message}`);
    }
  }

  return (
    <div className="min-h-dvh w-full bg-background flex flex-col">
      <BrandHeader />
      <main className="flex flex-1 items-center justify-center px-md py-lg">
        <section className="w-[min(100%,28rem)] border border-outline-variant bg-surface-container-lowest p-lg shadow-sm">
          <h1 className="font-headline-lg text-headline-lg text-primary">Happy Place</h1>
          {checking ? (
            <p className="mt-sm font-body-md text-body-md text-on-surface-variant" role="status">
              Vérification de ta session…
            </p>
          ) : (
            <>
              <p className="mt-sm font-body-md text-body-md text-on-surface-variant">
                Connecte-toi avec ton compte Google professionnel.
              </p>
              {error && (
                <p className="mt-md border border-error bg-error-container p-sm font-body-sm text-on-error-container" role="alert">
                  {error}
                </p>
              )}
              <Button
                onClick={connecter}
                disabled={busy}
                className="mt-md h-12 w-full rounded-none font-label-md text-xs uppercase text-on-primary"
              >
                {busy ? "Redirection…" : "Se connecter avec Google"}
              </Button>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
