"use client";
/** Îlots interactifs de la page d'accueil. */
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

/** Ajoute la classe « in » aux éléments .reveal visibles (une seule fois). */
export function RevealObserver() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal, .words"));
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

type Film = { label: string; src: string; poster: string; captions?: string; description: string };

/** Films de présentation : lus en silence ; « avec le son » relance le film choisi depuis le début. */
export function FilmPlayer({ films }: { films: Film[] }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [sound, setSound] = useState(false);
  const film = films[i];
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.controls = true;
      return;
    }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.3 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  const withSound = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = false;
    v.loop = false;
    v.currentTime = 0;
    v.controls = true;
    setSound(true);
    v.play().catch(() => {});
  };
  const choose = (k: number) => {
    if (k === i) return;
    setI(k);
    setSound(false);
    const v = ref.current;
    if (v) {
      v.muted = true;
      v.loop = true;
      v.controls = false;
      // Nouvelle source : rechargée puis lue (en silence) au prochain rendu.
      requestAnimationFrame(() => {
        v.load();
        v.play().catch(() => {});
      });
    }
  };
  return (
    <div>
      <div className="relative">
        <video ref={ref} src={film.src} poster={film.poster} muted={!sound} loop={!sound} autoPlay playsInline preload="metadata" aria-label={film.description} className="aspect-video w-full bg-[#070B17] object-cover">
          {film.captions && <track kind="captions" src={film.captions} srcLang="fr" label="Français" />}
        </video>
        {!sound && (
          <button onClick={withSound} style={{ position: "absolute" }} className="btn-glow !absolute right-2.5 top-2.5 z-10 inline-flex h-8 items-center gap-1.5 rounded-full bg-signal px-3 text-xs font-semibold text-signal-ink shadow-soft transition hover:-translate-y-0.5 sm:right-4 sm:top-4 sm:h-10 sm:gap-2 sm:px-4 sm:text-sm">
            <span aria-hidden>▶</span> Avec le son
          </button>
        )}
      </div>
      {films.length > 1 && (
        <div className="flex gap-1 border-t border-white/10 bg-[#0A1024] p-1.5" role="tablist" aria-label="Choisir le film">
          {films.map((f, k) => (
            <button key={f.src} role="tab" aria-selected={k === i} onClick={() => choose(k)} className={cx("flex-1 rounded-full px-3 py-2 text-xs font-medium transition sm:text-sm", k === i ? "bg-white text-[#0A1024]" : "text-white/70 hover:text-white")}>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Comparaison avant / après (photo d'origine ↔ création). */
export function BeforeAfter({ before, after, beforeLabel, afterLabel, aspect = "4 / 5" }: { before: string; after: string; beforeLabel: string; afterLabel: string; aspect?: string }) {
  const [pos, setPos] = useState(52);
  return (
    <div className="relative w-full select-none overflow-hidden rounded-3xl bg-paper-2" style={{ aspectRatio: aspect }}>
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
  storeType?: "mono" | "multi" | "niche";
  products?: number;
  source?: { supplier: string; url: string; note: string } | null;
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
      <p className="-mt-4 mb-6 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-medium", d.source ? "bg-signal-soft text-signal" : "bg-paper-2 text-muted")}>{d.source ? `Produit réel · ${d.source.supplier}` : "Produit fictif · rendu 3D"}</span>
        {d.storeType && d.storeType !== "mono" && <span className="rounded-full bg-paper-2 px-2.5 py-0.5 text-xs">{d.storeType === "niche" ? "Boutique niche" : "Multi-produit"} · {d.products} produits</span>}
        {d.source && <span>{d.source.note}</span>}
      </p>
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
              <span className="ml-3 truncate text-xs text-muted">Aperçu du thème généré</span>
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

/**
 * Effets pilotés par le défilement, sans bibliothèque :
 *  - [data-sfx] reçoit --p (0 → 1 pendant sa traversée de l'écran) ;
 *  - [data-count] compte jusqu'à data-to quand il apparaît ;
 *  - .spot suit le pointeur (--mx, --my).
 */
export function ScrollFX() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sfx = Array.from(document.querySelectorAll<HTMLElement>("[data-sfx]"));
    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of sfx) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        el.style.setProperty("--p", p.toFixed(3));
      }
    };
    const onScroll = () => (raf ||= requestAnimationFrame(update));
    if (!reduce) {
      update();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }
    // Compteurs
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          const el = e.target as HTMLElement;
          const to = Number(el.dataset.to);
          if (reduce) return void (el.textContent = el.dataset.to!);
          const t0 = performance.now();
          const tick = (t: number) => {
            const k = Math.min(1, (t - t0) / 1400);
            el.textContent = String(Math.round(to * (1 - Math.pow(1 - k, 3))));
            if (k < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
      { threshold: 0.6 },
    );
    counters.forEach((c) => io.observe(c));
    // Projecteur
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>(".spot");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onMove);
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

export type Chapter = { title: string; text: string; video: string; poster: string; tag: string };

/** Chapitres vidéo : la vidéo à gauche suit le paragraphe lu à droite (sur téléphone, chaque chapitre a sa vidéo). */
export function VideoChapters({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const vids = useRef<(HTMLVideoElement | null)[]>([]);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))), { rootMargin: "-45% 0px -45% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    vids.current.forEach((v, i) => {
      if (!v) return;
      if (i === active) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else v.pause();
    });
  }, [active]);
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-20">
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <div className="neon on relative aspect-square overflow-hidden rounded-[2rem] border border-line bg-[#070B17] shadow-soft">
            {chapters.map((c, i) => (
              <video key={c.video} ref={(el) => void (vids.current[i] = el)} src={c.video} poster={c.poster} muted loop playsInline preload={i === 0 ? "auto" : "metadata"} aria-label={c.title} className={cx("absolute inset-0 size-full object-cover transition-all duration-700", i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0")} />
            ))}
          </div>
          <div className="mt-5 flex gap-1.5" aria-hidden>
            {chapters.map((c, i) => <span key={c.tag} className={cx("h-1 flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-signal" : "bg-line")} />)}
          </div>
        </div>
      </div>
      <ol className="grid">
        {chapters.map((c, i) => (
          <li key={c.title} ref={(el) => void (refs.current[i] = el)} data-i={i} className={cx("border-t border-line py-10 transition-opacity duration-500 lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center lg:py-16", i === active ? "opacity-100" : "lg:opacity-35")}>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-signal"><span className="font-display">{String(i + 1).padStart(2, "0")}</span> {c.tag}</span>
            <h3 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-[2.6rem]">{c.title}</h3>
            <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-2">{c.text}</p>
            <div className="mt-6 overflow-hidden rounded-3xl border border-line bg-[#070B17] lg:hidden">
              <AutoVideo src={c.video} poster={c.poster} label={c.title} className="aspect-square w-full object-cover" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type ThemeShow = { id: string; name: string; tagline: string; description: string; preview: string; chrome: string[]; dark: boolean };

/**
 * Vitrine des thèmes : sur ordinateur, la section se fige et les thèmes défilent à l'horizontale
 * au rythme du défilement vertical ; sur téléphone, carrousel tactile.
 */
export function ThemeShowcase({ themes, children }: { themes: ThemeShow[]; children: React.ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
    const apply = () => setPinned(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  useEffect(() => {
    if (!pinned) {
      if (track.current) track.current.style.transform = "";
      return;
    }
    let raf = 0;
    const update = () => {
      raf = 0;
      const s = section.current, t = track.current;
      if (!s || !t) return;
      const r = s.getBoundingClientRect();
      const range = s.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / range));
      const dist = t.scrollWidth - t.clientWidth;
      t.style.transform = `translate3d(${-p * dist}px,0,0)`;
      bar.current?.style.setProperty("--p", p.toFixed(3));
    };
    const on = () => (raf ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [pinned]);
  return (
    <section ref={section} id="themes" className="relative scroll-mt-16 bg-paper-2" style={pinned ? { height: `calc(${themes.length} * 34vh + 100vh)` } : undefined}>
      <div className={cx("overflow-hidden py-24 sm:py-28", pinned && "sticky top-16 flex h-[calc(100dvh-4rem)] flex-col justify-center py-0 sm:py-0")}>
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">{children}</div>
        <div ref={track} className={cx("mt-8 flex gap-5 px-4 will-change-transform sm:px-6 lg:px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))] scroll-px-4 sm:scroll-px-6 lg:scroll-px-[max(1.5rem,calc((100vw_-_80rem)/2_+_1.5rem))]", !pinned && "scrollbar-none snap-x snap-mandatory overflow-x-auto pb-4")}>
          {themes.map((d, i) => (
            <article key={d.id} className="neon spot w-[82vw] shrink-0 snap-start rounded-[1.75rem] border border-line bg-card p-2.5 shadow-soft sm:w-[440px] lg:w-[min(460px,33vw)]">
              <div className="overflow-hidden rounded-[1.25rem] border border-line bg-paper">
                <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
                  <span className="size-2 rounded-full bg-line" /><span className="size-2 rounded-full bg-line" /><span className="size-2 rounded-full bg-line" />
                  <span className="ml-2 truncate text-[11px] text-muted">{d.name.toLowerCase()}.myshopify.com</span>
                </div>
                <img src={d.preview} alt={`Boutique de démonstration, thème ${d.name}`} loading="lazy" className="aspect-[16/11] w-full object-cover object-top" />
              </div>
              <div className="px-2.5 pb-2 pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl font-semibold">{d.name}</h3>
                  <span className="text-xs text-muted">{String(i + 1).padStart(2, "0")} / {themes.length}</span>
                </div>
                <p className="serif-i text-lg text-signal">{d.tagline}</p>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {d.chrome.map((c) => <li key={c} className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] text-ink-2">{c}</li>)}
                  {d.dark && <li className="rounded-full bg-ink px-2.5 py-1 text-[11px] text-paper">Version sombre</li>}
                </ul>
              </div>
            </article>
          ))}
        </div>
        {pinned && (
          <div className="mx-auto mt-6 w-full max-w-7xl px-6">
            <div className="h-1 overflow-hidden rounded-full bg-line"><div ref={bar} className="sfx-progress h-full rounded-full bg-signal" /></div>
          </div>
        )}
      </div>
    </section>
  );
}
