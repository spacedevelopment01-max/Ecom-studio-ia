"use client";

import { useEffect, useState } from "react";
import { Check, CreditCard } from "lucide-react";
import { api, ApiError } from "@/components/api";
import { Alert, PageTitle, Spinner } from "@/components/ui";

type Props = {
  plan: "free" | "plus";
  sub: { status: string; periodEnd: string | null; cancelAtPeriodEnd: boolean } | null;
  limits: { document: number; chat: number; compare: number };
  used: { document: number; chat: number; compare: number };
  stripeReady: boolean;
  testMode: boolean;
  retour: string | null;
};

const fr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export function Subscription({ plan, sub, limits, used, stripeReady, testMode, retour }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(retour === "paiement" && plan !== "plus");

  // Retour de Stripe : on attend la confirmation par le serveur (webhook signé), jamais la seule redirection.
  useEffect(() => {
    if (!waiting) return;
    let n = 0;
    const t = setInterval(async () => {
      n++;
      const s = await api<{ plan: string }>("/api/auth/session").catch(() => null);
      if (s?.plan === "plus" || n > 20) {
        clearInterval(t);
        location.replace("/compte/abonnement");
      }
    }, 3000);
    return () => clearInterval(t);
  }, [waiting]);

  async function call(url: string, json?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ url?: string }>(url, { method: "POST", json });
      if (r.url) location.href = r.url;
      else location.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action impossible.");
      setBusy(false);
    }
  }

  return (
    <div className="container-page max-w-3xl pb-10">
      <PageTitle eyebrow="Abonnement" title={plan === "plus" ? "Votre offre Plus" : "Passer à l'offre Plus"} />
      {waiting && <Alert tone="info" className="mb-5"><Spinner label="Confirmation du paiement par notre serveur… (cela peut prendre quelques secondes)" /></Alert>}
      {retour === "annule" && <Alert tone="info" className="mb-5">Paiement annulé : aucun abonnement n'a été créé.</Alert>}
      {error && <Alert tone="danger" className="mb-5">{error}</Alert>}
      {testMode && <Alert tone="warn" className="mb-5" title="Paiements en mode test">Aucun prélèvement réel : utilisez une carte de test Stripe (4242 4242 4242 4242, date future, n'importe quel code).</Alert>}

      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Ce mois-ci</h2>
        <ul className="mt-3 grid gap-2">
          <li>Documents : <strong>{used.document}</strong> / {limits.document}</li>
          {plan === "plus" && <li>Questions aux documents : <strong>{used.chat}</strong> / {limits.chat}</li>}
          {plan === "plus" && <li>Comparaisons : <strong>{used.compare}</strong> / {limits.compare}</li>}
        </ul>
      </section>

      {plan === "plus" && sub ? (
        <section className="card mt-5 grid gap-4 p-5 sm:p-6">
          <p className="text-xl font-semibold">Offre Plus — 4,99 € par mois</p>
          {sub.cancelAtPeriodEnd ? (
            <>
              <Alert tone="warn">Résiliation enregistrée : l'offre Plus reste active jusqu'au {sub.periodEnd ? fr(sub.periodEnd) : "terme de la période payée"}, puis votre compte repasse à l'offre gratuite. Aucun nouveau prélèvement.</Alert>
              <button className="btn btn-outline" onClick={() => call("/api/billing/resume")} disabled={busy}>Annuler la résiliation</button>
            </>
          ) : (
            <>
              {sub.periodEnd && <p className="text-muted">Prochain renouvellement : {fr(sub.periodEnd)}.</p>}
              <button className="btn btn-danger" onClick={() => { if (window.confirm("Résilier l'offre Plus ? Elle restera active jusqu'à la fin de la période payée.")) void call("/api/billing/cancel"); }} disabled={busy}>Résilier mon abonnement</button>
            </>
          )}
          <button className="btn btn-ghost justify-start" onClick={() => call("/api/billing/portal")} disabled={busy}><CreditCard className="h-5 w-5" aria-hidden /> Moyen de paiement et factures (Stripe)</button>
        </section>
      ) : (
        <section className="neon card mt-5 p-5 sm:p-7">
          <p className="font-display text-4xl font-semibold">4,99&nbsp;€ <span className="font-sans text-lg font-normal text-muted">par mois, TTC</span></p>
          <ul className="mt-5 grid gap-2.5">
            {[
              `Jusqu'à ${limits.document > 3 ? limits.document : 30} documents par mois (au lieu de 3)`,
              "Parcours avancés : paie, contrats de travail, fin de contrat, bail, assurance, notaire, courriers d'avocat",
              "Repérage d'anomalies et aide à la vérification",
              "Discussion avec vos documents et comparaisons",
              "Fiches de rendez-vous préparées par l'IA",
              "Résiliation en un clic depuis cette page, effective à la fin du mois payé",
            ].map((t) => <li key={t} className="flex gap-3"><Check className="mt-1 h-5 w-5 shrink-0 text-orange" aria-hidden />{t}</li>)}
          </ul>
          <p className="mt-4 text-[0.95rem] text-muted">Pas de passage automatique : l'abonnement n'est créé que si vous le confirmez ci-dessous. Le paiement est géré par Stripe ; Allô Papiers ne voit jamais votre numéro de carte.</p>
          {!stripeReady ? (
            <Alert tone="warn" className="mt-5">Les paiements ne sont pas encore activés sur ce site.</Alert>
          ) : (
            <>
              <label className="mt-5 flex items-start gap-3 rounded-2xl bg-orange-soft/70 p-4">
                <input type="checkbox" className="check" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
                <span>Je souhaite souscrire l'offre Plus à <strong>4,99 € par mois</strong>, résiliable à tout moment.</span>
              </label>
              <button className="btn btn-primary mt-4 w-full" onClick={() => call("/api/billing/checkout", { confirmPrice: true })} disabled={!confirm || busy}>Continuer vers le paiement sécurisé</button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
