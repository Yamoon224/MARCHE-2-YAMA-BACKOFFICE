const XOF = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Montant en plus petite unité monétaire (F CFA : 1 unité) -> "1 200 F CFA". */
export function formatXof(amountMinor: number): string {
  return `${XOF.format(amountMinor).replace(/[  ]/g, " ")} F CFA`;
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
export function safeNext(next: string | null | undefined, fallback = "/commandes"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\") || /[\r\n]/.test(next)) return fallback;
  return next;
}
