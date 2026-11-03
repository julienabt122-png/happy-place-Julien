import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Ce qu'on lit de MA ligne allowed_users pour l'accueil : accueil déjà vu, indicateurs choisis. */
export type MyHomePrefs = { seen: boolean; homeMetricKeys: string[] | null };

export const homePrefsKey = (email: string) => ["welcome", email.toLowerCase()] as const;

async function fetchMyHomePrefs(email: string): Promise<MyHomePrefs> {
  const { data, error } = await supabase
    .from("allowed_users")
    .select("welcome_seen_at, home_metric_keys")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  // Sans ligne, on considère l'accueil comme vu : la modale ne s'ouvre pas toute seule.
  return { seen: !data || !!data.welcome_seen_at, homeMetricKeys: data?.home_metric_keys ?? null };
}

/**
 * Vrai si la personne connectée a déjà vu l'accueil (allowed_users.welcome_seen_at renseignée).
 * Sa propre ligne est lisible par la règle « Users see own entry ». Une seule requête, partagée
 * avec useHomeMetricKeys (même clé de cache).
 */
export function useWelcomeSeen(email: string) {
  return useQuery({
    queryKey: homePrefsKey(email),
    retry: false,
    queryFn: () => fetchMyHomePrefs(email),
    select: (d) => d.seen,
  });
}

/** Clés des indicateurs choisis pour mon accueil (null : affichage par défaut). Même requête que useWelcomeSeen. */
export function useHomeMetricKeys(email: string) {
  return useQuery({
    queryKey: homePrefsKey(email),
    retry: false,
    queryFn: () => fetchMyHomePrefs(email),
    select: (d) => d.homeMetricKeys,
  });
}
