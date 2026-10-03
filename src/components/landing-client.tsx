"use client";
/** Îlots interactifs de la page d'accueil. */
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

/** Ajoute la classe « in » aux éléments .reveal visibles (une seule fois). */
export function RevealObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))),
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}

/** Vidéo muette lue seulement quand elle est visible (économie de batterie). */
export function AutoVideo({ src, poster, className, label }: { src: string; poster?: string; className?: string; label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return <video ref={ref} src={src} poster={poster} muted loop playsInline preload="none" aria-label={label} className={className} />;
}

/** Comparaison avant / après (photo d'origine ↔ création). */
export function BeforeAfter({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
  const [pos, setPos] = useState(52);
  return (
    <div className="relative aspect-[4/5] w-full select-none overflow-hidden rounded-3xl bg-paper-2">
      <img src={after} alt={afterLabel} className="absolute inset-0 size-full object-cover" loading="lazy" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={beforeLabel} className="absolute inset-0 size-full object-cover" loading="lazy" />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white/90" />
        <div className="absolute top-1/2 -ml-5 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white text-ink shadow-soft">↔</div>
      </div>
      <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">{beforeLabel}</span>
      <span className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur">{afterLabel}</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Comparer la photo d'origine et la création" className="absolute inset-0 size-full cursor-ew-resize opacity-0" />
    </div>
  );
}

export type Demo = {
  id: string;
  brand: string;
  product: string;
  sector: string;
  direction: string;
  palette: string[];
  photo: string;
  logo: string;
  shopDesktop: string;
  shopMobile: string;
  images: { src: string; label: string }[];
  video: string;
  videoPoster: string;
  shopVideo?: string;
};

export function DemoTabs({ demos }: { demos: Demo[] }) {
  const [i, setI] = useState(0);
  const d = demos[i];
  if (!d) return null;
  return (
    <div>
      <div role="tablist" aria-label="Démonstrations" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4">
        {demos.map((x, k) => (
          <button key={x.id} role="tab" aria-selected={k === i} onClick={() => setI(k)} className={cx("shrink-0 rounded-full border px-4 py-2 text-sm transition", k === i ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink")}>
            {x.brand} <span className="opacity-60">· {x.sector}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-4 lg:col-span-3">
          <figure className="overflow-hidden rounded-3xl border border-line bg-card">
            <img src={d.photo} alt={`Photo d'entrée : ${d.product}`} className="aspect-[4/5] w-full object-cover" loading="lazy" />
            <figcaption className="flex items-center justify-between px-4 py-3 text-xs text-muted">
              <span>Entrée : une seule photo</span>
              <span className="rounded-full bg-paper-2 px-2 py-0.5">1/1</span>
            </figcaption>
          </figure>
          <div className="rounded-3xl border border-line bg-card p-5">
            <img src={d.logo} alt={`Logo ${d.brand}`} className="mx-auto h-16 w-auto object-contain dark:invert" loading="lazy" />
            <div className="mt-4 flex overflow-hidden rounded-full">
              {d.palette.map((c) => (
                <span key={c} className="h-7 flex-1" style={{ background: c }} title={c} />
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Direction « {d.direction} » · palette mesurée sur le produit</p>
          </div>
        </div>
        <div className="grid gap-4 lg:col-span-6">
          <div className="overflow-hidden rounded-3xl border border-line bg-card">
            <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-line" />
              <span className="size-2.5 rounded-full bg-line" />
              <span className="size-2.5 rounded-full bg-line" />
              <span className="ml-3 truncate text-xs text-muted">Aperçu du thème Shopify généré</span>
            </div>
            <img src={d.shopDesktop} alt={`Page d'accueil de la boutique ${d.brand}`} className="aspect-[16/10] w-full object-cover object-top" loading="lazy" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {d.images.slice(0, 3).map((im) => (
              <figure key={im.src} className="overflow-hidden rounded-2xl border border-line bg-card">
                <img src={im.src} alt={im.label} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                <figcaption className="truncate px-3 py-2 text-[11px] text-muted">{im.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-1">
          <div className="relative mx-auto w-full max-w-[260px] overflow-hidden rounded-[2rem] border-[6px] border-ink bg-ink">
            <AutoVideo src={d.video} poster={d.videoPoster} label={`Publicité vidéo 9:16 pour ${d.brand}`} className="aspect-[9/16] w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white">Vidéo 9:16 · MP4</span>
          </div>
          <div className="relative mx-auto w-full max-w-[200px] overflow-hidden rounded-[1.6rem] border-[5px] border-ink bg-ink lg:hidden">
            <img src={d.shopMobile} alt={`Boutique ${d.brand} sur téléphone`} className="aspect-[9/19] w-full object-cover object-top" loading="lazy" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Présentation du parcours, synchronisée au défilement (sticky). */
export function StepsScroller({ steps }: { steps: { title: string; text: string; image: string; tag: string }[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-20">
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-line bg-paper-2">
            {steps.map((s, i) => (
              <img key={s.image + i} src={s.image} alt="" aria-hidden className={cx("absolute inset-0 size-full object-cover transition-all duration-700", i === active ? "scale-100 opacity-100" : "scale-105 opacity-0")} loading="lazy" />
            ))}
            <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white backdrop-blur">{steps[active]?.tag}</span>
          </div>
        </div>
      </div>
      <ol className="grid">
        {steps.map((s, i) => (
          <li key={s.title} ref={(el) => void (refs.current[i] = el)} data-i={i} className={cx("border-t border-line py-10 transition-opacity duration-500 lg:min-h-[52vh] lg:py-16", i === active ? "opacity-100" : "lg:opacity-40")}>
            <span className="font-display text-sm text-signal">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">{s.title}</h3>
            <p className="mt-3 max-w-lg text-[17px] leading-relaxed text-ink-2">{s.text}</p>
            <img src={s.image} alt="" aria-hidden className="mt-6 aspect-[4/3] w-full rounded-3xl object-cover lg:hidden" loading="lazy" />
          </li>
        ))}
      </ol>
    </div>
  );
}
