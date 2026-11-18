import { formatMoney } from "@/lib/format";

/** Cellule de montant : triée sur les centimes, affichée et exportée en euros. */
export function moneyCell(minor: number) {
  const text = formatMoney(minor);
  return { value: minor, text, node: text };
}

/** Cellule de date AAAA-MM-JJ ou ISO : triée sur la date, affichée en JJ/MM/AAAA (avec l'heure si demandée). */
export function dateCell(iso: string | null | undefined, withTime = false) {
  if (!iso) return null;
  const text = withTime ? formatDateTime(iso) : formatDay(iso);
  return { value: iso, text, node: text };
}

function formatDay(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

/** « 18/11/2026 14:05 », à l'heure de Paris. */
export function formatDateTime(iso: string): string {
  const time = new Date(iso);
  return Number.isNaN(time.getTime()) ? iso : DATE_TIME.format(time).replace(",", "");
}
