"use client";
/**
 * « Gérer mon abonnement » d'UN projet : forfait, statut, prochaine échéance, IA du forfait et recharges (en %),
 * changement de forfait (ce projet seulement), résiliation en fin de période ou reprise, recharge IA de 10 €,
 * réabonnement d'un projet résilié. Les autres projets du compte ne changent jamais.
 */
import { useState } from "react";
import { api, Badge, Button, formatDate, Modal, Select, useApi, useToast } from "../ui";
import { useLang, useT } from "../i18n";
import { formatEur, UsageMeter } from "../billing-client";
import { PLAN_IDS, PLANS, TOPUP_PRICE_EUR, type Billing, type PlanId } from "@/lib/plans";

export type ProjectSub = {
  plan: PlanId;
  billing: Billing;
  status: string;
  periodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  managedByAdmin: boolean;
  ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean; pending?: boolean } | null;
  /** Date à laquelle le budget IA du forfait repart à 0 %. */
  aiRenewsAt?: number;
  topups: { amountEur: number; refundedEur: number; at: number }[];
};

export const SUB_STATUS: Record<string, { fr: string; en: string; tone: "ok" | "warn" | "bad" | "neutral" }> = {
  active: { fr: "Actif", en: "Active", tone: "ok" },
  manual: { fr: "Offert par l'équipe", en: "Granted by the team", tone: "ok" },
  past_due: { fr: "Paiement en retard", en: "Payment overdue", tone: "warn" },
  canceled: { fr: "Résilié", en: "Canceled", tone: "bad" },
  none: { fr: "Sans abonnement", en: "No subscription", tone: "neutral" },
  trial: { fr: "Essai", en: "Trial", tone: "neutral" },
};

export function ProjectSubscriptionDialog({ projectId, name, open, onClose, onChanged }: { projectId: string; name: string; open: boolean; onClose: () => void; onChanged?: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { data, reload } = useApi<{ subscription: ProjectSub | null }>(open ? `/api/projects/${projectId}/subscription` : null);
  const s = data?.subscription ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanId | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const wantPlan = plan ?? s?.plan ?? "creer";
  const wantBilling = billing ?? s?.billing ?? "month";
  const paid = !!s && (s.status === "active" || s.status === "manual");
  const run = async (key: string, fn: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    try {
      await fn();
      if (done) toast("ok", done);
      reload();
      onChanged?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const checkout = (body: unknown, key: string) =>
    run(key, async () => {
      const r = await api<{ url: string }>("/api/billing/checkout", { body });
      window.location.href = r.url;
    });
  const date = (ms: number | null) => (ms ? formatDate(ms, { day: "numeric", month: "long", year: "numeric" }) : "—");
  const st = SUB_STATUS[s?.status ?? "none"] ?? SUB_STATUS.none;
  return (
    <Modal open={open} onClose={onClose} title={t(`Abonnement de « ${name} »`, `Subscription for "${name}"`)} wide>
      {!data ? (
        <div className="skeleton h-40 rounded-2xl" aria-busy="true" />
      ) : !s ? (
        <p className="text-sm text-ink-2">{t("Ce projet n'a pas d'abonnement.", "This project has no subscription.")}</p>
      ) : (
        <div className="grid gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-2xl font-semibold">{PLANS[s.plan].name[lang]}</p>
            <Badge tone={st.tone} dot>{st[lang]}</Badge>
            <span className="text-sm text-muted">· {formatEur(PLANS[s.plan].price[s.billing], lang)} {s.billing === "year" ? t("TTC / an", "incl. VAT / year") : t("TTC / mois", "incl. VAT / month")}</span>
          </div>
          <p className="text-sm text-ink-2">
            {s.status === "canceled"
              ? t("Abonnement terminé : le projet et ses données sont conservés. Réabonnez-le pour retrouver ses fonctions.", "Subscription ended: the project and its data are kept. Resubscribe it to get its features back.")
              : s.cancelAtPeriodEnd
                ? t(`Résiliation prévue le ${date(s.periodEnd)} : rien ne sera plus facturé ensuite.`, `Cancellation scheduled on ${date(s.periodEnd)}: nothing will be charged after that.`)
                : s.periodEnd
                  ? t(`Prochaine échéance : ${date(s.periodEnd)}.`, `Next renewal: ${date(s.periodEnd)}.`)
                  : null}
          </p>

          {s.ai && (
            <div className="grid gap-3 rounded-2xl border border-line p-4">
              {s.ai.pending && <p className="text-sm" role="status">{t("Une génération utilise temporairement le budget disponible. Attendez son résultat avant une nouvelle action ; les pourcentages montrent la consommation enregistrée.", "A generation is temporarily using the available budget. Wait for its result before a new action; percentages show recorded usage.")}</p>}
              <div>
                <p className="flex justify-between text-sm"><span className="font-medium">{t("IA du forfait (ce projet)", "Plan AI (this project)")}</span><span className="tabular-nums">{t(`reste ${100 - s.ai.plan.used} %`, `${100 - s.ai.plan.used}% left`)}</span></p>
                <div className="mt-1.5"><UsageMeter used={s.ai.plan.used} label={t("IA du forfait", "Plan AI")} /></div>
              </div>
              {s.ai.credits && (
                <div>
                  <p className="flex justify-between text-sm"><span className="font-medium">{t("Recharges IA (ce projet)", "AI top-ups (this project)")}</span><span className="tabular-nums">{t(`reste ${100 - s.ai.credits.used} %`, `${100 - s.ai.credits.used}% left`)}</span></p>
                  <div className="mt-1.5"><UsageMeter used={s.ai.credits.used} label={t("Recharges IA", "AI top-ups")} /></div>
                </div>
              )}
              {paid && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs text-muted">{t("La recharge s'ajoute au budget IA de ce projet seulement, et n'expire pas.", "The top-up is added to this project's AI budget only, and never expires.")}</p>
                  <Button size="sm" variant="secondary" loading={busy === "topup"} disabled={!!busy} onClick={() => checkout({ kind: "topup", projectId }, "topup")}>{t(`Recharger l'IA · ${formatEur(TOPUP_PRICE_EUR, lang)}`, `Top up AI · ${formatEur(TOPUP_PRICE_EUR, lang)}`)}</Button>
                </div>
              )}
            </div>
          )}

          {s.status === "canceled" ? (
            <div className="grid gap-3 rounded-2xl border border-line p-4">
              <p className="font-medium">{t("Réabonner ce projet", "Resubscribe this project")}</p>
              <PlanChoice plan={wantPlan} billing={wantBilling} onPlan={setPlan} onBilling={setBilling} />
              <Button variant="signal" loading={busy === "reactivate"} disabled={!!busy} onClick={() => checkout({ kind: "reactivate", projectId, plan: wantPlan, billing: wantBilling }, "reactivate")}>{t("Payer et réactiver ce projet", "Pay and reactivate this project")}</Button>
            </div>
          ) : s.managedByAdmin ? (
            <p className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">{t("Cet abonnement est géré par l'équipe E-COM STUDIO IA : contactez-la pour le modifier.", "This subscription is managed by the E-COM STUDIO IA team: contact them to change it.")}</p>
          ) : (
            <>
              <div className="grid gap-3 rounded-2xl border border-line p-4">
                <p className="font-medium">{t("Changer le forfait de ce projet", "Change this project's plan")}</p>
                <p className="text-xs text-muted">{t("Une hausse est facturée tout de suite au prorata ; une baisse s'ajuste au prorata sur les prochaines factures. Vos autres projets ne changent pas.", "An upgrade is charged right away, prorated; a downgrade is prorated on the next invoices. Your other projects don't change.")}</p>
                <PlanChoice plan={wantPlan} billing={wantBilling} onPlan={setPlan} onBilling={setBilling} />
                <Button variant="primary" loading={busy === "change"} disabled={!!busy || (wantPlan === s.plan && wantBilling === s.billing)} onClick={() => run("change", () => api(`/api/projects/${projectId}/subscription`, { body: { action: "change", plan: wantPlan, billing: wantBilling } }), t("Forfait modifié pour ce projet.", "Plan changed for this project."))}>{t("Changer le forfait", "Change plan")}</Button>
              </div>
              {s.cancelAtPeriodEnd ? (
                <Button variant="secondary" loading={busy === "resume"} disabled={!!busy} onClick={() => run("resume", () => api(`/api/projects/${projectId}/subscription`, { body: { action: "resume" } }), t("Résiliation annulée.", "Cancellation withdrawn."))}>{t("Annuler la résiliation", "Withdraw cancellation")}</Button>
              ) : (
                <Button variant="ghost" loading={busy === "cancel"} disabled={!!busy} onClick={() => confirm(t("Résilier l'abonnement de ce projet à la fin de la période payée ? Vos autres projets ne sont pas concernés.", "Cancel this project's subscription at the end of the paid period? Your other projects are not affected.")) && run("cancel", () => api(`/api/projects/${projectId}/subscription`, { body: { action: "cancel" } }), t("Résiliation programmée en fin de période.", "Cancellation scheduled for the end of the period."))}>{t("Résilier à la fin de la période", "Cancel at the end of the period")}</Button>
              )}
            </>
          )}

          {s.topups.length > 0 && (
            <div>
              <p className="text-sm font-medium">{t("Recharges de ce projet", "This project's top-ups")}</p>
              <ul className="mt-2 grid gap-1 text-sm text-ink-2">
                {s.topups.map((x, i) => (
                  <li key={i} className="flex justify-between gap-3"><span>{formatDate(x.at, { day: "numeric", month: "long", year: "numeric" })}</span><span className="tabular-nums">{formatEur(x.amountEur, lang)}{x.refundedEur > 0 && ` · ${t("remboursé", "refunded")} ${formatEur(x.refundedEur, lang)}`}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PlanChoice({ plan, billing, onPlan, onBilling }: { plan: PlanId; billing: Billing; onPlan: (p: PlanId) => void; onBilling: (b: Billing) => void }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Select aria-label={t("Forfait", "Plan")} value={plan} onChange={(e) => onPlan(e.target.value as PlanId)}>
        {PLAN_IDS.map((id) => <option key={id} value={id}>{PLANS[id].name[lang]} · {formatEur(PLANS[id].price[billing], lang)}</option>)}
      </Select>
      <Select aria-label={t("Facturation", "Billing")} value={billing} onChange={(e) => onBilling(e.target.value as Billing)}>
        <option value="month">{t("Mensuel", "Monthly")}</option>
        <option value="year">{t("Annuel (2 mois offerts)", "Yearly (2 months free)")}</option>
      </Select>
    </div>
  );
}
