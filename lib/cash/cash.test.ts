import { describe, expect, it } from "vitest";
import { canReceiveCash, parseCounted, validateHandover, variance, varianceLabel } from "./cash";

describe("canReceiveCash", () => {
  it("is reserved to admin and order operator", () => {
    expect(canReceiveCash("admin")).toBe(true);
    expect(canReceiveCash("order_operator")).toBe(true);
    for (const role of ["courier", "support", "accountant", "picker", "customer"]) expect(canReceiveCash(role)).toBe(false);
  });
});

describe("parseCounted", () => {
  it.each([["11500", 11500], [" 11 500 ", 11500], ["0", 0], ["007", 7]])("%j -> %d", (input, expected) => {
    expect(parseCounted(input)).toBe(expected);
  });

  it.each(["", "-1", "1.5", "1,5", "abc", "1e3", "1234567890"])("rejects %j", (input) => {
    expect(parseCounted(input)).toBeNull();
  });
});

describe("validateHandover", () => {
  it("accepts an exact count without a note", () => {
    expect(validateHandover("11500", 11500, "")).toBeNull();
  });

  it("requires a note when the count differs", () => {
    expect(validateHandover("11000", 11500, "")).toContain("expliquez");
    expect(validateHandover("11000", 11500, " ab ")).toContain("expliquez");
    expect(validateHandover("11000", 11500, "Monnaie rendue")).toBeNull();
    expect(validateHandover("0", 11500, "Sac volé")).toBeNull();
  });

  it("rejects an unreadable amount", () => {
    expect(validateHandover("abc", 100, "x")).toContain("montant compté");
  });
});

describe("variance", () => {
  it("is counted minus expected", () => {
    expect(variance(11000, 11500)).toBe(-500);
    expect(variance(11700, 11500)).toBe(200);
    expect(varianceLabel(-500)).toBe("Manquant");
    expect(varianceLabel(200)).toBe("Excédent");
    expect(varianceLabel(0)).toBe("Aucun écart");
  });
});
