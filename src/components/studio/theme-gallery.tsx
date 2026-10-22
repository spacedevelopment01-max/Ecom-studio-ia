"use client";
import { MarketingStrategy } from "./marketing-strategy";
import { Check, Eye, Lock, Moon } from "lucide-react";
import type { ThemeRecommendationContract } from "@/lib/theme/theme-recommendation";
import { REFERENCE_THEMES, themePreviewPath } from "@/lib/theme/theme-fit";
import { STORE_KINDS, storeKindLabel, type StoreKind } from "@/lib/theme/store-kind";
import { useEffect, useRef, useState } from "react";
import { api, Badge, Button, cx, Modal, useApi, useToast } from "../ui";
import type { DirectionCard } from "@/lib/theme/directions";
import { DirectionThumb } from "./direction-thumb";
import { ThemeDemoViewer } from "./theme-demo-viewer";
import type { ThemeDemoStatus } from "@/lib/theme/theme-demos";
import { useLang, useT } from "../i18n";
import { PLANS, type PlanId } from "@/lib/plans";

const RANK: Record<PlanId, number> = { creer: 1, vendre: 2, dominer: 3 };

/**
 * Grille des thèmes de référence (catalogue actif depuis le 19 octobre) : aperçu réel, ambiance, combinaison
 * d'en-tête / pied de page, catégorie servie. Sans forfait payant, les thèmes sont verrouillés (le serveur refuse aussi
 * leur sélection) ; le thème actuel reste toujours utilisable, même s'il vient de l'ancien catalogue (il est alors
 * signalé « retiré » et n'est proposé à aucun autre projet).
 *
 * Avec `demos` (galerie du studio) : chaque carte montre la démonstration du thème — jamais le projet du client — et
 * « Voir la démo complète » ouvre la boutique de démonstration entière ; le projet ne change qu'à « Choisir ce thème ».
 */
export function ThemeGrid({ directions, current, onPick, busy, projectId, sandbox, plan, services, recommendation, demos, onDemo }: { directions: DirectionCard[]; current?: string | null; onPick?: (d: DirectionCard) => void; busy?: string | null; projectId?: string; sandbox?: string; plan?: PlanId | null; services?: boolean; recommendation?: ThemeRecommendationContract | null; demos?: Record<string, ThemeDemoStatus> | null; onDemo?: (d: DirectionCard) => void }) {
  const t = useT();
  const { lang } = useLang();
  // Éligibilité par catégorie (contrat « catégorie / thèmes éligibles / justification ») : un thème conçu pour une
  // autre catégorie reste visible avec son motif, mais ne s'applique pas ; le thème recommandé est signalé, jamais imposé.
  const excluded = new Map((recommendation?.excluded ?? []).map((x) => [x.id, x.reason]));
  const recommended = recommendation?.recommended ?? null;
  const alternatives = new Set((recommendation?.alternatives ?? []).map((a) => a.id));
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {directions.map((d) => {
        const on = d.id === current;
        const unfit = !on && excluded.get(d.id);
        const retired = !!d.retired;
        const preview = d.preview;
        const locked = plan !== undefined && !on && (!plan || !d.plan || RANK[d.plan] > RANK[plan]);
        const reference = (REFERENCE_THEMES as readonly string[]).includes(d.id);
        const demo = demos?.[d.id];
        return (
          <li key={d.id} className={cx("group flex flex-col overflow-hidden rounded-3xl border bg-card transition", on ? "border-signal ring-2 ring-signal/30" : "border-line hover:-translate-y-0.5 hover:shadow-soft")}>
            <div className="relative aspect-[16/11] overflow-hidden bg-paper-2">
              {demos !== undefined && reference ? (
                <img src={themePreviewPath(d.id)} alt={t(`Démo du thème ${d.name}`, `${d.name} theme demo`)} loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} data-demo-thumb />
              ) : projectId && d.preview.startsWith("/api/") ? (
                <DirectionThumb className="size-full" projectId={projectId} direction={d.id} sandbox={sandbox} fallback={themePreviewPath(d.id)} />
              ) : (
                <img src={preview} alt={t(`Aperçu de la direction ${d.name}`, `Preview of the ${d.name} direction`)} loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
              )}
              {/* Pastilles à la ligne plutôt que comprimées ou coupées (ex. NOCTIL : référence, alternative, forfait et « Sombre »). */}
              <div className="absolute inset-x-3 top-3 flex flex-wrap gap-1.5 [&>*]:whitespace-nowrap">
                {on && <Badge tone="signal">{t("Thème actuel", "Current theme")}</Badge>}
                {retired && <Badge tone="neutral">{t("Retiré du catalogue", "Withdrawn from catalogue")}</Badge>}
                {reference && !on && <Badge tone="signal">{t("Thème de référence", "Reference theme")}</Badge>}
                {recommended === d.id && !on && <Badge tone="signal">{t("Recommandé", "Recommended")}</Badge>}
                {alternatives.has(d.id) && !on && <Badge tone="neutral">{t("Alternative", "Alternative")}</Badge>}
                {d.plan && <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] backdrop-blur", locked ? "bg-black/70 text-white" : "bg-card/90 text-ink")}>{locked && <Lock className="size-3" aria-hidden />}{PLANS[d.plan].name[lang]}</span>}
                {d.dark && <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur"><Moon className="size-3" /> {t("Sombre", "Dark")}</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-display text-xl font-semibold">{d.name} <span className="serif-i text-base font-normal text-muted">· {d.tagline}</span></p>
              <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{d.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {d.chrome.map((c) => <li key={c} className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] text-ink-2">{c}</li>)}
              </ul>
              {onDemo && reference && (
                <button type="button" className="mt-4 inline-flex items-center gap-1.5 self-start rounded-full border border-line px-3 py-1.5 text-sm font-medium transition hover:border-ink disabled:cursor-wait disabled:opacity-60" disabled={!demo?.ready} onClick={() => onDemo(d)} data-open-demo={d.id}>
                  <Eye className="size-4" aria-hidden /> {demo?.ready ? t("Voir la démo complète", "View the full demo") : demo?.preparing || !demos ? t("Démo complète en préparation…", "Full demo being prepared…") : t("Démo complète indisponible", "Full demo unavailable")}
                </button>
              )}
              {onPick && unfit && <p className="mt-4 text-sm text-muted">{unfit}</p>}
              {onPick && !unfit && locked && d.plan && <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted"><Lock className="size-4" aria-hidden /> {t(`Avec le forfait ${PLANS[d.plan].name.fr}`, `With the ${PLANS[d.plan].name.en} plan`)}</p>}
              {onPick && !unfit && !locked && (
                <Button className={cx(onDemo ? "mt-2" : "mt-4", "self-start")} size="sm" variant={on ? "secondary" : "primary"} disabled={on || !!busy} loading={busy === d.id} icon={on ? <Check className="size-4" /> : undefined} onClick={() => onPick(d)} data-choose-theme={d.id}>
                  {on ? t("Appliqué", "Applied") : t("Choisir ce thème", "Choose this theme")}
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Fenêtre « Thèmes » de l'éditeur de boutique : changer de direction crée une nouvelle version restaurable. */
export function ThemeGallery({ open, onClose, projectId, directions, current, canApply, onApplied, services, sandbox, recommendation, onKindChanged }: { open: boolean; onClose: () => void; projectId: string; directions: DirectionCard[]; current?: string | null; canApply: boolean; onApplied?: (direction: string) => void; services?: boolean; sandbox?: string; recommendation?: ThemeRecommendationContract | null; onKindChanged?: () => void }) {
  const t = useT();
  const toast = useToast();
  const { lang } = useLang();
  const [busy, setBusy] = useState<string | null>(null);
  // Un seul choix à la fois : la garde est posée avant tout rendu (un double-clic n'envoie jamais deux demandes).
  const picking = useRef(false);
  const [viewing, setViewing] = useState<DirectionCard | null>(null);
  const [demoPoll, setDemoPoll] = useState(0);
  const { data: demoData } = useApi<{ demos: ThemeDemoStatus[] }>(open ? "/api/theme-demos" : null, { poll: demoPoll });
  const demos = demoData ? Object.fromEntries(demoData.demos.map((x) => [x.id, x])) : null;
  const waiting = !!demoData?.demos.some((x) => x.preparing && !x.ready);
  useEffect(() => setDemoPoll(waiting ? 15000 : 0), [waiting]);
  const [kindBusy, setKindBusy] = useState(false);
  const category = recommendation?.category ?? null;
  const setKind = async (kind: StoreKind | null) => {
    setKindBusy(true);
    try {
      await api(`/api/projects/${projectId}/theme/store-kind`, { body: { storeKind: kind } });
      toast("ok", kind ? t(`Catégorie enregistrée : ${storeKindLabel(kind, "fr")}. Le thème installé n'a pas changé.`, `Category saved: ${storeKindLabel(kind, "en")}. The installed theme hasn't changed.`) : t("Catégorie déduite à nouveau du projet.", "Category inferred from the project again."));
      onKindChanged?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setKindBusy(false);
    }
  };
  const { data: sub } = useApi<{ subscription: { plan: PlanId; status: string } | null }>(open ? `/api/projects/${projectId}/subscription` : null);
  const plan = sub ? (sub.subscription && ["active", "manual"].includes(sub.subscription.status) ? sub.subscription.plan : null) : undefined;
  const excluded = new Map((recommendation?.excluded ?? []).map((x) => [x.id, x.reason]));
  const pick = canApply
    ? async (d: DirectionCard) => {
        if (picking.current) return;
        picking.current = true;
        setBusy(d.id);
        try {
          await api(`/api/projects/${projectId}/theme/build`, { body: { direction: d.id } });
          toast("ok", t(`Thème ${d.name} choisi : la boutique se compose avec votre marque, vos textes et vos images. L'éditeur s'ouvre ; l'ancienne version reste restaurable.`, `${d.name} theme chosen: the store is being composed with your brand, copy and images. The editor opens; the previous version can still be restored.`));
          setViewing(null);
          onApplied?.(d.id);
          onClose();
        } catch (e) {
          toast("bad", (e as Error).message);
        } finally {
          picking.current = false;
          setBusy(null);
        }
      }
    : undefined;
  // Ce qui empêche le choix depuis la démo complète (catégorie, forfait) : affiché à la place du bouton.
  const blockedFor = (d: DirectionCard): string | null => {
    if (!canApply) return t("Disponible après la préparation de votre projet", "Available after preparing your project");
    if (d.id !== current && excluded.get(d.id)) return excluded.get(d.id)!;
    if (plan !== undefined && d.id !== current && (!plan || !d.plan || RANK[d.plan] > RANK[plan])) return d.plan ? t(`Avec le forfait ${PLANS[d.plan].name.fr}`, `With the ${PLANS[d.plan].name.en} plan`) : t("Forfait requis", "Plan required");
    return null;
  };
  return (
    <Modal open={open} onClose={onClose} title={t("Thèmes", "Themes")} wide>
      <p className="mb-5 text-sm text-muted">
        {services
          ? t(
              "Onze thèmes de référence, accessibles selon votre forfait (1, 3 ou tous par famille), chacun conçu pour une catégorie de projet (prestations de services, e-commerce, boutique spécialisée), avec sa composition, ses typographies, son en-tête, son pied de page et ses animations. « Voir la démo complète » ouvre le site de démonstration du thème en entier, avec nos contenus d'exemple : votre projet ne change pas pendant la visite. « Choisir ce thème » crée ensuite une nouvelle version du site avec vos textes, prestations et images, et l'ancienne version reste restaurable.",
              "Eleven reference themes, available according to your plan (1, 3 or all per family), each designed for one project category (services, e-commerce, specialty store), with its own layout, typography, header, footer and animations. “View the full demo” opens the theme's whole demo website, with our sample content: your project does not change while you browse. “Choose this theme” then creates a new version of the website with your copy, services and images, and the previous version can still be restored.",
            )
          : t(
              "Onze thèmes de référence, accessibles selon votre forfait (1, 3 ou tous par famille), chacun conçu pour une catégorie de projet (prestations de services, e-commerce, boutique spécialisée), avec sa composition, ses typographies, son en-tête, son pied de page et ses animations. « Voir la démo complète » ouvre toute la boutique de démonstration du thème, avec nos produits et visuels d'exemple : votre projet ne change pas pendant la visite. « Choisir ce thème » crée ensuite une nouvelle version de la boutique avec vos textes, images et produit, et l'ancienne version reste restaurable. Tout reste modifiable ensuite dans l'éditeur Shopify.",
              "Eleven reference themes, available according to your plan (1, 3 or all per family), each designed for one project category (services, e-commerce, specialty store), with its own layout, typography, header, footer and animations. “View the full demo” opens the theme's whole demo store, with our sample products and visuals: your project does not change while you browse. “Choose this theme” then creates a new version of the store with your copy, images and product, and the previous version can still be restored. Everything stays editable afterwards in the Shopify editor.",
            )}
        {!canApply && t(" Les thèmes s'appliquent une fois la boutique créée (après l'analyse du produit).", " Themes can be applied once the store has been created (after the product analysis).")}
      </p>
      <MarketingStrategy projectId={projectId} />
      {category && (
        <div className="mb-5 rounded-2xl border border-line bg-paper-2 p-4 text-sm" data-store-kind={category.kind}>
          <p className="font-semibold">
            {t("Catégorie du projet : ", "Project category: ")}{storeKindLabel(category.kind, lang)}
            <span className="ml-2 font-normal text-muted">{category.source === "client" ? t("(confirmée par vous)", "(confirmed by you)") : category.source === "preparation" ? t("(recommandée par la préparation du projet)", "(recommended by the project preparation)") : t("(déduite du projet)", "(inferred from the project)")}</span>
          </p>
          <p className="mt-1 text-ink-2">{category.reasons.map((r) => (lang === "en" ? r.en : r.fr)).join(" ")}</p>
          {category.confidence === "ask" && category.question && <p className="mt-2 font-medium">{lang === "en" ? category.question.en : category.question.fr}</p>}
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={t("Changer la catégorie du projet", "Change the project category")}>
            {STORE_KINDS.map((k) => (
              <button key={k} type="button" disabled={kindBusy} aria-pressed={category.kind === k} onClick={() => setKind(k)} className={cx("rounded-full border px-3 py-1 text-sm transition", category.kind === k ? "border-signal bg-signal/10 text-ink" : "border-line bg-card text-ink-2 hover:border-ink/40")}>
                {storeKindLabel(k, lang)}
              </button>
            ))}
            {category.source === "client" && <button type="button" disabled={kindBusy} onClick={() => setKind(null)} className="rounded-full px-3 py-1 text-sm text-muted underline">{t("Laisser le studio déduire", "Let the studio infer")}</button>}
          </div>
          {recommendation && (recommendation.reasons.length > 0 || recommendation.warnings.length > 0) && (
            <p className="mt-3 text-ink-2">
              {recommendation.recommended ? t(`Thème recommandé : ${directions.find((d) => d.id === recommendation.recommended)?.name ?? recommendation.recommended}. `, `Recommended theme: ${directions.find((d) => d.id === recommendation.recommended)?.name ?? recommendation.recommended}. `) : ""}
              {recommendation.reasons.join(" ")} {recommendation.warnings.join(" ")}
              {recommendation.source === "preparation" ? t(" Source : contrat du parcours amont.", " Source: preparation journey contract.") : recommendation.source === "local" ? t(" Source : règles du studio, sans contrat amont.", " Source: studio rules, without a preparation contract.") : ""}
            </p>
          )}
        </div>
      )}
      <ThemeGrid
        recommendation={recommendation}
        services={services}
        directions={directions}
        plan={plan}
        projectId={projectId}
        sandbox={sandbox}
        current={current}
        busy={busy}
        demos={demos}
        onDemo={(d) => setViewing(d)}
        onPick={pick}
      />
      {viewing && demos?.[viewing.id]?.ready && (
        <ThemeDemoViewer theme={viewing} status={demos[viewing.id]} current={viewing.id === current} blocked={blockedFor(viewing)} choosing={busy === viewing.id} onChoose={pick ? () => pick(viewing) : undefined} onClose={() => setViewing(null)} />
      )}
    </Modal>
  );
}
