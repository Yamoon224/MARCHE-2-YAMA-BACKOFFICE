"use client";

import { Btn } from "@/components/Btn";
import Link from "next/link";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { OrderDetails, type OrderDetail } from "@/components/OrderDetails";
import { StatusBadge } from "@/components/StatusBadge";
import { browserApi } from "@/lib/api/client";
import { extractApiError } from "@/lib/format";

/** Bouton « Détails » d'une ligne de commande : charge la commande à l'ouverture et l'affiche dans une fenêtre. */
export function OrderDetailsButton({ orderId, number }: { orderId: number; number: string }) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function show() {
    setOpen(true);
    setOrder(null);
    setError(null);

    try {
      const { data, error: failure } = await browserApi().GET("/api/v1/orders/{order}", { params: { path: { order: orderId } } });
      if (failure || !data?.data) return setError(extractApiError(failure, "Impossible de charger la commande."));
      setOrder(data.data);
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    }
  }

  return (
    <>
      <Btn type="button" onClick={() => void show()} className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5">Détails</Btn>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Commande ${number}`}
        size="xl"
        footer={
          <>
            <Btn type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Fermer</Btn>
            <Link href={`/orders/${orderId}`} className="rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white">Ouvrir la commande (actions)</Link>
          </>
        }
      >
        {error ? (
          <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>
        ) : !order ? (
          <p role="status" className="text-sm text-black/60">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <p><StatusBadge status={order.status} /></p>
            <OrderDetails order={order} />
          </div>
        )}
      </Modal>
    </>
  );
}
