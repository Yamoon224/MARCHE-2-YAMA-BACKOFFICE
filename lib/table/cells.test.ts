import { describe, expect, it } from "vitest";
import { dateCell, formatDateTime, moneyCell } from "./cells";

describe("cellules de tableau", () => {
  it("trie un montant sur les centimes et l'affiche en euros", () => {
    expect(moneyCell(1290)).toEqual({ value: 1290, text: "12,90 €", node: "12,90 €" });
  });

  it("affiche une date en JJ/MM/AAAA, vide si absente", () => {
    expect(dateCell("2026-11-05T10:00:00Z")).toEqual({ value: "2026-11-05T10:00:00Z", text: "05/11/2026", node: "05/11/2026" });
    expect(dateCell(null)).toBeNull();
  });

  it("donne l'heure de Paris", () => {
    expect(formatDateTime("2026-11-18T13:05:00Z")).toBe("18/11/2026 14:05");
    expect(formatDateTime("n'importe quoi")).toBe("n'importe quoi");
  });
});
