import { db } from "@/lib/dashboard";
import { removeNewsImageFile } from "@/lib/news-media";

// Modération (admins) : masquer, réafficher, supprimer définitivement. Toutes les règles sont dans la base.
export type TypeElement = "demande" | "actualite" | "point_bloquant";

export type JournalEntree = {
  id: string;
  action: "masquer" | "reafficher" | "supprimer";
  type_element: TypeElement;
  element_id: string;
  libelle: string | null;
  motif: string | null;
  auteur_email: string;
  created_at: string;
};

export async function masquerElement(type: TypeElement, id: string, motif: string) {
  const { error } = await db.rpc("masquer_element", { _type: type, _id: id, _motif: motif });
  if (error) throw new Error(error.message);
}

export async function reafficherElement(type: TypeElement, id: string) {
  const { error } = await db.rpc("reafficher_element", { _type: type, _id: id });
  if (error) throw new Error(error.message);
}

// La base refuse si l'élément n'est pas masqué. L'image d'une actualité est retirée après la ligne :
// si ce dernier geste échoue, il reste un fichier orphelin, jamais une actualité sans image.
export async function supprimerDefinitivement(
  type: TypeElement,
  id: string,
  motif: string,
  imagePath?: string | null,
) {
  const { error } = await db.rpc("supprimer_definitivement", {
    _type: type,
    _id: id,
    _motif: motif,
  });
  if (error) throw new Error(error.message);
  if (type === "actualite") await removeNewsImageFile(imagePath);
}

export async function fetchJournal(): Promise<JournalEntree[]> {
  const { data, error } = await db
    .from("moderation_journal")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as JournalEntree[];
}
