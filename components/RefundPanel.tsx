"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import { extractApiError, formatMoney } from "@/lib/format";
import { parseAmount, validateRefund } from "@/lib/refunds/refunds";

type Props = { orderId: number; refundableMinor: number };

export function RefundPanel({ orderId, refundableMinor }: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Une clé par geste : un double clic ne rembourse pas deux fois. Elle est renouvelée après chaque succès.
  const attempt = useRef<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(null);

    const problem = validateRefund(amount, reason, refundableMinor);
    if (problem) return setError(problem);

    setBusy(true);
    const key = (attempt.current ??= crypto.randomUUID());

    try {
      const { data, error: failure } = await browserApi().POST("/api/v1/orders/{orderId}/refunds", {
        params: { path: { orderId }, header: { "Idempotency-Key": key } },
        body: { amount_minor: parseAmount(amount) as number, reason: reason.trim() },
      });

      if (failure || !data) return setError(extractApiError(failure));

      const failed = data.data.some((r) => r.status === "failed");
      setDone(failed
        ? "Le remboursement est enregistré mais l'agrégateur l'a refusé : il sera repris automatiquement."
        : `Remboursement de ${formatMoney(data.data.reduce((sum, r) => sum + r.amount_minor, 0))} effectué.`);
      setAmount("");
      setReason("");
      attempt.current = null;
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez (le geste ne sera pas doublé).");
    } finally {
      setBusy(false);
    }
  }

  if (refundableMinor <= 0) return <p className="text-sm text-black/60">Rien n&apos;est remboursable sur cette commande.</p>;

  const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

  return (
    <form onSubmit={submit} className="flex max-w-lg flex-col gap-3" noValidate>
      <p className="text-sm">Remboursable : <strong>{formatMoney(refundableMinor)}</strong> (sur le moyen de paiement d&apos;origine)</p>

      <label className="text-sm font-medium">
        Montant (€)
        <input value={amount} onChange={(e) => { setAmount(e.target.value); attempt.current = null; }} inputMode="decimal" placeholder="Ex. 12,50" className={field} />
      </label>
      <label className="text-sm font-medium">
        Motif
        <input value={reason} onChange={(e) => { setReason(e.target.value); attempt.current = null; }} maxLength={255} placeholder="Ex. produit abîmé" className={field} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
      {done && <p role="status" className="rounded-lg bg-brand-green/10 p-3 text-sm text-brand-green">{done}</p>}

      <button type="submit" disabled={busy} className="w-fit rounded-full border border-brand-red px-5 py-2 text-sm font-medium text-brand-red disabled:opacity-60">
        {busy ? "Remboursement…" : "Rembourser le client"}
      </button>
    </form>
  );
}
