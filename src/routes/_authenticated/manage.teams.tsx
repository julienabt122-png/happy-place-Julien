import { createFileRoute } from "@tanstack/react-router";
import { TeamsModule } from "@/components/manage/teams-module";

export const Route = createFileRoute("/_authenticated/manage/teams")({
  head: () => ({
    meta: [
      { title: "Équipes — Happy Place" },
      { name: "description", content: "Gérer les équipes et leurs managers." },
      { property: "og:title", content: "Équipes — Happy Place" },
      { property: "og:description", content: "Gérer les équipes de Happy Place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamsModule,
});
