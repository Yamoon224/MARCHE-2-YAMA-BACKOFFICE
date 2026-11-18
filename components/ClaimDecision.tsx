"use client";

import { SearchSelect } from "@/components/SearchSelect";
import { Btn } from "@/components/Btn";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { browserApi } from "@/lib/api/client";
import {
  buildDecisionBody, COST_BEARER_LABEL, initialDecision, RESOLUTION_LABEL, validateDecision, type CostBearer, type DecisionDraft, type Resolution,
} from "@/lib/claims/claims";
import { extractApiError, formatMoney } from "@/lib/format";

const field = "mt-1 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-sm outline-none focus:border-brand-green";

export function ClaimDecision({ claimId, ceilingMinor }: { claimId: number; ceilingMinor: number }) {
  const router = useRouter();
  const [draft, setDraft] = useState<DecisionDraft>(() => initialDecision(ceilingMinor));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false); // garde contre le double clic : une décision ne part qu'une fois

  const set = (change: Partial<DecisionDraft>) => setDraft((d) => ({ ...d, ...change }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);

    const problem = validateDecision(draft, ceilingMinor);
    if (problem) return setError(problem);

    submitting.current = true;
    setBusy(true);

    try {
      const { error: failure } = await browserApi().POST("/api/v1/claims/{claim}/decision", {
        params: { path: { claim: claimId } },
        body: buildDecisionBody(draft),
      });

      if (failure) {
        submitting.current = false;
        return setError(extractApiError(failure));
      }

      router.refresh();
    } catch {
      submitting.current = false;
      setError("Service momentanément indisponible. Vérifiez l'état de la réclamation avant de réessayer.");
    } finally {
      setBusy(false);
    }
  }

  const accepting = draft.decision === "accept";

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4" noValidate>
      <fieldset className="flex gap-6">
        <legend className="sr-only">Décision</legend>
        {(["accept", "reject"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2 font-medium">
            <input type="radio" name="decision" checked={draft.decision === value} onChange={() => set({ decision: value })} />
            {value === "accept" ? "Accepter" : "Refuser"}
          </label>
        ))}
      </fieldset>

      {accepting && (
        <>
          <label className="text-sm font-medium">Résolution
            <SearchSelect value={draft.resolution} onChange={(resolution) => set({ resolution: resolution as Resolution })} aria-label="Résolution" className="mt-1" options={(Object.keys(RESOLUTION_LABEL) as Resolution[]).map((r) => ({ value: r, label: RESOLUTION_LABEL[r] }))} />
          </label>

          {draft.resolution === "refund" && (
            <label className="text-sm font-medium">Montant remboursé (€) - plafond {formatMoney(ceilingMinor)}
              <input value={draft.amount} onChange={(e) => set({ amount: e.target.value })} inputMode="decimal" placeholder="Ex. 12,50" className={field} />
            </label>
          )}

          <label className="text-sm font-medium">Coût imputé à
            <SearchSelect value={draft.costBearer} onChange={(costBearer) => set({ costBearer: costBearer as CostBearer | "" })} placeholder="Choisir…" aria-label="Coût imputé à" className="mt-1" options={(Object.keys(COST_BEARER_LABEL) as CostBearer[]).map((c) => ({ value: c, label: COST_BEARER_LABEL[c] }))} />
          </label>
        </>
      )}

      <label className="text-sm font-medium">Motif de la décision (obligatoire)
        <textarea value={draft.note} onChange={(e) => set({ note: e.target.value })} rows={3} maxLength={1000} placeholder="Motif de la décision…" className={field} />
      </label>

      {error && <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">{error}</p>}

      <Btn type="submit" disabled={busy} className={`w-fit rounded-full px-6 py-2.5 text-sm font-medium text-white disabled:opacity-60 ${accepting ? "bg-brand-green" : "bg-brand-red"}`}>
        {busy ? "Enregistrement…" : accepting ? "Accepter la réclamation" : "Refuser la réclamation"}
      </Btn>
    </form>
  );
}
