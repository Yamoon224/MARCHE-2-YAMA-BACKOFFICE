import { SearchSelect } from "@/components/SearchSelect";
import { Btn } from "@/components/Btn";
import Link from "next/link";
import { Suspense } from "react";
import { DataTable } from "@/components/DataTable";
import { OrderDetailsButton } from "@/components/OrderDetailsButton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatMoney } from "@/lib/format";
import { requireStaff } from "@/lib/server/staff";
import { STATUSES, statusLabel } from "@/lib/orders/status";

export const metadata = { title: "Commandes - Backoffice Marché de Yama" };

type SearchParams = Promise<{ status?: string | string[]; page?: string | string[] }>;

export default function CommandesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Commandes</h1>
      <Suspense fallback={<p className="text-black/60">Chargement des commandes…</p>}>
        <OrderTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function href(status: string, page: number): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();

  return query ? `/orders?${query}` : "/orders";
}

async function OrderTable({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" && STATUSES.includes(raw.status) ? raw.status : "";
  const page = Math.max(1, Number.parseInt(typeof raw.page === "string" ? raw.page : "1", 10) || 1);

  const staff = await requireStaff(href(status, page));
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/orders", { params: { query: { status: status || undefined, page } } }).catch(() => null);
  const orders = result?.data?.data ?? [];
  const meta = result?.data?.meta;

  return (
    <>
      <form action="/orders" className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="status">Statut</label>
        <SearchSelect id="status" name="status" defaultValue={status} emptyLabel="Tous les statuts" className="min-w-52" options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
        <Btn type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</Btn>
      </form>

      {!result || result.error ? (
        <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les commandes.</p>
      ) : orders.length === 0 ? (
        <p className="text-black/70">Aucune commande{status ? ` au statut « ${statusLabel(status)} »` : ""}.</p>
      ) : (
        <DataTable
          name="commandes"
          title="Commandes"
          emptyMessage="Aucune commande."
          columns={[
            { header: "Commande" },
            { header: "Statut" },
            { header: "Réception" },
            { header: "Total TTC", type: "number", align: "right" },
            { header: "Détails", actions: true },
          ]}
          rows={orders.map((order) => ({
            key: order.id,
            cells: [
              { value: order.number ?? `#${order.id}`, node: <Link href={`/orders/${order.id}`} className="font-medium text-brand-green underline">{order.number ?? `#${order.id}`}</Link> },
              { value: statusLabel(order.status), node: <StatusBadge status={order.status} /> },
              order.fulfillment === "delivery" ? "Livraison" : "Retrait magasin",
              { value: order.total_minor, text: formatMoney(order.total_minor), node: <span className="font-semibold">{formatMoney(order.total_minor)}</span> },
              { value: null, node: <OrderDetailsButton orderId={order.id} number={order.number ?? `#${order.id}`} /> },
            ],
          }))}
        />
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {meta.current_page > 1 ? <Link href={href(status, meta.current_page - 1)} className="text-brand-green underline">← Précédent</Link> : <span />}
          <span className="text-black/60">Page {meta.current_page} sur {meta.last_page} - {meta.total} commande{meta.total > 1 ? "s" : ""}</span>
          {meta.current_page < meta.last_page ? <Link href={href(status, meta.current_page + 1)} className="text-brand-green underline">Suivant →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
