import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Connexion" };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const s = await getSession().catch(() => null);
  const safe = suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/espace";
  if (s && !s.session.locked) redirect(safe);
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-3xl font-semibold">Connexion</h1>
        <p className="mt-2 text-muted">Pas de mot de passe : nous vous envoyons un lien de connexion par email. Le compte est créé automatiquement la première fois.</p>
        <LoginForm suite={safe} />
      </div>
    </div>
  );
}
