import { createFileRoute } from "@tanstack/react-router";
import { ModerationModule } from "@/components/manage/moderation-module";

export const Route = createFileRoute("/_authenticated/manage/moderation")({
  head: () => ({
    meta: [
      { title: "Modération — Happy Place" },
      { name: "description", content: "Éléments masqués et journal de modération." },
    ],
  }),
  component: ModerationModule,
});
