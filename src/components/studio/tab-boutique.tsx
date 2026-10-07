"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Crosshair, Maximize2, Minimize2, Palette, Download, Eye, EyeOff, ExternalLink, History, Image as ImageIcon, Laptop, Layers, Lock, MessageSquare, Monitor, Paperclip, RotateCcw, Send, Smartphone, Sparkles, Tablet, Unlock, Upload, X, Store, Loader2, Plus, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatDate, Modal, Select, Spinner, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { useCostConfirm } from "./cost-confirm";
import { ThemeImportModal } from "./theme-import";
import { AssetThumb, JobProgress, MediaPicker, useActive, type AssetView } from "./common";
import { ThemeGallery, ThemeGrid } from "./theme-gallery";
import { SectionLibrary, type LibraryItem } from "./section-library";
import { SortableList } from "./sortable";
import type { DirectionCard } from "@/lib/theme/directions";
import type { ImportReport } from "@/lib/theme/import";
import { useT } from "../i18n";
import { ContentLangPicker, useContentLang } from "./content-lang";
import { isPlatform, platformInfo, PlatformPill, PLATFORM_IDS, type PlatformId } from "./platform-picker";
import type { BusinessType } from "@/lib/project-types";
import { KeptSiteCard, ReproductionBanner, SiteReading } from "./existing-site";
import { useBilling } from "../billing-client";
import { CustomThemeButton, useCustomThemeStatus } from "./custom-theme";

const PREVIEW_SANDBOX = "allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals";

type TFn = <T>(fr: T, en: T) => T;

type ThemeData = {
  /** Attribut « sandbox » des aperçus, fourni par le serveur (Codespaces : avec l'origine). */
  sandbox?: string;
  current: null | {
    versionId: string;
    number: number;
    direction: string;
    language?: "fr" | "en";
    name: string;
    summary: string;
    fingerprint: string;
    structure: { template: string; sections: { id: string; type: string; name: string; disabled: boolean; locked: boolean; heading: string }[] }[];
    pages: { handle: string; title: string; template_suffix: string }[];
    product: { handle: string; title: string; price: number | null };
    motion?: { enabled: boolean; intensity: string; parallax: boolean };
    imported?: { name: string; report: ImportReport };
  };
  versions: { id: string; number: number; summary: string; author: string; created_at: number }[];
  messages: { id: string; role: string; content: string; attachments: string[]; selection: any; theme_version_id: string | null; job_id: string | null; created_at: number }[];
  directions: DirectionCard[];
  library: LibraryItem[];
};
type Selection = { template: string; section: string; block?: string; text?: string; tag?: string; type?: string; kind?: string; path?: string; role?: string; src?: string } | null;

/** Noms lisibles des sections, pour la désignation d'un élément dans l'aperçu. */
const SECTION_NAMES: Record<string, string> = {
  "announcement-bar": "Bandeau d'annonce", header: "En-tête", footer: "Pied de page", "hero-split": "Ouverture", "hero-fullbleed": "Ouverture", "hero-editorial": "Ouverture",
  "main-product": "Fiche produit", "featured-product": "Produit en avant", "featured-collection": "Collection", "collection-list": "Collections", "features-grid": "Points forts",
  "image-with-text": "Image et texte", "rich-text": "Texte", faq: "FAQ", newsletter: "Newsletter", marquee: "Texte défilant", "curved-marquee": "Texte défilant", stats: "Chiffres",
  "scroll-story": "Présentation animée", "video-showcase": "Vidéo", "video-reels": "Vidéos", "cta-banner": "Appel à l'action", "before-after": "Avant / après", "gallery-mosaic": "Galerie",
  "horizontal-gallery": "Galerie", "specs-list": "Caractéristiques", "stack-cards": "Cartes", "story-circles": "Stories", timeline: "Étapes", situations: "Situations",
  "product-reviews": "Avis", "product-recommendations": "Recommandations", "main-collection": "Page collection", "main-cart": "Panier", "contact-form": "Contact",
  "immersive-reviews": "Avis", "video-carousel": "Vidéos", "featured-blog": "Blog", countdown: "Compte à rebours", "alternating-content": "Contenus alternés",
};
const SECTION_NAMES_EN: Record<string, string> = {
  "announcement-bar": "Announcement bar", header: "Header", footer: "Footer", "hero-split": "Hero", "hero-fullbleed": "Hero", "hero-editorial": "Hero",
  "main-product": "Product page", "featured-product": "Featured product", "featured-collection": "Collection", "collection-list": "Collections", "features-grid": "Highlights",
  "image-with-text": "Image with text", "rich-text": "Text", faq: "FAQ", newsletter: "Newsletter", marquee: "Scrolling text", "curved-marquee": "Scrolling text", stats: "Key figures",
  "scroll-story": "Animated showcase", "video-showcase": "Video", "video-reels": "Videos", "cta-banner": "Call to action", "before-after": "Before / after", "gallery-mosaic": "Gallery",
  "horizontal-gallery": "Gallery", "specs-list": "Specifications", "stack-cards": "Cards", "story-circles": "Stories", timeline: "Steps", situations: "Use cases",
  "product-reviews": "Reviews", "product-recommendations": "Recommendations", "main-collection": "Collection page", "main-cart": "Cart", "contact-form": "Contact",
  "immersive-reviews": "Reviews", "video-carousel": "Videos", "featured-blog": "Blog", countdown: "Countdown", "alternating-content": "Alternating content",
};
const describeSelection = (s: NonNullable<Selection>, t: TFn) => {
  const where = t(SECTION_NAMES[s.type ?? ""], SECTION_NAMES_EN[s.type ?? ""]) ?? s.type ?? "Section";
  const what = s.kind && s.kind !== "Section" ? `${s.kind} · ` : "";
  const quoted = s.text ? `${s.text.replace(/\s+/g, " ").slice(0, 34)}${s.text.length > 34 ? "…" : ""}` : "";
  const text = s.text ? t(` « ${quoted} »`, ` “${quoted}”`) : "";
  return `${what}${where}${text}`;
};

const DESKTOP_W = 1280;
const DEVICES = { desktop: { w: "100%", icon: Monitor, label: "Ordinateur", en: "Desktop" }, tablet: { w: "820px", icon: Tablet, label: "Tablette", en: "Tablet" }, mobile: { w: "390px", icon: Smartphone, label: "Téléphone", en: "Phone" } } as const;

const SUGGESTIONS: [string, string][] = [
  ["Crée une ambiance plus haut de gamme pour cette boutique.", "Give this store a more premium feel."],
  ["Change le header : logo centré et menu en dessous.", "Change the header: centered logo with the menu below."],
  ["Mets la photo de détail dans la première section.", "Put the detail photo in the first section."],
  ["Ajoute une présentation animée du produit au défilement.", "Add an animated product showcase on scroll."],
  ["Ajoute des lots sur la fiche produit.", "Add bundles to the product page."],
  ["Ajoute la livraison estimée 2 à 4 jours.", "Add estimated delivery in 2 to 4 days."],
  ["Mets le prix dans le bouton d'ajout au panier.", "Show the price in the add-to-cart button."],
  ["Refais cette section dans un style plus élégant.", "Redo this section in a more elegant style."],
  ["Reviens à la version précédente.", "Go back to the previous version."],
];

/** Suggestions pour le site d'une entreprise de services (aucune notion de panier, de fiche produit ou de livraison). */
const SUGGESTIONS_SERVICES: [string, string][] = [
  ["Ajoute une section Tarifs avec mes prestations.", "Add a Pricing section with my services."],
  ["Mets le bouton de rendez-vous plus en avant.", "Make the booking button more prominent."],
  ["Ajoute mes horaires et une carte.", "Add my opening hours and a map."],
  ["Présente l'équipe avec des portraits ronds.", "Show the team with round portraits."],
  ["Ajoute une galerie avant / après de mes réalisations.", "Add a before / after gallery of my work."],
  ["Change le header : logo centré et menu en dessous.", "Change the header: centered logo with the menu below."],
  ["Refais cette section dans un style plus élégant.", "Redo this section in a more elegant style."],
  ["Reviens à la version précédente.", "Go back to the previous version."],
];

export default function TabBoutique() {
  const { id, data, reload: reloadProject } = useProject();
  const isServices = data?.business === "services";
  const toast = useToast();
  const t = useT();
  const { data: theme, reload } = useApi<ThemeData>(`/api/projects/${id}/theme`);
  // Les textes écrits dans la boutique suivent la langue du thème (sinon celle du projet), sauf choix contraire.
  const cl = useContentLang(undefined, theme?.current?.language);
  const cost = useCostConfirm();
  // Sans forfait (découverte gratuite) : aperçu filigrané « Aperçu », pas d'export ni de publication (bloqués aussi côté serveur).
  const { billing } = useBilling();
  const discovery = !!billing && !billing.plan;
  const chatJobs = useActive(["shop.chat", "shop.build", "shop.direction", "shopify.push", "theme.custom"]);
  // Thème entièrement sur mesure (Dominer) et sections sur mesure (Vendre, Dominer) : accès selon le forfait.
  const custom = useCustomThemeStatus(id);
  const [view, setView] = useState<"chat" | "preview" | "structure">("chat");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
  // Plein écran : l'aperçu couvre tout l'écran (même aperçu, sans rechargement), pour juger la mise en page.
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);
  // Sur téléphone, l'aperçu s'ouvre au format téléphone (lisible et désignable au doigt).
  useEffect(() => {
    if (window.innerWidth < 640) setDevice("mobile");
  }, []);
  const [page, setPage] = useState("/");
  const [picking, setPicking] = useState(false);
  const pickingRef = useRef(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<AssetView[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState<null | "upload" | "report">(null);
  const [libTarget, setLibTarget] = useState<{ template: string; index?: number; label: string } | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  // Lien direct « …/boutique?themes » (depuis le Pilote) : ouvre la galerie.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("themes")) setGalleryOpen(true);
  }, []);
  const [viewVersion, setViewVersion] = useState<string | null>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  // Mode « Ordinateur » : la page est rendue à 1280 px puis réduite, pour voir la vraie mise en page bureau.
  const frameBox = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  useEffect(() => {
    const el = frameBox.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth - (window.innerWidth >= 640 ? 32 : 0)));
    ro.observe(el);
    return () => ro.disconnect();
  });
  const desktopScale = device === "desktop" && boxW > 0 && boxW < DESKTOP_W ? boxW / DESKTOP_W : 1;
  const scrollY = useRef(0);
  const chatEnd = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const versionId = viewVersion ?? theme?.current?.versionId ?? null;
  const src = versionId ? `/preview/${id}/v/${versionId}${page === "/" ? "" : page}` : null;

  // Messages de l'aperçu (désignation, défilement, chargement).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      // Seulement l'aperçu affiché (cloisonné : origine opaque, on vérifie donc la fenêtre émettrice).
      if (!d || d.source !== "es-preview" || e.source !== iframe.current?.contentWindow) return;
      if (d.type === "selected") {
        setSelection(d.selection);
        setPicking(false);
        // Élément désigné : retour à la discussion pour écrire la demande.
        setFull(false);
        setView("chat");
      }
      if (d.type === "pick-cancel") setPicking(false);
      if (d.type === "ready" && pickingRef.current) iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "pick", on: true }, "*");
      if (d.type === "scroll") scrollY.current = d.y;
      if (d.type === "loaded") {
        iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "scroll", y: scrollY.current }, "*");
        if (pickingRef.current) iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "pick", on: true }, "*");
        const path = String(d.path).replace(/^\/preview\/[^/]+\/v\/[^/]+/, "") || "/";
        if (path !== page) setPage(path);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [page]);
  useEffect(() => {
    pickingRef.current = picking;
    iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "pick", on: picking }, "*");
  }, [picking]);
  // Nouvelle version → rechargement de l'aperçu en conservant la position.
  const lastVersion = useRef<string | null>(null);
  useEffect(() => {
    if (data?.theme?.versionId && data.theme.versionId !== lastVersion.current) {
      if (lastVersion.current) reload();
      lastVersion.current = data.theme.versionId;
    }
  }, [data?.theme?.versionId, reload]);
  const chatActive = chatJobs.find((j) => j.type === "shop.chat");
  const prevActive = useRef(0);
  useEffect(() => {
    if (prevActive.current && !chatJobs.length) reload();
    prevActive.current = chatJobs.length;
  }, [chatJobs.length, reload]);
  useEffect(() => {
    const box = chatEnd.current?.parentElement;
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
  }, [theme?.messages.length, chatActive?.id]);

  // Insertion d'un prompt de la bibliothèque.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem(`es-insert-boutique-${id}`);
      if (pending) {
        setMessage(pending);
        sessionStorage.removeItem(`es-insert-boutique-${id}`);
      }
    } catch {}
  }, [id]);

  // Image désignée + nouvelle image jointe : la demande « Remplace cette image par celle-ci » est préremplie.
  const addAttachments = (list: AssetView[]) => {
    setAttachments((cur) => [...cur, ...list]);
    if (selection?.kind === "Image" && list.length && !message.trim()) setMessage(t("Remplace cette image par celle-ci", "Replace this image with this one"));
  };

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? message).trim();
      if (!msg) return;
      setSending(true);
      try {
        await api(`/api/projects/${id}/theme/chat`, { body: { message: msg, selection, attachments: attachments.map((a) => a.id), page: pageTemplate(page, theme) }, lang: cl.lang });
        setMessage("");
        setAttachments([]);
        setSelection(null);
        reload();
        reloadProject();
      } catch (e) {
        toast("bad", (e as Error).message);
      } finally {
        setSending(false);
      }
    },
    [message, selection, attachments, id, page, theme, reload, reloadProject, toast, cl.lang],
  );

  async function ops(list: any[], summary: string) {
    try {
      await api(`/api/projects/${id}/theme/ops`, { body: { ops: list, summary } });
      reload();
      reloadProject();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  }

  /** « Générer » : l'IA crée une section sur mesure à l'endroit choisi ; le résultat arrive dans la discussion. */
  async function generateSection(description: string) {
    if (!libTarget) return;
    if (!(await cost.confirm("theme", { localOk: false }))) return;
    try {
      await api(`/api/projects/${id}/theme/chat`, { body: { message: description, page: libTarget.template, generate: { template: libTarget.template, index: libTarget.index } }, lang: cl.lang });
      toast("ok", t("Création de la section en cours : elle apparaîtra dans l'aperçu dans un instant (suivi dans la discussion).", "Creating the section: it will appear in the preview shortly (progress in the chat)."));
      setLibTarget(null);
      reload();
    } catch (e) {
      toast("bad", (e as Error).message);
    }
  }

  /** Clic sur une section de la structure : l'aperçu défile jusqu'à elle et la surligne. */
  const [focused, setFocused] = useState<string | null>(null);
  function focusSection(sectionId: string, hidden?: boolean) {
    setFocused(sectionId);
    if (hidden) return toast("info", t("Cette section est masquée : réaffichez-la (icône œil) pour la voir dans l'aperçu.", "This section is hidden: show it again (eye icon) to see it in the preview."));
    setView("preview");
    // Sur téléphone l'aperçu vient de s'afficher : on laisse le temps au cadre d'être visible.
    setTimeout(() => iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "focus", section: sectionId }, "*"), 60);
  }

  async function addSection(type: string) {
    if (!libTarget) return;
    setAdding(type);
    try {
      await api(`/api/projects/${id}/theme/sections`, { body: { type, template: libTarget.template, index: libTarget.index }, lang: cl.lang });
      toast("ok", t("Section ajoutée : retouchez-la en discutant ou désignez-la dans l'aperçu.", "Section added: refine it in the chat or select it in the preview."));
      setLibTarget(null);
      reload();
      reloadProject();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setAdding(null);
    }
  }

  if (!theme) return <div className="grid place-items-center py-24"><Spinner /></div>;
  // « J'ai déjà mon site et mon logo » : site en cours de lecture, conservé tel quel, ou reproduit.
  const site = data?.settings.existingSite;
  if (site && site.status !== "read" && !theme.current) return <div className="mx-auto max-w-3xl"><SiteReading site={site} /></div>;
  if (site?.status === "read" && site.decision === "keep" && !site.newSiteRequested && !theme.current) return <KeptSiteCard site={site} onChanged={reload} />;
  if (!theme.current)
    return (
      <div className="mx-auto max-w-3xl">
        {cost.dialog}
        {site?.status === "read" && site.decision === "reproduce" && <div className="mb-6"><ReproductionBanner site={site} /></div>}
        <ThemeImportModal open={!!importOpen} onClose={() => setImportOpen(null)} projectId={id} onImported={() => { reload(); reloadProject(); }} />
        {chatJobs[0] && <JobProgress job={chatJobs[0]} className="mb-6" />}
        <Empty title={isServices ? t("Le site n'est pas encore composé", "The website hasn't been built yet") : t("La boutique n'est pas encore composée", "The store hasn't been built yet")} icon={<Store className="size-5" />} action={<div className="flex flex-wrap items-center justify-center gap-2">{data?.brand && <><Button onClick={async () => { if (!(await cost.confirm("theme"))) return; await api(`/api/projects/${id}/theme/build`, { body: {}, lang: cl.lang }); reloadProject(); }}>{isServices ? t("Composer le site maintenant", "Build the website now") : t("Composer la boutique maintenant", "Build the store now")}</Button><ContentLangPicker {...cl} compact /></>}<Button variant="secondary" icon={<Upload className="size-4" />} onClick={() => setImportOpen("upload")}>{t("Importer mon thème Shopify", "Import my Shopify theme")}</Button></div>}>
          {data?.brand ? t("La marque est prête : vous pouvez lancer la composition.", "The brand is ready: you can start building the store.") : t("Elle sera créée après la marque et les textes (voir le Pilote).", "It will be created after the brand and the copy (see Pilot).")}
        </Empty>
        <h2 className="mb-1 mt-10 font-display text-2xl font-semibold">{t("Les thèmes disponibles", "Available themes")}</h2>
        <p className="mb-5 text-sm text-muted">{t("Le studio choisit une direction selon votre produit ; vous pourrez en changer à tout moment avec le bouton « Thèmes » de l'éditeur.", "The studio picks a direction based on your product; you can change it at any time with the editor's “Themes” button.")}</p>
        <ThemeGrid directions={theme.directions} />
      </div>
    );

  const cur = theme.current;
  const pages = [
    { path: "/", label: t("Accueil", "Home") },
    { path: `/products/${cur.product.handle}`, label: t("Fiche produit", "Product page") },
    { path: "/collections/all", label: t("Collection", "Collection") },
    { path: "/collections", label: t("Catalogue", "Catalog") },
    { path: "/cart", label: t("Panier", "Cart") },
    { path: "/search?q=", label: t("Recherche", "Search") },
    ...cur.pages.map((p) => ({ path: `/pages/${p.handle}`, label: p.title })),
    { path: "/404", label: t("Page 404", "404 page") },
  ];

  const Chat = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {site?.status === "read" && site.decision === "reproduce" && <ReproductionBanner site={site} />}
        {site?.status === "read" && site.decision === "keep" && (
          <div className="rounded-2xl border border-line bg-paper-2 p-3.5 text-[13px] text-ink-2">
            <p>{t(`Votre site actuel (${site.platformLabel}) reste tel quel : ce que vous modifiez ici est une version à part, publiée seulement si vous le décidez.`, `Your current website (${site.platformLabel}) stays as it is: what you edit here is a separate version, published only if you decide so.`)}</p>
            <a href={site.finalUrl ?? site.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-medium text-signal underline underline-offset-2"><ExternalLink className="size-3.5" aria-hidden /> {t("Ouvrir mon site", "Open my website")}</a>
          </div>
        )}
        {theme.messages.length === 0 && (
          <div className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
            <p className="font-medium text-ink">{t("Décrivez ce que vous voulez changer.", "Describe what you want to change.")}</p>
            <p className="mt-1">{t("Désignez un élément dans l'aperçu avec", "Select an element in the preview with")} <Crosshair className="inline size-3.5" /> {t("pour une retouche ciblée, joignez une image ou une capture. Pour changer une image : désignez-la, joignez la nouvelle et envoyez « Remplace cette image par celle-ci ». Chaque modification crée une version restaurable.", "for a targeted edit, or attach an image or screenshot. To change an image: select it, attach the new one and send “Replace this image with this one”. Every change creates a version you can restore.")}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(isServices ? SUGGESTIONS_SERVICES : SUGGESTIONS).map(([fr, en]) => { const s = t(fr, en); return <button key={fr} onClick={() => setMessage(s)} className="rounded-full border border-line bg-card px-3 py-1 text-left text-xs hover:border-ink">{s}</button>; })}
            </div>
          </div>
        )}
        {theme.messages.map((m) => (
          <div key={m.id} className={cx("max-w-[92%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-ink text-paper" : "bg-card border border-line")}>
            {m.selection && <p className={cx("mb-1.5 text-[11px]", m.role === "user" ? "text-paper/70" : "text-muted")}>↳ {describeSelection(m.selection, t)}</p>}
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            {m.attachments.length > 0 && <p className="mt-1.5 text-[11px] opacity-70">{t(`${m.attachments.length} pièce(s) jointe(s)`, `${m.attachments.length} attachment(s)`)}</p>}
            {m.theme_version_id && <button onClick={() => setViewVersion(m.theme_version_id)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-signal underline underline-offset-2">{t("Voir cette version", "View this version")}</button>}
          </div>
        ))}
        {chatActive && (
          <div className="flex max-w-[92%] items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-signal" /> {chatActive.message || t("Le studio travaille…", "The studio is working…")}
          </div>
        )}
        <div ref={chatEnd} />
      </div>
      <div className="border-t border-line p-3">
        {(selection || attachments.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {selection && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1 text-xs text-signal">
                <Crosshair className="size-3.5 shrink-0" /> <span className="min-w-0 truncate">{describeSelection(selection, t)}</span>
                <button onClick={() => { setSelection(null); iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "unpick" }, "*"); }} aria-label={t("Retirer la désignation", "Clear selection")}><X className="size-3.5" /></button>
              </span>
            )}
            {selection?.kind === "Image" && (
              <>
                <button onClick={() => setPickerOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-signal px-3 py-1 text-xs text-signal hover:bg-signal-soft">
                  <Paperclip className="size-3.5" /> {t("Remplacer par une image du projet", "Replace with a project image")}
                </button>
                <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-signal px-3 py-1 text-xs text-signal hover:bg-signal-soft">
                  <Upload className="size-3.5" /> {t("Importer la nouvelle image", "Upload the new image")}
                </button>
              </>
            )}
            {selection && selection.kind !== "Section" && (
              <button onClick={() => setSelection({ template: selection.template, section: selection.section, type: selection.type, kind: "Section" })} className="rounded-full border border-line px-3 py-1 text-xs hover:border-ink">
                {t("Toute la section", "Whole section")}
              </button>
            )}
            {attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-0.5 pl-0.5 pr-2 text-xs">
                <AssetThumb a={a} className="size-6 rounded-full" /> {a.name.slice(0, 18)}
                <button onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))} aria-label={t("Retirer", "Remove")}><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={(e) => (e.preventDefault(), send())} className="flex items-end gap-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => { setPicking(!picking); setView("preview"); }} className={cx("grid size-10 place-items-center rounded-full border", picking ? "border-signal bg-signal text-signal-ink" : "border-line bg-card hover:border-ink")} aria-pressed={picking} title={t("Désigner un élément dans l'aperçu", "Select an element in the preview")}><Crosshair className="size-4" /></button>
            <button type="button" onClick={() => setPickerOpen(true)} className="grid size-10 place-items-center rounded-full border border-line bg-card hover:border-ink" title={t("Joindre une image de la bibliothèque", "Attach an image from the library")}><Paperclip className="size-4" /></button>
            <button type="button" onClick={() => fileInput.current?.click()} className="grid size-10 place-items-center rounded-full border border-line bg-card hover:border-ink" title={t("Importer une image ou une capture", "Upload an image or screenshot")}><Upload className="size-4" /></button>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const fd = new FormData();
                Array.from(e.target.files ?? []).forEach((f) => fd.append("files", f));
                fd.append("role", "reference");
                try {
                  const r = await api<{ assets: AssetView[] }>(`/api/projects/${id}/files`, { form: fd });
                  addAttachments(r.assets);
                } catch (err) {
                  toast("bad", (err as Error).message);
                }
                e.target.value = "";
              }}
            />
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder={selection ? t("Que faut-il changer sur l'élément désigné ?", "What should change on the selected element?") : t("Ex. « Modifie uniquement ce bouton » …", "E.g. “Only change this button”…")}
            className="min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-ink"
            aria-label={t("Votre demande", "Your request")}
          />
          <Button type="submit" variant="signal" size="md" loading={sending} className="size-11 shrink-0 !px-0" aria-label={t("Envoyer", "Send")}><Send className="size-4" /></Button>
        </form>
        <ContentLangPicker {...cl} compact className="mt-2 text-xs" />
        {!data?.ai.llm && <p className="mt-2 text-[11px] text-muted">{t("IA non connectée : commandes simples uniquement (couleur des boutons, texte entre guillemets sur l'élément désigné, remplacer une image désignée par une image jointe, ajouter une FAQ, monter, supprimer, revenir en arrière, changer de direction).", "AI not connected: simple commands only (button color, quoted text on the selected element, replace a selected image with an attached one, add an FAQ, move up, delete, undo, change direction).")}</p>}
      </div>
    </div>
  );

  const Structure = (
    <div className="h-full overflow-y-auto p-4">
      <p className="mb-4 text-xs leading-relaxed text-muted">{t("Glissez les sections par la poignée pour les réordonner. Le « + » entre deux sections en ajoute une à cet endroit.", "Drag sections by their handle to reorder them. The “+” between two sections adds one at that spot.")}</p>
      {cur.structure.filter((tp) => ["group:header", pageTemplate(page, theme), "group:footer"].includes(tp.template)).map((tp) => {
        const isPage = !tp.template.startsWith("group:");
        const insert = (index: number) => setLibTarget({ template: tp.template, index, label: index === 0 ? t("En haut de la page", "At the top of the page") : t(`Après « ${tp.sections[index - 1]?.name ?? ""} »`, `After “${tp.sections[index - 1]?.name ?? ""}”`) });
        const pageLabel = pages.find((p) => pageTemplate(p.path, theme) === tp.template)?.label ?? tp.template;
        return (
          <div key={tp.template} className="mb-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{tp.template === "group:header" ? t("En-tête", "Header") : tp.template === "group:footer" ? t("Pied de page", "Footer") : t(`Page « ${pageLabel} »`, `“${pageLabel}” page`)}</p>
            <SortableList
              items={tp.sections}
              onMove={(from, to) => ops([{ op: "move_section", template: tp.template, section: tp.sections[from].id, position: { index: to } }], t(`${tp.sections[from].name} déplacée`, `${tp.sections[from].name} moved`))}
              render={(s, i, handle, dragging) => (
                <div>
                  <div className={cx("group flex items-center gap-1 rounded-xl border bg-card p-1.5 pr-1.5 text-sm", dragging ? "border-signal shadow-soft" : "border-line", s.disabled && "opacity-50")}>
                    {handle}
                    <button type="button" onClick={() => focusSection(s.id, s.disabled)} className={cx("min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left hover:bg-paper-2", focused === s.id && "bg-signal-soft/60")} title={t("Voir cette section dans l'aperçu", "Show this section in the preview")}>
                      <p className="truncate font-medium">{theme.library.find((l) => l.type === s.type)?.name ?? s.name}</p>
                      {s.heading && <p className="truncate text-xs text-muted">{s.heading}</p>}
                    </button>
                    <button onClick={() => ops([{ op: "move_section", template: tp.template, section: s.id, position: { index: Math.max(0, i - 1) } }], t(`${s.name} remontée`, `${s.name} moved up`))} disabled={i === 0} className="hidden size-7 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30 sm:group-hover:grid sm:group-focus-within:grid" aria-label={t("Monter", "Move up")}><ArrowUp className="size-3.5" /></button>
                    <button onClick={() => ops([{ op: "move_section", template: tp.template, section: s.id, position: { index: i + 1 } }], t(`${s.name} descendue`, `${s.name} moved down`))} disabled={i === tp.sections.length - 1} className="hidden size-7 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30 sm:group-hover:grid sm:group-focus-within:grid" aria-label={t("Descendre", "Move down")}><ArrowDown className="size-3.5" /></button>
                    <button onClick={() => ops([{ op: "toggle_section", template: tp.template, section: s.id, disabled: !s.disabled }], `${s.name} ${s.disabled ? t("affichée", "shown") : t("masquée", "hidden")}`)} className="grid size-7 place-items-center rounded-full hover:bg-paper-2" aria-label={s.disabled ? t("Afficher", "Show") : t("Masquer", "Hide")}>{s.disabled ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                    <button onClick={() => ops([{ op: "lock", template: tp.template, section: s.id, locked: !s.locked }], `${s.name} ${s.locked ? t("déverrouillée", "unlocked") : t("validée", "approved")}`)} className={cx("grid size-7 place-items-center rounded-full hover:bg-paper-2", s.locked && "text-ok")} aria-label={s.locked ? t("Déverrouiller", "Unlock") : t("Valider et verrouiller", "Approve and lock")} title={s.locked ? t("Validée : protégée des modifications non ciblées", "Approved: protected from non-targeted changes") : t("Valider cette section", "Approve this section")}>{s.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</button>
                    {isPage && <button onClick={() => { if (confirm(t(`Supprimer la section « ${s.name} » ? Vous pourrez revenir à la version précédente.`, `Delete the “${s.name}” section? You can go back to the previous version.`))) ops([{ op: "remove_section", template: tp.template, section: s.id }], t(`${s.name} supprimée`, `${s.name} deleted`)); }} className="grid size-7 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-bad" aria-label={t("Supprimer la section", "Delete section")}><Trash2 className="size-3.5" /></button>}
                  </div>
                  {isPage && !dragging && (
                    <button onClick={() => insert(i + 1)} className="group -my-1 flex h-4 w-full items-center gap-2 px-3 text-signal opacity-60 hover:opacity-100 focus-visible:opacity-100" aria-label={t(`Ajouter une section après « ${s.name} »`, `Add a section after “${s.name}”`)}>
                      <span className="h-px flex-1 bg-current opacity-30" /><Plus className="size-3.5" /><span className="h-px flex-1 bg-current opacity-30" />
                    </button>
                  )}
                </div>
              )}
            />
            {isPage && (
              <button onClick={() => setLibTarget({ template: tp.template, label: t("En bas de la page", "At the bottom of the page") })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-signal/50 bg-signal-soft/40 py-3 text-sm font-medium text-signal hover:border-signal">
                <Plus className="size-4" /> {t("Ajouter une section", "Add a section")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );

  const Preview = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-2.5">
        <div className="w-44 shrink-0">
          <Select value={pages.some((p) => p.path === page) ? page : "/"} onChange={(e) => setPage(e.target.value)} className="h-9 text-sm" aria-label={t("Page affichée", "Page shown")}>
            {pages.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
          </Select>
        </div>
        <div className="flex rounded-full border border-line bg-card p-0.5" role="group" aria-label={t("Appareil", "Device")}>
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => {
            const I = DEVICES[d].icon;
            return <button key={d} onClick={() => setDevice(d)} className={cx("grid h-8 w-9 place-items-center rounded-full", device === d && "bg-ink text-paper")} aria-pressed={device === d} title={t(DEVICES[d].label, DEVICES[d].en)}><I className="size-4" /></button>;
          })}
        </div>
        <button onClick={() => setFull(!full)} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs", full ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")} aria-pressed={full} title={full ? t("Quitter le plein écran (Échap)", "Exit full screen (Esc)") : t("Voir le thème en plein écran", "View the theme full screen")} data-preview-full>
          {full ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />} {full ? t("Quitter", "Exit") : t("Plein écran", "Full screen")}
        </button>
        <button onClick={() => setPicking(!picking)} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs", picking ? "border-signal bg-signal text-signal-ink" : "border-line bg-card")} aria-pressed={picking}><Crosshair className="size-3.5" /> {picking ? t("Cliquez un élément", "Click an element") : t("Désigner", "Select")}</button>
        {cur.motion && <AnimationsMenu motion={cur.motion} onReplay={() => iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "replay" }, "*")} onSet={(key, value, label) => ops([{ op: "set_global", key, value }], label)} />}
{!full && (
          <>
<button onClick={() => setLibTarget({ template: pageTemplate(page, theme), label: t("En bas de la page", "At the bottom of the page") })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs hover:border-ink"><Plus className="size-3.5" /> {t("Section", "Section")}</button>
                <button onClick={() => setGalleryOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-signal px-3.5 text-xs font-semibold text-signal-ink"><Palette className="size-3.5" /> {t("Thèmes", "Themes")}</button>
                <CustomThemeButton projectId={id} status={custom.data} reload={custom.reload} onDone={() => (reload(), reloadProject())} />
                <button onClick={() => setImportOpen("upload")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs hover:border-ink" title={t("Importer le thème de votre boutique Shopify", "Import your Shopify store theme")}><Upload className="size-3.5" /> {t("Importer mon thème", "Import my theme")}</button>
                {cur.imported && <button onClick={() => setImportOpen("report")} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-signal/40 bg-signal-soft px-3 text-xs text-signal" title={t("Analyse de votre thème importé", "Analysis of your imported theme")}><Layers className="size-3.5" /> {cur.imported.name} · {t("analyse", "analysis")}</button>}
          </>
        )}
        <div className={cx("ml-auto flex items-center gap-1.5", full && "hidden")}>
          <Badge tone={viewVersion ? "warn" : "neutral"}>v{theme.versions.find((v) => v.id === versionId)?.number ?? cur.number}{viewVersion ? t(" (consultation)", " (viewing)") : ""}</Badge>
          <button onClick={() => setHistoryOpen(true)} className="grid size-9 place-items-center rounded-full border border-line bg-card" title={t("Versions", "Versions")}><History className="size-4" /></button>
          {data && <PlatformPill projectId={id} platform={data.project.platform} business={data.business} onChanged={reloadProject} />}
          {discovery ? (
            <a href="/studio/compte#forfaits" className="plan-sparkle inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-signal px-3 text-xs font-semibold text-signal-ink"><Lock className="size-3.5" aria-hidden /> {t("Choisir un forfait pour publier", "Choose a plan to publish")}</a>
          ) : (
            <button onClick={() => setExportOpen(true)} className="grid size-9 place-items-center rounded-full border border-line bg-card" title={data && isPlatform(data.project.platform) ? t(`Exporter pour ${platformInfo(data.project.platform, data.business, t).short}`, `Export for ${platformInfo(data.project.platform, data.business, t).short}`) : t("Exporter", "Export")}><Download className="size-4" aria-hidden /><span className="sr-only">{t("Exporter et installer", "Export and install")}</span></button>
          )}
          {src && !discovery && <a href={src} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-line bg-card" title={t("Ouvrir dans un onglet", "Open in a new tab")}><ExternalLink className="size-4" /></a>}
        </div>
      </div>
      {viewVersion && (
        <div className="flex items-center justify-between gap-3 bg-warn-soft px-4 py-2 text-xs text-warn">
          <span>{t("Vous consultez une version précédente.", "You are viewing a previous version.")}</span>
          <span className="flex gap-2">
            <button className="underline" onClick={() => setViewVersion(null)}>{t("Revenir à la version actuelle", "Back to the current version")}</button>
            <button className="font-semibold underline" onClick={async () => { await api(`/api/projects/${id}/theme/restore`, { body: { versionId: viewVersion } }); setViewVersion(null); reload(); reloadProject(); toast("ok", t("Version restaurée (une nouvelle version a été créée).", "Version restored (a new version was created).")); }}>{t("Restaurer celle-ci", "Restore this one")}</button>
          </span>
        </div>
      )}
      <div ref={frameBox} className="relative flex-1 overflow-hidden bg-paper-2 p-0 sm:p-4">
        {/* L'aperçu n'est créé qu'une fois la largeur mesurée : sinon l'iframe est recréée (double chargement). */}
        {src && (device !== "desktop" || boxW !== 0) && (desktopScale < 1 ? (
          <div className="mx-auto overflow-hidden rounded-none bg-white shadow-soft sm:rounded-2xl" style={{ width: DESKTOP_W * desktopScale, height: "100%" }}>
            <iframe ref={iframe} key={versionId ?? ""} src={src} sandbox={theme.sandbox ?? PREVIEW_SANDBOX} title={isServices ? t("Aperçu du site", "Website preview") : t("Aperçu de la boutique", "Store preview")} className="block border-0 bg-white" style={{ width: DESKTOP_W, height: `${100 / desktopScale}%`, transform: `scale(${desktopScale})`, transformOrigin: "0 0" }} />
          </div>
        ) : (
          <iframe ref={iframe} key={versionId ?? ""} src={src} sandbox={theme.sandbox ?? PREVIEW_SANDBOX} title={isServices ? t("Aperçu du site", "Website preview") : t("Aperçu de la boutique", "Store preview")} className="mx-auto block h-full min-h-[70dvh] w-full rounded-none border-0 bg-white shadow-soft transition-[max-width] duration-500 sm:rounded-2xl" style={{ maxWidth: DEVICES[device].w }} />
        ))}
        {src && discovery && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
            <span className="-rotate-[30deg] select-none whitespace-nowrap font-display text-[clamp(3rem,12vw,9rem)] font-semibold uppercase tracking-[.2em] text-black/[.07] [text-shadow:0_0_1px_rgba(255,255,255,.4)]">{t("Aperçu", "Preview")}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {chatJobs.filter((j) => j.type !== "shop.chat").map((j) => <JobProgress key={j.id} job={j} className="m-4" />)}
      {/* Téléphone : bascule entre discussion, aperçu et structure */}
      <div className="flex gap-1 border-b border-line bg-paper p-2 lg:hidden" role="tablist">
        {[["chat", MessageSquare, t("Discussion", "Chat")], ["preview", Laptop, t("Aperçu", "Preview")], ["structure", Layers, t("Structure", "Structure")]].map(([k, I, l]: any) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm", view === k ? "bg-ink text-paper" : "text-ink-2")}><I className="size-4" /> {l}</button>
        ))}
      </div>
      <div className="grid h-[calc(100dvh-9.5rem)] grid-cols-1 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)_320px]">
        <section className={cx("min-h-0 border-r border-line bg-paper", view !== "chat" && "hidden lg:block")} aria-label={t("Discussion", "Chat")}>{Chat}</section>
        <section className={cx("min-h-0", full ? "fixed inset-0 z-[80] bg-paper" : view !== "preview" && "hidden lg:block")} aria-label={t("Aperçu", "Preview")} aria-modal={full || undefined} role={full ? "dialog" : undefined}>{Preview}</section>
        <section className={cx("min-h-0 border-l border-line bg-paper", view !== "structure" ? "hidden xl:block" : "")} aria-label={t("Structure", "Structure")}>{Structure}</section>
      </div>
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} multiple kinds={["image", "video", "logo"]} onPick={(a) => addAttachments(a)} />
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title={isServices ? t("Versions du site", "Website versions") : t("Versions de la boutique", "Store versions")}>
        <ul className="grid max-h-[60dvh] gap-2 overflow-y-auto">
          {theme.versions.map((v) => (
            <li key={v.id} className={cx("flex items-start gap-3 rounded-2xl border p-3 text-sm", v.id === cur.versionId ? "border-ink" : "border-line")}>
              <Badge tone={v.author === "ai" ? "info" : v.author === "user" ? "neutral" : "ink"}>v{v.number}</Badge>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2">{v.summary}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDate(v.created_at)} · {v.author === "ai" ? t("IA", "AI") : v.author === "user" ? t("vous", "you") : t("studio", "studio")}</p>
              </div>
              {v.id !== cur.versionId && (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" variant="secondary" onClick={() => (setViewVersion(v.id), setHistoryOpen(false), setView("preview"))}>{t("Voir", "View")}</Button>
                  <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={async () => { await api(`/api/projects/${id}/theme/restore`, { body: { versionId: v.id } }); setHistoryOpen(false); reload(); reloadProject(); toast("ok", t(`Version ${v.number} restaurée.`, `Version ${v.number} restored.`)); }}>{t("Restaurer", "Restore")}</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Modal>
      <ThemeImportModal open={!!importOpen} onClose={() => setImportOpen(null)} projectId={id} onImported={() => { reload(); reloadProject(); }} report={importOpen === "report" ? cur.imported?.report : null} />
      <SectionLibrary open={!!libTarget} onClose={() => setLibTarget(null)} items={theme.library} onPick={addSection} where={libTarget?.label ?? ""} busy={adding} projectId={id} versionId={theme.current.versionId} aiAvailable={!!data?.ai.llm} onGenerate={generateSection} generateLocked={!!custom.data && !custom.data.sectionsAllowed} sameOrigin={!!theme.sandbox?.includes("allow-same-origin")} />
      <ThemeGallery services={isServices} sandbox={theme.sandbox} open={galleryOpen} onClose={() => setGalleryOpen(false)} projectId={id} directions={theme.directions} current={cur.direction} canApply onApplied={() => (reload(), reloadProject())} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} projectId={id} versionId={versionId} fingerprint={cur.fingerprint} platform={data && isPlatform(data.project.platform) ? data.project.platform : "shopify"} business={data?.business ?? "products"} />
    </div>
  );
}

function pageTemplate(path: string, theme: ThemeData | null): string {
  if (path === "/" || path === "") return "index";
  if (path.startsWith("/products/")) return "product";
  if (path === "/collections") return "list-collections";
  if (path.startsWith("/collections/")) return "collection";
  if (path.startsWith("/cart")) return "cart";
  if (path.startsWith("/search")) return "search";
  const m = path.match(/^\/pages\/([^/?]+)/);
  if (m) {
    const pg = theme?.current?.pages.find((p) => p.handle === m[1]);
    return pg?.template_suffix ? `page.${pg.template_suffix}` : "page";
  }
  return "404";
}

function ExportModal({ open, onClose, projectId, versionId, fingerprint, platform, business }: { open: boolean; onClose: () => void; projectId: string; versionId: string | null; fingerprint: string; platform: PlatformId; business: BusinessType }) {
  const toast = useToast();
  const t = useT();
  const { reload } = useProject();
  const [others, setOthers] = useState(false);
  const { data: conns } = useApi<{ connections: { id: string; provider: string; name: string; linked: boolean }[]; publicUrl: boolean }>(open && platform === "shopify" ? `/api/connections?project=${projectId}` : null);
  const shop = conns?.connections.find((c) => c.provider === "shopify");
  const svc = business === "services";
  const q = versionId ? `&version=${versionId}` : "";
  // Fichier principal de chaque plateforme, plus le CSV des produits pour une boutique.
  const howTo: Record<PlatformId, string> = {
    shopify: t("Shopify › Boutique en ligne › Thèmes › Ajouter un thème › Importer le fichier ZIP.", "Shopify › Online Store › Themes › Add theme › Upload the ZIP file."),
    woocommerce: svc ? t("WordPress › Apparence › Thèmes › Ajouter › Téléverser le fichier ZIP, puis Activer. WooCommerce n'est pas nécessaire.", "WordPress › Appearance › Themes › Add New › Upload the ZIP file, then Activate. WooCommerce isn't needed.") : t("WordPress › Apparence › Thèmes › Ajouter › Téléverser le fichier ZIP, puis Activer (avec l'extension WooCommerce pour vendre).", "WordPress › Appearance › Themes › Add New › Upload the ZIP file, then Activate (with the WooCommerce plugin to sell)."),
    prestashop: t("PrestaShop › Apparence › Thème et logo › Ajouter un nouveau thème › Importer le fichier ZIP (le thème Classic doit être présent).", "PrestaShop › Design › Theme & Logo › Add new theme › Upload the ZIP file (the Classic theme must be installed)."),
    wix: t("Ouvrez le guide du kit : il indique, page par page, quoi reprendre dans l'éditeur Wix (médias, couleurs, polices, textes).", "Open the kit's guide: it lists, page by page, what to rebuild in the Wix editor (media, colors, fonts, text)."),
    squarespace: t("Ouvrez le guide du kit : il indique, page par page, quoi reprendre dans Squarespace (médias, couleurs, polices, textes).", "Open the kit's guide: it lists, page by page, what to rebuild in Squarespace (media, colors, fonts, text)."),
  };
  const csv = !svc && (platform === "shopify" || platform === "woocommerce") ? ([platform === "shopify" ? "shopify-csv" : "woocommerce-csv", platform === "shopify" ? t("Produits Shopify (CSV)", "Shopify products (CSV)") : t("Produits WooCommerce (CSV)", "WooCommerce products (CSV)"), platform === "shopify" ? t("Tous les produits de la boutique, au format d'import Shopify (Produits › Importer)", "All store products, in Shopify import format (Products › Import)") : t("Tous les produits, au format d'import WooCommerce (Produits › Importer)", "All products, in WooCommerce import format (Products › Import)")] as const) : null;
  const main = platformInfo(platform, business, t);
  const rest = PLATFORM_IDS.filter((x) => x !== platform);
  return (
    <Modal open={open} onClose={onClose} title={t("Exporter et installer", "Export and install")}>
      <p className="text-sm text-muted">{t("L'export contient exactement les fichiers affichés dans l'aperçu (empreinte", "The export contains exactly the files shown in the preview (fingerprint")} <code className="rounded bg-paper-2 px-1.5 text-xs">{fingerprint}</code>{t("). Une copie est rangée dans Fichiers › Boutique › Exports.", "). A copy is saved in Files › Store › Exports.")}</p>
      <div className="mt-4 rounded-2xl border-2 border-signal/50 bg-signal-soft/40 p-4">
        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{main.name} <Badge tone="signal">{t("Votre plateforme", "Your platform")}</Badge> <Badge tone={main.kind === "theme" ? "ok" : "warn"}>{main.kind === "theme" ? t("Thème installable", "Installable theme") : t("Kit de reprise", "Rebuild kit")}</Badge></p>
        <p className="mt-1 text-xs text-ink-2">{main.text}</p>
        <a href={`/api/projects/${projectId}/theme/export?platform=${platform}${q}`} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-paper">
          <Download className="size-4" aria-hidden /> {main.kind === "theme" ? t(`Télécharger le thème ${main.short}`, `Download the ${main.short} theme`) : t(`Télécharger le kit ${main.short}`, `Download the ${main.short} kit`)}
        </a>
        <p className="mt-2 text-xs text-muted">{howTo[platform]}</p>
        {csv && (
          <a href={`/api/projects/${projectId}/theme/export?platform=${csv[0]}${q}`} className="mt-3 flex items-center gap-3 rounded-2xl border border-line bg-card p-3 hover:border-ink">
            <Download className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0"><span className="block text-sm font-medium">{csv[1]}</span><span className="block text-xs text-muted">{csv[2]}</span></span>
          </a>
        )}
      </div>
      {platform === "shopify" && (
        <div className="mt-4 rounded-2xl bg-paper-2 p-4 text-sm">
          <p className="font-medium">{t("Installation directe dans Shopify", "Direct install to Shopify")}</p>
          {shop ? (
            <>
              <p className="mt-1 text-xs text-muted">{t("Boutique connectée :", "Connected store:")} {shop.name}. {t("Le thème est installé comme thème non publié ; la publication reste votre décision dans Shopify.", "The theme is installed as an unpublished theme; publishing remains your decision in Shopify.")}{!conns?.publicUrl && t(" L'installation du thème nécessite une adresse publique du studio : en local, importez le ZIP.", " Installing the theme requires a public studio address: when running locally, upload the ZIP.")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(svc ? [["pages", t("Pages", "Pages")], ["theme", t("Thème", "Theme")]] : [["product", t("Produits et collections", "Products and collections")], ["pages", t("Pages", "Pages")], ["theme", t("Thème", "Theme")]]).map(([p, l]) => (
                  <Button key={p} size="sm" variant="secondary" onClick={async () => { try { await api(`/api/projects/${projectId}/shopify`, { body: { parts: [p] } }); toast("ok", t(`Envoi « ${l} » lancé.`, `Sending “${l}” started.`)); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>{t("Envoyer :", "Send:")} {l}</Button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted">{svc ? t("Connectez votre compte Shopify dans l'espace Connexions pour installer directement le thème et les pages.", "Connect your Shopify account in the Connections tab to install the theme and pages directly.") : t("Connectez votre boutique dans l'espace Connexions pour installer directement le thème, le produit et les pages.", "Connect your store in the Connections tab to install the theme, product and pages directly.")}</p>
          )}
        </div>
      )}
      <div className="mt-4">
        <button onClick={() => setOthers(!others)} aria-expanded={others} className="text-sm font-medium text-ink-2 underline underline-offset-4">{others ? t("Masquer les autres plateformes", "Hide other platforms") : t("Exporter pour une autre plateforme", "Export for another platform")}</button>
        {others && (
          <ul className="mt-3 grid gap-2">
            {rest.map((k) => {
              const info = platformInfo(k, business, t);
              return (
                <li key={k}>
                  <a href={`/api/projects/${projectId}/theme/export?platform=${k}${q}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-ink">
                    <Download className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0"><span className="block text-sm font-medium">{info.name} · {info.kind === "theme" ? t("thème installable", "installable theme") : t("kit de reprise", "rebuild kit")}</span><span className="block text-xs text-muted">{info.text}</span></span>
                  </a>
                </li>
              );
            })}
            {!svc && !csv && (
              <li className="grid gap-2 sm:grid-cols-2">
                {[["shopify-csv", t("Produits Shopify (CSV)", "Shopify products (CSV)")], ["woocommerce-csv", t("Produits WooCommerce (CSV)", "WooCommerce products (CSV)")]].map(([k, l]) => (
                  <a key={k} href={`/api/projects/${projectId}/theme/export?platform=${k}${q}`} className="flex items-center gap-2 rounded-2xl border border-line p-3 text-sm hover:border-ink"><Download className="size-4 shrink-0" aria-hidden /> {l}</a>
                ))}
              </li>
            )}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/** Menu « Animations » : rejouer l'aperçu, activer ou non, intensité, parallaxe (réglages du thème, nouvelle version). */
function AnimationsMenu({ motion, onReplay, onSet }: { motion?: { enabled: boolean; intensity: string; parallax: boolean }; onReplay: () => void; onSet: (key: string, value: unknown, label: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const m = motion ?? { enabled: true, intensity: "normal", parallax: true };
  const chip = (on: boolean) => cx("rounded-full border px-2.5 py-1 text-xs", on ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink");
  return (
    <div ref={box} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs", open ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")}><Sparkles className="size-3.5" /> {t("Animations", "Animations")}</button>
      {open && (
        <div className="absolute left-0 top-11 z-30 grid w-72 gap-3 rounded-2xl border border-line bg-card p-4 text-sm shadow-soft">
          <Button size="sm" onClick={() => { onReplay(); setOpen(false); }} icon={<Sparkles className="size-3.5" />}>{t("Rejouer les animations", "Replay animations")}</Button>
          <p className="-mt-1 text-[11px] text-muted">{t("L'aperçu remonte et défile seul pour montrer chaque apparition.", "The preview scrolls back up and plays through on its own to show each reveal.")}</p>
          <div className="grid gap-1.5">
            <p className="text-xs font-semibold">{t("Animations au défilement", "Scroll animations")}</p>
            <div className="flex gap-1.5">
              <button className={chip(m.enabled)} onClick={() => !m.enabled && onSet("motion_enabled", true, t("Animations au défilement activées", "Scroll animations enabled"))}>{t("Activées", "On")}</button>
              <button className={chip(!m.enabled)} onClick={() => m.enabled && onSet("motion_enabled", false, t("Animations au défilement désactivées", "Scroll animations disabled"))}>{t("Désactivées", "Off")}</button>
            </div>
          </div>
          <div className={cx("grid gap-1.5", !m.enabled && "pointer-events-none opacity-50")}>
            <p className="text-xs font-semibold">{t("Intensité", "Intensity")}</p>
            <div className="flex flex-wrap gap-1.5">
              {([["subtle", t("Discrète", "Subtle")], ["normal", t("Normale", "Normal")], ["expressive", t("Expressive", "Expressive")]] as const).map(([v, l]) => (
                <button key={v} className={chip(m.intensity === v)} onClick={() => m.intensity !== v && onSet("motion_intensity", v, t(`Intensité des animations : ${l.toLowerCase()}`, `Animation intensity: ${l.toLowerCase()}`))}>{l}</button>
              ))}
            </div>
          </div>
          <div className={cx("grid gap-1.5", !m.enabled && "pointer-events-none opacity-50")}>
            <p className="text-xs font-semibold">{t("Effet de profondeur (parallaxe)", "Depth effect (parallax)")}</p>
            <div className="flex gap-1.5">
              <button className={chip(m.parallax)} onClick={() => !m.parallax && onSet("motion_parallax", true, t("Parallaxe activée", "Parallax enabled"))}>{t("Activé", "On")}</button>
              <button className={chip(!m.parallax)} onClick={() => m.parallax && onSet("motion_parallax", false, t("Parallaxe désactivée", "Parallax disabled"))}>{t("Désactivé", "Off")}</button>
            </div>
          </div>
          <p className="text-[11px] text-muted">{t("Chaque réglage crée une version restaurable. Les visiteurs qui ont demandé moins d'animations n'en voient jamais.", "Each setting creates a version you can restore. Visitors who asked for reduced motion never see animations.")}</p>
        </div>
      )}
    </div>
  );
}
