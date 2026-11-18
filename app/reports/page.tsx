import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DownNotice, LoadError, Stat, first } from "@/components/admin/notices";
import { PeriodFilter } from "@/components/admin/PeriodFilter";
import { SalesCsvButton } from "@/components/admin/SalesCsvButton";
import { DataTable } from "@/components/DataTable";
import { fullDay } from "@/lib/dashboard/chart";
import { resolvePeriod, todayParis } from "@/lib/dashboard/period";
import { formatMoney } from "@/lib/format";
import { moneyCell } from "@/lib/table/cells";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Rapports de ventes - Backoffice Marché de Yama" };

type SearchParams = Promise<{ from?: string | string[]; to?: string | string[]; group?: string | string[] }>;

const GROUPS = [
  { value: "day", label: "Par jour", firstColumn: "Jour" },
  { value: "product", label: "Par produit", firstColumn: "Produit" },
  { value: "category", label: "Par catégorie", firstColumn: "Catégorie" },
] as const;

export default function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Rapports de ventes</h1>
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
  const group = GROUPS.find((g) => g.value === first(raw.group)) ?? GROUPS[0];

  const staff = await requireStaff(`/reports?from=${period.from}&to=${period.to}&group=${group.value}`);
  if (staff.status === "down") return <DownNotice />;

  const result = await staff.api.GET("/api/v1/reports/sales", { params: { query: { ...period, group: group.value } } }).catch(() => null);
  if (!result?.data) return <LoadError status={result?.response.status} what="le rapport" />;

  const report = result.data.data;
  const byDay = group.value === "day";

  return (
    <>
      <PeriodFilter path="/reports" period={period} today={today} extra={{ group: group.value }} />

      <nav aria-label="Regroupement" className="mb-4 flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <Link
            key={g.value}
            href={`/reports?from=${period.from}&to=${period.to}&group=${g.value}`}
            aria-current={g.value === group.value ? "true" : undefined}
            className={`rounded-full border px-3 py-1 text-sm ${g.value === group.value ? "border-brand-green bg-brand-green/10 font-medium" : "border-black/20"}`}
          >
            {g.label}
          </Link>
        ))}
      </nav>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Stat label="Chiffre d'affaires de la période" value={formatMoney(report.totals.revenue_minor ?? 0)} hint={`${fullDay(period.from)} au ${fullDay(period.to)}`} />
        <SalesCsvButton from={period.from} to={period.to} group={group.value} />
      </div>

      {report.rows.length === 0 ? <p className="text-black/70">Aucune vente sur cette période.</p> : (
        <DataTable
          name={`ventes-${group.value}-${period.from}-${period.to}`}
          title={`Ventes ${group.label.toLowerCase()} du ${fullDay(period.from)} au ${fullDay(period.to)}`}
          columns={[
            { header: group.firstColumn, type: byDay ? "date" : "text" },
            { header: byDay ? "Commandes" : "Quantité (unité de base)", type: "number", align: "right" },
            { header: "Chiffre d'affaires", type: "number", align: "right" },
          ]}
          rows={report.rows.map((row) => ({
            key: row.key,
            cells: [
              byDay ? { value: row.key, text: fullDay(row.key), node: fullDay(row.key) } : row.label,
              (byDay ? row.orders_count : row.quantity) ?? 0,
              moneyCell(row.revenue_minor),
            ],
          }))}
          footer={
            <tr>
              <td className="px-4 py-3" colSpan={2}>Total</td>
              <td className="px-4 py-3 text-right">{formatMoney(report.totals.revenue_minor ?? 0)}</td>
            </tr>
          }
        />
      )}
    </>
  );
}
