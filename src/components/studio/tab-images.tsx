"use client";
import { useEffect, useState } from "react";
import { Sparkles, Wand2, ImagePlus } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Select, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, ROLE_LABEL, SectionTitle, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";

const GROUPS = [
  { id: "all", label: "Tout", en: "All", roles: "packshot,detail,scene,lifestyle,banner,social,ad,cutout" },
  { id: "packshot", label: "Packshots", en: "Packshots", roles: "packshot" },
  { id: "detail", label: "Détails", en: "Details", roles: "detail" },
  { id: "scene", label: "Scènes", en: "Scenes", roles: "scene" },
  { id: "lifestyle", label: "En situation", en: "Lifestyle", roles: "lifestyle" },
  { id: "banner", label: "Bannières", en: "Banners", roles: "banner" },
  { id: "social", label: "Réseaux", en: "Social", roles: "social" },
  { id: "ad", label: "Publicités", en: "Ads", roles: "ad" },
  { id: "cutout", label: "Détourages", en: "Cutouts", roles: "cutout,original" },
];

const STYLES = [
  ["studio", "Studio doux", "Soft studio"],
  ["podium", "Podium", "Podium"],
  ["arch", "Arche", "Arch"],
  ["window", "Lumière de fenêtre", "Window light"],
  ["spotlight", "Projecteur sombre", "Dark spotlight"],
  ["split", "Aplats de couleur", "Color blocks"],
  ["color", "Fond de marque", "Brand background"],
];
const FORMATS = [
  ["product", "4:5 HD (fiche produit)", "4:5 HD (product page)"],
  ["packshot", "1:1 HD (packshot)", "1:1 HD (packshot)"],
  ["square", "1:1 (réseaux)", "1:1 (social)"],
  ["portrait", "4:5 (Instagram)", "4:5 (Instagram)"],
  ["story", "9:16 (story, reel)", "9:16 (story, reel)"],
  ["landscape", "16:9", "16:9"],
  ["banner", "2:1 (bannière)", "2:1 (banner)"],
  ["pin", "2:3 (Pinterest)", "2:3 (Pinterest)"],
];

export default function TabImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ kind: "scene", style: "window", format: "product", layout: "editorial", headline: "", subline: "", cta: "", useAi: false });
  const active = useActive(["images.generate", "image.single"]);
  const cost = useCostConfirm();
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${GROUPS.find((g) => g.id === group)!.roles}`);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(`es-insert-images-${id}`);
      if (pending) {
        setForm((f) => ({ ...f, kind: "ad", headline: pending.split("\n").find((l) => l.trim() && !l.startsWith("#"))?.slice(0, 80) ?? "" }));
        sessionStorage.removeItem(`es-insert-images-${id}`);
        toast("info", t("Prompt inséré : ajustez le titre et lancez la création.", "Prompt inserted: adjust the headline and start creating."));
      }
    } catch {}
  }, [id, toast, t]);
  const create = async (mode: "set" | "single") => {
    if (form.useAi && data?.ai.image && !(await cost.confirm(mode === "set" ? "images" : "image"))) return;
    try {
      await api(`/api/projects/${id}/images`, { body: { mode, ...form, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined }, lang: cl.lang });
      toast("ok", mode === "set" ? t("Jeu d'images complet en préparation.", "Full image set in progress.") : t("Image en préparation.", "Image in progress."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const textual = form.kind === "social" || form.kind === "ad";
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      <EngineNotice what={t("les décors (studio, podium, arche, lumière de fenêtre…)", "the backdrops (studio, podium, arch, window light…)")} />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">{t("Créer", "Create")}</h2>
          <p className="mt-1 text-xs text-muted">{t("Le produit est toujours composé à partir de ses pixels réels ; les textes sont ajoutés typographiquement.", "The product is always composited from its real pixels; text is added typographically.")}</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label={t("Type", "Type")} htmlFor="ikind">
              <Select id="ikind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: e.target.value === "packshot" ? "packshot" : e.target.value === "banner" ? "banner" : e.target.value === "scene" ? "product" : "portrait" })}>
                <option value="packshot">Packshot</option>
                <option value="scene">{t("Scène", "Scene")}</option>
                <option value="banner">{t("Bannière de boutique", "Store banner")}</option>
                <option value="social">{t("Visuel social (avec texte)", "Social visual (with text)")}</option>
                <option value="ad">{t("Publicité (avec texte et bouton)", "Ad (with text and button)")}</option>
              </Select>
            </Field>
            {form.kind !== "packshot" && (
              <Field label={t("Mise en scène", "Setting")} htmlFor="istyle">
                <Select id="istyle" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>{STYLES.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select>
              </Field>
            )}
            <Field label="Format" htmlFor="ifmt">
              <Select id="ifmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>{FORMATS.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select>
            </Field>
            {textual && (
              <>
                <Field label={t("Composition", "Layout")} htmlFor="ilay">
                  <Select id="ilay" value={form.layout} onChange={(e) => setForm({ ...form, layout: e.target.value })}>
                    <option value="editorial">{t("Éditoriale (texte à gauche)", "Editorial (text on the left)")}</option>
                    <option value="centered">{t("Centrée", "Centered")}</option>
                    <option value="bold">{t("Affiche (fond de marque)", "Poster (brand background)")}</option>
                    <option value="minimal">{t("Minimale", "Minimal")}</option>
                    <option value="split">{t("Aplats", "Color blocks")}</option>
                  </Select>
                </Field>
                <Field label={t("Titre (2 à 6 mots)", "Headline (2 to 6 words)")} htmlFor="ihead"><Input id="ihead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={data?.brand?.tagline || t("Titre", "Headline")} /></Field>
                <Field label={t("Sous-titre", "Subheadline")} htmlFor="isub"><Input id="isub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t("Un fait confirmé", "A confirmed fact")} /></Field>
                {form.kind === "ad" && <Field label={t("Bouton", "Button")} htmlFor="icta"><Input id="icta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder={cl.lang === "en" ? "Discover" : "Découvrir"} /></Field>}
              </>
            )}
            {(form.kind === "scene" || form.kind === "banner") && (
              <div className={cx("rounded-2xl p-3", data?.ai.image ? "bg-paper-2" : "bg-paper-2 opacity-60")}>
                <Toggle checked={form.useAi && !!data?.ai.image} onChange={(v) => setForm({ ...form, useAi: v })} disabled={!data?.ai.image} label={t("Décor généré par IA", "AI-generated backdrop")} />
                <p className="mt-1.5 text-[11px] text-muted">{data?.ai.image ? t("Seul le décor est généré ; le produit réel est replacé par-dessus puis vérifié. Consomme des crédits IA.", "Only the backdrop is generated; the real product is placed back on top and checked. Uses AI credits.") : t("Aucun fournisseur d'images n'est configuré : décors du studio.", "No image provider is configured: studio backdrops.")}</p>
              </div>
            )}
            <ContentLangPicker {...cl} />
            <Button onClick={() => create("single")} icon={<Wand2 className="size-4" />}>{t("Créer l'image", "Create image")}</Button>
            <Button variant="secondary" className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>{t("Jeu complet (packshots, détails, scènes, bannières, réseaux)", "Full set (packshots, details, scenes, banners, social)")}</Button>
          </div>
        </Card>
        <div>
          <div className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto" role="tablist">
            {GROUPS.map((g) => (
              <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", group === g.id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
                {t(g.label, g.en)}
              </button>
            ))}
          </div>
          {list && list.assets.length === 0 ? (
            <Empty title={t("Aucune image dans cette catégorie", "No images in this category")} icon={<ImagePlus className="size-5" />}>{t("Lancez une création à gauche ; elle apparaîtra ici, rangée automatiquement dans vos fichiers.", "Start a creation on the left; it will appear here, automatically filed in your files.")}</Empty>
          ) : (
            <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
              {(list?.assets ?? []).map((a) => (
                <button key={a.id} onClick={() => setViewer(a)} className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="relative">
                    <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
                    <span className="absolute left-2 top-2"><StatusBadge status={a.status} /></span>
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-xs">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
                    {a.meta?.format && <Badge className="shrink-0">{a.meta.format}</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}
