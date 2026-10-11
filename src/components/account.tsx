"use client";
/**
 * Mon compte : un abonnement par projet (forfait, statut, échéance, IA en %, gestion), total mensuel, historique des
 * paiements, sécurité. Jamais de coût d'IA en euros. Données : GET /api/projects et GET /api/billing.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge, Card, formatDate, Logo, ThemeToggle, useApi, useToast } from "./ui";
import { LangSwitch, useLang, useT } from "./i18n";
import { formatEur, useBilling } from "./billing-client";
import { ProjectSubscriptionDialog, SUB_STATUS } from "./studio/project-subscription";
import { SecurityCard } from "./password-forms";
import { PLANS, type Billing, type PlanId } from "@/lib/plans";

export function AccountPage() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { billing: b, reload, error } = useBilling();
  const { data: me } = useApi<{ user: { email: string; name: string; role: string } }>("/api/me");
  useEffect(() => {
    const u = new URL(window.location.href);
    const plan = u.searchParams.get("plan");
    // Ancien lien « ?plan= » (accueil, studio) : un forfait = un nouvel abonnement pour un nouveau projet.
    if (plan && plan in PLANS) {
      window.location.replace(`/studio?nouveau=1&plan=${plan}&billing=${u.searchParams.get("billing") === "year" ? "year" : "month"}`);
      return;
    }
    const p = u.searchParams.get("paiement");
    if (!p) return;
    toast(p === "ok" ? "ok" : "bad", p === "ok" ? t("Paiement reçu. Votre compte se met à jour dès la confirmation du paiement (quelques secondes).", "Payment received. Your account updates as soon as the payment is confirmed (a few seconds).") : t("Paiement annulé : rien n'a été débité.", "Payment canceled: nothing was charged."));
    window.history.replaceState(null, "", "/studio/compte");
    const timer = setTimeout(reload, 4000);
    return () => clearTimeout(timer);
  }, [toast, reload, t]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/studio" className="inline-flex items-center gap-2 text-sm" aria-label={t("Retour au studio", "Back to the studio")}><ArrowLeft className="size-4" /> <Logo compact /></Link>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="font-display text-4xl font-semibold">{t("Mon compte", "My account")}</h1>
          {me && <p className="mt-1 break-words text-ink-2">{me.user.name ? `${me.user.name} · ` : ""}{me.user.email}</p>}
        </div>
        {!b ? (
          error ? <p className="rounded-2xl bg-bad-soft p-4 text-sm text-bad">{error}</p> : <div className="skeleton h-64 rounded-3xl" />
        ) : (
          <>
            {/* Abonnements : un par projet */}
            <Subscriptions paymentsOpen={b.paymentsLive} />

            {/* Historique */}
            <Card className="p-6 sm:p-7">
              <h2 className="font-display text-2xl font-semibold">{t("Historique des paiements", "Payment history")}</h2>
              {b.history.length === 0 ? (
                <p className="mt-2 text-sm text-muted">{t("Aucun paiement pour l'instant.", "No payments yet.")}</p>
              ) : (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {b.history.map((h, i) => (
                    <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                      <span className="min-w-0 break-words">{h.label}</span>
                      <span className="flex shrink-0 items-baseline gap-4">
                        <strong className="tabular-nums">{formatEur(h.amountEur, lang)}</strong>
                        <span className="text-muted">{formatDate(h.at, { day: "numeric", month: "short", year: "numeric" })}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
        {/* Mot de passe et déconnexion (visible même si le forfait ne se charge pas) */}
        <SecurityCard />
      </main>
    </div>
  );
}

type SubRow = { id: string; name: string; brand: string | null; subscription: { plan: PlanId; status: string; billing: Billing | null; periodEnd: number | null; cancelAtPeriodEnd: boolean } | null; ai: { plan: { used: number }; credits: { used: number } | null; paused: boolean } | null };

/** Les abonnements du compte : un par projet, plus ceux payés en attente de création de projet. */
function Subscriptions({ paymentsOpen }: { paymentsOpen: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const { data, reload } = useApi<{ projects: SubRow[]; pending: { id: string; plan: PlanId; billing: Billing | null; status: string }[] }>("/api/projects");
  const [manage, setManage] = useState<SubRow | null>(null);
  if (!data) return <div className="skeleton h-40 rounded-3xl" />;
  const rows = data.projects.filter((p) => p.subscription);
  // Montant facturé : abonnements payés (ceux offerts par l'équipe ne sont pas facturés).
  const active = rows.filter((p) => p.subscription?.status === "active");
  const monthly = [...active.map((p) => p.subscription!), ...data.pending.filter((s) => s.status === "active")].reduce((sum, s) => sum + (s.billing === "year" ? PLANS[s.plan].price.year / 12 : PLANS[s.plan].price.month), 0);
  return (
    <Card className="p-6 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">{t("Mes abonnements", "My subscriptions")}</h2>
          <p className="mt-1 text-sm text-ink-2">{t("1 abonnement = 1 projet. Chaque projet a son forfait, son budget IA et ses recharges.", "1 subscription = 1 project. Each project has its own plan, AI budget and top-ups.")}</p>
        </div>
        {monthly > 0 && <p className="text-sm text-ink-2">{t("Total des abonnements actifs :", "Total active subscriptions:")} <strong className="font-display text-xl text-ink">{formatEur(Math.round(monthly * 100) / 100, lang)}</strong> {t("TTC / mois", "incl. VAT / month")}</p>}
      </div>
      {rows.length === 0 && data.pending.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
          {t("Forfait Découverte (gratuit) : studio de démonstration, aucun projet réel.", "Discovery plan (free): demo studio, no real project.")}{" "}
          <Link href="/studio?nouveau=1" className="font-semibold text-signal underline-offset-4 hover:underline">{t("Choisir un forfait", "Choose a plan")}</Link>
          {!paymentsOpen && <p className="mt-2 text-xs text-muted">{t("Le paiement en ligne n'est pas encore ouvert. En attendant, l'administration peut activer un forfait pour vous.", "Online payment isn't open yet. In the meantime, the admin can activate a plan for you.")}</p>}
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-line">
          {rows.map((p) => {
            const s = p.subscription!;
            const st = SUB_STATUS[s.status] ?? SUB_STATUS.none;
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.brand ?? p.name}</p>
                  <p className="text-sm text-ink-2">
                    {PLANS[s.plan].name[lang]} · {s.billing === "year" ? t("annuel", "yearly") : t("mensuel", "monthly")}
                    {s.periodEnd ? ` · ${s.cancelAtPeriodEnd || s.status === "canceled" ? t("fin le", "ends") : t("échéance le", "renews")} ${formatDate(s.periodEnd, { day: "numeric", month: "short" })}` : ""}
                    {p.ai ? ` · ${t(`IA : reste ${100 - p.ai.plan.used} %`, `AI: ${100 - p.ai.plan.used}% left`)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={st.tone} dot>{st[lang]}</Badge>
                  <button type="button" onClick={() => setManage(p)} className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink">{t("Gérer", "Manage")}</button>
                </div>
              </li>
            );
          })}
          {data.pending.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{t(`Forfait ${PLANS[s.plan].name.fr}`, `${PLANS[s.plan].name.en} plan`)}</p>
                <p className="text-sm text-ink-2">{t("Payé · en attente de création de projet", "Paid · waiting for its project")}</p>
              </div>
              <Link href={`/studio?nouveau=1&abonnement=${encodeURIComponent(s.id)}`} className="inline-flex h-10 items-center rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">{t("Créer le projet", "Create the project")}</Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 border-t border-line pt-4">
        <Link href="/studio?nouveau=1" className="text-sm font-semibold text-signal underline-offset-4 hover:underline">{t("+ Créer un nouveau projet (nouvel abonnement)", "+ Create a new project (new subscription)")}</Link>
      </div>
      {manage && <ProjectSubscriptionDialog open projectId={manage.id} name={manage.brand ?? manage.name} onClose={() => setManage(null)} onChanged={() => reload()} />}
    </Card>
  );
}
