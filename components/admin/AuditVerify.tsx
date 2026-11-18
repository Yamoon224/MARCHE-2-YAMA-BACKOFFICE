"use client";

import { useState } from "react";
import { browserApi } from "@/lib/api/client";

type Result = { valid: boolean; checked: number; broken_at_id?: number | null };

/** Lance le contrôle de la chaîne de signatures du journal et affiche le verdict. */
export function AuditVerify() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState(false);

  async function verify() {
    setBusy(true);
    setError(false);

    try {
      const { data } = await browserApi().GET("/api/v1/audit/verify");
      if (data?.data) setResult(data.data);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => void verify()} disabled={busy} className="rounded-full border border-brand-green px-4 py-1.5 text-sm font-medium text-brand-green disabled:opacity-60">
        {busy ? "Vérification…" : "Vérifier l'intégrité"}
      </button>
      {error && <span role="alert" className="text-sm text-brand-red">Vérification impossible. Réessayez.</span>}
      {result && (
        <span role="status" className={`rounded-lg px-3 py-1.5 text-sm ${result.valid ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"}`}>
          {result.valid
            ? `Journal intact : ${result.checked} entrée${result.checked > 1 ? "s" : ""} contrôlée${result.checked > 1 ? "s" : ""}.`
            : `Journal altéré à partir de l'entrée n° ${result.broken_at_id ?? "?"} (${result.checked} entrée${result.checked > 1 ? "s" : ""} valide${result.checked > 1 ? "s" : ""} avant).`}
        </span>
      )}
    </div>
  );
}
