import Link from "next/link";
import { Suspense } from "react";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Préparation - Backoffice Marché de Yama" };

export default function PreparationPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">File de préparation</h1>
      <Suspense fallback={<p className="text-black/60">Chargement…</p>}>
        <Queue />
      </Suspense>
    </main>
  );
}

async function Queue() {
  const staff = await requireStaff("/preparation");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/fulfillment/pick-lists").catch(() => null);

  if (result?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne permet pas de préparer des commandes.</p>;
  }

  const lists = result?.data?.data;
  if (!lists) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger la file de préparation.</p>;

  if (lists.length === 0) return <p className="text-black/70">Aucune commande à préparer pour le moment.</p>;

  return (
    <ul className="divide-y divide-black/10 rounded-xl border border-black/10 bg-white">
      {lists.map((list) => {
        const mine = list.picker_id === staff.user.id;

        return (
          <li key={list.id}>
            <Link href={`/preparation/${list.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-black/[0.02]">
              <span className="font-medium">Commande n° {list.order_id.slice(0, 8)}</span>
              <span className="text-sm text-black/60">{list.lines.length} article{list.lines.length > 1 ? "s" : ""}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${list.status === "open" ? "bg-brand-green/10 text-brand-green" : "bg-black/5"}`}>
                {list.status === "open" ? "À prendre" : mine ? "Ma préparation" : "En cours (autre préparateur)"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
