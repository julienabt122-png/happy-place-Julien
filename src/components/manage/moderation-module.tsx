import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ManageTabs } from "@/components/manage/manage-tabs";
import { PageHeader } from "@/components/page-header";
import { ModerationDialog } from "@/components/modules/moderation-dialog";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/dashboard";
import {
  fetchJournal,
  reafficherElement,
  supprimerDefinitivement,
  type TypeElement,
} from "@/lib/moderation";

type Masque = {
  type: TypeElement;
  id: string;
  titre: string;
  par: string | null;
  quand: string | null;
  motif: string | null;
  imagePath: string | null;
};

const LIBELLES: Record<TypeElement, string> = {
  demande: "Demande",
  actualite: "Actualité",
  point_bloquant: "Point bloquant",
};

async function fetchMasques(): Promise<Masque[]> {
  const [s, n, b] = await Promise.all([
    db
      .from("submissions")
      .select("id, author_name, content, masque_le, masque_par, masque_motif")
      .not("masque_le", "is", null),
    db
      .from("news")
      .select("id, title, image_path, masque_le, masque_par, masque_motif")
      .not("masque_le", "is", null),
    db
      .from("blockers")
      .select("id, title, masque_le, masque_par, masque_motif")
      .not("masque_le", "is", null),
  ]);
  for (const r of [s, n, b]) if (r.error) throw r.error;
  return [
    ...(s.data ?? []).map((x) => ({
      type: "demande" as const,
      id: x.id,
      titre: `${x.author_name} : ${x.content.slice(0, 120)}`,
      par: x.masque_par,
      quand: x.masque_le,
      motif: x.masque_motif,
      imagePath: null,
    })),
    ...(n.data ?? []).map((x) => ({
      type: "actualite" as const,
      id: x.id,
      titre: x.title,
      par: x.masque_par,
      quand: x.masque_le,
      motif: x.masque_motif,
      imagePath: x.image_path,
    })),
    ...(b.data ?? []).map((x) => ({
      type: "point_bloquant" as const,
      id: x.id,
      titre: x.title,
      par: x.masque_par,
      quand: x.masque_le,
      motif: x.masque_motif,
      imagePath: null,
    })),
  ];
}

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";

/** Page Modération (admins) : éléments masqués, réaffichage, suppression définitive, journal. */
export function ModerationModule() {
  const qc = useQueryClient();
  const masques = useQuery({
    queryKey: ["moderation", "masques"],
    queryFn: fetchMasques,
    retry: false,
  });
  const journal = useQuery({
    queryKey: ["moderation", "journal"],
    queryFn: fetchJournal,
    retry: false,
  });
  const [cible, setCible] = useState<Masque | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const rafraichir = () => {
    for (const k of ["moderation", "news", "submissions", "blockers"]) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  };

  const supprimer = useMutation({
    mutationFn: ({ m, motif }: { m: Masque; motif: string }) =>
      supprimerDefinitivement(m.type, m.id, motif, m.imagePath),
    onSuccess: () => {
      toast.success("Élément supprimé définitivement");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
    onSettled: () => setCible(null),
  });

  const reafficher = useMutation({
    mutationFn: (m: Masque) => reafficherElement(m.type, m.id),
    onSuccess: () => {
      toast.success("Élément réaffiché");
      rafraichir();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const busy = supprimer.isPending || reafficher.isPending;

  return (
    <section className="space-y-8">
      <PageHeader
        title="Modération"
        summary="Éléments masqués : seuls les admins les voient. Tu peux les réafficher, ou les supprimer définitivement. Chaque action est tracée dans le journal."
      />
      <ManageTabs />

      <div className="space-y-3">
        <h2 className="font-label-md text-label-md uppercase text-on-surface-variant">
          Éléments masqués
        </h2>
        {masques.isPending && <p role="status">Chargement…</p>}
        {masques.isError && <p role="alert">Impossible de charger les éléments masqués.</p>}
        {masques.data?.length === 0 && (
          <p className="font-body-md text-on-surface-variant">Aucun élément masqué.</p>
        )}
        <ul className="divide-y divide-outline-variant border border-outline-variant">
          {masques.data?.map((m) => (
            <li
              key={`${m.type}-${m.id}`}
              className="flex flex-wrap items-start justify-between gap-4 p-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">
                  {LIBELLES[m.type]} · masqué le {date(m.quand)} par {m.par ?? "inconnu"}
                </p>
                <p className="font-body-md text-on-surface wrap-anywhere">{m.titre}</p>
                <p className="font-body-sm text-on-surface-variant">
                  Motif : {m.motif ?? "non renseigné"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  aria-label={`Réafficher : ${m.titre}`}
                  onClick={() => reafficher.mutate(m)}
                >
                  Réafficher
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  aria-haspopup="dialog"
                  aria-label={`Supprimer définitivement : ${m.titre}`}
                  onClick={(e) => {
                    openerRef.current = e.currentTarget;
                    setCible(m);
                  }}
                >
                  Supprimer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h2 className="font-label-md text-label-md uppercase text-on-surface-variant">Journal</h2>
        {journal.isError && <p role="alert">Impossible de charger le journal.</p>}
        {journal.data?.length === 0 && (
          <p className="font-body-md text-on-surface-variant">Le journal est vide.</p>
        )}
        {journal.data && journal.data.length > 0 && (
          <table className="w-full border-collapse font-body-sm">
            <caption className="sr-only">Journal de modération</caption>
            <thead>
              <tr className="border-b border-outline-variant text-left">
                <th scope="col" className="p-2">
                  Date
                </th>
                <th scope="col" className="p-2">
                  Action
                </th>
                <th scope="col" className="p-2">
                  Élément
                </th>
                <th scope="col" className="p-2">
                  Motif
                </th>
                <th scope="col" className="p-2">
                  Par
                </th>
              </tr>
            </thead>
            <tbody>
              {journal.data.map((j) => (
                <tr key={j.id} className="border-b border-outline-variant align-top">
                  <td className="p-2">{date(j.created_at)}</td>
                  <td className="p-2">{j.action}</td>
                  <td className="p-2">
                    {LIBELLES[j.type_element]}
                    {j.libelle ? ` : ${j.libelle}` : ""}
                  </td>
                  <td className="p-2">{j.motif ?? "—"}</td>
                  <td className="p-2">{j.auteur_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModerationDialog
        open={!!cible}
        onOpenChange={(o) => !o && !supprimer.isPending && setCible(null)}
        mode="supprimer"
        titre={cible?.titre ?? ""}
        pending={supprimer.isPending}
        onConfirm={(motif) => cible && supprimer.mutate({ m: cible, motif })}
        onReafficher={() => cible && reafficher.mutate(cible)}
        returnFocusRef={openerRef}
      />
    </section>
  );
}
