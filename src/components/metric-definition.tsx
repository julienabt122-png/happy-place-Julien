import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { metricDefinitionOf } from "@/lib/metric-definitions";

/**
 * Bouton « i » d'un indicateur (cartes de l'accueil) : ouvre un petit panneau avec sa définition.
 * Zone cliquable de 44 px, focus visible, Échap ferme et rend le focus au bouton, tactile.
 * Sans définition pour cette clé, rien n'est affiché.
 */
export function MetricDefinitionButton({ metricKey, label }: { metricKey: string; label: string }) {
  const def = metricDefinitionOf(metricKey);
  if (!def) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Définition de ${label}`}
          title={`Définition de ${label}`}
          className="group -my-2.5 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[4px] hover:bg-secondary"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-outline font-label-sm text-[10px] leading-none text-outline group-hover:border-primary group-hover:text-primary"
          >
            i
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(320px,calc(100vw-2rem))] rounded-[8px] border-primary bg-card p-4 shadow-none"
      >
        <p className="text-sm font-semibold text-primary">{label}</p>
        <p className="mt-1 text-sm text-foreground">{def.definition}</p>
        <p className="mt-2 font-label-sm text-xs text-on-surface-variant">
          Périmètre : {def.scope}
        </p>
      </PopoverContent>
    </Popover>
  );
}
