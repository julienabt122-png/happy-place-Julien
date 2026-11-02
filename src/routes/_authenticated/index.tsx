import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DepartureNotices } from "@/components/departure-notices";
import { BlockersCard } from "@/components/home/blockers-card";
import { DemandesCard } from "@/components/home/demandes-card";
import { MetricsCard } from "@/components/home/metrics-card";
import { NewsCard } from "@/components/home/news-card";
import { useHomeDemandes, type DemandesTab } from "@/components/home/use-home-demandes";
import { userDisplayName } from "@/components/modules/news-module";
import { useMyProfile } from "@/components/modules/use-my-profile";
import { fetchBlockers, fetchMetrics, fetchNews } from "@/lib/dashboard";
import { plural } from "@/lib/plural";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Happy Place — Actualités et vue d'ensemble" },
      {
        name: "description",
        content:
          "Pilotez les missions de recrutement IT et digital, les demandes des équipes, les alertes opérationnelles et les indicateurs du cabinet.",
      },
      { property: "og:title", content: "Happy Place — Vue d'ensemble" },
      {
        property: "og:description",
        content:
          "Suivez l'activité du cabinet, les missions de recrutement, les alertes et les indicateurs clés.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManagerSpace,
});

const SUMMARY_LINK =
  "rounded-sm font-semibold underline decoration-1 underline-offset-4 transition-all duration-150 hover:decoration-2";

function ManagerSpace() {
  const { role, email, user } = Route.useRouteContext();
  const profile = useMyProfile(email);
  const canReview = role === "admin" || role === "manager";
  const data = useHomeDemandes(role, email);
  const [tab, setTab] = useState<DemandesTab>(canReview ? "a-traiter" : "mes-demandes");

  const news = useQuery({ queryKey: ["news"], queryFn: fetchNews, retry: false });
  const blockers = useQuery({ queryKey: ["blockers"], queryFn: fetchBlockers, retry: false });
  const metrics = useQuery({ queryKey: ["metrics"], queryFn: fetchMetrics, retry: false });

  const drafts = news.data?.filter((n) => n.status === "brouillon").length ?? 0;

  // Phrase d'accueil : on attend les données pour ne pas afficher « rien à traiter » par erreur.
  const ready =
    !data.submissions.isLoading && !data.mine.isLoading && !news.isLoading && !blockers.isLoading;
  // Prénom de allowed_users (rempli à /choisir-role). Vide en base : « Bonjour » seul, rien d'inventé.
  const firstName = profile.data?.firstName ?? "";
  const ongoing = (data.mine.data ?? []).filter((s) => s.status === "en attente").length;
  const toReview = data.toReview.length;
  const activeBlockers = blockers.data?.length ?? 0;

  function goToTab(next: DemandesTab) {
    setTab(next);
    // Le focus va à l'onglet actif une fois le changement affiché.
    setTimeout(
      () =>
        document.querySelector<HTMLElement>('#demandes [role="tab"][data-state="active"]')?.focus(),
      0,
    );
  }

  const parts: ReactNode[] = [];
  if (role === "collaborateur") {
    if (ongoing > 0)
      parts.push(
        <span key="d">
          <a
            href="#demandes"
            className={SUMMARY_LINK}
            onClick={(e) => {
              e.preventDefault();
              goToTab("mes-demandes");
            }}
          >
            {plural(ongoing, "demande en attente", "demandes en attente")}
          </a>{" "}
          de décision.
        </span>,
      );
  } else {
    if (toReview > 0)
      parts.push(
        <a
          key="d"
          href="#demandes"
          className={SUMMARY_LINK}
          onClick={(e) => {
            e.preventDefault();
            goToTab("a-traiter");
          }}
        >
          {plural(toReview, "demande à traiter", "demandes à traiter")}
          {role === "manager" ? " de ton équipe" : ""}
        </a>,
      );
    if (drafts > 0)
      parts.push(
        <a key="n" href="#actualites" className={SUMMARY_LINK}>
          {plural(drafts, "brouillon à publier", "brouillons à publier")}
        </a>,
      );
    if (role === "admin" && activeBlockers > 0)
      parts.push(
        <a key="b" href="#points-bloquants" className={SUMMARY_LINK}>
          {plural(activeBlockers, "point bloquant actif", "points bloquants actifs")}
        </a>,
      );
  }

  return (
    <div className="flex flex-col gap-8 font-body-md">
      {email && <DepartureNotices email={email} />}

      <h1 className="sr-only">Accueil</h1>
      <p className="min-h-6 text-base text-primary">
        Bonjour{firstName ? ` ${firstName}` : ""}
        {ready &&
          (parts.length > 0 ? (
            <>
              ,{" "}
              {parts.map((p, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {p}
                </span>
              ))}
            </>
          ) : (
            ", rien à traiter pour le moment."
          ))}
      </p>

      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <DemandesCard role={role} email={email} data={data} tab={tab} onTabChange={setTab} />
        <div className="flex flex-col justify-between gap-6">
          <NewsCard
            role={role}
            email={email}
            fallbackName={userDisplayName(user, email)}
            news={news}
          />
          <BlockersCard role={role} blockers={blockers} />
        </div>
      </div>

      <MetricsCard metrics={metrics} />
    </div>
  );
}
