import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// US-49 : l'utilisateur connecté reçoit son propre résumé par e-mail, à la demande.
// L'adresse du destinataire est lue côté serveur dans la session : rien n'est envoyé depuis ici.
async function sendMySummary(): Promise<string> {
  const { data, error } = await supabase.functions.invoke("envoyer-mon-resume", {
    body: { app_url: `${window.location.origin}/` },
  });
  if (error) {
    // Le message du serveur (ex. « réessayez dans une minute ») est dans le corps de la réponse.
    const response = (error as { context?: Response }).context;
    let message = "L'envoi a échoué, réessayez plus tard.";
    try {
      const body = await response?.json();
      if (body?.error) message = String(body.error);
    } catch {
      // réponse sans corps lisible : message par défaut
    }
    throw new Error(message);
  }
  return String((data as { email?: string } | null)?.email ?? "");
}

export function SendSummaryButton() {
  const send = useMutation({ mutationFn: sendMySummary });

  return (
    <div className="flex flex-col gap-2 sm:items-end">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={send.isPending}
        onClick={() => send.mutate()}
      >
        {send.isPending ? "Envoi en cours" : "Recevoir mon résumé par e-mail"}
      </Button>
      <p aria-live="polite" className="min-h-5 font-mono text-[13px] text-muted-foreground">
        {send.isSuccess && `Résumé envoyé à ${send.data}.`}
        {send.isError && (send.error as Error).message}
      </p>
    </div>
  );
}
