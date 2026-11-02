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
        content: "Gestion de l'activité d'un cabinet de recrutement spécialisé dans l'IT et le digital.",
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

const tabs = [
  { to: "/manage/news", label: "ACTUALITÉS", title: "Actualités" },
  { to: "/manage/submissions", label: "DEMANDES", title: "Demandes" },
  { to: "/manage/blockers", label: "POINTS BLOQUANTS", title: "Points bloquants" },
  { to: "/manage/metrics", label: "INDICATEURS", title: "Indicateurs" },
  { to: "/manage/users", label: "UTILISATEURS AUTORISÉS", title: "Utilisateurs autorisés" },
] as const;

function ManageLayout() {
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = tabs.find((t) => pathname.startsWith(t.to));
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
        {/* Vraie hiérarchie : « Gestion / {sous-page} ». Les onglets et les routes ne changent pas. */}
        <PageHeader
          title={current?.title ?? "Gestion des données"}
          crumbs={current ? [{ label: "Gestion", to: "/manage" }] : undefined}
          actions={
            <Button asChild variant="outline">
              <Link to="/">Retour à la vue d'ensemble</Link>
            </Button>
          }
        />

        <nav className="flex flex-wrap gap-xs border-b border-outline-variant pb-sm">
          {tabs.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="px-md py-xs border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container"
              activeProps={{ className: "bg-primary text-on-primary border-primary" }}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <Outlet />
      </div>
    </div>
  );
}
