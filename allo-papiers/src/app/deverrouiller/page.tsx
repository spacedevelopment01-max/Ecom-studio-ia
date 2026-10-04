import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { UnlockClient } from "./unlock-client";

export const metadata = { title: "Session verrouillée" };

export default async function Page({ searchParams }: { searchParams: Promise<{ suite?: string }> }) {
  const { suite } = await searchParams;
  const s = await getSession().catch(() => null);
  if (!s) redirect("/connexion");
  const safe = suite && suite.startsWith("/") && !suite.startsWith("//") ? suite : "/espace";
  if (!s.session.locked) redirect(safe);
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-10">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <p className="mb-4 text-muted">Votre session a été verrouillée après une période d'inactivité ({s.user.email}).</p>
        <UnlockClient suite={safe} />
      </div>
    </div>
  );
}
