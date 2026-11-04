import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "manager" | "collaborateur";
export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  role: AppRole;
  teams: string[];
  team: string | null;
  departure_date: string | null;
  first_name: string | null;
  last_name: string | null;
};
export type TeamRow = { name: string; is_reserved: boolean; created_at: string };

export const nameSchema = z.string().trim().max(100, "100 caractères maximum");
export const emailSchema = z.string().trim().toLowerCase().email("Adresse email invalide").max(255);
export const teamSchema = z
  .string()
  .trim()
  .min(2, "Nom d'équipe trop court")
  .max(60, "60 caractères maximum");

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Manager",
  collaborateur: "Collaborateur",
};

/** « Camille Moreau », ou l'adresse e-mail quand ni prénom ni nom ne sont renseignés. */
export const userDisplayName = (u: Pick<UserRow, "first_name" | "last_name" | "email">) =>
  [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email;

export const formatDay = (iso: string) => iso.split("-").reverse().join("/");
export const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "long" });

/** Premier jour possible pour un départ : dans 7 jours. */
export function minDepartureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useAllowedUsers() {
  return useQuery({
    queryKey: ["allowed_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allowed_users")
        .select(
          "id, email, first_name, last_name, team, departure_date, created_at, allowed_user_roles(role), manager_teams(team)",
        )
        .order("created_at");
      if (error) throw error;
      return (data ?? []).map((user) => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        created_at: user.created_at,
        team: user.team,
        departure_date: user.departure_date,
        role: user.allowed_user_roles?.role ?? "collaborateur",
        teams: user.manager_teams.map((entry) => entry.team).sort(),
      })) as UserRow[];
    },
  });
}

export function useTeams() {
  return useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("name, is_reserved, created_at");
      if (error) throw error;
      return (data ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, "fr", { sensitivity: "base" }),
      ) as TeamRow[];
    },
  });
}

/** Équipes choisissables pour une personne : ni réservées, ni « Admin ». */
export const selectableTeamNames = (teams: TeamRow[] | undefined) =>
  (teams ?? [])
    .filter((t) => !t.is_reserved && t.name.toLowerCase() !== "admin")
    .map((t) => t.name);

export function useRefreshUsers() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["allowed_users"] });
    qc.invalidateQueries({ queryKey: ["teams"] });
  };
}

// ---- Écritures : mêmes requêtes que l'ancienne page, déplacées telles quelles ----

export async function addUser(v: {
  email: string;
  role: AppRole;
  team: string | null;
  first_name: string | null;
  last_name: string | null;
}) {
  const { data, error } = await supabase
    .from("allowed_users")
    .insert({ email: v.email, team: v.team, first_name: v.first_name, last_name: v.last_name })
    .select("id")
    .single();
  if (error)
    throw new Error(error.code === "23505" ? "Cet email est déjà dans la liste" : error.message);
  const { error: roleError } = await supabase
    .from("allowed_user_roles")
    .insert({ allowed_user_id: data.id, role: v.role });
  if (roleError) {
    await supabase.from("allowed_users").delete().eq("id", data.id);
    throw roleError;
  }
  return data.id as string;
}

// Coupure immédiate (US-45) : supprime la ligne de la liste blanche, avec rôle et équipes managées.
export async function couperAcces(allowedUserId: string) {
  const { error } = await supabase.rpc("couper_acces", { _allowed_user_id: allowedUserId });
  if (error) throw new Error(error.message);
}

export async function updateRoleAndTeam(v: { id: string; role: AppRole; team?: string }) {
  if (v.role === "collaborateur") {
    const parsed = teamSchema.safeParse(v.team ?? "");
    if (!parsed.success)
      throw new Error("Équipe requise pour un collaborateur : " + parsed.error.issues[0].message);
    const { data, error: tErr } = await supabase
      .from("allowed_users")
      .update({ team: parsed.data })
      .eq("id", v.id)
      .select("id");
    if (tErr) throw tErr;
    if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
  } else {
    const { data, error: tErr } = await supabase
      .from("allowed_users")
      .update({ team: null })
      .eq("id", v.id)
      .select("id");
    if (tErr) throw tErr;
    if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
  }
  const { data: roleRows, error } = await supabase
    .from("allowed_user_roles")
    .update({ role: v.role, updated_at: new Date().toISOString() })
    .eq("allowed_user_id", v.id)
    .select("id");
  if (error) throw error;
  if (!roleRows?.length) throw new Error("Modification refusée : vérifie que tu es admin");
  if (v.role !== "manager") {
    const { error: teamError } = await supabase
      .from("manager_teams")
      .delete()
      .eq("allowed_user_id", v.id);
    if (teamError) throw teamError;
  }
}

export async function updateNames(v: {
  id: string;
  first_name: string | null;
  last_name: string | null;
}) {
  const { data, error } = await supabase
    .from("allowed_users")
    .update({ first_name: v.first_name, last_name: v.last_name })
    .eq("id", v.id)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
}

export async function setDepartureDate(v: { id: string; date: string | null }) {
  const { error } = await supabase
    .from("allowed_users")
    .update({ departure_date: v.date })
    .eq("id", v.id);
  if (error) throw error;
  return v.date;
}

export async function addManagerTeam(v: { allowedUserId: string; team: string }) {
  const parsed = teamSchema.safeParse(v.team);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  if (parsed.data.trim().toLowerCase() === "admin")
    throw new Error("L'équipe Admin est réservée aux admins.");
  const { data, error } = await supabase
    .from("manager_teams")
    .insert({ allowed_user_id: v.allowedUserId, team: parsed.data })
    .select("id");
  if (!error && !data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
  if (error)
    throw new Error(
      error.code === "23514"
        ? "L'équipe Admin est réservée aux admins."
        : error.code === "23505"
          ? `Ce manager a déjà l'équipe « ${parsed.data} ».`
          : error.message,
    );
}

export async function removeManagerTeam(v: { allowedUserId: string; team: string }) {
  const { data, error } = await supabase
    .from("manager_teams")
    .delete()
    .eq("allowed_user_id", v.allowedUserId)
    .eq("team", v.team)
    .select("id");
  if (error) throw error;
  if (!data?.length) throw new Error("Modification refusée : vérifie que tu es admin");
}

export async function createTeam(n: string) {
  const { error } = await supabase.from("teams").insert({ name: n });
  if (error) throw new Error(error.code === "23505" ? "Cette équipe existe déjà" : error.message);
}

export async function renameTeam(v: { from: string; to: string }) {
  const { error } = await supabase.from("teams").update({ name: v.to }).eq("name", v.from);
  if (error) throw new Error(error.code === "23505" ? "Cette équipe existe déjà" : error.message);
}

export async function deleteTeam(n: string) {
  const { error } = await supabase.from("teams").delete().eq("name", n);
  if (error)
    throw new Error(
      error.code === "23503"
        ? "Impossible : cette équipe est encore utilisée (personnes ou demandes). Réaffecte-les d'abord."
        : error.message,
    );
}
