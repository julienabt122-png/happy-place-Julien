import { createFileRoute } from "@tanstack/react-router";
import { BlockersModule } from "@/components/modules/blockers-module";

export const Route = createFileRoute("/_authenticated/points-bloquants")({
  head: () => ({ meta: [{ title: "Points bloquants — Happy Place" }] }),
  component: PointsBloquantsPage,
});

function PointsBloquantsPage() {
  const { role } = Route.useRouteContext();
  return <BlockersModule role={role} />;
}
