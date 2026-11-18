import { Suspense } from "react";
import { AuthLayout } from "@/components/AuthLayout";
import { LoginForm } from "@/components/LoginForm";

export const metadata = { title: "Connexion - Backoffice Marché de Yama" };

type SearchParams = Promise<{ next?: string | string[] }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
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

  return <LoginForm next={typeof next === "string" ? next : undefined} />;
}
