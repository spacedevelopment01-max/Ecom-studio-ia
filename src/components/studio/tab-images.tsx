"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Wand2, ImagePlus } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, ROLE_LABEL, SectionTitle, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useCostConfirm } from "./cost-confirm";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { PlanRequired, useCreationLocked } from "../billing-client";
import { ImageV2Panel } from "./image-v2-panel";

/** Tri des images par statut, et encart « Supprimées » pour retrouver (et restaurer) une image supprimée. */
const STATUS_FILTERS = [
  ["", "Toutes", "All"],
  ["review", "À valider", "To review"],
  ["approved", "Validées", "Approved"],
  ["rejected", "Écartées", "Rejected"],
  ["trash", "Supprimées", "Deleted"],
] as const;

function useImageList(projectId: string, roles: string) {
  const [status, setStatus] = useState("");
  const q = status === "trash" ? "&trash=1" : `&latest=1${status ? `&status=${status}` : ""}`;
  const { data, reload } = useApi<{ assets: AssetView[] }>(`/api/projects/${projectId}/files?role=${roles}${q}`);
  return { list: data, reload, status, setStatus };
}

function StatusChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  return (
    <div className="scrollbar-none -mt-2 mb-5 flex gap-1.5 overflow-x-auto" role="radiogroup" aria-label={t("Trier par statut", "Filter by status")}>
      {STATUS_FILTERS.map(([v, fr, en]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cx("shrink-0 rounded-full border px-3 py-1 text-xs", value === v ? "border-signal bg-signal-soft font-medium" : "border-line bg-card text-muted hover:text-ink")}>
          {t(fr, en)}
        </button>
      ))}
    </div>
  );
}

function TrashGrid({ assets, onRestored }: { assets: AssetView[]; onRestored: () => void }) {
  const t = useT();
  const toast = useToast();
  const restore = async (a: AssetView) => {
    try {
      await api(`/api/files/${a.id}`, { method: "PATCH", body: { restore: true } });
      toast("ok", t("Image restaurée.", "Image restored."));
      onRestored();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  if (!assets.length) return <Empty title={t("Aucune image supprimée", "No deleted images")} icon={<ImagePlus className="size-5" />}>{t("Les images que vous supprimez arrivent ici : vous pouvez les restaurer à tout moment.", "Images you delete land here: you can restore them at any time.")}</Empty>;
  return (
    <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
      {assets.map((a) => (
        <div key={a.id} className="mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card">
          <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full opacity-70" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-xs">{ROLE_LABEL[a.role ?? ""] ?? a.name}</span>
            <Button size="sm" variant="secondary" onClick={() => restore(a)}>{t("Restaurer", "Restore")}</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

const GROUPS = [
  { id: "all", label: "Tout", en: "All", roles: "packshot,packshot-v2,detail,scene,lifestyle,ambiance,banner,social,post-photo,ad,cutout" },
  { id: "packshot", label: "Packshots", en: "Packshots", roles: "packshot,packshot-v2" },
  { id: "detail", label: "Détails", en: "Details", roles: "detail" },
  { id: "scene", label: "Scènes", en: "Scenes", roles: "scene" },
  { id: "lifestyle", label: "En situation", en: "Lifestyle", roles: "lifestyle" },
  { id: "ambiance", label: "Univers (libres de droits)", en: "World (royalty-free)", roles: "ambiance" },
  { id: "banner", label: "Bannières", en: "Banners", roles: "banner" },
  { id: "social", label: "Réseaux", en: "Social", roles: "social,post-photo" },
  { id: "ad", label: "Publicités", en: "Ads", roles: "ad" },
  { id: "cutout", label: "Détourages", en: "Cutouts", roles: "cutout,original" },
];

/** Entreprise de services : pas de packshot ni de détourage — photos de l'activité, ambiances, visuels typographiques. */
const SERVICE_GROUPS = [
  { id: "all", label: "Tout", en: "All", roles: "lifestyle,scene,ambiance,banner,social,post-photo,ad" },
  { id: "photos", label: "Photos de l'activité", en: "Business photos", roles: "lifestyle,scene" },
  { id: "banner", label: "Bannières du site", en: "Website banners", roles: "banner" },
  { id: "social", label: "Réseaux", en: "Social", roles: "social,post-photo" },
  { id: "ad", label: "Publicités", en: "Ads", roles: "ad" },
];
const SERVICE_KINDS = [
  ["service", "Annonce d'une prestation", "Service announcement"],
  ["tips", "Conseil d'expert (carrousel)", "Expert tip (carousel)"],
  ["quote", "Citation de la marque", "Brand quote"],
  ["info", "Horaires, zone et contact", "Hours, area and contact"],
  ["booking", "Publicité « Prenez rendez-vous »", "\"Book now\" ad"],
  ["promo", "Offre du moment", "Current offer"],
  ["event", "Événement", "Event"],
  ["new", "Nouveauté", "What's new"],
  ["review", "Avis d'un client", "Customer review"],
  ["question", "Question à votre communauté", "Question for your community"],
  ["team", "Coulisses et équipe", "Behind the scenes and team"],
  ["closing", "Horaires exceptionnels / fermeture", "Special hours / closure"],
  ["banner", "Bannière du site (sans texte)", "Website banner (no text)"],
] as const;

/** Libellés et exemples des champs de texte pour les autres publications (le texte vient du client). */
const POST_FIELDS: Record<string, { head: [string, string]; headPh: [string, string]; sub: [string, string]; subPh: [string, string] }> = {
  promo: { head: ["Votre offre", "Your offer"], headPh: ["-20 % sur les sessions du jeudi", "20% off Thursday sessions"], sub: ["Conditions (facultatif)", "Terms (optional)"], subPh: ["Jusqu'au 30 novembre, sur réservation", "Until 30 November, booking required"] },
  event: { head: ["L'événement", "The event"], headPh: ["Soirée Halloween le 31 octobre", "Halloween night on 31 October"], sub: ["Détails (facultatif)", "Details (optional)"], subPh: ["Dès 19 h · places limitées", "From 7pm · limited places"] },
  new: { head: ["La nouveauté", "What's new"], headPh: ["Une nouvelle salle : Le dernier métro", "A new room: The last metro"], sub: ["En une ligne (facultatif)", "In one line (optional)"], subPh: ["Disponible dès ce week-end", "Available from this weekend"] },
  review: { head: ["Texte de l'avis (un vrai avis reçu)", "Review text (a real review you received)"], headPh: ["Une soirée géniale, on revient vite !", "A brilliant evening, we'll be back soon!"], sub: ["Prénom du client (facultatif)", "Customer's first name (optional)"], subPh: ["Julie", "Julie"] },
  question: { head: ["Votre question", "Your question"], headPh: ["Quelle salle voulez-vous tester en premier ?", "Which room do you want to try first?"], sub: ["Précision (facultatif)", "Detail (optional)"], subPh: ["Répondez en commentaire", "Answer in the comments"] },
  team: { head: ["Ce que montre la photo", "What the photo shows"], headPh: ["L'équipe prépare la nouvelle salle", "The team is preparing the new room"], sub: ["En une ligne (facultatif)", "In one line (optional)"], subPh: ["Bientôt ouverte", "Opening soon"] },
  closing: { head: ["Horaires ou fermeture", "Hours or closure"], headPh: ["Fermé le 1er novembre", "Closed on 1 November"], sub: ["Précision (facultatif)", "Detail (optional)"], subPh: ["Réouverture le 2 à 14 h", "Reopening on the 2nd at 2pm"] },
};
const SERVICE_FORMATS: Record<string, string[]> = {
  service: ["portrait", "square", "story", "landscape"],
  tips: ["square"],
  quote: ["square", "portrait", "story"],
  info: ["portrait", "square", "story"],
  booking: ["story", "square", "portrait", "landscape"],
  banner: ["banner", "landscape"],
  promo: ["portrait", "square", "story", "landscape"],
  event: ["portrait", "square", "story", "landscape"],
  new: ["portrait", "square", "story"],
  review: ["square", "portrait", "story"],
  question: ["square", "portrait", "story"],
  team: ["portrait", "square", "story"],
  closing: ["square", "portrait", "story"],
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

/**
 * Suit une création lancée depuis l'écran jusqu'à sa fin, puis recharge la liste : avec le moteur local, un visuel est
 * prêt en 1 à 2 s, souvent avant le prochain rafraîchissement du projet (15 s) — sans ce suivi, rien n'apparaissait.
 * Un échec est affiché tout de suite avec sa raison (plus de « en préparation » sans suite).
 */
function useFollowJob(onDone: () => unknown) {
  const { reload: reloadProject } = useProject();
  const toast = useToast();
  const t = useT();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  return useCallback(
    (jobId: string | undefined, okMessage: string) => {
      reloadProject().catch(() => {});
      if (!jobId) return;
      const started = Date.now();
      const tick = async () => {
        try {
          const { job } = await api<{ job: { status: string; error: string | null } }>(`/api/jobs/${jobId}`);
          if (job.status === "done") {
            await done.current();
            reloadProject().catch(() => {});
            toast("ok", okMessage);
            return;
          }
          if (job.status === "failed" || job.status === "cancelled" || job.status === "blocked") {
            reloadProject().catch(() => {});
            if (job.status === "failed") toast("bad", job.error || t("La création a échoué.", "Creation failed."));
            return;
          }
        } catch {}
        if (Date.now() - started < 20 * 60_000) timers.current.push(setTimeout(tick, Date.now() - started < 60_000 ? 1500 : 5000));
      };
      timers.current.push(setTimeout(tick, 800));
    },
    [reloadProject, toast, t],
  );
}

function ProductImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [form, setForm] = useState({ kind: "scene", style: "window", format: "product", layout: "editorial", headline: "", subline: "", cta: "" });
  const active = useActive(["images.generate", "image.single", "canva."]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const { list, reload, status: statusF, setStatus: setStatusF } = useImageList(id, GROUPS.find((g) => g.id === group)!.roles);
  const follow = useFollowJob(reload);
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
        setForm((f) => ({ ...f, kind: ["packshot", "scene", "banner"].includes(kind) ? kind : "scene" }));
        sessionStorage.removeItem(`es-insert-images-${id}`);
        toast("info", t("Type d'image choisi d'après le prompt : vérifiez les options et lancez la création.", "Image type chosen from the prompt: check the options and start creating."));
      }
    } catch {}
  }, [id, toast, t]);
  const create = async (mode: "set" | "single") => {
    if (mode === "set" && data?.ai.image && !(await cost.confirm("images"))) return;
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images`, { body: { mode, ...form, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined }, lang: cl.lang });
      toast("ok", mode === "set" ? t("Jeu d'images complet en préparation.", "Full image set in progress.") : t("Image en préparation.", "Image in progress."));
      follow(r?.jobId, mode === "set" ? t("Jeu d'images prêt : à valider ci-dessous.", "Image set ready: review it below.") : t("Image prête : à valider ci-dessous.", "Image ready: review it below."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const textual = false;
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      <EngineNotice what={t("les décors (studio, podium, arche, lumière de fenêtre…)", "the backdrops (studio, podium, arch, window light…)")} />
      <PeopleConsent />
      <ImageV2Panel />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">{t("Mise en page du studio", "Studio layouts")}</h2>
          <p className="mt-1 text-xs text-muted">{t("Packshots, mises en scène et bannières rendus sans IA à partir des pixels réels du produit (gratuit). Les visuels avec texte se créent dans Publicités (éditeur à calques) et Publications.", "Packshots, staged scenes and banners rendered without AI from the product's real pixels (free). Visuals with text are created in Ads (layered editor) and Posts.")}</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label={t("Type", "Type")} htmlFor="ikind">
              <Select id="ikind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: e.target.value === "packshot" ? "packshot" : e.target.value === "banner" ? "banner" : e.target.value === "scene" ? "product" : "portrait" })}>
                <option value="packshot">Packshot</option>
                <option value="scene">{t("Scène", "Scene")}</option>
                <option value="banner">{t("Bannière de boutique", "Store banner")}</option>
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
            <ContentLangPicker {...cl} />
            <Button onClick={() => create("single")} disabled={locked} icon={<Wand2 className="size-4" />}>{t("Créer l'image", "Create image")}</Button>
            <Button variant="secondary" disabled={locked} className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>{t("Jeu complet (packshots, détails, scènes, bannières, photos libres et photos en situation contrôlées)", "Full set (packshots, details, scenes, banners, royalty-free photos and checked lifestyle photos)")}</Button>
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
          <StatusChips value={statusF} onChange={setStatusF} />
          {statusF === "trash" ? (
            <TrashGrid assets={list?.assets ?? []} onRestored={reload} />
          ) : list && list.assets.length === 0 ? (
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
  const [form, setForm] = useState({ kind: "service", format: "portrait", headline: "", subline: "", cta: "", serviceIndex: 0, tips: "", background: "" as "" | "photo" | "image" | "none", photoId: "" });
  const active = useActive(["images.generate", "image.single", "canva."]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const roles = SERVICE_GROUPS.find((g) => g.id === group)!.roles;
  const { list, reload, status: statusF, setStatus: setStatusF } = useImageList(id, roles);
  const follow = useFollowJob(reload);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const services = (data?.services?.services ?? []).filter((s) => s.name?.trim());
  // Toutes les images du projet utilisables comme photo d'un visuel (vos photos, photos libres, ambiances, recadrages).
  const { data: pool } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=lifestyle,original,scene,post-photo,ambiance`);
  const choices = (pool?.assets ?? []).filter((a) => a.kind === "image" && a.status !== "rejected");
  const photos = Math.max(choices.length, (data?.counts?.lifestyle ?? 0) + (data?.counts?.original ?? 0));
  const aiImage = !!data?.ai.image;
  const FORMAT_LABEL: Record<string, [string, string]> = { portrait: ["4:5 · Instagram, Facebook", "4:5 · Instagram, Facebook"], square: ["1:1 · fil d'actualité", "1:1 · news feed"], story: ["9:16 · story, reel", "9:16 · story, reel"], landscape: ["16:9 · site, YouTube, LinkedIn", "16:9 · website, YouTube, LinkedIn"], banner: ["2:1 · bannière du site", "2:1 · website banner"] };
  const photoAllowed = true;
  // Fond du visuel : une photo de l'activité, une nouvelle image (photo libre du métier, sinon créée par l'IA) ou aucune.
  const background = form.background || (photos > 0 ? "photo" : "image");
  const create = async (mode: "set" | "single") => {
    if (mode === "set" && aiImage && !(await cost.confirm("images"))) return;
    // Nouvelle image : l'IA peut la créer si aucune photo libre ne convient (budget IA du projet).
    if (mode === "single" && photoAllowed && background === "image" && aiImage && !(await cost.confirm("image"))) return;
    try {
      const body = mode === "set"
        ? { mode, useAi: aiImage }
        : { mode, kind: form.kind, format: form.format, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined, serviceIndex: form.serviceIndex, items: form.kind === "tips" ? form.tips.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4) : undefined, background: photoAllowed ? background : undefined, photoId: photoAllowed && background === "photo" && form.photoId ? form.photoId : undefined };
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images`, { body, lang: cl.lang });
      toast("ok", mode === "set" ? t("Jeu de visuels en préparation.", "Visual set in progress.") : t("Visuel en préparation.", "Visual in progress."));
      follow(r?.jobId, mode === "set" ? t("Jeu de visuels prêt : à valider ci-dessous.", "Visual set ready: review it below.") : t("Visuel prêt : à valider ci-dessous.", "Visual ready: review it below."));
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  };
  const withText = form.kind !== "banner";
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      <ImageV2Panel />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="h-max p-5 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-semibold">{t("Visuels du studio", "Studio visuals")}</h2>
          <p className="mt-1 text-xs text-muted">{photos ? t("Les visuels partent de vos photos (réalisations, équipe, lieu) et de votre offre réelle : aucun avis ni chiffre inventé.", "Visuals start from your photos (work, team, premises) and your real offer: no made-up reviews or figures.") : t("Sans photo, les visuels sont typographiques et graphiques, à vos couleurs. Ajoutez des photos de vos réalisations, de votre équipe ou de votre lieu dans Fichiers pour des visuels plus vivants.", "Without photos, visuals are typographic and graphic, in your colors. Add photos of your work, team or premises in Files for livelier visuals.")}</p>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3">
            <Field label={t("Type", "Type")} htmlFor="skind">
              <Select id="skind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: SERVICE_FORMATS[e.target.value][0] })}>
                {SERVICE_KINDS.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}
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
                {POST_FIELDS[form.kind] ? (
                  <>
                    <Field label={t(...POST_FIELDS[form.kind].head)} htmlFor="shead"><Textarea id="shead" rows={2} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={t(...POST_FIELDS[form.kind].headPh)} maxLength={180} /></Field>
                    <Field label={t(...POST_FIELDS[form.kind].sub)} htmlFor="ssub"><Input id="ssub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t(...POST_FIELDS[form.kind].subPh)} maxLength={120} /></Field>
                  </>
                ) : (
                <Field label={form.kind === "quote" ? t("Phrase à citer (votre engagement)", "Line to quote (your promise)") : form.kind === "tips" ? t("Titre de couverture", "Cover title") : t("Titre", "Headline")} htmlFor="shead"><Input id="shead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={form.kind === "booking" ? t("Prenez rendez-vous", "Book an appointment") : data?.brand?.tagline || t("Titre", "Headline")} /></Field>
                )}
                {["service", "booking"].includes(form.kind) && <Field label={t("Texte", "Text")} htmlFor="ssub"><Input id="ssub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t("Tiré de votre offre si vide", "Taken from your offer if empty")} /></Field>}
                {["service", "booking", "info", "promo", "event", "new"].includes(form.kind) && <Field label={t("Bouton", "Button")} htmlFor="scta"><Input id="scta" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder={t("Selon votre mode de contact", "Based on your contact method")} /></Field>}
              </>
            )}
            {photoAllowed && (
              <Field label={t("Image du visuel", "Visual image")} htmlFor="sbg">
                <Select id="sbg" value={background} onChange={(e) => setForm({ ...form, background: e.target.value as "photo" | "image" | "none" })}>
                  {photos > 0 && <option value="photo">{t("Une de mes images (à choisir)", "One of my images (pick it)")}</option>}
                  <option value="image">{aiImage ? t("Une nouvelle image (photo libre du métier ou créée par l'IA)", "A new image (royalty-free trade photo or AI-created)") : t("Une nouvelle image (photo libre du métier)", "A new image (royalty-free trade photo)")}</option>
                  <option value="none">{t("Sans image (typographique)", "No image (typographic)")}</option>
                </Select>
                {background === "photo" && choices.length > 0 && (
                  <div className="mt-2 grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label={t("Choisir l'image", "Choose the image")} data-testid="photo-picker">
                    {choices.map((a, i) => {
                      const on = form.photoId ? form.photoId === a.id : i === 0;
                      return (
                        <button key={a.id} type="button" role="radio" aria-checked={on} aria-label={a.name} onClick={() => setForm({ ...form, photoId: a.id })} className={cx("aspect-square overflow-hidden rounded-lg border-2", on ? "border-ink" : "border-transparent opacity-80 hover:opacity-100")}>
                          <img src={a.thumbUrl ?? a.url} alt="" loading="lazy" className="size-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </Field>
            )}
            <ContentLangPicker {...cl} />
            <Button onClick={() => create("single")} disabled={locked} icon={<Wand2 className="size-4" />}>{form.kind === "tips" ? t("Créer le carrousel", "Create the carousel") : t("Créer le visuel", "Create visual")}</Button>
            <Button variant="secondary" disabled={locked} className="h-auto! min-h-10 whitespace-normal! py-2 text-center leading-snug" onClick={() => create("set")} icon={<Sparkles className="size-4 shrink-0" />}>{t("Jeu complet (vos photos, photos libres du métier, images contrôlées par emplacement du site, bannières)", "Full set (your photos, royalty-free trade photos, checked images for each website slot, banners)")}</Button>
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
          <StatusChips value={statusF} onChange={setStatusF} />
          {statusF === "trash" ? (
            <TrashGrid assets={list?.assets ?? []} onRestored={reload} />
          ) : list && list.assets.length === 0 ? (
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

/**
 * Accord du client pour des personnes dans les visuels créés. Sans accord (ni photo du client montrant une personne),
 * le studio n'en ajoute aucune : une image, une vidéo ou une publicité qui en montre une est refusée.
 */
function PeopleConsent() {
  const { id, data, reload } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const on = data.settings.peopleAllowed === true;
  const change = async (v: boolean) => {
    setBusy(true);
    try {
      await api(`/api/projects/${id}`, { method: "PATCH", body: { settings: { peopleAllowed: v } } });
      toast("ok", v ? t("Personnes autorisées dans les visuels créés.", "People allowed in created visuals.") : t("Aucune personne dans les visuels créés.", "No people in created visuals."));
      await reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="p-4">
      <Toggle checked={on} onChange={change} disabled={busy} label={t("Autoriser des personnes dans les visuels créés (images, vidéos, publicités)", "Allow people in created visuals (images, videos, ads)")} />
      <p className="mt-2 text-xs text-muted">{on ? t("Le studio peut montrer des personnes quand la scène s'y prête.", "The studio may show people when the scene calls for it.") : t("Par défaut, aucune personne n'est ajoutée : un visuel qui en montre une est refusé. Vos propres photos avec des personnes restent utilisables.", "By default no person is added: a visual showing one is rejected. Your own photos with people remain usable.")}</p>
    </Card>
  );
}
