import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PickingScreen } from "@/components/PickingScreen";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Préparation d'une commande - Backoffice Marché de Yama" };

type Props = { params: Promise<{ id: string }> };

export default function PickListPage(props: Props) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <Suspense fallback={<p className="text-black/60">Chargement de la préparation…</p>}>
        <Detail {...props} />
      </Suspense>
    </main>
  );
}

async function Detail({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();

  const staff = await requireStaff(`/preparation/${id}`);
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/fulfillment/pick-lists/{pickList}", { params: { path: { pickList: Number(id) } } }).catch(() => null);

  if (result?.response.status === 403 || result?.response.status === 404) notFound();

  const list = result?.data?.data;
  if (!list) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger la préparation.</p>;

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/preparation" className="text-brand-green underline">← File de préparation</Link></p>
      <h1 className="mb-1 text-2xl font-bold">Commande n° {list.order_id.slice(0, 8)}</h1>
      <p className="mb-6 text-sm text-black/60">
        {list.status === "open" ? "Non prise en charge" : list.status === "in_progress" ? "En cours de préparation" : "Préparation terminée"}
      </p>
      <PickingScreen listId={list.id} status={list.status} lines={list.lines} />
    </>
  );
}
