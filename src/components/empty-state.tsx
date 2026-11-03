import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * Bloc sans élément (planche « États vides et erreurs ») : un titre en 16 px semi-gras, une aide
 * en 14 px et, si le rôle peut agir, un bouton. `bare` : sans marge, quand le parent en a déjà.
 */
export function EmptyState({
  message,
  help,
  action,
  bare = false,
}: {
  message: string;
  help?: string;
  action?: ReactNode;
  bare?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 ${bare ? "" : "p-6"}`}>
      <div className="flex flex-col gap-1">
        <p className="font-body-md text-base font-semibold text-primary">{message}</p>
        {help && <p className="text-sm text-on-surface-variant">{help}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

/** Chargement d'un bloc : un simple texte, sans animation. */
export function LoadingState({ label }: { label: string }) {
  return (
    <p role="status" className="p-6 text-sm text-on-surface-variant">
      {label}
    </p>
  );
}

/** Bloc impossible à charger : message d'erreur avec icône, et « Réessayer » si on peut relancer. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <p role="alert" className="flex items-center gap-1.5 text-sm text-error">
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          error
        </span>
        {message}
      </p>
      {onRetry && (
        <div>
          <Button type="button" variant="outline" onClick={onRetry}>
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              refresh
            </span>
            Réessayer
          </Button>
        </div>
      )}
    </div>
  );
}
