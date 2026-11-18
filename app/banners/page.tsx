import { Suspense } from "react";
import { BannersManager } from "@/components/banners/BannersManager";
import { DownNotice, LoadError } from "@/components/admin/notices";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Bannières - Backoffice Marché de Yama" };

export default function BannersPage() {
  return (
    <main className="px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Bannières de la vitrine</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const staff = await requireStaff("/banners");
  if (staff.status === "down") return <DownNotice />;

  if (!["admin", "catalog_manager", "marketing"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer les bannières.</p>;
  }

  const banners = await staff.api.GET("/api/v1/catalog/banners").catch(() => null);
  if (!banners?.data) return <LoadError status={banners?.response.status} what="les bannières" />;

  return <BannersManager banners={banners.data.data ?? []} />;
}
