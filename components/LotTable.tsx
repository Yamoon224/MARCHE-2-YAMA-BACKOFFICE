"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DataTable } from "@/components/DataTable";
import { browserApi } from "@/lib/api/client";
import { extractApiError } from "@/lib/format";
import { daysUntil, expiryLabel, expiryTone, todayIso, validateRecallReason, type ExpiryTone } from "@/lib/stock/stock";

export type Lot = {
  id: number; product_id: number; lot_code: string; expires_on?: string | null;
  quantity_on_hand: number; quantity_reserved?: number; available: number; is_blocked: boolean; recalled?: boolean;
};
type Affected = { order_id: number; customer_id?: number | null; quantity: number };
type Report = { reason: string; delivered: Affected[]; reserved: Affected[] };

const TONE: Record<ExpiryTone, string> = {
  expired: "bg-brand-red/10 text-brand-red",
  soon: "bg-brand-red/10 text-brand-red",
  ok: "bg-black/5",
  none: "bg-black/5",
};

export function LotTable({ lots, canRecall, today }: { lots: Lot[]; canRecall: boolean; today: string }) {
  const now = today || todayIso();

  return (
    <DataTable
      name="lots"
      title="Stock par lot"
      emptyMessage="Aucun lot ne correspond à ce filtre."
      columns={[
        { header: "Lot" },
        { header: "Produit", type: "number" },
        { header: "Péremption", type: "date" },
        { header: "Disponible", type: "number", align: "right" },
        { header: "État" },
        { header: "Rappel", actions: true },
      ]}
      rows={lots.map((lot) => {
        const days = daysUntil(lot.expires_on, now);
        const tone = expiryTone(days);
        const state = lot.recalled ? "Rappelé" : lot.is_blocked ? "Bloqué" : "Disponible";

        return {
          key: lot.id,
          className: lot.is_blocked ? "bg-brand-red/[0.04]" : "",
          cells: [
            { value: lot.lot_code, node: <span className="font-mono">{lot.lot_code}</span> },
            { value: lot.product_id, text: `#${lot.product_id}`, node: `#${lot.product_id}` },
            { value: lot.expires_on ?? null, text: expiryLabel(days), node: <span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE[tone]}`}>{expiryLabel(days)}</span> },
            {
              value: lot.available, text: `${lot.available} / ${lot.quantity_on_hand}`,
              node: <>{lot.available} <span className="text-black/50">/ {lot.quantity_on_hand}</span></>,
            },
            { value: state, node: lot.recalled || lot.is_blocked ? <span className="font-medium text-brand-red">{state}</span> : state },
            { value: null, node: <RecallCell lot={lot} canRecall={canRecall} /> },
          ],
        };
      })}
    />
  );
}

/** Bouton de rappel d'un lot ; le formulaire et le rapport s'affichent dans la cellule. */
function RecallCell({ lot, canRecall }: { lot: Lot; canRecall: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function recall(event: FormEvent) {
    event.preventDefault();
    const problem = validateRecallReason(reason);
    if (problem) return setError(problem);

    if (!window.confirm(`Rappeler le lot ${lot.lot_code} ? Il sera bloqué immédiatement.`)) return;

    setBusy(true);
    setError(null);

    try {
      const { data, error: failure } = await browserApi().POST("/api/v1/inventory/lots/{lot}/recall", { params: { path: { lot: lot.id } }, body: { reason: reason.trim() } });
      if (failure || !data) return setError(extractApiError(failure));

      setReport(data);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Vérifiez l'état du lot avant de réessayer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-w-48 flex-col items-end gap-2">
      {canRecall && !lot.recalled && !report && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-brand-red px-3 py-1 text-xs text-brand-red">Rappeler</button>
      )}
      {open && (
        <form onSubmit={recall} className="flex flex-col items-end gap-2" noValidate>
          <label className="text-left text-sm font-medium">Motif du rappel
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} placeholder="Ex. rappel fournisseur du 16/11" className="mt-1 block w-72 rounded-lg border border-black/20 bg-white px-3 py-2 text-sm" />
          </label>
          <button type="submit" disabled={busy} className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Rappel…" : "Bloquer et rappeler le lot"}</button>
        </form>
      )}
      {error && <p role="alert" className="text-left text-sm text-brand-red">{error}</p>}
      {report && <div className="text-left"><RecallReport report={report} /></div>}
    </div>
  );
}

function RecallReport({ report }: { report: Report }) {
  return (
    <div role="status" className="text-sm">
      <p className="font-semibold text-brand-red">Lot rappelé : {report.reason}</p>
      <p className="mt-2 font-medium">Clients ayant déjà reçu ce lot (à prévenir) : {report.delivered.length}</p>
      {report.delivered.length > 0 && (
        <ul className="ml-4 list-disc">{report.delivered.map((o) => <li key={o.order_id}>Commande #{o.order_id} - client n° {o.customer_id ?? "sans compte"} - quantité {o.quantity}</li>)}</ul>
      )}
      <p className="mt-2 font-medium">Commandes en attente qui le réservent (à réallouer) : {report.reserved.length}</p>
      {report.reserved.length > 0 && (
        <ul className="ml-4 list-disc">{report.reserved.map((o) => <li key={o.order_id}>Commande #{o.order_id} - quantité {o.quantity}</li>)}</ul>
      )}
    </div>
  );
}
