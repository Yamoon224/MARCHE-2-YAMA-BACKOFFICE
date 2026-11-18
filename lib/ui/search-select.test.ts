import { describe, expect, it } from "vitest";
import { filterOptions, labelOf, moveActive, type SelectOption } from "./search-select";

const options: SelectOption[] = [
  { value: "1", label: "Épicerie salée" },
  { value: "2", label: "Boucherie - Poissonnerie", hint: "viande" },
  { value: "3", label: "Fruits et légumes" },
  { value: "4", label: "Ça va" },
];

describe("filterOptions", () => {
  it("garde tout sans saisie", () => {
    expect(filterOptions(options, "")).toHaveLength(4);
    expect(filterOptions(options, "   ")).toHaveLength(4);
  });

  it("ignore accents et casse", () => {
    expect(filterOptions(options, "epicerie").map((o) => o.value)).toEqual(["1"]);
    expect(filterOptions(options, "LEGUMES").map((o) => o.value)).toEqual(["3"]);
    expect(filterOptions(options, "ca").map((o) => o.value)).toEqual(["4"]);
  });

  it("exige tous les mots, dans n'importe quel ordre, et lit l'indice", () => {
    expect(filterOptions(options, "poisson bouch").map((o) => o.value)).toEqual(["2"]);
    expect(filterOptions(options, "viande").map((o) => o.value)).toEqual(["2"]);
    expect(filterOptions(options, "fruits salée")).toEqual([]);
  });
});

describe("moveActive", () => {
  it("boucle aux extrémités", () => {
    expect(moveActive(0, -1, 3)).toBe(2);
    expect(moveActive(2, 1, 3)).toBe(0);
    expect(moveActive(1, 1, 3)).toBe(2);
  });

  it("part du début ou de la fin quand rien n'est actif, et gère une liste vide", () => {
    expect(moveActive(-1, 1, 3)).toBe(0);
    expect(moveActive(-1, -1, 3)).toBe(2);
    expect(moveActive(0, 1, 0)).toBe(-1);
  });
});

describe("labelOf", () => {
  it("retrouve le libellé d'une valeur", () => {
    expect(labelOf(options, "3")).toBe("Fruits et légumes");
    expect(labelOf(options, "x")).toBe("");
  });
});
