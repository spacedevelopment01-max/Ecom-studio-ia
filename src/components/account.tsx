"use client";
/**
 * Mon compte : forfait en cours, ce qu'il reste ce mois-ci, changement de forfait, packs, historique des paiements.
 * Jamais de crédits ni de coûts d'IA : seulement des quotas concrets. Tout vient de src/lib/plans.ts et de GET /api/billing.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Info, Plus, Sparkles } from "lucide-react";
import { api, Badge, Card, cx, formatDate, Logo, ThemeToggle, useApi, useToast } from "./ui";
import { LangSwitch, useLang, useT } from "./i18n";
import { formatEur, PACK_FOR_QUOTA, QUOTA_LABEL, Soon, useBilling } from "./billing-client";
import { CompareTable, PackCards, PricingCards } from "./pricing";
import { PACKS, PLANS, type Billing, type BillingView, type CheckoutBody, type PackId, type PlanId, type QuotaKey } from "@/lib/plans";

const STATUS: Record<BillingView["status"], { fr: string; en: string; tone: "ok" | "warn" | "bad" | "neutral" } | null> = {
  none: null,
  trial: null,
  active: null,
  manual: { fr: "Activé par l'administration", en: "Activated by the admin", tone: "ok" },
  past_due: { fr: "Paiement en retard", en: "Payment overdue", tone: "warn" },
  canceled: { fr: "Résilié", en: "Canceled", tone: "bad" },
};

const QUOTA_ORDER: QuotaKey[] = ["visuals", "aiVideos", "ugc", "blog"];

export function AccountPage() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { billing: b, reload, error } = useBilling();
  const { data: me } = useApi<{ user: { email: string; name: string; role: string } }>("/api/me");
  const [busy, setBusy] = useState<string | null>(null);
  // Lien depuis la page d'accueil ou le studio : ?plan=vendre&billing=year, ?pack=visuals.
  const [want, setWant] = useState<{ plan: PlanId | null; billing: Billing | null; pack: PackId | null }>({ plan: null, billing: null, pack: null });
  const scrolled = useRef(false);

  useEffect(() => {
    const u = new URL(window.location.href);
    const plan = u.searchParams.get("plan");
    const pack = u.searchParams.get("pack");
    setWant({ plan: plan && plan in PLANS ? (plan as PlanId) : null, billing: u.searchParams.get("billing") === "year" ? "year" : u.searchParams.get("billing") === "month" ? "month" : null, pack: pack && pack in PACKS ? (pack as PackId) : null });
    const p = u.searchParams.get("paiement");
    if (!p) return;
    toast(p === "ok" ? "ok" : "bad", p === "ok" ? t("Paiement reçu. Votre compte se met à jour dès la confirmation du paiement (quelques secondes).", "Payment received. Your account updates as soon as the payment is confirmed (a few seconds).") : t("Paiement annulé : rien n'a été débité.", "Payment canceled: nothing was charged."));
    window.history.replaceState(null, "", "/studio/compte");
    const timer = setTimeout(reload, 4000);
    return () => clearTimeout(timer);
  }, [toast, reload, t]);

  // Défilement jusqu'aux forfaits ou aux packs une fois la page affichée.
  useEffect(() => {
    if (!b || scrolled.current) return;
    const target = want.plan ? "forfaits" : want.pack ? "packs" : window.location.hash.slice(1);
    if (!target) return;
    scrolled.current = true;
    setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, [b, want]);

  const checkout = async (body: CheckoutBody, key: string) => {
    setBusy(key);
    try {
      const r = await api<{ url: string }>("/api/billing/checkout", { body });
      window.location.href = r.url;
    } catch (e) {
      toast("bad", (e as Error).message);
      setBusy(null);
    }
  };

  const plan = b?.plan ? PLANS[b.plan] : null;
  const date = (ms: number) => formatDate(ms, { day: "numeric", month: "short" });
  const status = b ? STATUS[b.status] : null;
  const payOff = b && !b.paymentsLive ? t("Le paiement en ligne n'est pas encore ouvert. En attendant, l'administration peut activer un forfait pour vous.", "Online payment isn't open yet. In the meantime, the admin can activate a plan for you.") : null;

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
            {/* Forfait en cours */}
            <Card className="p-6 sm:p-7">
              {plan ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">{t("Votre forfait", "Your plan")}</p>
                    <p className="mt-1 font-display text-3xl font-semibold">
                      {plan.name[lang]} <span className="font-sans text-lg font-normal text-ink-2">({b.billing === "year" ? t("annuel", "yearly") : t("mensuel", "monthly")})</span>
                    </p>
                    <p className="mt-1 text-sm text-ink-2">
                      {b.status === "canceled" ? t(`Se termine le ${date(b.periodEnd)}`, `Ends on ${date(b.periodEnd)}`) : t(`Renouvellement le ${date(b.periodEnd)}`, `Renews on ${date(b.periodEnd)}`)}
                      {" · "}
                      {t("1 boutique ou 1 site", "1 store or 1 website")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {status && <Badge tone={status.tone} dot>{status[lang]}</Badge>}
                    <a href="#forfaits" className="inline-flex h-10 items-center rounded-full border border-line bg-card px-4 text-sm font-medium hover:border-ink">{t("Changer de forfait", "Change plan")}</a>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-sm text-muted">{t("Votre forfait", "Your plan")}</p>
                    <p className="mt-1 font-display text-3xl font-semibold">{t("Découverte gratuite", "Free discovery")}</p>
                    <p className="mt-1 text-sm text-ink-2">
                      {b.discovery.used
                        ? t("Votre découverte est faite. Choisissez un forfait pour créer vos images et vidéos, et exporter ou publier votre boutique.", "Your discovery is done. Choose a plan to create your images and videos, and to export or publish your store.")
                        : t("L'IA analyse votre produit, crée votre marque, vos logos et un aperçu de votre page d'accueil. Choisissez un forfait pour aller plus loin.", "AI analyzes your product, creates your brand, your logos and a preview of your home page. Choose a plan to go further.")}
                    </p>
                  </div>
                  <a href="#forfaits" className="btn-glow inline-flex h-11 items-center gap-2 rounded-full bg-signal px-5 text-sm font-semibold text-signal-ink"><Sparkles className="size-4" aria-hidden /> {t("Choisir un forfait", "Choose a plan")}</a>
                </div>
              )}
            </Card>

            {/* Ce qu'il reste ce mois-ci */}
            {(plan || QUOTA_ORDER.some((k) => b.quotas[k].pack > 0)) && (
              <Card className="p-6 sm:p-7">
                <h2 className="font-display text-2xl font-semibold">{t("Ce qu'il vous reste ce mois-ci", "What you have left this month")}</h2>
                <p className="mt-1 text-sm text-muted">{t(`Vos quotas reviennent le ${formatDate(b.periodEnd, { day: "numeric", month: "long" })}.`, `Your quotas come back on ${formatDate(b.periodEnd, { day: "numeric", month: "long" })}.`)}</p>
                <ul className="mt-5 grid gap-5">
                  {QUOTA_ORDER.map((k) => {
                    const q = b.quotas[k];
                    const total = q.included + q.rollover + q.pack;
                    if (k === "blog" && total === 0) return null;
                    const pack = PACK_FOR_QUOTA[k];
                    const detail = [q.rollover > 0 && t(`dont ${q.rollover} reporté${q.rollover > 1 ? "s" : ""}`, `${q.rollover} rolled over`), q.pack > 0 && t(`dont ${q.pack} en packs`, `${q.pack} from packs`)].filter(Boolean).join(", ");
                    return (
                      <li key={k} className="grid gap-2">
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                          <p className="text-[15px] font-medium first-letter:uppercase">
                            {QUOTA_LABEL[k][lang][1]}
                          </p>
                          <div className="flex items-center gap-3">
                            {total > 0 ? (
                              <p className="tabular-nums"><strong className="text-lg">{q.left}</strong> <span className="text-muted">/ {total}</span></p>
                            ) : (
                              <p className="text-sm text-muted">{t("Pas inclus dans votre forfait", "Not included in your plan")}</p>
                            )}
                            {q.left <= 0 && pack && (
                              <button type="button" onClick={() => (setWant((w) => ({ ...w, pack })), document.getElementById("packs")?.scrollIntoView({ behavior: "smooth" }))} className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-medium text-paper">
                                <Plus className="size-3.5" aria-hidden /> {t("Ajouter un pack", "Add a pack")}
                              </button>
                            )}
                          </div>
                        </div>
                        {total > 0 && (
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-2" role="progressbar" aria-label={QUOTA_LABEL[k][lang][1]} aria-valuenow={q.left} aria-valuemin={0} aria-valuemax={total}>
                            <div className={cx("h-full rounded-full transition-[width] duration-700", q.left <= 0 ? "bg-bad" : q.left / total < 0.2 ? "bg-warn" : "bg-signal")} style={{ width: `${Math.min(100, (q.left / total) * 100)}%` }} />
                          </div>
                        )}
                        {detail && <p className="text-xs text-muted">{detail}</p>}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-5 border-t border-line pt-4 text-sm text-ink-2">
                  {t("Langue de la boutique : une langue (français ou anglais). Boutique en plusieurs langues : ", "Store language: one language (French or English). Multilingual store: ")}
                  <Soon />
                </p>
              </Card>
            )}

            {/* Forfaits */}
            <section id="forfaits" className="scroll-mt-20">
              <h2 className="font-display text-3xl font-semibold">{plan ? t("Changer de forfait", "Change plan") : t("Choisir un forfait", "Choose a plan")}</h2>
              <p className="mt-1 text-ink-2">{t("Un forfait, une boutique, tout compris. Changez quand vous voulez.", "One plan, one store, all included. Change whenever you like.")}</p>
              <div className="mt-6">
                <PricingCards key={`${want.plan}-${want.billing}`} current={{ plan: b.plan, billing: b.billing }} initialBilling={want.billing ?? b.billing ?? "month"} selected={want.plan} onChoose={(p, bl) => checkout({ kind: "plan", plan: p, billing: bl }, `plan-${p}`)} busy={busy} disabledReason={payOff} />
              </div>
              <CompareTable className="mt-6" />
            </section>

            {/* Packs */}
            <section id="packs" className="scroll-mt-20">
              <h2 className="font-display text-3xl font-semibold">{t("Packs", "Packs")}</h2>
              <p className="mt-1 text-ink-2">{t("Plus de visuels ou de vidéos ce mois-ci ? Ajoutez un pack : il n'expire pas.", "Need more visuals or videos this month? Add a pack: it never expires.")}</p>
              <div className="mt-6">
                <PackCards prices={b.packPrices} launchBought={b.launchPackBought} highlight={want.pack} busy={busy} onBuy={(id) => checkout({ kind: "pack", pack: id }, `pack-${id}`)} lockedReason={!b.plan ? t("Avec un forfait", "With a plan") : !b.paymentsLive ? t("Paiement bientôt ouvert", "Payment opening soon") : null} />
              </div>
            </section>

            {payOff && (
              <p className="flex gap-2 rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden /> {payOff}
              </p>
            )}

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
      </main>
    </div>
  );
}
