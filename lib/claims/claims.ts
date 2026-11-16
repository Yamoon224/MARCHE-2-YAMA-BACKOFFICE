import { centsToInput, parseEuros } from "../format";
export type Issue = "missing" | "damaged" | "expired" | "non_conforming";
export type Resolution = "refund" | "redelivery";
export type CostBearer = "supplier" | "preparation" | "delivery" | "store";

export const ISSUE_LABEL: Record<Issue, string> = {
  missing: "Manquant",
  damaged: "Abîmé",
  expired: "Périmé",
  non_conforming: "Non conforme",
};

export const CLAIM_STATUS_LABEL: Record<string, string> = {
  open: "À traiter",
  accepted: "Acceptée",
  rejected: "Refusée",
};

export const RESOLUTION_LABEL: Record<Resolution, string> = {
  refund: "Remboursement",
  redelivery: "Nouvel envoi",
};

/** À qui imputer le coût : alimente les statistiques de qualité (fournisseur, préparation, livraison, magasin). */
export const COST_BEARER_LABEL: Record<CostBearer, string> = {
  supplier: "Fournisseur",
  preparation: "Préparation",
  delivery: "Livraison",
  store: "Magasin",
};

/** Rôles qui décident les réclamations (miroir de la permission `claims.decide`, le serveur reste l'autorité). */
const DECIDERS = new Set(["admin", "support"]);

export function canDecideClaims(role: string): boolean {
  return DECIDERS.has(role);
}

export type DecisionDraft = {
  decision: "accept" | "reject";
  resolution: Resolution;
  costBearer: CostBearer | "";
  amount: string;
  note: string;
};

/** Montant en euros (ex. 12,50), supérieur à zéro ; `null` si invalide. */
export function parseAmount(input: string): number | null {
  const value = parseEuros(input);

  return value !== null && value >= 1 ? value : null;
}

/** Premier problème de la décision, ou `null` si elle peut partir. `ceilingMinor` : valeur des articles réclamés. */
export function validateDecision(draft: DecisionDraft, ceilingMinor: number): string | null {
  if (draft.note.trim().length < 3) return "Motivez votre décision (3 caractères minimum), y compris pour un refus.";
  if (draft.decision === "reject") return null;

  if (draft.costBearer === "") return "Indiquez à qui imputer le coût.";
  if (draft.resolution === "redelivery") return null;

  const amount = parseAmount(draft.amount);
  if (amount === null) return "Saisissez un montant de remboursement en euros (ex. 12,50).";
  if (amount > ceilingMinor) return "Le remboursement ne peut pas dépasser la valeur des articles réclamés.";

  return null;
}

/** Corps de la décision pour l'API : les champs sans objet ne sont pas envoyés. */
export function buildDecisionBody(draft: DecisionDraft) {
  if (draft.decision === "reject") return { decision: "reject" as const, note: draft.note.trim() };

  const body = {
    decision: "accept" as const,
    note: draft.note.trim(),
    resolution: draft.resolution,
    cost_bearer: draft.costBearer as CostBearer,
  };

  return draft.resolution === "refund" ? { ...body, amount_minor: parseAmount(draft.amount) as number } : body;
}

export function initialDecision(ceilingMinor: number): DecisionDraft {
  return { decision: "accept", resolution: "refund", costBearer: "", amount: centsToInput(ceilingMinor), note: "" };
}
