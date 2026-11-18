import { describe, expect, it, vi } from "vitest";
import { BRAND_RED, cssVariables, DEFAULT_APPEARANCE, loadAppearance, parseAppearance, readableOn, resolveTheme, saveAppearance, STORAGE_KEY, THEME_INIT_SCRIPT } from "./appearance";

describe("parseAppearance", () => {
  it("retombe sur les valeurs par défaut sans stockage ou avec une entrée corrompue", () => {
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("{pas du json")).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance("42")).toEqual(DEFAULT_APPEARANCE);
  });

  it("ne garde que des valeurs valides", () => {
    expect(parseAppearance(JSON.stringify({ theme: "dark", primary: "#2563eb", header: "#1f2937", sidebar: "#0b0f19", collapsed: true }))).toEqual({
      theme: "dark",
      primary: "#2563eb",
      header: "#1f2937",
      sidebar: "#0b0f19",
      collapsed: true,
    });
    expect(parseAppearance(JSON.stringify({ theme: "violet", primary: "red; background:url(x)", header: "javascript:1", sidebar: 3, collapsed: "oui" }))).toEqual(DEFAULT_APPEARANCE);
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
  it("laisse les barres au thème tant qu'aucun fond n'est choisi", () => {
    expect(cssVariables({ ...DEFAULT_APPEARANCE, primary: "#2563eb" })).toEqual({ "--brand-red": "#2563eb" });
  });

  it("rend le texte du menu lisible sur un fond sombre", () => {
    expect(cssVariables({ ...DEFAULT_APPEARANCE, sidebar: "#0b0f19" })).toMatchObject({ "--sidebar-bg": "#0b0f19", "--sidebar-fg": "#ffffff" });
  });
});

describe("resolveTheme", () => {
  it("suit le système en mode automatique", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });

  it("garde le choix explicite quel que soit le système", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("thème enregistré", () => {
  function fakeWindow(store: Record<string, string>) {
    return {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => void (store[key] = value),
      },
    };
  }

  it("se conserve puis se relit", () => {
    const store: Record<string, string> = {};
    vi.stubGlobal("window", fakeWindow(store));

    saveAppearance({ ...DEFAULT_APPEARANCE, theme: "dark" });

    expect(JSON.parse(store[STORAGE_KEY]).theme).toBe("dark");
    expect(loadAppearance().theme).toBe("dark");

    vi.unstubAllGlobals();
  });

  it("vaut « auto » sans choix enregistré", () => {
    vi.stubGlobal("window", fakeWindow({}));
    expect(loadAppearance().theme).toBe("auto");
    vi.unstubAllGlobals();
  });
});

describe("THEME_INIT_SCRIPT", () => {
  function run(stored: string | null, prefersDark: boolean): string | null {
    let attribute: string | null = null;
    const window = {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: prefersDark }),
    };
    const document = { documentElement: { setAttribute: (_: string, value: string) => void (attribute = value) } };

    new Function("window", "document", THEME_INIT_SCRIPT)(window, document);

    return attribute;
  }

  it("applique le même thème que resolveTheme", () => {
    expect(run(JSON.stringify({ theme: "dark" }), false)).toBe("dark");
    expect(run(JSON.stringify({ theme: "light" }), true)).toBe("light");
    expect(run(JSON.stringify({ theme: "auto" }), true)).toBe("dark");
    expect(run(null, false)).toBe("light");
    expect(run(null, true)).toBe("dark");
  });

  it("ne casse pas sur un stockage corrompu", () => {
    expect(() => run("{pas du json", true)).not.toThrow();
  });
});
