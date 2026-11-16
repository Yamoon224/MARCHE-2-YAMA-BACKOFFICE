import { parseEuros } from "../format";
/** Rôles qui reçoivent les espèces des livreurs (miroir de `cash.receive`, le serveur reste l'autorité). */
const RECEIVERS = new Set(["admin", "order_operator"]);

export function canReceiveCash(role: string): boolean {
  return RECEIVERS.has(role);
}

/** Montant compté en euros : positif ou nul (ex. 25 ou 25,50) (un sac vide est un cas réel), `null` si invalide. */
export function parseCounted(input: string): number | null {
  return parseEuros(input);
}

/** Écart = compté - attendu ; négatif = manquant. */
export function variance(counted: number, held: number): number {
  return counted - held;
}

export function validateHandover(countedInput: string, heldMinor: number, note: string): string | null {
  const counted = parseCounted(countedInput);

  if (counted === null) return "Saisissez le montant compté, en euros (ex. 25,50 ; 0 si rien n'a été remis).";
  if (counted !== heldMinor && note.trim().length < 3) return "Le montant compté diffère du montant attendu : expliquez l'écart.";

  return null;
}

export function varianceLabel(varianceMinor: number): string {
  if (varianceMinor === 0) return "Aucun écart";

  return varianceMinor < 0 ? "Manquant" : "Excédent";
}
