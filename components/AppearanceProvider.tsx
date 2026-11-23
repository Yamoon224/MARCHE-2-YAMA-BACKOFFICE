
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  cssVariables,
  DEFAULT_APPEARANCE,
  loadAppearance,
  MANAGED_VARIABLES,
  saveAppearance,
  STORAGE_KEY,
  type Appearance,
} from "@/lib/appearance";

type Value = {
  appearance: Appearance;
  update: (patch: Partial<Appearance>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<Value | null>(null);

let snapshot: Appearance | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): Appearance {
  snapshot ??= loadAppearance();
  return { ...snapshot, theme: "light" };
}

function getServerSnapshot(): Appearance {
  return DEFAULT_APPEARANCE;
}

function setSnapshot(next: Appearance): void {
  snapshot = { ...next, theme: "light" };

  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) {
      setSnapshot(loadAppearance());
    }
  };

  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function AppearanceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const appearance = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  useEffect(() => {
    const root = document.documentElement;

    // Toujours imposer le thème clair.
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "only light";

    // Appliquer les variables CSS personnalisées.
    for (const name of MANAGED_VARIABLES) {
      root.style.removeProperty(name);
    }

    for (const [name, value] of Object.entries(
      cssVariables({ ...appearance, theme: "light" })
    )) {
      root.style.setProperty(name, value);
    }
  }, [appearance]);

  const update = useCallback((patch: Partial<Appearance>) => {
    const next: Appearance = {
      ...getSnapshot(),
      ...patch,
      theme: "light",
    };

    saveAppearance(next);
    setSnapshot(next);
  }, []);

  const reset = useCallback(() => {
    saveAppearance(DEFAULT_APPEARANCE);
    setSnapshot(DEFAULT_APPEARANCE);
  }, []);

  const value = useMemo(
    () => ({ appearance, update, reset }),
    [appearance, update, reset]
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

const noSubscription = () => () => undefined;

export function useAppearance(): Value {
  const context = useContext(AppearanceContext);

  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false
  );

  if (!context) {
    throw new Error(
      "useAppearance doit être utilisé dans <AppearanceProvider>"
    );
  }

  return hydrated
    ? context
    : { ...context, appearance: DEFAULT_APPEARANCE };
}
