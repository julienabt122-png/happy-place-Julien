/**
 * Définitions fixes des indicateurs, indexées par leur clé technique (le libellé est modifiable par
 * l'admin, la clé non). Pas de colonne en base : une clé sans entrée n'affiche ni info-bulle ni définition.
 */
export type MetricDefinition = { definition: string; scope: string };

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  training_kpi: {
    definition: "Part des candidats présentés à un client qui ont été embauchés.",
    scope: "Entreprise",
  },
  active_users: {
    definition: "Nombre de missions de recrutement en cours de traitement.",
    scope: "Entreprise",
  },
  engagement: {
    definition: "Part des offres faites aux candidats qui sont acceptées.",
    scope: "Entreprise",
  },
  absenteeism: {
    definition: "Part des candidats contactés qui répondent à la sollicitation.",
    scope: "Entreprise",
  },
  nps: {
    definition:
      "Score de recommandation donné par les candidats à l'issue du processus : part de ceux qui recommanderaient le cabinet moins part de ceux qui ne le recommanderaient pas.",
    scope: "Entreprise",
  },
  open_positions: {
    definition: "Nombre de postes confiés par les clients et pas encore pourvus.",
    scope: "Entreprise",
  },
  training_hours: {
    definition: "Nombre d'entretiens réalisés avec des candidats.",
    scope: "Entreprise",
  },
  turnover: {
    definition: "Nombre moyen de jours entre l'ouverture d'un poste et l'embauche.",
    scope: "Entreprise",
  },
};

export const metricDefinitionOf = (key: string): MetricDefinition | undefined =>
  METRIC_DEFINITIONS[key];
