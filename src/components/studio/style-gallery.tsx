"use client";
/**
 * Galerie « Changer de modèle » : la publication du client (ses textes, sa photo, ses couleurs) montrée dans chaque
 * modèle de la bibliothèque, par famille ; un clic applique le modèle, puis le client affine les couleurs (schéma)
 * et le traitement de la photo. Chaque changement est une nouvelle version (l'ancienne reste restaurable). Gratuit.
 */
import { useCallback, useEffect, useState } from "react";
import { LayoutTemplate } from "lucide-react";
import { api, Button, cx, Modal, useToast } from "../ui";
import { useT } from "../i18n";

type Item = { layout: string; name: string; family: string; schemes: string[]; treatments: string[]; preview: string | null; current: boolean };

const FAMILY: Record<string, [string, string]> = {
  studio: ["Compositions du studio", "Studio layouts"],
  photo: ["Photo pleine page", "Full-bleed photo"],
  split: ["Partages", "Splits"],
  frame: ["Cadres", "Frames"],
  collage: ["Collages", "Collages"],
  type: ["Typographie", "Typography"],
  promo: ["Accrocheurs", "Eye-catchers"],
  lux: ["Épurés et premium", "Minimal & premium"],
};
const SCHEME: Record<string, [string, string]> = { dark: ["Sombre", "Dark"], light: ["Clair", "Light"], brand: ["Couleur de marque", "Brand colour"], accent: ["Couleur vive", "Vivid colour"], mono: ["Noir et blanc", "Black & white"] };
const TREATMENT: Record<string, [string, string]> = { natural: ["Naturel", "Natural"], punch: ["Contrasté", "Punchy"], warm: ["Chaud", "Warm"], cool: ["Frais", "Cool"], mono: ["Noir et blanc", "Black & white"], moody: ["Ambiance sombre", "Moody"], duotone: ["Bichromie", "Duotone"] };

export function StyleGallery({ projectId, docKey, onApplied, compact }: { projectId: string; docKey: string; onApplied?: () => void; compact?: boolean }) {
  const t = useT();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [family, setFamily] = useState("studio");
  const [families, setFamilies] = useState<string[]>(Object.keys(FAMILY));
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [chosen, setChosen] = useState<Item | null>(null);
  const url = `/api/projects/${projectId}/ads/docs/${encodeURIComponent(docKey)}`;
  const load = useCallback(
    async (f: string) => {
      setItems(null);
      try {
        const r = await api<{ families: string[]; items: Item[] }>(url, { body: { action: "gallery", family: f } });
        setFamilies(r.families);
        setItems(r.items);
      } catch (e) {
        toast("bad", (e as Error).message);
        setItems([]);
      }
    },
    [url, toast],
  );
  useEffect(() => {
    if (open) load(family);
  }, [open, family, load]);
  const apply = async (body: Record<string, string>, key: string) => {
    setBusy(key);
    try {
      await api(url, { body: { action: "restyle", ...body } });
      toast("ok", t("Modèle appliqué (nouvelle version : l'ancienne reste restaurable dans l'éditeur).", "Template applied (new version: the previous one can be restored in the editor)."));
      onApplied?.();
      await load(family);
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
      <Button size="sm" variant="secondary" icon={<LayoutTemplate className="size-3.5" />} onClick={() => setOpen(true)} data-testid="open-style-gallery">
        {compact ? t("Modèles", "Templates") : t("Changer de modèle (bibliothèque)", "Change template (library)")}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={t("Bibliothèque de modèles", "Template library")} xl>
        <div className="grid gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("Familles de modèles", "Template families")}>
            {families.map((f) => (
              <button key={f} type="button" role="tab" aria-selected={family === f} onClick={() => (setFamily(f), setChosen(null))} className={cx("h-9 rounded-full border px-3 text-xs font-medium", family === f ? "border-ink bg-ink text-paper" : "border-line text-ink-2 hover:bg-paper-2")}>
                {t(...(FAMILY[f] ?? [f, f]))}
              </button>
            ))}
          </div>
          {chosen && (chosen.schemes.length > 1 || chosen.treatments.length > 1) && (
            <div className="grid gap-2 rounded-2xl border border-line p-3" data-testid="style-refine">
              <p className="text-xs font-medium">{t(`Affiner « ${chosen.name} »`, `Refine "${chosen.name}"`)}</p>
              {chosen.schemes.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">{t("Couleurs", "Colours")}</span>
                  {chosen.schemes.map((s) => <Button key={s} size="sm" variant="ghost" disabled={!!busy} onClick={() => apply({ layout: chosen.layout, scheme: s }, `s:${s}`)}>{t(...(SCHEME[s] ?? [s, s]))}</Button>)}
                </div>
              )}
              {chosen.treatments.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-muted">{t("Photo", "Photo")}</span>
                  {chosen.treatments.map((s) => <Button key={s} size="sm" variant="ghost" disabled={!!busy} onClick={() => apply({ layout: chosen.layout, treatment: s }, `t:${s}`)}>{t(...(TREATMENT[s] ?? [s, s]))}</Button>)}
                </div>
              )}
            </div>
          )}
          {!items ? (
            <p className="text-sm text-muted" aria-live="polite">{t("Préparation des aperçus avec votre publication…", "Preparing previews with your post…")}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">{t("Aucun modèle de cette famille pour cette publication.", "No template of this family for this post.")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="style-gallery">
              {items.map((it) => (
                <button key={it.layout} type="button" disabled={!!busy} onClick={() => (setChosen(it), apply({ layout: it.layout }, it.layout))} className={cx("group grid gap-1.5 rounded-2xl border p-2 text-left transition hover:border-ink", it.current ? "border-ink ring-2 ring-ink/20" : "border-line")} aria-label={t(`Appliquer le modèle ${it.name}`, `Apply template ${it.name}`)}>
                  {it.preview ? <img src={it.preview} alt="" className="w-full rounded-xl bg-paper-2" /> : <span className="grid aspect-[4/5] place-items-center rounded-xl bg-paper-2 text-xs text-muted">—</span>}
                  <span className="text-xs font-medium">{busy === it.layout ? t("Application…", "Applying…") : it.name}{it.current ? ` · ${t("actuel", "current")}` : ""}</span>
                </button>
              ))}
            </div>
          )}
          {!compact && <p className="text-[11px] text-muted">{t("Vos textes, votre photo et vos couleurs sont gardés ; seule la mise en page change. Gratuit, sans IA.", "Your texts, photo and colours are kept; only the layout changes. Free, no AI.")}</p>}
        </div>
      </Modal>
    </>
  );
}
