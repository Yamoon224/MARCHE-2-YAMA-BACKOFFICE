import { describe, expect, it } from "vitest";
import { extractApiError, formatXof, safeNext } from "./format";

describe("formatXof", () => {
  it("formats integer amounts with thin spaces replaced", () => {
    expect(formatXof(13850)).toBe("13 850 F CFA");
    expect(formatXof(0)).toBe("0 F CFA");
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
