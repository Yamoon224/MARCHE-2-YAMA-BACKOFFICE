"use client";

import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { productState, SALE_UNIT_LABEL, STATE_LABEL, type ProductState, type TrashedFilter } from "@/lib/catalog/products";
import { formatMoney } from "@/lib/format";
import { ProductFormModal, type Product } from "./ProductFormModal";
import { danger, Feedback, field, primary, useAction } from "./shared";

type Category = components["schemas"]["Category"];

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; product: Product }
  | { kind: "details"; product: Product }
  | { kind: "delete"; product: Product }
  | null;

type Props = { products: Product[]; categories: Category[]; query: string; trashed: TrashedFilter; category: string };

const STATE_CLASS: Record<ProductState, string> = {
  online: "bg-brand-green/10 text-brand-green",
  hidden: "bg-black/10 text-black/70",
  deleted: "bg-brand-red/10 text-brand-red",
};

const small = "rounded-lg border border-black/20 bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-40";

function StateBadge({ product }: { product: Product }) {
  const state = productState(product);
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>;
}

function Cover({ product, className }: { product: Product; className: string }) {
  const url = product.cover ?? product.image_url;

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- image servie par l'API
    <img src={url} alt={product.name} loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} grid place-items-center bg-black/5 text-2xl font-bold text-black/30`}>{product.name.charAt(0).toUpperCase()}</span>
  );
}

export function ProductsAdmin({ products, categories, query, trashed, category }: Props) {
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [dialog, setDialog] = useState<Dialog>(null);
  const { run, busy, message, setMessage } = useAction();
  const categoryName = (id?: number) => categories.find((c) => c.id === id)?.name ?? "-";

  function remove(product: Product) {
    void run(
      () => browserApi().DELETE("/api/v1/catalog/products/{product}", { params: { path: { product: product.id } } }),
      `« ${product.name} » supprimé. Il peut être restauré en affichant les produits supprimés.`,
      () => setDialog(null),
    );
  }

  function restore(product: Product) {
    void run(
      () => browserApi().POST("/api/v1/catalog/products/{product}/restore", { params: { path: { product: product.id } } }),
      `« ${product.name} » restauré.`,
      () => setDialog(null),
    );
  }

  function actions(product: Product) {
    const deleted = productState(product) === "deleted";

    return (
      <span className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setDialog({ kind: "details", product })} className={small}>Détails</button>
        {deleted ? (
          <button type="button" disabled={busy} onClick={() => restore(product)} className={small}>Restaurer</button>
        ) : (
          <>
            <button type="button" onClick={() => setDialog({ kind: "edit", product })} className={small}>Modifier</button>
            <button type="button" onClick={() => setDialog({ kind: "delete", product })} className={`${small} text-brand-red`}>Supprimer</button>
          </>
        )}
      </span>
    );
  }

  const tabClass = (active: boolean) =>
    `-mb-px border-b-2 px-5 py-3 text-sm font-medium ${active ? "border-brand-green text-brand-green" : "border-transparent text-black/60 hover:text-black"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <form role="search" action="/catalog" className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="section" value="produits" />
          <label className="text-xs font-medium">Recherche
            <input name="q" defaultValue={query} placeholder="Nom ou référence…" className={`${field} w-48`} />
          </label>
          <label className="text-xs font-medium">Rayon
            <select name="category" defaultValue={category} className={`${field} w-44`}>
              <option value="">Tous les rayons</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium">Affichage
            <select name="trashed" defaultValue={trashed} className={`${field} w-52`}>
              <option value="">Produits actifs</option>
              <option value="with">Actifs et supprimés</option>
              <option value="only">Supprimés seulement</option>
            </select>
          </label>
          <button type="submit" className={primary}>Filtrer</button>
        </form>
        <button type="button" onClick={() => { setMessage(null); setDialog({ kind: "create" }); }} className={primary}>+ Nouveau produit</button>
      </div>

      <Feedback message={message} />

      <div role="tablist" aria-label="Mode d'affichage" className="flex border-b border-black/10">
        <button role="tab" type="button" id="tab-grid" aria-selected={tab === "grid"} aria-controls="panel-products" onClick={() => setTab("grid")} className={tabClass(tab === "grid")}>Grille</button>
        <button role="tab" type="button" id="tab-list" aria-selected={tab === "list"} aria-controls="panel-products" onClick={() => setTab("list")} className={tabClass(tab === "list")}>Liste</button>
        <span className="ml-auto self-center text-xs text-black/60">{products.length} produit{products.length > 1 ? "s" : ""}</span>
      </div>

      <div role="tabpanel" id="panel-products" aria-labelledby={tab === "grid" ? "tab-grid" : "tab-list"}>
        {products.length === 0 ? (
          <p className="rounded-lg bg-black/5 p-6 text-center text-sm text-black/60">Aucun produit ne correspond.</p>
        ) : tab === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {products.map((p) => (
              <li key={p.id} data-testid="product-card" className={`flex flex-col overflow-hidden rounded-xl border border-black/10 bg-white ${productState(p) === "deleted" ? "opacity-70" : ""}`}>
                <Cover product={p} className="aspect-square w-full" />
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-black/50">{p.sku} · {categoryName(p.category_id)}</p>
                  <p className="flex items-center gap-2 text-sm">
                    {p.compare_at_price_minor ? <s className="text-black/50">{formatMoney(p.compare_at_price_minor)}</s> : null}
                    <b>{formatMoney(p.price_minor)}</b>
                  </p>
                  <p className="flex flex-wrap gap-1">
                    <StateBadge product={p} />
                    {p.is_featured && <span className="rounded-full bg-brand-green/10 px-2 py-0.5 text-xs text-brand-green">Best seller</span>}
                    <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs">{p.images?.length ?? 0} image{(p.images?.length ?? 0) > 1 ? "s" : ""}</span>
                  </p>
                  <div className="mt-auto pt-2">{actions(p)}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <DataTable
            name="produits"
            title="Produits"
            emptyMessage="Aucun produit."
            columns={[
              { header: "Image", actions: true },
              { header: "Produit" },
              { header: "Référence" },
              { header: "Rayon" },
              { header: "Prix", type: "number", align: "right" },
              { header: "Images", type: "number", align: "right" },
              { header: "État" },
              { header: "Actions", actions: true },
            ]}
            rows={products.map((p) => ({
              key: p.id,
              cells: [
                { value: null, node: <Cover product={p} className="h-12 w-12 rounded-lg" /> },
                p.name,
                p.sku,
                categoryName(p.category_id),
                { value: p.price_minor, text: formatMoney(p.price_minor), node: <b>{formatMoney(p.price_minor)}</b> },
                p.images?.length ?? 0,
                { value: STATE_LABEL[productState(p)], node: <StateBadge product={p} /> },
                { value: null, node: actions(p) },
              ],
            }))}
          />
        )}
      </div>

      {dialog?.kind === "create" && <ProductFormModal product={null} categories={categories} onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && <ProductFormModal product={dialog.product} categories={categories} onClose={() => setDialog(null)} />}

      {dialog?.kind === "details" && (
        <ProductDetails
          product={dialog.product}
          categoryName={categoryName(dialog.product.category_id)}
          onClose={() => setDialog(null)}
          onEdit={() => setDialog({ kind: "edit", product: dialog.product })}
          onDelete={() => setDialog({ kind: "delete", product: dialog.product })}
          onRestore={() => restore(dialog.product)}
          busy={busy}
        />
      )}

      <Modal
        open={dialog?.kind === "delete"}
        onClose={() => setDialog(null)}
        title="Supprimer ce produit ?"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setDialog(null)} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Annuler</button>
            <button type="button" disabled={busy} onClick={() => dialog?.kind === "delete" && remove(dialog.product)} className={danger}>{busy ? "Suppression…" : "Oui, supprimer"}</button>
          </>
        }
      >
        {dialog?.kind === "delete" && (
          <div className="space-y-2 text-sm">
            <p>Vous allez supprimer <b>« {dialog.product.name} »</b> ({dialog.product.sku}).</p>
            <p className="text-black/70">Le produit disparaît de la vitrine et des nouvelles commandes. Les commandes déjà passées le conservent, et vous pourrez le restaurer à tout moment depuis le filtre « Supprimés seulement ».</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

type DetailsProps = {
  product: Product;
  categoryName: string;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRestore: () => void;
  busy: boolean;
};

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" });

function ProductDetails({ product, categoryName, onClose, onEdit, onDelete, onRestore, busy }: DetailsProps) {
  const images = [...(product.images ?? [])].sort((a, b) => a.position - b.position);
  const [selected, setSelected] = useState(0);
  const current = images[selected]?.url ?? product.cover ?? product.image_url ?? null;
  const deleted = productState(product) === "deleted";

  const rows: [string, string][] = [
    ["Référence", product.sku],
    ["Code-barres", product.barcode ?? "-"],
    ["Rayon", categoryName],
    ["Vente", SALE_UNIT_LABEL[product.sale_unit] ?? product.sale_unit],
    ["Prix TTC", formatMoney(product.price_minor)],
    ["Ancien prix", product.compare_at_price_minor ? formatMoney(product.compare_at_price_minor) : "-"],
    ["TVA", product.vat_rate_bp != null ? `${(product.vat_rate_bp / 100).toLocaleString("fr-FR")} %` : "-"],
    ["Périssable", product.perishable ? "Oui" : "Non"],
    ["Poids variable", product.is_weight_variable ? "Oui" : "Non"],
    ["Best seller", product.is_featured ? "Oui" : "Non"],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      title={product.name}
      size="xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Fermer</button>
          {deleted ? (
            <button type="button" disabled={busy} onClick={onRestore} className={primary}>Restaurer</button>
          ) : (
            <>
              <button type="button" onClick={onDelete} className={danger}>Supprimer</button>
              <button type="button" onClick={onEdit} className={primary}>Modifier</button>
            </>
          )}
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element -- image servie par l'API
            <img src={current} alt={product.name} className="aspect-square w-full rounded-xl object-cover" />
          ) : (
            <span aria-hidden="true" className="grid aspect-square w-full place-items-center rounded-xl bg-black/5 text-6xl font-bold text-black/30">{product.name.charAt(0).toUpperCase()}</span>
          )}
          {images.length > 1 && (
            <ul className="mt-3 flex gap-2 overflow-x-auto">
              {images.map((image, index) => (
                <li key={image.id}>
                  <button type="button" onClick={() => setSelected(index)} aria-label={`Voir l'image ${index + 1}`} aria-current={index === selected} className={`block rounded-lg border-2 ${index === selected ? "border-brand-green" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- vignette */}
                    <img src={image.url} alt="" className="h-16 w-16 rounded-md object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="space-y-3 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <StateBadge product={product} />
            {deleted && product.deleted_at && <span className="text-xs text-black/60">le {dateTime.format(new Date(product.deleted_at))}</span>}
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            {rows.map(([label, value]) => (
              <div key={label} className="contents"><dt className="text-black/60">{label}</dt><dd className="font-medium">{value}</dd></div>
            ))}
          </dl>
          <div>
            <p className="text-black/60">Description</p>
            <p className="whitespace-pre-line">{product.description || "Aucune description."}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
