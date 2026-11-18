import { describe, expect, it } from "vitest";
import { periodDays, presetPeriod, resolvePeriod, shiftDay, todayParis } from "./period";

const TODAY = "2026-11-18";

describe("resolvePeriod", () => {
  it("prend les 30 derniers jours par défaut", () => {
    expect(resolvePeriod(undefined, undefined, TODAY)).toEqual({ from: "2026-10-20", to: TODAY });
  });

  it("garde une période valide", () => {
    expect(resolvePeriod("2026-11-01", "2026-11-10", TODAY)).toEqual({ from: "2026-11-01", to: "2026-11-10" });
  });

  it("ignore les dates invalides ou impossibles", () => {
    expect(resolvePeriod("pas-une-date", "2026-02-31", TODAY)).toEqual({ from: "2026-10-20", to: TODAY });
    expect(resolvePeriod("2026-13-01", undefined, TODAY).from).toBe("2026-10-20");
  });

  it("ne dépasse pas aujourd'hui et remet les bornes dans l'ordre", () => {
    expect(resolvePeriod("2026-11-05", "2027-01-01", TODAY).to).toBe(TODAY);
    expect(resolvePeriod("2026-11-15", "2026-11-10", TODAY)).toEqual({ from: "2026-11-10", to: "2026-11-10" });
  });

  it("limite la durée à 366 jours", () => {
    const period = resolvePeriod("2020-01-01", TODAY, TODAY);
    expect(periodDays(period)).toBe(366);
    expect(period.to).toBe(TODAY);
  });
});

describe("dates", () => {
  it("décale un jour à travers les mois et années", () => {
    expect(shiftDay("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(() => shiftDay("nope", 1)).toThrow();
  });

  it("compte les bornes comprises", () => {
    expect(periodDays({ from: "2026-11-18", to: "2026-11-18" })).toBe(1);
    expect(periodDays(presetPeriod(7, TODAY))).toBe(7);
  });

  it("donne le jour courant à Paris, pas celui d'UTC", () => {
    expect(todayParis(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-18");
    expect(todayParis(new Date("2026-07-17T22:30:00Z"))).toBe("2026-07-18");
  });
});
