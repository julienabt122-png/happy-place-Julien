import type { ReactNode } from "react";

/** État vide : un message et, si le rôle peut agir, un bouton (passé en `action`). */
export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
      <p className="font-body-md text-base text-on-surface-variant">{message}</p>
      {action}
    </div>
  );
}
