import { Suspense } from "react";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { DownNotice } from "@/components/admin/notices";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Paramètres - Backoffice Marché de Yama" };

export default function SettingsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Paramètres</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const staff = await requireStaff("/settings");
  if (staff.status === "down") return <DownNotice />;

  return <AppearanceSettings />;
}
