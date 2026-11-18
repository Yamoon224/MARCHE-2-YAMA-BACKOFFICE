"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { useAppearance } from "@/components/AppearanceProvider";
import { SettingsPanel } from "@/components/SettingsPanel";
import { StaffNav } from "@/components/StaffNav";

/** Pages d'accès : plein écran, sans l'en-tête du backoffice. */
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function AppHeader() {
  const pathname = usePathname();
  const { appearance } = useAppearance();
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (AUTH_PATHS.includes(pathname)) return null;

  return (
    <>
      <header style={{ backgroundColor: "var(--header-bg, #c1121f)", color: "var(--header-fg, #ffffff)" }}>
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2">
          <Link href="/" aria-label="Backoffice Marché de Yama">
            {appearance.header === null ? (
              <Image src="/brand/logo-on-red.jpg" alt="Marché de Yama" width={72} height={64} priority />
            ) : (
              // Le logo « sur rouge » a son fond dans l'image : sur un autre fond, on prend le logo détouré sur une pastille blanche.
              <span className="block rounded-lg bg-white p-1">
                <Image src="/brand/logo-trimmed.png" alt="Marché de Yama" width={761} height={689} priority className="h-14 w-auto" />
              </span>
            )}
          </Link>
          <Suspense fallback={null}>
            <StaffNav />
          </Suspense>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Ouvrir les réglages"
            className="ml-auto rounded-full p-2 hover:bg-current/10"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
