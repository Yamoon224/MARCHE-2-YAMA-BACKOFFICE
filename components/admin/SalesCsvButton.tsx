"use client";

import { useState } from "react";

/** Télécharge le CSV des ventes produit par le serveur (même filtre que le tableau), via le relais authentifié. */
export function SalesCsvButton({ from, to, group }: { from: string; to: string; group: string }) {
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");

  async function download() {
    setState("busy");

    try {
      const query = new URLSearchParams({ from, to, group, format: "csv" });
      const response = await fetch(`/api/backend/api/v1/reports/sales?${query.toString()}`, { headers: { Accept: "text/csv" } });
      if (!response.ok) return setState("error");

      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `ventes-${group}-${from}-${to}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setState("idle");
    } catch {
      setState("error");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={() => void download()} disabled={state === "busy"} className="rounded-full border border-brand-green px-4 py-1.5 text-sm font-medium text-brand-green disabled:opacity-60">
        {state === "busy" ? "Export…" : "Exporter le CSV du serveur"}
      </button>
      {state === "error" && <span role="alert" className="text-xs text-brand-red">Export impossible.</span>}
    </span>
  );
}
