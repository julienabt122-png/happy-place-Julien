import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Decider = { first_name: string | null; last_name: string | null; role: string };
export type Decision = { changed_at: string; changed_by_name: string | null };

/**
 * Qui doit trancher MES demandes : managers de mon équipe (collaborateur), admins (manager).
 * Une seule requête partagée par l'accueil et /demandes (jamais une par ligne) ; la fonction
 * ne renvoie ni e-mail ni autre équipe.
 */
export function useDeciders(enabled: boolean) {
  return useQuery({
    queryKey: ["submissions", "decider"],
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Decider[]> => {
      const { data, error } = await supabase.rpc("qui_tranche_ma_demande");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Date et auteur de la dernière décision (validée ou refusée) de MES demandes. Une seule lecture,
 * limitée aux identifiants fournis (mes propres demandes décidées) et aux quatre colonnes utiles.
 */
export function useDecisions(ids: string[]) {
  const key = [...ids].sort();
  return useQuery({
    queryKey: ["submissions", "decisions", key],
    enabled: key.length > 0,
    retry: false,
    queryFn: async (): Promise<Record<string, Decision>> => {
      const { data, error } = await supabase
        .from("submission_status_history")
        .select("submission_id, changed_at, changed_by_name, new_status")
        .in("submission_id", key)
        .in("new_status", ["validée", "refusée"])
        .order("changed_at", { ascending: false });
      if (error) throw error;
      const latest: Record<string, Decision> = {};
      for (const r of data ?? []) {
        if (r.submission_id in latest) continue;
        const name = r.changed_by_name?.trim() ?? "";
        // Jamais d'adresse e-mail à l'écran : un nom qui en ressemble à une est ignoré.
        latest[r.submission_id] = {
          changed_at: r.changed_at,
          changed_by_name: name && !name.includes("@") ? name : null,
        };
      }
      return latest;
    },
  });
}

/** « À trancher par Kesha, manager » ; deux noms maximum puis « et N autres » ; vide : « En attente de décision ». */
export function deciderSentence(deciders: Decider[] | undefined) {
  const names = (deciders ?? []).map((d) => d.first_name || d.last_name).filter(Boolean);
  if (names.length === 0 || !deciders) return "En attente de décision";
  const role = deciders[0].role;
  if (names.length === 1) return `À trancher par ${names[0]}, ${role}`;
  if (names.length === 2) return `À trancher par ${names[0]} et ${names[1]}, ${role}s`;
  const rest = names.length - 2;
  return `À trancher par ${names[0]}, ${names[1]} et ${rest} autre${rest > 1 ? "s" : ""}, ${role}s`;
}
