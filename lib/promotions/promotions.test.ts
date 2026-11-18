import { describe, expect, it } from "vitest";
import { fromLocalInput, promotionValueLabel, toLocalInput, usageLabel } from "./promotions";

describe("promotionValueLabel", () => {
  it("affiche un pourcentage ou un montant fixe (centimes)", () => {
    expect(promotionValueLabel("percent", 10)).toBe("10 %");
    expect(promotionValueLabel("fixed", 500)).toBe("5,00 €");
  });
});

describe("usageLabel", () => {
  it("montre le plafond quand il existe", () => {
    expect(usageLabel(12, 100)).toBe("12 / 100");
    expect(usageLabel(12, null)).toBe("12");
    expect(usageLabel(0, undefined)).toBe("0");
  });
});

describe("champ datetime-local", () => {
  it("fait l'aller-retour avec l'heure locale", () => {
    const iso = fromLocalInput("2026-11-18T14:30");
    expect(iso).toMatch(/^2026-11-18T\d{2}:30:00\.000Z$/);
    expect(toLocalInput(iso)).toBe("2026-11-18T14:30");
  });

  it("gère vide et invalide", () => {
    expect(fromLocalInput("  ")).toBeNull();
    expect(fromLocalInput("n'importe quoi")).toBeUndefined();
    expect(toLocalInput(null)).toBe("");
    expect(toLocalInput("pas une date")).toBe("");
  });
});
