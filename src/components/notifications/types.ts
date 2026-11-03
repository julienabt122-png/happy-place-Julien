import type { QueryKey } from "@tanstack/react-query";
import type { LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { AppRole } from "@/lib/auth";

/** Une ligne de la cloche : titre, texte et étiquette de type, avec une fenêtre de détail facultative. */
export type NotificationItem = {
  id: string;
  type: string;
  /** Étiquette de type affichée à côté du titre (ex. « Départ »). */
  tag: string;
  title: string;
  summary: string;
  /** Si présent, la ligne est cliquable et ouvre une fenêtre ; `render` reçoit la fonction qui la ferme. */
  detail?: { title: string; render: (close: () => void) => ReactNode };
};

/**
 * Un type de notification. Pour en ajouter un, il suffit d'ajouter une entrée à NOTIFICATION_SOURCES :
 * l'écran de la cloche ne contient aucune logique propre à un type.
 */
export type NotificationSource = {
  type: string;
  tag: string;
  /** Rôles qui reçoivent ce type de notification. */
  roles: AppRole[];
  queryKey: (email: string) => QueryKey;
  load: (email: string) => Promise<NotificationItem[]>;
  /** Lien « Voir tout » du pied du panneau, pour les rôles listés. */
  seeAll?: { to: LinkProps["to"]; label: string; roles: AppRole[] };
};
