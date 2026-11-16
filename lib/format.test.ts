import { describe, expect, it } from "vitest";
import { centsToInput, extractApiError, formatMoney, parseEuros, safeNext } from "./format";

describe("formatMoney", () => {
  it("formats cents as euros with plain spaces", () => {
    expect(formatMoney(1290)).toBe("12,90 €");
    expect(formatMoney(0)).toBe("0,00 €");
    expect(formatMoney(138500)).toBe("1 385,00 €");
  });
});

describe("parseEuros", () => {
  it.each([["12", 1200], ["12,5", 1250], ["12.50", 1250], [" 1 250,00 ", 125000], ["0,01", 1], ["0", 0]])("%j -> %d", (input, expected) => {
    expect(parseEuros(input)).toBe(expected);
  });

  it.each(["", "-1", "12,555", "1,", "abc", "1e3", "12345678"])("rejects %j", (input) => {
    expect(parseEuros(input)).toBeNull();
  });

  it("round-trips with centsToInput", () => {
    expect(centsToInput(1250)).toBe("12,50");
    expect(parseEuros(centsToInput(99))).toBe(99);
  });
});

describe("extractApiError", () => {
  it("prefers the first validation error, then the message, then the fallback", () => {
    expect(extractApiError({ errors: { to: ["Transition interdite : paid -> delivered."] } })).toBe("Transition interdite : paid -> delivered.");
    expect(extractApiError({ message: "Action non autorisée." })).toBe("Action non autorisée.");
    expect(extractApiError(undefined, "Oups")).toBe("Oups");
  });
});

describe("safeNext", () => {
  it("keeps internal paths only", () => {
    expect(safeNext("/commandes/12")).toBe("/commandes/12");
    for (const bad of ["https://evil.test", "//evil.test", "/\\evil", "commande", "", null, undefined, "/x\r\nSet-Cookie: a=b"]) {
      expect(safeNext(bad as string | null | undefined)).toBe("/commandes");
    }
  });
});
