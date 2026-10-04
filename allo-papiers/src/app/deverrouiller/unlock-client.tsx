"use client";

import { StepUpPanel } from "@/components/step-up";

export function UnlockClient({ suite }: { suite: string }) {
  return (
    <>
      <StepUpPanel title="Déverrouiller" onDone={() => (location.href = suite)} />
      <form action="/api/auth/logout" method="post" className="mt-6 border-t border-line pt-4" onSubmit={async (e) => { e.preventDefault(); await fetch("/api/auth/logout", { method: "POST" }); location.href = "/connexion"; }}>
        <button className="text-muted underline">Ce n'est pas moi / se déconnecter</button>
      </form>
    </>
  );
}
