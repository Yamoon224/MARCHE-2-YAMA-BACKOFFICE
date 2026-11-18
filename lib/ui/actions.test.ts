import { describe, expect, it } from "vitest";
import { buttonStyle, ICON_OF, inferAction, TONE_OF, type ActionKind } from "./actions";

describe("inferAction", () => {
  const cases: [string, ActionKind | null][] = [
    ["Supprimer", "delete"], ["Suppression…", "delete"], ["Oui, supprimer", "delete"], ["Restaurer", "restore"], ["Réactiver", "restore"],
    ["Activer", "activate"], ["Désactiver", "deactivate"], ["Modifier", "edit"], ["Détails", "view"],
    ["+ Nouveau produit", "create"], ["Créer le code", "create"], ["Enregistrer", "save"], ["Enregistrement…", "save"],
    ["Filtrer", "filter"], ["Chercher", "search"], ["Précédent", "previous"], ["Suivant", "next"], ["PDF", "export"], ["Exporter en CSV", "export"],
    ["Annuler", "cancel"], ["Annuler la commande", "refuse"], ["Déclarer un échec", "refuse"], ["Enregistrer l'échec", "refuse"],
    ["Fermer", "close"], ["Grille", "grid"], ["Liste", "list"], ["Vérifier l'intégrité", "verify"], ["Bloquer et rappeler le lot", "recall"],
    ["Rappeler", "recall"], ["Remettre la commande", "finish"], ["Se connecter", "login"], ["×", null], ["", null], ["Quelque chose", null],
  ];

  it.each(cases)("%s -> %s", (label, expected) => {
    expect(inferAction(label)).toBe(expected);
  });

  it("distingue réactiver (vert) de désactiver (rouge)", () => {
    expect(TONE_OF[inferAction("Réactiver")!]).toBe("green");
    expect(TONE_OF[inferAction("Désactiver")!]).toBe("red");
  });
});

describe("mapping des actions", () => {
  it("donne une couleur et une icône à chaque action", () => {
    expect(Object.keys(TONE_OF).sort()).toEqual(Object.keys(ICON_OF).sort());
  });

  it("suit la convention de couleurs", () => {
    expect(TONE_OF.create).toBe("green");
    expect(TONE_OF.edit).toBe("blue");
    expect(TONE_OF.delete).toBe("red");
    expect(TONE_OF.view).toBe("slate");
    expect(TONE_OF.filter).toBe("active");
    expect(TONE_OF.export).toBe("amber");
    expect(TONE_OF.cancel).toBe("gray");
  });
});

describe("buttonStyle", () => {
  it("reconnaît plein, bordure et texte", () => {
    expect(buttonStyle("rounded-full bg-brand-green px-4 text-white")).toBe("solid");
    expect(buttonStyle("rounded-full border border-black/20 px-4")).toBe("outline");
    expect(buttonStyle("text-brand-red underline")).toBe("text");
    expect(buttonStyle("rounded-full", { inlineBackground: true })).toBe("solid");
    expect(buttonStyle("border-b-2 px-5", { tab: true })).toBe("text");
  });
});
