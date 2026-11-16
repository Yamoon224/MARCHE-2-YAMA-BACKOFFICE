"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import { extractApiError, formatMoney } from "@/lib/format";
import {
  canComplete, describeAdjustment, formatQuantity, LINE_STATUS_LABEL, pendingCount, unitSuffix, validateQuantity,
  type PickLine,
} from "@/lib/picking/picking";

type Props = { listId: number; status: "open" | "in_progress" | "completed"; lines: PickLine[] };
type Candidate = { id: number; name: string; price_minor: number; sale_unit: string };

const field = "rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export function PickingScreen({ listId, status, lines }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const editable = status === "in_progress";

  /** Exécute un appel et rafraîchit la page ; retourne `true` si le serveur a accepté. */
  async function run(call: () => Promise<{ error?: unknown }>): Promise<boolean> {
    setBusy(true);
    setError(null);

    try {
      const { error: failure } = await call();
      if (failure) {
        setError(extractApiError(failure));
        return false;
      }

      router.refresh();
      return true;
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const api = () => browserApi();

  const start = () =>
    run(() => api().POST("/api/v1/fulfillment/pick-lists/{pickList}/start", { params: { path: { pickList: listId } } }));

  const pick = (lineId: number, quantity: number) =>
    run(() => api().POST("/api/v1/fulfillment/pick-lists/{pickList}/lines/{line}/pick", { params: { path: { pickList: listId, line: lineId } }, body: { quantity } }));

  const substitute = (lineId: number, productId: number, quantity: number) =>
    run(() => api().POST("/api/v1/fulfillment/pick-lists/{pickList}/lines/{line}/substitute", { params: { path: { pickList: listId, line: lineId } }, body: { product_id: productId, quantity } }));

  async function complete() {
    setBusy(true);
    setError(null);

    try {
      const { data, error: failure } = await api().POST("/api/v1/fulfillment/pick-lists/{pickList}/complete", { params: { path: { pickList: listId } } });

      if (failure || !data) return setError(extractApiError(failure));

      setResult(describeAdjustment(data.adjustment_minor, formatMoney));
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {status === "open" && (
        <button type="button" disabled={busy} onClick={start} className="mb-4 rounded-full bg-brand-green px-5 py-2 font-medium text-white disabled:opacity-60">
          Prendre en charge cette préparation
        </button>
      )}

      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <PickLineCard key={line.id} line={line} editable={editable} busy={busy} onPick={pick} onSubstitute={substitute} />
        ))}
      </ul>

      {error && <p role="alert" className="mt-4 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
      {result && <p role="status" className="mt-4 rounded-lg bg-brand-green/10 p-3 text-sm font-medium text-brand-green">Préparation terminée. {result}</p>}

      {editable && (
        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={complete} disabled={busy || !canComplete(lines)} className="rounded-full bg-brand-red px-5 py-2.5 font-medium text-white disabled:opacity-50">
            Terminer la préparation
          </button>
          {!canComplete(lines) && <span className="text-sm text-black/60">{pendingCount(lines)} article(s) restent à traiter.</span>}
        </div>
      )}
    </div>
  );
}

type CardProps = {
  line: PickLine;
  editable: boolean;
  busy: boolean;
  onPick: (lineId: number, quantity: number) => Promise<boolean>;
  onSubstitute: (lineId: number, productId: number, quantity: number) => Promise<boolean>;
};

function PickLineCard({ line, editable, busy, onPick, onSubstitute }: CardProps) {
  const [input, setInput] = useState(line.picked_quantity != null ? String(line.picked_quantity) : "");
  const [localError, setLocalError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const problem = validateQuantity(line, input);
    setLocalError(problem);
    if (!problem) await onPick(line.id, Number(input));
  }

  return (
    <li className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          {line.name} <span className="font-normal text-black/60">— commandé : {formatQuantity(line.sale_unit, line.ordered_quantity)}</span>
        </p>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium">{LINE_STATUS_LABEL[line.status]}</span>
      </div>

      {line.substitution === "refuse" && <p className="mt-1 text-xs font-medium text-brand-red">Le client refuse tout remplacement.</p>}
      {line.status === "substituted" && (
        <p className="mt-1 text-sm">Remplacé par <strong>{line.final_name}</strong> — {formatQuantity(line.sale_unit, line.picked_quantity ?? 0)}</p>
      )}

      {editable && (
        <form onSubmit={save} className="mt-3 flex flex-wrap items-end gap-2" noValidate>
          <label className="text-sm font-medium">
            Quantité servie ({unitSuffix(line.sale_unit)}, max {line.max_quantity})
            <input value={input} onChange={(e) => setInput(e.target.value)} inputMode="numeric" placeholder="Quantité" aria-label={`Quantité servie pour ${line.name}`} className={`${field} mt-1 block w-40`} />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Enregistrer</button>
          <button type="button" disabled={busy} onClick={() => onPick(line.id, 0)} className="rounded-full border border-black/20 px-4 py-2 text-sm disabled:opacity-60">Rupture</button>
          {line.substitution !== "refuse" && (
            <button type="button" disabled={busy} onClick={() => setReplacing((v) => !v)} className="rounded-full border border-brand-green px-4 py-2 text-sm text-brand-green disabled:opacity-60">
              Remplacer…
            </button>
          )}
        </form>
      )}

      {localError && <p role="alert" className="mt-2 text-sm text-brand-red">{localError}</p>}

      {editable && replacing && <SubstitutePicker line={line} busy={busy} onChoose={async (productId, quantity) => {
        if (await onSubstitute(line.id, productId, quantity)) setReplacing(false);
      }} />}
    </li>
  );
}

function SubstitutePicker({ line, busy, onChoose }: { line: PickLine; busy: boolean; onChoose: (productId: number, quantity: number) => Promise<void> }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[] | null>(null);
  const [quantity, setQuantity] = useState(String(line.ordered_quantity));
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setError(null);

    try {
      const { data } = await browserApi().GET("/api/v1/products", { params: { query: { q: query.trim() } } });
      // Même unité de vente que l'article d'origine : c'est la règle du serveur.
      setResults(((data?.data ?? []) as Candidate[]).filter((p) => p.sale_unit === line.sale_unit));
    } catch {
      setError("Recherche indisponible.");
    }
  }

  function choose(productId: number) {
    const problem = validateQuantity(line, quantity);
    if (problem || Number(quantity) < 1) return setError(problem ?? "La quantité du remplaçant doit être au moins 1.");

    void onChoose(productId, Number(quantity));
  }

  return (
    <div className="mt-3 rounded-lg border border-black/10 bg-black/[0.02] p-3">
      <form onSubmit={search} className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium">Rechercher un remplaçant<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom du produit…" className={`${field} mt-1 block w-56`} /></label>
        <label className="text-sm font-medium">Quantité ({unitSuffix(line.sale_unit)})<input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" placeholder="Ex. 500" className={`${field} mt-1 block w-28`} /></label>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white">Chercher</button>
      </form>

      {error && <p role="alert" className="mt-2 text-sm text-brand-red">{error}</p>}
      {results && results.length === 0 && <p className="mt-2 text-sm text-black/60">Aucun produit vendu dans la même unité.</p>}
      {results && results.length > 0 && (
        <ul className="mt-2 divide-y divide-black/10 text-sm">
          {results.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span>{p.name} <span className="text-black/50">({formatMoney(p.price_minor)})</span></span>
              <button type="button" disabled={busy} onClick={() => choose(p.id)} className="rounded-full border border-brand-green px-3 py-1 text-brand-green disabled:opacity-60">Choisir</button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs text-black/60">Le client ne paiera jamais plus cher que le prix de l&apos;article commandé.</p>
    </div>
  );
}
