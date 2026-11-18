"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { cssVariables, DEFAULT_APPEARANCE, loadAppearance, MANAGED_VARIABLES, saveAppearance, type Appearance } from "@/lib/appearance";

type Value = {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<Value | null>(null);

/**
 * Garde les choix d'apparence, les conserve sur cet appareil et les applique au document sous forme de variables CSS.
 * Part des valeurs par défaut puis lit le stockage après le montage, pour que le serveur et le premier rendu concordent.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

  useEffect(() => {
    // Le stockage n'existe que dans le navigateur, donc après le montage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAppearance(loadAppearance());
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    for (const name of MANAGED_VARIABLES) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(cssVariables(appearance))) root.style.setProperty(name, value);
  }, [appearance]);

  const update = useCallback((patch: Partial<Appearance>) => {
    setAppearance((current) => {
      const next = { ...current, ...patch };
      saveAppearance(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setAppearance(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo(() => ({ appearance, update, reset }), [appearance, update, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): Value {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error("useAppearance doit être utilisé dans <AppearanceProvider>");

  return context;
}
