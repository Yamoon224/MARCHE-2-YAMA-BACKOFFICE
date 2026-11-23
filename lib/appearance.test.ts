
import { describe, expect, it, vi, afterEach } from "vitest";

import {
  BRAND_RED,
  cssVariables,
  DEFAULT_APPEARANCE,
  loadAppearance,
  parseAppearance,
  readableOn,
  resolveTheme,
  saveAppearance,
  STORAGE_KEY,
  THEME_INIT_SCRIPT,
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

  it("force Light même si Dark ou Auto est enregistré", () => {
    for (const theme of ["dark", "auto", "violet", "light"]) {
      const result = parseAppearance(
        JSON.stringify({
          theme,
          primary: "#2563eb",
          header: "#1f2937",
          sidebar: "#0b0f19",
          collapsed: true,
        })
      );

      expect(result.theme).toBe("light");
      expect(result.primary).toBe("#2563eb");
      expect(result.header).toBe("#1f2937");
      expect(result.sidebar).toBe("#0b0f19");
      expect(result.collapsed).toBe(true);
    }
  });

  it("ignore les valeurs invalides", () => {
    expect(
      parseAppearance(
        JSON.stringify({
          theme: "dark",
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

describe("resolveTheme", () => {
  it("retourne toujours Light", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("light", false)).toBe("light");
  });
});

describe("thème enregistré", () => {
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

  it("enregistre toujours Light même si Dark est demandé", () => {
    const store: Record<string, string> = {};

    vi.stubGlobal("window", fakeWindow(store));

    saveAppearance({
      ...DEFAULT_APPEARANCE,
      theme: "light",
    });

    expect(JSON.parse(store[STORAGE_KEY]).theme).toBe("light");
    expect(loadAppearance().theme).toBe("light");
  });

  it("retourne Light sans préférence enregistrée", () => {
    vi.stubGlobal("window", fakeWindow({}));

    expect(loadAppearance().theme).toBe("light");
  });

  it("remplace une ancienne préférence Dark par Light au chargement", () => {
    const store = {
      [STORAGE_KEY]: JSON.stringify({
        ...DEFAULT_APPEARANCE,
        theme: "dark",
      }),
    };

    vi.stubGlobal("window", fakeWindow(store));

    expect(loadAppearance().theme).toBe("light");
  });
});

describe("THEME_INIT_SCRIPT", () => {
  function run(stored: string | null) {
    let attribute: string | null = null;
    let colorScheme = "";

    const store: Record<string, string> = {};

    const localStorage = {
      getItem: () => stored,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    };

    const document = {
      documentElement: {
        setAttribute: (_: string, value: string) => {
          attribute = value;
        },
        style: {
          set colorScheme(value: string) {
            colorScheme = value;
          },
        },
      },
    };

    new Function(
      "localStorage",
      "document",
      THEME_INIT_SCRIPT
    )(localStorage, document);

    return { attribute, colorScheme, store };
  }

  it("force Light même si Dark est enregistré", () => {
    const result = run(
      JSON.stringify({ theme: "dark" })
    );

    expect(result.attribute).toBe("light");
    expect(result.colorScheme).toBe("only light");
    expect(JSON.parse(result.store[STORAGE_KEY]).theme).toBe("light");
  });

  it("force Light même si Auto est enregistré", () => {
    const result = run(
      JSON.stringify({ theme: "auto" })
    );

    expect(result.attribute).toBe("light");
    expect(result.colorScheme).toBe("only light");
  });

  it("force Light sans préférence enregistrée", () => {
    const result = run(null);

    expect(result.attribute).toBe("light");
    expect(result.colorScheme).toBe("only light");
  });

  it("ne casse pas avec un stockage corrompu", () => {
    expect(() => run("{pas du json")).not.toThrow();
  });

  it("conserve les autres personnalisations enregistrées", () => {
    const result = run(
      JSON.stringify({
        theme: "dark",
        primary: "#2563eb",
        sidebar: "#1f2937",
      })
    );

    const saved = JSON.parse(result.store[STORAGE_KEY]);

    expect(saved.theme).toBe("light");
    expect(saved.primary).toBe("#2563eb");
    expect(saved.sidebar).toBe("#1f2937");
  });
});
