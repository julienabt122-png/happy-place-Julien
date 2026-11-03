import { createFileRoute } from "@tanstack/react-router";
import { UsersModule } from "@/components/manage/users-module";

export const Route = createFileRoute("/_authenticated/manage/users")({
  head: () => ({
    meta: [
      { title: "Utilisateurs — Happy Place" },
      {
        name: "description",
        content: "Gérer les personnes autorisées à se connecter et leurs équipes.",
      },
      { property: "og:title", content: "Utilisateurs — Happy Place" },
      { property: "og:description", content: "Gérer qui peut accéder à Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { email } = Route.useRouteContext();
  return <UsersModule me={email} />;
}
