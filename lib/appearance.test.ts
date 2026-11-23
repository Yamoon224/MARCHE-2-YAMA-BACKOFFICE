
import { describe, expect, it, vi, afterEach } from "vitest";

import {
  BRAND_RED,
  cssVariables,
  DEFAULT_APPEARANCE,
  loadAppearance,
  parseAppearance,
  readableOn,
  saveAppearance,
  STORAGE_KEY,
} from "./appearance";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseAppearance", () => {
  it("retourne les valeurs par défaut sans stockage ou avec une entrée corrompue", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("{pas du json")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("42")).toEqual(DEFAULT_APPEARANCE);
  });

  it("charge les préférences enregistrées", () => {
    const result = parseAppearance(
      JSON.stringify({ primary: "#2563eb", header: "#1f2937", sidebar: "#0b0f19", collapsed: true })
    );

    expect(result).toEqual({ primary: "#2563eb", header: "#1f2937", sidebar: "#0b0f19", collapsed: true });
  });

  it("ignore les valeurs invalides", () => {
    expect(
      parseAppearance(
        JSON.stringify({
          primary: "red; background:url(x)",
          header: "javascript:1",
          sidebar: 3,
          collapsed: "oui",
        })
      )
    ).toEqual(DEFAULT_APPEARANCE);
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
  it("conserve les couleurs personnalisées", () => {
    expect(
      cssVariables({
        ...DEFAULT_APPEARANCE,
        primary: "#2563eb",
      })
    ).toEqual({
      "--brand-red": "#2563eb",
    });
  });

  it("rend le texte lisible sur un fond sombre personnalisé", () => {
    expect(
      cssVariables({
        ...DEFAULT_APPEARANCE,
        sidebar: "#0b0f19",
      })
    ).toMatchObject({
      "--sidebar-bg": "#0b0f19",
      "--sidebar-fg": "#ffffff",
    });
  });
});

describe("préférences enregistrées", () => {
  function fakeWindow(store: Record<string, string>) {
    return {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value;
        },
      },
    };
  }

  it("enregistre puis recharge les préférences", () => {
    const store: Record<string, string> = {};

    vi.stubGlobal("window", fakeWindow(store));

    const appearance = { ...DEFAULT_APPEARANCE, primary: "#2563eb" };
    saveAppearance(appearance);

    expect(JSON.parse(store[STORAGE_KEY])).toEqual(appearance);
    expect(loadAppearance()).toEqual(appearance);
  });

  it("retourne les valeurs par défaut sans préférence enregistrée", () => {
    vi.stubGlobal("window", fakeWindow({}));

    expect(loadAppearance()).toEqual(DEFAULT_APPEARANCE);
  });
});
