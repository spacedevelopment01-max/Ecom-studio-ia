"use client";
/**
 * Forfaits et packs (page d'accueil, Mon compte) : interrupteur Mensuel / Annuel, 3 cartes,
 * tableau de comparaison dépliable, cartes des packs. Tout vient de src/lib/plans.ts (aucun prix en dur).
 */
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";
import { cx } from "./ui";
import { useLang, useT } from "./i18n";
import { formatEur, Soon } from "./billing-client";
import { monthlyEquivalent, PACK_IDS, PACKS, PLAN_IDS, PLANS, type Billing, type PackId, type Plan, type PlanId } from "@/lib/plans";

type Line = { text: ReactNode; soon?: boolean };
type TFn = <T>(fr: T, en: T) => T;

/** Pluriel simple. */
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** Les 6 à 8 avantages affichés sur la carte d'un forfait (le détail est dans le tableau). */
function planLines(p: Plan, t: TFn): Line[] {
  const q = p.quotas;
  const lines: Line[] = [
    { text: t(`${q.visuals} visuels IA par mois`, `${q.visuals} AI visuals per month`) },
    { text: t(`${q.aiVideos} vidéos IA par mois, qualité ${p.videoQuality === "max" ? "maximale" : "standard"}`, `${q.aiVideos} AI videos per month, ${p.videoQuality === "max" ? "maximum" : "standard"} quality`) },
  ];
  if (q.ugc) lines.push({ text: t(`${n(q.ugc, "vidéo UGC", "vidéos UGC")} par mois : une personne présente votre produit face caméra`, `${n(q.ugc, "UGC video", "UGC videos")} per month: a person presents your product on camera`) });
  if (q.blog) lines.push({ text: t(`${n(q.blog, "article de blog", "articles de blog")} par mois`, `${n(q.blog, "blog post", "blog posts")} per month`), soon: true });
  lines.push({ text: p.autopublish ? t(`Publications prêtes pour ${p.calendarDays} jours, publiées automatiquement`, `Posts ready for ${p.calendarDays} days, published automatically`) : t(`Publications prêtes pour ${p.calendarDays} jours`, `Posts ready for ${p.calendarDays} days`) });
  lines.push({ text: p.campaigns === Infinity ? t("Campagnes publicitaires illimitées", "Unlimited ad campaigns") : t(n(p.campaigns, "campagne publicitaire", "campagnes publicitaires"), n(p.campaigns, "ad campaign", "ad campaigns")) });
  lines.push(
    p.theme === "fully-custom"
      ? { text: t("Thème entièrement sur mesure", "Fully custom theme"), soon: true }
      : p.theme === "custom-sections"
        ? { text: t("Thème avec sections sur mesure", "Theme with custom sections") }
        : { text: t("Thème composé pour votre marque", "Theme designed for your brand") },
  );
  lines.push({ text: t(n(p.languages, "langue", "langues"), n(p.languages, "language", "languages")), soon: p.languages > 2 });
  return lines.slice(0, 8);
}

/** Prix affiché d'un forfait. */
function PriceTag({ plan, billing, dark }: { plan: Plan; billing: Billing; dark?: boolean }) {
  const t = useT();
  const { lang } = useLang();
  const eur = (v: number) => formatEur(v, lang);
  return (
    <div>
      <p className="font-display text-5xl font-semibold leading-none tracking-tight">
        {eur(plan.price[billing])}
        <span className={cx("ml-1.5 font-sans text-sm font-normal tracking-normal", dark ? "text-white/60" : "text-muted")}>{billing === "year" ? t("TTC / an", "incl. VAT / year") : t("TTC / mois", "incl. VAT / month")}</span>
      </p>
      <p className={cx("mt-2 h-5 text-sm", dark ? "text-white/70" : "text-ink-2")}>{billing === "year" ? t(`soit ${eur(monthlyEquivalent(plan.id))} / mois`, `that's ${eur(monthlyEquivalent(plan.id))} / month`) : t("Sans engagement", "No commitment")}</p>
    </div>
  );
}

/** Interrupteur Mensuel / Annuel. */
export function BillingSwitch({ value, onChange, className }: { value: Billing; onChange: (b: Billing) => void; className?: string }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Facturation", "Billing")} className={cx("inline-flex rounded-full border border-line bg-card p-1 text-sm font-medium", className)}>
      {(["month", "year"] as const).map((b) => (
        <button key={b} type="button" role="radio" aria-checked={value === b} onClick={() => onChange(b)} className={cx("flex h-10 items-center gap-2 rounded-full px-4 transition", value === b ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}>
          {b === "month" ? t("Mensuel", "Monthly") : t("Annuel", "Yearly")}
          {b === "year" && <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold", value === b ? "bg-signal text-signal-ink" : "bg-signal-soft text-signal")}>{t("2 mois offerts", "2 months free")}</span>}
        </button>
      ))}
    </div>
  );
}

export type PricingProps = {
  /** Page d'accueil : la personne est-elle connectée (lien vers Mon compte plutôt que l'inscription) ? */
  loggedIn?: boolean;
  /** Forfait en cours (Mon compte). */
  current?: { plan: PlanId | null; billing: Billing | null };
  initialBilling?: Billing;
  /** Forfait présélectionné (lien depuis la page d'accueil). */
  selected?: PlanId | null;
  /** Mon compte : paiement direct au lieu d'un lien. */
  onChoose?: (plan: PlanId, billing: Billing) => void;
  busy?: string | null;
  /** Raison pour laquelle le paiement est indisponible (boutons désactivés). */
  disabledReason?: string | null;
};

/** Interrupteur + 3 cartes de forfaits. */
export function PricingCards({ loggedIn, current, initialBilling, selected, onChoose, busy, disabledReason }: PricingProps) {
  const t = useT();
  const { lang } = useLang();
  const [billing, setBilling] = useState<Billing>(initialBilling ?? current?.billing ?? "month");
  return (
    <div>
      <div className="flex justify-center">
        <BillingSwitch value={billing} onChange={setBilling} />
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {PLAN_IDS.map((id) => {
          const p = PLANS[id];
          const featured = !!p.featured;
          const mine = current?.plan === id;
          const same = mine && current?.billing === billing;
          const picked = selected === id && !mine;
          const href = loggedIn ? `/studio/compte?plan=${id}&billing=${billing}#forfaits` : `/inscription?plan=${id}&billing=${billing}`;
          const label = same ? t("Votre forfait actuel", "Your current plan") : mine ? (billing === "year" ? t("Passer à l'annuel", "Switch to yearly") : t("Passer au mensuel", "Switch to monthly")) : current?.plan ? t(`Passer à ${p.name.fr}`, `Switch to ${p.name.en}`) : t("Commencer", "Get started");
          const btnCls = cx("inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", featured ? "btn-glow bg-signal text-signal-ink hover:-translate-y-0.5" : "border border-line bg-paper text-ink hover:border-ink");
          return (
            <article key={id} id={`forfait-${id}`} className={cx("relative flex scroll-mt-28 flex-col rounded-[1.75rem] border p-6 sm:p-7", featured ? "border-signal bg-card shadow-[0_30px_80px_-40px_var(--glow)]" : "border-line bg-card", picked && "ring-2 ring-signal ring-offset-2 ring-offset-paper")}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-semibold">{p.name[lang]}</h3>
                {featured && <span className="rounded-full bg-signal px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-signal-ink">{t("Recommandé", "Recommended")}</span>}
                {mine && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ok">{t("Votre forfait", "Your plan")}</span>}
              </div>
              <p className="mt-1 text-sm text-muted">{p.tagline[lang]} · {t("1 boutique ou 1 site", "1 store or 1 website")}</p>
              <div className="mt-5">
                <PriceTag plan={p} billing={billing} />
              </div>
              <ul className="mt-6 grid gap-2.5 text-[14px] leading-snug text-ink-2">
                {planLines(p, t).map((l, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                    <span className="min-w-0">{l.text}{l.soon && <> <Soon /></>}</span>
                  </li>
                ))}
              </ul>
              {(p.rollover || p.packDiscount > 0) && (
                <p className="mt-4 rounded-2xl bg-paper-2 px-3 py-2 text-xs text-ink-2">
                  {[p.rollover && t("Visuels et vidéos non utilisés reportés au mois suivant", "Unused visuals and videos roll over to next month"), p.packDiscount > 0 && t(`-${Math.round(p.packDiscount * 100)} % sur les packs`, `${Math.round(p.packDiscount * 100)}% off packs`)].filter(Boolean).join(" · ")}
                </p>
              )}
              <div className="mt-auto pt-6">
                {onChoose ? (
                  <button type="button" disabled={same || !!disabledReason || !!busy} onClick={() => onChoose(id, billing)} className={btnCls} aria-busy={busy === `plan-${id}` || undefined}>
                    {busy === `plan-${id}` ? t("Ouverture du paiement…", "Opening checkout…") : label} {!same && <ArrowRight className="size-4" aria-hidden />}
                  </button>
                ) : (
                  <Link href={href} className={btnCls}>{label} <ArrowRight className="size-4" aria-hidden /></Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {disabledReason && <p className="mt-4 text-center text-sm text-muted">{disabledReason}</p>}
    </div>
  );
}

/** Tableau de comparaison dépliable (défilement horizontal du tableau seul, 1re colonne collante). */
export function CompareTable({ className }: { className?: string }) {
  const t = useT();
  const { lang } = useLang();
  const yes = <Check className="mx-auto size-4 text-signal" aria-label={t("Oui", "Yes")} />;
  const no = <Minus className="mx-auto size-4 text-muted" aria-label={t("Non", "No")} />;
  const cell = (v: ReactNode, soon?: boolean) => (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      {v}
      {soon && <Soon />}
    </span>
  );
  const rows: [string, (p: Plan) => ReactNode][] = [
    [t("Boutique ou site", "Store or website"), () => "1"],
    [t("Visuels IA par mois", "AI visuals per month"), (p) => p.quotas.visuals],
    [t("Vidéos IA par mois", "AI videos per month"), (p) => p.quotas.aiVideos],
    [t("Qualité des vidéos IA", "AI video quality"), (p) => (p.videoQuality === "max" ? t("Maximale", "Maximum") : t("Standard", "Standard"))],
    [t("Vidéos UGC par mois (une personne présente votre produit face caméra)", "UGC videos per month (a person presents your product on camera)"), (p) => (p.quotas.ugc ? p.quotas.ugc : no)],
    [t("Articles de blog par mois", "Blog posts per month"), (p) => (p.quotas.blog ? cell(p.quotas.blog, true) : no)],
    [t("Calendrier de publications", "Posting calendar"), (p) => t(`${p.calendarDays} jours`, `${p.calendarDays} days`)],
    [t("Publication automatique", "Automatic publishing"), (p) => (p.autopublish ? yes : no)],
    [t("Campagnes publicitaires", "Ad campaigns"), (p) => (p.campaigns === Infinity ? t("Illimitées", "Unlimited") : p.campaigns)],
    [t("Variantes de publicités", "Ad variants"), (p) => (p.adVariants ? yes : no)],
    [t("Langues de la boutique", "Store languages"), (p) => cell(p.languages, p.languages > 2)],
    [t("Thème", "Theme"), (p) => (p.theme === "fully-custom" ? cell(t("Entièrement sur mesure", "Fully custom"), true) : p.theme === "custom-sections" ? t("Sections sur mesure", "Custom sections") : t("Composé", "Designed"))],
    [t("Report des quotas non utilisés", "Unused quotas roll over"), (p) => (p.rollover ? yes : no)],
    [t("Remise sur les packs", "Pack discount"), (p) => (p.packDiscount ? `-${Math.round(p.packDiscount * 100)}${lang === "en" ? "" : " "}%` : no)],
    [t("Support", "Support"), (p) => (p.support === "priority-call" ? t("Prioritaire + appel", "Priority + call") : p.support === "priority" ? t("Prioritaire", "Priority") : t("Par e-mail", "By email"))],
  ];
  return (
    <details className={cx("group rounded-[1.75rem] border border-line bg-card", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-center gap-2 px-5 py-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        {t("Comparer en détail", "Compare in detail")} <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="overflow-x-auto border-t border-line">
        <table className="w-full min-w-[500px] border-collapse text-[13px] sm:text-sm">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-[140px] bg-card px-3 sm:w-[40%] sm:px-4 py-3 text-left text-xs font-medium uppercase tracking-[.12em] text-muted"><span className="sr-only">{t("Fonction", "Feature")}</span></th>
              {PLAN_IDS.map((id) => (
                <th key={id} scope="col" className={cx("px-3 py-3 text-center font-display text-base font-semibold", PLANS[id].featured && "text-signal")}>{PLANS[id].name[lang]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-3 text-left font-normal sm:px-4 text-ink-2 shadow-[1px_0_0_var(--line)]">{label}</th>
                {PLAN_IDS.map((id) => (
                  <td key={id} className="px-3 py-3 text-center tabular-nums">{value(PLANS[id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Remise des packs selon le forfait, en texte (« -10 % avec Vendre, -20 % avec Dominer »). */
export function packDiscountText(t: TFn) {
  const parts = PLAN_IDS.filter((id) => PLANS[id].packDiscount > 0).map((id) => {
    const pct = Math.round(PLANS[id].packDiscount * 100);
    return t(`-${pct} % avec ${PLANS[id].name.fr}`, `${pct}% off with ${PLANS[id].name.en}`);
  });
  return parts.join(", ");
}

export type PackCardsProps = {
  /** Prix pour ce compte (remise comprise) ; sinon prix de base. */
  prices?: Record<PackId, number> | null;
  /** Mon compte : achat. */
  onBuy?: (pack: PackId) => void;
  busy?: string | null;
  launchBought?: boolean;
  /** Raison d'indisponibilité de l'achat (pas de forfait, paiement fermé). */
  lockedReason?: string | null;
  highlight?: PackId | null;
};

/** Les 5 packs (n'expirent pas ; Lancement : achat unique). */
export function PackCards({ prices, onBuy, busy, launchBought, lockedReason, highlight }: PackCardsProps) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PACK_IDS.map((id) => {
        const pk = PACKS[id];
        const price = prices?.[id] ?? pk.price;
        const discounted = price < pk.price;
        const bought = id === "launch" && !!launchBought;
        return (
          <article key={id} id={`pack-${id}`} className={cx("flex scroll-mt-28 flex-col rounded-3xl border bg-card p-5", highlight === id ? "border-signal ring-2 ring-signal/40" : "border-line", bought && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="font-display text-lg font-semibold leading-tight">{pk.name[lang]}</h3>
              {pk.once && <span className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-2">{t("Achat unique", "One-time")}</span>}
            </div>
            <p className="mt-2 text-sm leading-snug text-ink-2">{pk.description[lang]}</p>
            <p className="mt-4 font-display text-2xl font-semibold">
              {formatEur(price, lang)}
              {discounted && <span className="ml-2 font-sans text-sm font-normal text-muted line-through">{formatEur(pk.price, lang)}</span>}
            </p>
            <p className="mt-1 text-xs text-muted">{id === "language" ? t("Définitif · jusqu'à 2 langues pour l'instant (au-delà : bientôt)", "Permanent · up to 2 languages for now (more: soon)") : t("N'expire pas", "Never expires")}</p>
            {onBuy && (
              <div className="mt-auto pt-4">
                <button type="button" disabled={bought || !!lockedReason || !!busy} onClick={() => onBuy(id)} className="inline-flex h-10 w-full items-center justify-center rounded-full bg-ink px-4 text-sm font-medium text-paper transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0" aria-busy={busy === `pack-${id}` || undefined}>
                  {bought ? t("Déjà acheté", "Already bought") : busy === `pack-${id}` ? t("Ouverture…", "Opening…") : t("Acheter", "Buy")}
                </button>
                {lockedReason && !bought && <p className="mt-1.5 text-center text-[11px] text-muted">{lockedReason}</p>}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
