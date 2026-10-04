"use client";
import { Check, Moon } from "lucide-react";
import { useState } from "react";
import { api, Badge, Button, cx, Modal, useToast } from "../ui";
import type { DirectionCard } from "@/lib/theme/directions";
import { useT } from "../i18n";

/** Grille des onze directions : aperçu réel, ambiance, combinaison d'en-tête / pied de page. */
export function ThemeGrid({ directions, current, onPick, busy }: { directions: DirectionCard[]; current?: string | null; onPick?: (d: DirectionCard) => void; busy?: string | null }) {
  const t = useT();
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {directions.map((d) => {
        const on = d.id === current;
        return (
          <li key={d.id} className={cx("group flex flex-col overflow-hidden rounded-3xl border bg-card transition", on ? "border-signal ring-2 ring-signal/30" : "border-line hover:-translate-y-0.5 hover:shadow-soft")}>
            <div className="relative aspect-[16/11] overflow-hidden bg-paper-2">
              <img src={d.preview} alt={t(`Aperçu de la direction ${d.name}`, `Preview of the ${d.name} direction`)} loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                {on && <Badge tone="signal">{t("Thème actuel", "Current theme")}</Badge>}
                {d.dark && <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur"><Moon className="size-3" /> {t("Sombre", "Dark")}</span>}
              </div>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <p className="font-display text-xl font-semibold">{d.name} <span className="serif-i text-base font-normal text-muted">· {d.tagline}</span></p>
              <p className="mt-1.5 line-clamp-3 text-sm text-ink-2">{d.description}</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {d.chrome.map((c) => <li key={c} className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] text-ink-2">{c}</li>)}
              </ul>
              {onPick && (
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
export function ThemeGallery({ open, onClose, projectId, directions, current, canApply, onApplied, services }: { open: boolean; onClose: () => void; projectId: string; directions: DirectionCard[]; current?: string | null; canApply: boolean; onApplied?: () => void; services?: boolean }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title={t("Thèmes", "Themes")} wide>
      <p className="mb-5 text-sm text-muted">
        {services
          ? t(
              "Onze directions artistiques, chacune avec sa composition, ses typographies, son en-tête, son pied de page et ses animations. Appliquer un thème crée une nouvelle version du site : textes, prestations et images sont conservés, et l'ancienne version reste restaurable. Les vignettes sont des exemples ; votre site garde son contenu.",
              "Eleven art directions, each with its own layout, typography, header, footer and animations. Applying a theme creates a new version of the website: copy, services and images are kept, and the previous version can still be restored. The thumbnails are examples; your website keeps its own content.",
            )
          : t(
              "Onze directions artistiques, chacune avec sa composition, ses typographies, son en-tête, son pied de page et ses animations. Appliquer un thème crée une nouvelle version de la boutique : textes, images et produit sont conservés, et l'ancienne version reste restaurable. Tout reste modifiable ensuite dans l'éditeur Shopify.",
              "Eleven art directions, each with its own layout, typography, header, footer and animations. Applying a theme creates a new version of the store: copy, images and product are kept, and the previous version can still be restored. Everything stays editable afterwards in the Shopify editor.",
            )}
        {!canApply && t(" Les thèmes s'appliquent une fois la boutique créée (après l'analyse du produit).", " Themes can be applied once the store has been created (after the product analysis).")}
      </p>
      <ThemeGrid
        directions={directions}
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
