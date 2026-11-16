import { parseEuros } from "../format";
/** Rôles autorisés à rembourser (miroir de la permission `payments.refund` du serveur, qui reste l'autorité). */
const REFUND_ROLES = new Set(["admin", "support"]);

export function canRefund(role: string): boolean {
  return REFUND_ROLES.has(role);
}

export const KIND_LABEL: Record<string, string> = {
  adjustment: "Écart de préparation",
  cancellation: "Annulation",
  manual: "Geste commercial",
  late_payment: "Paiement tardif",
};

export const REFUND_STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  succeeded: "Remboursé",
  failed: "Échec — repris automatiquement",
};

/**
 * Convertit la saisie d'un montant en euros (ex. 12,50 ; sans signe) en centimes ; `null` si invalide.
 * Les montants sont toujours des entiers dans la plus petite unité monétaire.
 */
export function parseAmount(input: string): number | null {
  const amount = parseEuros(input);

  return amount !== null && amount > 0 ? amount : null;
}

export function validateRefund(amountInput: string, reason: string, refundableMinor: number | null): string | null {
  const amount = parseAmount(amountInput);

  if (amount === null) return "Saisissez un montant en euros (ex. 12,50), supérieur à zéro.";
  if (reason.trim().length < 3) return "Indiquez le motif du remboursement (3 caractères minimum).";
  if (refundableMinor !== null && amount > refundableMinor) return "Le montant dépasse ce qui reste remboursable.";

  return null;
}

type RefundLike = { amount_minor: number; status: string };

/** Montant encore remboursable : encaissé − remboursements réussis ou en attente (un échec ne compte pas). */
export function remainingRefundable(collectedMinor: number, refunds: RefundLike[]): number {
  const refunded = refunds.filter((r) => r.status !== "failed").reduce((sum, r) => sum + r.amount_minor, 0);

  return Math.max(0, collectedMinor - refunded);
}
