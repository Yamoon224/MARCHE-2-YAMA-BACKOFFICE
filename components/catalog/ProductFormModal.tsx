"use client";

import { ActionIcon } from "@/components/ActionIcon";
import { SearchSelect } from "@/components/SearchSelect";
import { Btn } from "@/components/Btn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { browserApi } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { moveItem, pickImages, slugify } from "@/lib/catalog/products";
import { centsToInput, extractApiError } from "@/lib/format";
import { amount, field, optional, primary, str } from "./shared";

export type Product = components["schemas"]["Product"];
type Category = components["schemas"]["Category"];
type ProductWrite = components["schemas"]["ProductUpdate"];
type Pending = { file: File; preview: string };

type Props = {
  /** `null` : création. */
  product: Product | null;
  categories: Category[];
  onClose: () => void;
};

const ghost = "rounded-lg border border-black/20 bg-white px-2 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-40";

/** Ajout / modification d'un produit, galerie comprise. En création, les images partent juste après l'enregistrement du produit. */
export function ProductFormModal({ product: initial, categories, onClose }: Props) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const previews = useRef<string[]>([]);

  // Libère les aperçus (URL d'objets) à la fermeture.
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const images = [...(product?.images ?? [])].sort((a, b) => a.position - b.position);
  const editing = product !== null;

  /** Appel d'API sur la galerie : met à jour le produit affiché avec la réponse. */
  async function gallery(action: () => Promise<{ data?: { data?: Product }; error?: unknown }>) {
    setBusy(true);
    setError(null);

    try {
      const { data, error: failure } = await action();
      if (failure || !data?.data) return setError(extractApiError(failure, "Opération impossible. Réessayez."));
      setProduct(data.data);
      router.refresh();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function upload(id: number, files: File[]) {
    const form = new FormData();
    files.forEach((file) => form.append("images[]", file));

    return browserApi().POST("/api/v1/catalog/products/{product}/images", {
      params: { path: { product: id } },
      body: { images: [] },
      bodySerializer: () => form,
    });
  }

  function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const { accepted, error: refusal } = pickImages(list, images.length + pending.length);
    setError(refusal);
    const chosen = accepted.map((i) => list[i]);
    if (fileInput.current) fileInput.current.value = "";
    if (chosen.length === 0) return;

    if (product) {
      void gallery(() => upload(product.id, chosen));
      return;
    }

    const added = chosen.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    previews.current.push(...added.map((a) => a.preview));
    setPending((current) => [...current, ...added]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const price = amount(data, "price");
    const compare = amount(data, "compare");

    if (str(data, "name") === "") return setError("Le nom du produit est obligatoire.");
    if (price === null || Number.isNaN(price) || Number.isNaN(compare)) {
      return setError("Les prix doivent être des montants en euros (ex. 12,50).");
    }

    const common = {
      category_id: Number(str(data, "category")),
      name: str(data, "name"),
      description: optional(data, "description"),
      price_minor: price,
      compare_at_price_minor: compare,
      is_featured: data.get("featured") === "on",
      track_stock: data.get("track_stock") === "on",
      is_active: data.get("active") === "on",
    };

    setBusy(true);
    setError(null);

    try {
      if (product) {
        const { data: saved, error: failure } = await browserApi().PUT("/api/v1/catalog/products/{product}", {
          params: { path: { product: product.id } },
          body: { ...common, slug: optional(data, "slug") ?? undefined },
        });
        if (failure || !saved?.data) return setError(extractApiError(failure));
        router.refresh();
        return onClose();
      }

      const vat = Number.parseFloat(str(data, "vat").replace(",", "."));
      const body = {
        ...common,
        sku: str(data, "sku"),
        slug: optional(data, "slug") ?? slugify(str(data, "name")),
        sale_unit: str(data, "sale_unit"),
        is_weight_variable: data.get("weight") === "on",
        perishable: data.get("perishable") === "on",
        vat_rate_bp: Number.isFinite(vat) ? Math.round(vat * 100) : 0,
      } as unknown as ProductWrite;

      const { data: created, error: failure } = await browserApi().POST("/api/v1/catalog/products", { body });
      if (failure || !created?.data) return setError(extractApiError(failure));

      router.refresh();
      if (pending.length === 0) return onClose();

      const sent = await upload(created.data.id, pending.map((p) => p.file));
      if (sent.error || !sent.data?.data) {
        // Le produit existe : on passe en modification pour que les images puissent être renvoyées.
        setProduct(created.data);
        setPending([]);
        return setError(`Produit créé, mais l'envoi des images a échoué : ${extractApiError(sent.error, "réessayez depuis la galerie.")}`);
      }
      router.refresh();
      onClose();
    } catch {
      setError("Service momentanément indisponible. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const title = editing ? `Modifier « ${product.name} »` : "Nouveau produit";
  const formId = "product-form";

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          <Btn type="button" onClick={onClose} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium">Annuler</Btn>
          <Btn type="submit" form={formId} disabled={busy} className={primary}>{busy ? "Enregistrement…" : editing ? "Enregistrer" : "Créer le produit"}</Btn>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <form id={formId} onSubmit={submit} className="grid content-start gap-3 sm:grid-cols-2" noValidate>
          <label className="text-sm font-medium sm:col-span-2">Nom<input name="name" placeholder="Ex. Riz parfumé 5 kg" defaultValue={product?.name ?? ""} required maxLength={255} className={field} /></label>
          <label className="text-sm font-medium">Référence (SKU)
            <input name="sku" placeholder="Ex. RIZ-5KG" defaultValue={product?.sku ?? ""} required readOnly={editing} maxLength={40} className={`${field} ${editing ? "bg-black/5" : ""}`} />
          </label>
          <label className="text-sm font-medium">Adresse (slug)
            <input name="slug" defaultValue={product?.slug ?? ""} placeholder={editing ? undefined : "Généré depuis le nom"} className={field} />
          </label>
          <label className="text-sm font-medium">Rayon
            <SearchSelect name="category" required defaultValue={String(product?.category_id ?? categories[0]?.id ?? "")} placeholder="Choisir un rayon…" aria-label="Rayon" className="mt-1" options={categories.map((c) => ({ value: String(c.id), label: c.name }))} />
          </label>
          {!editing && (
            <label className="text-sm font-medium">Vendu
              <SearchSelect name="sale_unit" defaultValue="piece" aria-label="Mode de vente" className="mt-1" options={[{ value: "piece", label: "À la pièce" }, { value: "kg", label: "Au kilo" }, { value: "l", label: "Au litre" }]} />
            </label>
          )}
          <label className="text-sm font-medium">Prix (€)<input name="price" inputMode="decimal" defaultValue={product ? centsToInput(product.price_minor) : ""} required placeholder="Ex. 12,50" className={field} /></label>
          <label className="text-sm font-medium">Ancien prix barré (promotion)<input name="compare" inputMode="decimal" defaultValue={product?.compare_at_price_minor ? centsToInput(product.compare_at_price_minor) : ""} placeholder="Vide = pas de promo" className={field} /></label>
          {!editing && (
            <label className="text-sm font-medium">TVA (%)<input name="vat" inputMode="decimal" placeholder="Ex. 5,5" defaultValue="5,5" className={field} /></label>
          )}
          <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" rows={3} defaultValue={product?.description ?? ""} placeholder="Description visible sur la fiche produit" className={field} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="featured" defaultChecked={product?.is_featured ?? false} /> Mettre en avant (best seller)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={product?.is_active ?? true} /> Visible sur la vitrine</label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="track_stock" defaultChecked={product?.track_stock ?? false} /> Gérer le stock de ce produit (décoché : commande possible sans stock)</label>
          {!editing && (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="weight" /> Poids variable (pesée en préparation)</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="perishable" /> Produit périssable</label>
            </>
          )}
        </form>

        <section aria-label="Galerie d'images">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Images ({editing ? images.length : pending.length}/10)</h3>
            <label className={`${primary} act act-green act-solid inline-flex cursor-pointer items-center gap-1.5 text-xs ${busy ? "pointer-events-none opacity-60" : ""}`}>
              <ActionIcon name="upload" className="act-icon h-4 w-4" />
              Ajouter des images
              <input ref={fileInput} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Ajouter des images" onChange={(e) => onFiles(e.target.files)} className="sr-only" />
            </label>
          </div>
          <p className="mt-1 text-xs text-black/60">JPG, PNG ou WebP, 4 Mo maximum chacune. La première image est la couverture.{!editing && " Elles sont envoyées à la création du produit."}</p>

          {editing && images.length === 0 && <p className="mt-3 rounded-lg bg-black/5 p-4 text-center text-sm text-black/60">Aucune image.</p>}
          {!editing && pending.length === 0 && <p className="mt-3 rounded-lg bg-black/5 p-4 text-center text-sm text-black/60">Aucune image choisie.</p>}

          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {editing && images.map((image, index) => (
              <li key={image.id} className="rounded-xl border border-black/10 p-2" data-testid="gallery-image">
                {/* eslint-disable-next-line @next/next/no-img-element -- image servie par l'API */}
                <img src={image.url} alt={`Image ${index + 1} de ${product.name}`} className="aspect-square w-full rounded-lg object-cover" />
                <p className="mt-1 text-center text-xs">{image.is_cover ? <b className="text-brand-green">Couverture</b> : <span className="text-black/50">Image {index + 1}</span>}</p>
                <div className="mt-1 flex flex-wrap justify-center gap-1">
                  <Btn type="button" disabled={busy || index === 0} aria-label="Avancer l'image" onClick={() => void gallery(() => browserApi().PUT("/api/v1/catalog/products/{product}/images/order", { params: { path: { product: product.id } }, body: { ids: moveItem(images, index, -1).map((i) => i.id) } }))} className={ghost}>←</Btn>
                  <Btn type="button" disabled={busy || index === images.length - 1} aria-label="Reculer l'image" onClick={() => void gallery(() => browserApi().PUT("/api/v1/catalog/products/{product}/images/order", { params: { path: { product: product.id } }, body: { ids: moveItem(images, index, 1).map((i) => i.id) } }))} className={ghost}>→</Btn>
                  {!image.is_cover && <Btn type="button" disabled={busy} onClick={() => void gallery(() => browserApi().POST("/api/v1/catalog/products/{product}/images/{image}/cover", { params: { path: { product: product.id, image: image.id } } }))} action="confirm" className={ghost}>Couverture</Btn>}
                  <Btn type="button" disabled={busy} aria-label="Supprimer l'image" onClick={() => void gallery(() => browserApi().DELETE("/api/v1/catalog/products/{product}/images/{image}", { params: { path: { product: product.id, image: image.id } } }))} className={`${ghost} text-brand-red`}>Supprimer</Btn>
                </div>
              </li>
            ))}
            {!editing && pending.map((item, index) => (
              <li key={item.preview} className="rounded-xl border border-black/10 p-2" data-testid="pending-image">
                {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local avant envoi */}
                <img src={item.preview} alt={`Aperçu ${item.file.name}`} className="aspect-square w-full rounded-lg object-cover" />
                <p className="mt-1 truncate text-center text-xs">{index === 0 ? <b className="text-brand-green">Couverture</b> : item.file.name}</p>
                <div className="mt-1 flex justify-center gap-1">
                  <Btn type="button" disabled={index === 0} aria-label="Avancer l'image" onClick={() => setPending((p) => moveItem(p, index, -1))} className={ghost}>←</Btn>
                  <Btn type="button" disabled={index === pending.length - 1} aria-label="Reculer l'image" onClick={() => setPending((p) => moveItem(p, index, 1))} className={ghost}>→</Btn>
                  <Btn type="button" aria-label="Retirer l'image" onClick={() => setPending((p) => p.filter((_, i) => i !== index))} className={`${ghost} text-brand-red`}>Retirer</Btn>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}
    </Modal>
  );
}
