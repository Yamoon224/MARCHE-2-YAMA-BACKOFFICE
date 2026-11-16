"use client";

import { useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { formatXof } from "@/lib/format";
import { danger, Feedback, field, ImageField, int, optional, primary, Section, str, useAction } from "./shared";

type Recipe = components["schemas"]["Recipe"];
type Product = components["schemas"]["Product"];
type Row = { key: number; productId: string; quantity: string };

const UNIT: Record<string, string> = { piece: "pièces", kg: "grammes", l: "millilitres" };
let nextKey = 1;

function IngredientRows({ rows, setRows, products }: { rows: Row[]; setRows: (r: Row[]) => void; products: Product[] }) {
  const unitOf = (id: string) => UNIT[products.find((p) => String(p.id) === id)?.sale_unit ?? "piece"];
  const patch = (key: number, change: Partial<Row>) => setRows(rows.map((r) => (r.key === key ? { ...r, ...change } : r)));

  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-medium">Ingrédients</legend>
      <ul className="mt-1 space-y-2">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-center gap-2">
            <select aria-label="Produit" value={r.productId} onChange={(e) => patch(r.key, { productId: e.target.value })} className={`${field} mt-0 w-auto min-w-48 flex-1`}>
              <option value="">Choisir un produit…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input aria-label="Quantité" inputMode="numeric" value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} className={`${field} mt-0 w-24`} />
            <span className="text-xs text-black/60">{unitOf(r.productId)}</span>
            <button type="button" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} className="text-xs text-brand-red underline">Retirer</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setRows([...rows, { key: nextKey++, productId: "", quantity: "1" }])} className="mt-2 text-sm text-brand-green underline">+ Ajouter un ingrédient</button>
    </fieldset>
  );
}

function RecipeForm({ recipe, products, busy, submitLabel, onSubmit, onDelete }: {
  recipe?: Recipe; products: Product[]; busy: boolean; submitLabel: string;
  onSubmit: (body: components["schemas"]["RecipeInput"], reset: () => void) => void; onDelete?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    (recipe?.items ?? []).map((i) => ({ key: nextKey++, productId: String(i.product_id), quantity: String(i.quantity) })),
  );
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const items = rows.filter((r) => r.productId !== "");

    if (items.some((r) => !/^[1-9]\d*$/.test(r.quantity))) return setError("Chaque quantité doit être un entier supérieur à 0.");
    setError(null);

    onSubmit(
      {
        name: str(data, "name"),
        slug: str(data, "slug"),
        icon: optional(data, "icon"),
        image_url: optional(data, "image"),
        position: Number.isNaN(int(data, "position")) ? 0 : int(data, "position"),
        is_active: data.get("active") === "on",
        items: items.map((r) => ({ product_id: Number(r.productId), quantity: Number(r.quantity) })),
      },
      () => { form.reset(); setRows([]); },
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Nom<input name="name" required defaultValue={recipe?.name} className={field} /></label>
      <label className="text-sm font-medium">Identifiant d&apos;URL<input name="slug" required defaultValue={recipe?.slug} pattern="[a-z0-9]+(-[a-z0-9]+)*" className={field} /></label>
      <label className="text-sm font-medium">Icône (emoji)<input name="icon" maxLength={16} defaultValue={recipe?.icon ?? ""} className={field} /></label>
      <label className="text-sm font-medium">Position<input name="position" inputMode="numeric" defaultValue={recipe?.position ?? 0} className={field} /></label>
      <ImageField name="image" defaultValue={recipe?.image_url} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={recipe?.is_active ?? true} /> Affichée sur la vitrine</label>
      <IngredientRows rows={rows} setRows={setRows} products={products} />
      {error && <p role="alert" className="text-sm text-brand-red sm:col-span-2">{error}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" disabled={busy} className={primary}>{submitLabel}</button>
        {onDelete && <button type="button" disabled={busy} onClick={onDelete} className={danger}>Supprimer</button>}
      </div>
    </form>
  );
}

export function RecipesAdmin({ recipes, products }: { recipes: Recipe[]; products: Product[] }) {
  const { run, busy, message } = useAction();

  return (
    <div className="space-y-4">
      <Feedback message={message} />
      <ul className="space-y-2">
        {recipes.map((r) => (
          <li key={r.id} className="rounded-xl border border-black/10 bg-white">
            <details>
              <summary className="flex cursor-pointer flex-wrap justify-between gap-2 p-3 text-sm">
                <span className="font-medium"><span aria-hidden="true">{r.icon ?? "🍲"}</span> {r.name} {!r.is_active && <span className="ml-2 rounded-full bg-black/10 px-2 text-xs">Masquée</span>}</span>
                <span className="text-black/60">{r.items.length} ingrédients · {formatXof(r.total_minor)}</span>
              </summary>
              <div className="border-t border-black/10 p-3">
                <RecipeForm
                  recipe={r} products={products} busy={busy} submitLabel="Enregistrer"
                  onSubmit={(body) => void run(() => browserApi().PUT("/api/v1/catalog/recipes/{recipe}", { params: { path: { recipe: r.id } }, body }), `Recette « ${r.name} » enregistrée.`)}
                  onDelete={() => window.confirm(`Supprimer la recette « ${r.name} » ?`) && void run(() => browserApi().DELETE("/api/v1/catalog/recipes/{recipe}", { params: { path: { recipe: r.id } } }), "Recette supprimée.")}
                />
              </div>
            </details>
          </li>
        ))}
      </ul>
      <Section title="Nouvelle recette">
        <RecipeForm
          products={products} busy={busy} submitLabel="Créer la recette"
          onSubmit={(body, reset) => void run(() => browserApi().POST("/api/v1/catalog/recipes", { body }), "Recette créée.", reset)}
        />
      </Section>
    </div>
  );
}