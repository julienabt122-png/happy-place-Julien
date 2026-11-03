import { createFileRoute } from "@tanstack/react-router";
import { MetricsModule } from "@/components/modules/metrics-module";

export const Route = createFileRoute("/_authenticated/indicateurs")({
  head: () => ({ meta: [{ title: "Indicateurs — Happy Place" }] }),
  component: IndicateursPage,
});

function IndicateursPage() {
  const { role } = Route.useRouteContext();
  return <MetricsModule role={role} />;
}
