import type { AppRole } from "@/lib/auth";

/** Adresse du contact admin affichée dans l'accueil et l'aide (adresse d'admin de Julien, décision du 2026-11-04). */
export const ADMIN_CONTACT_EMAIL = "julienabt122@gmail.com";

export const ROLE_TAGS: Record<AppRole, string> = {
  admin: "ADMIN",
  manager: "MANAGER",
  collaborateur: "COLLABORATEUR",
};

type Step = { title: string; text: string };

/** Les 3 étapes de la modale de bienvenue par rôle (maquettes F-01 « Modale bienvenue »). */
export const WELCOME_STEPS: Record<AppRole, [Step, Step, Step]> = {
  admin: [
    {
      title: "Faire une demande ou traiter celles qui attendent",
      text: "Clique sur « Faire une demande » pour la tienne. Dans « Demandes », valide ou refuse ce qui attend.",
    },
    {
      title: "Tenir à jour les contenus",
      text: "Publie les brouillons des managers dans « Actualités », puis modifie les points bloquants et les indicateurs depuis leur page. Un indicateur à relire se corrige avec « Modifier ».",
    },
    {
      title: "Gérer les utilisateurs et les équipes",
      text: "Dans « Gestion », change le rôle ou l'équipe d'une personne, retire son accès avec « Retirer l'accès » et vérifie que chaque équipe a un manager.",
    },
  ],
  manager: [
    {
      title: "Faire une demande ou trancher celles de mon équipe",
      text: "Clique sur « Faire une demande » pour la tienne. Dans « À traiter », ouvre une demande de ton équipe, puis clique sur « Valider » ou « Refuser ». Un refus demande un motif.",
    },
    {
      title: "Rédiger et publier mes actualités",
      text: "Clique sur « Rédiger une actualité » pour enregistrer un brouillon. Dans « Mes brouillons », relis-le, puis clique sur « Publier ».",
    },
    {
      title: "Suivre les points bloquants et les indicateurs",
      text: "« Points bloquants » liste les sujets qui freinent le travail, et « Indicateurs » donne les chiffres clés. Tu peux choisir ceux qui s'affichent sur ton accueil.",
    },
  ],
  collaborateur: [
    {
      title: "Faire et suivre mes demandes",
      text: "Dans « Mes demandes », clique sur « Faire une demande », puis suis son statut et la décision du manager.",
    },
    {
      title: "Lire les actualités et les demandes validées",
      text: "« Actualités du cabinet » donne les nouvelles de l'entreprise. « Demandes validées » montre ce qui a été accordé dans toutes les équipes.",
    },
    {
      title: "Suivre les points bloquants et les indicateurs",
      text: "« Points bloquants » liste les sujets qui freinent le travail, et « Indicateurs » donne les chiffres clés. Tu peux les lire, pas les modifier.",
    },
  ],
};

/** Début de la phrase du bloc contact (le lien suit). */
export const CONTACT_INTRO: Record<AppRole, string> = {
  admin: "Les autres utilisateurs t'écrivent à :",
  manager: "Une question ? Écris à l'admin :",
  collaborateur: "Une question ? Écris à l'admin :",
};
