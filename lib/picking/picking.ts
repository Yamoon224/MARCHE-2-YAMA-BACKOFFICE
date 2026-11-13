export type SaleUnit = "piece" | "kg" | "l";

export type PickLine = {
  id: number;
  name: string;
  sale_unit: SaleUnit;
  ordered_quantity: number;
  max_quantity: number;
  substitution?: "allow" | "refuse";
  status: "pending" | "picked" | "short" | "substituted";
  picked_quantity?: number | null;
  final_name?: string | null;
  final_unit_price_minor?: number | null;
};

export const LINE_STATUS_LABEL: Record<PickLine["status"], string> = {
  pending: "À prélever",
  picked: "Prélevé",
  short: "Manquant",
  substituted: "Remplacé",
};

/** Unité de saisie : pièces, grammes ou millilitres (les quantités sont des entiers dans l'unité de base). */
export function unitSuffix(unit: SaleUnit): string {
  return unit === "piece" ? "pièce(s)" : unit === "kg" ? "g" : "ml";
}

export function formatQuantity(unit: SaleUnit, quantity: number): string {
  if (unit === "piece") return `${quantity} pièce${quantity > 1 ? "s" : ""}`;

  const [small, big] = unit === "kg" ? ["g", "kg"] : ["ml", "l"];
  return quantity < 1000 ? `${quantity} ${small}` : `${(quantity / 1000).toLocaleString("fr-FR")} ${big}`;
}

/** Convertit la saisie ("1200", " 12 ") en entier ≥ 0 ; `null` si invalide (virgule, texte, négatif, vide). */
export function parseQuantity(input: string): number | null {
  const text = input.trim();
  if (!/^\d{1,7}$/.test(text)) return null;

  return Number(text);
}

/** Message d'erreur local avant l'appel, ou `null` : le serveur reste l'autorité. */
export function validateQuantity(line: Pick<PickLine, "max_quantity" | "sale_unit">, input: string): string | null {
  const quantity = parseQuantity(input);

  if (quantity === null) return "Saisissez un nombre entier (grammes, millilitres ou pièces).";
  if (quantity > line.max_quantity) return `Maximum servable : ${formatQuantity(line.sale_unit, line.max_quantity)}.`;

  return null;
}

export function pendingCount(lines: Pick<PickLine, "status">[]): number {
  return lines.filter((l) => l.status === "pending").length;
}

export function canComplete(lines: Pick<PickLine, "status">[]): boolean {
  return lines.length > 0 && pendingCount(lines) === 0;
}

/** Écart final : négatif = à rembourser au client, positif = à encaisser. */
export function describeAdjustment(deltaMinor: number, format: (n: number) => string): string {
  if (deltaMinor === 0) return "Aucun écart : la commande est servie telle que payée.";
  if (deltaMinor < 0) return `Écart de ${format(-deltaMinor)} à rembourser au client.`;

  return `Écart de ${format(deltaMinor)} à encaisser auprès du client.`;
}
