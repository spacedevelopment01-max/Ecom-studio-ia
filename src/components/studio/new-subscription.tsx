"use client";
/**
 * « + Créer un nouveau projet » sans abonnement disponible : 1 abonnement = 1 projet. Le client choisit un nouveau
 * forfait et passe par le paiement Stripe ; l'abonnement n'est créé qu'à la confirmation du paiement par le serveur
 * (webhook), jamais par la page de retour.
 */
import { useState } from "react";
import { api, useToast } from "../ui";
import { useT } from "../i18n";
import { PricingCards } from "../pricing";
import type { Billing, PlanId } from "@/lib/plans";

export const ONE_PROJECT_RULE = {
  fr: "Chaque abonnement E-COM STUDIO IA est associé à un seul projet. Pour créer une nouvelle activité, choisissez un nouvel abonnement.",
  en: "Each E-COM STUDIO IA subscription is tied to a single project. To create a new business, choose a new subscription.",
};

export function NewSubscription({ paymentsOpen, initialPlan }: { paymentsOpen: boolean; initialPlan?: PlanId | null }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const choose = async (plan: PlanId, billing: Billing) => {
    setBusy(`plan-${plan}`);
    try {
      const r = await api<{ url: string }>("/api/billing/checkout", { body: { kind: "subscription", plan, billing } });
      window.location.href = r.url;
    } catch (e) {
      toast("bad", (e as Error).message);
      setBusy(null);
    }
  };
  return (
    <div>
      <p className="mx-auto max-w-2xl rounded-2xl bg-signal-soft px-4 py-3 text-center text-[15px] font-medium text-ink">{t(ONE_PROJECT_RULE.fr, ONE_PROJECT_RULE.en)}</p>
      <div className="mt-8">
        <PricingCards newSubscription selected={initialPlan ?? null} onChoose={choose} busy={busy} disabledReason={paymentsOpen ? null : t("Le paiement en ligne ouvre bientôt.", "Online payment opens soon.")} />
      </div>
      <p className="mt-4 text-center text-sm text-muted">{t("Votre projet se crée juste après la confirmation du paiement. Si vous fermez la page, l'abonnement payé vous attend ici : retrouvez-le avant de commencer un autre achat.", "Your project is created right after the payment is confirmed. If you close the page, the paid subscription waits for you here: find it before starting another purchase.")}</p>
    </div>
  );
}
