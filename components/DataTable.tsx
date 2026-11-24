"use client";

import { Btn } from "@/components/Btn";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { exportTable } from "@/lib/table/download";
import type { ExportFormat } from "@/lib/table/export";
import {
  cellText,
  DEFAULT_PAGE_SIZE,
  matchingIndexes,
  nextSort,
  PAGE_SIZES,
  pageSizeLabel,
  pageWindow,
  rangeLabel,
  sortedIndexes,
  type CellValue,
  type ColumnType,
  type PageSize,
  type SortState,
} from "@/lib/table/table";

/** Une cellule : une valeur simple, ou une valeur (tri) avec son affichage (`node`) et le texte recherché/exporté (`text`, la valeur par défaut). */
export type Cell = CellValue | { value: CellValue; node: ReactNode; text?: string };

export type Column = {
  header: string;
  /** Façon de trier : « number » (montants, quantités), « date » (ISO) ou « text » (défaut). */
  type?: ColumnType;
  align?: "left" | "right";
  /** Colonne de boutons : ni triable ni exportée (sa cellule porte un `node`). */
  actions?: boolean;
};

export type Row = {
  key: string | number;
  cells: Cell[];
  className?: string;
  /** Ligne de détail sous la ligne (formulaire déplié…) : n'est ni triée ni exportée. */
  detail?: ReactNode;
};

const EXPORTS: { format: ExportFormat; label: string }[] = [
  { format: "pdf", label: "PDF" },
  { format: "xlsx", label: "Excel" },
  { format: "csv", label: "CSV" },
  { format: "txt", label: "TXT" },
];

function valueOf(cell: Cell): CellValue {
  return cell !== null && typeof cell === "object" ? cell.value : cell;
}

/** Texte recherché et exporté : celui que l'utilisateur lit (« 12,90 € »), pas la valeur de tri (1290). */
function textOf(cell: Cell): string {
  return cell !== null && typeof cell === "object" && cell.text !== undefined ? cell.text : cellText(valueOf(cell));
}

function nodeOf(cell: Cell): ReactNode {
  if (cell !== null && typeof cell === "object") return cell.node;
  return cell === null || cell === undefined || cell === "" ? "-" : cell;
}

const button = "rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-40";

/**
 * Tableau de données : colonnes triables (croissant, décroissant, aucun), recherche, pagination (10, 20, 30, 50, 100 ou tous)
 * et exports PDF / Excel / CSV / TXT de toutes les lignes filtrées, dans l'ordre affiché.
 * Ses props sont sérialisables : une page serveur peut le remplir directement.
 */
export function DataTable({
  name,
  title,
  columns,
  rows,
  footer,
  loading = false,
  emptyMessage = "Aucune donnée.",
  searchable = true,
  paginate = true,
}: {
  /** Nom des fichiers exportés (« commandes »). */
  name: string;
  /** Titre du PDF ; le nom par défaut. */
  title?: string;
  columns: readonly Column[];
  rows: readonly Row[];
  /** Lignes de totaux toujours visibles sous les données (ni triées, ni paginées, ni exportées). */
  footer?: ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  searchable?: boolean;
  /** Faux : la liste est déjà paginée par le serveur, toutes les lignes reçues sont affichées et la barre de pagination est masquée. */
  paginate?: boolean;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [query, setQuery] = useState("");
  const [size, setSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const dataColumns = useMemo(() => columns.map((column, index) => ({ column, index })).filter(({ column }) => !column.actions), [columns]);

  /** Lignes filtrées puis triées : c'est aussi ce qu'on exporte. */
  const ordered = useMemo(() => {
    const texts = rows.map((row) => dataColumns.map(({ index }) => textOf(row.cells[index])).join(" "));
    const kept = matchingIndexes(texts, query);

    if (!sort) return kept.map((i) => rows[i]);

    const values = kept.map((i) => valueOf(rows[i].cells[sort.column]));
    return sortedIndexes(values, columns[sort.column]?.type ?? "text", sort.direction).map((i) => rows[kept[i]]);
  }, [rows, query, sort, columns, dataColumns]);

  const window = pageWindow(ordered.length, paginate ? size : "all", page);
  const visible = ordered.slice(window.start, window.end);

  async function runExport(format: ExportFormat) {
    setExporting(format);
    setExportError(null);

    try {
      await exportTable(format, {
        name,
        title,
        headers: dataColumns.map(({ column }) => column.header),
        rows: ordered.map((row) => dataColumns.map(({ index }) => textOf(row.cells[index]))),
      });
    } catch {
      setExportError("L'export a échoué. Réessayez.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {searchable && (
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Rechercher dans le tableau</span>
            <input
              type="search"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Rechercher…"
              className="w-56 rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-green"
            />
          </label>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1.5" role="group" aria-label="Exporter les lignes affichées">
          <span className="text-xs text-black/60">Exporter :</span>
          {EXPORTS.map(({ format, label }) => (
            <Btn key={format} type="button" action="export" className={button} disabled={exporting !== null || ordered.length === 0} onClick={() => void runExport(format)}>
              {exporting === format ? "…" : label}
            </Btn>
          ))}
        </div>
      </div>
      {exportError && <p role="alert" className="mb-2 text-sm text-brand-red">{exportError}</p>}

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
            <tr>
              {columns.map((column, index) => {
                const active = sort?.column === index ? sort.direction : null;
                const align = column.align === "right" ? "text-right" : "";

                return (
                  <th key={index} scope="col" aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : undefined} className={`px-4 py-3 ${align}`}>
                    {column.actions ? <span className="sr-only">{column.header || "Actions"}</span> : (
                      <Btn
                        type="button"
                        onClick={() => { setSort(nextSort(sort, index)); setPage(1); }}
                        className={`inline-flex items-center gap-1 font-semibold uppercase ${active ? "text-black" : ""}`}
                      >
                        {column.header}
                        <span aria-hidden className={active ? "text-brand-green" : "text-black/30"}>{active === "asc" ? "▲" : active === "desc" ? "▼" : "↕"}</span>
                      </Btn>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {loading ? (
              <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-black/60" role="status">Chargement…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-6 text-center text-black/60">{query ? "Aucun résultat pour cette recherche." : emptyMessage}</td></tr>
            ) : (
              visible.map((row) => (
                <Fragment key={row.key}>
                  <tr className={`hover:bg-black/[0.02] ${row.className ?? ""}`}>
                    {columns.map((column, index) => (
                      <td key={index} className={`px-4 py-3 ${column.align === "right" ? "text-right" : ""}`}>{nodeOf(row.cells[index])}</td>
                    ))}
                  </tr>
                  {row.detail && (
                    <tr><td colSpan={columns.length} className="bg-black/[0.02] px-4 py-3">{row.detail}</td></tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
          {footer && <tfoot className="border-t-2 border-black/20 font-bold">{footer}</tfoot>}
        </table>
      </div>

      {paginate && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-black/70">
          Afficher
          <select
            value={String(size)}
            onChange={(event) => { setSize(event.target.value === "all" ? "all" : (Number(event.target.value) as PageSize)); setPage(1); }}
            className="rounded-lg border border-black/20 bg-white px-2 py-1 text-sm"
          >
            {PAGE_SIZES.map((option) => <option key={option} value={String(option)}>{pageSizeLabel(option)}</option>)}
          </select>
          lignes
        </label>

        <nav aria-label="Pagination du tableau" className="flex items-center gap-2">
          <Btn type="button" className={button} disabled={window.page <= 1} onClick={() => setPage(window.page - 1)}>Précédent</Btn>
          <span className="text-black/70">Page {window.page} / {window.pages}</span>
          <Btn type="button" className={button} disabled={window.page >= window.pages} onClick={() => setPage(window.page + 1)}>Suivant</Btn>
        </nav>

        <p className="text-black/70" aria-live="polite">{rangeLabel(window, ordered.length)}{ordered.length !== rows.length && ` (sur ${rows.length})`}</p>
      </div>}
    </div>
  );
}
