import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ErrorSummary,
  Field,
  FormActions,
  ReadOnlyField,
  Select,
  TextArea,
  TextInput,
} from "@/components/manage/crud-ui";
import { CharCounter, rejectionErrorMessage } from "@/components/expandable-card";
import { FilePicker } from "@/components/modules/file-picker";
import { FormDialog } from "@/components/modules/form-dialog";
import { useMyTeams } from "@/components/modules/submission-actions";
import { profileFullName, useMyProfile } from "@/components/modules/use-my-profile";
import { Button, type ButtonProps } from "@/components/ui/button";
import { submitIdea, type SubmissionInput } from "@/lib/dashboard";
import { submissionSchema, validate, type FieldErrors } from "@/lib/manage-schemas";

/**
 * Bouton « Faire une demande » et sa fenêtre « Nouvelle demande » (Dialog shadcn). Un seul exemplaire,
 * utilisé par l'accueil et par /demandes. `children` est le contenu du bouton.
 * Le nom (et l'équipe du collaborateur) viennent du profil et ne sont pas modifiables.
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
  const profile = useMyProfile(email);
  const profileName = profileFullName(profile.data);
  // Sans prénom ni nom en base, rien n'est inventé : le champ reste libre.
  const nameLocked = profileName.length > 0;
  const demandeRef = useRef<HTMLTextAreaElement>(null);
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
    const author_name = nameLocked ? profileName : submissionForm.author_name;
    const result = validate(submissionSchema, {
      ...submissionForm,
      author_name,
      team,
      status: "en attente",
    });
    if (!result.ok) {
      setSubmissionErrors(result.errors);
      return;
    }
    setSubmissionErrors({});
    submit.mutate(result.data);
  }

  const helpText = !nameLocked
    ? "Renseigne ton nom."
    : role === "manager"
      ? "Ton nom est prérempli depuis ton compte, non modifiable."
      : "Préremplis depuis ton compte, non modifiables.";

  return (
    <FormDialog
      open={!!submissionForm}
      onOpenChange={(o) => (o ? openForm() : setSubmissionForm(null))}
      title="Nouvelle demande"
      description="Décris ta demande."
      initialFocusRef={demandeRef}
      trigger={
        <Button type="button" variant={variant}>
          {children}
        </Button>
      }
    >
      {submissionForm && (
        <form onSubmit={sendSubmission} className="space-y-6" noValidate>
          <ErrorSummary errors={submissionErrors} />
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {nameLocked ? (
                <ReadOnlyField
                  id="demande-nom"
                  label="Nom"
                  value={profileName}
                  describedBy="demande-aide"
                />
              ) : (
                <Field label="Nom" htmlFor="demande-nom" error={submissionErrors.author_name}>
                  <TextInput
                    id="demande-nom"
                    value={submissionForm.author_name}
                    maxLength={80}
                    placeholder="Ton nom"
                    aria-describedby="demande-aide"
                    onChange={(e) =>
                      setSubmissionForm({ ...submissionForm, author_name: e.target.value })
                    }
                  />
                </Field>
              )}
              {role === "manager" ? (
                <Field label="Équipe" htmlFor="demande-equipe" error={submissionErrors.team}>
                  <Select
                    id="demande-equipe"
                    required
                    value={submissionForm.team}
                    onChange={(e) => setSubmissionForm({ ...submissionForm, team: e.target.value })}
                  >
                    <option value="">Choisis une de tes équipes</option>
                    {myTeams.data?.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <ReadOnlyField
                  id="demande-equipe"
                  label="Équipe"
                  value={role === "admin" ? "Admin" : (profile.data?.team ?? "")}
                  describedBy="demande-aide"
                />
              )}
            </div>
            <p id="demande-aide" className="mt-1 text-sm text-on-surface-variant">
              {helpText}
            </p>
          </div>
          <Field
            label="Ta demande (obligatoire)"
            htmlFor="demande-texte"
            error={submissionErrors.content}
          >
            <TextArea
              id="demande-texte"
              ref={demandeRef}
              rows={5}
              value={submissionForm.content}
              placeholder="Décris ce dont tu as besoin…"
              onChange={(e) => setSubmissionForm({ ...submissionForm, content: e.target.value })}
            />
            <CharCounter value={submissionForm.content} max={2000} min={5} />
          </Field>
          <Field
            label="Pièce jointe (facultatif, PDF, 20 Mo max)"
            htmlFor="demande-fichier"
            error={submissionErrors.attachment}
          >
            <FilePicker
              id="demande-fichier"
              accept="application/pdf,.pdf"
              fileName={attachment?.name}
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
