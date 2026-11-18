import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ActionIcon } from "@/components/ActionIcon";
import { buttonStyle, ICON_OF, inferAction, TONE_OF, type ActionKind } from "@/lib/ui/actions";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Nature de l'action ; sinon elle se déduit du libellé. `false` : pas d'icône. */
  action?: ActionKind | false;
};

/** Texte brut d'un contenu de bouton (les chaînes, y compris dans les éléments imbriqués). */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) return textOf((node as { props: { children?: ReactNode } }).props.children);

  return "";
}

/**
 * Bouton d'action : icône à gauche, colorée selon l'action (vert créer/enregistrer, bleu modifier, rouge supprimer,
 * ardoise voir, couleur active filtrer, ambre exporter, gris fermer/annuler). Sans libellé reconnu ni `action`, c'est un
 * bouton ordinaire. Les boutons pleins gardent une icône blanche ; ceux à bordure teintent bordure et texte.
 */
export function Btn({ action, className = "", children, style, role, "aria-label": ariaLabel, ...rest }: Props) {
  const label = textOf(children);
  const kind = action === false ? null : (action ?? (label.trim() !== "" ? inferAction(label) : null));

  const look = buttonStyle(className, { inlineBackground: Boolean(style?.backgroundColor), tab: role === "tab" });

  if (!kind) {
    // Un bouton plein sans action reconnue suit quand même le dégradé de sa couleur (sans icône).
    const tone = look === "solid" ? (/\bbg-brand-red\b/.test(className) ? "red" : /\bbg-brand-green\b/.test(className) ? "green" : "active") : null;

    return (
      <button {...rest} role={role} aria-label={ariaLabel} style={style} className={tone ? `${className} act act-${tone} act-solid` : className}>
        {children}
      </button>
    );
  }

  return (
    <button
      {...rest}
      role={role}
      aria-label={ariaLabel}
      style={style}
      className={`${className} act act-${TONE_OF[kind]} act-${look} inline-flex items-center justify-center gap-1.5`}
    >
      <ActionIcon name={ICON_OF[kind]} className="act-icon h-4 w-4" />
      {children}
    </button>
  );
}
