import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { ModuleCard } from "@/components/module-card";
import { BlockerFormDialog } from "@/components/modules/blocker-form-dialog";
import { Button } from "@/components/ui/button";
import { BlockerArchive } from "@/components/dashboard-extras";
import type { AppRole } from "@/lib/auth";
import { fetchBlockers, timeAgo, updateBlockerStatus } from "@/lib/dashboard";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

export function BlockersModule({ role }: { role: AppRole }) {
  const qc = useQueryClient();
  const isAdmin = role === "admin";
  const [archiveOpen, setArchiveOpen] = useState(false);
  const blockers = useQuery({ queryKey: ["blockers"], queryFn: fetchBlockers, retry: false });
  const setBlocker = useMutation({
    mutationFn: updateBlockerStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blockers"] }),
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-[32px] font-semibold leading-tight text-primary">
        Points bloquants
      </h1>
      <ModuleCard
        main
        icon="warning"
        title="Points bloquants"
        counter={blockers.data ? `${blockers.data.length} en cours` : undefined}
        counterTone="dark"
        footer={
          // Même règle que l'accueil : création réservée à l'admin (la base refuse les autres rôles).
          isAdmin ? (
            <BlockerFormDialog
              trigger={
                <Button type="button">
                  <Icon name="add" className="text-[18px]" /> Créer un point bloquant
                </Button>
              }
            />
          ) : undefined
        }
        headerAction={
          <Button
            type="button"
            variant="link"
            size="sm"
            aria-haspopup="dialog"
            onClick={() => setArchiveOpen(true)}
          >
            Voir l'archive
          </Button>
        }
      >
        <div className="space-y-sm p-6">
          {blockers.isLoading && (
            <p className="text-body-sm text-on-surface-variant">Chargement…</p>
          )}
          {blockers.isError && (
            <p className="text-body-sm text-error">Les points bloquants sont indisponibles.</p>
          )}
          {blockers.data?.length === 0 && <EmptyState message="Aucun point bloquant en cours." />}
          {blockers.data?.map((b) => {
            const critical = b.severity === "critical";
            return (
              <div
                key={b.id}
                className={`${critical ? "accent-bar " : ""}bg-card border border-outline-variant p-sm flex items-start justify-between`}
              >
                <div className="flex gap-md">
                  <Icon
                    name={critical ? "error" : "warning"}
                    className={
                      critical
                        ? "text-error mt-1 [font-variation-settings:'FILL'_1]"
                        : "text-secondary mt-1"
                    }
                  />
                  <div>
                    <p className="font-body-md text-primary font-bold">{b.title}</p>
                    <p className="text-body-sm text-on-surface-variant">{b.description}</p>
                    <div className="flex items-center gap-sm mt-xs">
                      <span className="text-[11px] font-label-sm bg-surface-container-highest px-xs py-0.5">
                        {b.department}
                      </span>
                      <span className="text-[11px] font-label-sm text-on-surface-variant">
                        Mis à jour {timeAgo(b.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <select
                  aria-label={`Statut de ${b.title}`}
                  value={b.status}
                  disabled={!isAdmin}
                  onChange={(e) => setBlocker.mutate({ id: b.id, status: e.target.value })}
                  className={`bg-transparent border-none text-xs font-label-sm focus:outline-none cursor-pointer ${critical ? "text-error" : "text-on-surface-variant"}`}
                >
                  <option>OUVERT</option>
                  <option>EN COURS</option>
                  <option>SURVEILLANCE</option>
                  <option
                    disabled={b.status === "OUVERT"}
                    title={b.status === "OUVERT" ? "Passe d'abord par EN COURS" : undefined}
                  >
                    RÉSOLU
                  </option>
                </select>
              </div>
            );
          })}
        </div>
      </ModuleCard>
      <BlockerArchive open={archiveOpen} onClose={() => setArchiveOpen(false)} />
    </div>
  );
}
