/** Libellés et mises en forme des détails d'une commande (client, paiements, livraison). */

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  mobile_money: "Mobile money",
  card: "Carte bancaire",
  cash_on_delivery: "Espèces à la livraison",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  pending_on_delivery: "À encaisser à la livraison",
  succeeded: "Payé",
  failed: "Échoué",
  flagged: "À vérifier",
};

export const DELIVERY_STATUS_LABEL: Record<string, string> = {
  pending: "À assigner",
  assigned: "Livreur assigné",
  out_for_delivery: "En cours de livraison",
  delivered: "Livrée",
  failed: "Échec de livraison",
  returned: "Retournée au magasin",
};

export const CHANNEL_LABEL: Record<string, string> = { online: "Boutique en ligne", pos: "Caisse du magasin" };

export const label = (table: Record<string, string>, key: string | null | undefined): string => (key ? (table[key] ?? key) : "-");

/** Adresse de livraison (quartier, repère, coordonnées) -> lignes lisibles ; vide si absente. */
export function addressLines(address: unknown): string[] {
  if (!address || typeof address !== "object") return [];

  const { neighborhood, landmark, latitude, longitude } = address as Record<string, unknown>;
  const lines: string[] = [];

  if (typeof neighborhood === "string" && neighborhood.trim()) lines.push(neighborhood.trim());
  if (typeof landmark === "string" && landmark.trim()) lines.push(`Repère : ${landmark.trim()}`);
  if (typeof latitude === "number" && typeof longitude === "number") lines.push(`GPS : ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

  return lines;
}
