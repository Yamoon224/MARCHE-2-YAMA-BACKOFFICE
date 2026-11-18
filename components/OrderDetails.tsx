import type { ReactNode } from "react";
import type { components } from "@/lib/api/schema";
import { formatMoney } from "@/lib/format";
import { addressLines, CHANNEL_LABEL, DELIVERY_STATUS_LABEL, label, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/orders/details";
import { statusLabel } from "@/lib/orders/status";
import { KIND_LABEL, REFUND_STATUS_LABEL } from "@/lib/refunds/refunds";

export type OrderDetail = components["schemas"]["OrderDetail"];

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });
const when = (iso?: string | null) => (iso ? dateTime.format(new Date(iso)) : "-");

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([name, value]) => (
        <div key={name} className="contents"><dt className="text-black/60">{name}</dt><dd className="font-medium">{value}</dd></div>
      ))}
    </dl>
  );
}

/**
 * Tout ce que le personnel doit savoir d'une commande : client, réception, paiements et remboursements, livraison,
 * articles et historique. Composant d'affichage pur, partagé par la page de la commande et par la fenêtre « Détails ».
 */
export function OrderDetails({ order }: { order: OrderDetail }) {
  const adjustment = order.adjustment_minor ?? 0;
  const address = addressLines(order.delivery_address);
  const delivery = order.delivery;
  const payments = order.payments ?? [];

  const reception: [string, ReactNode][] = [
    ["Mode", order.fulfillment === "delivery" ? "Livraison à domicile" : "Retrait en magasin"],
    ["Canal", label(CHANNEL_LABEL, order.channel)],
    ["Créneau", order.delivery_slot_id ? `n° ${order.delivery_slot_id}` : "-"],
    ["Commandée le", when(order.created_at)],
    ["Contact", order.contact_phone ?? "-"],
  ];
  if (order.fulfillment === "delivery") {
    reception.push(["Adresse", address.length ? address.map((line) => <span key={line} className="block">{line}</span>) : "-"]);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Block title="Client">
        {order.customer ? (
          <Facts rows={[
            ["Nom", order.customer.name],
            ["E-mail", order.customer.email ?? "-"],
            ["Téléphone", order.customer.phone ?? order.contact_phone ?? "-"],
          ]} />
        ) : (
          <p className="text-sm text-black/60">Aucun compte client associé{order.contact_phone ? ` · ${order.contact_phone}` : ""}.</p>
        )}
      </Block>

      <Block title="Réception"><Facts rows={reception} /></Block>

      {order.fulfillment === "delivery" && (
        <Block title="Livraison">
          {delivery ? (
            <Facts rows={[
              ["État", label(DELIVERY_STATUS_LABEL, delivery.status)],
              ["Livreur", delivery.courier_name ?? "Non assigné"],
              ["Assignée le", when(delivery.assigned_at)],
              ["Livrée le", when(delivery.delivered_at)],
              ["Espèces encaissées", delivery.cash_collected_minor != null ? formatMoney(delivery.cash_collected_minor) : "-"],
              ...(delivery.failure_reason ? [["Motif d'échec", delivery.failure_reason] as [string, ReactNode]] : []),
            ]} />
          ) : (
            <p className="text-sm text-black/60">Pas encore de tournée associée.</p>
          )}
        </Block>
      )}

      <Block title="Paiements et remboursements">
        {payments.length === 0 ? (
          <p className="text-sm text-black/60">Aucun paiement enregistré.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {payments.map((payment) => (
              <li key={payment.reference} className="rounded-lg bg-black/[0.03] p-3">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{label(PAYMENT_METHOD_LABEL, payment.method)} <span className="text-black/50">· {payment.reference}</span></span>
                  <strong>{formatMoney(payment.amount_minor ?? 0)}</strong>
                </p>
                <p className="text-xs text-black/60">
                  {label(PAYMENT_STATUS_LABEL, payment.status)} · {when(payment.created_at)}
                  {payment.needs_refund && <b className="ml-2 text-brand-red">À rembourser</b>}
                </p>
                {(payment.refunds ?? []).length > 0 && (
                  <ul className="mt-2 space-y-1 border-l-2 border-brand-red/40 pl-3">
                    {(payment.refunds ?? []).map((refund) => (
                      <li key={refund.reference} className="flex flex-wrap justify-between gap-2 text-xs">
                        <span>{label(KIND_LABEL, refund.kind)}{refund.reason ? <span className="text-black/50"> - {refund.reason}</span> : null}</span>
                        <span><span className="text-black/60">{label(REFUND_STATUS_LABEL, refund.status)}</span> · <b>{formatMoney(refund.amount_minor ?? 0)}</b></span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <div className="md:col-span-2">
        <Block title="Articles">
          <ul className="divide-y divide-black/10 text-sm">
            {(order.lines ?? []).map((line) => (
              <li key={line.id} className="flex justify-between gap-3 py-2">
                <span>{line.name} <span className="text-black/50">× {line.quantity}{line.sale_unit && line.sale_unit !== "piece" ? ` ${line.sale_unit === "kg" ? "g" : "ml"}` : ""}</span></span>
                <span>{formatMoney(line.line_total_minor)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-[1fr_auto] gap-1 border-t border-black/10 pt-3 text-sm">
            <dt>Sous-total</dt><dd className="text-right">{formatMoney(order.subtotal_minor ?? 0)}</dd>
            <dt>Livraison</dt><dd className="text-right">{formatMoney(order.delivery_fee_minor ?? 0)}</dd>
            {(order.discount_minor ?? 0) > 0 && (<><dt>Remise</dt><dd className="text-right">−{formatMoney(order.discount_minor ?? 0)}</dd></>)}
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
        </Block>
      </div>

      <div className="md:col-span-2">
        <Block title="Historique">
          <ol className="border-l-2 border-brand-green/40 pl-4 text-sm">
            {[...(order.history ?? [])].reverse().map((entry, index) => (
              <li key={`${entry.to_status}-${entry.created_at}-${index}`} className="mb-3 last:mb-0">
                <p className="font-medium">{statusLabel(entry.to_status)}</p>
                <p className="text-xs text-black/60">
                  {when(entry.created_at)}
                  {entry.user_id ? ` · utilisateur ${entry.user_id}` : " · système"}
                  {entry.reason ? ` - ${entry.reason}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </Block>
      </div>
    </div>
  );
}
