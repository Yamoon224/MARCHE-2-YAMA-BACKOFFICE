import { describe, expect, it } from "vitest";
import { barLayout, compactEuros, fullDay, labelIndexes, niceMax, shortDay, yTicks } from "./chart";

describe("niceMax", () => {
  it.each([
    [0, 1], [-5, 1], [1, 1], [7, 10], [12, 20], [21, 25], [26, 50], [51, 100], [1234, 2000], [2100, 2500],
  ])("arrondit %s à %s", (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});

describe("yTicks", () => {
  it("découpe de 0 au maximum", () => {
    expect(yTicks(100)).toEqual([0, 25, 50, 75, 100]);
    expect(yTicks(10, 2)).toEqual([0, 5, 10]);
  });
});

describe("barLayout", () => {
  it("proportionne les hauteurs au maximum et ancre les barres en bas", () => {
    const bars = barLayout([0, 50, 100], 300, 200, 100);

    expect(bars.map((b) => b.height)).toEqual([0, 100, 200]);
    expect(bars.map((b) => b.y)).toEqual([200, 100, 0]);
    expect(bars[1].x).toBeGreaterThan(bars[0].x);
    expect(bars.every((b) => b.width > 0 && b.x >= 0 && b.x + b.width <= 300)).toBe(true);
  });

  it("borne les valeurs hors échelle, négatives ou sans maximum", () => {
    expect(barLayout([500], 100, 100, 100)[0].height).toBe(100);
    expect(barLayout([-5], 100, 100, 100)[0].height).toBe(0);
    expect(barLayout([5], 100, 100, 0)[0].height).toBe(0);
    expect(barLayout([], 100, 100, 100)).toEqual([]);
  });
});

describe("labelIndexes", () => {
  it("garde au plus huit étiquettes réparties", () => {
    expect(labelIndexes(5)).toEqual([0, 1, 2, 3, 4]);
    expect(labelIndexes(30)).toEqual([0, 4, 8, 12, 16, 20, 24, 28]);
    expect(labelIndexes(0)).toEqual([]);
    expect(labelIndexes(365).length).toBeLessThanOrEqual(8);
  });
});

describe("formats", () => {
  it("abrège les montants de l'axe (entrée en centimes)", () => {
    expect(compactEuros(0)).toBe("0 €");
    expect(compactEuros(25000)).toBe("250 €");
    expect(compactEuros(1_250_000)).toBe("12,5 k€");
    expect(compactEuros(250_000_000)).toBe("2,5 M€");
  });

  it("met les jours en JJ/MM", () => {
    expect(shortDay("2026-11-05")).toBe("05/11");
    expect(fullDay("2026-11-05")).toBe("05/11/2026");
  });
});
