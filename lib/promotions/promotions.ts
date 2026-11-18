import { formatMoney } from "@/lib/format";

export const PROMOTION_STATE_LABEL: Record<string, string> = {
  active: "Actif",
  scheduled: "Programmé",
  expired: "Expiré",
  exhausted: "Épuisé",
  disabled: "Désactivé",
};

/** « 10 % » ou « 5,00 € » selon le type (la valeur fixe est en centimes). */
export function promotionValueLabel(type: string, value: number): string {
  return type === "percent" ? `${value} %` : formatMoney(value);
}

/** Utilisations : « 12 / 100 » ou « 12 » quand il n'y a pas de plafond. */
export function usageLabel(used: number, max: number | null | undefined): string {
  return max ? `${used} / ${max}` : String(used);
}

/** Date ISO de l'API -> valeur d'un champ datetime-local (heure locale du navigateur), vide si absente. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valeur d'un champ datetime-local -> date ISO (UTC) pour l'API ; `null` si vide, `undefined` si invalide. */
export function fromLocalInput(value: string): string | null | undefined {
  if (value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
