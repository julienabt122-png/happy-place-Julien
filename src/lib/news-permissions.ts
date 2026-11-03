import type { AppRole } from "@/lib/auth";
import type { News } from "@/lib/dashboard";

/**
 * Peut modifier cette actualité publiée : l'admin (toutes) ou le manager qui en est l'auteur.
 * Simple confort d'affichage : la base (RLS) reste la référence.
 */
export function canEditPublishedNews(role: AppRole, email: string, n: News) {
  return (
    n.status === "publiée" &&
    (role === "admin" ||
      (role === "manager" && (n.author_email ?? "").toLowerCase() === email.toLowerCase()))
  );
}
