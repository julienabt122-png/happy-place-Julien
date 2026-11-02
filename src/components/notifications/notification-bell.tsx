import { useQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { FormDialog } from "@/components/modules/form-dialog";
import { NOTIFICATION_SOURCES } from "@/components/notifications/sources";
import type { NotificationItem } from "@/components/notifications/types";
import { InfoTag } from "@/components/status-tag";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AppRole } from "@/lib/auth";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  );
}

/** Cloche de notifications de l'en-tête (admin et manager) : badge de compteur et panneau de 360 px. */
export function NotificationBell({ role, email }: { role: AppRole; email: string }) {
  const sources = useMemo(() => NOTIFICATION_SOURCES.filter((s) => s.roles.includes(role)), [role]);
  const results = useQueries({
    queries: sources.map((s) => ({
      queryKey: s.queryKey(email),
      queryFn: () => s.load(email),
      retry: false,
    })),
  });
  const bellRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState<NotificationItem | null>(null);

  const items = results.flatMap((r) => r.data ?? []);
  const loading = results.some((r) => r.isLoading);
  const count = items.length;
  const seeAll = sources.flatMap((s) => (s.seeAll?.roles.includes(role) ? [s.seeAll] : []));

  const label =
    count === 0
      ? "Notifications, aucune nouvelle"
      : `Notifications, ${count} nouvelle${count > 1 ? "s" : ""}`;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={bellRef}
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            className="relative border-outline-variant bg-card hover:bg-hover-gris data-[state=open]:rounded-b-none data-[state=open]:border-b-0 data-[state=open]:border-primary data-[state=open]:bg-card"
          >
            <Icon name="notifications" />
            {count > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-primary bg-highlight px-1 font-label-sm text-[11px] font-semibold leading-none text-primary"
              >
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={-1}
          aria-label="Notifications"
          className="w-[360px] rounded-[8px] rounded-tr-none border-primary bg-card p-6 shadow-none"
        >
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-base font-semibold text-primary">Notifications</h2>
            <Button type="button" variant="outline" className="px-4" onClick={() => setOpen(false)}>
              Fermer
            </Button>
          </div>
          {loading && (
            <p className="text-sm text-on-surface-variant">Chargement des notifications…</p>
          )}
          {!loading && count === 0 && (
            <p className="text-sm text-on-surface-variant">Aucune notification pour le moment.</p>
          )}
          {count > 0 && (
            <ul role="list" className="divide-y divide-outline-variant">
              {items.map((n) => (
                <li key={`${n.type}-${n.id}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-haspopup={n.detail ? "dialog" : undefined}
                    aria-label={`Ouvrir le détail : ${n.title}`}
                    disabled={!n.detail}
                    onClick={() => {
                      setOpen(false);
                      setOpened(n);
                    }}
                    className="h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-[4px] px-2 py-3 text-left font-normal"
                  >
                    <span className="flex w-full items-start justify-between gap-3">
                      <span className="text-sm font-bold text-primary wrap-anywhere">
                        {n.title}
                      </span>
                      <InfoTag>{n.tag}</InfoTag>
                    </span>
                    <span className="font-label-sm text-xs text-on-surface-variant">
                      {n.summary}
                    </span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {seeAll.length > 0 && (
            <div className="mt-4 flex justify-end border-t border-outline-variant pt-4">
              {seeAll.map((a) => (
                <Button key={a.label} asChild variant="link">
                  <Link to={a.to} aria-label={a.label} onClick={() => setOpen(false)}>
                    Voir tout
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <FormDialog
        open={!!opened}
        onOpenChange={(o) => !o && setOpened(null)}
        title={opened?.detail?.title ?? "Notification"}
        description="Détail de la notification."
        returnFocusRef={bellRef}
      >
        {opened?.detail?.render(() => setOpened(null))}
      </FormDialog>
    </>
  );
}
