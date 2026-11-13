/** Rôles qui rappellent un lot (miroir de `inventory.manage`, le serveur reste l'autorité). */
const RECALLERS = new Set(["admin", "stock_keeper"]);

export function canRecall(role: string): boolean {
  return RECALLERS.has(role);
}

/**
 * Jours entiers entre `todayIso` et `expiresOn` (deux dates AAAA-MM-JJ, comparées en UTC pour qu'un fuseau
 * horaire ne décale jamais d'un jour). Négatif : déjà périmé. `null` : lot sans date limite.
 */
export function daysUntil(expiresOn: string | null | undefined, todayIso: string): number | null {
  if (!expiresOn || !/^\d{4}-\d{2}-\d{2}$/.test(expiresOn) || !/^\d{4}-\d{2}-\d{2}$/.test(todayIso)) return null;

  const day = 86_400_000;

  return Math.round((Date.parse(`${expiresOn}T00:00:00Z`) - Date.parse(`${todayIso}T00:00:00Z`)) / day);
}

export type ExpiryTone = "expired" | "soon" | "ok" | "none";

/** « Bientôt » = 3 jours ou moins : seuil d'alerte de péremption proche. */
export const SOON_DAYS = 3;

export function expiryTone(days: number | null): ExpiryTone {
  if (days === null) return "none";
  if (days < 0) return "expired";

  return days <= SOON_DAYS ? "soon" : "ok";
}

export function expiryLabel(days: number | null): string {
  if (days === null) return "Sans date limite";
  if (days < 0) return `Périmé depuis ${-days} j`;
  if (days === 0) return "Périme aujourd'hui";
  if (days === 1) return "Périme demain";

  return `Dans ${days} j`;
}

export function validateRecallReason(reason: string): string | null {
  return reason.trim().length < 3 ? "Indiquez le motif du rappel (3 caractères minimum)." : null;
}

/** Date du jour AAAA-MM-JJ (UTC), injectable pour les tests. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
