import type { components } from "@/lib/api/schema";

type Banner = components["schemas"]["Banner"];

/** Ordre du carrousel : position croissante, puis ancienneté (id) pour départager. */
export function sortBanners(banners: Banner[]): Banner[] {
  return [...banners].sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.id - b.id);
}

export function bannerStateLabel(active: boolean): string {
  return active ? "Affichée" : "Masquée";
}

const text = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const optional = (data: FormData, key: string) => text(data, key) || null;

/** Corps de requête depuis le formulaire : un ordre vide ou invalide retombe sur 0, et jamais négatif. */
export function bannerBody(data: FormData) {
  const position = Number.parseInt(text(data, "position"), 10);

  return {
    title: text(data, "title"),
    eyebrow: optional(data, "eyebrow"),
    text: optional(data, "text"),
    cta_label: text(data, "label"),
    cta_url: text(data, "url"),
    image_url: optional(data, "image"),
    position: Number.isNaN(position) ? 0 : Math.max(0, position),
    is_active: data.get("active") === "on",
  };
}
