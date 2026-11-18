import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DownNotice, LoadError, Stat, first } from "@/components/admin/notices";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { SalesChart } from "@/components/admin/SalesChart";
import { StatusBadge } from "@/components/StatusBadge";
import { resolvePeriod, todayParis } from "@/lib/dashboard/period";
import { formatMoney } from "@/lib/format";
import { navFor } from "@/lib/orders/status";
import { statusLabel } from "@/lib/orders/status";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Tableau de bord - Backoffice Marché de Yama" };

type SearchParams = Promise<{ from?: string | string[]; to?: string | string[] }>;

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Tableau de bord</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const raw = await searchParams;
  const today = todayParis(new Date());
  const period = resolvePeriod(first(raw.from) || undefined, first(raw.to) || undefined, today);

  const staff = await requireStaff(`/dashboard?from=${period.from}&to=${period.to}`);
  if (staff.status === "down") return <DownNotice />;

  const result = await staff.api.GET("/api/v1/reports/dashboard", { params: { query: period } }).catch(() => null);
  if (!result?.data) return <LoadError status={result?.response.status} what="le tableau de bord" />;

  const d = result.data.data;
  const allowed = new Set(navFor(staff.user.role).map((item) => item.href));
  const alerts = [
    { label: `Lots qui expirent sous ${d.alerts.expiring_lots_days} jours`, count: d.alerts.expiring_lots, href: "/stock" },
    { label: "Produits en rupture", count: d.alerts.out_of_stock_products, href: "/stock" },
    { label: "Réclamations à traiter", count: d.alerts.open_claims, href: "/claims?status=open" },
    { label: "Livraisons en retard", count: d.alerts.late_deliveries, href: "/dispatch" },
  ];
  const maxStatus = Math.max(1, ...d.orders_by_status.map((s) => s.count));

  return (
    <>
      <PeriodFilter path="/dashboard" period={period} today={today} />

      <section aria-label="Indicateurs" className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Chiffre d'affaires" value={formatMoney(d.revenue_minor)} hint="TTC, commandes aboutissantes" />
        <Stat label="Commandes" value={String(d.orders_count)} />
        <Stat label="Panier moyen" value={formatMoney(d.average_basket_minor)} />
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SalesChart points={d.sales_by_day} /></div>

        <section aria-labelledby="alerts-title" className="rounded-xl border border-black/10 bg-white p-4">
          <h2 id="alerts-title" className="mb-3 font-semibold">Alertes</h2>
          <ul className="space-y-2 text-sm">
            {alerts.map((alert) => (
              <li key={alert.label} className="flex items-center justify-between gap-2">
                <span>{alert.label}</span>
                <span className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${alert.count > 0 ? "bg-brand-red/10 text-brand-red" : "bg-black/5 text-black/60"}`}>{alert.count}</span>
                  {alert.count > 0 && allowed.has(alert.href.split("?")[0]) && <Link href={alert.href} className="text-brand-green underline">Voir</Link>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="status-title" className="rounded-xl border border-black/10 bg-white p-4">
          <h2 id="status-title" className="mb-3 font-semibold">Commandes par statut</h2>
          {d.orders_by_status.length === 0 ? <p className="text-sm text-black/60">Aucune commande sur cette période.</p> : (
            <ul className="space-y-2 text-sm">
              {d.orders_by_status.map((s) => (
                <li key={s.status}>
                  <div className="mb-1 flex items-center justify-between">
                    <StatusBadge status={s.status} />
                    <span className="text-black/70">{s.count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5" role="presentation">
                    <div className="h-1.5 rounded-full bg-brand-green" style={{ width: `${(s.count / maxStatus) * 100}%` }} title={statusLabel(s.status)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="top-title" className="rounded-xl border border-black/10 bg-white p-4">
          <h2 id="top-title" className="mb-3 font-semibold">Meilleurs produits</h2>
          {d.top_products.length === 0 ? <p className="text-sm text-black/60">Aucune vente sur cette période.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-black/60"><tr><th className="py-1 pr-2 font-medium">Produit</th><th className="py-1 pr-2 text-right font-medium">Quantité</th><th className="py-1 text-right font-medium">CA</th></tr></thead>
              <tbody>
                {d.top_products.map((p) => (
                  <tr key={p.product_id} className="border-t border-black/5">
                    <td className="py-1 pr-2">{p.name}</td>
                    <td className="py-1 pr-2 text-right">{p.quantity}</td>
                    <td className="py-1 text-right">{formatMoney(p.revenue_minor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-2 text-xs text-black/50">Quantités en unité de base (pièces, grammes ou millilitres).</p>
        </section>
      </div>
    </>
  );
}
