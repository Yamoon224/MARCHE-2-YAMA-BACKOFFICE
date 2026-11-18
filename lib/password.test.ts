import { describe, expect, it } from "vitest";
import { passwordProblem } from "./password";

describe("passwordProblem", () => {
  it("accepte un mot de passe valide et confirmé", () => {
    expect(passwordProblem("secret1234", "secret1234")).toBeNull();
  });

  it("refuse un mot de passe trop court, sans lettre ou sans chiffre", () => {
    expect(passwordProblem("abc123", "abc123")).toBe("short");
    expect(passwordProblem("12345678", "12345678")).toBe("letter");
    expect(passwordProblem("abcdefgh", "abcdefgh")).toBe("digit");
  });

  it("refuse une confirmation différente", () => {
    expect(passwordProblem("secret1234", "secret12345")).toBe("mismatch");
  });
});
