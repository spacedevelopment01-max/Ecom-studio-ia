"use client";
import { Check, Lock, Moon } from "lucide-react";
import { useState } from "react";
import { api, Badge, Button, cx, Modal, useApi, useToast } from "../ui";
import type { DirectionCard } from "@/lib/theme/directions";
import { DirectionThumb } from "./direction-thumb";
import { useLang, useT } from "../i18n";
import { PLANS, type PlanId } from "@/lib/plans";

const RANK: Record<PlanId, number> = { creer: 1, vendre: 2, dominer: 3 };

/**
 * Grille des 30 thèmes : aperçu réel, ambiance, combinaison d'en-tête / pied de page, forfait qui l'ouvre. Avec
 * `plan` (forfait du projet), les thèmes au-delà sont verrouillés (le serveur refuse aussi leur sélection) ; le thème
 * actuel reste toujours utilisable.
 */
export function ThemeGrid({ directions, current, onPick, busy, projectId, sandbox, plan, services }: { directions: DirectionCard[]; current?: string | null; onPick?: (d: DirectionCard) => void; busy?: string | null; projectId?: string; sandbox?: string; plan?: PlanId | null; services?: boolean }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {directions.map((d) => {
        const on = d.id === current;
        const reference = services ? d.id === "jardin" : d.id === "vitrine";
        const preview = reference ? `/theme-references/${d.id}.webp` : d.preview;
        const locked = plan !== undefined && !on && (!plan || !d.plan || RANK[d.plan] > RANK[plan]);
        return (
          <li key={d.id} className={cx("group flex flex-col overflow-hidden rounded-3xl border bg-card transition", on ? "border-signal ring-2 ring-signal/30" : "border-line hover:-translate-y-0.5 hover:shadow-soft")}>
            <div className="relative aspect-[16/11] overflow-hidden bg-paper-2">
              {projectId && d.preview.startsWith("/api/") ? (
                <DirectionThumb className="size-full" projectId={projectId} direction={d.id} sandbox={sandbox} fallback={reference ? preview : `/demo/directions/${d.id}.jpg`} />
              ) : (
                <img src={preview} alt={t(`Aperçu de la direction ${d.name}`, `Preview of the ${d.name} direction`)} loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
              )}
              <div className="absolute left-3 top-3 flex gap-1.5">
                {on && <Badge tone="signal">{t("Thème actuel", "Current theme")}</Badge>}
                {reference && <Badge tone="signal">{t("Nouvelle référence", "New reference")}</Badge>}
                {d.plan && <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] backdrop-blur", locked ? "bg-black/70 text-white" : "bg-card/90 text-ink")}>{locked && <Lock className="size-3" aria-hidden />}{PLANS[d.plan].name[lang]}</span>}
                {d.dark && <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur"><Moon className="size-3" /> {t("Sombre", "Dark")}</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-display text-xl font-semibold">{d.name} <span className="serif-i text-base font-normal text-muted">· {d.tagline}</span></p>
              <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{reference ? services ? t("Grand titre paysage, reportage photo, prestations en lignes, méthode et demande de devis. Navigation atelier et pied de page typographique.", "Landscape headline, visual editorial, service rows, process and quote request. Studio navigation and typographic footer.") : t("Ouverture asymétrique, objet entier, récit de matière, collection et fiche d'achat. Navigation vitrine et pied de page typographique.", "Asymmetric opening, complete product, material stories, collection and product page. Showcase navigation and typographic footer.") : d.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {d.chrome.map((c) => <li key={c} className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] text-ink-2">{c}</li>)}
              </ul>
              {onPick && locked && d.plan && <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted"><Lock className="size-4" aria-hidden /> {t(`Avec le forfait ${PLANS[d.plan].name.fr}`, `With the ${PLANS[d.plan].name.en} plan`)}</p>}
              {onPick && !locked && (
                <Button className="mt-4 self-start" size="sm" variant={on ? "secondary" : "primary"} disabled={on || !!busy} loading={busy === d.id} icon={on ? <Check className="size-4" /> : undefined} onClick={() => onPick(d)}>
                  {on ? t("Appliqué", "Applied") : t("Appliquer ce thème", "Apply this theme")}
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
export function ThemeGallery({ open, onClose, projectId, directions, current, canApply, onApplied, services, sandbox }: { open: boolean; onClose: () => void; projectId: string; directions: DirectionCard[]; current?: string | null; canApply: boolean; onApplied?: () => void; services?: boolean; sandbox?: string }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data: sub } = useApi<{ subscription: { plan: PlanId; status: string } | null }>(open ? `/api/projects/${projectId}/subscription` : null);
  const plan = sub ? (sub.subscription && ["active", "manual"].includes(sub.subscription.status) ? sub.subscription.plan : null) : undefined;
  return (
    <Modal open={open} onClose={onClose} title={t("Thèmes", "Themes")} wide>
      <p className="mb-5 text-sm text-muted">
        {services
          ? t(
              "30 thèmes, chacun avec sa composition, ses typographies, son en-tête, son pied de page et ses animations (10 avec Créer, 20 avec Développer, 30 avec Dominer). Appliquer un thème crée une nouvelle version du site : textes, prestations et images sont conservés, et l'ancienne version reste restaurable.",
              "30 themes (10 with Create, 20 with Grow, 30 with Dominate), each with its own layout, typography, header, footer and animations. Applying a theme creates a new version of the website: copy, services and images are kept, and the previous version can still be restored.",
            )
          : t(
              "30 thèmes, chacun avec sa composition, ses typographies, son en-tête, son pied de page et ses animations (10 avec Créer, 20 avec Développer, 30 avec Dominer). Appliquer un thème crée une nouvelle version de la boutique : textes, images et produit sont conservés, et l'ancienne version reste restaurable. Tout reste modifiable ensuite dans l'éditeur Shopify.",
              "30 themes (10 with Create, 20 with Grow, 30 with Dominate), each with its own layout, typography, header, footer and animations. Applying a theme creates a new version of the store: copy, images and product are kept, and the previous version can still be restored. Everything stays editable afterwards in the Shopify editor.",
            )}
        {!canApply && t(" Les thèmes s'appliquent une fois la boutique créée (après l'analyse du produit).", " Themes can be applied once the store has been created (after the product analysis).")}
      </p>
      <ThemeGrid
        services={services}
        directions={directions}
        plan={plan}
        projectId={projectId}
        sandbox={sandbox}
        current={current}
        busy={busy}
        onPick={
          canApply
            ? async (d) => {
                setBusy(d.id);
                try {
                  await api(`/api/projects/${projectId}/theme/build`, { body: { direction: d.id } });
                  toast("ok", t(`Thème ${d.name} en cours d'application : l'aperçu se met à jour dans quelques secondes.`, `Applying the ${d.name} theme: the preview will update in a few seconds.`));
                  onApplied?.();
                  onClose();
                } catch (e) {
                  toast("bad", (e as Error).message);
                } finally {
                  setBusy(null);
                }
              }
            : undefined
        }
      />
    </Modal>
  );
}
