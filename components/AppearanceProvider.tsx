"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { cssVariables, DEFAULT_APPEARANCE, loadAppearance, MANAGED_VARIABLES, resolveTheme, saveAppearance, STORAGE_KEY, type Appearance } from "@/lib/appearance";

type Value = {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<Value | null>(null);

/**
 * Magasin des réglages d'apparence, lu avec useSyncExternalStore : pendant l'hydratation (y compris celle d'un
 * sous-arbre sous Suspense, qui peut arriver après le montage) React utilise le snapshot serveur — les valeurs par
 * défaut — puis passe au choix enregistré sur l'appareil. Le serveur et le premier rendu client concordent donc toujours.
 */
let snapshot: Appearance | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Appearance {
  snapshot ??= loadAppearance();

  return snapshot;
}

function getServerSnapshot(): Appearance {
  return DEFAULT_APPEARANCE;
}

function setSnapshot(next: Appearance): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  // Un autre onglet a changé les réglages : on les relit.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) setSnapshot(loadAppearance());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Garde les choix d'apparence, les conserve sur cet appareil et les applique au document (variables CSS et thème). */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const appearance = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const root = document.documentElement;

    for (const name of MANAGED_VARIABLES) root.style.removeProperty(name);
    for (const [name, value] of Object.entries(cssVariables(appearance))) root.style.setProperty(name, value);
  }, [appearance]);

  useEffect(() => {
    // Le thème : le choix explicite, ou le réglage du système en mode automatique (et ses changements en direct).
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.setAttribute("data-theme", resolveTheme(appearance.theme, query.matches));

    apply();
    if (appearance.theme !== "auto") return;

    query.addEventListener("change", apply);

    return () => query.removeEventListener("change", apply);
  }, [appearance.theme]);

  const update = useCallback((patch: Partial<Appearance>) => {
    const next = { ...getSnapshot(), ...patch };
    saveAppearance(next);
    setSnapshot(next);
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setSnapshot(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo(() => ({ appearance, update, reset }), [appearance, update, reset]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

const noSubscription = () => () => undefined;

/**
 * Les réglages courants. Tant que le composant appelant n'est pas hydraté il voit les valeurs par défaut (comme le
 * serveur), puis les vraies : un sous-arbre sous Suspense peut s'hydrater après que les réglages enregistrés ont été
 * lus, et ne doit pas produire un rendu différent de celui du serveur.
 */
export function useAppearance(): Value {
  const context = useContext(AppearanceContext);
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  if (!context) throw new Error("useAppearance doit être utilisé dans <AppearanceProvider>");

  return hydrated ? context : { ...context, appearance: DEFAULT_APPEARANCE };
}
