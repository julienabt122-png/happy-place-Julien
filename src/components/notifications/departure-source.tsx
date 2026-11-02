import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { FormFooter } from "@/components/manage/crud-ui";
import type { NotificationSource } from "@/components/notifications/types";
import { Button } from "@/components/ui/button";
import {
  downloadAttachment,
  downloadDepartureZip,
  fetchMyDepartureNotices,
  markDepartureNoticeDownloaded,
  type DepartureNotice,
} from "@/lib/dashboard";

const frDate = (iso: string) => new Intl.DateTimeFormat("fr-FR").format(new Date(iso));
const frDay = (ymd: string) => ymd.split("-").reverse().join("/");
const longDay = (ymd: string) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString("fr-FR", { dateStyle: "long" });

/**
 * Notifications de départ : les avis de la table departure_notices dont la personne connectée est
 * destinataire (admins et managers de l'équipe qui part), lus par fetchMyDepartureNotices
 * comme le faisait l'ancien bandeau de l'accueil.
 */
export const departureSource: NotificationSource = {
  type: "departure",
  tag: "Départ",
  roles: ["admin", "manager"],
  queryKey: (email) => ["notifications", "departure", email.toLowerCase()],
  load: async (email) => {
    const notices = await fetchMyDepartureNotices(email);
    return notices.map((n) => ({
      id: n.id,
      type: "departure",
      tag: "Départ",
      title: `Départ de ${n.departing_label}`,
      summary: `${n.kind === "préavis" ? "Préavis" : "Sans préavis"} · le ${longDay(n.departure_date)}`,
      detail: {
        title: `Départ de ${n.departing_label}`,
        render: (close) => <DepartureDetail notice={n} onClose={close} />,
      },
    }));
  },
  // La gestion des utilisateurs est réservée à l'admin.
  seeAll: {
    to: "/manage/users",
    label: "Voir tout : départs dans la gestion des utilisateurs",
    roles: ["admin"],
  },
};

/**
 * Détail d'un départ (fenêtre ouverte depuis la cloche) : les mêmes actions que l'ancien bandeau.
 * « J'ai pris note » / « J'ai téléchargé » ferme l'alerte : la notification disparaît et le compteur baisse.
 */
function DepartureDetail({ notice: n, onClose }: { notice: DepartureNotice; onClose: () => void }) {
  const qc = useQueryClient();
  const [zipping, setZipping] = useState(false);
  const count = n.documents.length;
  const reminder = !!n.reminder_at;
  const deleteOn = new Date(new Date(n.created_at).getTime() + 7 * 86400000).toISOString();
  const text =
    count === 0
      ? n.kind === "préavis"
        ? `${n.departing_label} quitte Happy Place le ${frDay(n.departure_date)}. Aucun document à télécharger.`
        : `${n.departing_label} a quitté Happy Place. Aucun document à télécharger.`
      : n.kind === "préavis"
        ? `${n.departing_label} quitte Happy Place le ${frDay(n.departure_date)} : ${count} document(s) joint(s) à ses demandes seront alors supprimés.`
        : `${n.departing_label} a quitté Happy Place : ${count} document(s) joint(s) à ses demandes seront supprimés le ${frDate(deleteOn)}`;

  const mark = useMutation({
    mutationFn: () => markDepartureNoticeDownloaded(n.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function zipAll() {
    setZipping(true);
    try {
      await downloadDepartureZip(n);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-6">
      <p role={reminder ? "alert" : undefined} className="text-base text-foreground">
        {reminder && <strong>Rappel : </strong>}
        {text}
      </p>
      {count > 0 && (
        <div className="space-y-3">
          <Button type="button" variant="outline" onClick={zipAll} disabled={zipping}>
            {zipping ? "Préparation…" : "Tout télécharger (.zip)"}
          </Button>
          <ul className="divide-y divide-outline-variant border-y border-outline-variant">
            {n.documents.map((d) => (
              <li
                key={d.path}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <span className="min-w-0 wrap-anywhere">
                  <span className="font-bold">{frDate(d.created_at)}</span> — {d.excerpt}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() =>
                    downloadAttachment(d.path, d.name).catch((e) =>
                      toast.error((e as Error).message),
                    )
                  }
                >
                  Télécharger
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FormFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Fermer
        </Button>
        <Button type="button" onClick={() => mark.mutate()} disabled={mark.isPending}>
          {count > 0 ? "J'ai téléchargé les documents" : "J'ai pris note"}
        </Button>
      </FormFooter>
    </div>
  );
}
