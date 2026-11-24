import { Suspense } from "react";
import { ProductsAdmin } from "@/components/catalog/ProductsAdmin";
import { parsePerPage, parseTrashed } from "@/lib/catalog/products";
import { pageNumber } from "@/components/admin/notices";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Produits - Backoffice Marché de Yama" };

type SearchParams = Promise<{ q?: string | string[]; trashed?: string | string[]; category?: string | string[]; page?: string | string[]; per_page?: string | string[] }>;

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

  const page = pageNumber(raw.page);
  const perPage = parsePerPage(raw.per_page);

  const staff = await requireStaff("/products");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  if (!["admin", "catalog_manager"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer les produits.</p>;
  }

  const [products, categories] = await Promise.all([
    staff.api
      .GET("/api/v1/catalog/products", { params: { query: { q: q || undefined, trashed: trashed || undefined, category_id: category ? Number(category) : undefined, per_page: perPage, page } } })
      .catch(() => null),
    staff.api.GET("/api/v1/catalog/categories").catch(() => null),
  ]);

  const list = products?.data?.data ?? [];

  return products?.data && categories?.data
    ? <ProductsAdmin products={list} categories={categories.data.data ?? []} query={q} trashed={trashed} category={category} page={products.data.meta?.current_page ?? page} lastPage={products.data.meta?.last_page ?? 1} total={products.data.meta?.total ?? list.length} perPage={perPage} canPurge={staff.user.role === "admin"} />
    : <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Chargement impossible. Réessayez.</p>;
}
