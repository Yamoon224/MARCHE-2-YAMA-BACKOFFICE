"use client";

import { SearchSelect } from "@/components/SearchSelect";
import { Btn } from "@/components/Btn";
import { useState } from "react";
import { DataTable } from "@/components/DataTable";
import { Modal } from "@/components/Modal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { PER_PAGE_OPTIONS, productState, SALE_UNIT_LABEL, STATE_LABEL, type ProductState, type TrashedFilter } from "@/lib/catalog/products";
import { extractApiError, formatMoney } from "@/lib/format";
import { ProductImportModal } from "./ProductImportModal";
import { ProductFormModal, type Product } from "./ProductFormModal";
import { danger, Feedback, field, primary, useAction } from "./shared";

type Category = components["schemas"]["Category"];

type Dialog =
  | { kind: "create" }
  | { kind: "import" }
  | { kind: "purge" }
  | { kind: "edit"; product: Product }
  | { kind: "details"; product: Product }
  | { kind: "delete"; product: Product }
  | null;

type Props = { products: Product[]; categories: Category[]; query: string; trashed: TrashedFilter; category: string; page: number; lastPage: number; total: number; perPage: number; canPurge: boolean };

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

export function ProductsAdmin({ products, categories, query, trashed, category, page, lastPage, total, perPage, canPurge }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"grid" | "list">("grid");
  const [dialog, setDialog] = useState<Dialog>(null);

  /** Adresse d'une page de résultats : les filtres sont conservés, seule la page (ou la taille) change. */
  const href = (target: number, size = perPage) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (trashed) params.set("trashed", trashed);
    if (category) params.set("category", category);
    if (size !== 15) params.set("per_page", String(size));
    if (target > 1) params.set("page", String(target));
    const text = params.toString();
    return text ? `/products?${text}` : "/products";
  };
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
        <Btn type="button" onClick={() => setDialog({ kind: "details", product })} className={small}>Détails</Btn>
        {deleted ? (
          <Btn type="button" disabled={busy} onClick={() => restore(product)} className={small}>Restaurer</Btn>
        ) : (
          <>
            <Btn type="button" onClick={() => setDialog({ kind: "edit", product })} className={small}>Modifier</Btn>
            <Btn type="button" onClick={() => setDialog({ kind: "delete", product })} className={`${small} text-brand-red`}>Supprimer</Btn>
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
        <form role="search" action="/products" className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium">Recherche
            <input name="q" defaultValue={query} placeholder="Nom ou référence…" className={`${field} w-48`} />
          </label>
          <label className="text-xs font-medium">Rayon
            <SearchSelect name="category" defaultValue={category} emptyLabel="Tous les rayons" aria-label="Rayon" className="mt-1 w-48" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
          </label>
          <label className="text-xs font-medium">Affichage
            <SearchSelect name="trashed" defaultValue={trashed} aria-label="Affichage" className="mt-1 w-56" options={[{ value: "", label: "Produits actifs" }, { value: "with", label: "Actifs et supprimés" }, { value: "only", label: "Supprimés seulement" }]} />
          </label>
          <Btn type="submit" className={primary}>Filtrer</Btn>
        </form>
        <span className="flex flex-wrap gap-2">
          {canPurge && <Btn type="button" onClick={() => { setMessage(null); setDialog({ kind: "purge" }); }} className={danger}>Vider le catalogue</Btn>}
          <Btn type="button" onClick={() => { setMessage(null); setDialog({ kind: "import" }); }} className="rounded-full border border-brand-green px-4 py-2 text-sm font-medium text-brand-green">Importer</Btn>
          <Btn type="button" onClick={() => { setMessage(null); setDialog({ kind: "create" }); }} className={primary}>+ Nouveau produit</Btn>
        </span>
      </div>

      <Feedback message={message} />

      <div role="tablist" aria-label="Mode d'affichage" className="flex border-b border-black/10">
        <Btn role="tab" type="button" id="tab-grid" aria-selected={tab === "grid"} aria-controls="panel-products" onClick={() => setTab("grid")} className={tabClass(tab === "grid")}>Grille</Btn>
        <Btn role="tab" type="button" id="tab-list" aria-selected={tab === "list"} aria-controls="panel-products" onClick={() => setTab("list")} className={tabClass(tab === "list")}>Liste</Btn>
        <span className="ml-auto self-center text-xs text-black/60">{total} produit{total > 1 ? "s" : ""}</span>
      </div>

      <div role="tabpanel" id="panel-products" aria-labelledby={tab === "grid" ? "tab-grid" : "tab-list"}>
        {products.length === 0 ? (
          <p className="rounded-lg bg-black/5 p-6 text-center text-sm text-black/60">Aucun produit ne correspond.</p>
        ) : tab === "grid" ? (
          <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
          </>
        ) : (
          <DataTable
            name="produits"
            paginate={false}
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

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-black/70">
          Afficher
          <select value={perPage} onChange={(e) => router.push(href(1, Number(e.target.value)))} className="rounded-lg border border-black/20 bg-white px-2 py-1 text-sm">
            {PER_PAGE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          par page
        </label>
        <span className="flex items-center gap-2">
          {page > 1 ? <Link href={href(page - 1)} className={small}>Précédent</Link> : <span className={`${small} opacity-40`}>Précédent</span>}
          <span className="text-black/70">Page {page} / {lastPage}</span>
          {page < lastPage ? <Link href={href(page + 1)} className={small}>Suivant</Link> : <span className={`${small} opacity-40`}>Suivant</span>}
        </span>
        <span className="text-black/70" aria-live="polite">{total === 0 ? "0" : `${(page - 1) * perPage + 1}–${(page - 1) * perPage + products.length}`} / {total}</span>
      </nav>

      {dialog?.kind === "purge" && <PurgeModal total={total} onClose={() => setDialog(null)} />}
      {dialog?.kind === "import" && <ProductImportModal onClose={() => setDialog(null)} />}
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
            <Btn type="button" onClick={() => setDialog(null)} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Annuler</Btn>
            <Btn type="button" disabled={busy} onClick={() => dialog?.kind === "delete" && remove(dialog.product)} className={danger}>{busy ? "Suppression…" : "Oui, supprimer"}</Btn>
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
    ["Stock géré", product.track_stock ? "Oui" : "Non"],
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
          <Btn type="button" onClick={onClose} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Fermer</Btn>
          {deleted ? (
            <Btn type="button" disabled={busy} onClick={onRestore} className={primary}>Restaurer</Btn>
          ) : (
            <>
              <Btn type="button" onClick={onDelete} className={danger}>Supprimer</Btn>
              <Btn type="button" onClick={onEdit} className={primary}>Modifier</Btn>
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
                  <Btn type="button" onClick={() => setSelected(index)} aria-label={`Voir l'image ${index + 1}`} aria-current={index === selected} className={`block rounded-lg border-2 ${index === selected ? "border-brand-green" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- vignette */}
                    <img src={image.url} alt="" className="h-16 w-16 rounded-md object-cover" />
                  </Btn>
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

/**
 * Vide tout le catalogue, en deux confirmations : « VIDER » pour les produits, puis « SUPPRIMER » dès que des
 * commandes contiennent ces produits (elles sont supprimées avec leurs factures, paiements, livraisons…).
 */
function PurgeModal({ total, onClose }: { total: number; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"products" | "orders">("products");
  const [orders, setOrders] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function purge(withOrders: boolean) {
    const { error: apiError } = await browserApi().DELETE("/api/v1/catalog/products", {
      body: withOrders ? { confirm: "VIDER", confirm_orders: "SUPPRIMER" } : { confirm: "VIDER" },
    });
    if (apiError) return setError(extractApiError(apiError));
    onClose();
    router.push("/products");
    router.refresh();
  }

  /** Première étape validée : s'il y a des commandes liées, on demande une confirmation de plus ; sinon on supprime. */
  async function next() {
    setBusy(true);
    setError(null);

    try {
      const { data, error: apiError } = await browserApi().GET("/api/v1/catalog/products/purge-preview");
      if (apiError || !data) return setError(extractApiError(apiError));

      const linked = data.data?.orders ?? 0;
      if (linked > 0) {
        setOrders(linked);
        setText("");
        setStep("orders");
      } else await purge(false);
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrders() {
    setBusy(true);
    setError(null);

    try {
      await purge(true);
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const cancel = <Btn type="button" onClick={onClose} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Annuler</Btn>;
  const errorBox = error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-brand-red">{error}</p>;

  if (step === "orders") {
    return (
      <Modal
        open
        onClose={onClose}
        title="Supprimer aussi les commandes liées ?"
        size="md"
        footer={
          <>
            {cancel}
            <Btn type="button" disabled={busy || text !== "SUPPRIMER"} onClick={() => void confirmOrders()} className={danger}>
              {busy ? "Suppression…" : `Supprimer produits et ${orders} commande${orders > 1 ? "s" : ""}`}
            </Btn>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-brand-red">
            <b>{orders} commande{orders > 1 ? "s" : ""}</b> contiennent ces produits. Pour vider le catalogue, elles seront <b>supprimées définitivement</b>.
          </p>
          <p>Seront effacés avec chaque commande : ses lignes et son historique, ses paiements et remboursements, sa facture et ses avoirs, ses réclamations (photos comprises), sa préparation, sa livraison et son créneau, son ticket de caisse et ses réservations de stock.</p>
          <p className="text-black/70">Le grand livre comptable est en écriture seule : ses écritures sont conservées. Annuler ici abandonne tout : aucun produit ni aucune commande n’est supprimé.</p>
          <label className="block font-medium">
            Pour confirmer, tapez <b>SUPPRIMER</b>
            <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={field} />
          </label>
          {errorBox}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Vider le catalogue ?"
      size="md"
      footer={
        <>
          {cancel}
          <Btn type="button" disabled={busy || text !== "VIDER"} onClick={() => void next()} className={danger}>{busy ? "Vérification…" : "Continuer"}</Btn>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <p>Tous les produits de la base vont être <b>supprimés définitivement</b> (même ceux déjà supprimés), avec leurs images et leur place dans les recettes. Les rayons sont conservés.</p>
        <p className="text-black/70">Les commandes qui contiennent ces produits devront aussi être supprimées : une confirmation supplémentaire vous sera demandée à l’étape suivante. Aucune restauration n’est possible.</p>
        <label className="block font-medium">
          Pour confirmer, tapez <b>VIDER</b>{total > 0 && ` (${total} produit${total > 1 ? "s" : ""} concerné${total > 1 ? "s" : ""})`}
          <input value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" className={field} />
        </label>
        {errorBox}
      </div>
    </Modal>
  );
}
