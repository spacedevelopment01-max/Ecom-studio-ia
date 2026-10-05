"use client";
/**
 * Forfait et quotas du compte côté navigateur (lecture de GET /api/billing), et petits éléments partagés :
 * prix en euros, libellés des quotas, badge « Bientôt », lien « forfait » et bandeau « quota épuisé » du studio.
 * Jamais de crédits ni de coûts d'IA : seulement des quotas concrets (visuels, vidéos…).
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { Lock, Sparkles, X } from "lucide-react";
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

/** Lien discret vers « Mon compte » (forfait en cours) dans l'en-tête du studio. */
export function PlanLink({ billing, className }: { billing: BillingView | null; className?: string }) {
  const t = useT();
  const { lang } = useLang();
  if (!billing) return null;
  const plan = billing.plan ? PLANS[billing.plan] : null;
  return (
    <div className={cx("flex shrink-0 items-center gap-1.5", className)}>
      <Link href="/studio/compte" className="hidden h-10 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-medium text-ink-2 hover:border-ink hover:text-ink md:inline-flex" title={t("Mon compte", "My account")}>
        {plan ? plan.name[lang] : t("Découverte", "Discovery")}
      </Link>
      {!plan && (
        <Link href="/studio/compte#forfaits" aria-label={t("Choisir un forfait", "Choose a plan")} title={t("Choisir un forfait", "Choose a plan")} className="inline-flex size-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-signal text-xs font-semibold text-signal-ink sm:w-auto sm:px-3">
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
