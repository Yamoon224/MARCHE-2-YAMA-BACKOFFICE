import { Suspense } from "react";
import { LotTable } from "@/components/LotTable";
import { requireStaff } from "@/lib/server/staff";
import { canRecall, todayIso } from "@/lib/stock/stock";

export const metadata = { title: "Stock - Backoffice Marché de Yama" };

type SearchParams = Promise<{ filtre?: string | string[] }>;

const FILTERS = [
  { value: "", label: "Tous les lots" },
  { value: "bientot", label: "Péremption sous 3 jours" },
  { value: "bloques", label: "Lots bloqués ou rappelés" },
];

export default function StockPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Stock par lot</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filtre = typeof raw.filtre === "string" && FILTERS.some((f) => f.value === raw.filtre) ? raw.filtre : "";

  const staff = await requireStaff("/stock");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/inventory/lots", {
    params: { query: { blocked: filtre === "bloques" ? true : undefined, expiring_in_days: filtre === "bientot" ? 3 : undefined } },
  }).catch(() => null);

  if (result?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de consulter le stock.</p>;
  }
  if (!result?.data) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les lots.</p>;

  return (
    <>
      <form action="/stock" className="mb-4 flex items-center gap-2">
        <label htmlFor="filtre" className="text-sm font-medium">Afficher</label>
        <select id="filtre" name="filtre" defaultValue={filtre} className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm">
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
      </form>
      <LotTable lots={result.data.data} canRecall={canRecall(staff.user.role)} today={todayIso()} />
    </>
  );
}
