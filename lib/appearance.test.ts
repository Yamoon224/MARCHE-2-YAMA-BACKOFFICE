import { describe, expect, it } from "vitest";
import { BRAND_RED, cssVariables, DEFAULT_APPEARANCE, parseAppearance, readableOn } from "./appearance";

describe("parseAppearance", () => {
  it("retombe sur les valeurs par défaut sans stockage ou avec une entrée corrompue", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("{pas du json")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("42")).toEqual(DEFAULT_APPEARANCE);
  });

  it("ne garde que des valeurs valides", () => {
    expect(parseAppearance(JSON.stringify({ primary: "#2563eb", header: "#1f2937", sidebar: "#0b0f19", collapsed: true }))).toEqual({
      primary: "#2563eb",
      header: "#1f2937",
      sidebar: "#0b0f19",
      collapsed: true,
    });
    expect(parseAppearance(JSON.stringify({ primary: "red; background:url(x)", header: "javascript:1", sidebar: 3, collapsed: "oui" }))).toEqual(DEFAULT_APPEARANCE);
  });
});

describe("readableOn", () => {
  it("choisit un texte lisible", () => {
    expect(readableOn("#ffffff")).toBe("#111111");
    expect(readableOn("#0b0f19")).toBe("#ffffff");
    expect(readableOn(BRAND_RED)).toBe("#ffffff");
  });
});

describe("cssVariables", () => {
  it("garde les barres blanches tant qu'aucun fond n'est choisi", () => {
    expect(cssVariables({ ...DEFAULT_APPEARANCE, primary: "#2563eb" })).toMatchObject({
      "--brand-red": "#2563eb",
      "--header-bg": "#ffffff",
      "--sidebar-bg": "#ffffff",
      "--sidebar-fg": "#111111",
    });
  });

  it("rend le texte du menu lisible sur un fond sombre", () => {
    expect(cssVariables({ ...DEFAULT_APPEARANCE, sidebar: "#0b0f19" })).toMatchObject({ "--sidebar-bg": "#0b0f19", "--sidebar-fg": "#ffffff" });
  });
});
