import { Suspense } from "react";
import { formatXof } from "@/lib/format";
import { requireStaff } from "@/lib/server/staff";

export const metadata = { title: "Comptabilité — Backoffice Marché de Yama" };

export default function ComptabilitePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold">Balance générale</h1>
      <Suspense fallback={<p className="text-black/60">Chargement de la balance…</p>}>
        <TrialBalance />
      </Suspense>
    </main>
  );
}

async function TrialBalance() {
  const staff = await requireStaff("/comptabilite");
  if (staff.status === "down") {
    return <p role="status" className="rounded-lg bg-black/5 p-3 text-sm">Service momentanément indisponible. Réessayez dans un instant.</p>;
  }

  const result = await staff.api.GET("/api/v1/accounting/trial-balance").catch(() => null);

  if (result?.response.status === 403) {
    return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Votre rôle ne donne pas accès à la comptabilité.</p>;
  }

  const balance = result?.data;
  if (!balance) return <p role="alert" className="rounded-lg bg-brand-red/10 p-3 text-sm text-brand-red">Impossible de charger la balance.</p>;

  return (
    <>
      <p
        role="status"
        className={`mb-4 rounded-lg p-3 text-sm font-medium ${balance.balanced ? "bg-brand-green/10 text-brand-green" : "bg-brand-red/10 text-brand-red"}`}
      >
        {balance.balanced ? "Grand livre équilibré : total des débits = total des crédits." : "ALERTE : le grand livre est déséquilibré."}
      </p>

      <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 bg-black/[0.03] text-xs uppercase text-black/60">
            <tr>
              <th scope="col" className="px-4 py-3">Compte</th>
              <th scope="col" className="px-4 py-3">Libellé</th>
              <th scope="col" className="px-4 py-3 text-right">Débit</th>
              <th scope="col" className="px-4 py-3 text-right">Crédit</th>
              <th scope="col" className="px-4 py-3 text-right">Solde</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {balance.accounts.map((account) => (
              <tr key={account.code}>
                <td className="px-4 py-2 font-mono">{account.code}</td>
                <td className="px-4 py-2">{account.name}</td>
                <td className="px-4 py-2 text-right">{formatXof(account.debit_minor)}</td>
                <td className="px-4 py-2 text-right">{formatXof(account.credit_minor)}</td>
                <td className="px-4 py-2 text-right font-semibold">{formatXof(account.balance_minor)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-black/20 font-bold">
            <tr>
              <td className="px-4 py-3" colSpan={2}>Totaux</td>
              <td className="px-4 py-3 text-right">{formatXof(balance.total_debit_minor)}</td>
              <td className="px-4 py-3 text-right">{formatXof(balance.total_credit_minor)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}
