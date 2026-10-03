"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Crosshair, Palette, Download, Eye, EyeOff, ExternalLink, History, Image as ImageIcon, Laptop, Layers, Lock, MessageSquare, Monitor, Paperclip, RotateCcw, Send, Smartphone, Sparkles, Tablet, Unlock, Upload, X, Store, Loader2, Plus, Trash2 } from "lucide-react";
import { api, Badge, Button, Card, cx, Empty, formatDate, Modal, Select, Spinner, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { AssetThumb, JobProgress, MediaPicker, useActive, type AssetView } from "./common";
import { ThemeGallery, ThemeGrid } from "./theme-gallery";
import { SectionLibrary, type LibraryItem } from "./section-library";
import { SortableList } from "./sortable";
import type { DirectionCard } from "@/lib/theme/directions";

type ThemeData = {
  current: null | {
    versionId: string;
    number: number;
    direction: string;
    name: string;
    summary: string;
    fingerprint: string;
    structure: { template: string; sections: { id: string; type: string; name: string; disabled: boolean; locked: boolean; heading: string }[] }[];
    pages: { handle: string; title: string; template_suffix: string }[];
    product: { handle: string; title: string; price: number | null };
  };
  versions: { id: string; number: number; summary: string; author: string; created_at: number }[];
  messages: { id: string; role: string; content: string; attachments: string[]; selection: any; theme_version_id: string | null; job_id: string | null; created_at: number }[];
  directions: DirectionCard[];
  library: LibraryItem[];
};
type Selection = { template: string; section: string; block?: string; text?: string; tag?: string; type?: string; kind?: string } | null;

/** Noms lisibles des sections, pour la désignation d'un élément dans l'aperçu. */
const SECTION_NAMES: Record<string, string> = {
  "announcement-bar": "Bandeau d'annonce", header: "En-tête", footer: "Pied de page", "hero-split": "Ouverture", "hero-fullbleed": "Ouverture", "hero-editorial": "Ouverture",
  "main-product": "Fiche produit", "featured-product": "Produit en avant", "featured-collection": "Collection", "collection-list": "Collections", "features-grid": "Points forts",
  "image-with-text": "Image et texte", "rich-text": "Texte", faq: "FAQ", newsletter: "Newsletter", marquee: "Texte défilant", "curved-marquee": "Texte défilant", stats: "Chiffres",
  "scroll-story": "Présentation animée", "video-showcase": "Vidéo", "video-reels": "Vidéos", "cta-banner": "Appel à l'action", "before-after": "Avant / après", "gallery-mosaic": "Galerie",
  "horizontal-gallery": "Galerie", "specs-list": "Caractéristiques", "stack-cards": "Cartes", "story-circles": "Stories", timeline: "Étapes", situations: "Situations",
  "product-reviews": "Avis", "product-recommendations": "Recommandations", "main-collection": "Page collection", "main-cart": "Panier", "contact-form": "Contact",
};
const describeSelection = (s: NonNullable<Selection>) => {
  const where = SECTION_NAMES[s.type ?? ""] ?? s.type ?? "Section";
  const what = s.kind && s.kind !== "Section" ? `${s.kind} · ` : "";
  const text = s.text ? ` « ${s.text.replace(/\s+/g, " ").slice(0, 34)}${s.text.length > 34 ? "…" : ""} »` : "";
  return `${what}${where}${text}`;
};

const DESKTOP_W = 1280;
const DEVICES = { desktop: { w: "100%", icon: Monitor, label: "Ordinateur" }, tablet: { w: "820px", icon: Tablet, label: "Tablette" }, mobile: { w: "390px", icon: Smartphone, label: "Téléphone" } } as const;

const SUGGESTIONS = [
  "Crée une ambiance plus haut de gamme pour cette boutique.",
  "Change le header : logo centré et menu en dessous.",
  "Mets la photo de détail dans la première section.",
  "Ajoute une présentation animée du produit au défilement.",
  "Ajoute des lots sur la fiche produit.",
  "Ajoute la livraison estimée 2 à 4 jours.",
  "Mets le prix dans le bouton d'ajout au panier.",
  "Refais cette section dans un style plus élégant.",
  "Reviens à la version précédente.",
];

export default function TabBoutique() {
  const { id, data, reload: reloadProject } = useProject();
  const toast = useToast();
  const { data: theme, reload } = useApi<ThemeData>(`/api/projects/${id}/theme`);
  const chatJobs = useActive(["shop.chat", "shop.build", "shop.direction", "shopify.push"]);
  const [view, setView] = useState<"chat" | "preview" | "structure">("chat");
  const [device, setDevice] = useState<keyof typeof DEVICES>("desktop");
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
  const src = versionId ? `/preview/${id}/v/${versionId}${page === "/" ? "/" : page}` : null;

  // Messages de l'aperçu (désignation, défilement, chargement).
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "es-preview") return;
      if (d.type === "selected") {
        setSelection(d.selection);
        setPicking(false);
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

  const send = useCallback(
    async (text?: string) => {
      const msg = (text ?? message).trim();
      if (!msg) return;
      setSending(true);
      try {
        await api(`/api/projects/${id}/theme/chat`, { body: { message: msg, selection, attachments: attachments.map((a) => a.id), page: pageTemplate(page, theme) } });
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
    [message, selection, attachments, id, page, theme, reload, reloadProject, toast],
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

  async function addSection(type: string) {
    if (!libTarget) return;
    setAdding(type);
    try {
      await api(`/api/projects/${id}/theme/sections`, { body: { type, template: libTarget.template, index: libTarget.index } });
      toast("ok", "Section ajoutée : retouchez-la en discutant ou désignez-la dans l'aperçu.");
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
  if (!theme.current)
    return (
      <div className="mx-auto max-w-3xl">
        {chatJobs[0] && <JobProgress job={chatJobs[0]} className="mb-6" />}
        <Empty title="La boutique n'est pas encore composée" icon={<Store className="size-5" />} action={data?.brand ? <Button onClick={async () => { await api(`/api/projects/${id}/theme/build`, { body: {} }); reloadProject(); }}>Composer la boutique maintenant</Button> : undefined}>
          {data?.brand ? "La marque est prête : vous pouvez lancer la composition." : "Elle sera créée après la marque et les textes (voir le Pilote)."}
        </Empty>
        <h2 className="mb-1 mt-10 font-display text-2xl font-semibold">Les thèmes disponibles</h2>
        <p className="mb-5 text-sm text-muted">Le studio choisit une direction selon votre produit ; vous pourrez en changer à tout moment avec le bouton « Thèmes » de l'éditeur.</p>
        <ThemeGrid directions={theme.directions} />
      </div>
    );

  const cur = theme.current;
  const pages = [
    { path: "/", label: "Accueil" },
    { path: `/products/${cur.product.handle}`, label: "Fiche produit" },
    { path: "/collections/all", label: "Collection" },
    { path: "/collections", label: "Catalogue" },
    { path: "/cart", label: "Panier" },
    { path: "/search?q=", label: "Recherche" },
    ...cur.pages.map((p) => ({ path: `/pages/${p.handle}`, label: p.title })),
    { path: "/404", label: "Page 404" },
  ];

  const Chat = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {theme.messages.length === 0 && (
          <div className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-2">
            <p className="font-medium text-ink">Décrivez ce que vous voulez changer.</p>
            <p className="mt-1">Désignez un élément dans l'aperçu avec <Crosshair className="inline size-3.5" /> pour une retouche ciblée, joignez une image ou une capture. Chaque modification crée une version restaurable.</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => setMessage(s)} className="rounded-full border border-line bg-card px-3 py-1 text-left text-xs hover:border-ink">{s}</button>)}
            </div>
          </div>
        )}
        {theme.messages.map((m) => (
          <div key={m.id} className={cx("max-w-[92%] rounded-2xl px-4 py-3 text-sm", m.role === "user" ? "ml-auto bg-ink text-paper" : "bg-card border border-line")}>
            {m.selection && <p className={cx("mb-1.5 text-[11px]", m.role === "user" ? "text-paper/70" : "text-muted")}>↳ {describeSelection(m.selection)}</p>}
            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            {m.attachments.length > 0 && <p className="mt-1.5 text-[11px] opacity-70">{m.attachments.length} pièce(s) jointe(s)</p>}
            {m.theme_version_id && <button onClick={() => setViewVersion(m.theme_version_id)} className="mt-2 inline-flex items-center gap-1 text-[11px] text-signal underline underline-offset-2">Voir cette version</button>}
          </div>
        ))}
        {chatActive && (
          <div className="flex max-w-[92%] items-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 text-sm text-muted">
            <Loader2 className="size-4 animate-spin text-signal" /> {chatActive.message || "Le studio travaille…"}
          </div>
        )}
        <div ref={chatEnd} />
      </div>
      <div className="border-t border-line p-3">
        {(selection || attachments.length > 0) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {selection && (
              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-signal-soft px-3 py-1 text-xs text-signal">
                <Crosshair className="size-3.5 shrink-0" /> <span className="min-w-0 truncate">{describeSelection(selection)}</span>
                <button onClick={() => { setSelection(null); iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "unpick" }, "*"); }} aria-label="Retirer la désignation"><X className="size-3.5" /></button>
              </span>
            )}
            {selection && selection.kind !== "Section" && (
              <button onClick={() => setSelection({ template: selection.template, section: selection.section, type: selection.type, kind: "Section" })} className="rounded-full border border-line px-3 py-1 text-xs hover:border-ink">
                Toute la section
              </button>
            )}
            {attachments.map((a) => (
              <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card py-0.5 pl-0.5 pr-2 text-xs">
                <AssetThumb a={a} className="size-6 rounded-full" /> {a.name.slice(0, 18)}
                <button onClick={() => setAttachments(attachments.filter((x) => x.id !== a.id))} aria-label="Retirer"><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={(e) => (e.preventDefault(), send())} className="flex items-end gap-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => { setPicking(!picking); setView("preview"); }} className={cx("grid size-10 place-items-center rounded-full border", picking ? "border-signal bg-signal text-signal-ink" : "border-line bg-card hover:border-ink")} aria-pressed={picking} title="Désigner un élément dans l'aperçu"><Crosshair className="size-4" /></button>
            <button type="button" onClick={() => setPickerOpen(true)} className="grid size-10 place-items-center rounded-full border border-line bg-card hover:border-ink" title="Joindre une image de la bibliothèque"><Paperclip className="size-4" /></button>
            <button type="button" onClick={() => fileInput.current?.click()} className="grid size-10 place-items-center rounded-full border border-line bg-card hover:border-ink" title="Importer une image ou une capture"><Upload className="size-4" /></button>
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
                  setAttachments([...attachments, ...r.assets]);
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
            placeholder={selection ? "Que faut-il changer sur l'élément désigné ?" : "Ex. « Modifie uniquement ce bouton » …"}
            className="min-h-11 min-w-0 flex-1 resize-none rounded-2xl border border-line bg-card px-3 py-2.5 text-sm outline-none focus:border-ink"
            aria-label="Votre demande"
          />
          <Button type="submit" variant="signal" size="md" loading={sending} className="size-11 shrink-0 !px-0" aria-label="Envoyer"><Send className="size-4" /></Button>
        </form>
        {!data?.ai.llm && <p className="mt-2 text-[11px] text-muted">Moteur local : commandes simples uniquement (couleur des boutons, texte entre guillemets sur l'élément désigné, ajouter une FAQ, monter, supprimer, revenir en arrière, changer de direction).</p>}
      </div>
    </div>
  );

  const Structure = (
    <div className="h-full overflow-y-auto p-4">
      <p className="mb-4 text-xs leading-relaxed text-muted">Glissez les sections par la poignée pour les réordonner. Le « + » entre deux sections en ajoute une à cet endroit.</p>
      {cur.structure.filter((t) => ["group:header", pageTemplate(page, theme), "group:footer"].includes(t.template)).map((t) => {
        const isPage = !t.template.startsWith("group:");
        const insert = (index: number) => setLibTarget({ template: t.template, index, label: index === 0 ? "En haut de la page" : `Après « ${t.sections[index - 1]?.name ?? ""} »` });
        return (
          <div key={t.template} className="mb-5">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t.template === "group:header" ? "En-tête" : t.template === "group:footer" ? "Pied de page" : `Page « ${pages.find((p) => pageTemplate(p.path, theme) === t.template)?.label ?? t.template} »`}</p>
            <SortableList
              items={t.sections}
              onMove={(from, to) => ops([{ op: "move_section", template: t.template, section: t.sections[from].id, position: { index: to } }], `${t.sections[from].name} déplacée`)}
              render={(s, i, handle, dragging) => (
                <div>
                  <div className={cx("flex items-center gap-1.5 rounded-xl border bg-card p-1.5 pr-2 text-sm", dragging ? "border-signal shadow-soft" : "border-line", s.disabled && "opacity-50")}>
                    {handle}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{theme.library.find((l) => l.type === s.type)?.name ?? s.name}</p>
                      {s.heading && <p className="truncate text-xs text-muted">{s.heading}</p>}
                    </div>
                    <button onClick={() => ops([{ op: "move_section", template: t.template, section: s.id, position: { index: Math.max(0, i - 1) } }], `${s.name} remontée`)} disabled={i === 0} className="hidden size-7 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30 sm:grid" aria-label="Monter"><ArrowUp className="size-3.5" /></button>
                    <button onClick={() => ops([{ op: "move_section", template: t.template, section: s.id, position: { index: i + 1 } }], `${s.name} descendue`)} disabled={i === t.sections.length - 1} className="hidden size-7 place-items-center rounded-full hover:bg-paper-2 disabled:opacity-30 sm:grid" aria-label="Descendre"><ArrowDown className="size-3.5" /></button>
                    <button onClick={() => ops([{ op: "toggle_section", template: t.template, section: s.id, disabled: !s.disabled }], `${s.name} ${s.disabled ? "affichée" : "masquée"}`)} className="grid size-7 place-items-center rounded-full hover:bg-paper-2" aria-label={s.disabled ? "Afficher" : "Masquer"}>{s.disabled ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                    <button onClick={() => ops([{ op: "lock", template: t.template, section: s.id, locked: !s.locked }], `${s.name} ${s.locked ? "déverrouillée" : "validée"}`)} className={cx("grid size-7 place-items-center rounded-full hover:bg-paper-2", s.locked && "text-ok")} aria-label={s.locked ? "Déverrouiller" : "Valider et verrouiller"} title={s.locked ? "Validée : protégée des modifications non ciblées" : "Valider cette section"}>{s.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}</button>
                    {isPage && <button onClick={() => { if (confirm(`Supprimer la section « ${s.name} » ? Vous pourrez revenir à la version précédente.`)) ops([{ op: "remove_section", template: t.template, section: s.id }], `${s.name} supprimée`); }} className="grid size-7 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-bad" aria-label="Supprimer la section"><Trash2 className="size-3.5" /></button>}
                  </div>
                  {isPage && !dragging && (
                    <button onClick={() => insert(i + 1)} className="group -my-1 flex h-4 w-full items-center gap-2 px-3 text-signal opacity-60 hover:opacity-100 focus-visible:opacity-100" aria-label={`Ajouter une section après « ${s.name} »`}>
                      <span className="h-px flex-1 bg-current opacity-30" /><Plus className="size-3.5" /><span className="h-px flex-1 bg-current opacity-30" />
                    </button>
                  )}
                </div>
              )}
            />
            {isPage && (
              <button onClick={() => setLibTarget({ template: t.template, label: "En bas de la page" })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-signal/50 bg-signal-soft/40 py-3 text-sm font-medium text-signal hover:border-signal">
                <Plus className="size-4" /> Ajouter une section
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
        <Select value={pages.some((p) => p.path === page) ? page : "/"} onChange={(e) => setPage(e.target.value)} className="h-9 w-44 text-sm" aria-label="Page affichée">
          {pages.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
        </Select>
        <div className="flex rounded-full border border-line bg-card p-0.5" role="group" aria-label="Appareil">
          {(Object.keys(DEVICES) as (keyof typeof DEVICES)[]).map((d) => {
            const I = DEVICES[d].icon;
            return <button key={d} onClick={() => setDevice(d)} className={cx("grid h-8 w-9 place-items-center rounded-full", device === d && "bg-ink text-paper")} aria-pressed={device === d} title={DEVICES[d].label}><I className="size-4" /></button>;
          })}
        </div>
        <button onClick={() => setPicking(!picking)} className={cx("inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs", picking ? "border-signal bg-signal text-signal-ink" : "border-line bg-card")} aria-pressed={picking}><Crosshair className="size-3.5" /> {picking ? "Cliquez un élément" : "Désigner"}</button>
        <button onClick={() => iframe.current?.contentWindow?.postMessage({ source: "es-studio", type: "reveal-all" }, "*")} className="hidden h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs sm:inline-flex" title="Afficher tous les éléments animés"><Sparkles className="size-3.5" /> Animations</button>
<button onClick={() => setLibTarget({ template: pageTemplate(page, theme), label: "En bas de la page" })} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs hover:border-ink"><Plus className="size-3.5" /> Section</button>
                <button onClick={() => setGalleryOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-signal px-3.5 text-xs font-semibold text-signal-ink"><Palette className="size-3.5" /> Thèmes</button>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge tone={viewVersion ? "warn" : "neutral"}>v{theme.versions.find((v) => v.id === versionId)?.number ?? cur.number}{viewVersion ? " (consultation)" : ""}</Badge>
          <button onClick={() => setHistoryOpen(true)} className="grid size-9 place-items-center rounded-full border border-line bg-card" title="Versions"><History className="size-4" /></button>
          <button onClick={() => setExportOpen(true)} className="grid size-9 place-items-center rounded-full border border-line bg-card" title="Exporter"><Download className="size-4" /></button>
          {src && <a href={src} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full border border-line bg-card" title="Ouvrir dans un onglet"><ExternalLink className="size-4" /></a>}
        </div>
      </div>
      {viewVersion && (
        <div className="flex items-center justify-between gap-3 bg-warn-soft px-4 py-2 text-xs text-warn">
          <span>Vous consultez une version précédente.</span>
          <span className="flex gap-2">
            <button className="underline" onClick={() => setViewVersion(null)}>Revenir à la version actuelle</button>
            <button className="font-semibold underline" onClick={async () => { await api(`/api/projects/${id}/theme/restore`, { body: { versionId: viewVersion } }); setViewVersion(null); reload(); reloadProject(); toast("ok", "Version restaurée (une nouvelle version a été créée)."); }}>Restaurer celle-ci</button>
          </span>
        </div>
      )}
      <div ref={frameBox} className="relative flex-1 overflow-hidden bg-paper-2 p-0 sm:p-4">
        {src && (desktopScale < 1 ? (
          <div className="mx-auto overflow-hidden rounded-none bg-white shadow-soft sm:rounded-2xl" style={{ width: DESKTOP_W * desktopScale, height: "100%" }}>
            <iframe ref={iframe} key={versionId ?? ""} src={src} title="Aperçu de la boutique" className="block border-0 bg-white" style={{ width: DESKTOP_W, height: `${100 / desktopScale}%`, transform: `scale(${desktopScale})`, transformOrigin: "0 0" }} />
          </div>
        ) : (
          <iframe ref={iframe} key={versionId ?? ""} src={src} title="Aperçu de la boutique" className="mx-auto block h-full min-h-[70dvh] w-full rounded-none border-0 bg-white shadow-soft transition-[max-width] duration-500 sm:rounded-2xl" style={{ maxWidth: DEVICES[device].w }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="-mx-4 -my-6 sm:-mx-6 lg:-mx-8">
      {chatJobs.filter((j) => j.type !== "shop.chat").map((j) => <JobProgress key={j.id} job={j} className="m-4" />)}
      {/* Téléphone : bascule entre discussion, aperçu et structure */}
      <div className="flex gap-1 border-b border-line bg-paper p-2 lg:hidden" role="tablist">
        {[["chat", MessageSquare, "Discussion"], ["preview", Laptop, "Aperçu"], ["structure", Layers, "Structure"]].map(([k, I, l]: any) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)} className={cx("flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm", view === k ? "bg-ink text-paper" : "text-ink-2")}><I className="size-4" /> {l}</button>
        ))}
      </div>
      <div className="grid h-[calc(100dvh-9.5rem)] grid-cols-1 lg:h-[calc(100dvh-4rem)] lg:grid-cols-[400px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)_280px]">
        <section className={cx("min-h-0 border-r border-line bg-paper", view !== "chat" && "hidden lg:block")} aria-label="Discussion">{Chat}</section>
        <section className={cx("min-h-0", view !== "preview" && "hidden lg:block")} aria-label="Aperçu">{Preview}</section>
        <section className={cx("min-h-0 border-l border-line bg-paper", view !== "structure" ? "hidden xl:block" : "")} aria-label="Structure">{Structure}</section>
      </div>
      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} multiple kinds={["image", "video", "logo"]} onPick={(a) => setAttachments([...attachments, ...a])} />
      <Modal open={historyOpen} onClose={() => setHistoryOpen(false)} title="Versions de la boutique">
        <ul className="grid max-h-[60dvh] gap-2 overflow-y-auto">
          {theme.versions.map((v) => (
            <li key={v.id} className={cx("flex items-start gap-3 rounded-2xl border p-3 text-sm", v.id === cur.versionId ? "border-ink" : "border-line")}>
              <Badge tone={v.author === "ai" ? "info" : v.author === "user" ? "neutral" : "ink"}>v{v.number}</Badge>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2">{v.summary}</p>
                <p className="mt-0.5 text-xs text-muted">{formatDate(v.created_at)} · {v.author === "ai" ? "IA" : v.author === "user" ? "vous" : "studio"}</p>
              </div>
              {v.id !== cur.versionId && (
                <div className="flex shrink-0 flex-col gap-1">
                  <Button size="sm" variant="secondary" onClick={() => (setViewVersion(v.id), setHistoryOpen(false), setView("preview"))}>Voir</Button>
                  <Button size="sm" variant="ghost" icon={<RotateCcw className="size-3.5" />} onClick={async () => { await api(`/api/projects/${id}/theme/restore`, { body: { versionId: v.id } }); setHistoryOpen(false); reload(); reloadProject(); toast("ok", `Version ${v.number} restaurée.`); }}>Restaurer</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Modal>
      <SectionLibrary open={!!libTarget} onClose={() => setLibTarget(null)} items={theme.library} onPick={addSection} where={libTarget?.label ?? ""} busy={adding} />
      <ThemeGallery open={galleryOpen} onClose={() => setGalleryOpen(false)} projectId={id} directions={theme.directions} current={cur.direction} canApply onApplied={() => (reload(), reloadProject())} />
      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} projectId={id} versionId={versionId} fingerprint={cur.fingerprint} />
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

function ExportModal({ open, onClose, projectId, versionId, fingerprint }: { open: boolean; onClose: () => void; projectId: string; versionId: string | null; fingerprint: string }) {
  const toast = useToast();
  const { reload } = useProject();
  const { data: conns } = useApi<{ connections: { id: string; provider: string; name: string; linked: boolean }[]; publicUrl: boolean }>(open ? `/api/connections?project=${projectId}` : null);
  const shop = conns?.connections.find((c) => c.provider === "shopify");
  const q = versionId ? `&version=${versionId}` : "";
  const items = [
    ["shopify", "Shopify", "Thème Online Store 2.0 · ZIP installable (Boutique en ligne › Thèmes › Ajouter un thème › Importer)"],
    ["shopify-csv", "Produits Shopify (CSV)", "Tous les produits de la boutique, au format d'import Shopify (Produits › Importer)"],
    ["woocommerce", "WooCommerce", "Thème de blocs WordPress installable (Apparence › Thèmes › Ajouter › Téléverser)"],
    ["woocommerce-csv", "Produits WooCommerce (CSV)", "Tous les produits, au format d'import WooCommerce (Produits › Importer)"],
    ["prestashop", "PrestaShop", "Thème enfant du thème Classic, installable (Apparence › Thème et logo)"],
    ["wix", "Wix", "Kit de reprise : Wix n'accepte pas de thème importé"],
    ["squarespace", "Squarespace", "Kit de reprise : Squarespace n'accepte pas de thème importé"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Exporter et installer">
      <p className="text-sm text-muted">L'export contient exactement les fichiers affichés dans l'aperçu (empreinte <code className="rounded bg-paper-2 px-1.5 text-xs">{fingerprint}</code>). Une copie est rangée dans Fichiers › Boutique › Exports.</p>
      <ul className="mt-4 grid gap-2">
        {items.map(([k, l, d]) => (
          <li key={k}>
            <a href={`/api/projects/${projectId}/theme/export?platform=${k}${q}`} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-ink">
              <Download className="size-4 shrink-0" />
              <span className="min-w-0"><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-muted">{d}</span></span>
            </a>
          </li>
        ))}
      </ul>
      <div className="mt-5 rounded-2xl bg-paper-2 p-4 text-sm">
        <p className="font-medium">Installation directe dans Shopify</p>
        {shop ? (
          <>
            <p className="mt-1 text-xs text-muted">Boutique connectée : {shop.name}. Le thème est installé comme thème non publié ; la publication reste votre décision dans Shopify.{!conns?.publicUrl && " L'installation du thème nécessite une adresse publique du studio : en local, importez le ZIP."}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[["product", "Produits et collections"], ["pages", "Pages"], ["theme", "Thème"]].map(([p, l]) => (
                <Button key={p} size="sm" variant="secondary" onClick={async () => { try { await api(`/api/projects/${projectId}/shopify`, { body: { parts: [p] } }); toast("ok", `Envoi « ${l} » lancé.`); reload(); } catch (e) { toast("bad", (e as Error).message); } }}>Envoyer : {l}</Button>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs text-muted">Connectez votre boutique dans l'espace Connexions pour installer directement le thème, le produit et les pages.</p>
        )}
      </div>
    </Modal>
  );
}
