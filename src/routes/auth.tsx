import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/brand-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// US-50 : connexion par Google, ou par e-mail + mot de passe pour ceux qui n'ont pas de compte Google.
// La liste blanche (allowed_users) est appliquée à la création du compte, côté base.
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

type Mode = "connexion" | "inscription" | "oubli";

function messageLisible(message: string): string {
  if (/pas autorisée/i.test(message)) {
    return "Cette adresse n'est pas dans la liste des personnes autorisées. Demande à un admin de t'ajouter, puis reviens ici.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "E-mail ou mot de passe incorrect.";
  }
  if (/already registered|already been registered/i.test(message)) {
    return "Un compte existe déjà avec cette adresse : connecte-toi, ou demande un nouveau mot de passe.";
  }
  if (/password/i.test(message) && /least|6|caract/i.test(message)) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }
  return `Une erreur est survenue : ${message}`;
}

function EntreePage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  async function connecterGoogle() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (err) {
      setBusy(false);
      setError(messageLisible(err.message));
    }
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const adresse = email.trim().toLowerCase();

    if (mode === "oubli") {
      const { error: err } = await supabase.auth.resetPasswordForEmail(adresse, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setBusy(false);
      if (err) setError(messageLisible(err.message));
      else
        setInfo(
          "Si cette adresse est autorisée, un lien pour choisir un mot de passe vient d'être envoyé.",
        );
      return;
    }

    if (mode === "inscription") {
      const { data, error: err } = await supabase.auth.signUp({
        email: adresse,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      setBusy(false);
      if (err) {
        setError(messageLisible(err.message));
        return;
      }
      if (data.session) {
        navigate({ to: "/" });
      } else {
        setInfo("Compte créé. Ouvre le mail de confirmation reçu, puis reviens te connecter.");
        setMode("connexion");
      }
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: adresse, password });
    setBusy(false);
    if (err) {
      setError(messageLisible(err.message));
      return;
    }
    navigate({ to: "/" });
  }

  const titre =
    mode === "inscription"
      ? "Créer mon accès"
      : mode === "oubli"
        ? "Mot de passe oublié"
        : "Se connecter";

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
              <h2 className="mt-md font-label-md text-label-md uppercase text-on-surface-variant">
                {titre}
              </h2>

              {error && (
                <p
                  className="mt-md border border-error bg-error-container p-sm font-body-sm text-on-error-container"
                  role="alert"
                >
                  {error}
                </p>
              )}
              {info && (
                <p
                  className="mt-md border border-outline-variant p-sm font-body-sm text-on-surface-variant"
                  role="status"
                >
                  {info}
                </p>
              )}

              <form onSubmit={soumettre} className="mt-md flex flex-col gap-md">
                <div className="flex flex-col gap-xs">
                  <Label htmlFor="auth-email">Adresse e-mail</Label>
                  <Input
                    id="auth-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11"
                  />
                </div>
                {mode !== "oubli" && (
                  <div className="flex flex-col gap-xs">
                    <Label htmlFor="auth-password">Mot de passe</Label>
                    <Input
                      id="auth-password"
                      type="password"
                      autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                    {mode === "inscription" && (
                      <p className="font-body-sm text-on-surface-variant">Au moins 8 caractères.</p>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={busy}
                  className="h-12 w-full rounded-none font-label-md text-xs uppercase text-on-primary"
                >
                  {busy
                    ? "Patiente…"
                    : mode === "inscription"
                      ? "Créer mon accès"
                      : mode === "oubli"
                        ? "Envoyer le lien"
                        : "Se connecter"}
                </Button>
              </form>

              <div className="mt-md flex flex-col gap-xs font-body-sm">
                {mode === "connexion" && (
                  <>
                    <button
                      type="button"
                      className="text-left underline"
                      onClick={() => {
                        setMode("inscription");
                        setError(null);
                        setInfo(null);
                      }}
                    >
                      Première connexion : créer mon mot de passe
                    </button>
                    <button
                      type="button"
                      className="text-left underline"
                      onClick={() => {
                        setMode("oubli");
                        setError(null);
                        setInfo(null);
                      }}
                    >
                      Mot de passe oublié
                    </button>
                  </>
                )}
                {mode !== "connexion" && (
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => {
                      setMode("connexion");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Retour à la connexion
                  </button>
                )}
              </div>

              {mode === "connexion" && (
                <>
                  <div className="my-md flex items-center gap-sm text-on-surface-variant font-body-sm">
                    <span className="h-px flex-1 bg-outline-variant" />
                    ou
                    <span className="h-px flex-1 bg-outline-variant" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={connecterGoogle}
                    disabled={busy}
                    className="h-12 w-full rounded-none font-label-md text-xs uppercase"
                  >
                    Se connecter avec Google
                  </Button>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
