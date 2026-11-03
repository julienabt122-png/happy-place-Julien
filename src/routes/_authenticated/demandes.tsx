import { createFileRoute } from "@tanstack/react-router";
import { SubmissionsModule } from "@/components/modules/submissions-module";

export const Route = createFileRoute("/_authenticated/demandes")({
  head: () => ({ meta: [{ title: "Demandes — Happy Place" }] }),
  component: DemandesPage,
});

function DemandesPage() {
  const { role, email } = Route.useRouteContext();
  return <SubmissionsModule role={role} email={email} />;
}
