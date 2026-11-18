import { describe, expect, it } from "vitest";
import { groupedNavFor, isActive } from "./navigation";

describe("groupedNavFor", () => {
  it("range le menu de l'administrateur par groupes, sans rien perdre", () => {
    const groups = groupedNavFor("admin");

    expect(groups.map((g) => g.label)).toEqual(["Opérations", "Produits", "Clients", "Finances"]);
    expect(groups.flatMap((g) => g.items).length).toBe(9);
  });

  it("ne garde que les pages du rôle", () => {
    expect(groupedNavFor("courier")).toEqual([{ label: "Opérations", items: [{ href: "/my-route", label: "Ma tournée" }] }]);
    expect(groupedNavFor("accountant").flatMap((g) => g.items.map((i) => i.href))).toEqual(["/orders", "/accounting"]);
    expect(groupedNavFor("customer")).toEqual([]);
  });
});

describe("isActive", () => {
  it("allume une entrée sur sa page et en dessous, sans confondre les préfixes", () => {
    expect(isActive("/orders", "/orders")).toBe(true);
    expect(isActive("/orders", "/orders/12")).toBe(true);
    expect(isActive("/orders", "/orders-archive")).toBe(false);
    expect(isActive("/stock", "/orders")).toBe(false);
  });
});
