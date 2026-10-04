import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession, LOCK_MINUTES } from "@/lib/auth";
import { IdleLock } from "@/components/idle-lock";
import { StepUpHost } from "@/components/step-up";
import { integrationStatus } from "@/lib/env";

/** Espace connecté : session obligatoire, verrouillage après inactivité, vérification renforcée. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const status = integrationStatus();
  if (!status.database) {
    return (
      <div className="container-page py-16">
        <div className="card mx-auto max-w-xl p-8">
          <h1 className="font-display text-2xl font-semibold">Espace bientôt disponible</h1>
          <p className="mt-3 text-muted">La base de données n'est pas encore configurée sur ce site : la connexion aux comptes n'est donc pas active.</p>
        </div>
      </div>
    );
  }
  const session = await getSession();
  const h = await headers();
  const path = h.get("x-pathname") ?? "/espace";
  if (!session) redirect(`/connexion?suite=${encodeURIComponent(path)}`);
  if (session.session.locked) redirect(`/deverrouiller?suite=${encodeURIComponent(path)}`);
  return (
    <>
      <IdleLock minutes={LOCK_MINUTES} />
      <StepUpHost />
      {children}
    </>
  );
}
