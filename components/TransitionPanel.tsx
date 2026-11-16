"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import { extractApiError } from "@/lib/format";
import { ACTION_LABEL, availableActions, requiresReason, statusLabel } from "@/lib/orders/status";

type Props = { orderId: number; status: string; role: string; fulfillment?: string };

export function TransitionPanel({ orderId, status, role, fulfillment = "pickup" }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = availableActions(role, status, fulfillment);

  async function apply(to: string, why?: string) {
    setBusy(true);
    setError(null);

    try {
      const { error: failure } = await browserApi().POST("/api/v1/orders/{order}/transitions", {
        params: { path: { order: orderId } },
        body: { to, reason: why?.trim() || null },
      });

      if (failure) return setError(extractApiError(failure));

      setPending(null);
      setReason("");
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function choose(to: string) {
    setError(null);
    if (requiresReason(to)) setPending(to);
    else void apply(to);
  }

  function confirmReason(event: FormEvent) {
    event.preventDefault();
    if (pending) void apply(pending, reason);
  }

  if (actions.length === 0) {
    return <p className="text-sm text-black/60">Aucune action disponible pour votre rôle sur une commande « {statusLabel(status)} ».</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map((to) => (
          <button
            key={to}
            type="button"
            disabled={busy}
            onClick={() => choose(to)}
            className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${requiresReason(to) ? "border border-brand-red text-brand-red" : "bg-brand-green text-white"}`}
          >
            {ACTION_LABEL[to] ?? to}
          </button>
        ))}
      </div>

      {pending && (
        <form onSubmit={confirmReason} className="mt-4 flex max-w-lg flex-col gap-2 rounded-xl border border-black/10 bg-white p-4">
          <label className="text-sm font-medium" htmlFor="reason">Motif obligatoire — {ACTION_LABEL[pending]}</label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} required placeholder="Motif obligatoire…" className="rounded-lg border border-black/20 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" disabled={busy || reason.trim() === ""} className="rounded-full bg-brand-red px-4 py-2 text-sm font-medium text-white disabled:opacity-60">Confirmer</button>
            <button type="button" onClick={() => setPending(null)} className="rounded-full px-4 py-2 text-sm text-black/70">Annuler</button>
          </div>
        </form>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
    </div>
  );
}
