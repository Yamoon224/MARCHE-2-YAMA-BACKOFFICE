"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { browserApi } from "@/lib/api/client";
import { DELIVERY_STATUS_LABEL, formatAddress, type Address, type DeliveryStatus } from "@/lib/courier/courier";
import { extractApiError, formatMoney } from "@/lib/format";

export type BoardDelivery = {
  id: number;
  order_id: number;
  status: DeliveryStatus;
  courier_id?: number | null;
  courier_name?: string | null;
  phone?: string | null;
  address?: Address;
  slot_starts_at?: string | null;
  cash_due_minor: number;
  failure_reason?: string | null;
  code_locked?: boolean;
};

type Courier = { id: number; name: string };

const hour = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const field = "rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-green";

export function DispatchBoard({ deliveries, couriers }: { deliveries: BoardDelivery[]; couriers: Courier[] }) {
  if (deliveries.length === 0) return <p className="text-black/70">Aucune livraison à traiter pour le moment.</p>;

  return (
    <ul className="flex flex-col gap-3">
      {deliveries.map((d) => <DeliveryCard key={d.id} delivery={d} couriers={couriers} />)}
    </ul>
  );
}

function DeliveryCard({ delivery, couriers }: { delivery: BoardDelivery; couriers: Courier[] }) {
  const router = useRouter();
  const [courierId, setCourierId] = useState<string>(delivery.courier_id ? String(delivery.courier_id) : "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(call: () => Promise<{ error?: unknown }>) {
    setBusy(true);
    setError(null);

    try {
      const { error: failure } = await call();
      if (failure) return setError(extractApiError(failure));
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const path = { delivery: delivery.id };
  const canAssign = delivery.status === "pending" || delivery.status === "assigned";

  return (
    <li className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Commande n° {delivery.order_id}
          <span className="font-normal text-black/60"> — {formatAddress(delivery.address)}</span>
        </p>
        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium">{DELIVERY_STATUS_LABEL[delivery.status]}</span>
      </div>

      <p className="mt-1 text-sm text-black/60">
        {delivery.slot_starts_at ? `Créneau ${hour.format(new Date(delivery.slot_starts_at))}` : "Sans créneau"}
        {delivery.courier_name ? ` · livreur : ${delivery.courier_name}` : ""}
        {delivery.cash_due_minor > 0 ? ` · à encaisser : ${formatMoney(delivery.cash_due_minor)}` : ""}
      </p>
      {delivery.failure_reason && <p className="mt-1 text-sm text-brand-red">Échec : {delivery.failure_reason}</p>}

      {canAssign && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`courier-${delivery.id}`}>Livreur</label>
          <select id={`courier-${delivery.id}`} value={courierId} onChange={(e) => setCourierId(e.target.value)} className={field}>
            <option value="">Choisir un livreur…</option>
            {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            type="button"
            disabled={busy || courierId === ""}
            onClick={() => run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/assign", { params: { path }, body: { courier_id: Number(courierId) } }))}
            className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {delivery.status === "pending" ? "Affecter" : "Réaffecter"}
          </button>
        </div>
      )}

      {delivery.code_locked && (
        <div className="mt-3 flex items-center gap-3">
          <p className="text-sm font-medium text-brand-red">Code verrouillé après trop d&apos;essais erronés.</p>
          <button type="button" disabled={busy} onClick={() => run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/unlock", { params: { path } }))} className="rounded-full border border-brand-red px-4 py-1.5 text-sm text-brand-red disabled:opacity-50">
            Débloquer
          </button>
        </div>
      )}

      {delivery.status === "failed" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du retour" aria-label="Motif du retour au magasin" maxLength={255} className={`${field} w-64`} />
          <button
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => run(() => browserApi().POST("/api/v1/delivery/deliveries/{delivery}/return", { params: { path }, body: { reason: reason.trim() } }))}
            className="rounded-full border border-brand-red px-4 py-1.5 text-sm text-brand-red disabled:opacity-50"
          >
            Retourner au magasin
          </button>
          <span className="text-xs text-black/60">Le livreur peut aussi retenter la livraison.</span>
        </div>
      )}

      {error && <p role="alert" className="mt-2 rounded-lg bg-brand-red/10 p-2 text-sm text-brand-red">{error}</p>}
    </li>
  );
}
