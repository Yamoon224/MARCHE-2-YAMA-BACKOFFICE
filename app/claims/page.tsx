import Link from "next/link";
import { Suspense } from "react";
import { CLAIM_STATUS_LABEL, COST_BEARER_LABEL, ISSUE_LABEL, type CostBearer, type Issue } from "@/lib/claims/claims";
import { formatMoney } from "@/lib/format";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Réclamations - Backoffice Marché de Yama" };

type SearchParams = Promise<{ status?: string | string[] }>;

export default function ReclamationsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Réclamations</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const status = typeof raw.status === "string" && ["open", "accepted", "rejected"].includes(raw.status) ? raw.status : "";

  const staff = await requireStaff("/claims");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const [list, stats] = await Promise.all([
    staff.api.GET("/api/v1/claims", { params: { query: { status: (status || undefined) as "open" | undefined } } }).catch(() => null),
    staff.api.GET("/api/v1/claims/quality-stats").catch(() => null),
  ]);

  if (!list?.data) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger les réclamations.</p>;

  const claims = list.data.data;
  const s = stats?.data;

  return (
    <>
      {s && (
        <section aria-labelledby="qualite" className="mb-6 grid gap-4 md:grid-cols-4">
          <h2 id="qualite" className="sr-only">Statistiques de qualité</h2>
          <Stat label="À traiter" value={String(s.open ?? 0)} />
          <Stat label="Acceptées" value={String(s.accepted ?? 0)} />
          <Stat label="Refusées" value={String(s.rejected ?? 0)} />
          <Stat label="Remboursé" value={formatMoney(s.refunded_minor ?? 0)} />

          <div className="rounded-xl border border-black/10 bg-white p-4 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold">Produits les plus réclamés</h3>
            {s.by_product.length === 0 ? <p className="text-sm text-black/60">Aucune donnée.</p> : (
              <ul className="text-sm">{s.by_product.slice(0, 5).map((p) => <li key={p.product_id} className="flex justify-between"><span>{p.name}</span><span className="text-black/60">{p.claims} réclamation{p.claims > 1 ? "s" : ""}</span></li>)}</ul>
            )}
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4 md:col-span-2">
            <h3 className="mb-2 text-sm font-semibold">Coût imputé</h3>
            {s.by_cost_bearer.length === 0 ? <p className="text-sm text-black/60">Aucune réclamation acceptée.</p> : (
              <ul className="text-sm">{s.by_cost_bearer.map((c) => <li key={c.cost_bearer} className="flex justify-between"><span>{COST_BEARER_LABEL[c.cost_bearer as CostBearer] ?? c.cost_bearer}</span><span className="text-black/60">{formatMoney(c.refunded_minor)}</span></li>)}</ul>
            )}
          </div>
        </section>
      )}

      <form action="/claims" className="mb-4 flex items-center gap-2">
        <label htmlFor="status" className="text-sm font-medium">Statut</label>
        <select id="status" name="status" defaultValue={status} className="rounded-lg border border-black/20 bg-white px-3 py-1.5 text-sm">
          <option value="">Tous</option>
          {Object.entries(CLAIM_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button type="submit" className="rounded-full bg-brand-green px-4 py-1.5 text-sm font-medium text-white">Filtrer</button>
      </form>

      {claims.length === 0 ? <p className="text-black/70">Aucune réclamation{status ? " dans ce statut" : ""}.</p> : (
        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
              <tr><th scope="col" className="px-4 py-3">Réclamation</th><th scope="col" className="px-4 py-3">Commande</th><th scope="col" className="px-4 py-3">Articles</th><th scope="col" className="px-4 py-3">Statut</th><th scope="col" className="px-4 py-3 text-right">Plafond</th></tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 font-medium"><Link href={`/claims/${claim.id}`} className="text-brand-green underline">n° {claim.id}</Link></td>
                  <td className="px-4 py-3"><Link href={`/orders/${claim.order_id}`} className="underline">#{claim.order_id}</Link></td>
                  <td className="px-4 py-3">{claim.items.map((i) => `${i.name} (${ISSUE_LABEL[i.issue as Issue] ?? i.issue})`).join(", ")}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-medium ${claim.status === "open" ? "bg-brand-red/10 text-brand-red" : "bg-black/5"}`}>{CLAIM_STATUS_LABEL[claim.status] ?? claim.status}</span></td>
                  <td className="px-4 py-3 text-right">{formatMoney(claim.claimable_minor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <p className="text-xs uppercase text-black/60">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
