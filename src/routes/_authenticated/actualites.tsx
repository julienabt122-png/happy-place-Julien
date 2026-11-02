import { createFileRoute } from "@tanstack/react-router";
import { NewsModule, userDisplayName } from "@/components/modules/news-module";

export const Route = createFileRoute("/_authenticated/actualites")({
  head: () => ({ meta: [{ title: "Actualités — Happy Place" }] }),
  component: ActualitesPage,
});

function ActualitesPage() {
  const { role, email, user } = Route.useRouteContext();
  return <NewsModule role={role} email={email} name={userDisplayName(user, email)} />;
}
