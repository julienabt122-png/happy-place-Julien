import type { Submission } from "@/lib/dashboard";
import { deciderSentence, type Decider, type Decision } from "@/lib/use-submission-tracking";

const longDate = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

/**
 * Lignes de suivi d'une demande : « À trancher par … » (en attente), « Décidée le … · Par … » et
 * « Motif : … » (refusée). `mine` : la demande est la mienne ; seules mes demandes montrent le
 * décideur et la décision. Le motif s'affiche pour toute demande refusée visible.
 */
export function SubmissionTracking({
  s,
  mine,
  deciders,
  decision,
}: {
  s: Submission;
  mine: boolean;
  deciders: Decider[] | undefined;
  decision: Decision | undefined;
}) {
  const decided = s.status === "validée" || s.status === "refusée";
  return (
    <>
      {mine && s.status === "en attente" && (
        <span className="block font-label-sm text-xs text-on-surface-variant">
          {deciderSentence(deciders)}
        </span>
      )}
      {mine && decided && (
        <span className="block font-label-sm text-xs text-on-surface-variant">
          Décidée{decision ? ` le ${longDate(decision.changed_at)}` : ""}
          {decision?.changed_by_name ? ` · Par ${decision.changed_by_name}` : ""}
        </span>
      )}
      {s.status === "refusée" && s.rejection_category && (
        <span className="block font-label-sm text-xs text-on-surface-variant wrap-anywhere">
          Motif : {s.rejection_category}
        </span>
      )}
    </>
  );
}
