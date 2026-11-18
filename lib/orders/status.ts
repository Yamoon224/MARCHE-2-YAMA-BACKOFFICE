/**
 * Cycle de vie des commandes, tel que défini côté backend (OrderStatus).
 * Le serveur reste l'autorité : ces tables servent uniquement à n'afficher que les actions pertinentes.
 */
export const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  awaiting_payment: "En attente de paiement",
  payment_failed: "Paiement échoué",
  paid: "Payée",
  under_review: "En vérification",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  assigned: "Livreur assigné",
  out_for_delivery: "En cours de livraison",
  delivery_failed: "Livraison échouée",
  delivered: "Livrée / retirée",
  completed: "Terminée",
  claim: "Réclamation",
  refunded: "Remboursée",
  returned: "Retournée au magasin",
  cancelled: "Annulée",
};

export const STATUSES = Object.keys(STATUS_LABEL);

export const TRANSITIONS: Record<string, string[]> = {
  draft: ["awaiting_payment", "confirmed", "cancelled"],
  awaiting_payment: ["paid", "payment_failed", "cancelled"],
  payment_failed: ["awaiting_payment", "cancelled"],
  paid: ["confirmed", "under_review", "cancelled"],
  under_review: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["assigned", "delivered"],
  assigned: ["out_for_delivery"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "returned"],
  delivered: ["completed", "claim"],
  claim: ["refunded", "completed"],
  completed: [],
  refunded: [],
  returned: [],
  cancelled: [],
};

/** Un motif est obligatoire pour annuler, ouvrir une réclamation, déclarer un échec ou un retour. */
const REASON_REQUIRED = new Set(["cancelled", "claim", "delivery_failed", "returned"]);

export const ACTION_LABEL: Record<string, string> = {
  awaiting_payment: "Remettre en attente de paiement",
  paid: "Marquer payée",
  payment_failed: "Paiement échoué",
  under_review: "Mettre en vérification",
  confirmed: "Confirmer",
  preparing: "Lancer la préparation",
  ready: "Marquer prête",
  assigned: "Assigner à un livreur",
  out_for_delivery: "Partir en livraison",
  delivery_failed: "Déclarer un échec de livraison",
  delivered: "Marquer livrée / retirée",
  completed: "Clôturer",
  claim: "Ouvrir une réclamation",
  refunded: "Marquer remboursée",
  returned: "Retour au magasin",
  cancelled: "Annuler",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

export function requiresReason(status: string): boolean {
  return REASON_REQUIRED.has(status);
}

export function isTerminal(status: string): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}

const PREPARATION = ["preparing", "ready"];
const DELIVERY = ["out_for_delivery", "delivered", "delivery_failed"];

/** Rôles qui voient toutes les commandes et peuvent les piloter (miroir des droits `orders.manage`). */
const MANAGERS = new Set(["admin", "order_operator"]);

/** Cibles qu'un rôle peut demander ; le serveur refuse (403) tout le reste. */
export function canTransition(role: string, to: string): boolean {
  if (MANAGERS.has(role)) return true;
  if (role === "picker") return PREPARATION.includes(to);
  if (role === "courier") return DELIVERY.includes(to);
  return false;
}

/**
 * Actions à proposer à un rôle pour un statut donné.
 * « Prête » n'est pas proposée depuis « En préparation » : elle s'obtient en terminant la liste de préparation
 * (pesée, remplacements, stock ajusté) ; le serveur refuse d'ailleurs ce raccourci.
 */
export function availableActions(role: string, status: string, fulfillment = "pickup"): string[] {
  return (TRANSITIONS[status] ?? []).filter(
    (to) => canTransition(role, to) && !(status === "preparing" && to === "ready") && !isHandledByDelivery(to, fulfillment),
  );
}

const DELIVERY_STAGES = ["assigned", "out_for_delivery", "delivered", "delivery_failed", "returned"];

/**
 * Les étapes de livraison à domicile se gèrent depuis la régulation et la tournée du livreur (code de
 * confirmation, encaissement) ; le serveur refuse ces passages par l'API générale. Le retrait en magasin reste ici.
 */
export function isHandledByDelivery(to: string, fulfillment: string): boolean {
  return fulfillment === "delivery" && DELIVERY_STAGES.includes(to);
}

const NEGATIVE = new Set(["payment_failed", "delivery_failed", "cancelled", "returned", "claim"]);
const DONE = new Set(["completed", "delivered", "refunded"]);

export type StatusTone = "negative" | "done" | "progress";

export function statusTone(status: string): StatusTone {
  if (NEGATIVE.has(status)) return "negative";
  if (DONE.has(status)) return "done";
  return "progress";
}

/** Menus du backoffice selon le rôle (l'interface reflète les droits, le serveur les impose). */
export type NavItem = { href: string; label: string };

export function navFor(role: string): NavItem[] {
  const items: NavItem[] = [];

  if (["admin", "accountant", "order_operator"].includes(role)) items.push({ href: "/dashboard", label: "Tableau de bord" });
  if (["admin", "order_operator", "support", "accountant"].includes(role)) {
    items.push({ href: "/orders", label: "Commandes" });
  }
  if (["admin", "order_operator", "picker"].includes(role)) items.push({ href: "/preparation", label: "Préparation" });
  if (["admin", "stock_keeper", "picker", "buyer"].includes(role)) items.push({ href: "/stock", label: "Stock" });
  if (["admin", "support"].includes(role)) items.push({ href: "/claims", label: "Réclamations" });
  if (["admin", "order_operator"].includes(role)) items.push({ href: "/dispatch", label: "Régulation" });
  if (role === "courier") items.push({ href: "/my-route", label: "Ma tournée" });
  if (["admin", "order_operator"].includes(role)) items.push({ href: "/delivery", label: "Zones et créneaux" });
  if (["admin", "order_operator"].includes(role)) items.push({ href: "/cash-handover", label: "Remise de fonds" });
  if (["admin", "catalog_manager"].includes(role)) items.push({ href: "/products", label: "Produits" });
  if (["admin", "catalog_manager"].includes(role)) items.push({ href: "/catalog", label: "Rayons et recettes" });
  if (["admin", "catalog_manager", "marketing"].includes(role)) items.push({ href: "/banners", label: "Bannières" });
  if (["admin", "accountant"].includes(role)) items.push({ href: "/accounting", label: "Comptabilité" });
  if (["admin", "accountant", "order_operator"].includes(role)) items.push({ href: "/reports", label: "Rapports de ventes" });
  if (["admin", "support", "order_operator"].includes(role)) items.push({ href: "/customers", label: "Clients" });
  if (["admin", "marketing"].includes(role)) items.push({ href: "/promotions", label: "Promotions" });
  if (role === "admin") items.push({ href: "/staff", label: "Équipe" });
  if (role === "admin") items.push({ href: "/audit", label: "Journal d'audit" });

  return items;
}
