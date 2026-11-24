import { Suspense } from "react";
import { ProductsAdmin } from "@/components/catalog/ProductsAdmin";
import { parseTrashed } from "@/lib/catalog/products";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Produits - Backoffice Marché de Yama" };

type SearchParams = Promise<{ q?: string | string[]; trashed?: string | string[]; category?: string | string[] }>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Produits</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  const trashed = parseTrashed(raw.trashed);
  const category = typeof raw.category === "string" && /^\d+$/.test(raw.category) ? raw.category : "";

  const staff = await requireStaff("/products");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  if (!["admin", "catalog_manager"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer les produits.</p>;
  }

  const fetchPage = (page: number) =>
    staff.api.GET("/api/v1/catalog/products", { params: { query: { q: q || undefined, trashed: trashed || undefined, per_page: 200, page } } }).catch(() => null);

  const [products, categories] = await Promise.all([fetchPage(1), staff.api.GET("/api/v1/catalog/categories").catch(() => null)]);

  // L'API plafonne à 200 produits par page : on charge les pages suivantes pour afficher tout le catalogue.
  const all = [...(products?.data?.data ?? [])];
  const lastPage = products?.data?.meta?.last_page ?? 1;
  if (lastPage > 1) {
    const rest = await Promise.all(Array.from({ length: lastPage - 1 }, (_, i) => fetchPage(i + 2)));
    if (rest.some((r) => !r?.data)) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Chargement impossible. Réessayez.</p>;
    for (const r of rest) all.push(...(r?.data?.data ?? []));
  }

  const list = all.filter((p) => !category || String(p.category_id) === category);

  return products?.data && categories?.data
    ? <ProductsAdmin products={list} categories={categories.data.data ?? []} query={q} trashed={trashed} category={category} />
    : <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Chargement impossible. Réessayez.</p>;
}
