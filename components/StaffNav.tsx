"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { navFor } from "@/lib/orders/status";

type Staff = { name: string; role: string } | null;

export function StaffNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<Staff | undefined>(undefined);

  // Relit la session à chaque changement de page : elle peut avoir été fermée ou révoquée entre-temps.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { user: Staff }) => !cancelled && setUser(body.user))
      .catch(() => !cancelled && setUser(null));

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
    router.push("/connexion");
    router.refresh();
  }

  if (!user) return null;

  return (
    <nav aria-label="Navigation du backoffice" className="flex flex-1 items-center gap-5 text-sm">
      {navFor(user.role).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
          className={pathname.startsWith(item.href) ? "font-semibold underline" : "hover:underline"}
        >
          {item.label}
        </Link>
      ))}
      <span className="ml-auto flex items-center gap-3">
        <span className="text-white/80">{user.name}</span>
        <button type="button" onClick={logout} className="rounded-full border border-white/60 px-3 py-1 hover:bg-white/10">
          Déconnexion
        </button>
      </span>
    </nav>
  );
}
