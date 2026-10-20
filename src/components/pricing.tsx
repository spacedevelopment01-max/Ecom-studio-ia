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
import { monthlyEquivalent, PACKS_FOR_SALE, PACKS, PLAN_IDS, PLANS, type Billing, type PackId, type Plan, type PlanId } from "@/lib/plans";

type Line = { text: ReactNode; soon?: boolean };
type TFn = <T>(fr: T, en: T) => T;

/** Pluriel simple. */
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

const LEVEL = {
  none: { fr: "non incluses", en: "not included" },
  essential: { fr: "essentielles", en: "essential" },
  advanced: { fr: "avancées", en: "advanced" },
  full: { fr: "complètes", en: "complete" },
  intermediate: { fr: "intermédiaires", en: "intermediate" },
} as const;

/** Les avantages affichés sur la carte d'un forfait (le détail est dans le tableau). Uniquement ce qui est configuré. */
function planLines(p: Plan, t: TFn): Line[] {
  const lines: Line[] = [
    { text: p.id === "dominer" ? t("Tous les thèmes disponibles par famille", "All available themes per family") : t(`${p.themes>1?"Jusqu’à ":""}${p.themes} thème${p.themes>1?"s":""} par famille`, `${p.themes>1?"Up to ":""}${p.themes} theme${p.themes>1?"s":""} per family`) },
    { text: t(`${p.librarySections} fonctions de sections dans la bibliothèque de votre famille`, `${p.librarySections} section functions in your family library`) },
    { text: p.themeEditing === "basic" ? t("Personnalisation IA basique : textes, images, couleurs", "Basic AI editing: text, images, colours") : p.themeEditing === "advanced" ? t("Personnalisation IA avancée", "Advanced AI editing") : t("Personnalisation sur mesure", "Custom personalisation") },
    { text: t("Boutique, logo et images créés par l'IA", "Store, logo and images created by AI") },
    { text: p.ads === "none" ? t("Publicité et aide aux campagnes non incluses", "Advertising and campaign assistance not included") : t("Publicité et aide aux campagnes incluses", "Advertising and campaign assistance included") },
  ];
  if (p.videos !== "none") lines.push({ text: p.videos === "short" ? t("Vidéos IA courtes", "Short AI videos") : t("Vidéos IA avancées et vidéos UGC", "Advanced AI videos and UGC videos") });
  if (p.aiSections) lines.push({ text: t("Sections de boutique créées par l'IA", "Store sections created by AI") });
  if (p.pageModels) lines.push({ text: t("Modèles de pages et mise en page par produit ou prestation", "Page templates and a layout per product or service") });
  if (p.quotas.blog) lines.push({ text: t(`${p.quotas.blog} articles de blog IA par mois`, `${p.quotas.blog} AI blog posts per month`) });
  lines.push({ text: t(`Calendrier ${p.calendarDays} jours · ${n(p.postsPerDay, "publication", "publications")} par jour`, `${p.calendarDays}-day calendar · ${n(p.postsPerDay, "post", "posts")} per day`) });
  lines.push({ text: p.freeFirstCall ? t("1 heure d'accompagnement offerte (une seule fois)", "1 hour of coaching included (once)") : t(`Un appel de départ de 1 h : ${p.callPrice} €`, `One introductory 1-hour call: €${p.callPrice}`) });
  return lines;
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
        <button key={b} type="button" role="radio" aria-checked={value === b} onClick={() => onChange(b)} className={cx("flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 transition", value === b ? "bg-ink text-paper" : "text-ink-2 hover:text-ink")}>
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
  /** Nouvel abonnement (= nouveau projet) : chaque carte propose de souscrire, sans « forfait actuel ». */
  newSubscription?: boolean;
  /** Page d'accueil : 4 cartes, avec DÉCOUVERTE (gratuit). */
  withDiscovery?: boolean;
};

/** Carte DÉCOUVERTE (accueil) : studio de démonstration gratuit, sans carte bancaire, aucun projet réel. */
function DiscoveryCard({ loggedIn }: { loggedIn?: boolean }) {
  const t = useT();
  const lines = [
    t("Studio de démonstration interactif", "Interactive demo studio"),
    t("Les thèmes de référence en aperçu", "The reference themes in preview"),
    t("Exemples de logos, images, publicités, vidéos", "Sample logos, images, ads, videos"),
    t("Aucun projet réel, aucune publication", "No real project, no posting"),
  ];
  return (
    <article id="forfait-decouverte" className="relative flex scroll-mt-28 flex-col rounded-[1.75rem] border border-line bg-card p-6 sm:p-7">
      <h3 className="font-display text-2xl font-semibold">{t("Découverte", "Discovery")}</h3>
      <p className="mt-2 text-[15px] leading-snug text-ink-2">« {t("Découvrez toute la puissance du studio, gratuitement.", "Discover the full power of the studio, for free.")} »</p>
      <div className="mt-5">
        <p className="font-display text-5xl font-semibold leading-none tracking-tight">{t("Gratuit", "Free")}</p>
        <p className="mt-2 h-5 text-sm text-ink-2">{t("Sans carte bancaire", "No credit card")}</p>
      </div>
      <ul className="mt-6 grid gap-2.5 text-[14px] leading-snug text-ink-2">
        {lines.map((l) => (
          <li key={l} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden /><span className="min-w-0">{l}</span></li>
        ))}
      </ul>
      <div className="mt-auto pt-6">
        <Link href={loggedIn ? "/studio/decouverte" : "/inscription"} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line bg-paper text-[15px] font-semibold text-ink transition hover:border-ink">{t("Découvrir gratuitement", "Discover for free")} <ArrowRight className="size-4" aria-hidden /></Link>
      </div>
    </article>
  );
}

/** Interrupteur + cartes des forfaits (3, ou 4 avec Découverte sur l'accueil). */
export function PricingCards({ loggedIn, current: currentIn, initialBilling, selected, onChoose, busy, disabledReason, newSubscription, withDiscovery }: PricingProps) {
  const current = newSubscription ? undefined : currentIn;
  const t = useT();
  const { lang } = useLang();
  const [billing, setBilling] = useState<Billing>(initialBilling ?? current?.billing ?? "month");
  return (
    <div>
      <div className="flex justify-center">
        <BillingSwitch value={billing} onChange={setBilling} />
      </div>
      <div className={cx("mt-8 grid gap-4", withDiscovery ? "sm:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3")}>
        {withDiscovery && <DiscoveryCard loggedIn={loggedIn} />}
        {PLAN_IDS.map((id) => {
          const p = PLANS[id];
          const featured = !!p.featured;
          const mine = current?.plan === id;
          const same = mine && current?.billing === billing;
          const picked = selected === id && !mine;
          const href = loggedIn ? `/studio?nouveau=1&plan=${id}&billing=${billing}` : `/inscription?plan=${id}&billing=${billing}`;
          const label = same ? t("Votre forfait actuel", "Your current plan") : mine ? (billing === "year" ? t("Passer à l'annuel", "Switch to yearly") : t("Passer au mensuel", "Switch to monthly")) : current?.plan ? t(`Passer à ${p.name.fr}`, `Switch to ${p.name.en}`) : p.cta[lang];
          const btnCls = cx("inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60", featured ? "btn-glow bg-signal text-signal-ink hover:-translate-y-0.5" : "border border-line bg-paper text-ink hover:border-ink");
          return (
            <article key={id} id={`forfait-${id}`} className={cx("relative flex scroll-mt-28 flex-col rounded-[1.75rem] border p-6 sm:p-7", featured ? "border-signal bg-card shadow-[0_30px_80px_-40px_var(--glow)]" : "border-line bg-card", picked && "ring-2 ring-signal ring-offset-2 ring-offset-paper")}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-2xl font-semibold">{p.name[lang]}</h3>
                {featured && <span className="rounded-full bg-signal px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-signal-ink">{t("Notre recommandation", "Our recommendation")}</span>}
                {mine && <span className="rounded-full bg-ok-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ok">{t("Votre forfait", "Your plan")}</span>}
              </div>
              <p className="mt-2 text-[15px] leading-snug text-ink-2">« {p.pitch[lang]} »</p>
              <p className="mt-3 inline-flex w-fit rounded-full bg-signal-soft px-3 py-1 text-xs font-semibold text-signal">{t("1 projet inclus par abonnement", "1 project included per subscription")}</p>
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
      <p className="mt-4 text-center text-sm text-muted">{t("Les droits s’appliquent aux thèmes disponibles de votre famille. Le catalogue cible comprend cinq thèmes par famille ; aucun thème à venir n’est annoncé comme déjà disponible. Les générations IA restent soumises au budget du projet.","Rights apply to available themes in your family. The target catalogue has five themes per family; future themes are not presented as already available. AI generation remains subject to the project budget.")}</p>
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

  const lvl = (v: keyof typeof LEVEL) => t(LEVEL[v].fr[0].toUpperCase() + LEVEL[v].fr.slice(1), LEVEL[v].en[0].toUpperCase() + LEVEL[v].en.slice(1));
  // Comparatif officiel (cahier des charges §14) ; la colonne Découverte est la démonstration gratuite.
  const rows: [string, ReactNode, (p: Plan) => ReactNode][] = [
    [t("Projet réel par abonnement", "Real project per subscription"), "0", () => "1"],
    [t("Boutique active par projet", "Active store per project"), "0", () => "1"],
    [t("Thèmes accessibles par famille", "Available themes per family"), t("Démo", "Demo"), (p) => p.id === "dominer" ? t("Tous les disponibles", "All available") : p.themes],
    [t("Fonctions de sections de la bibliothèque par famille", "Library section functions per family"), t("Démo", "Demo"), (p) => p.librarySections],
    [t("Personnalisation du thème par IA", "AI theme personalisation"), no, (p) => p.themeEditing === "basic" ? t("Basique", "Basic") : p.themeEditing === "advanced" ? t("Avancée", "Advanced") : t("Sur mesure", "Custom")],
    [t("Génération boutique, logo et images IA", "AI store, logo and image creation"), no, () => yes],
    [t("Publicités IA", "AI ads"), t("Démo", "Demo"), (p) => p.ads === "none" ? no : yes],
    [t("Vidéos IA", "AI videos"), no, (p) => (p.videos === "none" ? no : p.videos === "short" ? t("Courtes", "Short") : t("Avancées + UGC", "Advanced + UGC"))],
    [t("Création de sections IA", "AI section creation"), no, (p) => (p.aiSections ? yes : no)],
    [t("Modèles de pages, ajout de pages, mise en page par produit", "Page templates, adding pages, layout per product"), t("Démo", "Demo"), (p) => (p.pageModels ? yes : no)],
    [t("Blog IA", "AI blog"), no, (p) => (p.quotas.blog ? t(`${p.quotas.blog}/mois`, `${p.quotas.blog}/month`) : no)],
    ["SEO", t("Démo", "Demo"), (p) => (p.seo === "essential" ? t("Essentiel", "Essential") : p.seo === "advanced" ? t("Avancé", "Advanced") : t("Complet", "Complete"))],
    [t("Calendrier", "Calendar"), t("Démo", "Demo"), (p) => t(`${p.calendarDays} jours`, `${p.calendarDays} days`)],
    [t("Publications par jour", "Posts per day"), t("Aucune réelle", "None real"), (p) => p.postsPerDay],
    [t("Connexions sociales", "Social connections"), no, () => yes],
    [t("Recharges IA (10 €)", "AI top-ups (€10)"), no, () => yes],
    [t("Un appel de départ (1 h, une seule fois)", "One introductory call (1 h, once)"), no, (p) => (p.freeFirstCall ? t("1re heure offerte", "1st hour free") : `${p.callPrice} €`)],
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
              <th scope="col" className="px-3 py-3 text-center font-display text-base font-semibold">{t("Découverte", "Discovery")}</th>
              {PLAN_IDS.map((id) => (
                <th key={id} scope="col" className={cx("px-3 py-3 text-center font-display text-base font-semibold", PLANS[id].featured && "text-signal")}>{PLANS[id].name[lang]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, free, value]) => (
              <tr key={label} className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-3 text-left font-normal sm:px-4 text-ink-2 shadow-[1px_0_0_var(--line)]">{label}</th>
                <td className="px-3 py-3 text-center text-ink-2">{free}</td>
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

/** Les packs en vente (n'expirent pas ; Lancement : achat unique). Le pack Langue n'est pas encore en vente. */
export function PackCards({ prices, onBuy, busy, launchBought, lockedReason, highlight }: PackCardsProps) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className={cx("grid gap-3 sm:grid-cols-2", PACKS_FOR_SALE.length >= 5 ? "lg:grid-cols-5" : PACKS_FOR_SALE.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4")}>
      {PACKS_FOR_SALE.map((id) => {
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
