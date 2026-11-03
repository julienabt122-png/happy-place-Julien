import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ErrorSummary, Field, FormActions, TextArea } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { CharCounter, rejectionErrorMessage } from "@/components/expandable-card";
import { supabase } from "@/integrations/supabase/client";
import {
  REJECTION_CATEGORIES,
  exportMyRecentSubmissions,
  reviewSubmission,
  type Submission,
} from "@/lib/dashboard";
import { rejectionSchema, validate, type FieldErrors } from "@/lib/manage-schemas";

/** Équipes dont le manager connecté a la charge (vide pour les autres rôles). */
export function useMyTeams(role: string | null | undefined, email: string | null | undefined) {
  return useQuery({
    queryKey: ["manager_teams", "mine", email],
    enabled: role === "manager" && !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manager_teams")
        .select("team, allowed_users!inner(email)")
        .eq("allowed_users.email", (email ?? "").toLowerCase());
      if (error) throw error;
      return (data ?? []).map((t) => t.team).sort();
    },
  });
}

/**
 * Peut valider ou refuser cette demande : en attente, et admin (toutes les équipes)
 * ou manager (seulement ses équipes). La base fait foi (RLS) ; ceci masque seulement les boutons.
 */
export function canModerateSubmission(role: string, myTeams: string[], s: Submission) {
  return (
    s.status === "en attente" &&
    (role === "admin" || (role === "manager" && myTeams.includes(s.team)))
  );
}

/**
 * Peut voir l'historique des décisions de cette demande : sa propre demande, l'admin, ou le manager
 * de l'équipe concernée. Les demandes validées des autres équipes restent lisibles (« Par équipe »),
 * mais sans leur historique. Confort d'affichage : la politique de la base n'est pas modifiée ici.
 */
export function canSeeSubmissionHistory(
  role: string,
  email: string,
  myTeams: string[],
  s: Submission,
) {
  return (
    role === "admin" ||
    (role === "manager" && myTeams.includes(s.team)) ||
    (s.submitted_by_email ?? "").toLowerCase() === email.toLowerCase()
  );
}

/** Export CSV des demandes récentes de l'utilisateur (même logique qu'à l'origine sur l'accueil). */
export function useExportReport(email: string | null | undefined) {
  return useMutation({
    mutationFn: () => {
      if (!email) throw new Error("Votre adresse e-mail est indisponible.");
      return exportMyRecentSubmissions(email);
    },
    onSuccess: (count) => {
      if (count === 0) {
        toast.info("Aucune demande en attente ou validée sur les 30 derniers jours.");
        return;
      }
      toast.success(
        `${count} demande${count > 1 ? "s" : ""} exportée${count > 1 ? "s" : ""} au format CSV.`,
      );
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
}

/**
 * Valider et refuser une demande : un seul exemplaire pour l'accueil et /demandes.
 * `rejectDialog` est la fenêtre de refus, à placer dans le JSX de la page.
 */
export function useSubmissionReview({ onApproved }: { onApproved?: (id: string) => void } = {}) {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<Submission | null>(null);
  const [rejectForm, setRejectForm] = useState({ rejection_category: "", rejection_note: "" });
  const [rejectErrors, setRejectErrors] = useState<FieldErrors>({});

  const review = useMutation({
    mutationFn: reviewSubmission,
    onSuccess: (_d, vars) => {
      if (vars.status === "refusée") {
        setRejecting(null);
        toast.success("Demande refusée");
      } else {
        onApproved?.(vars.id);
      }
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e: unknown) => toast.error(rejectionErrorMessage(e)),
  });

  const openerRef = useRef<HTMLElement | null>(null);

  function startReject(s: Submission) {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRejecting(s);
    setRejectErrors({});
    setRejectForm({ rejection_category: "", rejection_note: "" });
  }

  const rejectDialog = (
    <FormDialog
      returnFocusRef={openerRef}
      open={!!rejecting}
      onOpenChange={(o) => !o && setRejecting(null)}
      title="Refuser la demande"
      description="Choisis un motif et explique la raison du refus."
    >
      {rejecting && (
        <form
          noValidate
          className="space-y-sm"
          onSubmit={(e) => {
            e.preventDefault();
            const res = validate(rejectionSchema, rejectForm);
            if (!res.ok) return setRejectErrors(res.errors);
            setRejectErrors({});
            review.mutate({ id: rejecting.id, status: "refusée", ...res.data });
          }}
        >
          <p className="max-h-48 overflow-y-auto border border-outline-variant bg-surface-container-low p-xs text-body-sm italic text-on-surface-variant whitespace-pre-line wrap-anywhere">
            “{rejecting.content}”
          </p>
          <ErrorSummary errors={rejectErrors} />
          <Field label="Motif du refus" error={rejectErrors.rejection_category}>
            <select
              className="w-full border border-outline-variant bg-card p-xs text-body-sm"
              value={rejectForm.rejection_category}
              onChange={(e) => setRejectForm({ ...rejectForm, rejection_category: e.target.value })}
            >
              <option value="">— Choisir un motif —</option>
              {REJECTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Raison du refus (obligatoire)" error={rejectErrors.rejection_note}>
            <TextArea
              rows={4}
              value={rejectForm.rejection_note}
              placeholder="Explique au collaborateur pourquoi sa demande est refusée…"
              onChange={(e) => setRejectForm({ ...rejectForm, rejection_note: e.target.value })}
            />
            <CharCounter value={rejectForm.rejection_note} max={500} />
          </Field>
          <FormActions pending={review.isPending} onCancel={() => setRejecting(null)} />
        </form>
      )}
    </FormDialog>
  );

  return { review, startReject, rejectDialog };
}
