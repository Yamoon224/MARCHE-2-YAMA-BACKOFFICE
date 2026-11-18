export type TrashedFilter = "" | "with" | "only";

export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const SALE_UNIT_LABEL: Record<string, string> = { piece: "À la pièce", kg: "Au kilo", l: "Au litre" };

/** Valeur du filtre « supprimés » lue dans l'adresse : tout ce qui n'est pas connu retombe sur « actifs seulement ». */
export function parseTrashed(value: unknown): TrashedFilter {
  return value === "with" || value === "only" ? value : "";
}

/** « Crème Fraîche 20 cl » -> « creme-fraiche-20-cl » (format exigé par l'API). */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

/** Déplace l'élément d'indice `index` de `delta` rangs (-1 = vers le début) ; renvoie la liste inchangée si impossible. */
export function moveItem<T>(items: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;

  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);

  return next;
}

/** Indices des fichiers acceptés (JPG/PNG/WebP, 4 Mo) dans la limite de la galerie ; `error` explique ce qui a été écarté. */
export function pickImages(files: { name: string; type: string; size: number }[], alreadyThere: number): { accepted: number[]; error: string | null } {
  const accepted: number[] = [];
  let error: string | null = null;

  files.forEach((file, index) => {
    if (!IMAGE_TYPES.includes(file.type)) error = `« ${file.name} » : seuls les formats JPG, PNG et WebP sont acceptés.`;
    else if (file.size > MAX_IMAGE_BYTES) error = `« ${file.name} » dépasse 4 Mo.`;
    else if (alreadyThere + accepted.length >= MAX_IMAGES) error = `Une galerie contient ${MAX_IMAGES} images au plus.`;
    else accepted.push(index);
  });

  return { accepted, error };
}

export type ProductState = "deleted" | "hidden" | "online";

export function productState(product: { deleted_at?: string | null; is_active?: boolean }): ProductState {
  if (product.deleted_at) return "deleted";
  return product.is_active === false ? "hidden" : "online";
}

export const STATE_LABEL: Record<ProductState, string> = { deleted: "Supprimé", hidden: "Masqué", online: "En ligne" };
