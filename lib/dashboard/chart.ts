/** Géométrie du graphique des ventes (SVG maison) : pure, donc testable sans navigateur. */
export type Bar = { x: number; y: number; width: number; height: number; value: number; index: number };

/** Plus petit « beau » maximum (1, 2, 2,5, 5 × 10ⁿ) au-dessus de la valeur : sert à graduer l'axe. */
export function niceMax(value: number): number {
  if (!(value > 0)) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value) ?? 10;

  return step * magnitude;
}

/** Graduations de 0 au maximum, en `count` intervalles égaux. */
export function yTicks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, i) => (max / count) * i);
}

/** Barres d'une série dans une zone de tracé ; une valeur nulle garde une barre de hauteur 0. */
export function barLayout(values: number[], width: number, height: number, max: number, gap = 0.25): Bar[] {
  if (values.length === 0) return [];

  const slot = width / values.length;
  const barWidth = Math.max(1, slot * (1 - gap));

  return values.map((value, index) => {
    const h = max > 0 ? Math.min(height, (Math.max(0, value) / max) * height) : 0;
    return { x: index * slot + (slot - barWidth) / 2, y: height - h, width: barWidth, height: h, value, index };
  });
}

/** Indices des étiquettes de l'axe horizontal : une tous les n jours pour rester lisible. */
export function labelIndexes(count: number, maxLabels = 8): number[] {
  if (count <= 0) return [];

  const every = Math.ceil(count / maxLabels);
  const indexes: number[] = [];
  for (let i = 0; i < count; i += every) indexes.push(i);

  return indexes;
}

/** Montant court pour l'axe : 12 500 € -> « 12,5 k€ ». Entrée en centimes. */
export function compactEuros(minor: number): string {
  const euros = minor / 100;
  const format = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

  if (Math.abs(euros) >= 1_000_000) return `${format(euros / 1_000_000)} M€`;
  if (Math.abs(euros) >= 1_000) return `${format(euros / 1_000)} k€`;
  return `${format(euros)} €`;
}

/** « 2026-11-05 » -> « 05/11 » (axe) ; le jour complet reste dans l'info-bulle et le tableau. */
export function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

export function fullDay(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}
