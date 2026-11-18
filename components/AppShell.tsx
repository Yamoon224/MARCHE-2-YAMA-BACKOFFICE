"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useAppearance } from "@/components/AppearanceProvider";
import { Icon } from "@/components/NavIcons";
import { SettingsPanel } from "@/components/SettingsPanel";
import { groupedNavFor, isActive, ROLE_LABEL, type NavGroup } from "@/lib/navigation";

type Staff = { name: string; role: string };

/** Pages d'accès (la connexion est la racine) : plein écran, sans menu. */
const AUTH_PATHS = ["/", "/forgot-password", "/reset-password"];

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_COLLAPSED_WIDTH = "4.5rem";

/**
 * Le cadre de l'application : menu latéral (tiroir sur mobile), barre du haut avec les réglages et le compte.
 * Il lit lui-même la session. `undefined` = lecture en cours : le cadre s'affiche déjà, sans entrées, pour que la page
 * ne saute pas quand le menu arrive. `null` = pas de session : la page s'affiche seule (elle renvoie à la connexion).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appearance, update } = useAppearance();
  const [user, setUser] = useState<Staff | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const bare = AUTH_PATHS.includes(pathname);

  // Relit la session à chaque changement de page : elle peut avoir été fermée ou révoquée entre-temps.
  useEffect(() => {
    if (bare) return;

    let cancelled = false;

    fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((body: { user: Staff | null }) => !cancelled && setUser(body.user))
      .catch(() => !cancelled && setUser(null));

    return () => {
      cancelled = true;
    };
  }, [pathname, bare]);

  useEffect(() => {
    // Ferme le tiroir mobile et le menu du compte quand la page change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  function toggleMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) update({ collapsed: !appearance.collapsed });
    else setMobileOpen((open) => !open);
  }

  if (bare || user === null) return <>{children}</>;

  const collapsed = appearance.collapsed;
  const groups = user ? groupedNavFor(user.role) : [];

  return (
    <div style={{ "--sidebar-w": collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH } as CSSProperties} className="min-h-screen">
      <Sidebar groups={groups} collapsed={collapsed} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} pathname={pathname} />

      <div className="flex min-h-screen flex-col transition-[padding] duration-200 lg:pl-[var(--sidebar-w)]">
        <header style={{ backgroundColor: "var(--header-bg)", color: "var(--header-fg)" }} className="sticky top-0 z-20 border-b border-current/15">
          <div className="flex h-16 items-center gap-3 px-4">
            <button type="button" onClick={toggleMenu} aria-label="Afficher ou réduire le menu" className="rounded-lg p-2 hover:bg-current/10">
              <Icon name="menu" />
            </button>

            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Ouvrir les réglages" className="rounded-lg p-2 hover:bg-current/10">
                <Icon name="settings" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-label="Mon compte"
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 rounded-lg p-2 hover:bg-current/10"
                >
                  <Icon name="user" className="h-6 w-6" />
                  {user ? <span className="hidden max-w-40 truncate text-sm font-medium sm:block">{user.name}</span> : null}
                </button>

                {accountOpen && user ? (
                  <>
                    <button type="button" aria-label="Fermer le menu du compte" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-30 cursor-default" />
                    <div className="absolute right-0 top-full z-40 mt-2 w-60 rounded-xl border border-black/10 bg-white p-2 text-black shadow-lg">
                      <p className="truncate px-2 pt-1 text-sm font-semibold">{user.name}</p>
                      <p className="truncate px-2 pb-2 text-xs text-black/60">{ROLE_LABEL[user.role] ?? user.role}</p>
                      <button type="button" onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-black/5">
                        <Icon name="logout" className="h-4 w-4" /> Déconnexion
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1">{children}</div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function Sidebar({ groups, collapsed, mobileOpen, onCloseMobile, pathname }: { groups: NavGroup[]; collapsed: boolean; mobileOpen: boolean; onCloseMobile: () => void; pathname: string }) {
  // Replié, le menu ne montre que les icônes à partir de `lg` ; dans le tiroir mobile les libellés restent toujours visibles.
  const hideWhenCollapsed = collapsed ? "lg:hidden" : "";

  return (
    <>
      {mobileOpen ? <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onCloseMobile} aria-hidden /> : null}

      <aside
        style={{ backgroundColor: "var(--sidebar-bg)", color: "var(--sidebar-fg)" }}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-current/15 transition-all duration-200 lg:w-[var(--sidebar-w)] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className={`flex h-16 shrink-0 items-center border-b border-current/15 px-4 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
          <Link href="/" aria-label="Marché de Yama" className="flex items-center gap-3 overflow-hidden">
            <span className="block shrink-0 rounded-lg bg-white p-0.5">
              <Image src="/brand/logo-trimmed.png" alt="" width={761} height={689} priority className="h-10 w-auto" />
            </span>
            <span className={`flex flex-col leading-tight ${hideWhenCollapsed}`}>
              <span className="text-base font-extrabold">Marché de Yama</span>
              <span className="text-xs opacity-70">Backoffice</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Navigation du backoffice">
          {groups.map((group) => (
            <div key={group.label} className="mb-4">
              <p className={`px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide opacity-60 ${hideWhenCollapsed}`}>{group.label}</p>
              {collapsed ? <hr className="mx-2 mb-2 hidden border-current/15 lg:block" /> : null}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname);

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm transition-colors ${collapsed ? "lg:justify-center lg:px-2" : ""} ${
                          active ? "border-brand-red bg-current/10 font-semibold" : "border-transparent opacity-85 hover:bg-current/10 hover:opacity-100"
                        }`}
                      >
                        <Icon name={item.href} />
                        <span className={hideWhenCollapsed}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
