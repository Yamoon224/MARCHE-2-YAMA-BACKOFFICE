"use client";

import { useEffect, useState } from "react";
import { BACKGROUND_PRESETS, isHexColor, PRIMARY_COLORS, type Appearance } from "@/lib/appearance";
import { useAppearance } from "./AppearanceProvider";
import { Icon } from "./NavIcons";

/** Tiroir de droite : couleur principale, fonds des barres, menu réduit, plein écran. */
export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { reset } = useAppearance();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 bg-[rgb(0_0_0/0.4)]" onClick={onClose} aria-hidden /> : null}

      <aside
        role="dialog"
        aria-label="Réglages"
        aria-hidden={!open}
        inert={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-black/10 bg-white text-black shadow-xl transition-transform duration-200 ${
          open ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between border-b border-black/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold">Réglages</h2>
            <p className="mt-0.5 text-xs text-black/60">Enregistrés sur cet appareil.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer les réglages" className="rounded p-1 text-black/60 hover:text-black">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <AppearanceControls />
        </div>

        <footer className="border-t border-black/10 px-5 py-3">
          <button type="button" onClick={reset} className="text-sm text-black/60 hover:text-black">
            ↺ Réinitialiser l&apos;apparence
          </button>
        </footer>
      </aside>
    </>
  );
}

/** Les réglages d'apparence eux-mêmes : partagés par le tiroir rapide et la page Paramètres. */
export function AppearanceControls() {
  const { appearance, update } = useAppearance();
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);

    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  return (
    <>
      <Section title="Couleur active">
        <p className="-mt-1 text-xs text-black/60">Titres soulignés, champs de saisie, onglets et barres de défilement.</p>
        <div className="flex flex-wrap gap-3">
          {PRIMARY_COLORS.map((color) => (
            <Swatch key={color} color={color} selected={appearance.primary === color} onClick={() => update({ primary: color })} size="lg" />
          ))}
          <CustomColor label="Couleur active personnalisée" value={appearance.primary} active={!(PRIMARY_COLORS as readonly string[]).includes(appearance.primary)} size="lg" onPick={(primary) => update({ primary })} />
        </div>
      </Section>

      <Section title="Fonds">
        <BackgroundPicker label="Menu latéral" field="sidebar" appearance={appearance} update={update} />
        <BackgroundPicker label="Barre du haut" field="header" appearance={appearance} update={update} />
      </Section>

      <Section title="Affichage">
        <Toggle label="Menu réduit aux icônes" hint="Grand écran uniquement." checked={appearance.collapsed} onChange={(collapsed) => update({ collapsed })} />
        <Toggle label="Plein écran" checked={fullscreen} onChange={toggleFullscreen} />
      </Section>
    </>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-black/60">{title}</h3>
      {children}
    </section>
  );
}

function Swatch({ color, selected, onClick, size = "md" }: { color: string; selected: boolean; onClick: () => void; size?: "md" | "lg" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={color}
      aria-pressed={selected}
      style={{ backgroundColor: color }}
      className={`flex items-center justify-center rounded-full border border-black/15 transition-transform hover:scale-110 ${size === "lg" ? "h-10 w-10" : "h-8 w-8"} ${
        selected ? "ring-2 ring-black ring-offset-2" : ""
      }`}
    >
      {selected ? (
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mix-blend-difference" aria-hidden>
          <path d="m5 12 5 5L20 7" />
        </svg>
      ) : null}
    </button>
  );
}

/** N'importe quelle couleur via le sélecteur du navigateur, à côté des pastilles prêtes à l'emploi. */
function CustomColor({ label, value, active, size = "md", onPick }: { label: string; value: string; active: boolean; size?: "md" | "lg"; onPick: (color: string) => void }) {
  return (
    <label
      title="Personnalisée"
      style={active ? { backgroundColor: value } : undefined}
      className={`relative flex cursor-pointer items-center justify-center rounded-full border border-dashed border-black/50 text-black/60 ${size === "lg" ? "h-10 w-10" : "h-8 w-8"} ${
        active ? "ring-2 ring-black ring-offset-2" : ""
      }`}
    >
      <span aria-hidden>+</span>
      <input type="color" aria-label={label} value={value} onChange={(event) => isHexColor(event.target.value) && onPick(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="text-xs text-black/60">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-brand-red" : "bg-black/20"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function BackgroundPicker({ label, field, appearance, update }: { label: string; field: "header" | "sidebar"; appearance: Appearance; update: (patch: Partial<Appearance>) => void }) {
  const current = appearance[field];
  const custom = current !== null && !(BACKGROUND_PRESETS as readonly string[]).includes(current);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{label}</p>
        <button
          type="button"
          onClick={() => update({ [field]: null })}
          aria-pressed={current === null}
          className={`rounded-full px-2.5 py-0.5 text-xs ${current === null ? "bg-brand-red/10 font-semibold text-brand-red" : "text-black/60 hover:text-black"}`}
        >
          Défaut
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {BACKGROUND_PRESETS.map((color) => (
          <Swatch key={color} color={color} selected={current === color} onClick={() => update({ [field]: color })} />
        ))}
        <CustomColor label={`${label} : couleur personnalisée`} value={current ?? "#ffffff"} active={custom} onPick={(color) => update({ [field]: color })} />
      </div>
    </div>
  );
}
