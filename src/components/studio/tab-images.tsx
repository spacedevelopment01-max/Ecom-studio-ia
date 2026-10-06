"use client";
import { useEffect, useState } from "react";
import { Sparkles, Wand2, ImagePlus } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, ROLE_LABEL, SectionTitle, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { PlanRequired, useCreationLocked } from "../billing-client";

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

/** Entreprise de services : pas de packshot ni de détourage — photos de l'activité, ambiances, visuels typographiques. */
const SERVICE_GROUPS = [
  { id: "all", label: "Tout", en: "All", roles: "lifestyle,scene,banner,social,ad" },
  { id: "photos", label: "Photos de l'activité", en: "Business photos", roles: "lifestyle,scene" },
  { id: "banner", label: "Bannières du site", en: "Website banners", roles: "banner" },
  { id: "social", label: "Réseaux", en: "Social", roles: "social" },
  { id: "ad", label: "Publicités", en: "Ads", roles: "ad" },
];
const SERVICE_KINDS = [
  ["service", "Annonce d'une prestation", "Service announcement"],
  ["tips", "Conseil d'expert (carrousel)", "Expert tip (carousel)"],
  ["quote", "Citation de la marque", "Brand quote"],
  ["info", "Horaires, zone et contact", "Hours, area and contact"],
  ["booking", "Publicité « Prenez rendez-vous »", "\"Book now\" ad"],
  ["banner", "Bannière du site (sans texte)", "Website banner (no text)"],
  ["ambiance", "Image d'ambiance (IA)", "Mood image (AI)"],
] as const;
const SERVICE_FORMATS: Record<string, string[]> = {
  service: ["portrait", "square", "story", "landscape"],
  tips: ["square"],
  quote: ["square", "portrait", "story"],
  info: ["portrait", "square", "story"],
  booking: ["story", "square", "portrait", "landscape"],
  banner: ["banner", "landscape"],
  ambiance: ["portrait", "square", "story", "landscape"],
};

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
  const { data } = useProject();
  return data?.business === "services" ? <ServiceImages /> : <ProductImages />;
}

function ProductImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ kind: "scene", style: "window", format: "product", layout: "editorial", headline: "", subline: "", cta: "", useAi: false });
  const active = useActive(["images.generate", "image.single"]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${GROUPS.find((g) => g.id === group)!.roles}`);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(`es-insert-images-${id}`);
      if (pending) {
        // Prompt de la bibliothèque : le bon type d'image est ouvert (le texte du prompt sert de référence, il n'est pas collé comme titre).
        let kind = "scene";
        try { kind = (JSON.parse(pending) as { kind?: string }).kind ?? kind; } catch {}
        setForm((f) => ({ ...f, kind: ["packshot", "scene", "social", "ad", "banner"].includes(kind) ? kind : "scene" }));
        sessionStorage.removeItem(`es-insert-images-${id}`);
        toast("info", t("Type d'image choisi d'après le prompt : vérifiez les options et lancez la création.", "Image type chosen from the prompt: check the options and start creating."));
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
                <p className="mt-1.5 text-[11px] text-muted">{data?.ai.image ? t("Seul le décor est généré ; le produit réel est replacé par-dessus puis vérifié. Chaque image utilise 1 visuel de votre forfait.", "Only the backdrop is generated; the real product is placed back on top and checked. Each image uses 1 visual from your plan.") : t("Aucun fournisseur d'images n'est configuré : décors du studio.", "No image provider is configured: studio backdrops.")}</p>
              </div>
            )}
            <ContentLangPicker {...cl} />
            <Button onClick={() => create("single")} disabled={locked} icon={<Wand2 className="size-4" />}>{t("Créer l'image", "Create image")}</Button>
            <Button variant="secondary" disabled={locked} className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>{t("Jeu complet (packshots, détails, scènes, bannières, réseaux)", "Full set (packshots, details, scenes, banners, social)")}</Button>
            {locked && <PlanRequired what="images" />}
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

/** Studio Images d'une entreprise de services : visuels à partir des photos de l'activité ou typographiques. */
function ServiceImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ kind: "service", format: "portrait", headline: "", subline: "", cta: "", serviceIndex: 0, tips: "", usePhoto: true });
  const active = useActive(["images.generate", "image.single"]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const roles = SERVICE_GROUPS.find((g) => g.id === group)!.roles;
  const { data: list, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=${roles}`);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const services = (data?.services?.services ?? []).filter((s) => s.name?.trim());
  const photos = (data?.counts?.lifestyle ?? 0) + (data?.counts?.original ?? 0);
  const aiImage = !!data?.ai.image;
  const FORMAT_LABEL: Record<string, [string, string]> = { portrait: ["4:5 · Instagram, Facebook", "4:5 · Instagram, Facebook"], square: ["1:1 · fil d'actualité", "1:1 · news feed"], story: ["9:16 · story, reel", "9:16 · story, reel"], landscape: ["16:9 · site, YouTube, LinkedIn", "16:9 · website, YouTube, LinkedIn"], banner: ["2:1 · bannière du site", "2:1 · website banner"] };
  const create = async (mode: "set" | "single") => {
    const ai = mode === "set" ? aiImage : form.kind === "ambiance";
    if (ai && aiImage && !(await cost.confirm(mode === "set" ? "images" : "image"))) return;
    try {
      const body = mode === "set"
        ? { mode, useAi: aiImage }
        : { mode, kind: form.kind, format: form.format, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined, serviceIndex: form.serviceIndex, items: form.kind === "tips" ? form.tips.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4) : undefined, usePhoto: form.usePhoto, useAi: form.kind === "ambiance" ? true : undefined };
      await api(`/api/projects/${id}/images`, { body, lang: cl.lang });
      toast("ok", mode === "set" ? t("Jeu de visuels en préparation.", "Visual set in progress.") : t("Visuel en préparation.", "Visual in progress."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const withText = !["banner", "ambiance"].includes(form.kind);
  const photoAllowed = ["service", "booking", "banner"].includes(form.kind);
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">{t("Créer", "Create")}</h2>
          <p className="mt-1 text-xs text-muted">{photos ? t("Les visuels partent de vos photos (réalisations, équipe, lieu) et de votre offre réelle : aucun avis ni chiffre inventé.", "Visuals start from your photos (work, team, premises) and your real offer: no made-up reviews or figures.") : t("Sans photo, les visuels sont typographiques et graphiques, à vos couleurs. Ajoutez des photos de vos réalisations, de votre équipe ou de votre lieu dans Fichiers pour des visuels plus vivants.", "Without photos, visuals are typographic and graphic, in your colors. Add photos of your work, team or premises in Files for livelier visuals.")}</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label={t("Type", "Type")} htmlFor="skind">
              <Select id="skind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: SERVICE_FORMATS[e.target.value][0] })}>
                {SERVICE_KINDS.map(([v, l, en]) => <option key={v} value={v} disabled={v === "ambiance" && !aiImage}>{t(l, en)}{v === "ambiance" && !aiImage ? t(" — IA non disponible", " — AI not available") : ""}</option>)}
              </Select>
            </Field>
            <Field label="Format" htmlFor="sfmt">
              <Select id="sfmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>{SERVICE_FORMATS[form.kind].map((v) => <option key={v} value={v}>{t(FORMAT_LABEL[v][0], FORMAT_LABEL[v][1])}</option>)}</Select>
            </Field>
            {form.kind === "service" && services.length > 0 && (
              <Field label={t("Prestation", "Service")} htmlFor="ssvc">
                <Select id="ssvc" value={form.serviceIndex} onChange={(e) => setForm({ ...form, serviceIndex: Number(e.target.value) })}>{services.map((s, i) => <option key={i} value={i}>{s.name}</option>)}</Select>
              </Field>
            )}
            {form.kind === "service" && services.length === 0 && <p className="rounded-2xl bg-paper-2 p-3 text-[11px] text-muted">{t("Aucune prestation saisie : le visuel présente l'activité. Ajoutez vos prestations dans l'onglet Activité.", "No services entered: the visual presents the business. Add your services in the Business tab.")}</p>}
            {form.kind === "tips" && (
              <Field label={t("Vos conseils (un par ligne, « Titre : texte »)", "Your tips (one per line, \"Title: text\")")} htmlFor="stips">
                <Textarea id="stips" rows={4} value={form.tips} onChange={(e) => setForm({ ...form, tips: e.target.value })} placeholder={t("Aérer chaque jour : 10 minutes suffisent…", "Air the room daily: it makes a difference…")} />
                <span className="mt-1 block text-[11px] text-muted">{data?.ai.llm ? t("Laissez vide : l'IA propose 3 conseils généraux, sans chiffre ni promesse, à relire.", "Leave empty: AI suggests 3 general tips, with no figures or promises, for you to review.") : t("Laissez vide : le carrousel détaille vos prestations.", "Leave empty: the carousel details your services.")}</span>
              </Field>
            )}
            {withText && (
              <>
                <Field label={form.kind === "quote" ? t("Phrase à citer (votre engagement)", "Line to quote (your promise)") : form.kind === "tips" ? t("Titre de couverture", "Cover title") : t("Titre", "Headline")} htmlFor="shead"><Input id="shead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={form.kind === "booking" ? t("Prenez rendez-vous", "Book an appointment") : data?.brand?.tagline || t("Titre", "Headline")} /></Field>
                {["service", "booking"].includes(form.kind) && <Field label={t("Texte", "Text")} htmlFor="ssub"><Input id="ssub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t("Tiré de votre offre si vide", "Taken from your offer if empty")} /></Field>}
                {["service", "booking", "info"].includes(form.kind) && <Field label={t("Bouton", "Button")} htmlFor="scta"><Input id="scta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder={t("Selon votre mode de contact", "Based on your contact method")} /></Field>}
              </>
            )}
            {form.kind === "ambiance" && <Field label={t("Précision (facultatif)", "Detail (optional)")} htmlFor="ssub2"><Input id="ssub2" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t("Ex. atelier lumineux, outils en bois", "E.g. bright workshop, wooden tools")} /></Field>}
            {photoAllowed && photos > 0 && <Toggle checked={form.usePhoto} onChange={(v) => setForm({ ...form, usePhoto: v })} label={t("Utiliser une photo de l'activité", "Use a business photo")} />}
            {form.kind === "ambiance" && <p className="rounded-2xl bg-paper-2 p-3 text-[11px] text-muted">{t("Illustration générée par IA de votre type d'activité : sans visage de client reconnaissable, sans texte, logo, diplôme ni récompense. Elle ne remplace pas une photo de vos locaux. Utilise 1 visuel de votre forfait.", "AI-generated illustration of your kind of business: no recognizable customer face, no text, logo, diploma or award. It doesn't replace a photo of your premises. Uses 1 visual from your plan.")}</p>}
            <ContentLangPicker {...cl} />
            <Button onClick={() => create("single")} disabled={locked} icon={<Wand2 className="size-4" />}>{form.kind === "tips" ? t("Créer le carrousel", "Create the carousel") : t("Créer le visuel", "Create visual")}</Button>
            <Button variant="secondary" disabled={locked} className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>{aiImage ? t("Jeu complet (photos, ambiances IA, bannières, réseaux, publicités)", "Full set (photos, AI moods, banners, social, ads)") : t("Jeu complet (photos, bannières, réseaux, publicités)", "Full set (photos, banners, social, ads)")}</Button>
            {locked && <PlanRequired what="images" />}
          </div>
        </Card>
        <div>
          <div className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto" role="tablist">
            {SERVICE_GROUPS.map((g) => (
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
                    {a.meta?.aiGenerated && <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-paper">{t("IA", "AI")}</span>}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="truncate text-xs">{a.role === "lifestyle" ? (a.meta?.aiGenerated ? t("Ambiance (IA)", "Mood (AI)") : t("Photo de l'activité", "Business photo")) : a.role === "scene" ? t("Photo recadrée", "Cropped photo") : ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
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
