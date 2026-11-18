import { normalize } from "@/lib/table/table";

/** Nature d'une action : elle décide de l'icône et de la couleur du bouton, partout pareil. */
export type ActionKind =
  | "create" | "save" | "confirm" | "activate" | "restore" | "edit" | "delete" | "deactivate" | "refuse" | "recall"
  | "view" | "filter" | "search" | "export" | "upload" | "unlock" | "close" | "cancel" | "previous" | "next" | "grid"
  | "list" | "refund" | "login" | "logout" | "send" | "start" | "finish" | "verify" | "assign" | "location" | "reset" | "swap" | "remove";

export type Tone = "green" | "blue" | "red" | "slate" | "active" | "amber" | "gray";

export const TONE_OF: Record<ActionKind, Tone> = {
  create: "green", save: "green", confirm: "green", activate: "green", restore: "green", start: "green", finish: "green", send: "green", login: "green", verify: "green",
  edit: "blue", assign: "blue", location: "blue", swap: "blue",
  delete: "red", deactivate: "red", refuse: "red", recall: "red", remove: "red", refund: "red",
  view: "slate",
  filter: "active", search: "active",
  export: "amber", upload: "amber", unlock: "amber",
  close: "gray", cancel: "gray", previous: "gray", next: "gray", grid: "gray", list: "gray", logout: "gray", reset: "gray",
};

export type IconName =
  | "plus" | "save" | "check" | "power" | "undo" | "pencil" | "trash" | "ban" | "x-circle" | "alert" | "eye" | "funnel" | "search"
  | "download" | "upload" | "unlock" | "x" | "chevron-left" | "chevron-right" | "grid" | "list" | "log-in" | "log-out" | "send" | "play"
  | "flag" | "shield" | "user-check" | "map-pin" | "refresh" | "minus";

export const ICON_OF: Record<ActionKind, IconName> = {
  create: "plus", save: "save", confirm: "check", activate: "power", restore: "undo", edit: "pencil", delete: "trash", deactivate: "ban",
  refuse: "x-circle", recall: "alert", view: "eye", filter: "funnel", search: "search", export: "download", upload: "upload", unlock: "unlock",
  close: "x", cancel: "x", previous: "chevron-left", next: "chevron-right", grid: "grid", list: "list", refund: "undo", login: "log-in", logout: "log-out",
  send: "send", start: "play", finish: "flag", verify: "shield", assign: "user-check", location: "map-pin", reset: "undo", swap: "refresh", remove: "minus",
};

/** Premier motif qui correspond gagne : l'ordre compte (« réactiver » avant « activer », « annuler la commande » avant « annuler »). */
const RULES: [RegExp, ActionKind][] = [
  [/^(echec|declarer un echec|enregistrer l.echec)/, "refuse"],
  [/^(annuler la commande|refuser|rejeter|rupture)/, "refuse"],
  [/^(oui, )?(supprimer|suppression)/, "delete"],
  [/^(retirer|retrait)/, "remove"],
  [/^(desactiver|desactivation)/, "deactivate"],
  [/^(bloquer|rappel)/, "recall"],
  [/^(rembourser|remboursement)/, "refund"],
  [/^(restaurer|reactiver|retablir|restauration)/, "restore"],
  [/^(activer|activation)/, "activate"],
  [/^(modifier|editer|renommer|modification)/, "edit"],
  [/^(detail|voir|consulter|afficher)/, "view"],
  [/^(filtrer|appliquer)/, "filter"],
  [/^(chercher|rechercher)/, "search"],
  [/^(exporter|telecharger|pdf$|excel$|csv$|txt$|sql$)/, "export"],
  [/^(debloquer)/, "unlock"],
  [/^(envoyer|envoi|reinitialiser le mot|recevoir)/, "send"],
  [/^(reinitialiser|remettre a zero|reinitialisation)/, "reset"],
  [/^(se connecter|connexion)/, "login"],
  [/^(deconnexion|se deconnecter)/, "logout"],
  [/^(precedent)/, "previous"],
  [/^(suivant)/, "next"],
  [/^(grille)/, "grid"],
  [/^(liste)/, "list"],
  [/^(verifier)/, "verify"],
  [/^(commencer|demarrer|prendre en charge)/, "start"],
  [/^(terminer|finaliser|remettre|livrer)/, "finish"],
  [/^(assigner|affecter|attribuer)/, "assign"],
  [/^(partager|ma position)/, "location"],
  [/^(remplacer|substituer)/, "swap"],
  [/^(creer|creation|ajouter|nouveau|nouvelle|ouvrir)/, "create"],
  [/^(enregistrer|enregistrement|sauvegarder|changer le mot de passe|changement|mettre a jour)/, "save"],
  [/^(valider|confirmer|choisir|accepter|payer|encaisser)/, "confirm"],
  [/^(fermer)/, "close"],
  [/^(annuler|non$|plus tard)/, "cancel"],
];

/** Libellé normalisé : sans accents, sans « + » initial ni points de suspension. */
export function labelText(label: string): string {
  return normalize(label).replace(/^[+\s]+/, "").replace(/[….]+$/, "").trim();
}

/** L'action que décrit un libellé de bouton, ou `null` quand il n'en dit rien (alors pas d'icône automatique). */
export function inferAction(label: string): ActionKind | null {
  if (/^\s*\+/.test(label)) return "create";

  const text = labelText(label);
  if (text === "") return null;

  for (const [pattern, kind] of RULES) if (pattern.test(text)) return kind;

  return null;
}

export type ButtonStyle = "solid" | "outline" | "text";

/** Comment un bouton est habillé : plein (icône blanche), à bordure (bordure et texte teintés) ou texte seul. */
export function buttonStyle(className: string, opts: { inlineBackground?: boolean; tab?: boolean } = {}): ButtonStyle {
  if (opts.tab) return "text";
  if (opts.inlineBackground || /\bbg-brand-(green|red)\b/.test(className)) return "solid";
  if (/(^|\s)border(-[a-z0-9/[\]-]+)?(\s|$)/.test(className) && !/\bunderline\b/.test(className)) return "outline";

  return "text";
}
