import Link from "next/link";
import { Suspense } from "react";
import { CategoriesAdmin } from "@/components/catalog/CategoriesAdmin";
import { ProductsAdmin } from "@/components/catalog/ProductsAdmin";
import { RecipesAdmin } from "@/components/catalog/RecipesAdmin";
import { parseTrashed, type TrashedFilter } from "@/lib/catalog/products";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Catalogue - Backoffice Marché de Yama" };

type SearchParams = Promise<{ section?: string | string[]; q?: string | string[]; trashed?: string | string[]; category?: string | string[] }>;

const SECTIONS = [
  { value: "produits", label: "Produits" },
  { value: "rayons", label: "Rayons" },
  { value: "recettes", label: "Recettes" },
] as const;

export default function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Catalogue de la vitrine</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Content({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const section = SECTIONS.find((s) => s.value === raw.section)?.value ?? "produits";
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  const trashed = parseTrashed(raw.trashed);
  const category = typeof raw.category === "string" && /^\d+$/.test(raw.category) ? raw.category : "";

  const staff = await requireStaff("/catalog");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  if (!["admin", "catalog_manager"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer le catalogue.</p>;
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Sections du catalogue" className="flex max-w-5xl flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.value}
            href={`/catalog?section=${s.value}`}
            aria-current={s.value === section ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${s.value === section ? "border-brand-green bg-brand-green text-white" : "border-black/20 bg-white"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <Suspense key={`${section}${q}${trashed}${category}`} fallback={<p className="text-black/60">Chargement…</p>}>
        <Section section={section} q={q} trashed={trashed} category={category} api={staff.api} />
      </Suspense>
    </div>
  );
}

async function Section({ section, q, trashed, category, api }: { section: (typeof SECTIONS)[number]["value"]; q: string; trashed: TrashedFilter; category: string; api: StaffApi }) {
  const failed = <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Chargement impossible. Réessayez.</p>;

  if (section === "rayons") {
    const r = await api.GET("/api/v1/catalog/categories").catch(() => null);
    return r?.data ? <div className="max-w-5xl"><CategoriesAdmin categories={r.data.data ?? []} /></div> : failed;
  }

  if (section === "recettes") {
    const [recipes, products] = await Promise.all([
      api.GET("/api/v1/catalog/recipes").catch(() => null),
      api.GET("/api/v1/catalog/products", { params: { query: { per_page: 200 } } }).catch(() => null),
    ]);
    return recipes?.data && products?.data ? <div className="max-w-5xl"><RecipesAdmin recipes={recipes.data.data ?? []} products={products.data.data} /></div> : failed;
  }

  const [products, categories] = await Promise.all([
    api.GET("/api/v1/catalog/products", { params: { query: { q: q || undefined, trashed: trashed || undefined, per_page: 200 } } }).catch(() => null),
    api.GET("/api/v1/catalog/categories").catch(() => null),
  ]);

  const list = (products?.data?.data ?? []).filter((p) => !category || String(p.category_id) === category);

  return products?.data && categories?.data
    ? <ProductsAdmin products={list} categories={categories.data.data ?? []} query={q} trashed={trashed} category={category} />
    : failed;
}

type StaffApi = Extract<Awaited<ReturnType<typeof requireStaff>>, { status: "ok" }>["api"];