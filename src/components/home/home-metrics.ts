import type { Metric } from "@/lib/dashboard";

/** Indicateurs affichés tant que la personne n'a rien choisi. */
export const DEFAULT_HOME_KEYS = ["training_kpi", "active_users"];
export const MAX_HOME_METRICS = 4;

/**
 * Clés à afficher, dans l'ordre choisi. Les clés qui n'existent plus dans `metrics` sont ignorées
 * sans erreur (quand la liste est connue) ; sans clé valide, on revient aux deux indicateurs par défaut.
 */
export function resolveHomeKeys(
  stored: string[] | null | undefined,
  metrics: Metric[] | undefined,
): string[] {
  const picked = (stored ?? [])
    .filter((k) => !metrics || metrics.some((m) => m.key === k))
    .slice(0, MAX_HOME_METRICS);
  return picked.length > 0 ? picked : DEFAULT_HOME_KEYS;
}
