import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { processAttachmentDeletionQueue } from "@/lib/dashboard";

export const Route = createFileRoute("/_authenticated/manage")({
  head: () => ({
    meta: [
      { title: "Gestion des données — Happy Place" },
      {
        name: "description",
        content:
          "Gérer les actualités du cabinet, les demandes internes, les alertes sur les recrutements et les indicateurs de performance.",
      },
      { property: "og:title", content: "Gestion des données — Happy Place" },
      {
        property: "og:description",
        content:
          "Gestion de l'activité d'un cabinet de recrutement spécialisé dans l'IT et le digital.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (context.role !== "admin") throw redirect({ to: "/" });
  },
  component: ManageLayout,
});

// Anciennes pages de gestion (la page Actualités a rejoint /actualites) : plus listées dans le menu Gestion (les pages de module les remplacent),
// mais toujours joignables par leur adresse tant que les pages de module n'ont pas leurs suppressions.
const legacyPages = [
  { to: "/manage/submissions", title: "Demandes" },
  { to: "/manage/blockers", title: "Points bloquants" },
  { to: "/manage/metrics", title: "Indicateurs" },
] as const;

function ManageLayout() {
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const legacy = legacyPages.find((t) => pathname.startsWith(t.to));
  // Suppression silencieuse des pièces jointes échues, une fois par chargement de /manage
  useEffect(() => {
    processAttachmentDeletionQueue()
      .then((r) => {
        if (r.remaining > 0) toast.error(`${r.remaining} document(s) n'ont pas pu être supprimés.`);
        else if (r.deleted > 0) toast.success(`${r.deleted} document(s) supprimé(s)`);
      })
      .catch(() => toast.error("La suppression des documents échus a échoué."))
      .finally(() => qc.invalidateQueries({ queryKey: ["attachment_deletion_queue"] }));
  }, [qc]);
  return (
    <div className="font-body-md">
      <div className="space-y-md">
        {/* Le nom « Gestion » est dans le bandeau de l'AppShell : pas de fil d'Ariane en double dans le contenu. */}
        {legacy && (
          <PageHeader
            title={legacy.title}
            actions={
              <Button asChild variant="outline">
                <Link to="/">Retour à la vue d'ensemble</Link>
              </Button>
            }
          />
        )}

        <Outlet />
      </div>
    </div>
  );
}
