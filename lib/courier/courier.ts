export type DeliveryStatus = "pending" | "assigned" | "out_for_delivery" | "delivered" | "failed" | "returned";

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "À affecter",
  assigned: "Affectée",
  out_for_delivery: "En route",
  delivered: "Livrée",
  failed: "Échec de livraison",
  returned: "Retournée au magasin",
};

/** Le code de confirmation du client compte exactement 6 chiffres. */
export function isValidCode(input: string): boolean {
  return /^\d{6}$/.test(input.trim());
}

/** Espèces encaissées en F CFA : entier ≥ 0 (0 = commande déjà payée) ; `null` si invalide. */
export function parseCash(input: string): number | null {
  const text = input.replace(/[\s  ]/g, "");
  if (text === "") return 0;
  if (!/^\d{1,9}$/.test(text)) return null;

  return Number(text);
}

export function validateHandover(code: string, cashInput: string): string | null {
  if (!isValidCode(code)) return "Saisissez le code à 6 chiffres donné par le client.";
  if (parseCash(cashInput) === null) return "Saisissez un montant entier en F CFA (0 si déjà payée).";

  return null;
}

/** Actions proposées au livreur selon l'état de la livraison. */
export function courierActions(status: DeliveryStatus): { start: boolean; handover: boolean; fail: boolean; location: boolean } {
  return {
    start: status === "assigned" || status === "failed", // repartir après un échec
    handover: status === "out_for_delivery",
    fail: status === "out_for_delivery",
    location: status === "out_for_delivery",
  };
}

/** Envoie la position au plus une fois par intervalle : économise la batterie et le réseau 3G. */
export function shouldSendLocation(lastSentAt: number | null, now: number, intervalMs = 20_000): boolean {
  return lastSentAt === null || now - lastSentAt >= intervalMs;
}

export type Address = { neighborhood?: string; landmark?: string | null; latitude?: number | null; longitude?: number | null } | null | undefined;

export function formatAddress(address: Address): string {
  if (!address) return "Adresse non renseignée";

  return [address.neighborhood, address.landmark].filter(Boolean).join(" — ") || "Adresse non renseignée";
}

/** Lien de navigation vers le point de livraison, ou `null` si l'adresse n'a pas de coordonnées. */
export function mapsUrl(address: Address): string | null {
  if (!address || typeof address.latitude !== "number" || typeof address.longitude !== "number") return null;

  return `https://www.openstreetmap.org/?mlat=${address.latitude}&mlon=${address.longitude}#map=17/${address.latitude}/${address.longitude}`;
}

/** Lien d'appel : seuls les chiffres et un « + » initial sont conservés. */
export function telUrl(phone: string | null | undefined): string | null {
  const cleaned = (phone ?? "").replace(/[^\d+]/g, "");

  return /^\+?\d{8,15}$/.test(cleaned) ? `tel:${cleaned}` : null;
}
