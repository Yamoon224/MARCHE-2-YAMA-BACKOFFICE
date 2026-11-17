import Link from "next/link";
import { Suspense } from "react";
import { BannersAdmin } from "@/components/catalog/BannersAdmin";
import { CategoriesAdmin } from "@/components/catalog/CategoriesAdmin";
import { ProductsAdmin } from "@/components/catalog/ProductsAdmin";
import { RecipesAdmin } from "@/components/catalog/RecipesAdmin";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Catalogue - Backoffice Marché de Yama" };

type SearchParams = Promise<{ section?: string | string[]; q?: string | string[] }>;

const SECTIONS = [
  { value: "produits", label: "Produits" },
  { value: "rayons", label: "Rayons" },
  { value: "bannieres", label: "Bannières" },
  { value: "recettes", label: "Recettes" },
] as const;

export default function CataloguePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
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

  const staff = await requireStaff("/catalogue");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  if (!["admin", "catalog_manager"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer le catalogue.</p>;
  }

  return (
    <div className="space-y-4">
      <nav aria-label="Sections du catalogue" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.value}
            href={`/catalogue?section=${s.value}`}
            aria-current={s.value === section ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium ${s.value === section ? "border-brand-green bg-brand-green text-white" : "border-black/20 bg-white"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <Suspense key={`${section}${q}`} fallback={<p className="text-black/60">Chargement…</p>}>
        <Section section={section} q={q} api={staff.api} />
      </Suspense>
    </div>
  );
}

async function Section({ section, q, api }: { section: (typeof SECTIONS)[number]["value"]; q: string; api: StaffApi }) {
  const failed = <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Chargement impossible. Réessayez.</p>;

  if (section === "rayons") {
    const r = await api.GET("/api/v1/catalog/categories").catch(() => null);
    return r?.data ? <CategoriesAdmin categories={r.data.data ?? []} /> : failed;
  }

  if (section === "bannieres") {
    const r = await api.GET("/api/v1/catalog/banners").catch(() => null);
    return r?.data ? <BannersAdmin banners={r.data.data ?? []} /> : failed;
  }

  if (section === "recettes") {
    const [recipes, products] = await Promise.all([
      api.GET("/api/v1/catalog/recipes").catch(() => null),
      api.GET("/api/v1/catalog/products", { params: { query: { per_page: 200 } } }).catch(() => null),
    ]);
    return recipes?.data && products?.data ? <RecipesAdmin recipes={recipes.data.data ?? []} products={products.data.data} /> : failed;
  }

  const [products, categories] = await Promise.all([
    api.GET("/api/v1/catalog/products", { params: { query: { q: q || undefined } } }).catch(() => null),
    api.GET("/api/v1/catalog/categories").catch(() => null),
  ]);

  return products?.data && categories?.data
    ? <ProductsAdmin products={products.data.data} categories={categories.data.data ?? []} query={q} />
    : failed;
}

type StaffApi = Extract<Awaited<ReturnType<typeof requireStaff>>, { status: "ok" }>["api"];