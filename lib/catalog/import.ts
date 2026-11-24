import { unzipSync, strFromU8 } from "fflate";

/**
 * Import en masse de produits : lecture de CSV, XLSX et SQL côté navigateur, puis conversion en lignes
 * normalisées envoyées à l'API. Le modèle de référence est l'export catalogue « Catalogue_Marche_de_YAMA.xlsx ».
 */

export const MAX_IMPORT_ROWS = 5000;
export const IMPORT_EXTENSIONS = [".csv", ".xlsx", ".sql"];

export type ImportRow = {
  row: number;
  name: string;
  sku?: string;
  external_id?: string;
  barcode?: string;
  description?: string;
  category?: string;
  sale_unit?: "piece" | "kg" | "l";
  is_weight_variable?: boolean;
  price_minor?: number;
  compare_at_price_minor?: number;
  vat_rate_bp?: number;
  track_stock?: boolean;
  is_active?: boolean;
  images?: string[];
};

export type ImportOptions = {
  /** Masque les produits marqués « No » dans « Display item in Online Store? ». */
  hideOffline: boolean;
  /** Reprend « Track inventory? » (les produits suivis ne se commandent plus sans lot en stock). */
  keepTrackStock: boolean;
};

export const DEFAULT_OPTIONS: ImportOptions = { hideOffline: false, keepTrackStock: false };

export type Table = { headers: string[]; rows: string[][]; firstRow: number };
export type Ignored = { row: number; label: string; reason: string };
export type ParsedRows = { rows: ImportRow[]; ignored: Ignored[] };

/** Colonnes du modèle (ordre de l'export d'origine), avec ce que le backoffice en fait. */
export const TEMPLATE_HEADERS = [
  "Item name", "Price", "Regular price (before sale)", "On sale in Online Store?", "Tax rate (%)", "Unit",
  "Variable price? (Yes/No)", "Track inventory? (Yes/No)", "SKU", "Barcode", "Description (Online Store and Invoices only)",
  "Category", "Image 1", "Image 2", "Image 3", "Display item in Online Store? (Yes/No)", "Item id (Do not change)",
];

export const TEMPLATE_EXAMPLE = [
  "Riz long parfumé Tersol 1kg", "2.90", "", "No", "5.5", "each.each", "No", "No", "RIZ-TERSOL-1KG", "", "Riz long grain parfumé", "Féculents",
  "https://exemple.com/riz.jpg", "", "", "Yes", "",
];

export function templateCsv(): string {
  const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `﻿${[TEMPLATE_HEADERS, TEMPLATE_EXAMPLE].map((r) => r.map(cell).join(";")).join("\r\n")}\r\n`;
}

/* ------------------------------------------------------------------ lecture des fichiers */

export async function readTable(file: File): Promise<Table> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx")) return parseXlsx(new Uint8Array(await file.arrayBuffer()));

  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes); // CSV/SQL enregistré depuis Excel ou un vieil outil
  }
  text = text.replace(/^﻿/, "");

  if (name.endsWith(".csv")) return parseCsv(text);
  if (name.endsWith(".sql")) return parseSql(text);
  throw new Error("Format non reconnu : utilisez un fichier .csv, .xlsx ou .sql.");
}

export function parseCsv(text: string): Table {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (c: string) => firstLine.split(c).length - 1;
  const delimiter = [";", "\t", ","].reduce((best, c) => (count(c) > count(best) ? c : best), ",");

  const records: string[][] = [];
  let record: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') quoted = false;
      else value += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { record.push(value); value = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(value); value = "";
      records.push(record); record = [];
    } else value += ch;
  }
  if (value !== "" || record.length > 0) { record.push(value); records.push(record); }

  return toTable(records);
}

function toTable(records: string[][]): Table {
  const start = records.findIndex((r) => r.some((c) => c.trim() !== ""));
  if (start < 0) throw new Error("Le fichier est vide.");

  return { headers: records[start].map((h) => h.trim()), rows: records.slice(start + 1), firstRow: start + 2 };
}

/* ------------------------------------------------------------------ XLSX */

const decodeXml = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()];
  });

function textOf(xml: string): string {
  const clean = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "");
  return [...clean.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");
}

function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/[^A-Z]/gi, "").toUpperCase()) n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

export function parseXlsx(bytes: Uint8Array): Table {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name) });
  } catch {
    throw new Error("Fichier .xlsx illisible (est-il corrompu ou protégé par un mot de passe ?).");
  }

  const read = (path: string) => (files[path] ? strFromU8(files[path]) : null);

  // Première feuille du classeur.
  let sheetPath = "xl/worksheets/sheet1.xml";
  const workbook = read("xl/workbook.xml");
  const rels = read("xl/_rels/workbook.xml.rels");
  const rid = workbook?.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  if (rid && rels) {
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      if (m[0].includes(`Id="${rid}"`)) {
        const target = m[0].match(/Target="([^"]+)"/)?.[1];
        if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
      }
    }
  }

  const sheet = read(sheetPath);
  if (!sheet) throw new Error("Aucune feuille trouvée dans le fichier .xlsx.");

  const shared = [...(read("xl/sharedStrings.xml") ?? "").matchAll(/<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g)].map((m) => textOf(m[1] ?? ""));
  const records: string[][] = [];

  for (const rowMatch of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1] ?? records.length + 1);
    const cells: string[] = [];

    for (const c of (rowMatch[2] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const type = c[1].match(/\bt="([^"]+)"/)?.[1];
      const ref = c[1].match(/\br="([^"]+)"/)?.[1];
      const inner = c[2] ?? "";
      const raw = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";

      if (type === "inlineStr") value = textOf(inner);
      else if (raw !== undefined) value = type === "s" ? (shared[Number(raw)] ?? "") : type === "b" ? (raw === "1" ? "TRUE" : "FALSE") : decodeXml(raw);

      const index = ref ? columnIndex(ref) : cells.length;
      while (cells.length < index) cells.push("");
      cells[index] = value;
    }

    while (records.length < rowNumber - 1) records.push([]);
    records[rowNumber - 1] = cells;
  }

  return toTable(records);
}

/* ------------------------------------------------------------------ SQL (jamais exécuté : seules les valeurs des INSERT sont lues) */

type Token = { kind: "word" | "string" | "punct"; value: string };

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (/\s/.test(ch)) i++;
    else if (ch === "-" && sql[i + 1] === "-") i = sql.indexOf("\n", i) < 0 ? sql.length : sql.indexOf("\n", i);
    else if (ch === "#") i = sql.indexOf("\n", i) < 0 ? sql.length : sql.indexOf("\n", i);
    else if (ch === "/" && sql[i + 1] === "*") i = sql.indexOf("*/", i) < 0 ? sql.length : sql.indexOf("*/", i) + 2;
    else if (ch === "'" || ch === '"' || ch === "`") {
      let value = "";
      i++;
      while (i < sql.length) {
        if (sql[i] === "\\" && ch !== "`") {
          const next = sql[i + 1] ?? "";
          value += ({ n: "\n", r: "\r", t: "\t", "0": "\0" } as Record<string, string>)[next] ?? next;
          i += 2;
        } else if (sql[i] === ch && sql[i + 1] === ch) { value += ch; i += 2; }
        else if (sql[i] === ch) { i++; break; }
        else value += sql[i++];
      }
      // Une chaîne entre ' ou " est une valeur ; entre ` c'est un identifiant.
      tokens.push({ kind: ch === "`" ? "word" : "string", value });
    } else if ("(),;.".includes(ch)) { tokens.push({ kind: "punct", value: ch }); i++; }
    else {
      let j = i;
      while (j < sql.length && (!/[\s(),;.'"`]/.test(sql[j]) || (sql[j] === "." && /\d/.test(sql[j + 1] ?? "") && /\d/.test(sql[j - 1] ?? "")))) j++;
      if (j === i) j++;
      tokens.push({ kind: "word", value: sql.slice(i, j) });
      i = j;
    }
  }

  return tokens;
}

export function parseSql(sql: string): Table {
  const tokens = tokenize(sql);
  const inserts: { table: string; columns: string[]; rows: string[][] }[] = [];
  let p = 0;

  const isWord = (t: Token | undefined, w: string) => t?.kind === "word" && t.value.toUpperCase() === w;
  const isPunct = (t: Token | undefined, c: string) => t?.kind === "punct" && t.value === c;

  while (p < tokens.length) {
    if (!(isWord(tokens[p], "INSERT") || isWord(tokens[p], "REPLACE"))) { p++; continue; }
    p++;
    while (tokens[p] && !isWord(tokens[p], "INTO")) p++;
    p++;

    let table = tokens[p++]?.value ?? "";
    while (isPunct(tokens[p], ".")) { table = tokens[p + 1]?.value ?? table; p += 2; }

    const columns: string[] = [];
    if (isPunct(tokens[p], "(")) {
      p++;
      while (tokens[p] && !isPunct(tokens[p], ")")) {
        if (!isPunct(tokens[p], ",")) columns.push(tokens[p].value);
        p++;
      }
      p++;
    }

    if (!isWord(tokens[p], "VALUES") && !isWord(tokens[p], "VALUE")) continue; // INSERT ... SELECT : ignoré
    p++;

    const rows: string[][] = [];
    while (isPunct(tokens[p], "(")) {
      p++;
      const row: string[] = [];
      while (tokens[p] && !isPunct(tokens[p], ")")) {
        const t = tokens[p];
        if (!isPunct(t, ",")) row.push(t.kind === "word" && t.value.toUpperCase() === "NULL" ? "" : t.value);
        p++;
      }
      p++;
      rows.push(row);
      if (isPunct(tokens[p], ",")) p++;
    }
    inserts.push({ table, columns, rows });
  }

  if (inserts.length === 0) throw new Error("Aucune instruction INSERT … VALUES trouvée dans le fichier SQL.");

  const productLike = inserts.filter((s) => /produ|item|catalog|article/i.test(s.table));
  const tables = new Set((productLike.length ? productLike : inserts).map((s) => s.table));
  if (tables.size > 1) throw new Error(`Le fichier SQL insère dans plusieurs tables (${[...tables].join(", ")}) : n'y laissez que celle des produits.`);

  const chosen = productLike.length ? productLike : inserts;
  const columns = chosen[0].columns;
  if (columns.length === 0) throw new Error("Les INSERT doivent nommer leurs colonnes : INSERT INTO produits (name, price, …) VALUES (…).");
  if (chosen.some((s) => s.columns.join("|") !== columns.join("|"))) throw new Error("Les INSERT du fichier n'ont pas tous les mêmes colonnes.");

  return { headers: columns, rows: chosen.flatMap((s) => s.rows), firstRow: 1 };
}

/* ------------------------------------------------------------------ conversion en lignes normalisées */

type Field =
  | "name" | "variation" | "price" | "price_minor" | "compare" | "compare_minor" | "on_sale" | "vat" | "vat_bp" | "unit"
  | "variable" | "track" | "sku" | "barcode" | "description" | "category" | "image" | "online" | "external";

const ALIASES: Record<string, Field> = {
  itemname: "name", name: "name", nom: "name", produit: "name", designation: "name", libelle: "name",
  variations: "variation",
  price: "price", prix: "price", prixttc: "price", prixeur: "price", priceminor: "price_minor",
  regularprice: "compare", ancienprix: "compare", compareatprice: "compare", compareatpriceminor: "compare_minor",
  onsaleinonlinestore: "on_sale",
  taxrate: "vat", tva: "vat", tauxtva: "vat", vatratebp: "vat_bp",
  unit: "unit", unite: "unit", saleunit: "unit",
  variableprice: "variable", isweightvariable: "variable", poidsvariable: "variable",
  trackinventory: "track", trackstock: "track",
  sku: "sku", reference: "sku", ref: "sku",
  barcode: "barcode", codebarres: "barcode", ean: "barcode",
  description: "description",
  category: "category", categorie: "category", rayon: "category",
  displayiteminonlinestore: "online", isactive: "online", actif: "online",
  itemid: "external", externalid: "external",
};

function fieldOf(header: string): Field | null {
  const key = header
    .replace(/\([^)]*\)/g, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

  if (/^image\d*(url)?$/.test(key)) return "image";
  return ALIASES[key] ?? null;
}

/** Colonnes obligatoires pour qu'un fichier soit reconnu comme un catalogue. */
export function missingColumns(table: Table): string[] {
  return table.headers.some((h) => fieldOf(h) === "name") ? [] : ["Item name"];
}

const TRUE = new Set(["yes", "oui", "true", "1", "y", "o", "vrai"]);
const FALSE = new Set(["no", "non", "false", "0", "n", "faux"]);

function bool(value: string | undefined): boolean | undefined {
  const v = (value ?? "").trim().toLowerCase();
  return TRUE.has(v) ? true : FALSE.has(v) ? false : undefined;
}

/** « 2.90 », « 2,90 », « 2,90 € », « 1 234,50 » -> nombre ; `null` si illisible, `undefined` si vide. */
export function parseDecimal(value: string | undefined): number | null | undefined {
  const text = (value ?? "").replace(/[\s €]/g, "").replace(",", ".");
  if (text === "") return undefined;
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

function unitOf(value: string): "piece" | "kg" | "l" {
  const v = value.toLowerCase();
  if (/kilo|\bkg\b|gram/.test(v)) return "kg";
  if (/litre|liter|\bl\b|millil/.test(v)) return "l";
  return "piece";
}

export function toRows(table: Table, options: ImportOptions = DEFAULT_OPTIONS): ParsedRows {
  const columns = new Map<Field, number[]>();
  table.headers.forEach((header, index) => {
    const field = fieldOf(header);
    if (field) columns.set(field, [...(columns.get(field) ?? []), index]);
  });

  const rows: ImportRow[] = [];
  const ignored: Ignored[] = [];
  let lastName = "";

  table.rows.forEach((cells, offset) => {
    const number = table.firstRow + offset;
    const get = (field: Field) => columns.get(field)?.map((i) => (cells[i] ?? "").trim()).find((v) => v !== "");
    const name = get("name") ?? "";

    if (cells.every((c) => (c ?? "").trim() === "")) return;

    if (name === "") {
      const variation = get("variation");
      if (variation) ignored.push({ row: number, label: lastName ? `${lastName} — ${variation}` : variation, reason: "Variation : les variations ne sont pas importées (seul le produit principal l'est)." });
      else ignored.push({ row: number, label: "(sans nom)", reason: "Nom du produit manquant." });
      return;
    }
    lastName = name;

    const row: ImportRow = { row: number, name };
    const fail = (reason: string) => ignored.push({ row: number, label: name, reason });

    const price = parseDecimal(get("price"));
    const priceMinor = parseDecimal(get("price_minor"));
    if (price === null || priceMinor === null) return fail(`Prix illisible « ${get("price") ?? get("price_minor")} ».`);
    if (price !== undefined) row.price_minor = Math.round(price * 100);
    else if (priceMinor !== undefined) row.price_minor = Math.round(priceMinor);

    const compare = parseDecimal(get("compare"));
    const compareMinor = parseDecimal(get("compare_minor"));
    if (compare === null || compareMinor === null) return fail("Prix avant promotion illisible.");
    const compareValue = compare !== undefined ? Math.round(compare * 100) : compareMinor;
    const onSale = bool(get("on_sale"));
    if (compareValue !== undefined && compareValue > 0 && onSale !== false && compareValue > (row.price_minor ?? 0)) row.compare_at_price_minor = compareValue;

    const vat = parseDecimal(get("vat"));
    const vatBp = parseDecimal(get("vat_bp"));
    if (vat === null || vatBp === null) return fail("Taux de TVA illisible.");
    if (vat !== undefined) row.vat_rate_bp = Math.round(vat * 100);
    else if (vatBp !== undefined) row.vat_rate_bp = Math.round(vatBp);

    const unit = get("unit");
    if (unit) row.sale_unit = unitOf(unit);

    // « Prix variable » = vendu au poids : unité kilo, prix à renseigner ensuite.
    const variable = bool(get("variable"));
    if (variable !== undefined) row.is_weight_variable = variable;
    if (variable && (row.sale_unit ?? "piece") === "piece") row.sale_unit = "kg";

    const sku = get("sku");
    if (sku) row.sku = sku;
    const external = get("external");
    if (external) row.external_id = external;
    const barcode = get("barcode");
    if (barcode) row.barcode = barcode;
    const description = get("description");
    if (description) row.description = description;

    // Un produit n'a qu'un rayon : en cas de « Rayon A||Rayon B », le premier est retenu.
    const category = get("category")?.split("||")[0].trim();
    if (category) row.category = category;

    if (options.keepTrackStock) {
      const track = bool(get("track"));
      if (track !== undefined) row.track_stock = track;
    }

    const online = bool(get("online"));
    if (options.hideOffline && online === false) row.is_active = false;

    const images = [...new Set((columns.get("image") ?? []).map((i) => (cells[i] ?? "").trim()).filter((u) => /^https?:\/\//i.test(u)))];
    if (images.length) row.images = images.slice(0, 10);

    rows.push(row);
  });

  return { rows, ignored };
}
