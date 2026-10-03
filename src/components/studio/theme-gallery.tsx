"use client";
import { Check, Moon } from "lucide-react";
import { useState } from "react";
import { api, Badge, Button, cx, Modal, useToast } from "../ui";
import type { DirectionCard } from "@/lib/theme/directions";

/** Grille des onze directions : aperçu réel, ambiance, combinaison d'en-tête / pied de page. */
export function ThemeGrid({ directions, current, onPick, busy }: { directions: DirectionCard[]; current?: string | null; onPick?: (d: DirectionCard) => void; busy?: string | null }) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {directions.map((d) => {
        const on = d.id === current;
        return (
          <li key={d.id} className={cx("group flex flex-col overflow-hidden rounded-3xl border bg-card transition", on ? "border-signal ring-2 ring-signal/30" : "border-line hover:-translate-y-0.5 hover:shadow-soft")}>
            <div className="relative aspect-[16/11] overflow-hidden bg-paper-2">
              <img src={d.preview} alt={`Aperçu de la direction ${d.name}`} loading="lazy" className="size-full object-cover object-top transition duration-700 group-hover:scale-[1.03]" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                {on && <Badge tone="signal">Thème actuel</Badge>}
                {d.dark && <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white backdrop-blur"><Moon className="size-3" /> Sombre</span>}
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
                  {on ? "Appliqué" : "Appliquer ce thème"}
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
export function ThemeGallery({ open, onClose, projectId, directions, current, canApply, onApplied }: { open: boolean; onClose: () => void; projectId: string; directions: DirectionCard[]; current?: string | null; canApply: boolean; onApplied?: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  return (
    <Modal open={open} onClose={onClose} title="Thèmes" wide>
      <p className="mb-5 text-sm text-muted">
        Onze directions artistiques, chacune avec sa composition, ses typographies, son en-tête, son pied de page et ses animations. Appliquer un thème crée une nouvelle version de la boutique : textes, images et produit sont conservés, et l'ancienne version reste restaurable. Tout reste modifiable ensuite dans l'éditeur Shopify.
        {!canApply && " Les thèmes s'appliquent une fois la boutique créée (après l'analyse du produit)."}
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
                  toast("ok", `Thème ${d.name} en cours d'application : l'aperçu se met à jour dans quelques secondes.`);
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
