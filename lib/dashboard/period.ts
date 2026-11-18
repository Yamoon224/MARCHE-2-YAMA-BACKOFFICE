/** Périodes des tableaux de bord et rapports : dates AAAA-MM-JJ, jours inclus. */
export type Period = { from: string; to: string };

const DAY_MS = 86_400_000;
export const MAX_PERIOD_DAYS = 366;
export const DEFAULT_PERIOD_DAYS = 30;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function parseDay(value: string): number | null {
  if (!ISO_DAY.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  // Date.parse accepte « 2026-02-31 » en le décalant : on exige l'aller-retour exact.
  return Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value ? null : time;
}

function formatDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Jour courant à Paris (AAAA-MM-JJ), pour que serveur et navigateur s'accordent. */
export function todayParis(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function shiftDay(day: string, days: number): string {
  const time = parseDay(day);
  if (time === null) throw new Error(`Date invalide : ${day}`);
  return formatDay(time + days * DAY_MS);
}

/** Nombre de jours d'une période, bornes comprises. */
export function periodDays(period: Period): number {
  const from = parseDay(period.from);
  const to = parseDay(period.to);
  if (from === null || to === null) return 0;
  return Math.round((to - from) / DAY_MS) + 1;
}

/**
 * Période demandée dans l'adresse : valeurs invalides ignorées, bornes remises dans l'ordre,
 * durée limitée à un an (la limite du serveur), jamais au-delà d'aujourd'hui.
 */
export function resolvePeriod(from: string | undefined, to: string | undefined, today: string): Period {
  const end = to && parseDay(to) !== null && to <= today ? to : today;
  let start = from && parseDay(from) !== null ? from : shiftDay(end, -(DEFAULT_PERIOD_DAYS - 1));

  if (start > end) start = end;
  if (periodDays({ from: start, to: end }) > MAX_PERIOD_DAYS) start = shiftDay(end, -(MAX_PERIOD_DAYS - 1));

  return { from: start, to: end };
}

export const PRESETS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
  { label: "1 an", days: 365 },
] as const;

export function presetPeriod(days: number, today: string): Period {
  return { from: shiftDay(today, -(days - 1)), to: today };
}
