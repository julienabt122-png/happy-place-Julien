import type { ReactNode } from "react";

export const STATUS_LABELS: Record<string, string> = {
  "en attente": "En attente",
  validée: "Validée",
  refusée: "Refusée",
};

/** Tag à bordure : icône devant le mot, jamais la couleur seule (spec-interface § 2). */
function IconTag({
  icon,
  box,
  iconColor,
  bold = false,
  children,
}: {
  icon: string;
  box: string;
  iconColor: string;
  bold?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-2 py-0.5 font-label-sm text-[11px] leading-tight text-primary ${
        bold ? "font-semibold" : ""
      } ${box}`}
    >
      <span aria-hidden="true" className={`material-symbols-outlined text-[14px] ${iconColor}`}>
        {icon}
      </span>
      {children}
    </span>
  );
}

const STATUS_STYLES: Record<string, { icon: string; box: string; iconColor: string }> = {
  "en attente": { icon: "schedule", box: "bg-secondary border-outline", iconColor: "text-outline" },
  validée: { icon: "check_circle", box: "bg-[#D9EDDC] border-success", iconColor: "text-success" },
  refusée: { icon: "cancel", box: "bg-error-container border-error", iconColor: "text-error" },
};

/** Statut d'une demande. */
export function StatusTag({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES["en attente"];
  return (
    <IconTag icon={s.icon} box={s.box} iconColor={s.iconColor}>
      {STATUS_LABELS[status] ?? status}
    </IconTag>
  );
}

const SEVERITY_STYLES: Record<
  string,
  { label: string; icon: string; box: string; iconColor: string }
> = {
  critical: {
    label: "Critique",
    icon: "error",
    box: "bg-error-container border-error",
    iconColor: "text-error",
  },
  warning: {
    label: "Attention",
    icon: "warning",
    box: "bg-tertiary-fixed border-on-tertiary-fixed",
    iconColor: "text-on-tertiary-fixed",
  },
  info: {
    label: "Information",
    icon: "info",
    box: "bg-secondary border-outline",
    iconColor: "text-outline",
  },
};

/** Sévérité d'un point bloquant : Critique, Attention ou Information. */
export function SeverityTag({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  return (
    <IconTag icon={s.icon} box={s.box} iconColor={s.iconColor}>
      {s.label}
    </IconTag>
  );
}

const BLOCKER_STATUS_STYLES: Record<string, { label: string; icon: string }> = {
  OUVERT: { label: "Ouvert", icon: "radio_button_unchecked" },
  "EN COURS": { label: "En cours", icon: "schedule" },
  SURVEILLANCE: { label: "Surveillance", icon: "visibility" },
  RÉSOLU: { label: "Résolu", icon: "check_circle" },
};

/** Statut d'un point bloquant : Ouvert, En cours, Surveillance. */
export function BlockerStatusTag({ status }: { status: string }) {
  const s = BLOCKER_STATUS_STYLES[status] ?? { label: status, icon: "schedule" };
  return (
    <IconTag icon={s.icon} box="bg-secondary border-outline" iconColor="text-outline">
      {s.label}
    </IconTag>
  );
}

/** Statut d'une actualité : « Brouillon » (neutre, `edit_note`) ou « Publiée » (positif, coche). */
export function NewsStatusTag({ status }: { status: string }) {
  return status === "publiée" ? (
    <IconTag icon="check_circle" box="bg-[#D9EDDC] border-success" iconColor="text-success">
      Publiée
    </IconTag>
  ) : (
    <IconTag icon="edit_note" box="bg-secondary border-outline" iconColor="text-outline">
      Brouillon
    </IconTag>
  );
}

/** Tag « Nouveau » des actualités récentes (vert de la maquette). */
export function NewTag() {
  return (
    <span className="inline-flex shrink-0 rounded-[4px] border border-success bg-[#D9EDDC] px-2 py-0.5 font-label-sm text-[11px] font-semibold leading-tight text-primary">
      Nouveau
    </span>
  );
}

/** Tag d'information neutre (ex. « Ma demande »). */
export function InfoTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 rounded-[4px] bg-secondary px-2 py-0.5 font-label-sm text-[11px] font-medium leading-tight text-primary">
      {children}
    </span>
  );
}
