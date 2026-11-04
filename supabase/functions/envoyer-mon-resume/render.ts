// US-46 : met en page le résumé hebdomadaire en HTML d'e-mail compact, selon la charte Happy Place.
// Objectif : se lire d'un coup d'oeil, sur un écran de messagerie. Une ligne par rubrique, deux éléments au plus.
// Tout le contenu dynamique est échappé. L'IA ne fournit que l'introduction (marqueur [[INTRO]]).
// Les polices web ne sont pas chargées par les messageries : on prévoit des polices de repli.

type Dict = Record<string, unknown>;

const C = {
  bg: "#FBF9F8",
  card: "#FFFFFF",
  ink: "#1B1C1C",
  primary: "#171818",
  muted: "#444748",
  rose: "#FCDBDB",
  border: "#E6E6E1",
  neutralBg: "#EFEDED",
  neutralLine: "#747878",
  okBg: "#D9EDDC",
  ok: "#2D6A3E",
  koBg: "#FFC4BC",
  ko: "#BA1A1A",
};
const TITRE = "Comfortaa,'Trebuchet MS',Arial,sans-serif";
const CORPS = "Inter,Arial,Helvetica,sans-serif";
const MONO = "'JetBrains Mono','Courier New',monospace";
const TZ = "Europe/Paris";
const MAX_ELEMENTS = 2;

export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const liste = (v: unknown): Dict[] => (Array.isArray(v) ? (v as Dict[]) : []);
const jourCourt = (d: unknown) =>
  new Date(String(d)).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
const jourLong = (d: unknown) =>
  new Date(String(d)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: TZ });
const jours = (n: unknown) => `${Number(n)} j`;
const nombre = (n: unknown) =>
  typeof n === "number" ? n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : String(n ?? "");
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Texte sur une ligne, coupé proprement. */
function court(s: unknown, max = 64): string {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

type Famille = "ok" | "ko" | "neutre" | "info" | "nouveau";

function tag(label: string, f: Famille): string {
  const style: Record<Famille, string> = {
    ok: `background:${C.okBg};border:1px solid ${C.ok}`,
    ko: `background:${C.koBg};border:1px solid ${C.ko}`,
    neutre: `background:${C.neutralBg};border:1px solid ${C.neutralLine}`,
    info: `background:${C.neutralBg};border:1px solid ${C.neutralBg}`,
    nouveau: `background:${C.rose};border:1px solid ${C.rose};font-weight:600`,
  };
  const glyphe = { ok: "✓ ", ko: "✕ ", neutre: "○ ", info: "", nouveau: "" }[f];
  return `<span style="display:inline-block;margin:0 6px 0 0;padding:1px 5px;border-radius:4px;${style[f]};color:${C.primary};font:500 11px/1.4 ${MONO};white-space:nowrap">${glyphe}${esc(label)}</span>`;
}

function tagDemande(statut: unknown): string {
  const s = String(statut ?? "").toLowerCase();
  if (s === "validée") return tag("Validée", "ok");
  if (s === "refusée") return tag("Refusée", "ko");
  return tag("En attente", "neutre");
}

function tagBlocage(statut: unknown): string {
  const s = String(statut ?? "").toUpperCase();
  if (s === "RÉSOLU") return tag("Résolu", "ok");
  const libelle: Record<string, string> = { "OUVERT": "Ouvert", "EN COURS": "En cours", "SURVEILLANCE": "Surveillance" };
  return tag(libelle[s] ?? String(statut ?? ""), "neutre");
}

/** Une ligne d'élément : étiquette éventuelle, texte court. */
const item = (tags: string, texte: string) =>
  `<div style="margin:0 0 4px">${tags}${esc(texte)}</div>`;

const reste = (total: number) =>
  total > MAX_ELEMENTS
    ? `<div style="margin:0;font:500 12px/1.4 ${MONO};color:${C.muted}">+ ${total - MAX_ELEMENTS} autre${total - MAX_ELEMENTS > 1 ? "s" : ""} dans l'appli</div>`
    : "";

function rang(titre: string, sous: string, corps: string, principal = false, compteur = ""): string {
  const bord = `border-top:1px solid ${C.border}`;
  const gauche = principal ? `border-left:3px solid ${C.primary};` : "";
  const pastille = compteur
    ? `<span style="display:inline-block;margin-left:6px;padding:1px 5px;border-radius:4px;background:${C.primary};color:#FFFFFF;font:500 11px/1.4 ${MONO}">${esc(compteur)}</span>`
    : "";
  return `<tr><td style="width:150px;padding:12px 8px 8px 16px;vertical-align:top;${bord};${gauche}">` +
    `<div style="font:600 14px/1.3 ${CORPS};color:${C.primary}">${esc(titre)}${pastille}</div>` +
    `<div style="margin-top:2px;font:500 11px/1.3 ${MONO};color:${C.muted}">${esc(sous)}</div></td>` +
    `<td style="padding:12px 16px 8px 0;vertical-align:top;${bord};font:400 14px/1.5 ${CORPS};color:${C.ink}">${corps}</td></tr>`;
}

export function objetDuMail(resume: Dict): string {
  const base = `Happy Place : votre résumé du ${jourLong(resume.depuis)} au ${jourLong(resume.jusqua)}`;
  const n = liste((resume.a_traiter as Dict | null)?.en_attente).length;
  return n > 0 ? `${base} (${n} demande${n > 1 ? "s" : ""} à traiter)` : base;
}

export function introParDefaut(resume: Dict): string {
  return `Voici ce qui s'est passé dans Happy Place depuis le ${jourLong(resume.depuis)}, et ce qui reste ouvert pour vous.`;
}

/** N'accepte qu'une adresse https : jamais de javascript: ni de lien inattendu. */
export function lienSur(url: unknown): string | null {
  try {
    const u = new URL(String(url ?? ""));
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export function renderEmail(resume: Dict, intro = "[[INTRO]]", lienAppli: unknown = null): string {
  const lien = lienSur(lienAppli);
  const bouton = lien
    ? `<div style="margin:12px 0 0"><a href="${esc(lien)}" style="display:inline-block;padding:10px 16px;border-radius:4px;background:${C.primary};color:#FFFFFF;font:600 14px/1.2 ${CORPS};text-decoration:none">Ouvrir Happy Place</a></div>`
    : "";
  const depuis = jourCourt(resume.depuis);
  const sous = `depuis le ${depuis}`;
  const rangs: string[] = [];
  const sansNouveaute: string[] = [];

  // À traiter : managers et admins seulement, toujours en premier
  const at = resume.a_traiter as Dict | null;
  if (at && typeof at === "object") {
    const nouvelles = liste(at.nouvelles);
    const changements = liste(at.changements);
    const attente = liste(at.en_attente);
    if (attente.length + nouvelles.length + changements.length === 0) {
      rangs.push(rang("À traiter", "aujourd'hui", item("", "Aucune demande en attente."), true));
    } else {
      const details: string[] = [];
      if (nouvelles.length) details.push(pluriel(nouvelles.length, "nouvelle", "nouvelles"));
      if (changements.length) details.push(pluriel(changements.length, "changement", "changements"));
      const corps = attente.slice(0, MAX_ELEMENTS)
        .map((d) => item(tag(jours(d.depuis_jours), "neutre"), `${court(d.contenu, 48)} (${court(d.equipe, 22)})`)).join("") +
        reste(attente.length) +
        (details.length ? `<div style="margin:2px 0 0;font:400 13px/1.4 ${CORPS};color:${C.muted}">Depuis le ${esc(depuis)} : ${esc(details.join(", "))}.</div>` : "");
      rangs.push(rang("À traiter", "en attente", corps, true, attente.length ? String(attente.length) : ""));
    }
  }

  // Vos demandes
  const dec = liste(resume.mes_decisions);
  if (dec.length) {
    rangs.push(rang("Vos demandes", sous,
      dec.slice(0, MAX_ELEMENTS).map((d) => item(tagDemande(d.statut), court(d.contenu))).join("") + reste(dec.length)));
  } else sansNouveaute.push("Vos demandes");

  // Demandes validées dans l'entreprise
  const val = liste(resume.validees_entreprise);
  if (val.length) {
    rangs.push(rang("Demandes validées dans le cabinet", sous,
      val.slice(0, MAX_ELEMENTS).map((d) => item(tag(court(d.equipe, 18), "info"), court(d.contenu, 52))).join("") + reste(val.length)));
  } else sansNouveaute.push("Demandes validées");

  // Actualités
  const actus = liste(resume.actus);
  if (actus.length) {
    rangs.push(rang("Actualités", sous,
      actus.slice(0, MAX_ELEMENTS).map((a) => item(tag(jourCourt(a.date), "info"), court(a.titre))).join("") + reste(actus.length)));
  } else sansNouveaute.push("Actualités");

  // Points bloquants
  const pb = liste(resume.points_bloquants);
  if (pb.length) {
    rangs.push(rang("Points bloquants", sous,
      pb.slice(0, MAX_ELEMENTS).map((p) => {
        const t = p.de ? tagBlocage(p.de) + `<span style="margin:0 6px 0 0;font:500 12px/1.4 ${MONO};color:${C.muted}">→</span>` + tagBlocage(p.vers) : tag("Nouveau", "nouveau") + tagBlocage(p.vers);
        return item(t, court(p.titre, 44));
      }).join("") + reste(pb.length)));
  } else sansNouveaute.push("Points bloquants");

  // Indicateurs suivis
  const ind = liste(resume.indicateurs);
  if (ind.length) {
    // Les indicateurs mis à jour cette semaine passent en premier ; on les affiche tous (4 au plus).
    const tries = [...ind].sort((a, b) => Number(!!b.mis_a_jour_cette_semaine) - Number(!!a.mis_a_jour_cette_semaine));
    const nbMaj = tries.filter((i) => i.mis_a_jour_cette_semaine).length;
    const corps = tries.slice(0, 4).map((i) => {
      const u = i.unite ? " " + String(i.unite) : "";
      const avant = i.avant !== null && i.avant !== undefined && i.avant !== i.valeur ? ` (avant : ${nombre(i.avant)}${u})` : "";
      const etat = i.mis_a_jour_cette_semaine ? "" : tag("pas à jour", "neutre");
      return item(etat, `${court(i.libelle, 28)} : ${nombre(i.valeur)}${u}${avant}`);
    }).join("");
    rangs.push(rang("Vos indicateurs", nbMaj ? pluriel(nbMaj, "mis à jour cette semaine", "mis à jour cette semaine") : "aucun indicateur mis à jour cette semaine", corps));
  }

  // Toujours ouvert
  const ou = (resume.ouverts as Dict | null) ?? {};
  const mesAttente = liste(ou.mes_demandes_en_attente);
  const pbOuverts = liste(ou.points_bloquants_non_resolus);
  const perimes = liste(ou.indicateurs_perimes);
  const ouverts: string[] = [];
  if (mesAttente.length) ouverts.push(`${pluriel(mesAttente.length, "demande en attente", "demandes en attente")} (la plus ancienne : ${jours(Math.max(...mesAttente.map((d) => Number(d.depuis_jours))))})`);
  if (pbOuverts.length) ouverts.push(`${pluriel(pbOuverts.length, "point bloquant non résolu", "points bloquants non résolus")} (le plus ancien : ${jours(Math.max(...pbOuverts.map((p) => Number(p.depuis_jours))))})`);
  if (perimes.length) ouverts.push(`${pluriel(perimes.length, "indicateur à mettre à jour", "indicateurs à mettre à jour")}`);
  rangs.push(rang("Toujours ouvert", "aujourd'hui",
    ouverts.length ? ouverts.map((o) => item(tag("Ouvert", "neutre"), o)).join("") : item("", "Rien n'est ouvert pour vous.")));

  if (sansNouveaute.length) {
    rangs.push(`<tr><td colspan="2" style="padding:10px 16px;border-top:1px solid ${C.border};background:${C.neutralBg};border-radius:0 0 8px 8px;font:400 13px/1.5 ${CORPS};color:${C.muted}">Sans nouveauté ${esc(sous)} : ${esc(sansNouveaute.join(", "))}.</td></tr>`);
  }

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Happy Place : résumé de la semaine</title></head>` +
    `<body style="margin:0;padding:0;background:${C.bg}">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:16px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">` +
    `<tr><td style="padding:0 0 12px;border-bottom:4px solid ${C.rose}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>` +
    `<td style="font:700 20px/1.2 ${TITRE};color:${C.primary}">Happy Place</td>` +
    `<td align="right" style="font:500 12px/1.4 ${MONO};color:${C.muted}">du ${esc(jourCourt(resume.depuis))} au ${esc(jourCourt(resume.jusqua))}</td></tr></table></td></tr>` +
    `<tr><td style="padding:16px 0;font:400 16px/1.5 ${CORPS};color:${C.ink}"><div style="margin:0 0 6px;font:600 16px/1.4 ${CORPS}">Bonjour ${esc(resume.prenom)},</div><div>${esc(intro)}</div>${bouton}</td></tr>` +
    `<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.card};border:1px solid ${C.border};border-radius:8px;border-collapse:separate">${rangs.join("")}</table></td></tr>` +
    `<tr><td style="padding:12px 0 0;font:400 12px/1.5 ${CORPS};color:${C.muted}">Envoyé chaque lundi. Ce résumé a été généré par IA et personnalisé pour vous.</td></tr>` +
    `</table></td></tr></table></body></html>`;
}
