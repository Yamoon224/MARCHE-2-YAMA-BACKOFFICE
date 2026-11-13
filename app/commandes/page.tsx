import Link from "next/link";
import { Suspense } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { formatXof } from "@/lib/format";
import { requireStaff } from "@/lib/server/staff";
import { STATUSES, statusLabel } from "@/lib/orders/status";

export const metadata = { title: "Commandes — Backoffice Marché de Yama" };

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

  return query ? `/commandes?${query}` : "/commandes";
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
      <form action="/commandes" className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium" htmlFor="status">Statut</label>
        <select id="status" name="status" defaultValue={status} className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm">
          <option value="">Tous</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
      </form>

      {!result || result.error ? (
        <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les commandes.</p>
      ) : orders.length === 0 ? (
        <p className="text-black/70">Aucune commande{status ? ` au statut « ${statusLabel(status)} »` : ""}.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
              <tr>
                <th scope="col" className="px-4 py-3">Commande</th>
                <th scope="col" className="px-4 py-3">Statut</th>
                <th scope="col" className="px-4 py-3">Réception</th>
                <th scope="col" className="px-4 py-3 text-right">Total TTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/commandes/${order.id}`} className="text-brand-green underline">{order.number ?? `#${order.id}`}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3">{order.fulfillment === "delivery" ? "Livraison" : "Retrait magasin"}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatXof(order.total_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.last_page > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          {meta.current_page > 1 ? <Link href={href(status, meta.current_page - 1)} className="text-brand-green underline">← Précédent</Link> : <span />}
          <span className="text-black/60">Page {meta.current_page} sur {meta.last_page} — {meta.total} commande{meta.total > 1 ? "s" : ""}</span>
          {meta.current_page < meta.last_page ? <Link href={href(status, meta.current_page + 1)} className="text-brand-green underline">Suivant →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
