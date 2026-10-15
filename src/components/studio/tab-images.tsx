"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Sparkles, Wand2, ImagePlus, Plus, Search } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, Field, Input, Modal, Select, Textarea, Toggle, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, EngineNotice, JobProgress, ROLE_LABEL, SectionTitle, StatusBadge, useActive, type AssetView } from "./common";
import { AssetViewer } from "./asset-viewer";
import { useCostConfirm } from "./cost-confirm";
import { useLang, useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { formatEur, PlanRequired, useCreationLocked } from "../billing-client";
import { VisualChoice } from "./visual-choice";
import type { VisualMode } from "@/lib/social-v2/visual-mode";
import type { Lang } from "@/lib/i18n";
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

type Group = { id: string; label: string; en: string; roles: string };
type Quote = { ai: boolean; quote: { ai_image: number; ai_post: number } };

/** Prix lisible arrondi au centime supérieur (jamais « 0 € » pour une création payante). */
const priceOf = (eur: number, lang: "fr" | "en") => formatEur(Math.max(0.01, Math.ceil(eur * 100) / 100), lang);

/**
 * En-tête de l'onglet : le titre, le nombre de visuels et l'action principale « Faire un visuel ». Le jeu complet et
 * la recherche de photos restent accessibles, en second.
 */
function VisualsHeader({ count, onMake, onSet, onSearch, locked, sending, setHelp }: { count: number | null | undefined; onMake: () => void; onSet: () => void; onSearch: () => void; locked: boolean; sending: boolean; setHelp: string }) {
  const t = useT();
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" data-visuals-header>
      <div className="min-w-0">
        <h2 className="font-display text-2xl font-semibold">{t("Vos visuels", "Your visuals")}</h2>
        <p className="mt-1 text-sm text-muted">
          {count === undefined ? t("Cliquez sur un visuel pour le voir, le valider, le télécharger ou le modifier.", "Click a visual to view, approve, download or edit it.") : count === null ? t("Chargement…", "Loading…") : count === 0 ? t("Aucun visuel pour l'instant : faites le premier.", "No visuals yet: make the first one.") : t(`${count} visuel${count > 1 ? "s" : ""} prêt${count > 1 ? "s" : ""} : cliquez sur un visuel pour le voir, le valider, le télécharger ou le modifier.`, `${count} visual${count > 1 ? "s" : ""}: click a visual to view, approve, download or edit it.`)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
        <Button variant="ghost" onClick={onSearch} icon={<Search className="size-4" />} data-search-photos>{t("Chercher des photos", "Find photos")}</Button>
        <Button variant="secondary" disabled={locked || sending} onClick={onSet} icon={<Sparkles className="size-4" />} title={setHelp} data-full-set>{t("Jeu complet", "Full set")}</Button>
        <Button disabled={locked} onClick={onMake} icon={<Plus className="size-4" />} data-make-visual>{t("Faire un visuel", "Make a visual")}</Button>
      </div>
      {locked && <div className="sm:basis-full"><PlanRequired what="images" /></div>}
    </Card>
  );
}

/** Galerie des visuels déjà faits : catégories, statut, corbeille ; un clic ouvre le visuel. */
function VisualsGallery({ groups, group, setGroup, list, status, setStatus, reload, onOpen, onMake, locked, caption }: { groups: Group[]; group: string; setGroup: (g: string) => void; list: { assets: AssetView[] } | null | undefined; status: string; setStatus: (s: string) => void; reload: () => void; onOpen: (a: AssetView) => void; onMake: () => void; locked: boolean; caption: (a: AssetView) => string }) {
  const t = useT();
  return (
    <div data-visuals-gallery>
      <div className="scrollbar-none mb-5 flex gap-1.5 overflow-x-auto" role="tablist">
        {groups.map((g) => (
          <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => setGroup(g.id)} className={cx("shrink-0 rounded-full border px-3.5 py-1.5 text-sm", group === g.id ? "border-ink bg-ink text-paper" : "border-line bg-card")}>
            {t(g.label, g.en)}
          </button>
        ))}
      </div>
      <StatusChips value={status} onChange={setStatus} />
      {status === "trash" ? (
        <TrashGrid assets={list?.assets ?? []} onRestored={reload} />
      ) : list && list.assets.length === 0 ? (
        <Empty title={t("Aucun visuel dans cette catégorie", "No visuals in this category")} icon={<ImagePlus className="size-5" />} action={!locked && <Button onClick={onMake} icon={<Plus className="size-4" />}>{t("Faire un visuel", "Make a visual")}</Button>}>
          {t("Vos visuels apparaissent ici dès qu'ils sont prêts, rangés automatiquement dans vos fichiers.", "Your visuals appear here as soon as they're ready, automatically filed in your files.")}
        </Empty>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 xl:columns-4">
          {(list?.assets ?? []).map((a) => (
            <button key={a.id} onClick={() => onOpen(a)} className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="relative">
                <img src={a.thumbUrl ?? a.url} alt={a.name} className="w-full" loading="lazy" style={{ aspectRatio: a.width && a.height ? `${a.width}/${a.height}` : undefined }} />
                <span className="absolute left-2 top-2"><StatusBadge status={a.status} /></span>
                {a.meta?.aiGenerated && <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-medium text-paper">{t("IA", "AI")}</span>}
              </div>
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-xs">{caption(a)}</span>
                {a.meta?.format && <Badge className="shrink-0">{a.meta.format}</Badge>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Choix d'une de mes images (vignettes) ; « Aucune » possible quand l'image est facultative. */
function ImagePicker({ choices, value, onChange, optional }: { choices: AssetView[]; value: string; onChange: (id: string) => void; optional?: boolean }) {
  const t = useT();
  if (!choices.length) return <p className="rounded-2xl bg-paper-2 p-3 text-xs text-muted">{t("Aucune image dans vos fichiers pour l'instant : ajoutez vos photos dans l'onglet Fichiers.", "No images in your files yet: add your photos in the Files tab.")}</p>;
  return (
    <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-6" role="radiogroup" aria-label={t("Choisir l'image", "Choose the image")} data-testid="photo-picker">
      {optional && (
        <button type="button" role="radio" aria-checked={!value} onClick={() => onChange("")} className={cx("grid aspect-square place-items-center rounded-lg border-2 bg-paper-2 p-1 text-center text-[11px] text-muted", !value ? "border-ink" : "border-transparent")}>
          {t("Aucune", "None")}
        </button>
      )}
      {choices.map((a, i) => {
        const on = value ? value === a.id : !optional && i === 0;
        return (
          <button key={a.id} type="button" role="radio" aria-checked={on} aria-label={a.name} onClick={() => onChange(a.id)} className={cx("aspect-square overflow-hidden rounded-lg border-2", on ? "border-ink" : "border-transparent opacity-80 hover:opacity-100")}>
            <img src={a.thumbUrl ?? a.url} alt="" loading="lazy" className="size-full object-cover" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Fenêtre « Faire un visuel » : 1. comment le faire (gratuit / image par l'IA / tout par l'IA, prix affiché avant),
 * 2. réglages facultatifs, puis le prix rappelé à côté du bouton de création. Le devis n'est demandé qu'à l'ouverture.
 */
function MakeVisualDialog({ open, onClose, mode, setMode, help, onCreate, sending, createLabel, children }: { open: boolean; onClose: () => void; mode: VisualMode; setMode: (m: VisualMode) => void; help: Partial<Record<VisualMode, string>>; onCreate: (price: number | null) => void; sending: boolean; createLabel: string; children: ReactNode }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t("Faire un visuel", "Make a visual")} wide>
      <MakeVisualBody mode={mode} setMode={setMode} help={help} onCreate={onCreate} onClose={onClose} sending={sending} createLabel={createLabel}>{children}</MakeVisualBody>
    </Modal>
  );
}

function MakeVisualBody({ mode, setMode, help, onCreate, onClose, sending, createLabel, children }: { mode: VisualMode; setMode: (m: VisualMode) => void; help: Partial<Record<VisualMode, string>>; onCreate: (price: number | null) => void; onClose: () => void; sending: boolean; createLabel: string; children: ReactNode }) {
  const t = useT();
  const { lang } = useLang();
  const { id } = useProject();
  const { data: q } = useApi<Quote>(`/api/projects/${id}/images`);
  const ai = !!q?.ai;
  // Sans IA active, seul le gratuit reste possible.
  useEffect(() => {
    if (q && !q.ai && mode !== "free") setMode("free");
  }, [q, mode, setMode]);
  const price = mode === "free" || !q ? null : q.quote[mode];
  const prices = q ? { ai_image: t(`Payant · environ ${priceOf(q.quote.ai_image, lang)}`, `Paid · about ${priceOf(q.quote.ai_image, lang)}`), ai_post: t(`Payant · ${priceOf(q.quote.ai_post, lang)} au plus`, `Paid · ${priceOf(q.quote.ai_post, lang)} max`) } : undefined;
  return (
    <div className="grid gap-6" data-make-visual-dialog>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("Étape 1", "Step 1")}</p>
        <VisualChoice value={mode} onChange={setMode} ai={ai} name="images-visual" help={help} prices={prices} />
      </section>
      <section>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t("Étape 2 · Réglages (facultatifs)", "Step 2 · Settings (optional)")}</p>
        <div className="grid gap-3 sm:grid-cols-2">{children}</div>
      </section>
      <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between" data-visual-price>
        <p className="text-sm">
          {mode === "free" ? (
            <span className="font-medium text-ok">{t("Gratuit : aucun budget IA utilisé.", "Free: no AI budget used.")}</span>
          ) : price === null ? (
            t("Calcul du prix…", "Calculating the price…")
          ) : mode === "ai_post" ? (
            t(<>Coût maximal : <strong>{priceOf(price, lang)}</strong>, pris sur le budget IA du projet. Rien n'est lancé sans votre clic.</>, <>Maximum cost: <strong>{priceOf(price, lang)}</strong>, taken from the project's AI budget. Nothing starts without your click.</>)
          ) : (
            t(<>Coût estimé : environ <strong>{priceOf(price, lang)}</strong>, pris sur le budget IA du projet. Rien n'est lancé sans votre clic.</>, <>Estimated cost: about <strong>{priceOf(price, lang)}</strong>, taken from the project's AI budget. Nothing starts without your click.</>)
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>{t("Annuler", "Cancel")}</Button>
          <Button onClick={() => onCreate(price)} disabled={sending || (mode !== "free" && price === null)} loading={sending} icon={<Wand2 className="size-4" />} data-create-visual>
            {mode === "free" ? createLabel : t(`${createLabel} · ${price === null ? "…" : priceOf(price, lang)}`, `${createLabel} · ${price === null ? "…" : priceOf(price, lang)}`)}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Recherche de photos libres de droits (Image Engine V2), ouverte à la demande. */
function PhotoSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t("Chercher des photos", "Find photos")} xl>
      <ImageV2Panel />
    </Modal>
  );
}

/** Lance une création (visuel seul ou jeu complet), puis suit la tâche jusqu'à ce que le visuel soit dans la galerie. */
function useCreate(reload: () => unknown) {
  const { id } = useProject();
  const toast = useToast();
  const t = useT();
  const follow = useFollowJob(reload);
  const [sending, setSending] = useState(false);
  const send = async (body: Record<string, unknown>, lang: Lang, set: boolean) => {
    if (sending) return false;
    setSending(true);
    try {
      const r = await api<{ jobId?: string }>(`/api/projects/${id}/images`, { body, lang });
      toast("ok", set ? t("Jeu de visuels en préparation.", "Visual set in progress.") : t("Visuel en préparation : il apparaîtra dans la galerie.", "Visual in progress: it will appear in the gallery."));
      follow(r?.jobId, set ? t("Jeu de visuels prêt : à valider ci-dessous.", "Visual set ready: review it below.") : t("Visuel prêt : à valider ci-dessous.", "Visual ready: review it below."));
      return true;
    } catch (e) {
      toast("bad", (e as Error).message);
      return false;
    } finally {
      setSending(false);
    }
  };
  return { send, sending };
}

const PRODUCT_HELP = (t: ReturnType<typeof useT>): Partial<Record<VisualMode, string>> => ({
  free: t("Le studio compose l'image à partir des vraies photos de votre produit (packshot, mise en scène, bannière), sans IA.", "The studio composes the image from your product's real photos (packshot, staged scene, banner), without AI."),
  ai_image: t("L'IA crée une scène autour de votre vrai produit ; le studio la contrôle et la range dans vos visuels.", "AI creates a scene around your real product; the studio checks it and files it with your visuals."),
  ai_post: t("Scène, mise en page, titre et bouton créés ensemble par l'IA, avec votre vrai produit ; textes relus lettre par lettre.", "Scene, layout, headline and button created together by AI, with your real product; texts checked letter by letter."),
});
const SERVICE_HELP = (t: ReturnType<typeof useT>): Partial<Record<VisualMode, string>> => ({
  free: t("Une de vos images, une photo libre de droits du métier ou un visuel typographique ; le studio pose vos textes à vos couleurs.", "One of your images, a royalty-free trade photo or a typographic visual; the studio adds your texts in your colors."),
  ai_image: t("L'IA crée une nouvelle image de votre métier (sans personne inventée) ; le studio pose le titre, le texte et le bouton.", "AI creates a new image of your trade (no made-up people); the studio adds the headline, text and button."),
  ai_post: t("Image, mise en page, titre et bouton créés ensemble par l'IA, d'après votre activité ; textes relus lettre par lettre.", "Image, layout, headline and button created together by AI, from your business; texts checked letter by letter."),
});

function ProductImages() {
  const { id, data } = useProject();
  const toast = useToast();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [mode, setMode] = useState<VisualMode>("free");
  const [form, setForm] = useState({ kind: "scene", style: "window", format: "product", headline: "", subline: "", cta: "", photoId: "" });
  const active = useActive(["images.generate", "image.single", "image.ai_post", "image.v2", "canva."]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const { list, reload, status: statusF, setStatus: setStatusF } = useImageList(id, GROUPS.find((g) => g.id === group)!.roles);
  const { send, sending } = useCreate(reload);
  // Photos du produit utilisables (détourages, photos d'origine) : choisies pour le visuel ou comme référence de l'IA.
  const { data: pool } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=cutout,original`);
  const choices = (pool?.assets ?? []).filter((a) => a.kind === "image" && a.status !== "rejected");
  const cutouts = choices.filter((a) => a.role === "cutout");
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
        setOpen(true);
        sessionStorage.removeItem(`es-insert-images-${id}`);
        toast("info", t("Type d'image choisi d'après le prompt : vérifiez les options et lancez la création.", "Image type chosen from the prompt: check the options and start creating."));
      }
    } catch {}
  }, [id, toast, t]);
  // Image par l'IA : pas de packshot (rendu par le studio à partir de la photo).
  useEffect(() => {
    if (mode === "ai_image" && form.kind === "packshot") setForm((f) => ({ ...f, kind: "scene", format: "product" }));
  }, [mode, form.kind]);
  const createSet = async () => {
    if (data?.ai.image && !(await cost.confirm("images"))) return;
    await send({ mode: "set" }, cl.lang, true);
  };
  const create = async () => {
    if (mode !== "free" && !(await cost.confirm("image"))) return;
    const texts = { headline: form.headline.trim() || undefined, subline: form.subline.trim() || undefined, cta: form.cta.trim() || undefined };
    const body =
      mode === "ai_post"
        ? { mode: "single", visual: mode, kind: "scene", format: form.format, ...texts, photoId: form.photoId || undefined }
        : { mode: "single", visual: mode, kind: form.kind, style: form.kind === "packshot" ? undefined : form.style, format: form.format, sourceCutoutId: mode === "free" && form.photoId && cutouts.some((c) => c.id === form.photoId) ? form.photoId : undefined };
    if (await send(body, cl.lang, false)) setOpen(false);
  };
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      <EngineNotice what={t("les décors (studio, podium, arche, lumière de fenêtre…)", "the backdrops (studio, podium, arch, window light…)")} />
      <VisualsHeader count={statusF || group !== "all" ? undefined : list ? list.assets.length : null} onMake={() => setOpen(true)} onSet={createSet} onSearch={() => setSearch(true)} locked={locked} sending={sending} setHelp={t("Jeu complet : packshots, détails, scènes, bannières, photos libres et photos en situation contrôlées", "Full set: packshots, details, scenes, banners, royalty-free photos and checked lifestyle photos")} />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <VisualsGallery groups={GROUPS} group={group} setGroup={setGroup} list={list} status={statusF} setStatus={setStatusF} reload={reload} onOpen={setViewer} onMake={() => setOpen(true)} locked={locked} caption={(a) => ROLE_LABEL[a.role ?? ""] ?? a.name} />
      <MakeVisualDialog open={open} onClose={() => setOpen(false)} mode={mode} setMode={setMode} help={PRODUCT_HELP(t)} onCreate={create} sending={sending} createLabel={t("Créer l'image", "Create image")}>
        {mode !== "ai_post" && (
          <Field label={t("Type", "Type")} htmlFor="ikind">
            <Select id="ikind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: e.target.value === "packshot" ? "packshot" : e.target.value === "banner" ? "banner" : "product" })}>
              {mode === "free" && <option value="packshot">Packshot</option>}
              <option value="scene">{t("Scène", "Scene")}</option>
              <option value="banner">{t("Bannière de boutique", "Store banner")}</option>
            </Select>
          </Field>
        )}
        {mode === "free" && form.kind !== "packshot" && (
          <Field label={t("Mise en scène", "Setting")} htmlFor="istyle">
            <Select id="istyle" value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })}>{STYLES.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select>
          </Field>
        )}
        <Field label="Format" htmlFor="ifmt">
          <Select id="ifmt" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>{FORMATS.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}</Select>
        </Field>
        {mode === "ai_post" && (
          <>
            <Field label={t("Titre (facultatif)", "Headline (optional)")} htmlFor="ihead"><Input id="ihead" value={form.headline} maxLength={70} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={t("Laissé vide : l'IA l'écrit", "Left empty: AI writes it")} /></Field>
            <Field label={t("Petite ligne (facultatif)", "Small line (optional)")} htmlFor="isub"><Input id="isub" value={form.subline} maxLength={60} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={data?.product?.name || t("Nom du produit", "Product name")} /></Field>
            <Field label={t("Bouton (facultatif)", "Button (optional)")} htmlFor="icta"><Input id="icta" value={form.cta} maxLength={30} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder={cl.lang === "en" ? "Shop now" : "Commander"} /></Field>
          </>
        )}
        <div className="sm:col-span-2">
          <ContentLangPicker {...cl} />
        </div>
        {mode !== "ai_image" && (
          <div className="sm:col-span-2">
            <Field label={mode === "ai_post" ? t("Photo du produit donnée à l'IA (facultatif : la meilleure est prise sinon)", "Product photo given to the AI (optional: the best one is used otherwise)") : t("Une de mes images (facultatif : photo du produit à utiliser)", "One of my images (optional: product photo to use)")} htmlFor="ipick">
              <ImagePicker choices={mode === "ai_post" ? choices : cutouts} value={form.photoId} onChange={(v) => setForm({ ...form, photoId: v })} optional />
            </Field>
          </div>
        )}
        <div className="sm:col-span-2"><PeopleConsent /></div>
      </MakeVisualDialog>
      <PhotoSearchDialog open={search} onClose={() => setSearch(false)} />
      <AssetViewer asset={viewer} onClose={() => setViewer(null)} onChanged={reload} />
    </div>
  );
}

/** Studio Images d'une entreprise de services : la galerie des visuels faits, et « Faire un visuel » en trois façons. */
function ServiceImages() {
  const { id, data } = useProject();
  const t = useT();
  const cl = useContentLang();
  const [group, setGroup] = useState("all");
  const [viewer, setViewer] = useState<AssetView | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [mode, setMode] = useState<VisualMode>("free");
  const [form, setForm] = useState({ kind: "service", format: "portrait", headline: "", subline: "", cta: "", serviceIndex: 0, tips: "", background: "" as "" | "photo" | "image" | "none", photoId: "" });
  const active = useActive(["images.generate", "image.single", "image.ai_post", "image.v2", "canva."]);
  const cost = useCostConfirm();
  const locked = useCreationLocked();
  const roles = SERVICE_GROUPS.find((g) => g.id === group)!.roles;
  const { list, reload, status: statusF, setStatus: setStatusF } = useImageList(id, roles);
  const { send, sending } = useCreate(reload);
  useEffect(() => {
    if (!active.length) reload();
  }, [active.length, reload]);
  const services = (data?.services?.services ?? []).filter((s) => s.name?.trim());
  // Toutes les images du projet utilisables comme photo d'un visuel (vos photos, photos libres, ambiances, recadrages).
  const { data: pool } = useApi<{ assets: AssetView[] }>(`/api/projects/${id}/files?role=lifestyle,original,scene,post-photo,ambiance`);
  const choices = (pool?.assets ?? []).filter((a) => a.kind === "image" && a.status !== "rejected");
  const photos = Math.max(choices.length, (data?.counts?.lifestyle ?? 0) + (data?.counts?.original ?? 0));
  const FORMAT_LABEL: Record<string, [string, string]> = { portrait: ["4:5 · Instagram, Facebook", "4:5 · Instagram, Facebook"], square: ["1:1 · fil d'actualité", "1:1 · news feed"], story: ["9:16 · story, reel", "9:16 · story, reel"], landscape: ["16:9 · site, YouTube, LinkedIn", "16:9 · website, YouTube, LinkedIn"], banner: ["2:1 · bannière du site", "2:1 · website banner"] };
  // Image du visuel (gratuit) : une de mes images, une photo libre du métier, ou aucune (typographique).
  const background = form.background || (photos > 0 ? "photo" : "image");
  // Tout par l'IA : une image unique (pas de carrousel de conseils).
  const kinds = mode === "ai_post" ? SERVICE_KINDS.filter(([v]) => v !== "tips") : SERVICE_KINDS;
  useEffect(() => {
    if (mode === "ai_post" && form.kind === "tips") setForm((f) => ({ ...f, kind: "service", format: SERVICE_FORMATS.service[0] }));
  }, [mode, form.kind]);
  const createSet = async () => {
    if (data?.ai.image && !(await cost.confirm("images"))) return;
    await send({ mode: "set", useAi: !!data?.ai.image }, cl.lang, true);
  };
  const create = async () => {
    if (mode !== "free" && !(await cost.confirm("image"))) return;
    const base = { mode: "single", visual: mode, kind: form.kind, format: form.format, headline: form.headline || undefined, subline: form.subline || undefined, cta: form.cta || undefined, serviceIndex: form.serviceIndex };
    const body =
      mode === "free"
        ? { ...base, items: form.kind === "tips" ? form.tips.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4) : undefined, background, photoId: background === "photo" && form.photoId ? form.photoId : undefined }
        : mode === "ai_image"
          ? { ...base, items: form.kind === "tips" ? form.tips.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 4) : undefined, background: "image" }
          : { ...base, photoId: form.photoId || undefined };
    if (await send(body, cl.lang, false)) setOpen(false);
  };
  const withText = form.kind !== "banner";
  const caption = (a: AssetView) => (a.role === "lifestyle" ? (a.meta?.aiGenerated ? t("Ambiance (IA)", "Mood (AI)") : t("Photo de l'activité", "Business photo")) : a.role === "scene" ? t("Photo recadrée", "Cropped photo") : ROLE_LABEL[a.role ?? ""] ?? a.name);
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6">
      {cost.dialog}
      <VisualsHeader count={statusF || group !== "all" ? undefined : list ? list.assets.length : null} onMake={() => setOpen(true)} onSet={createSet} onSearch={() => setSearch(true)} locked={locked} sending={sending} setHelp={t("Jeu complet : vos photos, photos libres du métier, images contrôlées par emplacement du site, bannières", "Full set: your photos, royalty-free trade photos, checked images for each website slot, banners")} />
      {active.map((j) => <JobProgress key={j.id} job={j} />)}
      <VisualsGallery groups={SERVICE_GROUPS} group={group} setGroup={setGroup} list={list} status={statusF} setStatus={setStatusF} reload={reload} onOpen={setViewer} onMake={() => setOpen(true)} locked={locked} caption={caption} />
      <MakeVisualDialog open={open} onClose={() => setOpen(false)} mode={mode} setMode={setMode} help={SERVICE_HELP(t)} onCreate={create} sending={sending} createLabel={form.kind === "tips" ? t("Créer le carrousel", "Create the carousel") : t("Créer le visuel", "Create visual")}>
        <Field label={t("Type", "Type")} htmlFor="skind">
          <Select id="skind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value, format: SERVICE_FORMATS[e.target.value][0] })}>
            {kinds.map(([v, l, en]) => <option key={v} value={v}>{t(l, en)}</option>)}
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
        {form.kind === "service" && services.length === 0 && <p className="rounded-2xl bg-paper-2 p-3 text-[11px] text-muted sm:col-span-2">{t("Aucune prestation saisie : le visuel présente l'activité. Ajoutez vos prestations dans l'onglet Activité.", "No services entered: the visual presents the business. Add your services in the Business tab.")}</p>}
        {form.kind === "tips" && (
          <div className="sm:col-span-2">
            <Field label={t("Vos conseils (un par ligne, « Titre : texte »)", "Your tips (one per line, \"Title: text\")")} htmlFor="stips">
              <Textarea id="stips" rows={4} value={form.tips} onChange={(e) => setForm({ ...form, tips: e.target.value })} placeholder={t("Aérer chaque jour : 10 minutes suffisent…", "Air the room daily: it makes a difference…")} />
              <span className="mt-1 block text-[11px] text-muted">{data?.ai.llm ? t("Laissez vide : l'IA propose 3 conseils généraux, sans chiffre ni promesse, à relire.", "Leave empty: AI suggests 3 general tips, with no figures or promises, for you to review.") : t("Laissez vide : le carrousel détaille vos prestations.", "Leave empty: the carousel details your services.")}</span>
            </Field>
          </div>
        )}
        {withText && (
          <>
            {POST_FIELDS[form.kind] ? (
              <>
                <Field label={t(...POST_FIELDS[form.kind].head)} htmlFor="shead"><Textarea id="shead" rows={2} value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={t(...POST_FIELDS[form.kind].headPh)} maxLength={mode === "ai_post" ? 70 : 180} /></Field>
                <Field label={t(...POST_FIELDS[form.kind].sub)} htmlFor="ssub"><Input id="ssub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t(...POST_FIELDS[form.kind].subPh)} maxLength={120} /></Field>
              </>
            ) : (
              <Field label={form.kind === "quote" ? t("Phrase à citer (votre engagement)", "Line to quote (your promise)") : form.kind === "tips" ? t("Titre de couverture", "Cover title") : t("Titre", "Headline")} htmlFor="shead"><Input id="shead" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} placeholder={mode === "ai_post" ? t("Laissé vide : l'IA l'écrit", "Left empty: AI writes it") : form.kind === "booking" ? t("Prenez rendez-vous", "Book an appointment") : data?.brand?.tagline || t("Titre", "Headline")} maxLength={mode === "ai_post" ? 70 : 120} /></Field>
            )}
            {["service", "booking"].includes(form.kind) && <Field label={t("Texte", "Text")} htmlFor="ssub"><Input id="ssub" value={form.subline} onChange={(e) => setForm({ ...form, subline: e.target.value })} placeholder={t("Tiré de votre offre si vide", "Taken from your offer if empty")} /></Field>}
            {["service", "booking", "info", "promo", "event", "new"].includes(form.kind) && <Field label={t("Bouton", "Button")} htmlFor="scta"><Input id="scta" value={form.cta} maxLength={40} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder={t("Selon votre mode de contact", "Based on your contact method")} /></Field>}
          </>
        )}
        <div className="sm:col-span-2">
          <ContentLangPicker {...cl} />
        </div>
        {mode === "free" && (
          <div className="sm:col-span-2">
            <Field label={t("Image du visuel", "Visual image")} htmlFor="sbg">
              <Select id="sbg" value={background} onChange={(e) => setForm({ ...form, background: e.target.value as "photo" | "image" | "none" })}>
                {photos > 0 && <option value="photo">{t("Une de mes images (à choisir)", "One of my images (pick it)")}</option>}
                <option value="image">{t("Une photo libre de droits du métier (gratuite)", "A royalty-free trade photo (free)")}</option>
                <option value="none">{t("Sans image (typographique)", "No image (typographic)")}</option>
              </Select>
            </Field>
            {background === "photo" && <div className="mt-2"><ImagePicker choices={choices} value={form.photoId} onChange={(v) => setForm({ ...form, photoId: v })} /></div>}
          </div>
        )}
        {mode === "ai_image" && <p className="rounded-2xl bg-paper-2 p-3 text-xs text-muted sm:col-span-2">{t("L'IA crée une nouvelle image de votre métier, contrôlée avant d'être utilisée ; le studio y pose vos textes. Vous pourrez les modifier ensuite.", "AI creates a new image of your trade, checked before use; the studio adds your texts on it. You can edit them afterwards.")}</p>}
        {mode === "ai_post" && (
          <div className="sm:col-span-2">
            <Field label={t("Partir d'une de mes images (facultatif)", "Start from one of my images (optional)")} htmlFor="spick">
              <ImagePicker choices={choices} value={form.photoId} onChange={(v) => setForm({ ...form, photoId: v })} optional />
            </Field>
          </div>
        )}
      </MakeVisualDialog>
      <PhotoSearchDialog open={search} onClose={() => setSearch(false)} />
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
