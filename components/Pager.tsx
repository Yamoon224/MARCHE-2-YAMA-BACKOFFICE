"use client";

import { Btn } from "@/components/Btn";
import { pageWindow, rangeLabel, type PageWindow } from "@/lib/table/table";

export type PagerSize = number | "all";

const button = "rounded-full border border-black/20 bg-white px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-40";

/** Fenêtre de la page courante, pour découper n'importe quelle liste avec le même calcul que DataTable. */
export function usePageWindow(total: number, size: PagerSize, page: number): PageWindow {
  return pageWindow(total, size, page);
}

type Props = {
  total: number;
  size: PagerSize;
  sizes: readonly PagerSize[];
  window: PageWindow;
  onSize: (size: PagerSize) => void;
  onPage: (page: number) => void;
};

/** Barre de pagination (taille de page, précédent/suivant, plage affichée) pour les listes qui ne sont pas des tableaux. */
export function Pager({ total, size, sizes, window, onSize, onPage }: Props) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <label className="flex items-center gap-2 text-black/70">
        Afficher
        <select
          value={String(size)}
          onChange={(event) => { onSize(event.target.value === "all" ? "all" : Number(event.target.value)); onPage(1); }}
          className="rounded-lg border border-black/20 bg-white px-2 py-1 text-sm"
        >
          {sizes.map((option) => <option key={option} value={String(option)}>{option === "all" ? "Tous" : option}</option>)}
        </select>
        par page
      </label>

      <nav aria-label="Pagination" className="flex items-center gap-2">
        <Btn type="button" className={button} disabled={window.page <= 1} onClick={() => onPage(window.page - 1)}>Précédent</Btn>
        <span className="text-black/70">Page {window.page} / {window.pages}</span>
        <Btn type="button" className={button} disabled={window.page >= window.pages} onClick={() => onPage(window.page + 1)}>Suivant</Btn>
      </nav>

      <p className="text-black/70" aria-live="polite">{rangeLabel(window, total)}</p>
    </div>
  );
}
