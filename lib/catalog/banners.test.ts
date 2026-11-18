import { describe, expect, it } from "vitest";
import { bannerBody, bannerStateLabel, sortBanners } from "./banners";

const banner = (id: number, position?: number) => ({ id, title: `B${id}`, cta_label: "Voir", cta_url: "/", position });

describe("sortBanners", () => {
  it("range par position puis par id, sans modifier la liste d'origine", () => {
    const list = [banner(3, 2), banner(1, 5), banner(2, 2), banner(4)];

    expect(sortBanners(list).map((b) => b.id)).toEqual([4, 2, 3, 1]);
    expect(list.map((b) => b.id)).toEqual([3, 1, 2, 4]);
  });
});

describe("bannerBody", () => {
  function form(values: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    return data;
  }

  it("nettoie les textes et convertit la case à cocher", () => {
    const body = bannerBody(form({ title: "  Promo ", eyebrow: " ", label: "Voir", url: "/aisles", position: "3", active: "on", image: "" }));

    expect(body).toEqual({ title: "Promo", eyebrow: null, text: null, cta_label: "Voir", cta_url: "/aisles", image_url: null, position: 3, is_active: true });
  });

  it("met l'ordre à 0 s'il est vide, invalide ou négatif, et masque si la case est décochée", () => {
    expect(bannerBody(form({ title: "A", position: "" })).position).toBe(0);
    expect(bannerBody(form({ title: "A", position: "abc" })).position).toBe(0);
    expect(bannerBody(form({ title: "A", position: "-4" })).position).toBe(0);
    expect(bannerBody(form({ title: "A" })).is_active).toBe(false);
  });
});

describe("bannerStateLabel", () => {
  it("nomme l'état", () => {
    expect(bannerStateLabel(true)).toBe("Affichée");
    expect(bannerStateLabel(false)).toBe("Masquée");
  });
});
