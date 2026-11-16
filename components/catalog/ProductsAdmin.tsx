"use client";

import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatXof } from "@/lib/format";
import type { FormEvent } from "react";
import { amount, Feedback, field, ImageField, optional, primary, str, useAction } from "./shared";

type Product = components["schemas"]["Product"];
type Category = components["schemas"]["Category"];

export function ProductsAdmin({ products, categories, query }: { products: Product[]; categories: Category[]; query: string }) {
  const { run, busy, message, setMessage } = useAction();

  function save(product: Product, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const price = amount(data, "price");
    const compare = amount(data, "compare");

    if (price === null || Number.isNaN(price) || Number.isNaN(compare)) {
      return setMessage({ kind: "error", text: "Les prix doivent être des montants entiers en F CFA." });
    }

    void run(
      () => browserApi().PUT("/api/v1/catalog/products/{product}", {
        params: { path: { product: product.id } },
        body: {
          category_id: Number(str(data, "category")),
          description: optional(data, "description"),
          image_url: optional(data, "image"),
          price_minor: price,
          compare_at_price_minor: compare,
          is_featured: data.get("featured") === "on",
          is_active: data.get("active") === "on",
        },
      }),
      `« ${product.name} » enregistré.`,
    );
  }

  return (
    <div className="space-y-4">
      <form role="search" className="flex gap-2">
        <input name="q" defaultValue={query} placeholder="Nom ou référence…" aria-label="Rechercher un produit" className={`${field} max-w-xs`} />
        <button type="submit" className={primary}>Rechercher</button>
      </form>
      <Feedback message={message} />
      {products.length === 0 && <p className="text-sm text-black/60">Aucun produit.</p>}
      <ul className="space-y-2">
        {products.map((p) => (
          <li key={p.id} className="rounded-xl border border-black/10 bg-white">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="font-medium">{p.name} <span className="text-black/50">· {p.sku}</span></span>
                <span className="flex items-center gap-2">
                  {p.compare_at_price_minor ? <s className="text-black/50">{formatXof(p.compare_at_price_minor)}</s> : null}
                  <b>{formatXof(p.price_minor)}</b>
                  {p.is_featured && <span className="rounded-full bg-brand-green/10 px-2 text-xs text-brand-green">Best seller</span>}
                  {!p.is_active && <span className="rounded-full bg-black/10 px-2 text-xs">Masqué</span>}
                </span>
              </summary>
              <form onSubmit={(e) => save(p, e)} className="grid gap-3 border-t border-black/10 p-3 sm:grid-cols-2" noValidate>
                <label className="text-sm font-medium">Prix (F CFA)<input name="price" inputMode="numeric" defaultValue={p.price_minor} required placeholder="Ex. 1500" className={field} /></label>
                <label className="text-sm font-medium">Ancien prix barré (promotion)<input name="compare" inputMode="numeric" defaultValue={p.compare_at_price_minor ?? ""} placeholder="Vide = pas de promo" className={field} /></label>
                <label className="text-sm font-medium">Rayon
                  <select name="category" defaultValue={p.category_id} className={field}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <ImageField name="image" defaultValue={p.image_url} />
                <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" rows={2} placeholder="Description visible sur la fiche produit" defaultValue={p.description ?? ""} className={field} /></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={p.is_featured} /> Mettre en avant (best seller)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.is_active} /> Visible sur la vitrine</label>
                <div className="sm:col-span-2"><button type="submit" disabled={busy} className={primary}>Enregistrer</button></div>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}