import { useMutation } from "@tanstack/react-query";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Field, FormActions, Select, TextInput } from "@/components/manage/crud-ui";
import { Checkbox } from "@/components/ui/checkbox";
import {
  addManagerTeam,
  addUser,
  emailSchema,
  nameSchema,
  ROLE_LABELS,
  teamSchema,
  useRefreshUsers,
  type AppRole,
} from "@/components/manage/users-data";
import { FormDialog } from "@/components/modules/form-dialog";

/** Fenêtre « Ajouter un utilisateur » : mêmes champs, mêmes règles et même écriture que l'ancien formulaire en ligne. */
export function UserAddDialog({ teams, trigger }: { teams: string[]; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Ajouter un utilisateur"
      description="Renseigne la personne, son rôle et son équipe."
      trigger={trigger}
    >
      {/* Monté seulement quand la fenêtre est ouverte : le formulaire repart de zéro à chaque ouverture. */}
      <AddForm teams={teams} onDone={() => setOpen(false)} />
    </FormDialog>
  );
}

function AddForm({ teams, onDone }: { teams: string[]; onDone: () => void }) {
  const id = useId();
  const refresh = useRefreshUsers();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("collaborateur");
  const [team, setTeam] = useState("");
  const [managed, setManaged] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const add = useMutation({
    // Crée la personne, puis enregistre ses équipes managées (cas du manager).
    mutationFn: async (v: Parameters<typeof addUser>[0] & { managed: string[] }) => {
      const { managed: teamsToManage, ...user } = v;
      const userId = await addUser(user);
      for (const t of teamsToManage) await addManagerTeam({ allowedUserId: userId, team: t });
    },
    onSuccess: () => {
      toast.success("Utilisateur ajouté");
      refresh();
      onDone();
    },
    onError: (e) => setErr((e as Error).message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    let chosenTeam: string | null = null;
    if (role === "collaborateur") {
      const t = teamSchema.safeParse(team);
      if (!t.success) return setErr("Équipe requise : " + t.error.issues[0].message);
      chosenTeam = t.data;
    }
    if (role === "manager" && managed.length === 0) {
      return setErr("Choisis au moins une équipe managée.");
    }
    const fn = nameSchema.safeParse(firstName);
    if (!fn.success) return setErr("Prénom : " + fn.error.issues[0].message);
    const ln = nameSchema.safeParse(lastName);
    if (!ln.success) return setErr("Nom : " + ln.error.issues[0].message);
    setErr(null);
    add.mutate({
      email: parsed.data,
      role,
      team: chosenTeam,
      first_name: fn.data || null,
      last_name: ln.data || null,
      managed: role === "manager" ? managed : [],
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Prénom (facultatif)" htmlFor={`${id}-prenom`}>
          <TextInput
            id={`${id}-prenom`}
            value={firstName}
            maxLength={100}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </Field>
        <Field label="Nom (facultatif)" htmlFor={`${id}-nom`}>
          <TextInput
            id={`${id}-nom`}
            value={lastName}
            maxLength={100}
            onChange={(e) => setLastName(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Adresse e-mail (obligatoire)" htmlFor={`${id}-email`}>
        <TextInput
          id={`${id}-email`}
          value={email}
          placeholder="prenom.nom@exemple.fr"
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Rôle (obligatoire)" htmlFor={`${id}-role`}>
        <Select id={`${id}-role`} value={role} onChange={(e) => setRole(e.target.value as AppRole)}>
          {(["collaborateur", "manager", "admin"] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </Field>
      {role === "collaborateur" && (
        <Field label="Équipe (obligatoire)" htmlFor={`${id}-equipe`}>
          <Select id={`${id}-equipe`} value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="">Choisir une équipe</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {role === "manager" && (
        <fieldset className="space-y-2">
          <legend className="font-label-md text-[13px] font-medium text-primary">
            Équipes managées (obligatoire)
          </legend>
          <div
            role="group"
            aria-label="Sélection des équipes managées"
            className="max-h-[180px] overflow-y-auto rounded-[4px] border border-outline"
          >
            {teams.map((t) => (
              <label
                key={t}
                htmlFor={`${id}-m-${t}`}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-3 text-sm text-primary hover:bg-secondary"
              >
                <Checkbox
                  id={`${id}-m-${t}`}
                  checked={managed.includes(t)}
                  onCheckedChange={(v) =>
                    setManaged((cur) =>
                      v === true
                        ? cur.includes(t)
                          ? cur
                          : [...cur, t]
                        : cur.filter((x) => x !== t),
                    )
                  }
                  className="h-5 w-5 rounded-[4px] shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:ring-0"
                />
                <span className="min-w-0 wrap-anywhere">{t}</span>
              </label>
            ))}
          </div>
          <p className="text-sm text-on-surface-variant">
            Les managers d'une équipe tranchent ses demandes.
          </p>
        </fieldset>
      )}
      {err && (
        <p role="alert" className="text-body-sm text-error">
          {err}
        </p>
      )}
      <FormActions pending={add.isPending} submitLabel="Ajouter" onCancel={onDone} />
    </form>
  );
}
