import { cellText } from "./table";

export type ExportFormat = "pdf" | "xlsx" | "csv" | "txt";

export type ExportData = {
  /** Nom de fichier sans extension. */
  name: string;
  /** Titre du PDF et de la feuille Excel ; le nom par défaut. */
  title?: string;
  headers: readonly string[];
  /** Lignes déjà triées/filtrées, une chaîne par colonne exportée. */
  rows: readonly (readonly string[])[];
};

function csvField(value: string): string {
  const text = cellText(value);
  // Neutralise l'injection de formule dans Excel (=, +, @ ou - suivi d'autre chose qu'un chiffre).
  const safe = /^[=+@]/.test(text) || /^-[^\d]/.test(text) ? `'${text}` : text;

  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV à la française : séparateur « ; » (Excel FR), fins de ligne CRLF. Le BOM est ajouté au téléchargement. */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers, ...rows].map((line) => line.map(csvField).join(";")).join("\r\n");
}

/** Texte brut : colonnes séparées par des tabulations. */
export function toTxt(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers, ...rows].map((line) => line.map((value) => cellText(value).replace(/\t/g, " ")).join("\t")).join("\r\n");
}

/** Nom de fichier sûr, daté : « commandes-2026-11-18.csv ». */
export function fileName(name: string, extension: string, now: Date = new Date()): string {
  const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "export";

  return `${slug}-${now.toISOString().slice(0, 10)}.${extension}`;
}

/** Une colonne est numérique (alignée à droite) quand toutes ses cellules non vides sont des montants, nombres ou pourcentages. */
export function isNumericColumn(values: readonly string[]): boolean {
  const filled = values.map(cellText).filter((value) => value !== "" && value !== "-");

  return filled.length > 0 && filled.every((value) => /^[-+]?[\d\s.,  ]+(?:\s?(?:%|€))?$/.test(value));
}
