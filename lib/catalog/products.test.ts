import { describe, expect, it } from "vitest";
import { MAX_IMAGES, moveItem, parseTrashed, pickImages, productState, slugify } from "./products";

describe("parseTrashed", () => {
  it("accepts only the two documented values", () => {
    expect(parseTrashed("with")).toBe("with");
    expect(parseTrashed("only")).toBe("only");
    expect(parseTrashed("all")).toBe("");
    expect(parseTrashed(undefined)).toBe("");
    expect(parseTrashed(["only"])).toBe("");
  });
});

describe("slugify", () => {
  it("produces the slug format required by the API", () => {
    expect(slugify("Crème Fraîche 20 cl")).toBe("creme-fraiche-20-cl");
    expect(slugify("  --Riz  parfumé !! ")).toBe("riz-parfume");
    expect(slugify("???")).toBe("");
  });
});

describe("moveItem", () => {
  it("moves an item and ignores impossible moves", () => {
    expect(moveItem([1, 2, 3], 2, -1)).toEqual([1, 3, 2]);
    expect(moveItem([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveItem([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveItem([1, 2, 3], 2, 1)).toEqual([1, 2, 3]);
  });

  it("does not mutate its input", () => {
    const list = [1, 2, 3];
    moveItem(list, 0, 1);
    expect(list).toEqual([1, 2, 3]);
  });
});

describe("pickImages", () => {
  const file = (name: string, type = "image/png", size = 1000) => ({ name, type, size });

  it("keeps valid images", () => {
    expect(pickImages([file("a.png"), file("b.webp", "image/webp")], 0)).toEqual({ accepted: [0, 1], error: null });
  });

  it("rejects bad formats and heavy files with a message", () => {
    const result = pickImages([file("a.gif", "image/gif"), file("b.png", "image/png", 5 * 1024 * 1024), file("c.png")], 0);
    expect(result.accepted).toEqual([2]);
    expect(result.error).toContain("4 Mo");
  });

  it("stops at the gallery limit", () => {
    const result = pickImages([file("a.png"), file("b.png")], MAX_IMAGES - 1);
    expect(result.accepted).toEqual([0]);
    expect(result.error).toContain("10 images");
  });
});

describe("productState", () => {
  it("prioritises deletion over visibility", () => {
    expect(productState({ deleted_at: "2026-11-18T10:00:00Z", is_active: true })).toBe("deleted");
    expect(productState({ is_active: false })).toBe("hidden");
    expect(productState({ is_active: true })).toBe("online");
    expect(productState({})).toBe("online");
  });
});
