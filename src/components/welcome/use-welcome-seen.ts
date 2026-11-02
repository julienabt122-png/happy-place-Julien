import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Vrai si la personne connectée a déjà vu l'accueil (allowed_users.welcome_seen_at renseignée).
 * Sa propre ligne est lisible par la règle « Users see own entry ». Sans ligne, on considère
 * l'accueil comme vu : la modale ne s'ouvre pas toute seule.
 */
export function useWelcomeSeen(email: string) {
  return useQuery({
    queryKey: ["welcome", email.toLowerCase()],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("welcome_seen_at")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return !data || !!data.welcome_seen_at;
    },
  });
}
