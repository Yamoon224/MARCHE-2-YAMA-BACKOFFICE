const EUR = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

/** Montant en centimes d'euro -> "12,90 €". */
export function formatMoney(amountMinor: number): string {
  return EUR.format(amountMinor / 100).replace(/[\u00a0\u202f]/g, " ");
}

/** Centimes -> texte de saisie en euros : 1250 -> "12,50". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Saisie d'un montant en euros ("12", "12,5", "12.50", "1 250,00") -> centimes entiers ; `null` si invalide.
 * Au plus deux décimales, jamais de signe ni d'exposant.
 */
export function parseEuros(input: string): number | null {
  const text = input.replace(/[\s\u00a0\u202f]/g, "");
  const match = /^(\d{1,7})(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) return null;

  return Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
}
/** Message lisible à partir d'une réponse d'erreur Laravel (validation 422 ou message simple). */
export function extractApiError(error: unknown, fallback = "Une erreur est survenue. Réessayez."): string {
  if (error && typeof error === "object") {
    const { errors, message } = error as { errors?: Record<string, string[]>; message?: string };
    const first = errors ? Object.values(errors).flat()[0] : undefined;

    if (first) return first;
    if (message) return message;
  }

  return fallback;
}

/** N'accepte qu'un chemin interne : empêche une redirection ouverte via `?next=`. */
export function safeNext(next: string | null | undefined, fallback = "/orders"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}
