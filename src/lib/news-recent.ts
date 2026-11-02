/** Nombre de jours calendaires pendant lesquels une actualité porte l'étiquette « Nouveau ». */
export const NEWS_NEW_MAX_DAYS = 3;

/** Écart en jours du calendrier (et non en heures) entre deux dates, dans le fuseau local. */
function calendarDaysBetween(from: Date, to: Date) {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

/** Vrai si l'actualité a été créée il y a NEWS_NEW_MAX_DAYS jours calendaires ou moins. */
export function isNewsNew(createdAt: string, now: Date = new Date()) {
  return calendarDaysBetween(new Date(createdAt), now) <= NEWS_NEW_MAX_DAYS;
}
