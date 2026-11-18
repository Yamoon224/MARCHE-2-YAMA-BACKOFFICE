import { describe, expect, it } from "vitest";
import { BRAND_RED, cssVariables, DEFAULT_APPEARANCE, parseAppearance, readableOn } from "./appearance";

describe("parseAppearance", () => {
  it("retombe sur les valeurs par défaut sans stockage ou avec une entrée corrompue", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("{pas du json")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("42")).toEqual(DEFAULT_APPEARANCE);
  });

  it("ne garde que des couleurs hexadécimales valides", () => {
    expect(parseAppearance(JSON.stringify({ primary: "#2563eb", header: "#1f2937" }))).toEqual({ primary: "#2563eb", header: "#1f2937" });
    expect(parseAppearance(JSON.stringify({ primary: "red; background:url(x)", header: "javascript:1" }))).toEqual(DEFAULT_APPEARANCE);
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
  it("garde l'en-tête rouge de la marque tant qu'aucun fond n'est choisi", () => {
    expect(cssVariables({ primary: "#2563eb", header: null })).toMatchObject({ "--brand-red": "#2563eb", "--header-bg": BRAND_RED });
  });
});
