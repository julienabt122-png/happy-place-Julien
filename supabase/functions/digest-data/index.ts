// US-46 : prépare les résumés hebdomadaires, un par compte, avec les droits de ce compte.
// Appelée par Make avec l'en-tête x-digest-secret. Aucune clé de service n'est donnée à Make.
// Pour chaque compte, on se place sous le rôle « authenticated » avec son e-mail (le RLS s'applique),
// puis on appelle public.mon_resume_hebdo(). Le contenu des résumés n'est jamais écrit dans les journaux.
import postgres from "npm:postgres@3.4.4";
import { introParDefaut, lienSur, objetDuMail, renderEmail } from "./render.ts";

const SECRET = Deno.env.get("DIGEST_SECRET") ?? "";
const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const APP_URL_PAR_DEFAUT = Deno.env.get("APP_URL") ?? "";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Comparaison en temps constant pour ne pas révéler le secret par le temps de réponse.
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST uniquement" }, 405);
  if (!sameSecret(req.headers.get("x-digest-secret") ?? "", SECRET)) {
    return json({ error: "Non autorisé" }, 401);
  }

  // Corps facultatif : { "emails": ["a@b.c"], "depuis": "2026-11-02T00:00:00Z" }
  let body: { emails?: unknown; depuis?: unknown; app_url?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // corps vide accepté
  }
  const depuis = typeof body.depuis === "string" && !Number.isNaN(Date.parse(body.depuis))
    ? new Date(body.depuis)
    : new Date(Date.now() - 7 * 24 * 3600 * 1000);
  // Adresse de l'appli pour le bouton du mail : https uniquement, sinon pas de bouton.
  const appUrl = lienSur(body.app_url) ?? lienSur(APP_URL_PAR_DEFAUT);
  const seulement = Array.isArray(body.emails)
    ? body.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
    : null;

  const sql = postgres(DB_URL, { max: 1, prepare: false });
  try {
    const lignes = await sql<{ email: string }[]>`
      select u.email
        from public.allowed_users u
        join public.allowed_user_roles r on r.allowed_user_id = u.id
       where u.departure_date is null or u.departure_date > current_date
       order by u.email`;
    const emails = lignes.map((l) => l.email).filter((e) => !seulement || seulement.includes(e));

    const resumes: unknown[] = [];
    const erreurs: { email: string }[] = [];
    for (const email of emails) {
      try {
        const resume = await sql.begin(async (tx) => {
          await tx`select set_config('request.jwt.claims', ${
            JSON.stringify({ sub: crypto.randomUUID(), email, role: "authenticated" })
          }, true)`;
          await tx.unsafe("set local role authenticated");
          const [{ resume }] = await tx`
            select public.mon_resume_hebdo(${depuis.toISOString()}::timestamptz) as resume`;
          return resume;
        });
        // `donnees` : le même résumé en texte JSON, pour l'insérer tel quel dans le message envoyé à l'IA.
        // `html` contient le marqueur [[INTRO]] que Make remplace par le texte de l'IA ; `intro_defaut` sert si l'IA échoue.
        if (resume) {
          resumes.push({
            ...resume,
            donnees: JSON.stringify(resume),
            objet: objetDuMail(resume),
            intro_defaut: introParDefaut(resume),
            html: renderEmail(resume, "[[INTRO]]", appUrl),
          });
        }
      } catch {
        erreurs.push({ email });
      }
    }
    return json({
      genere_le: new Date().toISOString(),
      depuis: depuis.toISOString(),
      nombre: resumes.length,
      erreurs,
      resumes,
    });
  } catch (e) {
    console.error("digest-data:", e instanceof Error ? e.name : "erreur");
    return json({ error: "Erreur interne" }, 500);
  } finally {
    await sql.end({ timeout: 5 });
  }
});
