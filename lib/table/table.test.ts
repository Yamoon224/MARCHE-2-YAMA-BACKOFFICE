import { describe, expect, it } from "vitest";
import { fileName, isNumericColumn, toCsv, toTxt } from "./export";
import { matchingIndexes, nextSort, pageWindow, rangeLabel, sortedIndexes } from "./table";

describe("sortedIndexes", () => {
  it("trie les nombres comme des nombres", () => {
    expect(sortedIndexes([10, 9, 100], "number", "asc")).toEqual([1, 0, 2]);
    expect(sortedIndexes([10, 9, 100], "number", "desc")).toEqual([2, 0, 1]);
  });

  it("trie les dates ISO et le texte avec les chiffres naturels", () => {
    expect(sortedIndexes(["2026-11-02", "2026-01-15"], "date", "asc")).toEqual([1, 0]);
    expect(sortedIndexes(["lot 10", "Lot 2", "été"], "text", "asc")).toEqual([2, 1, 0]);
  });

  it("garde les cellules vides en dernier dans les deux sens", () => {
    expect(sortedIndexes([null, 3, "", 1], "number", "asc")).toEqual([3, 1, 0, 2]);
    expect(sortedIndexes([null, 3, "", 1], "number", "desc")).toEqual([1, 3, 0, 2]);
  });

  it("garde l'ordre d'origine sans tri", () => {
    expect(sortedIndexes([3, 1, 2], "number", null)).toEqual([0, 1, 2]);
  });
});

describe("nextSort", () => {
  it("passe de croissant à décroissant puis à aucun tri", () => {
    const first = nextSort(null, 2);
    expect(first).toEqual({ column: 2, direction: "asc" });
    const second = nextSort(first, 2);
    expect(second).toEqual({ column: 2, direction: "desc" });
    expect(nextSort(second, 2)).toBeNull();
    expect(nextSort(second, 1)).toEqual({ column: 1, direction: "asc" });
  });
});

describe("matchingIndexes", () => {
  const rows = ["Cmd 12 Livraison", "Cmd 13 Retrait magasin", "Réclamation 7"];

  it("ignore accents et casse et exige tous les mots", () => {
    expect(matchingIndexes(rows, "reclamation")).toEqual([2]);
    expect(matchingIndexes(rows, "cmd retrait")).toEqual([1]);
    expect(matchingIndexes(rows, "  ")).toEqual([0, 1, 2]);
  });
});

describe("pageWindow", () => {
  it("découpe et borne la page", () => {
    expect(pageWindow(135, 20, 2)).toEqual({ start: 20, end: 40, page: 2, pages: 7 });
    expect(pageWindow(135, 20, 99)).toEqual({ start: 120, end: 135, page: 7, pages: 7 });
    expect(pageWindow(135, 20, 0).page).toBe(1);
  });

  it("« Tous » et tableau vide tiennent sur une page", () => {
    expect(pageWindow(135, "all", 3)).toEqual({ start: 0, end: 135, page: 1, pages: 1 });
    expect(rangeLabel(pageWindow(0, 20, 1), 0)).toBe("0 / 0");
    expect(rangeLabel(pageWindow(135, 20, 2), 135)).toBe("21–40 / 135");
  });
});

describe("exports texte", () => {
  it("échappe le CSV et neutralise les formules", () => {
    const csv = toCsv(["A", "B"], [['dit "oui"', "x;y"], ["=SUM(A1)", "-12,50 €"]]);
    expect(csv).toBe("A;B\r\n\"dit \"\"oui\"\"\";\"x;y\"\r\n'=SUM(A1);-12,50 €");
  });

  it("sépare le TXT par des tabulations", () => {
    expect(toTxt(["A", "B"], [["1", "a\tb"]])).toBe("A\tB\r\n1\ta b");
  });

  it("nomme le fichier sans accent ni espace", () => {
    expect(fileName("Réclamations & litiges", "csv", new Date("2026-11-18T10:00:00Z"))).toBe("reclamations-litiges-2026-11-18.csv");
  });

  it("repère les colonnes numériques", () => {
    expect(isNumericColumn(["12,90 €", "1 250,00 €", ""])).toBe(true);
    expect(isNumericColumn(["12", "abc"])).toBe(false);
    expect(isNumericColumn([])).toBe(false);
  });
});
