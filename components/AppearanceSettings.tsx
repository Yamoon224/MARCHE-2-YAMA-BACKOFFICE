"use client";

import { Btn } from "@/components/Btn";
import { useAppearance } from "@/components/AppearanceProvider";
import { AppearanceControls, Section } from "@/components/SettingsPanel";
import { BRAND_RED } from "@/lib/appearance";

/** Page Paramètres : les mêmes réglages que le tiroir rapide, avec un aperçu et la remise à zéro. */
export function AppearanceSettings() {
  const { appearance, reset } = useAppearance();
  const isDefault = appearance.primary === BRAND_RED && !appearance.header && !appearance.sidebar && !appearance.collapsed;

  return (
    <div className="space-y-6">
      <p className="text-sm text-black/60">Ces réglages sont enregistrés sur cet appareil uniquement.</p>

      <div className="flex flex-col gap-6 rounded-2xl border border-black/10 bg-white p-5">
        <AppearanceControls />
      </div>

      <Section title="Aperçu">
        <div className="flex flex-wrap items-center gap-3">
          <input aria-label="Exemple de champ" placeholder="Exemple de champ" readOnly className="w-56 py-2 text-sm" />
          <span className="rounded-full px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: "var(--active)" }}>Bouton</span>
          <span className="text-xs text-black/60">Couleur active : <b>{appearance.primary}</b></span>
        </div>
      </Section>

      <Btn type="button" action="reset" onClick={reset} disabled={isDefault} className="rounded-full border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-40">
        Réinitialiser l&apos;apparence
      </Btn>
    </div>
  );
}
