/**
 * Réglages d'apparence du backoffice (couleur principale, fonds de la barre du haut et du menu latéral,
 * menu replié), conservés sur cet appareil. Fonctions pures : le fournisseur les applique au document.
 */

export type Appearance = {
  /** Couleur des boutons et accents (remplace le rouge de la marque). */
  primary: string;
  /** Fond de la barre du haut ; null = blanc. */
  header: string | null;
  /** Fond du menu latéral ; null = blanc. */
  sidebar: string | null;
  /** Menu latéral réduit aux icônes (grand écran). */
  collapsed: boolean;
};

export const STORAGE_KEY = "yama_backoffice_appearance";

export const BRAND_RED = "#c1121f";

export const PRIMARY_COLORS = [BRAND_RED, "#3f7d2c", "#2563eb", "#4f46e5", "#9333ea", "#e11d48", "#c2410c", "#b45309", "#0f766e", "#475569"] as const;

export const BACKGROUND_PRESETS = ["#ffffff", "#f1f5f9", "#1f2937", "#0b0f19", "#14532d", "#7f1d1d", "#1d4ed8"] as const;

export const DEFAULT_APPEARANCE: Appearance = { primary: BRAND_RED, header: null, sidebar: null, collapsed: false };

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Noir ou blanc, selon ce qui se lit le mieux sur la couleur donnée (luminance relative WCAG). */
export function readableOn(hex: string): "#ffffff" | "#111111" {
  if (!isHexColor(hex)) return "#ffffff";

  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);

  return luminance > 0.4 ? "#111111" : "#ffffff";
}

/** Relit ce qui a été stocké en ne gardant que des valeurs valides : une entrée corrompue ne casse jamais l'interface. */
export function parseAppearance(raw: string | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;

  let data: Partial<Record<keyof Appearance, unknown>>;
  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return DEFAULT_APPEARANCE;
  }
  if (typeof data !== "object" || data === null) return DEFAULT_APPEARANCE;

  return {
    primary: isHexColor(data.primary) ? data.primary : DEFAULT_APPEARANCE.primary,
    header: isHexColor(data.header) ? data.header : null,
    sidebar: isHexColor(data.sidebar) ? data.sidebar : null,
    collapsed: data.collapsed === true,
  };
}

export function loadAppearance(): Appearance {
  try {
    return parseAppearance(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function saveAppearance(appearance: Appearance): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Stockage indisponible : le choix ne dure que pour cette session.
  }
}

/** Variables CSS pour les choix courants. */
export function cssVariables(appearance: Appearance): Record<string, string> {
  const header = appearance.header ?? "#ffffff";
  const sidebar = appearance.sidebar ?? "#ffffff";

  return {
    "--brand-red": appearance.primary,
    "--header-bg": header,
    "--header-fg": readableOn(header),
    "--sidebar-bg": sidebar,
    "--sidebar-fg": readableOn(sidebar),
  };
}

export const MANAGED_VARIABLES = ["--brand-red", "--header-bg", "--header-fg", "--sidebar-bg", "--sidebar-fg"] as const;
