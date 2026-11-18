import { normalize } from "@/lib/table/table";

export type SelectOption = { value: string; label: string; hint?: string };

/** Options dont le libellé (ou l'indice) contient tous les mots saisis, sans tenir compte des accents ni de la casse. */
export function filterOptions<T extends SelectOption>(options: readonly T[], query: string): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...options];

  return options.filter((option) => {
    const text = normalize(`${option.label} ${option.hint ?? ""}`);
    return words.every((word) => text.includes(word));
  });
}

/** Nouvel indice actif après une flèche : on boucle aux extrémités ; -1 quand la liste est vide. */
export function moveActive(current: number, delta: 1 | -1, count: number): number {
  if (count === 0) return -1;
  if (current < 0) return delta === 1 ? 0 : count - 1;

  return (current + delta + count) % count;
}

/** Libellé affiché pour la valeur choisie ; vide quand rien n'est choisi. */
export function labelOf(options: readonly SelectOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? "";
}
