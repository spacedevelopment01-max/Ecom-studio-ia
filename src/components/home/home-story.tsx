"use client";
/**
 * Parcours au défilement : Marque → Boutique → Images → Publicités → Vidéos → SEO → Réseaux sociaux.
 * Un même projet de démonstration (marque créée par le studio à partir d'un produit de fournisseur) traverse
 * les sept modules. Ordinateur : la fenêtre du studio reste fixe et son contenu change au rythme du texte lu
 * (défilement natif, rien n'est bloqué). Téléphone : rail des modules collé en haut et un aperçu sous chaque texte.
 * Mouvement réduit : tout est affiché tel quel, sans transition.
 */
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, Clapperboard, Clock, FileText, Image as ImageIcon, Megaphone, Palette, Play, Share2, Store } from "lucide-react";
import { cx } from "../ui";
import { useT } from "../i18n";

export type StoryDemo = {
  brand: string;
  product: string;
  logo: string;
  palette: string[];
  fonts: { heading: string; body: string; accent: string };
  direction: string;
  shopDesktop: string;
  shopMobile: string;
  cutout: string;
  packshot: string;
  detail: string;
  scene1: string;
  scene2: string;
  social: string;
  ad: string;
  banner: string;
  videoPoster: string;
};

export type StoryStep = { key: string; label: string; title: string; text: string; points: string[] };

const ICONS = { brand: Palette, store: Store, images: ImageIcon, ads: Megaphone, video: Clapperboard, seo: FileText, social: Share2 } as Record<string, typeof Palette>;

function Img({ src, alt, className, contain }: { src: string; alt: string; className?: string; contain?: boolean }) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={cx("size-full", contain ? "object-contain" : "object-cover", className)} />;
}

/** Contenu de la fenêtre pour chaque module (aperçus construits avec les fichiers réels de la démonstration). */
function Panel({ k, d }: { k: string; d: StoryDemo }) {
  const t = useT();
  if (k === "brand")
    return (
      <div className="grid h-full grid-rows-[1fr_auto] gap-3 p-4 sm:p-5">
        <div className="grid grid-cols-[1.1fr_1fr] gap-3">
          <div className="grid place-items-center rounded-2xl border border-line bg-[#F2F3F7] p-4">
            <img src={d.logo} alt={t(`Logo ${d.brand}`, `${d.brand} logo`)} className="max-h-28 w-auto object-contain" loading="lazy" />
          </div>
          <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper-2 p-4">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{t("Typographies", "Typefaces")}</p>
            <p className="font-display text-4xl font-semibold leading-none text-ink">Aa</p>
            <ul className="grid gap-0.5 text-xs text-ink-2">
              <li>{t("Titres", "Headings")} · {d.fonts.heading}</li>
              <li>{t("Accent", "Accent")} · <span className="serif-i">{d.fonts.accent}</span></li>
              <li>{t("Texte", "Body")} · {d.fonts.body}</li>
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-card p-3">
          <div className="flex h-12 overflow-hidden rounded-xl">
            {d.palette.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}
          </div>
          <div className="mt-2 flex justify-between gap-1 font-mono text-xs text-muted sm:text-xs">
            {d.palette.map((c) => <span key={c}>{c}</span>)}
          </div>
          <p className="mt-2 text-xs text-ink-2">{t(`Palette mesurée sur le produit · direction « ${d.direction} »`, `Palette measured on the product · “${d.direction}” direction`)}</p>
        </div>
      </div>
    );
  if (k === "store")
    return (
      <div className="relative h-full p-4 sm:p-5">
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <div className="flex items-center gap-1 border-b border-line px-2.5 py-1.5"><span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" /><span className="ml-2 truncate text-xs text-muted">{d.brand.toLowerCase()}.myshopify.com</span></div>
          <img src={d.shopDesktop} alt={t(`Boutique ${d.brand} sur ordinateur`, `${d.brand} store on desktop`)} loading="lazy" className="aspect-[16/10] w-full object-cover object-left-top" />
        </div>
        <div className="absolute bottom-3 right-4 w-[27%] overflow-hidden rounded-[1.1rem] border-[4px] border-[var(--hp-frame)] bg-[var(--hp-frame)] shadow-2xl sm:right-6">
          <img src={d.shopMobile} alt={t(`Boutique ${d.brand} sur téléphone`, `${d.brand} store on mobile`)} loading="lazy" className="aspect-[9/19] w-full object-cover object-top" />
        </div>
      </div>
    );
  if (k === "images") {
    const tiles: [string, string][] = [[d.cutout, t("Détourage", "Cutout")], [d.packshot, "Packshot"], [d.scene1, t("Scène", "Scene")], [d.detail, t("Détail", "Detail")]];
    return (
      <div className="grid h-full grid-cols-2 grid-rows-2 gap-2.5 p-4 sm:gap-3 sm:p-5">
        {tiles.map(([src, l], i) => (
          <figure key={src} className={cx("relative overflow-hidden rounded-2xl border border-line", i === 0 ? "bg-[repeating-conic-gradient(#E9ECF3_0_25%,#fff_0_50%)] [background-size:16px_16px]" : "bg-paper-2")}>
            <Img src={src} alt={l} contain={i === 0} className={i === 0 ? "p-3" : ""} />
            <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">{l}</figcaption>
          </figure>
        ))}
      </div>
    );
  }
  if (k === "ads")
    return (
      <div className="grid h-full grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] gap-3 p-4 sm:p-5">
        <div className="relative mx-auto aspect-[9/16] h-full max-w-full overflow-hidden rounded-2xl border border-line bg-[#F6F6F9]">
          <Img src={d.ad} alt={t(`Publicité ${d.brand} au format 9:16`, `${d.brand} 9:16 ad`)} />
          {/* Sélection d'un élément, comme dans l'éditeur du studio */}
          <span className="pointer-events-none absolute left-[5%] top-[8%] h-[7.5%] w-[84%] rounded-md border-2 border-[#2F4BD8]" aria-hidden>
            <span className="absolute -left-1 -top-1 size-2 rounded-sm bg-[#2F4BD8]" /><span className="absolute -right-1 -top-1 size-2 rounded-sm bg-[#2F4BD8]" /><span className="absolute -bottom-1 -left-1 size-2 rounded-sm bg-[#2F4BD8]" /><span className="absolute -bottom-1 -right-1 size-2 rounded-sm bg-[#2F4BD8]" />
          </span>
        </div>
        <div className="flex flex-col gap-2.5 text-xs">
          <div className="rounded-2xl border border-line bg-card p-3">
            <p className="font-semibold text-ink">{t("Titre sélectionné", "Selected heading")}</p>
            <p className="mt-1.5 rounded-lg border border-line bg-paper-2 px-2 py-1.5 text-ink-2">{t("Des objets à vivre.", "Objects to live with.")}</p>
          </div>
          {[t("Remplacer la photo", "Replace the photo"), t("Déplacer le logo", "Move the logo"), t("Modifier une forme", "Edit a shape")].map((l) => (
            <p key={l} className="flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-ink-2"><Check className="size-3.5 text-signal" aria-hidden /> {l}</p>
          ))}
          <div className="mt-auto flex flex-wrap gap-1.5">{["1:1", "4:5", "9:16", "16:9"].map((f) => <span key={f} className="rounded-full border border-line bg-paper-2 px-2 py-0.5 font-medium text-ink-2">{f}</span>)}</div>
        </div>
      </div>
    );
  if (k === "video") {
    const shots: [string, string][] = [[d.packshot, t("Ouverture", "Opening")], [d.detail, t("Détail", "Detail")], [d.scene1, t("Usage", "In use")], [d.banner, t("Appel à l'action", "Call to action")]];
    return (
      <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-[#070B17]">
          <Img src={d.videoPoster} alt={t(`Image de la vidéo ${d.brand}`, `${d.brand} video frame`)} className="opacity-90" />
          <span className="absolute inset-0 grid place-items-center"><span className="grid size-12 place-items-center rounded-full bg-white/90 text-[#0B1533] shadow-lg"><Play className="size-5" aria-hidden /></span></span>
          <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{t("Rendu MP4 après votre accord", "MP4 render after your approval")}</span>
        </div>
        <ol className="grid grid-cols-4 gap-2">
          {shots.map(([src, l], i) => (
            <li key={i} className="overflow-hidden rounded-xl border border-line bg-card">
              <img src={src} alt="" aria-hidden loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <p className="truncate px-1.5 py-1 text-xs text-ink-2"><span className="font-semibold text-ink">{i + 1}</span> · {l}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }
  if (k === "seo")
    return (
      <div className="grid h-full grid-cols-1 gap-3 p-4 sm:grid-cols-[1.35fr_1fr] sm:p-5">
        <article className="overflow-hidden rounded-2xl border border-line bg-card p-4 text-xs leading-relaxed text-ink-2">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{t("Fiche produit · modifiable", "Product page · editable")}</p>
          <h4 className="mt-2 font-display text-lg font-semibold leading-tight text-ink">{d.product}</h4>
          <p className="mt-1.5">{t("Oreiller ergonomique en forme de papillon.", "Butterfly-shaped ergonomic pillow.")}</p>
          <ul className="mt-2 grid gap-1">
            <li>• {t("Coloris : deux teintes", "Colors: two shades")}</li>
            <li>• {t("Garantie :", "Warranty:")} <mark className="rounded bg-[#FCEBD0] px-1 text-[#7A4500]">{t("[À compléter]", "[To complete]")}</mark></li>
          </ul>
          <p className="mt-3 font-semibold text-ink">FAQ</p>
          <p>{t("Comment l'entretenir ?", "How do I care for it?")}</p>
        </article>
        <div className="hidden flex-col gap-2 text-xs sm:flex">
          {[[t("Titre SEO", "SEO title"), t("longueur vérifiée", "length checked")], [t("Méta-description", "Meta description"), t("présente", "present")], ["FAQ", t("au moins deux questions", "at least two questions")], [t("Faits inventés", "Invented facts"), t("aucun : les manques sont signalés", "none: gaps are flagged")]].map(([a, b]) => (
            <p key={a} className="rounded-xl border border-line bg-card px-3 py-2"><span className="flex items-center gap-1.5 font-semibold text-ink"><Check className="size-3.5 text-signal" aria-hidden /> {a}</span><span className="text-muted">{b}</span></p>
          ))}
        </div>
      </div>
    );
  // social
  const days = [t("Lun", "Mon"), t("Mar", "Tue"), t("Mer", "Wed"), t("Jeu", "Thu"), t("Ven", "Fri"), t("Sam", "Sat"), t("Dim", "Sun")];
  const posts: Record<number, [string, string, "review" | "ok" | "sched"]> = { 0: [d.social, "Instagram", "ok"], 2: [d.scene2, "Facebook", "sched"], 4: [d.banner, "Pinterest", "review"], 5: [d.scene1, "TikTok", "review"] };
  const status = { review: t("À valider", "To approve"), ok: t("Approuvée", "Approved"), sched: t("Programmée", "Scheduled") };
  return (
    <div className="flex h-full flex-col gap-3 p-4 sm:p-5">
      <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 font-semibold text-ink"><CalendarDays className="size-4 text-signal" aria-hidden /> {t("Semaine type", "Sample week")}</span><span className="text-muted">{t("Rien ne part sans votre accord", "Nothing goes out without your approval")}</span></div>
      <div className="grid grid-cols-7 gap-1.5" aria-hidden>
        {days.map((dd, i) => (
          <div key={dd} className={cx("flex flex-col items-center gap-1 rounded-xl border py-2", posts[i] ? "border-line bg-card" : "border-transparent")}>
            <span className="text-xs font-semibold text-muted">{dd}</span>
            <span className={cx("size-1.5 rounded-full", posts[i] ? "bg-signal" : "bg-line")} />
          </div>
        ))}
      </div>
      <ul className="grid min-h-0 flex-1 content-start gap-2">
        {Object.entries(posts).map(([day, [src, net, st]]) => (
          <li key={day} className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
            <img src={src} alt="" aria-hidden loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{net}</span>
              <span className="block text-xs text-muted">{days[Number(day)]} · {["18:00", "", "12:30", "", "20:00", "11:00"][Number(day)]}</span>
            </span>
            <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", st === "review" ? "bg-[#FCEBD0] text-[#7A4500]" : st === "ok" ? "bg-[#DDF2E6] text-[#165C3A]" : "bg-[#E9EDFD] text-[#2F4BD8]")}>
              {st === "review" ? <Clock className="size-3" aria-hidden /> : st === "ok" ? <Check className="size-3" aria-hidden /> : <CalendarDays className="size-3" aria-hidden />} {status[st]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StoryScroll({ steps, demo }: { steps: StoryStep[]; demo: StoryDemo }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);
  const rail = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setActive(Number((e.target as HTMLElement).dataset.i))), { rootMargin: "-42% 0px -42% 0px" });
    refs.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);
  // Téléphone : la pastille du module en cours reste visible dans le rail.
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>(`[data-k="${active}"]`);
    const box = rail.current;
    if (el && box) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [active]);
  const go = (i: number) => refs.current[i]?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  return (
    <div className="relative">
      {/* Rail des modules (téléphone et tablette) */}
      <div className="hp-glass sticky top-16 z-30 -mx-4 border-y border-line/70 px-4 py-2.5 sm:top-[72px] sm:-mx-6 sm:px-6 lg:hidden">
        <div ref={rail} className="scrollbar-none flex gap-1.5 overflow-x-auto" role="list" aria-label={t("Modules du studio", "Studio modules")}>
          {steps.map((s, i) => {
            const Icon = ICONS[s.key];
            return (
              <button key={s.key} type="button" role="listitem" data-k={i} onClick={() => go(i)} aria-current={i === active ? "step" : undefined} className={cx("inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition", i === active ? "bg-ink text-paper" : "bg-card text-ink-2 ring-1 ring-line")}>
                <Icon className="size-3.5" aria-hidden /> {s.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full rounded-full bg-signal transition-[width] duration-500" style={{ width: `${((active + 1) / steps.length) * 100}%` }} /></div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <ol className="grid min-w-0">
          {steps.map((s, i) => {
            const Icon = ICONS[s.key];
            return (
              <li key={s.key} ref={(el) => void (refs.current[i] = el)} data-i={i} id={`module-${s.key}`} className={cx("scroll-mt-40 py-10 lg:flex lg:flex-col lg:justify-center lg:py-0", i === 0 ? "lg:min-h-[64vh]" : "lg:min-h-[78vh]", "lg:transition-opacity lg:duration-500", i === active ? "lg:opacity-100" : "lg:opacity-40")}>
                <p className="flex items-center gap-3 text-sm font-semibold text-signal">
                  <span className="grid size-9 place-items-center rounded-xl bg-signal-soft"><Icon className="size-4" aria-hidden /></span>
                  <span className="font-display tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-ink-2">{s.label}</span>
                </p>
                <h3 className="hp-title mt-4 text-[clamp(1.9rem,3.4vw,2.9rem)]">{s.title}</h3>
                <p className="hp-lead mt-4 max-w-lg">{s.text}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {s.points.map((p) => <li key={p} className="hp-chip"><Check className="size-3.5 text-signal" aria-hidden /> {p}</li>)}
                </ul>
                {/* Aperçu du module sous le texte (téléphone et tablette) */}
                <div className="hp-window mt-7 lg:hidden">
                  <div className="hp-window-bar"><span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" /><span className="ml-2 truncate text-xs text-muted">{demo.brand} · {s.label}</span></div>
                  <div className="relative aspect-[4/5] bg-paper-2 sm:aspect-[4/3]"><div className="absolute inset-0"><Panel k={s.key} d={demo} /></div></div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Fenêtre fixe du studio (ordinateur) */}
        <div className="hidden min-w-0 lg:block">
          <div className="sticky top-[calc(50vh-17rem)]">
            <div className="hp-window">
              <div className="hp-window-bar">
                <span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" />
                <span className="ml-2 truncate text-xs text-muted">{t("Studio", "Studio")} · {demo.brand}</span>
                <span className="ml-auto rounded-full bg-signal-soft px-2 py-0.5 text-xs font-semibold text-signal">{t("Démonstration", "Demo")}</span>
              </div>
              <div className="grid grid-cols-[176px_minmax(0,1fr)]">
                <nav className="border-r border-line bg-paper-2/60 p-2" aria-label={t("Modules du studio", "Studio modules")}>
                  {steps.map((s, i) => {
                    const Icon = ICONS[s.key];
                    return (
                      <button key={s.key} type="button" onClick={() => go(i)} aria-current={i === active ? "step" : undefined} className={cx("mb-0.5 flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium transition", i === active ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink")}>
                        <Icon className={cx("size-4", i === active ? "text-signal" : "")} aria-hidden /> {s.label}
                      </button>
                    );
                  })}
                </nav>
                <div className="relative h-[30rem] bg-paper-2/40">
                  {steps.map((s, i) => (
                    <div key={s.key} className={cx("hp-panel", i === active && "on")} aria-hidden={i !== active}>
                      <Panel k={s.key} d={demo} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-1 bg-line" aria-hidden><div className="h-full bg-signal transition-[width] duration-500" style={{ width: `${((active + 1) / steps.length) * 100}%` }} /></div>
            </div>
            <p className="mt-3 text-xs text-muted">{t(`Démonstration : la marque ${demo.brand} et ses contenus ont été créés par le studio, sans l'IA des forfaits, à partir d'un produit vendu en marque blanche. Ce n'est pas un résultat client.`, `Demo: the ${demo.brand} brand and its content were created by the studio, without the plans' AI, from a white-label product. This is not a client result.`)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
