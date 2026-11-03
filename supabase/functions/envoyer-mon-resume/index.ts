// US-49 : envoie à l'utilisateur connecté son propre résumé, à la demande.
// Appelée par l'appli avec le jeton de session (verify_jwt actif). L'adresse visée est toujours celle du jeton :
// personne ne peut déclencher le résumé d'un autre compte. Le mail est composé par le même code que le résumé du lundi,
// puis transmis à un webhook Make (adresse secrète, variable RESUME_WEBHOOK_URL) qui ajoute l'intro IA et envoie par Gmail.
// Le contenu des résumés n'est jamais écrit dans les journaux.
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { introParDefaut, lienSur, objetDuMail, renderEmail } from "./render.ts";

const DB_URL = Deno.env.get("SUPABASE_DB_URL") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const WEBHOOK = Deno.env.get("RESUME_WEBHOOK_URL") ?? "";
const APP_URL_PAR_DEFAUT = Deno.env.get("APP_URL") ?? "";
// Mêmes adresses fictives exclues que pour l'envoi du lundi.
const ADRESSE_FICTIVE = /@([^@]+\.)?(test|example|invalid|localhost)$|@happyplace\.com$/i;
const DELAI_MS = 60_000;
const dernierEnvoi = new Map<string, number>();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Diagnostic sans secret : dit seulement si l'adresse est valide et sur quel domaine.
function diagnosticAdresse(brut: string): string {
  const v = brut.trim();
  try {
    const u = new URL(v);
    return `protocole=${u.protocol} domaine=${u.hostname} brut_avec_espaces=${v !== brut} guillemets=${/^["']|["']$/.test(v)}`;
  } catch {
    return `adresse invalide, longueur=${v.length}, commence_par_http=${/^https?:\/\//i.test(v)}`;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST uniquement" }, 405);
  if (!WEBHOOK) return json({ error: "Envoi non configuré" }, 503);

  // Identité : lue dans le jeton de session, jamais dans le corps de la requête.
  const jeton = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const auth = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data: { user } } = await auth.auth.getUser(jeton);
  const email = user?.email?.trim().toLowerCase();
  if (!email) return json({ error: "Non autorisé" }, 401);

  let body: { app_url?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // corps vide accepté
  }
  const appUrl = lienSur(body.app_url) ?? lienSur(APP_URL_PAR_DEFAUT);
  const depuis = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  let etape = "profil";
  const sql = postgres(DB_URL, { max: 1, prepare: false });
  try {
    // Adresse de contact donnée à l'écran « Choisis ton rôle » ; à défaut, l'adresse du profil.
    const [profil] = await sql<{ destinataire: string }[]>`
      select coalesce(contact_email, email) as destinataire
        from public.allowed_users where email = ${email}`;
    if (!profil) return json({ error: "Choisis d'abord ton rôle." }, 403);
    const destinataire = profil.destinataire.trim().toLowerCase();
    if (ADRESSE_FICTIVE.test(destinataire)) {
      return json({ error: "Renseigne ton adresse e-mail dans « Choisis ton rôle »." }, 403);
    }

    const maintenant = Date.now();
    const precedent = dernierEnvoi.get(email) ?? 0;
    if (maintenant - precedent < DELAI_MS) {
      return json({ error: "Un résumé vient d'être envoyé, réessayez dans une minute." }, 429);
    }

    etape = "resume";
    const resume = await sql.begin(async (tx) => {
      await tx`select set_config('request.jwt.claims', ${
        JSON.stringify({ sub: user!.id, email, role: "authenticated" })
      }, true)`;
      await tx.unsafe("set local role authenticated");
      const [{ resume }] = await tx`
        select public.mon_resume_hebdo(${depuis.toISOString()}::timestamptz) as resume`;
      return resume;
    });
    if (!resume) return json({ error: "Compte non autorisé" }, 403);

    dernierEnvoi.set(email, maintenant);
    etape = "mise en page";
    const corps = JSON.stringify({
        email: destinataire,
        objet: objetDuMail(resume),
        donnees: JSON.stringify(resume),
        intro_defaut: introParDefaut(resume),
        html: renderEmail(resume, "[[INTRO]]", appUrl),
    });
    etape = "webhook";
    let reponse: Response;
    try {
      reponse = await fetch(WEBHOOK.trim(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corps,
      });
    } catch (e) {
      console.error("envoyer-mon-resume: appel webhook impossible,", diagnosticAdresse(WEBHOOK), e instanceof Error ? e.message.slice(0, 120) : "");
      dernierEnvoi.delete(email);
      return json({ error: "L'envoi a échoué, réessayez plus tard." }, 502);
    }
    if (!reponse.ok) {
      console.error("envoyer-mon-resume: webhook statut", reponse.status);
      dernierEnvoi.delete(email);
      return json({ error: "L'envoi a échoué, réessayez plus tard." }, 502);
    }
    return json({ ok: true, email: destinataire });
  } catch (e) {
    dernierEnvoi.delete(email);
    console.error("envoyer-mon-resume:", etape, e instanceof Error ? e.name : "erreur");
    return json({ error: "Erreur interne" }, 500);
  } finally {
    await sql.end({ timeout: 5 });
  }
});
