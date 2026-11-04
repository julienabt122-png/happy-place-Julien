import { useId, useState, type RefObject } from "react";
import { toast } from "sonner";
import { Field, Select, TextInput } from "@/components/manage/crud-ui";
import {
  addManagerTeam,
  couperAcces,
  formatDay,
  longDate,
  minDepartureDate,
  nameSchema,
  removeManagerTeam,
  ROLE_LABELS,
  setDepartureDate,
  updateNames,
  updateRoleAndTeam,
  useRefreshUsers,
  userDisplayName,
  type AppRole,
  type UserRow,
} from "@/components/manage/users-data";
import { FormDialog } from "@/components/modules/form-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Fenêtre « Modifier l'utilisateur » (maquette) : prénom et nom, rôle, équipe (collaborateur), équipes managées
 * (manager) et date de départ. Les écritures sont celles de l'ancienne page, enchaînées à l'enregistrement.
 * « Retirer l'accès » ouvre la confirmation de la page ; « Annuler le départ » reste accessible ici.
 */
export function UserEditDialog({
  user,
  open,
  onOpenChange,
  returnFocusRef,
  teams,
  me,
  onRetire,
}: {
  user: UserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  teams: string[];
  me: string;
  onRetire: (u: UserRow) => void;
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Modifier l'utilisateur"
      description="Modifie le nom, le rôle, l'équipe ou la date de départ de la personne."
      returnFocusRef={returnFocusRef}
    >
      {user && (
        <EditForm
          key={user.id}
          user={user}
          teams={teams}
          me={me}
          onRetire={onRetire}
          onDone={() => onOpenChange(false)}
        />
      )}
    </FormDialog>
  );
}

function EditForm({
  user: u,
  teams,
  me,
  onRetire,
  onDone,
}: {
  user: UserRow;
  teams: string[];
  me: string;
  onRetire: (u: UserRow) => void;
  onDone: () => void;
}) {
  const id = useId();
  const refresh = useRefreshUsers();
  const [firstName, setFirstName] = useState(u.first_name ?? "");
  const [lastName, setLastName] = useState(u.last_name ?? "");
  const [role, setRole] = useState<AppRole>(u.role);
  const [team, setTeam] = useState(u.team ?? "");
  const [managed, setManaged] = useState<string[]>(u.teams);
  const [departure, setDeparture] = useState(u.departure_date ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isMe = u.email === me;
  const min = minDepartureDate();
  const teamOptions = u.team && !teams.includes(u.team) ? [u.team, ...teams] : teams;
  const managedOptions = [...new Set([...teams, ...u.teams])];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const fn = nameSchema.safeParse(firstName);
    if (!fn.success) return setErr("Prénom : " + fn.error.issues[0].message);
    const ln = nameSchema.safeParse(lastName);
    if (!ln.success) return setErr("Nom : " + ln.error.issues[0].message);
    const namesChanged = fn.data !== (u.first_name ?? "") || ln.data !== (u.last_name ?? "");
    const roleChanged = role !== u.role;
    const teamChanged = role === "collaborateur" && team !== (u.team ?? "");
    const toAdd = role === "manager" ? managed.filter((t) => !u.teams.includes(t)) : [];
    const toRemove =
      role === "manager" && !roleChanged ? u.teams.filter((t) => !managed.includes(t)) : [];
    const departureChanged = departure !== (u.departure_date ?? "");
    if (
      !namesChanged &&
      !roleChanged &&
      !teamChanged &&
      !toAdd.length &&
      !toRemove.length &&
      !departureChanged
    ) {
      onDone();
      return;
    }
    setPending(true);
    try {
      if (namesChanged) {
        await updateNames({ id: u.id, first_name: fn.data || null, last_name: ln.data || null });
      }
      if (roleChanged || teamChanged) {
        await updateRoleAndTeam({
          id: u.id,
          role,
          team: role === "collaborateur" ? team : undefined,
        });
      }
      for (const t of toAdd) await addManagerTeam({ allowedUserId: u.id, team: t });
      for (const t of toRemove) await removeManagerTeam({ allowedUserId: u.id, team: t });
      if (departureChanged) await setDepartureDate({ id: u.id, date: departure || null });
      toast.success("Utilisateur modifié");
      refresh();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      refresh();
    } finally {
      setPending(false);
    }
  }

  async function couperMaintenant() {
    const ok = window.confirm(
      `Couper l'accès de ${userDisplayName(u)} maintenant ? Ses droits disparaissent tout de suite. Cette action ne peut pas être annulée : pour le revoir, il faudra le réajouter.`,
    );
    if (!ok) return;
    setPending(true);
    try {
      await couperAcces(u.id);
      toast.success("Accès coupé");
      refresh();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
      setPending(false);
    }
  }

  async function cancelDeparture() {
    setPending(true);
    try {
      await setDepartureDate({ id: u.id, date: null });
      toast.success("Départ annulé");
      refresh();
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-6" noValidate>
      <div className="space-y-0.5">
        <p className="text-base font-semibold text-primary wrap-anywhere">{userDisplayName(u)}</p>
        {userDisplayName(u) !== u.email && (
          <p className="font-label-sm text-xs text-on-surface-variant wrap-anywhere">{u.email}</p>
        )}
        <p className="font-label-sm text-xs text-on-surface-variant">
          Ajouté le {longDate(u.created_at)}
        </p>
      </div>

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

      <Field label="Rôle (obligatoire)" htmlFor={`${id}-role`}>
        <Select
          id={`${id}-role`}
          value={role}
          disabled={isMe}
          aria-describedby={`${id}-role-aide`}
          onChange={(e) => setRole(e.target.value as AppRole)}
        >
          {(["admin", "manager", "collaborateur"] as const).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <p id={`${id}-role-aide`} className="text-sm text-on-surface-variant">
          {isMe
            ? "Tu ne peux pas modifier ton propre rôle depuis la gestion. Demande à un autre admin."
            : "Le rôle définit ce que la personne peut voir et faire."}
        </p>
      </Field>

      {role === "collaborateur" && (
        <Field label="Équipe (obligatoire)" htmlFor={`${id}-equipe`}>
          <Select
            id={`${id}-equipe`}
            value={team}
            aria-describedby={`${id}-equipe-aide`}
            onChange={(e) => setTeam(e.target.value)}
          >
            <option value="">Choisir une équipe</option>
            {teamOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <p id={`${id}-equipe-aide`} className="text-sm text-on-surface-variant">
            L'équipe qui apparaît sur ses demandes.
          </p>
        </Field>
      )}

      {role === "manager" && (
        <fieldset className="space-y-2">
          <legend className="font-label-md text-[13px] font-medium text-primary">
            Équipes managées
          </legend>
          <div
            role="group"
            aria-label="Sélection des équipes managées"
            className="max-h-[180px] overflow-y-auto rounded-[4px] border border-outline"
          >
            {managedOptions.map((t) => (
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

      <Field label="Date de départ (facultatif)" htmlFor={`${id}-depart`}>
        <TextInput
          id={`${id}-depart`}
          type="date"
          min={min}
          value={departure}
          aria-describedby={`${id}-depart-aide`}
          onChange={(e) => setDeparture(e.target.value)}
        />
        <p id={`${id}-depart-aide`} className="text-sm text-on-surface-variant">
          À cette date, la personne ne peut plus se connecter. Son historique est conservé.
          {u.departure_date ? ` Départ actuellement prévu le ${formatDay(u.departure_date)}.` : ""}
        </p>
      </Field>

      {err && (
        <p role="alert" className="text-body-sm text-error">
          {err}
        </p>
      )}

      <div
        data-form-footer
        className="sticky bottom-0 -mx-6 mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant bg-card p-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          {!isMe && (
            <Button type="button" variant="link" disabled={pending} onClick={() => onRetire(u)}>
              Retirer l'accès
            </Button>
          )}
          {!isMe && (
            <Button type="button" variant="link" disabled={pending} onClick={couperMaintenant}>
              Couper l'accès maintenant
            </Button>
          )}
          {u.departure_date && (
            <Button type="button" variant="link" disabled={pending} onClick={cancelDeparture}>
              Annuler le départ
            </Button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Button type="button" variant="outline" onClick={onDone}>
            Annuler
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </div>
    </form>
  );
}
