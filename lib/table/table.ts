/** Logique pure des tableaux de données : cellules, tri, recherche, pagination. Aucun accès au DOM. */

export type CellValue = string | number | null | undefined;
export type ColumnType = "text" | "number" | "date";
export type SortDirection = "asc" | "desc";
export type SortState = { column: number; direction: SortDirection } | null;

export const PAGE_SIZES = [10, 20, 30, 50, 100, "all"] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;

export function pageSizeLabel(size: PageSize): string {
  return size === "all" ? "Tous" : String(size);
}

/** Texte lisible d'une valeur : ce qui est exporté et recherché. */
export function cellText(value: CellValue): string {
  return value === null || value === undefined ? "" : String(value).replace(/\s+/g, " ").trim();
}

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

function isEmpty(value: CellValue): boolean {
  return cellText(value) === "";
}

/** Compare deux valeurs d'une colonne selon son type ; les cellules vides ne passent pas ici. */
export function compareValues(a: CellValue, b: CellValue, type: ColumnType): number {
  if (type === "number") return Number(a) - Number(b);
  if (type === "date") return cellText(a) < cellText(b) ? -1 : cellText(a) > cellText(b) ? 1 : 0;

  return collator.compare(cellText(a), cellText(b));
}

/** Indices triés d'une colonne. Les cellules vides sont toujours en dernier, croissant ou décroissant. */
export function sortedIndexes(values: readonly CellValue[], type: ColumnType, direction: SortDirection | null): number[] {
  const indexes = values.map((_, index) => index);
  if (direction === null) return indexes;

  const sign = direction === "asc" ? 1 : -1;

  return indexes.sort((x, y) => {
    const emptyX = isEmpty(values[x]);
    const emptyY = isEmpty(values[y]);

    if (emptyX || emptyY) return emptyX === emptyY ? x - y : emptyX ? 1 : -1;

    return sign * compareValues(values[x], values[y], type) || x - y;
  });
}

/** Clic sur un en-tête : croissant, puis décroissant, puis retour à l'ordre d'origine. */
export function nextSort(current: SortState, column: number): SortState {
  if (current?.column !== column) return { column, direction: "asc" };

  return current.direction === "asc" ? { column, direction: "desc" } : null;
}

/** Minuscules sans accents, pour une recherche tolérante. */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Indices des lignes dont le texte contient tous les mots de la recherche. */
export function matchingIndexes(rowsText: readonly string[], query: string): number[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const all = rowsText.map((_, index) => index);
  if (words.length === 0) return all;

  return all.filter((index) => {
    const haystack = normalize(rowsText[index]);
    return words.every((word) => haystack.includes(word));
  });
}

export type PageWindow = { start: number; end: number; page: number; pages: number };

/** Fenêtre [start, end) d'une page ; la page demandée est ramenée dans les bornes. */
export function pageWindow(total: number, size: number | "all", page: number): PageWindow {
  if (size === "all" || total === 0) return { start: 0, end: total, page: 1, pages: 1 };

  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  const start = (current - 1) * size;

  return { start, end: Math.min(total, start + size), page: current, pages };
}

/** « 21–40 / 135 » ; « 0 / 0 » pour un tableau vide. */
export function rangeLabel(window: PageWindow, total: number): string {
  return total === 0 ? "0 / 0" : `${window.start + 1}–${window.end} / ${total}`;
}
