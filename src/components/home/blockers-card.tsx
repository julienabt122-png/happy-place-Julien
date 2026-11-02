import { useNavigate } from "@tanstack/react-router";
import type { UseQueryResult } from "@tanstack/react-query";
import { ClickableRow, RowChevron, RowMainButton } from "@/components/clickable-row";
import { EmptyState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import { BlockerFormDialog } from "@/components/modules/blocker-form-dialog";
import { BlockerStatusTag, SeverityTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import type { AppRole } from "@/lib/auth";
import type { Blocker } from "@/lib/dashboard";
import { plural } from "@/lib/plural";

/** Nombre de points montrés : « Voir tout » mène à /points-bloquants. */
const PREVIEW = 3;

export function BlockersCard({
  role,
  blockers,
}: {
  role: AppRole;
  blockers: UseQueryResult<Blocker[]>;
}) {
  const navigate = useNavigate();
  return (
    <ModuleCard
      id="points-bloquants"
      icon="warning"
      title="Points bloquants"
      counter={blockers.data ? plural(blockers.data.length, "actif", "actifs") : undefined}
      seeAllTo="/points-bloquants"
      seeAllLabel="Voir tout : points bloquants"
      footer={
        role === "admin" ? (
          <BlockerFormDialog
            trigger={
              <Button type="button" className="w-fit">
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Créer un point bloquant
              </Button>
            }
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-2.5 p-6">
        {blockers.isError && (
          <p className="text-body-sm text-error">Les points bloquants sont indisponibles.</p>
        )}
        {blockers.data?.length === 0 && (
          <EmptyState bare message="Aucun point bloquant en cours." />
        )}
        {blockers.data?.slice(0, PREVIEW).map((b) => (
          <ClickableRow
            key={b.id}
            accent={b.severity === "critical" ? "dark" : undefined}
            className="px-3.5 py-3"
          >
            <RowMainButton
              kind="page"
              label={`point bloquant, ${b.title}`}
              onOpen={() => void navigate({ to: "/points-bloquants" })}
              className="flex w-full items-center justify-between gap-4"
            >
              <span className="min-w-0 truncate text-sm font-medium text-primary">{b.title}</span>
              <span className="flex shrink-0 items-center gap-2">
                <SeverityTag severity={b.severity} />
                <BlockerStatusTag status={b.status} />
                <RowChevron />
              </span>
            </RowMainButton>
          </ClickableRow>
        ))}
      </div>
    </ModuleCard>
  );
}
