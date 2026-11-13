"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import { parseCounted, validateHandover, variance, varianceLabel } from "@/lib/cash/cash";
import { extractApiError, formatXof } from "@/lib/format";

export type CourierCash = { courier_id: number; courier_name?: string | null; held_minor: number; deliveries_count: number };
export type Handover = {
  id: number; courier_id: number; expected_minor: number; counted_minor: number; variance_minor: number;
  deliveries_count: number; note?: string | null; created_at?: string | null;
};

export function CashDesk({ holders, handovers }: { holders: CourierCash[]; handovers: Handover[] }) {
  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="held-title">
        <h2 id="held-title" className="mb-3 text-lg font-semibold">Espèces détenues par les livreurs</h2>
        {holders.length === 0 ? (
          <p className="text-black/70">Aucun livreur ne détient d&apos;espèces. Tout est remis.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {holders.map((holder) => <HolderRow key={holder.courier_id} holder={holder} />)}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-title">
        <h2 id="history-title" className="mb-3 text-lg font-semibold">Dernières remises</h2>
        {handovers.length === 0 ? (
          <p className="text-black/70">Aucune remise enregistrée.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
                <tr>
                  <th scope="col" className="px-4 py-3">Remise</th><th scope="col" className="px-4 py-3">Livreur</th>
                  <th scope="col" className="px-4 py-3 text-right">Attendu</th><th scope="col" className="px-4 py-3 text-right">Compté</th>
                  <th scope="col" className="px-4 py-3">Écart</th><th scope="col" className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {handovers.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3">#{h.id} <span className="text-black/50">({h.deliveries_count} liv.)</span></td>
                    <td className="px-4 py-3">n° {h.courier_id}</td>
                    <td className="px-4 py-3 text-right">{formatXof(h.expected_minor)}</td>
                    <td className="px-4 py-3 text-right">{formatXof(h.counted_minor)}</td>
                    <td className={`px-4 py-3 ${h.variance_minor === 0 ? "" : "font-medium text-brand-red"}`}>
                      {varianceLabel(h.variance_minor)}{h.variance_minor !== 0 && ` (${formatXof(Math.abs(h.variance_minor))})`}
                    </td>
                    <td className="px-4 py-3">{h.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function HolderRow({ holder }: { holder: CourierCash }) {
  const router = useRouter();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false); // garde synchrone : un double clic n'envoie pas deux remises

  const countedNumber = parseCounted(counted);
  const gap = countedNumber === null ? null : variance(countedNumber, holder.held_minor);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;

    setError(null);
    setDone(null);

    const problem = validateHandover(counted, holder.held_minor, note);
    if (problem) return setError(problem);

    if (!window.confirm(`Enregistrer la remise de ${formatXof(countedNumber as number)} ? Elle ne pourra pas être modifiée.`)) return;

    submitting.current = true;
    setBusy(true);

    try {
      const trimmed = note.trim();
      const { data, error: failure } = await browserApi().POST("/api/v1/delivery/cash/handovers", {
        body: { courier_id: holder.courier_id, counted_minor: countedNumber as number, ...(trimmed ? { note: trimmed } : {}) },
      });

      if (failure || !data) return setError(extractApiError(failure));

      setDone(`Remise enregistrée : ${formatXof(data.data.counted_minor)} en caisse.`);
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Vérifiez l'historique avant de réessayer.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

  return (
    <li className="rounded-xl border border-black/10 bg-white p-4">
      <p className="font-semibold">{holder.courier_name ?? `Livreur n° ${holder.courier_id}`}</p>
      <p className="text-sm text-black/70">
        Attendu : <strong>{formatXof(holder.held_minor)}</strong> sur {holder.deliveries_count} livraison(s)
      </p>

      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3" noValidate>
        <label className="text-sm font-medium">
          Montant compté (F CFA)
          <input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="numeric" className={`${field} w-44`} />
        </label>
        <label className="grow text-sm font-medium">
          Note {gap !== null && gap !== 0 ? "(obligatoire : écart)" : "(facultative)"}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} className={field} />
        </label>
        <button type="submit" disabled={busy} className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Enregistrement…" : "Enregistrer la remise"}
        </button>
      </form>

      {gap !== null && gap !== 0 && (
        <p className="mt-2 text-sm font-medium text-brand-red">{varianceLabel(gap)} : {formatXof(Math.abs(gap))}</p>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
      {done && <p role="status" className="mt-2 rounded-lg bg-brand-green/10 p-3 text-sm text-brand-green">{done}</p>}
    </li>
  );
}
