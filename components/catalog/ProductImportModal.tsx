"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Btn } from "@/components/Btn";
import { Modal } from "@/components/Modal";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import {
  DEFAULT_OPTIONS, IMPORT_EXTENSIONS, MAX_IMPORT_ROWS, missingColumns, readTable, templateCsv, toRows, type ImportOptions, type ParsedRows, type Table,
} from "@/lib/catalog/import";
import { extractApiError } from "@/lib/format";
import { primary } from "./shared";

type Report = components["schemas"]["ProductImportReport"];

const secondary = "rounded-full border border-black/20 px-4 py-2 text-sm font-medium disabled:opacity-60";

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([templateCsv()], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "modele-import-produits.csv" });
  link.click();
  URL.revokeObjectURL(url);
}

/** Import en masse des produits (CSV, XLSX ou SQL) selon le modèle du fichier « Catalogue_Marche_de_YAMA.xlsx ». */
export function ProductImportModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Report | null>(null);
  const [result, setResult] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);

  const request = useRef(0);
  const parsed = useMemo(() => (table ? toRows(table, options) : null), [table, options]);

  // Simulation : rien n'est enregistré, mais on voit ce que l'import ferait. Une réponse périmée est écartée.
  function simulate(next: ParsedRows | null) {
    const id = ++request.current;
    setPreview(null);
    if (!next || next.rows.length === 0 || next.rows.length > MAX_IMPORT_ROWS) return setBusy(false);

    setBusy(true);
    browserApi()
      .POST("/api/v1/catalog/products/import", { body: { rows: next.rows, dry_run: true } })
      .then(({ data, error: apiError }) => {
        if (id !== request.current) return;
        if (apiError || !data) setError(extractApiError(apiError));
        else setPreview(data.data ?? null);
      })
      .catch(() => id === request.current && setError("Service momentanément indisponible. Réessayez."))
      .finally(() => id === request.current && setBusy(false));
  }

  function changeOptions(next: ImportOptions) {
    setOptions(next);
    setError(null);
    simulate(table ? toRows(table, next) : null);
  }

  async function choose(file: File | undefined) {
    request.current++;
    setResult(null);
    setPreview(null);
    setTable(null);
    setError(null);
    setFileName(file?.name ?? null);
    if (!file) return;

    if (!IMPORT_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      return setError("Format non accepté : utilisez un fichier .csv, .xlsx ou .sql.");
    }

    try {
      const next = await readTable(file);
      const missing = missingColumns(next);
      if (missing.length) return setError(`Colonne obligatoire introuvable : « ${missing.join("», «")} ». Reprenez le modèle ci-dessus.`);
      setTable(next);
      simulate(toRows(next, options));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fichier illisible.");
    }
  }

  async function run() {
    if (!parsed) return;
    setBusy(true);
    setError(null);

    try {
      const { data, error: apiError } = await browserApi().POST("/api/v1/catalog/products/import", { body: { rows: parsed.rows, dry_run: false } });
      if (apiError || !data) return setError(extractApiError(apiError));
      setResult(data.data ?? null);
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const tooMany = (parsed?.rows.length ?? 0) > MAX_IMPORT_ROWS;
  const shown = result ?? ((parsed?.rows.length ?? 0) > 0 && !tooMany ? preview : null);
  const importable = (preview?.created ?? 0) + (preview?.updated ?? 0);

  return (
    <Modal
      open
      onClose={onClose}
      title="Importer des produits"
      size="xl"
      footer={
        <>
          <Btn type="button" onClick={onClose} className={secondary}>{result ? "Fermer" : "Annuler"}</Btn>
          {!result && (
            <Btn type="button" disabled={busy || importable === 0 || tooMany} onClick={() => void run()} className={primary}>
              {busy ? "Traitement…" : importable > 0 ? `Importer ${importable} produit${importable > 1 ? "s" : ""}` : "Importer"}
            </Btn>
          )}
        </>
      }
    >
      <div className="space-y-4 text-sm">
        <section aria-labelledby="import-model" className="space-y-2 rounded-xl border border-brand-green/30 bg-brand-green/5 p-4">
          <h3 id="import-model" className="font-semibold">Respectez le modèle du fichier « Catalogue_Marche_de_YAMA.xlsx »</h3>
          <p>
            Formats acceptés : <b>.xlsx</b>, <b>.csv</b> (séparateur « ; » ou « , ») et <b>.sql</b> (instructions <code>INSERT INTO … (colonnes) VALUES (…)</code>, lues sans être exécutées).
            La première ligne contient les noms de colonnes, comme dans le modèle ; les colonnes inconnues sont ignorées et leur ordre importe peu.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="font-medium">Colonnes prises en compte</p>
              <ul className="list-disc space-y-0.5 pl-5 text-black/80">
                <li><b>Item name</b> (obligatoire) : nom du produit</li>
                <li><b>Price</b> : prix TTC en euros (« 2.90 » ou « 2,90 »)</li>
                <li><b>Category</b> : rayon (créé s’il n’existe pas ; avec « A||B », le premier est retenu)</li>
                <li><b>SKU</b>, <b>Barcode</b>, <b>Description (…)</b></li>
                <li><b>Image 1 … Image 7</b> : adresses (URL) des images, la première sert de couverture</li>
                <li><b>Tax rate (%)</b> : TVA</li>
                <li><b>Unit</b> : « each.each » = à la pièce ; kilogramme / litre reconnus</li>
                <li><b>Variable price? (Yes/No)</b> : « Yes » = vendu au poids (au kilo)</li>
                <li><b>Regular price (before sale)</b> + <b>On sale in Online Store?</b> : ancien prix barré</li>
                <li><b>Item id (Do not change)</b> : sert de référence si SKU est vide</li>
              </ul>
            </div>
            <div className="space-y-2">
              <div>
                <p className="font-medium">Règles</p>
                <ul className="list-disc space-y-0.5 pl-5 text-black/80">
                  <li>La référence (SKU, sinon Item id) identifie le produit : réimporter <b>met à jour</b> au lieu de dupliquer.</li>
                  <li>Les champs laissés vides ne modifient pas un produit existant.</li>
                  <li>Sans prix, le produit est créé <b>masqué</b> à 0,00 € : renseignez son prix avant de le publier.</li>
                  <li>Les lignes de <b>variations</b> (colonne « Variations ») et les quantités en stock ne sont pas importées : le stock se reçoit depuis la page Stock.</li>
                  <li>{MAX_IMPORT_ROWS.toLocaleString("fr-FR")} produits au plus par fichier.</li>
                </ul>
              </div>
              <Btn type="button" onClick={downloadTemplate} className="text-brand-green underline">Télécharger un modèle vierge (.csv)</Btn>
            </div>
          </div>
        </section>

        <label className="block font-medium">
          Fichier à importer
          <input
            type="file"
            accept=".xlsx,.csv,.sql"
            disabled={busy || result !== null}
            onChange={(e) => void choose(e.target.files?.[0])}
            className="mt-1 block w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm"
          />
        </label>

        {table && !result && (
          <fieldset className="space-y-1.5 rounded-lg border border-black/10 p-3">
            <legend className="px-1 text-xs font-medium text-black/60">Options</legend>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={options.hideOffline} onChange={(e) => changeOptions({ ...options, hideOffline: e.target.checked })} className="mt-0.5" />
              <span>Masquer les produits marqués « No » dans <i>Display item in Online Store?</i> (par défaut, tous sont mis en ligne)</span>
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={options.keepTrackStock} onChange={(e) => changeOptions({ ...options, keepTrackStock: e.target.checked })} className="mt-0.5" />
              <span>Reprendre <i>Track inventory?</i> : les produits suivis ne se commandent plus tant qu’aucun lot n’est reçu en stock</span>
            </label>
          </fieldset>
        )}

        {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-brand-red">{error}</p>}
        {tooMany && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-brand-red">{parsed?.rows.length} produits dans « {fileName} » : découpez le fichier ({MAX_IMPORT_ROWS} au plus).</p>}
        {table && parsed && parsed.rows.length === 0 && !error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-brand-red">Aucun produit exploitable dans « {fileName} ».</p>}

        {shown && (
          <section aria-live="polite" className="space-y-3">
            <p role="status" className={`rounded-lg p-3 font-medium ${result ? "bg-brand-green/10 text-brand-green" : "bg-black/5"}`}>
              {result ? "Import terminé : " : `Simulation sur « ${fileName} » (rien n’est encore enregistré) : `}
              {shown.created} produit{shown.created > 1 ? "s" : ""} {result ? "créé" : "à créer"}{shown.created > 1 ? "s" : ""}, {shown.updated} {result ? "mis" : "à mettre"} à jour
              {shown.failed > 0 && <>, <span className="text-brand-red">{shown.failed} refusé{shown.failed > 1 ? "s" : ""}</span></>}
              {(parsed?.ignored.length ?? 0) > 0 && <>, {parsed?.ignored.length} ligne{(parsed?.ignored.length ?? 0) > 1 ? "s" : ""} ignorée{(parsed?.ignored.length ?? 0) > 1 ? "s" : ""}</>}.
            </p>

            {shown.categories_created.length > 0 && (
              <p><b>{shown.categories_created.length} rayon{shown.categories_created.length > 1 ? "s" : ""} {result ? "créé" : "à créer"}{shown.categories_created.length > 1 ? "s" : ""} :</b> {shown.categories_created.join(", ")}.</p>
            )}

            <Details title="Lignes refusées" tone="error" count={shown.errors.length} open>
              {shown.errors.map((e) => <li key={e.row}>Ligne {e.row} — <b>{e.name || "(sans nom)"}</b> : {e.messages.join(" ")}</li>)}
            </Details>
            <Details title="Avertissements" count={shown.warnings.length}>
              {shown.warnings.map((w) => <li key={`${w.row}-${w.message}`}>Ligne {w.row} — <b>{w.name}</b> : {w.message}</li>)}
            </Details>
            <Details title="Lignes ignorées" count={parsed?.ignored.length ?? 0}>
              {parsed?.ignored.map((i) => <li key={i.row}>Ligne {i.row} — <b>{i.label}</b> : {i.reason}</li>)}
            </Details>
          </section>
        )}
      </div>
    </Modal>
  );
}

function Details({ title, count, tone, open, children }: { title: string; count: number; tone?: "error"; open?: boolean; children: React.ReactNode }) {
  if (count === 0) return null;

  return (
    <details open={open} className="rounded-lg border border-black/10">
      <summary className={`cursor-pointer px-3 py-2 font-medium ${tone === "error" ? "text-brand-red" : ""}`}>{title} ({count})</summary>
      <ul className="max-h-48 list-disc space-y-1 overflow-y-auto px-8 pb-3 text-black/80">{children}</ul>
    </details>
  );
}
