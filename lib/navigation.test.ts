import { describe, expect, it } from "vitest";
import { groupedNavFor, isActive, landingFor } from "./navigation";

const hrefs = (role: string) => groupedNavFor(role).flatMap((g) => g.items.map((i) => i.href));

describe("groupedNavFor", () => {
  it("range le menu de l'administrateur par groupes, sans rien perdre", () => {
    const groups = groupedNavFor("admin");

    expect(groups.map((g) => g.label)).toEqual(["Pilotage", "Opérations", "Produits", "Clients", "Finances", "Administration"]);
    expect(groups.flatMap((g) => g.items).length).toBe(16);
    expect(groups.find((g) => g.label === "Administration")?.items.map((i) => i.href)).toEqual(["/staff", "/audit"]);
  });

  it("ne garde que les pages du rôle", () => {
    expect(groupedNavFor("courier")).toEqual([{ label: "Opérations", items: [{ href: "/my-route", label: "Ma tournée" }] }]);
    expect(hrefs("accountant")).toEqual(["/dashboard", "/reports", "/orders", "/accounting"]);
    expect(groupedNavFor("customer")).toEqual([]);
  });

  it("réserve équipe et audit à l'administrateur", () => {
    for (const role of ["order_operator", "accountant", "support", "marketing", "catalog_manager", "picker"]) {
      expect(hrefs(role)).not.toContain("/staff");
      expect(hrefs(role)).not.toContain("/audit");
    }
  });

  it("donne les pages de gestion aux bons rôles", () => {
    expect(hrefs("marketing")).toEqual(["/banners", "/promotions"]);
    expect(hrefs("support")).toContain("/customers");
    expect(hrefs("order_operator")).toEqual(expect.arrayContaining(["/dashboard", "/reports", "/customers"]));
    expect(hrefs("order_operator")).not.toContain("/promotions");
    expect(hrefs("picker")).not.toContain("/dashboard");
  });

  it("confie les bannières au catalogue et au marketing", () => {
    for (const role of ["admin", "catalog_manager", "marketing"]) expect(hrefs(role)).toContain("/banners");
    for (const role of ["support", "accountant", "order_operator", "picker"]) expect(hrefs(role)).not.toContain("/banners");
  });
});

describe("landingFor", () => {
  it("ouvre le tableau de bord pour qui y a accès, les commandes sinon", () => {
    expect(landingFor("admin")).toBe("/dashboard");
    expect(landingFor("accountant")).toBe("/dashboard");
    expect(landingFor("order_operator")).toBe("/dashboard");
    expect(landingFor("support")).toBe("/orders");
    expect(landingFor("courier")).toBe("/orders");
    expect(landingFor("")).toBe("/orders");
  });
});

describe("isActive", () => {
  it("allume une entrée sur sa page et en dessous, sans confondre les préfixes", () => {
    expect(isActive("/orders", "/orders")).toBe(true);
    expect(isActive("/orders", "/orders/12")).toBe(true);
    expect(isActive("/orders", "/orders-archive")).toBe(false);
    expect(isActive("/stock", "/orders")).toBe(false);
    expect(isActive("/customers", "/customers/4")).toBe(true);
  });
});
