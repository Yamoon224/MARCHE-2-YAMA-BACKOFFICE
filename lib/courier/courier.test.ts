import { describe, expect, it } from "vitest";
import {
  courierActions, formatAddress, isValidCode, mapsUrl, parseCash, shouldSendLocation, telUrl, validateHandover,
} from "./courier";

describe("confirmation code", () => {
  it.each(["123456", " 000000 ", "999999"])("accepts %j", (code) => expect(isValidCode(code)).toBe(true));
  it.each(["", "12345", "1234567", "12345a", "12 456", "１２３４５６"])("rejects %j", (code) => expect(isValidCode(code)).toBe(false));
});

describe("parseCash", () => {
  it.each([["", 0], ["0", 0], ["11500", 11500], [" 11 500 ", 11500], ["11 500", 11500]])("accepts %j", (input, expected) => {
    expect(parseCash(input)).toBe(expected);
  });

  it.each(["-1", "11,5", "11.5", "abc", "1e3", "1234567890"])("rejects %j", (input) => expect(parseCash(input)).toBeNull());
});

describe("validateHandover", () => {
  it("accepts a valid code with cash or none", () => {
    expect(validateHandover("123456", "11500")).toBeNull();
    expect(validateHandover("123456", "")).toBeNull();
  });

  it("explains what is wrong", () => {
    expect(validateHandover("12", "0")).toContain("6 chiffres");
    expect(validateHandover("123456", "abc")).toContain("montant entier");
  });
});

describe("courierActions", () => {
  it("offers the right buttons for each state", () => {
    expect(courierActions("assigned")).toEqual({ start: true, handover: false, fail: false, location: false });
    expect(courierActions("out_for_delivery")).toEqual({ start: false, handover: true, fail: true, location: true });
    expect(courierActions("failed")).toEqual({ start: true, handover: false, fail: false, location: false });
    for (const done of ["delivered", "returned", "pending"] as const) {
      expect(courierActions(done)).toEqual({ start: false, handover: false, fail: false, location: false });
    }
  });
});

describe("shouldSendLocation", () => {
  it("sends the first position, then at most once per interval", () => {
    expect(shouldSendLocation(null, 1_000)).toBe(true);
    expect(shouldSendLocation(1_000, 10_000)).toBe(false);
    expect(shouldSendLocation(1_000, 21_000)).toBe(true);
    expect(shouldSendLocation(1_000, 3_000, 2_000)).toBe(true);
  });
});

describe("address helpers", () => {
  it("formats the address with its landmark", () => {
    expect(formatAddress({ neighborhood: "Cocody", landmark: "Portail bleu" })).toBe("Cocody — Portail bleu");
    expect(formatAddress({ neighborhood: "Cocody", landmark: null })).toBe("Cocody");
    expect(formatAddress(null)).toBe("Adresse non renseignée");
    expect(formatAddress({})).toBe("Adresse non renseignée");
  });

  it("builds a map link only when coordinates exist", () => {
    expect(mapsUrl({ latitude: 5.35, longitude: -4.0 })).toContain("mlat=5.35&mlon=-4");
    expect(mapsUrl({ neighborhood: "Cocody" })).toBeNull();
    expect(mapsUrl(null)).toBeNull();
  });

  it("builds a call link from a clean phone number only", () => {
    expect(telUrl("+225 07 00 11 22 33")).toBe("tel:+2250700112233");
    expect(telUrl("0700112233")).toBe("tel:0700112233");
    expect(telUrl("abc")).toBeNull();
    expect(telUrl("tel:+1;DROP")).toBeNull();
    expect(telUrl(null)).toBeNull();
  });
});
