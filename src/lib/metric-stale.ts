/** Au-delà de ce nombre de jours sans mise à jour, un indicateur porte le badge « À mettre à jour ». */
export const METRIC_STALE_DAYS = 14;

/** Écart en jours du calendrier (et non en heures) entre deux dates, dans le fuseau local. */
function calendarDaysBetween(from: Date, to: Date) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** Vrai si la dernière mise à jour date de plus de METRIC_STALE_DAYS jours (sans date : non). */
export function isMetricStale(updatedAt: string | null | undefined, now: Date = new Date()) {
  if (!updatedAt) return false;
  return calendarDaysBetween(new Date(updatedAt), now) > METRIC_STALE_DAYS;
}
