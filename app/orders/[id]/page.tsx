import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { RefundPanel } from "@/components/RefundPanel";
import { TransitionPanel } from "@/components/TransitionPanel";
import { formatMoney } from "@/lib/format";
import { statusLabel } from "@/lib/orders/status";
import { canRefund, KIND_LABEL, REFUND_STATUS_LABEL } from "@/lib/refunds/refunds";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Commande - Backoffice Marché de Yama" };

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

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
  const refunds = refundsResult?.data?.data ?? [];
  const refundableMinor = refundsResult?.data?.meta.refundable_minor ?? 0;
  const adjustment = order.adjustment_minor ?? 0;

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

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="lignes">
          <h2 id="lignes" className="mb-2 font-semibold">Articles</h2>
          <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
            {(order.lines ?? []).map((line) => (
              <li key={line.product_id} className="flex justify-between gap-3 p-3">
                <span>{line.name} <span className="text-black/50">× {line.quantity}{line.sale_unit && line.sale_unit !== "piece" ? ` ${line.sale_unit === "kg" ? "g" : "ml"}` : ""}</span></span>
                <span>{formatMoney(line.line_total_minor)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-1 text-sm">
            <dt>Sous-total</dt><dd className="text-right">{formatMoney(order.subtotal_minor ?? 0)}</dd>
            <dt>Livraison</dt><dd className="text-right">{formatMoney(order.delivery_fee_minor ?? 0)}</dd>
            <dt className="font-bold">Total TTC payé</dt><dd className="text-right font-bold">{formatMoney(order.total_minor)}</dd>
            {order.final_total_minor != null && (
              <>
                <dt>Total réel après préparation</dt><dd className="text-right">{formatMoney(order.final_total_minor)}</dd>
                <dt>Écart</dt>
                <dd className={`text-right font-medium ${adjustment < 0 ? "text-brand-red" : ""}`}>
                  {adjustment === 0 ? "Aucun" : `${adjustment > 0 ? "+" : "−"}${formatMoney(Math.abs(adjustment))}${adjustment < 0 ? " (remboursé)" : " (à encaisser)"}`}
                </dd>
              </>
            )}
          </dl>
        </section>

        <section aria-labelledby="remboursements" className="md:col-span-2">
          <h2 id="remboursements" className="mb-2 font-semibold">Remboursements</h2>
          {refunds.length === 0 ? (
            <p className="text-sm text-black/60">Aucun remboursement pour cette commande.</p>
          ) : (
            <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white text-sm">
              {refunds.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span>{KIND_LABEL[r.kind] ?? r.kind} <span className="text-black/50">- {r.reason}</span></span>
                  <span className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${r.status === "failed" ? "text-brand-red" : "text-black/60"}`}>{REFUND_STATUS_LABEL[r.status] ?? r.status}</span>
                    <strong>{formatMoney(r.amount_minor)}</strong>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canRefund(staff.user.role) && (
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-semibold">Nouveau remboursement</h3>
              <RefundPanel orderId={order.id} refundableMinor={refundableMinor} />
            </div>
          )}
        </section>

        <section aria-labelledby="historique">
          <h2 id="historique" className="mb-2 font-semibold">Historique</h2>
          <ol className="border-l-2 border-brand-green/40 pl-4 text-sm">
            {[...(order.history ?? [])].reverse().map((entry, index) => (
              <li key={`${entry.to_status}-${entry.created_at}-${index}`} className="mb-3">
                <p className="font-medium">{statusLabel(entry.to_status)}</p>
                <p className="text-xs text-black/60">
                  {entry.created_at ? dateTime.format(new Date(entry.created_at)) : ""}
                  {entry.user_id ? ` · utilisateur ${entry.user_id}` : " · système"}
                  {entry.reason ? ` - ${entry.reason}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </>
  );
}
