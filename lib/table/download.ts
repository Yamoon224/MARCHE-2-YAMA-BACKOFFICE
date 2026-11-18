import { fileName, isNumericColumn, toCsv, toTxt, type ExportData, type ExportFormat } from "./export";
import { cellText } from "./table";

function save(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function primaryColor(): string {
  return getComputedStyle(document.documentElement).getPropertyValue("--brand-green").trim() || "#3f7d2c";
}

function hexToRgb(hex: string): [number, number, number] {
  const value = /^#([0-9a-f]{6})$/i.exec(hex)?.[1] ?? "3f7d2c";
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

/** Télécharge le tableau au format demandé. PDF et Excel ne se chargent qu'au clic. */
export async function exportTable(format: ExportFormat, data: ExportData): Promise<void> {
  const filename = fileName(data.name, format);

  if (format === "csv") return save(new Blob(["﻿", toCsv(data.headers, data.rows)], { type: "text/csv;charset=utf-8" }), filename);
  if (format === "txt") return save(new Blob(["﻿", toTxt(data.headers, data.rows)], { type: "text/plain;charset=utf-8" }), filename);

  const accent = primaryColor();
  const numeric = data.headers.map((_, column) => isNumericColumn(data.rows.map((row) => row[column] ?? "")));

  if (format === "xlsx") {
    const { default: writeExcelFile } = await import("write-excel-file/browser");
    const border = { borderColor: "#e5e7eb", borderStyle: "thin" as const };
    const header = data.headers.map((value, column) => ({
      value, fontWeight: "bold" as const, textColor: "#ffffff", backgroundColor: accent,
      align: numeric[column] ? ("right" as const) : ("left" as const), ...border,
    }));
    const body = data.rows.map((row, index) =>
      data.headers.map((_, column) => ({
        value: cellText(row[column]), align: numeric[column] ? ("right" as const) : ("left" as const),
        backgroundColor: index % 2 === 1 ? "#f9fafb" : "#ffffff", ...border,
      })),
    );
    const blob = await writeExcelFile([header, ...body], {
      sheet: (data.title ?? data.name).slice(0, 31).replace(/[\\/?*[\]:]/g, " "),
      stickyRowsCount: 1,
      columns: data.headers.map((title, column) => ({
        width: Math.min(48, Math.max(10, ...[title, ...data.rows.map((row) => row[column] ?? "")].map((value) => cellText(value).length + 3))),
      })),
    }).toBlob();

    return save(blob, filename);
  }

  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const pdf = new jsPDF({ orientation: data.headers.length > 5 ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const margin = 40;
  const width = pdf.internal.pageSize.getWidth();
  const generated = new Date().toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });

  pdf.setFillColor(...hexToRgb(accent));
  pdf.rect(0, 0, width, 6, "F");
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text(data.title ?? data.name, margin, 44);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(110);
  pdf.text(`Marché de Yama - ${generated} - ${data.rows.length} ligne${data.rows.length > 1 ? "s" : ""}`, margin, 60);

  autoTable(pdf, {
    startY: 74,
    margin: { left: margin, right: margin, bottom: 40 },
    head: [data.headers.map(String)],
    body: data.rows.map((row) => data.headers.map((_, column) => cellText(row[column]))),
    styles: { fontSize: 8, cellPadding: 5, textColor: 40 },
    headStyles: { fillColor: hexToRgb(accent), textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: Object.fromEntries(numeric.map((isNumber, column) => [column, { halign: isNumber ? "right" : "left" }])),
    didDrawPage: () => {
      pdf.setFontSize(8);
      pdf.setTextColor(130);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, width - margin, pdf.internal.pageSize.getHeight() - 20, { align: "right" });
    },
  });

  save(pdf.output("blob"), filename);
}
