"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
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
  if (lots.length === 0) return <p className="text-black/70">Aucun lot ne correspond à ce filtre.</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
          <tr>
            <th scope="col" className="px-4 py-3">Lot</th><th scope="col" className="px-4 py-3">Produit</th>
            <th scope="col" className="px-4 py-3">Péremption</th><th scope="col" className="px-4 py-3 text-right">Disponible</th>
            <th scope="col" className="px-4 py-3">État</th><th scope="col" className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          {lots.map((lot) => <LotRow key={lot.id} lot={lot} canRecall={canRecall} today={today} />)}
        </tbody>
      </table>
    </div>
  );
}

function LotRow({ lot, canRecall, today }: { lot: Lot; canRecall: boolean; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const days = daysUntil(lot.expires_on, today || todayIso());
  const tone = expiryTone(days);

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
    <>
      <tr className={lot.is_blocked ? "bg-brand-red/[0.04]" : ""}>
        <td className="px-4 py-3 font-mono">{lot.lot_code}</td>
        <td className="px-4 py-3">#{lot.product_id}</td>
        <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${TONE[tone]}`}>{expiryLabel(days)}</span></td>
        <td className="px-4 py-3 text-right">{lot.available} <span className="text-black/50">/ {lot.quantity_on_hand}</span></td>
        <td className="px-4 py-3">
          {lot.recalled ? <span className="font-medium text-brand-red">Rappelé</span> : lot.is_blocked ? <span className="font-medium text-brand-red">Bloqué</span> : "Disponible"}
        </td>
        <td className="px-4 py-3 text-right">
          {canRecall && !lot.recalled && !report && (
            <button type="button" onClick={() => setOpen((v) => !v)} className="rounded-full border border-brand-red px-3 py-1 text-xs text-brand-red">Rappeler</button>
          )}
        </td>
      </tr>

      {(open || report || error) && (
        <tr>
          <td colSpan={6} className="bg-black/[0.02] px-4 py-3">
            {open && (
              <form onSubmit={recall} className="flex flex-wrap items-end gap-2" noValidate>
                <label className="text-sm font-medium">Motif du rappel
                  <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={255} placeholder="Ex. rappel fournisseur du 16/11" className="mt-1 block w-80 rounded-lg border border-black/20 bg-white px-3 py-2 text-sm" />
                </label>
                <button type="submit" disabled={busy} className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Rappel…" : "Bloquer et rappeler le lot"}</button>
              </form>
            )}
            {error && <p role="alert" className="mt-2 text-sm text-brand-red">{error}</p>}
            {report && <RecallReport report={report} />}
          </td>
        </tr>
      )}
    </>
  );
}

function RecallReport({ report }: { report: Report }) {
  return (
    <div role="status" className="text-sm">
      <p className="font-semibold text-brand-red">Lot rappelé : {report.reason}</p>
      <p className="mt-2 font-medium">Clients ayant déjà reçu ce lot (à prévenir) : {report.delivered.length}</p>
      {report.delivered.length > 0 && (
        <ul className="ml-4 list-disc">{report.delivered.map((o) => <li key={o.order_id}>Commande #{o.order_id} — client n° {o.customer_id ?? "sans compte"} — quantité {o.quantity}</li>)}</ul>
      )}
      <p className="mt-2 font-medium">Commandes en attente qui le réservent (à réallouer) : {report.reserved.length}</p>
      {report.reserved.length > 0 && (
        <ul className="ml-4 list-disc">{report.reserved.map((o) => <li key={o.order_id}>Commande #{o.order_id} — quantité {o.quantity}</li>)}</ul>
      )}
    </div>
  );
}
