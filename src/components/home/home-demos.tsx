"use client";
/**
 * Démonstrations interactives légères de l'accueil. Tout se passe dans le navigateur : aucun appel au serveur,
 * aucune IA, aucune donnée client. Les visuels sont ceux des démonstrations publiques (marques créées par le studio
 * à partir de produits de fournisseurs) et chaque bloc le dit.
 */
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, Clock, Monitor, Pause, Play, RotateCcw, Smartphone, Undo2 } from "lucide-react";
import { cx } from "../ui";
import { onTabKeys } from "./tabs";
import { useT } from "../i18n";

// ------------------------------------------------------------------------------------------------ Marque

export type BrandDemo = { id: string; brand: string; sector: string; direction: string; palette: string[]; logo: string; photo: string; fonts: { heading: string; body: string } };

const SERIF = /baskerville|lora|playfair|cormorant/i;

export function BrandLab({ brands }: { brands: BrandDemo[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const b = brands[i];
  if (!b) return null;
  const light = b.palette[3] ?? "#F5F5F5";
  const dark = b.palette[4] ?? "#111";
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-10">
      <div role="tablist" onKeyDown={(e) => onTabKeys(e, i, brands.length, setI)} aria-label={t("Marques de démonstration", "Demo brands")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:grid lg:content-start lg:gap-2 lg:overflow-visible lg:px-0">
        {brands.map((x, k) => (
          <button key={x.id} type="button" role="tab" tabIndex={k === i ? 0 : -1} aria-selected={k === i} onClick={() => setI(k)} className={cx("flex shrink-0 cursor-pointer items-center gap-3 rounded-2xl border p-2.5 pr-4 text-left transition lg:w-full", k === i ? "border-line bg-card hp-elev" : "border-transparent hover:bg-card/60")}>
            <span className="flex h-9 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-line">{x.palette.slice(0, 3).map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
            <span>
              <span className="block font-display text-[15px] font-semibold leading-tight">{x.brand}</span>
              <span className="block text-xs text-muted">{x.sector}</span>
            </span>
          </button>
        ))}
      </div>
      <div role="tabpanel" key={b.id} className="grid gap-3 [animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both] sm:grid-cols-6">
        <figure className="relative col-span-6 grid min-h-56 place-items-center overflow-hidden rounded-3xl border border-line p-8 sm:col-span-4" style={{ background: light }}>
          <img src={b.logo} alt={t(`Logo ${b.brand} créé par le studio`, `${b.brand} logo created by the studio`)} className="max-h-36 w-auto object-contain" />
          <figcaption className="absolute bottom-3 left-4 text-xs font-medium" style={{ color: dark }}>{t("Logo vectoriel (SVG)", "Vector logo (SVG)")}</figcaption>
        </figure>
        <figure className="col-span-3 overflow-hidden rounded-3xl border border-line bg-card sm:col-span-2">
          <img src={b.photo} alt={t(`Photo de départ du produit ${b.brand}`, `${b.brand} starting product photo`)} loading="lazy" className="aspect-square w-full object-cover" />
          <figcaption className="px-3 py-2 text-xs text-muted">{t("Photo de départ", "Starting photo")}</figcaption>
        </figure>
        <div className="col-span-3 flex flex-col justify-between rounded-3xl border border-line bg-card p-5 sm:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{t("Typographies", "Typefaces")}</p>
          <p className={cx("my-3 text-5xl leading-none text-ink", SERIF.test(b.fonts.heading) ? "font-serif" : "font-display font-semibold")}>Aa</p>
          <p className="text-sm text-ink-2">{b.fonts.heading} <span className="text-muted">/</span> {b.fonts.body}</p>
        </div>
        <div className="col-span-6 rounded-3xl border border-line bg-card p-5 sm:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{t("Palette", "Palette")}</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {b.palette.map((c) => (
              <span key={c} className="grid gap-1.5">
                <span className="aspect-square rounded-xl ring-1 ring-line" style={{ background: c }} />
                <span className="truncate text-center font-mono text-xs text-muted">{c}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-2">{t(`Direction « ${b.direction} »`, `“${b.direction}” direction`)}</p>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Boutique

export type StoreDemo = { id: string; label: string; text: string; desktop: string; mobile: string; caption: string };

export function StoreDevices({ stores }: { stores: StoreDemo[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const s = stores[i];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" onKeyDown={(e) => onTabKeys(e, i, stores.length, setI)} aria-label={t("Type de site", "Site type")} className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {stores.map((x, k) => (
            <button key={x.id} type="button" role="tab" tabIndex={k === i ? 0 : -1} aria-selected={k === i} onClick={() => setI(k)} className={cx("h-11 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium transition", k === i ? "bg-ink text-paper" : "bg-card text-ink-2 ring-1 ring-line hover:text-ink")}>
              {x.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label={t("Appareil", "Device")} className="inline-flex rounded-full bg-card p-1 ring-1 ring-line">
          {([["desktop", Monitor, t("Ordinateur", "Desktop")], ["mobile", Smartphone, t("Téléphone", "Mobile")]] as const).map(([k, Icon, l]) => (
            <button key={k} type="button" aria-pressed={device === k} onClick={() => setDevice(k)} className={cx("inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition", device === k ? "bg-signal text-signal-ink" : "text-ink-2 hover:text-ink")}>
              <Icon className="size-4" aria-hidden /> {l}
            </button>
          ))}
        </div>
      </div>
      <div className="relative mt-6 grid min-h-[22rem] place-items-center overflow-hidden rounded-[2rem] border border-line bg-paper-2 p-4 sm:min-h-[34rem] sm:p-8">
        <div className="hp-aura pointer-events-none absolute inset-0" aria-hidden />
        {device === "desktop" ? (
          <div key={`d-${s.id}`} className="hp-window relative w-full max-w-4xl [animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both]">
            <div className="hp-window-bar"><span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" /><span className="ml-2 truncate text-xs text-muted">{s.caption}</span></div>
            <img src={s.desktop} alt={t(`${s.label} : page d'accueil sur ordinateur`, `${s.label}: home page on desktop`)} loading="lazy" className="aspect-[16/10] w-full object-cover object-top" />
          </div>
        ) : (
          <div key={`m-${s.id}`} className="relative w-[min(17rem,70vw)] overflow-hidden rounded-[2.4rem] border-[7px] border-[var(--hp-frame)] bg-[var(--hp-frame)] shadow-2xl [animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both]">
            <span className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-[var(--hp-frame)]" aria-hidden />
            <img src={s.mobile} alt={t(`${s.label} : page d'accueil sur téléphone`, `${s.label}: home page on mobile`)} loading="lazy" className="aspect-[9/19] w-full rounded-[1.8rem] object-cover object-top" />
          </div>
        )}
      </div>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ink-2">{s.text}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Éditeur de publicité

const backgroundsColor = (list: string[], i: number) => list[i] ?? list[0];

export function AdEditorDemo({ cutout, logo, palette, brand }: { cutout: string; logo: string; palette: string[]; brand: string }) {
  const t = useT();
  const id = useId();
  const [title, setTitle] = useState(t("Des nuits plus douces.", "Softer nights."));
  const [cta, setCta] = useState(t("Découvrir", "Discover"));
  const backgrounds = [palette[3] ?? "#F2F3F7", palette[1] ?? "#D3D4D9", palette[0] ?? "#454873", palette[4] ?? "#14151F"];
  const [bg, setBg] = useState(0);
  const [logoPos, setLogoPos] = useState<"tl" | "tr" | "bl">("tl");
  const [format, setFormat] = useState<"1:1" | "4:5" | "9:16">("4:5");
  const [sel, setSel] = useState<"title" | "cta" | "logo" | "photo">("title");
  const darkBg = bg >= 2;
  const ink = darkBg ? "#FFFFFF" : "#14151F";
  const aspect = { "1:1": "1 / 1", "4:5": "4 / 5", "9:16": "9 / 16" }[format];
  const ring = (k: typeof sel) => (sel === k ? "outline outline-2 outline-offset-4 outline-[#5A63E8]" : "");
  const reset = () => {
    setTitle(t("Des nuits plus douces.", "Softer nights."));
    setCta(t("Découvrir", "Discover"));
    setBg(0);
    setLogoPos("tl");
    setFormat("4:5");
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center">
      <div className="grid place-items-center rounded-[2rem] border border-line bg-paper-2 p-5 sm:p-8">
        {/* Changement de format : nouvelle mise en page qui apparaît en fondu (pas d'animation de taille, cf. layout-shift-avoid). */}
        <div key={format} className="relative w-full overflow-hidden rounded-2xl shadow-xl transition-[background-color] duration-500 [animation:hp-rise_.4s_cubic-bezier(.16,1,.3,1)_both]" style={{ aspectRatio: aspect, background: backgroundsColor(backgrounds, bg), maxWidth: format === "9:16" ? "17rem" : format === "1:1" ? "26rem" : "22rem" }}>
          {/* Le logo glisse d'un coin à l'autre : déplacement par transform dans une zone mesurée en unités de conteneur. */}
          <div className="hp-ad-area pointer-events-none absolute inset-x-[7%] inset-y-[6%] z-10">
            <button
              type="button"
              onClick={() => setSel("logo")}
              aria-label={t("Sélectionner le logo", "Select the logo")}
              className={cx("pointer-events-auto absolute left-0 top-0 h-11 w-16 cursor-pointer rounded-md transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none", ring("logo"))}
              style={{ transform: logoPos === "tr" ? "translateX(calc(100cqw - 100%))" : logoPos === "bl" ? "translate(calc(100cqw - 100%), calc(100cqh - 100%))" : "none" }}
            >
              <img src={logo} alt="" className={cx("size-full object-contain", darkBg && "invert")} />
            </button>
          </div>
          <button type="button" onClick={() => setSel("title")} className={cx("absolute left-[7%] right-[7%] top-[20%] z-10 min-h-11 cursor-pointer rounded py-1 text-left font-serif text-[clamp(1.4rem,4.4vw,2.2rem)] leading-[1.05]", ring("title"))} style={{ color: ink }}>
            {title || " "}
          </button>
          <button type="button" onClick={() => setSel("photo")} aria-label={t("Sélectionner la photo", "Select the photo")} className={cx("absolute bottom-[4%] right-[4%] z-0 h-[52%] w-[70%] cursor-pointer rounded-xl", ring("photo"))}>
            <img src={cutout} alt={t(`Produit ${brand} détouré`, `${brand} product cutout`)} loading="lazy" className="size-full object-contain drop-shadow-[0_20px_25px_rgba(0,0,0,.25)]" />
          </button>
          <button type="button" onClick={() => setSel("cta")} className={cx("absolute bottom-[8%] left-[7%] z-10 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", ring("cta"))} style={{ background: darkBg ? "#FFFFFF" : (palette[0] ?? "#454873"), color: darkBg ? "#14151F" : "#FFFFFF" }}>
            {cta || " "} <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="rounded-[1.75rem] border border-line bg-card p-5 hp-elev sm:p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-semibold">{t("Éditeur de publicité", "Ad editor")}</p>
          <button type="button" onClick={reset} className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-muted hover:text-ink"><RotateCcw className="size-3.5" aria-hidden /> {t("Réinitialiser", "Reset")}</button>
        </div>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-1.5 text-sm font-medium" htmlFor={`${id}-t`}>
            {t("Titre", "Heading")}
            <input id={`${id}-t`} value={title} maxLength={40} onFocus={() => setSel("title")} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl border border-line bg-paper px-3 text-base font-normal text-ink outline-none focus:border-signal" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium" htmlFor={`${id}-c`}>
            {t("Bouton", "Button")}
            <input id={`${id}-c`} value={cta} maxLength={18} onFocus={() => setSel("cta")} onChange={(e) => setCta(e.target.value)} className="h-11 rounded-xl border border-line bg-paper px-3 text-base font-normal text-ink outline-none focus:border-signal" />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">{t("Fond (couleurs de la marque)", "Background (brand colors)")}</legend>
            <div className="mt-2 flex gap-2">
              {backgrounds.map((c, k) => (
                <button key={k} type="button" onClick={() => setBg(k)} aria-pressed={bg === k} aria-label={c} className={cx("size-11 cursor-pointer rounded-full ring-1 ring-line transition", bg === k && "ring-2 ring-signal ring-offset-2 ring-offset-card")} style={{ background: c }} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">{t("Position du logo", "Logo position")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([["tl", t("En haut à gauche", "Top left")], ["tr", t("En haut à droite", "Top right")], ["bl", t("En bas à droite", "Bottom right")]] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => (setLogoPos(k), setSel("logo"))} aria-pressed={logoPos === k} className={cx("h-11 cursor-pointer rounded-full px-3.5 text-sm transition", logoPos === k ? "bg-ink text-paper" : "bg-paper-2 text-ink-2 hover:text-ink")}>{l}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">{t("Format", "Format")}</legend>
            <div className="mt-2 flex gap-2">
              {(["1:1", "4:5", "9:16"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={cx("h-11 min-w-14 cursor-pointer rounded-full px-3.5 text-sm font-medium transition", format === f ? "bg-signal text-signal-ink" : "bg-paper-2 text-ink-2 hover:text-ink")}>{f}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-muted">{t("Démonstration simplifiée. Dans le studio, l'éditeur ouvre une publicité générée : vous changez le texte, la photo, les formes et la place du logo, puis vous enregistrez et exportez, sans appel à l'IA.", "Simplified demo. In the studio, the editor opens a generated ad: you change the text, photo, shapes and logo placement, then save and export, with no AI call.")}</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Textes (SEO)

type Doc = { tab: string; kind: string; blocks: { k: "h1" | "p" | "li" | "faq"; text: string }[]; meta: string };

export function SeoDocDemo({ docs }: { docs: Doc[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const d = docs[i];
  const mark = (key: string) => setEdited((e) => (e[key] ? e : { ...e, [key]: true }));
  const anyEdited = Object.keys(edited).some((k) => k.startsWith(`${i}-`));
  const Text = ({ text }: { text: string }) => {
    // Les manques restent visibles : « [À compléter : …] » est surligné.
    const parts = text.split(/(\[[^\]]+\])/g);
    return <>{parts.map((p, k) => (p.startsWith("[") ? <mark key={k} className="rounded bg-[#FCEBD0] px-1 text-[#7A4500]">{p}</mark> : p))}</>;
  };
  return (
    <div className="hp-window">
      <div className="hp-window-bar !py-2">
        <div role="tablist" onKeyDown={(e) => onTabKeys(e, i, docs.length, setI)} aria-label={t("Type de contenu", "Content type")} className="scrollbar-none flex gap-1 overflow-x-auto">
          {docs.map((x, k) => (
            <button key={x.tab} type="button" role="tab" tabIndex={k === i ? 0 : -1} aria-selected={k === i} onClick={() => setI(k)} className={cx("h-11 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-medium transition", k === i ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink")}>{x.tab}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-0 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article key={i} className="p-5 sm:p-7 [animation:hp-rise_.4s_cubic-bezier(.16,1,.3,1)_both]">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted">{d.kind}</p>
          {d.blocks.map((b, k) => {
            const key = `${i}-${k}`;
            const common = { contentEditable: true, suppressContentEditableWarning: true, spellCheck: false, onInput: () => mark(key), className: "rounded-md outline-none transition focus:bg-signal-soft/60 focus:ring-2 focus:ring-signal/40 hover:bg-paper-2" } as const;
            if (b.k === "h1") return <h4 key={key} {...common} className={cx(common.className, "mt-2 font-display text-2xl font-semibold leading-tight text-ink sm:text-[1.7rem]")}><Text text={b.text} /></h4>;
            if (b.k === "li") return <p key={key} {...common} className={cx(common.className, "mt-1.5 pl-4 text-[15px] text-ink-2 before:-ml-4 before:mr-2 before:content-['•']")}><Text text={b.text} /></p>;
            if (b.k === "faq") return <p key={key} {...common} className={cx(common.className, "mt-4 border-t border-line pt-3 text-[15px] font-semibold text-ink")}><Text text={b.text} /></p>;
            return <p key={key} {...common} className={cx(common.className, "mt-3 text-[15px] leading-relaxed text-ink-2")}><Text text={b.text} /></p>;
          })}
          <p className="mt-5 text-xs text-muted">{t("Cliquez sur un texte pour le modifier.", "Click any text to edit it.")}</p>
        </article>
        <aside className="border-t border-line bg-paper-2/50 p-5 text-sm md:border-l md:border-t-0 sm:p-6">
          <p className="font-semibold text-ink">{t("Référencement", "SEO")}</p>
          <p className="mt-2 rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink-2">{d.meta}</p>
          <ul className="mt-4 grid gap-2 text-xs text-ink-2">
            {[t("Titre et méta-description contrôlés", "Title and meta description checked"), t("Questions fréquentes structurées", "Structured FAQ"), t("Aucun chiffre ni avis inventé", "No invented figures or reviews")].map((l) => (
              <li key={l} className="flex gap-2"><Check className="mt-0.5 size-3.5 shrink-0 text-signal" aria-hidden /> {l}</li>
            ))}
          </ul>
          <p className={cx("mt-5 rounded-xl px-3 py-2.5 text-xs transition", anyEdited ? "bg-[#DDF2E6] text-[#165C3A]" : "bg-card text-muted ring-1 ring-line")} aria-live="polite">
            {anyEdited ? t("Modifié par vous : une régénération ne l'écrasera pas.", "Edited by you: a regeneration won't overwrite it.") : t("Texte du studio, pas encore modifié.", "Studio text, not edited yet.")}
          </p>
        </aside>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Réseaux sociaux

export type SocialPost = { day: number; time: string; network: string; image: string; caption: string };

export function SocialCalendarDemo({ posts }: { posts: SocialPost[] }) {
  const t = useT();
  const [status, setStatus] = useState<Record<number, "review" | "ok">>(() => Object.fromEntries(posts.map((_, k) => [k, k === 0 ? "ok" : "review"])));
  const [open, setOpen] = useState(1);
  const days = [t("Lun", "Mon"), t("Mar", "Tue"), t("Mer", "Wed"), t("Jeu", "Thu"), t("Ven", "Fri"), t("Sam", "Sat"), t("Dim", "Sun")];
  const p = posts[open];
  const approve = (k: number) => setStatus((s) => ({ ...s, [k]: s[k] === "ok" ? "review" : "ok" }));
  const done = Object.values(status).filter((x) => x === "ok").length;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)]">
      <div className="hp-window">
        <div className="hp-window-bar justify-between !gap-3">
          <span className="text-sm font-semibold text-ink">{t("Calendrier · semaine", "Calendar · week")}</span>
          <span className="text-xs text-muted" aria-live="polite">{t(`${done} sur ${posts.length} approuvées`, `${done} of ${posts.length} approved`)}</span>
        </div>
        {/* Téléphone : la semaine en liste (cases de 7 colonnes trop étroites pour le doigt) */}
        <ul className="grid gap-2 p-3 sm:hidden">
          {posts.map((x, k) => (
            <li key={k}>
              <button type="button" onClick={() => setOpen(k)} aria-pressed={open === k} className={cx("flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card p-2 text-left transition", open === k ? "border-signal ring-2 ring-signal/30" : "border-line")}>
                <img src={x.image} alt="" aria-hidden loading="lazy" className="size-14 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{x.network}</span>
                  <span className="block text-xs text-muted">{days[x.day]} · {x.time}</span>
                </span>
                <span className={cx("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", status[k] === "ok" ? "bg-[#DDF2E6] text-[#165C3A]" : "bg-[#FCEBD0] text-[#7A4500]")}>
                  {status[k] === "ok" ? <Check className="size-3" aria-hidden /> : <Clock className="size-3" aria-hidden />} {status[k] === "ok" ? t("Approuvée", "Approved") : t("À valider", "To approve")}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="hidden grid-cols-7 gap-2 p-4 sm:grid">
          {days.map((d, di) => (
            <div key={d} className="flex min-h-40 flex-col gap-1.5 rounded-xl bg-paper-2/70 p-1 sm:min-h-56 sm:p-1.5">
              <span className="py-1 text-center text-xs font-semibold text-muted">{d}</span>
              {posts.map((x, k) =>
                x.day !== di ? null : (
                  <button key={k} type="button" onClick={() => setOpen(k)} aria-pressed={open === k} aria-label={`${x.network}, ${d} ${x.time}`} className={cx("cursor-pointer overflow-hidden rounded-lg border bg-card text-left transition", open === k ? "border-signal ring-2 ring-signal/30" : "border-line hover:border-ink/30")}>
                    <img src={x.image} alt="" aria-hidden loading="lazy" className="aspect-square w-full object-cover" />
                    <span className="block truncate px-1 pt-1 text-xs font-semibold">{x.network}</span>
                    <span className={cx("mx-1 mb-1 mt-0.5 flex items-center justify-center rounded py-0.5 sm:justify-start sm:px-1", status[k] === "ok" ? "bg-[#DDF2E6] text-[#165C3A]" : "bg-[#FCEBD0] text-[#7A4500]")}>
                      {status[k] === "ok" ? <Check className="size-3" aria-hidden /> : <Clock className="size-3" aria-hidden />}
                      <span className="ml-1 hidden text-xs lg:inline">{status[k] === "ok" ? t("Approuvée", "Approved") : t("À valider", "To approve")}</span>
                    </span>
                  </button>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      {p && (
        <div key={open} className="rounded-[1.75rem] border border-line bg-card p-4 hp-elev [animation:hp-rise_.4s_cubic-bezier(.16,1,.3,1)_both] sm:p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{p.network}</span>
            <span className="text-muted">{days[p.day]} · {p.time}</span>
          </div>
          <img src={p.image} alt={t("Visuel de la publication (démonstration)", "Post visual (demo)")} loading="lazy" className="mt-3 aspect-[4/3] w-full rounded-2xl object-cover" />
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{p.caption}</p>
          <button type="button" onClick={() => approve(open)} className={cx("hp-btn mt-4 w-full", status[open] === "ok" ? "hp-btn-ghost" : "hp-btn-primary")}>
            {status[open] === "ok" ? <><Undo2 className="size-4" aria-hidden /> {t("Retirer l'approbation", "Withdraw approval")}</> : <><Check className="size-4" aria-hidden /> {t("Approuver cette publication", "Approve this post")}</>}
          </button>
          <p className="mt-3 text-xs text-muted">{t("Démonstration : rien n'est publié depuis cette page.", "Demo: nothing is published from this page.")}</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Tout est connecté

export type HubNode = { key: string; label: string; text: string };

export function ConnectedHub({ nodes, center }: { nodes: HubNode[]; center: string }) {
  const t = useT();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true); // rotation automatique (arrêtée par un choix ou le bouton pause)
  const [hold, setHold] = useState(false); // focus clavier : rotation suspendue
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setAuto(false);
    if (!auto || hold) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.3 });
    if (root.current) io.observe(root.current);
    const id = window.setInterval(() => visible && setActive((a) => (a + 1) % nodes.length), 3200);
    return () => (io.disconnect(), window.clearInterval(id));
  }, [auto, hold, nodes.length]);
  const n = nodes.length;
  const pos = nodes.map((_, k) => {
    const a = (-90 + (360 / n) * k) * (Math.PI / 180);
    return { x: 50 + Math.cos(a) * 38, y: 50 + Math.sin(a) * 38 };
  });
  const pick = (k: number) => (setAuto(false), setActive(k));
  return (
    <div
      ref={root}
      onFocus={() => setHold(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setHold(false)}
      className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14"
    >
      <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
          <circle cx="50" cy="50" r="38" fill="none" stroke="var(--line)" strokeWidth=".3" />
          {pos.map((p, k) => (
            <line key={k} x1="50" y1="50" x2={p.x} y2={p.y} stroke={k === active ? "var(--signal)" : "var(--line)"} strokeWidth={k === active ? ".6" : ".35"} className={k === active ? "hp-flow" : ""} />
          ))}
        </svg>
        <div className="absolute left-1/2 top-1/2 grid size-[30%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-line bg-card text-center hp-elev">
          <span className="px-2">
            <span className="block text-xs font-semibold uppercase tracking-[.16em] text-muted sm:text-xs">{t("Un projet", "One project")}</span>
            <span className="mt-1 block font-display text-sm font-semibold leading-tight sm:text-lg">{center}</span>
          </span>
        </div>
        {nodes.map((x, k) => (
          <button key={x.key} type="button" onClick={() => pick(k)} onMouseEnter={() => pick(k)} aria-pressed={k === active} className={cx("absolute min-h-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer whitespace-nowrap rounded-full border px-3 text-[13px] font-semibold transition sm:px-4 sm:text-sm", k === active ? "border-signal bg-signal text-signal-ink shadow-lg" : "border-line bg-card text-ink-2 hover:border-ink/30")} style={{ left: `${pos[k].x}%`, top: `${pos[k].y}%` }}>
            {x.label}
          </button>
        ))}
      </div>
      <div key={active} className="[animation:hp-rise_.4s_cubic-bezier(.16,1,.3,1)_both]" aria-live="polite">
        <p className="hp-eyebrow">{nodes[active].label}</p>
        <p className="mt-3 font-display text-2xl font-semibold leading-snug sm:text-3xl">{nodes[active].text}</p>
        <button type="button" onClick={() => setAuto((a) => !a)} aria-pressed={!auto} className="hp-btn hp-btn-ghost mt-6 !min-h-11 !px-4 !text-sm">
          {auto ? <><Pause className="size-4" aria-hidden /> {t("Arrêter la rotation", "Stop rotating")}</> : <><Play className="size-4" aria-hidden /> {t("Reprendre la rotation", "Resume rotating")}</>}
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ Personnalisation

export function ControlDemo({ brand, image, palette }: { brand: string; image: string; palette: string[] }) {
  const t = useT();
  const id = useId();
  const initial = { title: t("Des objets à vivre.", "Objects to live with."), color: 0, round: true, banner: true };
  const [s, setS] = useState(initial);
  const [versions, setVersions] = useState<(typeof initial)[]>([initial]);
  const colors = [palette[0] ?? "#454873", palette[2] ?? "#8D74B4", palette[4] ?? "#14151F"];
  const commit = (next: typeof initial) => {
    setS(next);
    setVersions((v) => [...v.slice(-4), next]);
  };
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
      <div className="hp-window">
        <div className="hp-window-bar"><span className="hp-dot" /><span className="hp-dot" /><span className="hp-dot" /><span className="ml-2 truncate text-xs text-muted">{t("Aperçu de la boutique", "Store preview")} · {brand}</span></div>
        <div className="bg-[#F7F7FA] text-[#14151F]">
          {s.banner && <p className="bg-[#14151F] py-1.5 text-center text-xs tracking-wide text-white">{t("Livraison : [À compléter]", "Shipping: [To complete]")}</p>}
          <div className="grid items-center gap-5 p-5 sm:grid-cols-2 sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[#454873]">{brand}</p>
              <p className="mt-2 font-display text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl">{s.title || " "}</p>
              <span className={cx("mt-5 inline-flex h-11 items-center gap-2 px-5 text-sm font-semibold text-white transition-all duration-300", s.round ? "rounded-full" : "rounded-md")} style={{ background: colors[s.color] }}>
                {t("Découvrir", "Discover")} <ArrowRight className="size-4" aria-hidden />
              </span>
            </div>
            <img src={image} alt={t(`Photo d'usage ${brand} (démonstration)`, `${brand} lifestyle photo (demo)`)} loading="lazy" className={cx("aspect-[4/3] w-full object-cover transition-all duration-300", s.round ? "rounded-2xl" : "rounded-md")} />
          </div>
        </div>
      </div>
      <div className="rounded-[1.75rem] border border-line bg-card p-5 hp-elev sm:p-6">
        <label htmlFor={`${id}-h`} className="grid gap-1.5 text-sm font-medium">
          {t("Titre de l'accueil", "Home heading")}
          <input id={`${id}-h`} value={s.title} maxLength={42} onChange={(e) => setS({ ...s, title: e.target.value })} onBlur={() => s.title !== versions[versions.length - 1].title && commit(s)} className="h-11 rounded-xl border border-line bg-paper px-3 text-base font-normal outline-none focus:border-signal" />
        </label>
        <fieldset className="mt-4">
          <legend className="text-sm font-medium">{t("Couleur du bouton", "Button color")}</legend>
          <div className="mt-2 flex gap-2">
            {colors.map((c, k) => <button key={c} type="button" aria-label={c} aria-pressed={s.color === k} onClick={() => commit({ ...s, color: k })} className={cx("size-11 cursor-pointer rounded-full ring-1 ring-line", s.color === k && "ring-2 ring-signal ring-offset-2 ring-offset-card")} style={{ background: c }} />)}
          </div>
        </fieldset>
        <div className="mt-4 grid gap-2">
          {([["round", t("Coins arrondis", "Rounded corners")], ["banner", t("Bandeau d'annonce", "Announcement bar")]] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl bg-paper-2 px-3 text-sm">
              {l}
              <input type="checkbox" checked={s[k]} onChange={(e) => commit({ ...s, [k]: e.target.checked })} className="size-5 accent-[var(--signal)]" />
            </label>
          ))}
        </div>
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-medium">{t("Versions", "Versions")}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {versions.map((v, k) => (
              <button key={k} type="button" onClick={() => setS(v)} className="h-11 min-w-11 cursor-pointer rounded-full bg-paper-2 px-3 text-sm font-medium text-ink-2 hover:text-ink">v{k + 1}</button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">{t("Chaque modification crée une version restaurable. Ici, rien n'est enregistré.", "Every change creates a restorable version. Nothing is saved here.")}</p>
        </div>
      </div>
    </div>
  );
}
