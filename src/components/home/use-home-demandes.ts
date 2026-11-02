import { useQuery } from "@tanstack/react-query";
import { canModerateSubmission, useMyTeams } from "@/components/modules/submission-actions";
import type { AppRole } from "@/lib/auth";
import { fetchMySubmissions, fetchSubmissions, fetchValidatedSubmissions } from "@/lib/dashboard";

export type DemandesTab = "a-traiter" | "mes-demandes" | "par-equipe";

/**
 * Données de la carte Demandes de l'accueil. Requêtes existantes, inchangées :
 * `toReview` = demandes en attente que cet utilisateur peut valider ou refuser (règle `canModerateSubmission`).
 */
export function useHomeDemandes(role: AppRole, email: string) {
  const myTeams = useMyTeams(role, email);
  const submissions = useQuery({
    queryKey: ["submissions"],
    queryFn: fetchSubmissions,
    retry: false,
  });
  const mine = useQuery({
    queryKey: ["submissions", "mine", email],
    queryFn: () => fetchMySubmissions(email),
    enabled: !!email,
    retry: false,
  });
  const validated = useQuery({
    queryKey: ["submissions", "validated"],
    queryFn: fetchValidatedSubmissions,
    retry: false,
  });
  const toReview = (submissions.data ?? []).filter((s) =>
    canModerateSubmission(role, myTeams.data ?? [], s),
  );
  return { myTeams, submissions, mine, validated, toReview };
}

export type HomeDemandes = ReturnType<typeof useHomeDemandes>;
