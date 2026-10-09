"use client";
/**
 * Démonstration animée du rangement automatique (page d'accueil) : les fichiers importés arrivent
 * avec leur nom d'origine, l'IA les analyse, les renomme puis les envoie dans le bon sous-dossier
 * de l'arborescence réelle du studio (DEFAULT_TREE).
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronRight, FileImage, FileVideo, Folder, FolderOpen, Pause, Play, Sparkles } from "lucide-react";
import { cx } from "./ui";
import { useLang } from "./i18n";
import type { Lang } from "@/lib/i18n";

type Tree = { name: string; kids: string[] }[];
type Files = { from: string; to: string; parent: number; kid: string; video?: boolean }[];

const TREES: Record<Lang, Tree> = {
  fr: [
    { name: "01 · Produit", kids: ["Photos originales", "Détourages", "Catalogue"] },
    { name: "02 · Marque", kids: ["Logos", "Charte & palette"] },
    { name: "03 · Images", kids: ["Packshots", "Scènes & usages", "Réseaux sociaux", "Publicités"] },
    { name: "04 · Vidéos", kids: ["Publicités", "Réseaux sociaux", "Boutique"] },
    { name: "05 · Boutique", kids: ["Exports de thèmes"] },
    { name: "06 · Contenus", kids: ["Textes", "Calendrier"] },
  ],
  en: [
    { name: "01 · Product", kids: ["Original photos", "Cutouts", "Catalog"] },
    { name: "02 · Brand", kids: ["Logos", "Guidelines & palette"] },
    { name: "03 · Images", kids: ["Packshots", "Scenes & usage", "Social media", "Ads"] },
    { name: "04 · Videos", kids: ["Ads", "Social media", "Store"] },
    { name: "05 · Store", kids: ["Theme exports"] },
    { name: "06 · Content", kids: ["Copy", "Calendar"] },
  ],
};

const FILES_BY_LANG: Record<Lang, Files> = {
  fr: [
    { from: "IMG_4821.jpg", to: "drone-photo-originale.jpg", parent: 0, kid: "Photos originales" },
    { from: "capture (3).png", to: "drone-detoure.png", parent: 0, kid: "Détourages" },
    { from: "logo ok.svg", to: "logo-principal.svg", parent: 1, kid: "Logos" },
    { from: "Sans titre.jpg", to: "drone-post-4x5.jpg", parent: 2, kid: "Réseaux sociaux" },
    { from: "video_final_v2.mp4", to: "drone-pub-9x16.mp4", parent: 3, kid: "Publicités", video: true },
  ],
  en: [
    { from: "IMG_4821.jpg", to: "drone-original-photo.jpg", parent: 0, kid: "Original photos" },
    { from: "screenshot (3).png", to: "drone-cutout.png", parent: 0, kid: "Cutouts" },
    { from: "logo ok.svg", to: "logo-main.svg", parent: 1, kid: "Logos" },
    { from: "Untitled.jpg", to: "drone-post-4x5.jpg", parent: 2, kid: "Social media" },
    { from: "video_final_v2.mp4", to: "drone-ad-9x16.mp4", parent: 3, kid: "Ads", video: true },
  ],
};
const FILES_COUNT = FILES_BY_LANG.fr.length;

/** Étapes par fichier : 1 arrivée, 2 analyse, 3 renommé et envoyé, 4 rangé. */
const PER = 3;
const TICK = 750;
const HOLD = 5;
const LAST = FILES_COUNT * PER + 1 + HOLD;

const key = (parent: number, kid: string) => `${parent}/${kid}`;

export function FilesSorter() {
  const { lang } = useLang();
  const t = (fr: string, en: string) => (lang === "en" ? en : fr);
  const TREE = TREES[lang];
  const FILES = FILES_BY_LANG[lang];
  const box = useRef<HTMLDivElement>(null);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const folders = useRef<Record<string, HTMLLIElement | null>>({});
  const [step, setStep] = useState(0);
  // Démonstration en boucle : bouton pause, et arrêt au focus clavier (contenu en mouvement).
  const [paused, setPaused] = useState(false);
  const hold = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const [ghost, setGhost] = useState<{ label: string; video?: boolean; x: number; y: number; tx: number; ty: number; go: boolean } | null>(null);

  // Démarre quand la maquette est visible, tourne en boucle ; affiche l'état final si les animations sont réduites.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStep(FILES_COUNT * PER + 1);
      return;
    }
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !timer) timer = setInterval(() => !pausedRef.current && !hold.current && setStep((s) => (s >= LAST ? 0 : s + 1)), TICK);
      else if (!e.isIntersecting && timer) (clearInterval(timer), (timer = undefined));
    }, { threshold: 0.25 });
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearInterval(timer);
    };
  }, []);

  const stage = (i: number) => Math.max(0, Math.min(4, step - i * PER));
  const sending = FILES.findIndex((_, i) => stage(i) === 3);
  const current = FILES[sending >= 0 ? sending : Math.max(0, Math.min(FILES.length - 1, Math.floor((step - 1) / PER)))];
  const counts: Record<string, number> = {};
  FILES.forEach((f, i) => stage(i) >= 4 && (counts[key(f.parent, f.kid)] = (counts[key(f.parent, f.kid)] ?? 0) + 1));
  const done = FILES.filter((_, i) => stage(i) >= 4).length;

  // Fichier qui « vole » de sa ligne vers son sous-dossier.
  useLayoutEffect(() => {
    if (sending < 0) return setGhost(null);
    const f = FILES[sending];
    const b = box.current?.getBoundingClientRect();
    const r = rows.current[sending]?.getBoundingClientRect();
    const d = folders.current[key(f.parent, f.kid)]?.getBoundingClientRect();
    if (!b || !r || !d) return;
    setGhost({ label: f.to, video: f.video, x: r.left - b.left + 12, y: r.top - b.top + 10, tx: d.left - b.left + 18, ty: d.top - b.top + 2, go: false });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setGhost((g) => g && { ...g, go: true })));
    return () => cancelAnimationFrame(raf);
  }, [sending]);

  return (
    <div
      ref={box}
      onFocus={() => (hold.current = true)}
      onBlur={() => (hold.current = false)}
      className="relative overflow-hidden rounded-[28px] border border-line bg-paper shadow-soft"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" /><span className="size-2.5 rounded-full bg-line" />
        <span className="ml-2 text-xs text-muted">{t("Fichiers · Ostral", "Files · Ostral")}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-signal-soft px-2.5 py-1 text-xs font-medium text-signal">
          <Sparkles className={cx("size-3", step > 0 && done < FILES.length && "animate-spin [animation-duration:2.4s]", paused && "[animation-play-state:paused]")} />
          {done < FILES.length ? t(`L'IA range… ${done}/${FILES.length}`, `AI is sorting… ${done}/${FILES.length}`) : t("Tout est rangé", "All sorted")}
        </span>
        <button type="button" onClick={() => setPaused((x) => !x)} aria-pressed={paused} aria-label={paused ? t("Reprendre la démonstration", "Resume the demo") : t("Mettre la démonstration en pause", "Pause the demo")} className="-my-2 -mr-2 grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-ink-2 transition hover:bg-paper-2 hover:text-ink">
          {paused ? <Play className="size-4" aria-hidden /> : <Pause className="size-4" aria-hidden />}
        </button>
      </div>
      <div className="grid sm:grid-cols-[minmax(0,210px)_1fr]">
        <ul className="border-b border-line p-3 text-[13px] sm:border-b-0 sm:border-r">
          {TREE.map((p, pi) => {
            const open = pi === current.parent;
            const total = p.kids.reduce((n, k) => n + (counts[key(pi, k)] ?? 0), 0);
            return (
              <li key={p.name}>
                <p className={cx("flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-medium transition-colors duration-300", open ? "text-ink" : "text-ink-2")}>
                  <ChevronRight className={cx("size-3 text-muted transition-transform duration-300", open && "rotate-90")} />
                  {open ? <FolderOpen className="size-3.5 text-signal" /> : <Folder className="size-3.5 text-signal" />}
                  <span className="truncate">{p.name}</span>
                  {total > 0 && <span className="ml-auto rounded-full bg-paper-2 px-1.5 text-[10px] text-muted">{total}</span>}
                </p>
                <div className={cx("grid transition-[grid-template-rows] duration-500", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <ul className="ml-5 overflow-hidden border-l border-line pl-2">
                    {p.kids.map((k) => {
                      const target = sending >= 0 && FILES[sending].parent === pi && FILES[sending].kid === k;
                      const n = counts[key(pi, k)] ?? 0;
                      return (
                        <li key={k} ref={(el) => void (folders.current[key(pi, k)] = el)} className={cx("my-0.5 flex items-center gap-1.5 rounded-lg px-2 py-1 transition-all duration-300", target ? "bg-signal text-white shadow-[0_8px_24px_-10px_var(--glow)]" : n ? "bg-signal-soft text-ink" : "text-ink-2")}>
                          <span className="truncate">{k}</span>
                          {n > 0 && !target && <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-signal"><Check className="size-3" />{n}</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="p-4 sm:p-5">
          <p className="text-[11px] font-medium uppercase tracking-[.16em] text-muted">{t("Fichiers importés", "Uploaded files")}</p>
          <ul className="mt-3 grid gap-2">
            {FILES.map((f, i) => {
              const s = stage(i);
              const Icon = f.video ? FileVideo : FileImage;
              return (
                <li key={f.from} ref={(el) => void (rows.current[i] = el)} className={cx("rounded-2xl border bg-card p-2.5 transition-all duration-500", s === 0 ? "translate-y-3 opacity-0" : s >= 4 ? "border-line opacity-60" : "border-signal/40 opacity-100 shadow-soft")}>
                  <div className="flex items-center gap-2 text-[13px]">
                    <Icon className="size-4 shrink-0 text-muted" />
                    <span className="relative min-w-0 flex-1">
                      <span className={cx("block truncate transition-all duration-300", s >= 3 ? "absolute inset-0 -translate-y-2 opacity-0" : "text-ink-2")}>{f.from}</span>
                      <span className={cx("block truncate font-medium text-ink transition-all duration-300", s >= 3 ? "opacity-100" : "absolute inset-0 translate-y-2 opacity-0")}>{f.to}</span>
                    </span>
                    {s === 2 && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-[10px] font-medium text-signal"><Sparkles className="size-3 animate-pulse" /> {t("Analyse", "Analyzing")}</span>}
                    {s >= 4 && <Check className="size-4 shrink-0 text-signal" />}
                  </div>
                  <p className={cx("ml-6 mt-1 truncate text-[11px] text-ink-2 transition-all duration-300", s >= 3 ? "opacity-100" : "-translate-x-1 opacity-0")}>
                    → {TREE[f.parent].name} › {f.kid}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {ghost && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-10 inline-flex max-w-[200px] items-center gap-1.5 rounded-lg bg-signal px-2 py-1 text-[11px] font-medium text-white shadow-[0_10px_30px_-8px_var(--glow)] ease-[cubic-bezier(.6,0,.2,1)]"
          style={{ transform: `translate(${ghost.go ? ghost.tx : ghost.x}px, ${ghost.go ? ghost.ty : ghost.y}px) scale(${ghost.go ? 0.7 : 1})`, opacity: ghost.go ? 0 : 1, transition: "transform .7s cubic-bezier(.6,0,.2,1), opacity .25s ease .55s" }}
        >
          {ghost.video ? <FileVideo className="size-3 shrink-0" /> : <FileImage className="size-3 shrink-0" />}
          <span className="truncate">{ghost.label}</span>
        </span>
      )}
      <p className="sr-only">{t("Démonstration : l'IA renomme chaque fichier importé et le range dans le bon sous-dossier.", "Demo: the AI renames each uploaded file and moves it into the right subfolder.")}</p>
    </div>
  );
}
