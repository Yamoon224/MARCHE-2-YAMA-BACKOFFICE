"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { filterOptions, labelOf, moveActive, type SelectOption } from "@/lib/ui/search-select";

type Props = {
  /** Nom du champ envoyé avec le formulaire (la valeur choisie passe par un champ caché). */
  name?: string;
  id?: string;
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Texte quand rien n'est choisi. */
  placeholder?: string;
  /** Ajoute en tête une option de valeur vide (« Tous les rayons »…), choisie par défaut. */
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  /** Classes du conteneur (largeur, marges). */
  className?: string;
  "aria-label"?: string;
};

const MAX_LIST = 256;

/**
 * Liste déroulante avec recherche (combobox ARIA) : on tape pour filtrer sans tenir compte des accents, flèches haut/bas,
 * Entrée pour choisir, Échap pour fermer. Elle se comporte comme un `<select>` dans un formulaire : `name` + valeur envoyée.
 * Non contrôlée avec `defaultValue`, ou contrôlée avec `value` et `onChange`.
 */
export function SearchSelect({ name, id, options, value, defaultValue = "", onChange, placeholder = "Choisir…", emptyLabel, required, disabled, className = "", "aria-label": ariaLabel }: Props) {
  const autoId = useId();
  const inputId = id ?? `ss-${autoId}`;
  const listId = `${inputId}-list`;
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const current = controlled ? value : inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [box, setBox] = useState<CSSProperties>({});
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const all = useMemo<SelectOption[]>(() => (emptyLabel !== undefined ? [{ value: "", label: emptyLabel }, ...options] : [...options]), [options, emptyLabel]);
  const shown = useMemo(() => filterOptions(all, query).slice(0, MAX_LIST), [all, query]);
  const currentLabel = labelOf(all, current);

  // Place la liste sous le champ (ou au-dessus s'il manque de la place), en position fixe pour ne pas être rognée par une modale.
  useEffect(() => {
    if (!open) return;

    function place() {
      const rect = input.current?.getBoundingClientRect();
      if (!rect) return;

      const below = window.innerHeight - rect.bottom;
      const up = below < 220 && rect.top > below;
      const height = Math.max(120, Math.min(280, (up ? rect.top : below) - 12));

      setBox({ position: "fixed", left: rect.left, width: rect.width, maxHeight: height, ...(up ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }) });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function openList() {
    if (disabled) return;
    setOpen(true);
    setActive(Math.max(0, all.findIndex((o) => o.value === current)));
  }

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }

  function choose(option: SelectOption) {
    if (!controlled) setInner(option.value);
    onChange?.(option.value);
    close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) return openList();
      setActive((index) => moveActive(index, event.key === "ArrowDown" ? 1 : -1, shown.length));
    } else if (event.key === "Enter") {
      if (!open) return;
      event.preventDefault();
      const option = shown[active];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      if (!open) return;
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      close();
    }
  }

  return (
    <div className={`relative ${className}`}>
      <input
        ref={input}
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${inputId}-opt-${active}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        disabled={disabled}
        value={open ? query : currentLabel}
        placeholder={open ? (currentLabel || placeholder) : placeholder}
        onFocus={(event) => { openList(); event.currentTarget.select(); }}
        onClick={openList}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={onKeyDown}
        onBlur={close}
        className="!mt-0 block w-full cursor-pointer truncate py-2 !pr-9 text-sm"
      />
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/50 transition-transform ${open ? "rotate-180" : ""}`}>
        <path d="m6 9 6 6 6-6" />
      </svg>

      {name && required ? (
        // Champ invisible qui porte la valeur : le navigateur peut ainsi refuser l'envoi tant que rien n'est choisi.
        <input name={name} value={current} required tabIndex={-1} aria-hidden="true" onChange={() => undefined} className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0" />
      ) : name ? (
        <input type="hidden" name={name} value={current} />
      ) : null}

      {open && (
        // Le clic est neutralisé : dans un <label>, il rouvrirait la liste juste après le choix (le choix se fait au mousedown).
        <ul ref={list} id={listId} role="listbox" aria-label={ariaLabel} style={box} onClick={(event) => event.preventDefault()} className="z-[100] overflow-auto rounded-2xl border border-[var(--active)] bg-white py-1 text-sm shadow-lg">
          {shown.length === 0 ? (
            <li role="presentation" className="px-4 py-2 text-black/50">Aucun résultat</li>
          ) : (
            shown.map((option, index) => (
              <li
                key={option.value === "" ? "__empty" : option.value}
                id={`${inputId}-opt-${index}`}
                role="option"
                aria-selected={option.value === current}
                onMouseDown={(event) => { event.preventDefault(); choose(option); }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-4 py-2 ${index === active ? "bg-black/5" : ""} ${option.value === current ? "font-semibold" : ""}`}
              >
                {option.label}
                {option.hint && <span className="ml-2 text-xs text-black/50">{option.hint}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
