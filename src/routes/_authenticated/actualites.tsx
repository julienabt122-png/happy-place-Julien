import { createFileRoute } from "@tanstack/react-router";
import { NewsModule, userDisplayName } from "@/components/modules/news-module";

export const Route = createFileRoute("/_authenticated/actualites")({
  head: () => ({ meta: [{ title: "Actualités — Happy Place" }] }),
  // ?statut=brouillons : ouvre la liste sur le filtre « Brouillons » (lien « N brouillons à publier » de l'accueil).
  validateSearch: (search: Record<string, unknown>): { statut?: "brouillons" } =>
    search.statut === "brouillons" ? { statut: "brouillons" } : {},
  component: ActualitesPage,
});

function ActualitesPage() {
  const { role, email, user } = Route.useRouteContext();
  const { statut } = Route.useSearch();
  return (
    <NewsModule
      role={role}
      email={email}
      name={userDisplayName(user, email)}
      initialFilter={statut === "brouillons" ? "drafts" : undefined}
    />
  );
}
