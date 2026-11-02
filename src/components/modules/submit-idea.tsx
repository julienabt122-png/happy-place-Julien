import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorSummary, Field, FormActions, TextArea, TextInput } from "@/components/manage/crud-ui";
import { CharCounter, rejectionErrorMessage } from "@/components/expandable-card";
import { FormDialog } from "@/components/modules/form-dialog";
import { useMyTeams } from "@/components/modules/submission-actions";
import { Button, type ButtonProps } from "@/components/ui/button";
import { submitIdea, type SubmissionInput } from "@/lib/dashboard";
import { submissionSchema, validate, type FieldErrors } from "@/lib/manage-schemas";

/**
 * Bouton « Faire une demande » et sa fenêtre (Dialog shadcn). Un seul exemplaire,
 * utilisé par l'accueil et par /demandes. `children` est le contenu du bouton.
 */
export function SubmitIdeaAction({
  role,
  email,
  variant = "default",
  children,
}: {
  role: string;
  email: string;
  variant?: ButtonProps["variant"];
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const myTeams = useMyTeams(role, email);
  const [submissionForm, setSubmissionForm] = useState<SubmissionInput | null>(null);
  const [submissionErrors, setSubmissionErrors] = useState<FieldErrors>({});
  const [attachment, setAttachment] = useState<File | null>(null);

  const submit = useMutation({
    mutationFn: (input: SubmissionInput) =>
      submitIdea(
        {
          author_name: input.author_name,
          team: input.team,
          content: input.content,
        },
        attachment,
      ),
    onSuccess: () => {
      setSubmissionForm(null);
      setAttachment(null);
      setSubmissionErrors({});
      toast.success("Demande envoyée");
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
    onError: (e: unknown) => toast.error(rejectionErrorMessage(e)),
  });

  function openForm() {
    setSubmissionErrors({});
    const only = role === "manager" && myTeams.data?.length === 1 ? myTeams.data[0] : "";
    setSubmissionForm({ author_name: "", team: only, content: "", status: "en attente" });
  }

  function sendSubmission(e: React.FormEvent) {
    e.preventDefault();
    if (!submissionForm) return;
    // Collaborators: team is set server-side from their account
    // Admin: always the « Admin » team (set server-side); manager: one of their teams
    const team =
      role === "collaborateur" ? "auto" : role === "admin" ? "Admin" : submissionForm.team;
    const result = validate(submissionSchema, { ...submissionForm, team, status: "en attente" });
    if (!result.ok) {
      setSubmissionErrors(result.errors);
      return;
    }
    setSubmissionErrors({});
    submit.mutate(result.data);
  }

  return (
    <FormDialog
      open={!!submissionForm}
      onOpenChange={(o) => (o ? openForm() : setSubmissionForm(null))}
      title="Faire une demande"
      description="Décris ta demande."
      trigger={
        <Button type="button" variant={variant}>
          {children}
        </Button>
      }
    >
      {submissionForm && (
        <form onSubmit={sendSubmission} className="space-y-sm" noValidate>
          <ErrorSummary errors={submissionErrors} />
          <Field label="Nom" error={submissionErrors.author_name}>
            <TextInput
              value={submissionForm.author_name}
              maxLength={80}
              placeholder="Ton nom"
              onChange={(e) =>
                setSubmissionForm({ ...submissionForm, author_name: e.target.value })
              }
            />
          </Field>
          {role === "manager" && (
            <Field label="Équipe" error={submissionErrors.team}>
              <select
                required
                value={submissionForm.team}
                onChange={(e) => setSubmissionForm({ ...submissionForm, team: e.target.value })}
                className="w-full border border-outline-variant bg-surface px-sm py-xs font-body-md"
              >
                <option value="">Choisis une de tes équipes</option>
                {myTeams.data?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {role === "admin" && (
            <p className="text-body-sm text-on-surface-variant">Équipe : Admin</p>
          )}
          <Field label="Demande" error={submissionErrors.content}>
            <TextArea
              rows={5}
              value={submissionForm.content}
              placeholder="Décris ta demande…"
              onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
            />
            <CharCounter value={submissionForm.content} max={2000} min={5} />
          </Field>
          <Field label="Document PDF (optionnel, 20 Mo max)" error={submissionErrors.attachment}>
            <input
              type="file"
              accept="application/pdf,.pdf"
              className="block w-full text-body-sm"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.type !== "application/pdf") {
                  setSubmissionErrors({
                    ...submissionErrors,
                    attachment: "Seuls les fichiers PDF sont acceptés.",
                  });
                  e.target.value = "";
                  setAttachment(null);
                  return;
                }
                if (f && f.size > 20 * 1024 * 1024) {
                  setSubmissionErrors({
                    ...submissionErrors,
                    attachment: "Le fichier dépasse 20 Mo.",
                  });
                  e.target.value = "";
                  setAttachment(null);
                  return;
                }
                const { attachment: _a, ...rest } = submissionErrors;
                setSubmissionErrors(rest);
                setAttachment(f);
              }}
            />
          </Field>
          <FormActions
            pending={submit.isPending}
            submitLabel="Envoyer la demande"
            onCancel={() => setSubmissionForm(null)}
          />
        </form>
      )}
    </FormDialog>
  );
}
