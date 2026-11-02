import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { FormFooter } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { InfoTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import {
  ADMIN_CONTACT_EMAIL,
  CONTACT_INTRO,
  ROLE_TAGS,
  WELCOME_STEPS,
} from "@/components/welcome/welcome-content";
import { useWelcomeSeen } from "@/components/welcome/use-welcome-seen";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

/**
 * Modale de bienvenue par rôle (maquettes F-01). Ouverte à la première arrivée dans le cadre
 * (welcome_seen_at vide) ou depuis « Aide ». À toute fermeture (« Commencer », Échap, croix),
 * la date est posée une seule fois par public.marquer_accueil_vu().
 */
export function WelcomeModal({
  open,
  onOpenChange,
  role,
  email,
  firstName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: AppRole;
  email: string;
  /** Prénom du profil ; l'adresse e-mail à défaut. */
  firstName: string | null;
}) {
  const qc = useQueryClient();
  const seen = useWelcomeSeen(email);
  const startRef = useRef<HTMLButtonElement>(null);

  const markSeen = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("marquer_accueil_vu");
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["welcome", email.toLowerCase()] }),
    onError: (e) => toast.error((e as Error).message),
  });

  function handleOpenChange(next: boolean) {
    // Pas d'appel inutile quand la modale est rouverte depuis « Aide » : la première date est conservée.
    if (!next && seen.data === false) markSeen.mutate();
    onOpenChange(next);
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Bienvenue sur Happy Place"
      description="Présentation de ton accueil selon ton rôle."
      initialFocusRef={startRef}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-base text-foreground">
            Bonjour {firstName || email}. Voici ce que tu trouves sur ton accueil.
          </p>
          <InfoTag>{ROLE_TAGS[role]}</InfoTag>
        </div>
        <ol className="m-0 flex list-none flex-col p-0">
          {WELCOME_STEPS[role].map((step, i) => (
            <li
              key={step.title}
              className="flex items-start gap-4 border-b border-outline-variant py-4 first:pt-0 last:border-b-0 last:pb-0"
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-primary font-label-sm text-[13px] font-medium text-primary"
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-col">
                <p className="text-base font-semibold leading-tight text-primary">{step.title}</p>
                <p className="mt-1 text-sm text-on-surface-variant">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-sm text-on-surface-variant">
          Le menu à gauche mène à la page de chaque bloc.
        </p>
        <div className="flex items-center gap-3 rounded-[4px] border border-outline-variant bg-card p-4">
          <span
            aria-hidden="true"
            className="material-symbols-outlined shrink-0 text-[22px] text-primary"
          >
            mail
          </span>
          <p className="text-sm text-foreground">
            {CONTACT_INTRO[role]}
            <a
              href={`mailto:${ADMIN_CONTACT_EMAIL}`}
              className="ml-1 rounded-[4px] px-1 font-semibold text-primary underline hover:bg-secondary"
            >
              {ADMIN_CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <p className="text-sm text-on-surface-variant">
          Tu peux revoir cet accueil à tout moment depuis « Aide ».
        </p>
      </div>
      <FormFooter>
        <Button
          ref={startRef}
          type="button"
          variant="highlight"
          onClick={() => handleOpenChange(false)}
        >
          Commencer
        </Button>
      </FormFooter>
    </FormDialog>
  );
}
