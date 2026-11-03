import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MyProfile = {
  firstName: string | null;
  lastName: string | null;
  team: string | null;
  contactEmail: string | null;
};

/**
 * Prénom, nom et équipe de la personne connectée : sa propre ligne de allowed_users
 * (remplie à /choisir-role, lisible par la règle « Users see own entry »). Aucune valeur inventée :
 * une donnée absente en base reste `null`.
 */
export function useMyProfile(email: string | null | undefined) {
  return useQuery({
    queryKey: ["profile", "mine", email],
    enabled: !!email,
    retry: false,
    queryFn: async (): Promise<MyProfile> => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select("first_name, last_name, team, contact_email")
        .eq("email", (email ?? "").toLowerCase())
        .maybeSingle();
      if (error) throw error;
      const clean = (v: string | null | undefined) => v?.trim() || null;
      return {
        firstName: clean(data?.first_name),
        lastName: clean(data?.last_name),
        team: clean(data?.team),
        contactEmail: clean(data?.contact_email),
      };
    },
  });
}

/** « Camille Moreau », ou « » quand ni le prénom ni le nom ne sont renseignés. */
export function profileFullName(p: MyProfile | undefined) {
  return [p?.firstName, p?.lastName].filter(Boolean).join(" ");
}
