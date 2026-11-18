import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { OrderDetails } from "@/components/OrderDetails";
import { RefundPanel } from "@/components/RefundPanel";
import { TransitionPanel } from "@/components/TransitionPanel";
import { canRefund } from "@/lib/refunds/refunds";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Commande - Backoffice Marché de Yama" };

type Props = { params: Promise<{ id: string }> };

export default function CommandePage(props: Props) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Suspense fallback={<p className="text-black/60">Chargement de la commande…</p>}>
        <OrderDetail {...props} />
      </Suspense>
    </main>
  );
}

async function OrderDetail({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const staff = await requireStaff(`/orders/${id}`);
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/orders/{order}", { params: { path: { order: Number(id) } } }).catch(() => null);

  if (result?.response.status === 403 || result?.response.status === 404) notFound();

  const order = result?.data?.data;
  if (!order) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger la commande.</p>;

  const refundsResult = await staff.api.GET("/api/v1/orders/{orderId}/refunds", { params: { path: { orderId: order.id } } }).catch(() => null);
  const refundableMinor = refundsResult?.data?.meta.refundable_minor ?? 0;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/orders" className="text-brand-green underline">← Toutes les commandes</Link></p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{order.number ?? `Commande ${order.id}`}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-black/60">
        {order.fulfillment === "delivery" ? "Livraison à domicile" : "Retrait en magasin"} · créneau n° {order.delivery_slot_id ?? "-"}
      </p>

      <section aria-labelledby="actions" className="mt-6 rounded-xl border border-black/10 bg-white p-4">
        <h2 id="actions" className="mb-3 font-semibold">Actions</h2>
        <TransitionPanel orderId={order.id} status={order.status} role={staff.user.role} fulfillment={order.fulfillment} />
      </section>

      <div className="mt-6">
        <OrderDetails order={order} />
      </div>

      {canRefund(staff.user.role) && (
        <section aria-labelledby="remboursement" className="mt-6 rounded-xl border border-black/10 bg-white p-4">
          <h2 id="remboursement" className="mb-2 font-semibold">Nouveau remboursement</h2>
          <RefundPanel orderId={order.id} refundableMinor={refundableMinor} />
        </section>
      )}
    </>
  );
}
