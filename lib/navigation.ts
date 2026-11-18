import { navFor, type NavItem } from "@/lib/orders/status";

export type NavGroup = { label: string; items: NavItem[] };

/** Groupe de chaque page du menu ; une page absente d'ici tombe dans « Autres ». */
const GROUP_OF: Record<string, string> = {
  "/orders": "Opérations",
  "/preparation": "Opérations",
  "/dispatch": "Opérations",
  "/delivery": "Opérations",
  "/my-route": "Opérations",
  "/stock": "Produits",
  "/catalog": "Produits",
  "/claims": "Clients",
  "/cash-handover": "Finances",
  "/accounting": "Finances",
};

const GROUP_ORDER = ["Opérations", "Produits", "Clients", "Finances", "Autres"];

/** Le menu d'un rôle, rangé par groupes (l'ordre des pages vient de navFor). */
export function groupedNavFor(role: string): NavGroup[] {
  const groups = new Map<string, NavItem[]>();

  for (const item of navFor(role)) {
    const label = GROUP_OF[item.href] ?? "Autres";
    groups.set(label, [...(groups.get(label) ?? []), item]);
  }

  return GROUP_ORDER.filter((label) => groups.has(label)).map((label) => ({ label, items: groups.get(label) ?? [] }));
}

/** Une entrée est active sur sa page et sur toutes les pages en dessous (/orders/12 allume « Commandes »). */
export function isActive(href: string, pathname: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur",
  order_operator: "Opérateur de commandes",
  picker: "Préparateur",
  stock_keeper: "Magasinier",
  buyer: "Acheteur",
  cashier: "Caissier",
  support: "Support client",
  courier: "Livreur",
  catalog_manager: "Responsable catalogue",
  accountant: "Comptable",
  marketing: "Marketing",
};
