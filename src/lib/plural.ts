/** « 1 demande », « 3 demandes » : nombre formaté à la française suivi du mot accordé. */
export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? many : one}`;
}
