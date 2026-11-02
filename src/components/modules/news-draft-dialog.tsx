import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CharCounter } from "@/components/expandable-card";
import { ErrorSummary, Field, FormActions, TextArea, TextInput } from "@/components/manage/crud-ui";
import { FormDialog } from "@/components/modules/form-dialog";
import { profileFullName, useMyProfile } from "@/components/modules/use-my-profile";
import { NewsMediaEditor } from "@/components/news-media";
import { saveDraftNews, type News } from "@/lib/dashboard";
import { newsSchema, validate, type FieldErrors } from "@/lib/manage-schemas";
import {
  emptyMedia,
  linkErrors,
  mediaFromNews,
  toNewsLinks,
  type MediaDraft,
} from "@/lib/news-media";

/**
 * Fenêtre « Rédiger une actualité » : crée un brouillon, ou modifie celui qu'on lui donne (`draft`).
 * Un seul exemplaire, utilisé par l'accueil et par /actualites. `trigger` est le bouton qui l'ouvre ;
 * le focus lui revient à la fermeture. Droits : ceux de saveDraftNews (admin, et manager sur ses brouillons).
 * L'auteur est le nom du profil, sinon `fallbackName`.
 */
export function NewsDraftDialog({
  email,
  fallbackName,
  draft = null,
  trigger,
}: {
  email: string;
  fallbackName: string;
  draft?: News | null;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={draft ? "Modifier le brouillon" : "Rédiger une actualité"}
      description="Rédige l'actualité, puis enregistre-la en brouillon."
      trigger={trigger}
    >
      {/* Monté seulement quand la fenêtre est ouverte : le formulaire repart de zéro à chaque ouverture. */}
      <NewsDraftForm
        email={email}
        fallbackName={fallbackName}
        draft={draft}
        onDone={() => setOpen(false)}
      />
    </FormDialog>
  );
}

function NewsDraftForm({
  email,
  fallbackName,
  draft,
  onDone,
}: {
  email: string;
  fallbackName: string;
  draft: News | null;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const id = useId();
  const profile = useMyProfile(email);
  const author = profileFullName(profile.data) || fallbackName;
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [media, setMedia] = useState<MediaDraft>(() =>
    draft ? mediaFromNews(draft) : emptyMedia(),
  );
  const [showLinkErrs, setShowLinkErrs] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const save = useMutation({
    mutationFn: saveDraftNews,
    onSuccess: () => {
      toast.success("Brouillon enregistré");
      qc.invalidateQueries({ queryKey: ["news"] });
      onDone();
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setShowLinkErrs(true);
    const res = validate(newsSchema, { title, body, author, status: "brouillon" });
    if (!res.ok) {
      setErrors(res.errors);
      return;
    }
    setErrors({});
    if (Object.keys(linkErrors(media.links)).length) {
      toast.error("Corrige les liens invalides avant d'enregistrer.");
      return;
    }
    save.mutate({
      links: toNewsLinks(media.links),
      media,
      id: draft?.id,
      title: res.data.title,
      body: res.data.body,
      author,
      author_email: email.toLowerCase(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <ErrorSummary errors={errors} />
      <Field label="Titre" htmlFor={`${id}-titre`} error={errors.title}>
        <TextInput
          id={`${id}-titre`}
          value={title}
          maxLength={160}
          placeholder="Saisis un titre…"
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>
      <Field label="Contenu" htmlFor={`${id}-contenu`} error={errors.body}>
        <TextArea
          id={`${id}-contenu`}
          rows={5}
          value={body}
          placeholder="Rédige l'actualité…"
          onChange={(e) => setBody(e.target.value)}
        />
        <CharCounter value={body} max={5000} />
      </Field>
      <Field label="Image et liens">
        <NewsMediaEditor
          value={media}
          onChange={setMedia}
          linkErrs={showLinkErrs ? linkErrors(media.links) : {}}
          disabled={save.isPending}
          title={title}
        />
      </Field>
      <FormActions
        pending={save.isPending}
        submitLabel="Enregistrer le brouillon"
        onCancel={onDone}
      />
    </form>
  );
}
