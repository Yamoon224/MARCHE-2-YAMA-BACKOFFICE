import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DownNotice, LoadError, Stat } from "@/components/admin/notices";
import { formatMoney } from "@/lib/format";
import { dateCell } from "@/lib/table/cells";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Fiche client - Backoffice Marché de Yama" };

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="mb-2 text-sm"><Link href="/customers" className="text-brand-green underline">← Tous les clients</Link></p>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const staff = await requireStaff(`/customers/${id}`);
  if (staff.status === "down") return <DownNotice />;

  const result = await staff.api.GET("/api/v1/customers/{user}", { params: { path: { user: Number(id) } } }).catch(() => null);
  if (result?.response.status === 404) notFound();
  if (!result?.data) return <LoadError status={result?.response.status} what="la fiche client" />;

  const c = result.data.data;

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{c.name}</h1>
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <Stat label="Commandes" value={String(c.orders_count)} />
        <Stat label="Total dépensé" value={formatMoney(c.total_spent_minor)} hint="Commandes abouties" />
      </div>
      <dl className="grid gap-2 rounded-xl border border-black/10 bg-white p-4 text-sm sm:grid-cols-[10rem_1fr]">
        <dt className="text-black/60">E-mail</dt><dd>{c.email ?? "-"}</dd>
        <dt className="text-black/60">Téléphone</dt><dd>{c.phone ?? "-"}</dd>
        <dt className="text-black/60">Type</dt><dd>{c.is_guest ? "Invité (commande sans compte)" : "Compte client"}</dd>
        <dt className="text-black/60">Compte</dt><dd>{c.is_active ? "Actif" : "Désactivé"}</dd>
        <dt className="text-black/60">Inscrit le</dt><dd>{dateCell(c.created_at)?.text ?? "-"}</dd>
      </dl>
      <p className="mt-4 text-sm text-black/60">L&apos;historique détaillé des commandes se consulte depuis la liste des <Link href="/orders" className="text-brand-green underline">commandes</Link>.</p>
    </>
  );
}
