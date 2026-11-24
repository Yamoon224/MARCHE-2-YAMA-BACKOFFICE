import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS, missingColumns, parseCsv, parseDecimal, parseSql, parseXlsx, templateCsv, toRows } from "./import";

describe("parseDecimal", () => {
  it("reads French and English amounts", () => {
    expect(parseDecimal("2.90")).toBe(2.9);
    expect(parseDecimal("1 234,50 €")).toBe(1234.5);
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("abc")).toBeNull();
  });
});

describe("parseCsv", () => {
  it("detects the delimiter and handles quotes", () => {
    const t = parseCsv('Item name;Price\r\n"Riz; ""long"""; 2,90\r\nAil;1.5\r\n');
    expect(t.headers).toEqual(["Item name", "Price"]);
    expect(t.rows).toEqual([['Riz; "long"', " 2,90"], ["Ail", "1.5"]]);
    expect(t.firstRow).toBe(2);
  });

  it("round-trips the downloadable template", () => {
    const t = parseCsv(templateCsv().replace(/^﻿/, ""));
    expect(missingColumns(t)).toEqual([]);
    const { rows, ignored } = toRows(t);
    expect(ignored).toEqual([]);
    expect(rows[0]).toMatchObject({ name: "Riz long parfumé Tersol 1kg", price_minor: 290, vat_rate_bp: 550, category: "Féculents", sku: "RIZ-TERSOL-1KG" });
  });
});

describe("parseXlsx", () => {
  const sheet = (rows: string) => `<worksheet><sheetData>${rows}</sheetData></worksheet>`;
  function xlsx(sheetXml: string, shared: string[]) {
    return zipSync({
      "xl/workbook.xml": strToU8('<workbook><sheets><sheet name="Catalogue" sheetId="1" r:id="rId1"/></sheets></workbook>'),
      "xl/_rels/workbook.xml.rels": strToU8('<Relationships><Relationship Id="rId1" Type="x" Target="worksheets/sheet1.xml"/></Relationships>'),
      "xl/sharedStrings.xml": strToU8(`<sst>${shared.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`),
      "xl/worksheets/sheet1.xml": strToU8(sheetXml),
    });
  }

  it("reads the SumUp catalogue layout, with gaps and variations", () => {
    const data = xlsx(
      sheet(
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="L1" t="s"><v>2</v></c><c r="AC1" t="s"><v>3</v></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>4</v></c><c r="L2"><v>2.90</v></c><c r="AC2" t="s"><v>5</v></c></row>' +
          '<row r="3"><c r="B3" t="s"><v>6</v></c><c r="L3"><v>0.00</v></c></row>',
      ),
      ["Item name", "Variations", "Price", "Category", "Riz &amp; Co", "Féculents||Épicerie", "Sachet 250g"],
    );
    const table = parseXlsx(data);
    expect(table.headers[0]).toBe("Item name");
    expect(table.headers[11]).toBe("Price");
    expect(table.headers[28]).toBe("Category");

    const { rows, ignored } = toRows(table);
    expect(rows).toEqual([{ row: 2, name: "Riz & Co", price_minor: 290, category: "Féculents" }]);
    expect(ignored).toHaveLength(1);
    expect(ignored[0]).toMatchObject({ row: 3, label: "Riz & Co - Sachet 250g" });
  });

  it("rejects a file that is not a zip", () => {
    expect(() => parseXlsx(strToU8("pas un xlsx"))).toThrow(/illisible/);
  });
});

describe("parseSql", () => {
  it("reads INSERT values without executing anything", () => {
    const t = parseSql(`
      -- sauvegarde
      DROP TABLE products;
      INSERT INTO \`db\`.\`products\` (\`name\`, \`price\`, \`sku\`, \`description\`) VALUES
        ('L''Ail; frais', 2.90, 'AIL', NULL),
        ("Riz \\"long\\"", 3, NULL, 'a, b');
    `);
    expect(t.headers).toEqual(["name", "price", "sku", "description"]);
    expect(t.rows).toEqual([["L'Ail; frais", "2.90", "AIL", ""], ['Riz "long"', "3", "", "a, b"]]);
    expect(toRows(t).rows[0]).toMatchObject({ name: "L'Ail; frais", price_minor: 290, sku: "AIL" });
  });

  it("explains unusable files", () => {
    expect(() => parseSql("SELECT 1;")).toThrow(/INSERT/);
    expect(() => parseSql("INSERT INTO products VALUES (1);")).toThrow(/colonnes/);
  });
});

describe("toRows", () => {
  const table = (headers: string[], ...rows: string[][]) => ({ headers, rows, firstRow: 2 });

  it("maps units, weight-variable products, promotions and options", () => {
    const t = table(
      ["Item name", "Price", "Regular price (before sale)", "On sale in Online Store?", "Unit", "Variable price? (Yes/No)", "Track inventory? (Yes/No)", "Display item in Online Store? (Yes/No)", "Image 1", "Image 2"],
      ["A", "2", "3", "Yes", "each.each", "No", "Yes", "No", "https://x/1.jpg", "https://x/1.jpg"],
      ["B", "", "", "", "each.each", "Yes", "", "", "", ""],
      ["C", "5", "9", "No", "weight.kilogram", "", "", "", "", ""],
    );

    const base = toRows(t, DEFAULT_OPTIONS).rows;
    expect(base[0]).toEqual({ row: 2, name: "A", price_minor: 200, compare_at_price_minor: 300, sale_unit: "piece", is_weight_variable: false, images: ["https://x/1.jpg"] });
    expect(base[1]).toMatchObject({ is_weight_variable: true, sale_unit: "kg" });
    expect(base[1].price_minor).toBeUndefined();
    expect(base[2]).toMatchObject({ sale_unit: "kg" });
    expect(base[2].compare_at_price_minor).toBeUndefined();

    const opt = toRows(t, { hideOffline: true, keepTrackStock: true }).rows;
    expect(opt[0]).toMatchObject({ is_active: false, track_stock: true });
  });

  it("skips blank lines and reports unreadable prices", () => {
    const { rows, ignored } = toRows(table(["Item name", "Price"], ["", ""], ["X", "douze"], ["Y", "1"]));
    expect(rows.map((r) => r.name)).toEqual(["Y"]);
    expect(ignored).toEqual([{ row: 3, label: "X", reason: "Prix illisible « douze »." }]);
  });

  it("flags files without a name column", () => {
    expect(missingColumns(table(["Price"]))).toEqual(["Item name"]);
  });
});
