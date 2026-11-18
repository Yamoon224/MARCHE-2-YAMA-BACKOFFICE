import { Suspense } from "react";
import { DownNotice, LoadError, Pager, first, pageNumber } from "@/components/admin/notices";
import { PromotionsAdmin } from "@/components/admin/PromotionsAdmin";
import { PROMOTION_STATE_LABEL } from "@/lib/promotions/promotions";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Promotions - Backoffice Marché de Yama" };

type SearchParams = Promise<{ q?: string | string[]; state?: string | string[]; page?: string | string[] }>;

export default function PromotionsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Codes promotionnels</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = first(raw.q).trim().slice(0, 60);
  const state = Object.keys(PROMOTION_STATE_LABEL).includes(first(raw.state)) ? first(raw.state) : "";
  const page = pageNumber(raw.page);

  const staff = await requireStaff("/promotions");
  if (staff.status === "down") return <DownNotice />;

  const list = await staff.api
    .GET("/api/v1/promotions", { params: { query: { q: q || undefined, state: (state || undefined) as "active" | undefined, page, per_page: 100 } } })
    .catch(() => null);
  if (!list?.data) return <LoadError status={list?.response.status} what="les codes promotionnels" />;

  return (
    <>
      <form action="/promotions" className="mb-4 flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium">
          Code
          <input type="search" name="q" defaultValue={q} className="mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm" />
        </label>
        <label className="text-sm font-medium">
          État
          <select name="state" defaultValue={state} className="mt-1 block rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm">
            <option value="">Tous</option>
            {Object.entries(PROMOTION_STATE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
      </form>

      <PromotionsAdmin promotions={list.data.data} />
      <Pager path="/promotions" params={{ q, state }} meta={list.data.meta} />
    </>
  );
}
