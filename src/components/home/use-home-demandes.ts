import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canModerateSubmission, useMyTeams } from "@/components/modules/submission-actions";
import type { AppRole } from "@/lib/auth";
import {
  fetchMySubmissions,
  fetchSubmissions,
  fetchValidatedSubmissions,
  type Submission,
} from "@/lib/dashboard";

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
  // « À traiter » ne contient que les demandes des autres : les miennes sont dans « Mes demandes ».
  const isMine = (s: { submitted_by_email?: string | null }) =>
    (s.submitted_by_email ?? "").toLowerCase() === email.toLowerCase();
  const toReview = (submissions.data ?? []).filter(
    (s) => !isMine(s) && canModerateSubmission(role, myTeams.data ?? [], s),
  );
  // Décisions que j'ai moi-même rendues sur les demandes des autres (validées ou refusées) : l'historique
  // donne les identifiants, puis les demandes sont lues par la base, qui limite déjà à mon périmètre
  // (admin : tout ; manager : ses équipes). Réservé à ceux qui arbitrent.
  const canReview = role === "admin" || role === "manager";
  const myDecisions = useQuery({
    queryKey: ["submissions", "arbitrated", email],
    enabled: canReview && !!email,
    retry: false,
    queryFn: async (): Promise<{ s: Submission; decidedAt: string }[]> => {
      const { data: hist, error } = await supabase
        .from("submission_status_history")
        .select("submission_id, changed_at")
        .eq("changed_by_email", email.toLowerCase())
        .in("new_status", ["validée", "refusée"])
        .order("changed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      const latest = new Map<string, string>();
      for (const r of hist ?? []) if (!latest.has(r.submission_id)) latest.set(r.submission_id, r.changed_at);
      if (latest.size === 0) return [];
      const { data: subs, error: err2 } = await supabase
        .from("submissions")
        .select("*")
        .in("id", [...latest.keys()])
        .in("status", ["validée", "refusée"]);
      if (err2) throw err2;
      return ((subs ?? []) as Submission[])
        .filter((s) => !isMine(s))
        .map((s) => ({ s, decidedAt: latest.get(s.id) as string }))
        .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
    },
  });
  const arbitrated = myDecisions.data ?? [];
  return { myTeams, submissions, mine, validated, toReview, myDecisions, arbitrated };
}

export type HomeDemandes = ReturnType<typeof useHomeDemandes>;
