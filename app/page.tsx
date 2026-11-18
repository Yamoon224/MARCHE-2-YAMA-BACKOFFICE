import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/components/LoginForm";
import { redirectIfSignedIn } from "@/lib/server/staff";

export const metadata = { title: "Connexion - Backoffice Marché de Yama" };

type SearchParams = Promise<{ next?: string | string[] }>;

/** La racine du backoffice est la page de connexion. */
export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthLayout>
      <Suspense fallback={<p className="text-center text-black/60">Chargement…</p>}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthLayout>
  );
}

async function Form({ searchParams }: { searchParams: SearchParams }) {
  const { next } = await searchParams;
  const requested = typeof next === "string" ? next : undefined;

  await redirectIfSignedIn(requested);

  return <LoginForm next={requested} />;
}
