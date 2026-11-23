
/** Réglages d'apparence du backoffice (thème clair uniquement ; couleurs et préférences personnalisables). */

export type Appearance = {
  primary: string;
  header: string | null;
  sidebar: string | null;
  collapsed: boolean;
};

export const STORAGE_KEY = "yama_backoffice_appearance";

export const BRAND_RED = "#c1121f";

export const PRIMARY_COLORS = [
  BRAND_RED,
  "#3f7d2c",
  "#2563eb",
  "#4f46e5",
  "#9333ea",
  "#e11d48",
  "#c2410c",
  "#b45309",
  "#0f766e",
  "#475569",
] as const;

export const BACKGROUND_PRESETS = [
  "#ffffff",
  "#f1f5f9",
  "#1f2937",
  "#0b0f19",
  "#14532d",
  "#7f1d1d",
  "#1d4ed8",
] as const;

export const DEFAULT_APPEARANCE: Appearance = {
  primary: BRAND_RED,
  header: null,
  sidebar: null,
  collapsed: false,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

/** Noir ou blanc selon la lisibilité WCAG. */
export function readableOn(hex: string): "#ffffff" | "#111111" {
  if (!isHexColor(hex)) return "#ffffff";

  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  };

  const luminance =
    0.2126 * channel(1) +
    0.7152 * channel(3) +
    0.0722 * channel(5);

  return luminance > 0.4 ? "#111111" : "#ffffff";
}

/** Charge les préférences enregistrées (valeurs invalides ignorées). */
export function parseAppearance(raw: string | null): Appearance {
  if (!raw) return DEFAULT_APPEARANCE;

  let data: Partial<Record<keyof Appearance, unknown>>;

  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return DEFAULT_APPEARANCE;
  }

  if (typeof data !== "object" || data === null) {
    return DEFAULT_APPEARANCE;
  }

  return {
    primary: isHexColor(data.primary)
      ? data.primary
      : DEFAULT_APPEARANCE.primary,
    header: isHexColor(data.header) ? data.header : null,
    sidebar: isHexColor(data.sidebar) ? data.sidebar : null,
    collapsed: data.collapsed === true,
  };
}

export function loadAppearance(): Appearance {
  try {
    return parseAppearance(
      window.localStorage.getItem(STORAGE_KEY)
    );
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

/** Enregistre les préférences. */
export function saveAppearance(appearance: Appearance): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Stockage indisponible : préférences conservées pour la session.
  }
}

/** Variables CSS des personnalisations. */
export function cssVariables(
  appearance: Appearance
): Record<string, string> {
  const variables: Record<string, string> = {
    "--brand-red": appearance.primary,
  };

  if (appearance.header) {
    variables["--header-bg"] = appearance.header;
    variables["--header-fg"] = readableOn(appearance.header);
  }

  if (appearance.sidebar) {
    variables["--sidebar-bg"] = appearance.sidebar;
    variables["--sidebar-fg"] = readableOn(appearance.sidebar);
  }

  return variables;
}

export const MANAGED_VARIABLES = [
  "--brand-red",
  "--header-bg",
  "--header-fg",
  "--sidebar-bg",
  "--sidebar-fg",
] as const;
