import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FilePicker } from "@/components/modules/file-picker";
import { FormDialog } from "@/components/modules/form-dialog";
import { ConfirmDialog } from "@/components/modules/confirm-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { loadBrowserLib } from "@/lib/browser-lib";

type ImportRow = {
  line: number;
  last_name: string;
  first_name: string;
  email: string;
  role: string;
  team: string;
};
type ResultRow = {
  line: number;
  email: string;
  last_name: string | null;
  first_name: string | null;
  role: string;
  team: string | null;
  status: "valide" | "importée" | "refusée";
  reason: string | null;
};
type Result = { dry_run: boolean; accepted: number; rejected: number; rows: ResultRow[] };

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
const HEADERS: Record<string, keyof Omit<ImportRow, "line">> = {
  nom: "last_name",
  prenom: "first_name",
  "adresse mail": "email",
  email: "email",
  role: "role",
  equipe: "team",
};

function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const sep =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = false;
      } else cell += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const REQUIRED: [keyof Omit<ImportRow, "line">, string][] = [
  ["last_name", "Nom"],
  ["first_name", "Prénom"],
  ["email", "Adresse mail"],
  ["role", "Rôle"],
];
const MAX_CSV_BYTES = 1024 * 1024;
const MAX_XLSX_BYTES = 2 * 1024 * 1024;

type SheetTable = { header: string[]; body: { line: number; cells: string[] }[] };

/** Texte d'une cellule Excel : jamais de formule exécutée (on lit le résultat enregistré), dates en AAAA-MM-JJ. */
function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText))
      return o.richText.map((t) => String((t as { text?: unknown }).text ?? "")).join("");
    if ("result" in o) return cellText(o.result);
    if ("text" in o) return cellText(o.text);
  }
  return "";
}

/**
 * Cherche, parmi toutes les feuilles, celle dont une ligne d'en-têtes contient les colonnes attendues
 * (repérée par ses en-têtes, pas par sa position). Les feuilles d'explication sont ignorées.
 */
async function readWorkbook(file: File): Promise<SheetTable | { error: string }> {
  const ExcelJS = await loadBrowserLib<typeof import("exceljs")>(
    "/vendor/exceljs-4.4.0.min.js",
    "ExcelJS",
  );
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      error: "Ce fichier n'a pas pu être lu. Vérifie qu'il s'agit d'un vrai fichier .xlsx.",
    };
  }
  let bestMissing: string[] = REQUIRED.map(([, l]) => l);
  for (const ws of wb.worksheets) {
    const rows: { line: number; cells: string[] }[] = [];
    ws.eachRow({ includeEmpty: false }, (row, line) => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push({ line, cells: values.map(cellText) });
    });
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const header = rows[i].cells.map((h) => HEADERS[norm(h)]);
      const missing = REQUIRED.filter(([k]) => !header.includes(k)).map(([, l]) => l);
      if (missing.length === 0) return { header: rows[i].cells, body: rows.slice(i + 1) };
      if (missing.length < bestMissing.length) bestMissing = missing;
    }
  }
  return {
    error: `Aucune feuille n'a les colonnes attendues. Colonne(s) manquante(s) : ${bestMissing.join(", ")}.`,
  };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const FALLBACK_TEAMS = [
  "Accounting",
  "Direction Commerciale",
  "Direction Conseil",
  "Direction recrutement",
  "Finance",
  "Legal",
  "Marketing",
  "Opérations",
  "People",
  "Pôle Data et IA",
  "Product",
  "Relation clients",
  "Admin",
];

async function fetchTeams(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from("teams").select("name");
    if (error) throw error;
    const names = (data ?? []).map((r) => r.name);
    const others = names
      .filter((n) => norm(n) !== "admin")
      .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    const admin = names.find((n) => norm(n) === "admin") ?? "Admin";
    return [...others, admin];
  } catch {
    return FALLBACK_TEAMS;
  }
}

async function downloadTemplate() {
  const ExcelJS = await loadBrowserLib<typeof import("exceljs")>(
    "/vendor/exceljs-4.4.0.min.js",
    "ExcelJS",
  );
  const teams = await fetchTeams();
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Utilisateurs", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Nom", width: 20 },
    { header: "Prénom", width: 20 },
    { header: "Adresse mail", width: 34 },
    { header: "Rôle", width: 18 },
    { header: "Équipe", width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  const teamRange = `Listes!$B$2:$B$${teams.length + 1}`;
  for (let r = 2; r <= 501; r++) {
    ws.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["Listes!$A$2:$A$4"],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "Choisis un rôle dans la liste.",
    };
    ws.getCell(`E${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [teamRange],
      showErrorMessage: true,
      errorTitle: "Valeur invalide",
      error: "Choisis une équipe dans la liste.",
    };
  }
  const lists = wb.addWorksheet("Listes");
  const roles = ["Rôles", "admin", "manager", "collaborateur"];
  const teamCol = ["Équipes", ...teams];
  roles.forEach((v, i) => (lists.getCell(`A${i + 1}`).value = v));
  teamCol.forEach((v, i) => (lists.getCell(`B${i + 1}`).value = v));
  lists.getRow(1).font = { bold: true };
  const help = wb.addWorksheet("Mode d'emploi");
  help.getColumn(1).width = 110;
  [
    "1. Ouvre ce fichier dans Google Sheets (Fichier > Importer) ou Excel.",
    "2. Remplis une ligne par personne dans l'onglet Utilisateurs.",
    "3. Choisis le rôle et l'équipe dans les menus déroulants.",
    "4. Une adresse mail ne peut apparaître qu'une fois : une adresse = un rôle.",
    "5. Collaborateur : équipe obligatoire. Manager : équipe facultative, une équipe peut avoir plusieurs managers. Admin : équipe vide ou Admin.",
    "6. Exporte l'onglet Utilisateurs en CSV (Google Sheets : Fichier > Télécharger > CSV).",
    "7. Dans Happy Place : Gestion > Utilisateurs > Importer un fichier, vérifie l'aperçu puis confirme.",
    "8. L'équipe doit exister dans Happy Place : un admin peut en créer une dans Gestion > Équipes.",
  ].forEach((t, i) => (help.getCell(`A${i + 1}`).value = t));
  const buf = await wb.xlsx.writeBuffer();
  download(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    "happy-place-import-utilisateurs.xlsx",
  );
}

function downloadReport(rows: ResultRow[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["Ligne", "Nom", "Prénom", "Adresse mail", "Rôle", "Équipe", "Statut", "Motif"]
      .map(esc)
      .join(";"),
  ];
  rows.forEach((r) =>
    lines.push(
      [r.line, r.last_name, r.first_name, r.email, r.role, r.team, r.status, r.reason]
        .map(esc)
        .join(";"),
    ),
  );
  download(
    new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }),
    "happy-place-rapport-import.csv",
  );
}

/** Fenêtre « Importer un fichier CSV » : le contenu de l'ancienne section en ligne, ouvert par `trigger`. */
export function BulkImportDialog({
  onImported,
  trigger,
}: {
  onImported: () => void;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title="Importer un fichier"
      description="Importe une liste de personnes depuis un fichier .xlsx ou .csv, après un aperçu."
      trigger={trigger}
    >
      <BulkImportBody onImported={onImported} />
    </FormDialog>
  );
}

function BulkImportBody({ onImported }: { onImported: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<ImportRow[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileId = useId();

  async function onFile(file: File | undefined) {
    setError(null);
    setResult(null);
    setFileName(null);
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isXlsx = lower.endsWith(".xlsx");
    if (!isXlsx && !lower.endsWith(".csv"))
      return setError("Ce format n'est pas pris en charge. Utilise un fichier .xlsx ou .csv.");
    if (file.size > (isXlsx ? MAX_XLSX_BYTES : MAX_CSV_BYTES))
      return setError(`Fichier trop volumineux (${isXlsx ? 2 : 1} Mo maximum).`);
    setFileName(file.name);
    let header: (keyof Omit<ImportRow, "line"> | undefined)[];
    let body: { line: number; cells: string[] }[];
    if (isXlsx) {
      setBusy(true);
      const sheet = await readWorkbook(file).catch(() => ({
        error: "Ce fichier n'a pas pu être lu. Vérifie qu'il s'agit d'un vrai fichier .xlsx.",
      }));
      setBusy(false);
      if ("error" in sheet) return setError(sheet.error);
      header = sheet.header.map((h) => HEADERS[norm(h)]);
      body = sheet.body;
    } else {
      const table = parseCsv(await file.text());
      header = (table[0] ?? []).map((h) => HEADERS[norm(h)]);
      const missing = REQUIRED.filter(([k]) => !header.includes(k)).map(([, l]) => l);
      if (missing.length)
        return setError(`Colonne(s) obligatoire(s) manquante(s) : ${missing.join(", ")}.`);
      body = table.slice(1).map((cells, idx) => ({ line: idx + 2, cells }));
    }
    const rows: ImportRow[] = [];
    body.forEach(({ line, cells }) => {
      if (cells.every((c) => c.trim() === "")) return;
      const r: ImportRow = { line, last_name: "", first_name: "", email: "", role: "", team: "" };
      header.forEach((k, i) => {
        if (k) r[k] = (cells[i] ?? "").trim();
      });
      r.email = r.email.replace(/\s+/g, "").toLowerCase();
      rows.push(r);
    });
    if (!rows.length) return setError("Le fichier ne contient aucune ligne.");
    setBusy(true);
    const { data, error: e } = await supabase.rpc("bulk_import_allowed_users", {
      _rows: rows,
      _dry_run: true,
    });
    setBusy(false);
    if (e) return setError(e.message);
    setSent(rows);
    setResult(data as unknown as Result);
  }

  async function confirmImport() {
    if (!result) return;
    setConfirming(false);
    const validLines = new Set(result.rows.filter((r) => r.status === "valide").map((r) => r.line));
    const toSend = sent.filter((r) => validLines.has(r.line));
    setBusy(true);
    const { data, error: e } = await supabase.rpc("bulk_import_allowed_users", {
      _rows: toSend,
      _dry_run: false,
    });
    setBusy(false);
    if (e) return toast.error(e.message);
    const res = data as unknown as Result;
    const imported = new Map(res.rows.map((r) => [r.line, r]));
    const merged = result.rows.map((r) => imported.get(r.line) ?? r);
    const rejected = merged.filter((r) => r.status === "refusée").length;
    toast.success(`${res.accepted} utilisateurs importés, ${rejected} lignes refusées`);
    setResult({ dry_run: false, accepted: res.accepted, rejected, rows: merged });
    onImported();
  }

  function cancel() {
    setResult(null);
    setSent([]);
    setError(null);
    setFileName(null);
    setInputKey((k) => k + 1);
  }

  const validCount = result?.rows.filter((r) => r.status === "valide").length ?? 0;

  return (
    <div className="space-y-sm">
      <div className="flex flex-wrap items-center gap-sm">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadTemplate().catch((e) => toast.error((e as Error).message))}
        >
          Télécharger le modèle (.xlsx)
        </Button>
        <FilePicker
          key={inputKey}
          id={fileId}
          compact
          label="Choisir un fichier"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          fileName={fileName}
          disabled={busy}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {busy && <span className="text-body-sm">…</span>}
      </div>
      <p className="text-sm text-on-surface-variant">
        Formats acceptés : .xlsx ou .csv, 500 lignes au maximum.
      </p>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      {result && (
        <div className="space-y-sm">
          <p className="text-body-sm text-primary">
            {result.dry_run
              ? `${result.accepted} lignes valides · ${result.rejected} lignes refusées`
              : `${result.accepted} lignes importées · ${result.rejected} lignes refusées`}
          </p>
          <div className="flex flex-wrap gap-sm">
            {result.dry_run && (
              <Button
                type="button"
                disabled={validCount === 0 || busy}
                onClick={() => setConfirming(true)}
              >
                Importer les {validCount} lignes valides
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => downloadReport(result.rows)}>
              Télécharger le rapport (CSV)
            </Button>
            <Button type="button" variant="outline" onClick={cancel}>
              Annuler
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left border-b border-outline-variant">
                  {[
                    "Ligne",
                    "Nom",
                    "Prénom",
                    "Adresse mail",
                    "Rôle",
                    "Équipe",
                    "Statut",
                    "Motif",
                  ].map((h) => (
                    <th key={h} className="p-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr
                    key={r.line}
                    className={`border-b border-outline-variant ${r.status === "refusée" ? "text-error" : ""}`}
                  >
                    <td className="p-xs">{r.line}</td>
                    <td className="p-xs">{r.last_name}</td>
                    <td className="p-xs">{r.first_name}</td>
                    <td className="p-xs">{r.email}</td>
                    <td className="p-xs">{r.role}</td>
                    <td className="p-xs">{r.team}</td>
                    <td className="p-xs">{r.status}</td>
                    <td className="p-xs">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Importer les utilisateurs"
        message={`Importer ${validCount} utilisateur(s) ?`}
        confirmLabel="Importer"
        pending={busy}
        onConfirm={() => void confirmImport()}
      />
    </div>
  );
}
