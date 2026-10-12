"use client";
/**
 * Forfait et quotas du compte côté navigateur (lecture de GET /api/billing), et petits éléments partagés :
 * prix en euros, libellés des quotas, badge « Bientôt », lien « forfait » et bandeau « quota épuisé » du studio.
 * Jamais de crédits ni de coûts d'IA : seulement des quotas concrets (visuels, vidéos…).
 */
import { useOptionalProject } from "./studio/project-context";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Gauge, Lock, Sparkles, X } from "lucide-react";
import { cx, formatDate, useApi } from "./ui";
import { useLang, useT } from "./i18n";
import { intlLocale, type Lang } from "@/lib/i18n";
import { PACKS, PLANS, type BillingView, type PackId, type QuotaKey } from "@/lib/plans";

/** Prix en euros : « 49,90 € » / « €49.90 » (décimales seulement si nécessaires). */
export const formatEur = (n: number, lang: Lang) => {
  const s = n.toLocaleString(intlLocale(lang), { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  return lang === "en" ? `€${s}` : `${s} €`;
};

export function useEur() {
  const { lang } = useLang();
  return (n: number) => formatEur(n, lang);
}

/** Libellés des quotas (pluriel / singulier). */
export const QUOTA_LABEL: Record<QuotaKey, { fr: [string, string]; en: [string, string] }> = {
  visuals: { fr: ["visuel", "visuels"], en: ["visual", "visuals"] },
  aiVideos: { fr: ["vidéo IA", "vidéos IA"], en: ["AI video", "AI videos"] },
  ugc: { fr: ["vidéo UGC", "vidéos UGC"], en: ["UGC video", "UGC videos"] },
  blog: { fr: ["article de blog", "articles de blog"], en: ["blog post", "blog posts"] },
};
export const quotaWord = (k: QuotaKey, n: number, lang: Lang) => QUOTA_LABEL[k][lang][n === 1 || (lang === "fr" && n === 0) ? 0 : 1];

/** Pack qui recharge un quota. */
export const PACK_FOR_QUOTA: Partial<Record<QuotaKey, PackId>> = { visuals: "visuals", aiVideos: "videos", ugc: "ugc" };

/** Réponse au nouveau format ? (pendant la transition, la route peut encore renvoyer l'ancien.) */
const isView = (d: unknown): d is BillingView => !!d && typeof d === "object" && "quotas" in d && "packPrices" in d;

/** Forfait et quotas du compte. `billing` reste nul tant que la réponse n'est pas au bon format. */
export function useBilling(opts: { poll?: number } = {}) {
  const { data, reload, error, loading } = useApi<unknown>("/api/billing", opts);
  return { billing: isView(data) ? data : null, raw: data, reload, error, loading };
}

/** Fonction pas encore construite dans le studio. */
export function Soon({ className }: { className?: string }) {
  const t = useT();
  return <span className={cx("inline-flex shrink-0 items-center rounded-full bg-warn-soft px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-warn", className)}>{t("Bientôt", "Soon")}</span>;
}

/** Création d'images, de vidéos ou d'UGC fermée (découverte gratuite). Faux tant que le forfait n'est pas chargé. */
export function useCreationLocked() {
  const { billing } = useBilling();
  // Dans un projet : son propre abonnement décide (un abonnement = un projet) ; l'ancien abonnement du compte
  // n'existe pas pour un client qui a souscrit par projet.
  const project = useOptionalProject();
  if (project?.data && "plan" in project.data) return !project.data.plan;
  return !!billing && billing.canCreate === false;
}

/** Raison affichée sous un bouton de création désactivé, avec le lien « Choisir un forfait ». */
export function PlanRequired({ what, className }: { what: "images" | "videos" | "ugc"; className?: string }) {
  const t = useT();
  const text = {
    images: t("La création d'images est incluse dans les forfaits.", "Image creation is included in the plans."),
    videos: t("La création de vidéos est incluse dans les forfaits.", "Video creation is included in the plans."),
    ugc: t("Les vidéos UGC sont réservées aux forfaits.", "UGC videos are available with the plans."),
  }[what];
  return (
    <div role="note" className={cx("flex items-start gap-2 rounded-2xl border border-signal/30 bg-signal-soft px-3 py-2.5 text-xs text-ink", className)}>
      <Lock className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden />
      <p>
        {text} {t("La découverte gratuite montre l'analyse, la marque, les logos et l'aperçu de la boutique.", "The free discovery shows the analysis, brand, logos and store preview.")}{" "}
        <Link href="/studio/compte#forfaits" className="font-semibold underline underline-offset-2">{t("Choisir un forfait", "Choose a plan")}</Link>
      </p>
    </div>
  );
}

export { aiLeftPct } from "@/lib/ai-left";

/** Couleur d'une barre d'utilisation : normale, proche de la fin (80 %), épuisée (100 %). */
const usageTone = (pct: number) => (pct >= 100 ? "bg-bad" : pct >= 80 ? "bg-warn" : "bg-signal");

export function UsageMeter({ used, label, thin }: { used: number; label: string; thin?: boolean }) {
  return (
    <div className={cx("w-full overflow-hidden rounded-full bg-line", thin ? "h-1.5" : "h-2.5")} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={used} aria-label={label}>
      <div className={cx("h-full rounded-full transition-[width] duration-500", usageTone(used))} style={{ width: `${used > 0 ? Math.max(used, 2) : 0}%` }} />
    </div>
  );
}

/**
 * Utilisation de l'IA en pourcentages seulement (aucun prix) : une barre pour le forfait du mois (remise à 0 % au
 * renouvellement), une pour les crédits achetés en plus (seulement s'il y en a). Compacte dans l'en-tête du studio,
 * détaillée dans « Mon compte » et le menu du téléphone. Forfait et crédits épuisés : l'IA est en pause.
 */
export function AiUsageBar({ billing, variant = "compact", className }: { billing: BillingView | null; variant?: "compact" | "full"; className?: string }) {
  const t = useT();
  if (!billing?.ai) return null;
  const { plan, credits, paused } = billing.ai;
  const date = formatDate(billing.periodEnd, { day: "numeric", month: "long" });
  const left = (u: number) => 100 - u;
  if (variant === "compact") {
    const title = [t(`Forfait : ${plan.used} % utilisés, reste ${left(plan.used)} %`, `Plan: ${plan.used}% used, ${left(plan.used)}% left`), credits && t(`Crédits achetés : reste ${left(credits.used)} %`, `Purchased credits: ${left(credits.used)}% left`), paused && t(`IA en pause jusqu'au ${date}`, `AI paused until ${date}`)].filter(Boolean).join(" · ");
    return (
      <Link href="/studio/compte#ia" className={cx("hidden h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-card px-3 text-xs font-medium hover:border-ink md:inline-flex", paused ? "text-bad" : "text-ink-2", className)} title={title} aria-label={title}>
        <Gauge className="size-4 shrink-0" aria-hidden />
        <span className="grid w-16 gap-1">
          <UsageMeter used={plan.used} label={t("IA du forfait", "Plan AI")} thin />
          {credits && <UsageMeter used={credits.used} label={t("Crédits achetés", "Purchased credits")} thin />}
        </span>
        <span className="whitespace-nowrap tabular-nums">{paused ? t("En pause", "Paused") : plan.used >= 100 && credits ? t(`Crédits : reste ${left(credits.used)} %`, `Credits: ${left(credits.used)}% left`) : t(`Reste ${left(plan.used)} %`, `${left(plan.used)}% left`)}</span>
      </Link>
    );
  }
  const row = (title: string, used: number, note: string) => (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium">{title}</p>
        <p className="text-sm tabular-nums text-ink-2"><strong className={cx("font-display text-xl", used >= 100 && "text-bad")}>{used} %</strong> {t("utilisés", "used")} · {t(`reste ${left(used)} %`, `${left(used)}% left`)}</p>
      </div>
      <div className="mt-2"><UsageMeter used={used} label={title} /></div>
      <p className="mt-1.5 text-xs text-muted">{note}</p>
    </div>
  );
  return (
    <div id="ia" className={cx("grid scroll-mt-20 gap-4", className)}>
      {row(t("IA du forfait", "Plan AI"), plan.used, t(`Repart à 0 % le ${date}.`, `Back to 0% on ${date}.`))}
      {credits && row(t("Crédits achetés", "Purchased credits"), credits.used, t("Utilisés une fois le forfait épuisé ; ils n'expirent pas.", "Used once the plan is used up; they don't expire."))}
      {paused ? (
        <div className="rounded-xl bg-bad/10 p-3 text-sm text-bad">
          {t(`L'IA est en pause : elle reprend le ${date}, ou tout de suite avec une recharge. En attendant, le moteur local du studio continue (sans IA).`, `AI is paused: it resumes on ${date}, or right away with a top-up. Meanwhile, the studio's local engine keeps working (without AI).`)}
          <div><Link href="/studio/compte" className="mt-2 inline-flex h-10 items-center rounded-full bg-signal px-4 text-sm font-semibold text-signal-ink">{t("Recharger l'IA", "Top up AI")}</Link></div>
        </div>
      ) : plan.used >= 80 && !credits ? (
        <p className="text-sm text-warn">{t(`Bientôt à 100 % : l'IA se mettra en pause jusqu'au ${date}, ou jusqu'à une recharge.`, `Almost at 100%: AI will pause until ${date}, or until a top-up.`)}</p>
      ) : null}
    </div>
  );
}

/** Lien discret vers « Mon compte » (forfait en cours) dans l'en-tête du studio. */
export function PlanLink({ billing, className }: { billing: BillingView | null; className?: string }) {
  const t = useT();
  const { lang } = useLang();
  // Dans un projet : le forfait de SON abonnement (un abonnement = un projet), sinon celui de l'ancien abonnement du compte.
  const project = useOptionalProject();
  if (!billing) return null;
  const id = project?.data && "plan" in project.data ? project.data.plan : billing.plan;
  const plan = id && id in PLANS ? PLANS[id as keyof typeof PLANS] : null;
  return (
    <div className={cx("flex shrink-0 items-center gap-1.5", className)}>
      <Link href="/studio/compte" className="hidden h-10 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink md:inline-flex" title={t("Mon compte", "My account")}>
        {plan ? plan.name[lang] : t("Découverte", "Discovery")}
      </Link>
      {!plan && (
        <Link href="/studio/compte#forfaits" aria-label={t("Choisir un forfait", "Choose a plan")} title={t("Choisir un forfait", "Choose a plan")} className="plan-sparkle inline-flex size-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-signal text-xs font-semibold text-signal-ink sm:w-auto sm:px-3">
          <Sparkles className="size-4 sm:size-3.5" aria-hidden /> <span className="hidden sm:inline">{t("Choisir un forfait", "Choose a plan")}</span>
        </Link>
      )}
    </div>
  );
}

/** Bandeau fermable quand un quota du forfait est épuisé (fermeture mémorisée jusqu'au renouvellement). */
export function QuotaBanner({ billing, className }: { billing: BillingView | null; className?: string }) {
  const t = useT();
  const { lang } = useLang();
  const [hidden, setHidden] = useState<string[]>([]);
  const key = billing ? `ecs-quota-banner-${billing.periodEnd}` : "";
  useEffect(() => {
    if (!key) return;
    try {
      setHidden(JSON.parse(localStorage.getItem(key) ?? "[]"));
    } catch {}
  }, [key]);
  if (!billing?.plan) return null;
  const plan = PLANS[billing.plan];
  const empty = (Object.keys(billing.quotas) as QuotaKey[]).filter((k) => plan.quotas[k] > 0 && billing.quotas[k].left <= 0 && !hidden.includes(k));
  if (!empty.length) return null;
  const k = empty[0];
  const pack = PACK_FOR_QUOTA[k];
  const date = formatDate(billing.periodEnd, { day: "numeric", month: "long" });
  const close = () => {
    const next = [...hidden, k];
    setHidden(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };
  return (
    <div role="status" className={cx("flex items-start gap-3 border-b border-warn/30 bg-warn-soft px-4 py-2.5 text-sm text-warn sm:px-6", className)}>
      <p className="min-w-0 flex-1">
        <strong>{t(`Plus de ${QUOTA_LABEL[k].fr[1]} ce mois-ci.`, `No ${QUOTA_LABEL[k].en[1]} left this month.`)}</strong>{" "}
        {pack ? (
          <>
            <Link href={`/studio/compte?pack=${pack}#packs`} className="font-semibold underline underline-offset-2">{t(`Ajouter un ${PACKS[pack].name.fr} (${formatEur(billing.packPrices[pack], lang)})`, `Add a ${PACKS[pack].name.en} (${formatEur(billing.packPrices[pack], lang)})`)}</Link>
            {t(` ou attendre le ${date}.`, ` or wait until ${date}.`)}
          </>
        ) : (
          t(`Ils reviennent le ${date}.`, `They come back on ${date}.`)
        )}
      </p>
      <button type="button" onClick={close} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-warn/10" aria-label={t("Fermer", "Close")}>
        <X className="size-4" />
      </button>
    </div>
  );
}
