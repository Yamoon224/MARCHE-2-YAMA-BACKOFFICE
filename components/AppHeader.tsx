"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { StaffNav } from "@/components/StaffNav";

/** Pages d'accès : plein écran, sans l'en-tête du backoffice. */
const AUTH_PATHS = ["/login", "/forgot-password", "/reset-password"];

export function AppHeader() {
  const pathname = usePathname();

  if (AUTH_PATHS.includes(pathname)) return null;

  return (
    <header className="bg-brand-red text-white">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-2">
        <Link href="/" aria-label="Backoffice Marché de Yama">
          <Image src="/brand/logo-on-red.jpg" alt="Marché de Yama" width={72} height={64} priority />
        </Link>
        <Suspense fallback={null}>
          <StaffNav />
        </Suspense>
      </div>
    </header>
  );
}
