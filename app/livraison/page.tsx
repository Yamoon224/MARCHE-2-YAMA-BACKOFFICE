import { Suspense } from "react";
import { DeliveryAdmin } from "@/components/DeliveryAdmin";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Livraison — Backoffice Marché de Yama" };

export default function LivraisonPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Zones et créneaux de livraison</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}

async function Content() {
  const staff = await requireStaff("/livraison");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  if (!["admin", "order_operator"].includes(staff.user.role)) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de gérer la livraison.</p>;
  }

  const result = await staff.api.GET("/api/v1/delivery/zones").catch(() => null);

  return <DeliveryAdmin zones={result?.data?.data ?? []} />;
}
