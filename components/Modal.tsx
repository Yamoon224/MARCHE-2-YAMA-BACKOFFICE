"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Boutons du pied de fenêtre (confirmer, annuler…). */
  footer?: ReactNode;
  size?: "md" | "lg" | "xl";
};

const WIDTH = { md: "sm:max-w-lg", lg: "sm:max-w-3xl", xl: "sm:max-w-5xl" } as const;

/**
 * Fenêtre modale accessible, basée sur l'élément natif <dialog> : le fond devient inerte, le focus reste dans la
 * fenêtre, Échap la ferme et le focus revient au bouton d'origine. Plein écran sur mobile, centrée au-delà de 640 px.
 */
export function Modal({ open, onClose, title, children, footer, size = "lg" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // Un clic sur le fond (hors du panneau) ferme la fenêtre.
      onClick={(event) => event.target === ref.current && onClose()}
      className="m-0 h-dvh max-h-dvh w-screen max-w-none bg-transparent p-0 backdrop:bg-[rgb(0_0_0/0.5)] sm:m-auto sm:h-auto sm:max-h-[90dvh] sm:w-[calc(100%-2rem)] sm:max-w-none"
    >
      {open && (
        <div className={`mx-auto flex h-full w-full flex-col bg-white sm:max-h-[90dvh] sm:rounded-2xl sm:shadow-xl ${WIDTH[size]}`}>
          <header className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3">
            <h2 id={titleId} className="text-lg font-bold">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full text-xl hover:bg-black/5">×</button>
          </header>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-black/10 px-4 py-3">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
