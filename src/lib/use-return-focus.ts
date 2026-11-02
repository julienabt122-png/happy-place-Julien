import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Rend le focus au bouton qui a ouvert une fenêtre pilotée par un état (sans DialogTrigger).
 * À passer en `onCloseAutoFocus` du contenu. Si le bouton a disparu, le focus va au contenu principal.
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  // Layout effect : s'exécute avant que la fenêtre ne prenne le focus.
  useLayoutEffect(() => {
    if (open)
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [open]);
  return useCallback((e: Event) => {
    e.preventDefault();
    const el = opener.current;
    (el?.isConnected ? el : document.getElementById("contenu"))?.focus();
  }, []);
}
