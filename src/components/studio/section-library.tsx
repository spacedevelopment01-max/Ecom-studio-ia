"use client";
/**
 * « Ajouter une section », comme dans l'éditeur Shopify : liste à gauche, aperçu à droite rendu en direct
 * dans le thème du projet (ses couleurs, polices, photos et vidéos), et « Générer » pour créer
 * une section sur mesure avec l'IA à partir d'une description.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, Sparkles, Wand2 } from "lucide-react";
import { Button, cx, Modal } from "../ui";
import { useLang, useT } from "../i18n";
import { intlLocale } from "@/lib/i18n";

export type LibraryItem = { type: string; name: string; category: string; description: string; keywords: string; preview: string | null };

const ORDER = ["Votre thème", "Ouverture", "Produit", "Preuves", "Animations", "Images et vidéos", "Collections", "Textes", "Conversion", "Avancé"];
/** Libellés anglais des catégories (les clés restent celles du serveur). */
const CATEGORY_EN: Record<string, string> = {
  Toutes: "All",
  "Votre thème": "Your theme",
  Ouverture: "Hero",
  Produit: "Product",
  Preuves: "Social proof",
  Animations: "Animations",
  "Images et vidéos": "Images and videos",
  Collections: "Collections",
  Textes: "Text",
  Conversion: "Conversion",
  Avancé: "Advanced",
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const GENERATE = "__generate";
const FRAME_W = 1280;
const FRAME_H = 800;

export function SectionLibrary({
  open,
  onClose,
  items,
  onPick,
  where,
  busy,
  projectId,
  versionId,
  aiAvailable,
  onGenerate,
}: {
  open: boolean;
  onClose: () => void;
  items: LibraryItem[];
  onPick: (type: string) => void;
  where: string;
  busy?: string | null;
  projectId: string;
  versionId?: string;
  aiAvailable: boolean;
  onGenerate: (description: string) => Promise<void>;
}) {
  const t = useT();
  const { lang } = useLang();
  const catLabel = (c: string) => t(c, CATEGORY_EN[c] ?? c);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string>(GENERATE);
  const [hoverable, setHoverable] = useState(true);
  useEffect(() => setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches), []);
  useEffect(() => {
    if (open) {
      setQ("");
      setSel(GENERATE);
    }
  }, [open]);
  const groups = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    const list = items
      .filter((i) => words.every((w) => norm(`${i.name} ${i.description} ${i.keywords} ${i.category}`).includes(w)))
      .sort((a, b) => a.name.localeCompare(b.name, intlLocale(lang)));
    const cats = [...ORDER, ...new Set(list.map((i) => i.category).filter((c) => !ORDER.includes(c)))];
    return cats.map((c) => ({ cat: c, items: list.filter((i) => i.category === c) })).filter((g) => g.items.length);
  }, [items, q, lang]);
  const current = items.find((i) => i.type === sel) ?? null;
  // Survol : petit délai pour ne pas rendre chaque ligne traversée par la souris.
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hover = (type: string) => {
    if (!hoverable) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setSel(type), 120);
  };
  const click = (type: string) => {
    if (type === GENERATE) return setSel(GENERATE);
    // Ordinateur : un clic ajoute (comme dans Shopify). Tactile : le premier toucher montre l'aperçu.
    if (hoverable || sel === type) onPick(type);
    else setSel(type);
  };

  return (
    <Modal open={open} onClose={onClose} title={t("Ajouter une section", "Add a section")} xl>
      <p className="-mt-2 mb-4 text-sm text-muted">{where}. {hoverable ? t("Survolez une section pour la voir dans votre boutique, cliquez pour l'ajouter.", "Hover over a section to see it in your store, click to add it.") : t("Touchez une section pour la voir dans votre boutique, puis « Ajouter cette section ».", "Tap a section to see it in your store, then “Add this section”.")}</p>
      <div className="grid gap-4 lg:h-[min(68dvh,640px)] lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-paper">
          <label className="m-2 flex h-10 items-center gap-2 rounded-xl border border-line bg-card px-3 focus-within:border-ink">
            <Search className="size-4 text-muted" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Rechercher des sections", "Search sections")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-label={t("Rechercher des sections", "Search sections")} />
          </label>
          <ul className="max-h-[42dvh] min-h-0 flex-1 overflow-y-auto px-2 pb-2 lg:max-h-none" role="listbox" aria-label={t("Sections", "Sections")}>
            <li>
              <button type="button" role="option" aria-selected={sel === GENERATE} onMouseEnter={() => hover(GENERATE)} onClick={() => click(GENERATE)} className={cx("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium", sel === GENERATE ? "bg-ink text-paper" : "hover:bg-paper-2")}>
                <Sparkles className={cx("size-4", sel === GENERATE ? "" : "text-signal")} /> {t("Générer", "Generate")}
              </button>
            </li>
            {groups.map((g) => (
              <li key={g.cat} className="mt-2">
                <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[.14em] text-muted">{catLabel(g.cat)}</p>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.type}>
                      <button type="button" role="option" aria-selected={sel === i.type} disabled={!!busy} onMouseEnter={() => hover(i.type)} onFocus={() => setSel(i.type)} onClick={() => click(i.type)} className={cx("group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm disabled:opacity-60", sel === i.type ? "bg-paper-2 font-medium text-ink" : "text-ink-2 hover:bg-paper-2")}>
                        <span className="truncate">{i.name}</span>
                        {busy === i.type ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className={cx("size-3.5 shrink-0 text-muted", sel === i.type ? "opacity-100" : "opacity-0 group-hover:opacity-100")} />}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {!groups.length && <li className="px-3 py-6 text-center text-sm text-muted">{t("Aucune section ne correspond : essayez « Générer ».", "No section matches: try “Generate”.")}</li>}
          </ul>
        </div>
        <div className={cx("min-h-0 overflow-hidden rounded-2xl border border-line bg-paper-2", sel !== GENERATE && "order-first lg:order-none")}>
          {sel === GENERATE || !current ? (
            <GeneratePane aiAvailable={aiAvailable} onGenerate={onGenerate} />
          ) : (
            <PreviewPane key={current.type} item={current} projectId={projectId} versionId={versionId} onAdd={() => onPick(current.type)} adding={busy === current.type} disabled={!!busy} />
          )}
        </div>
      </div>
    </Modal>
  );
}

/** Aperçu en direct : la section rendue seule dans le thème du projet, mise à l'échelle du panneau. */
function PreviewPane({ item, projectId, versionId, onAdd, adding, disabled }: { item: LibraryItem; projectId: string; versionId?: string; onAdd: () => void; adding: boolean; disabled: boolean }) {
  const t = useT();
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [loaded, setLoaded] = useState(false);
  const [height, setHeight] = useState(FRAME_H);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / FRAME_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const src = `/api/projects/${projectId}/theme/section-preview?type=${encodeURIComponent(item.type)}${versionId ? `&v=${versionId}` : ""}`;
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        <div ref={box} className="relative w-full overflow-hidden rounded-xl border border-line bg-card shadow-soft" style={{ height: Math.min(height, FRAME_H * 1.6) * scale }}>
          {!loaded && (
            <div className="absolute inset-0 grid place-items-center">
              {item.preview ? <img src={item.preview} alt="" className="size-full object-cover object-top opacity-60" /> : null}
              <span className="absolute inline-flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs text-muted shadow-soft"><Loader2 className="size-3.5 animate-spin" /> {t("Aperçu dans votre boutique…", "Previewing in your store…")}</span>
            </div>
          )}
          <iframe
            title={t(`Aperçu : ${item.name}`, `Preview: ${item.name}`)}
            src={src}
            loading="lazy"
            onLoad={(e) => {
              setLoaded(true);
              try {
                const doc = (e.target as HTMLIFrameElement).contentDocument;
                const h = doc?.documentElement.scrollHeight;
                if (h) setHeight(Math.max(320, h));
              } catch {}
            }}
            className={cx("absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-300", loaded ? "opacity-100" : "opacity-0")}
            style={{ width: FRAME_W, height: Math.min(height, FRAME_H * 1.6), transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-card px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{item.name}</p>
          <p className="line-clamp-2 text-xs text-muted">{item.description}</p>
        </div>
        <Button size="sm" icon={<Plus className="size-4" />} loading={adding} disabled={disabled} onClick={onAdd}>{t("Ajouter cette section", "Add this section")}</Button>
      </div>
    </div>
  );
}

/** « Générer » : décrire la section voulue, l'IA l'écrit (code, réglages modifiables) et l'ajoute à la page. */
function GeneratePane({ aiAvailable, onGenerate }: { aiAvailable: boolean; onGenerate: (description: string) => Promise<void> }) {
  const t = useT();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const examples = [
    t("Un curseur avant / après sur une photo du produit", "A before/after slider on a product photo"),
    t("Une frise des étapes de fabrication avec icônes animées", "A timeline of the making steps with animated icons"),
    t("Un comparatif de notre produit face aux alternatives, en tableau", "A comparison table of our product versus the alternatives"),
    t("Une bannière vidéo plein écran avec un texte qui apparaît au défilement", "A full-screen video banner with text that appears on scroll"),
  ];
  const go = async () => {
    if (text.trim().length < 8) return;
    setBusy(true);
    try {
      await onGenerate(text.trim());
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 overflow-y-auto p-5 text-center sm:p-8">
      <div>
        <p className="font-display text-2xl font-semibold">{t("Vous avez une idée ?", "Got an idea?")}</p>
        <p className="font-display text-2xl font-semibold text-gradient">{t("Donnons-lui vie.", "Let's bring it to life.")}</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t("Décrivez la section voulue : l'IA écrit son code dans le style de votre boutique, avec des réglages modifiables, puis l'ajoute à la page. Chaque création est une nouvelle version que vous pouvez annuler.", "Describe the section you want: the AI writes its code in your store's style, with editable settings, then adds it to the page. Each creation is a new version you can undo.")}</p>
      </div>
      <div className="w-full max-w-xl text-left">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} maxLength={1500} placeholder={t("Ex. Une section qui montre les 3 façons d'utiliser le produit, avec une photo et un texte court pour chacune", "E.g. A section showing the 3 ways to use the product, with a photo and a short text for each")} className="w-full rounded-2xl border border-line bg-card p-3.5 text-sm outline-none focus:border-ink" aria-label={t("Description de la section", "Section description")} />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {examples.map((x) => (
            <button key={x} type="button" onClick={() => setText(x)} className="rounded-full border border-line bg-card px-2.5 py-1 text-xs text-ink-2 hover:border-ink">{x}</button>
          ))}
        </div>
        {aiAvailable ? (
          <Button className="mt-4 w-full" icon={<Wand2 className="size-4" />} loading={busy} disabled={text.trim().length < 8} onClick={go}>{t("Générer la section avec l'IA", "Generate the section with AI")}</Button>
        ) : (
          <p className="mt-4 rounded-2xl border border-info/30 bg-info-soft p-3 text-xs text-info">{t("La génération de section est faite par l'IA : passez sur « IA » en haut du studio (abonnement avec crédits de création). Le moteur local ne sait pas écrire une section sur mesure.", "Section generation is done by AI: switch to “AI” at the top of the studio (subscription with creation credits). The local engine can't write a custom section.")}</p>
        )}
      </div>
    </div>
  );
}
