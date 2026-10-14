"use client";
/**
 * Vitrines de l'accueil bâties sur les créations réelles des démonstrations (public/demo/<id>/…) : le mur de
 * publications qui défile, les planches d'identité de marque et le fil de publications d'une marque.
 * Aucun appel au serveur : images statiques produites par le studio (scripts/build-demos.ts).
 */
import { useState } from "react";
import { BadgeCheck, Heart, MessageCircle, Send } from "lucide-react";
import { cx } from "../ui";
import { onTabKeys } from "./tabs";
import { useT } from "../i18n";

export type WallItem = { src: string; brand: string };

/** Deux rangées de publications qui défilent en sens inverse (immobiles si l'utilisateur réduit les animations). */
export function PostsWall({ items, label }: { items: WallItem[]; label: string }) {
  if (items.length < 6) return null;
  const half = Math.ceil(items.length / 2);
  const rows = [items.slice(0, half), items.slice(half)];
  return (
    <div className="relative -mx-4 overflow-hidden py-2 sm:-mx-6" aria-label={label} role="img">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper to-transparent sm:w-32" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper to-transparent sm:w-32" aria-hidden />
      {rows.map((row, r) => (
        <div key={r} className="group flex overflow-hidden py-2" aria-hidden>
          <div className={cx("hp-wall flex shrink-0 gap-3 pr-3 sm:gap-4 sm:pr-4", r === 1 && "hp-wall-rev")}>
            {[...row, ...row].map((x, k) => (
              <img key={k} src={x.src} alt="" loading="lazy" decoding="async" className="aspect-[4/5] w-36 shrink-0 rounded-2xl object-cover shadow-[0_18px_40px_-24px_rgba(10,16,40,.55)] ring-1 ring-black/5 sm:w-52" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export type BoardDemo = { id: string; brand: string; sector: string; board: string; palette: string[] };

/** Planches d'identité de marque, une par démonstration. */
export function BoardShowcase({ boards }: { boards: BoardDemo[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const b = boards[i];
  if (!b) return null;
  return (
    <div>
      <div role="tablist" onKeyDown={(e) => onTabKeys(e, i, boards.length, setI)} aria-label={t("Marques de démonstration", "Demo brands")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {boards.map((x, k) => (
          <button key={x.id} type="button" role="tab" tabIndex={k === i ? 0 : -1} aria-selected={k === i} onClick={() => setI(k)} className={cx("flex h-12 shrink-0 cursor-pointer items-center gap-3 rounded-full border pl-2 pr-4 text-sm transition", k === i ? "border-ink bg-ink text-paper" : "border-line bg-card text-ink-2 hover:border-ink/40")}>
            <span className="flex h-7 w-10 overflow-hidden rounded-full ring-1 ring-black/10">{x.palette.slice(0, 3).map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
            <span className="font-medium">{x.brand}</span>
            <span className={cx("hidden sm:inline", k === i ? "text-paper/60" : "text-muted")}>· {x.sector}</span>
          </button>
        ))}
      </div>
      <figure role="tabpanel" key={b.id} className="mt-6 overflow-hidden rounded-[1.75rem] border border-line bg-card hp-elev [animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both]">
        <img src={b.board} alt={t(`Planche d'identité de la marque ${b.brand} : logo, déclinaisons, palette, typographies, icônes, motif, papeterie et mises en situation`, `${b.brand} brand identity board: logo, variations, palette, typefaces, icons, pattern, stationery and mockups`)} loading="lazy" decoding="async" className="block h-auto w-full" />
      </figure>
    </div>
  );
}

export type FeedDemo = { id: string; brand: string; handle: string; logo: string; palette: string[]; posts: string[] };

/** Fil de publications d'une marque : grille de profil sur téléphone + publication mise en avant. */
export function FeedShowcase({ feeds }: { feeds: FeedDemo[] }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [sel, setSel] = useState(0);
  const f = feeds[i];
  if (!f) return null;
  const pick = (k: number) => (setI(k), setSel(0));
  const big = f.posts[sel] ?? f.posts[0];
  return (
    <div>
      <div role="tablist" onKeyDown={(e) => onTabKeys(e, i, feeds.length, pick)} aria-label={t("Marques de démonstration", "Demo brands")} className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {feeds.map((x, k) => (
          <button key={x.id} type="button" role="tab" tabIndex={k === i ? 0 : -1} aria-selected={k === i} onClick={() => pick(k)} className={cx("h-11 shrink-0 cursor-pointer rounded-full px-4 text-sm font-medium transition", k === i ? "bg-ink text-paper" : "bg-card text-ink-2 ring-1 ring-line hover:text-ink")}>
            {x.brand}
          </button>
        ))}
      </div>
      <div role="tabpanel" key={f.id} className="mt-8 grid items-center gap-8 [animation:hp-rise_.45s_cubic-bezier(.16,1,.3,1)_both] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        {/* Téléphone : profil de la marque */}
        <div className="mx-auto w-full max-w-[340px] rounded-[2.6rem] border-[10px] border-[#0B0F1E] bg-[#0B0F1E] shadow-[0_40px_80px_-40px_rgba(10,16,40,.6)]">
          <div className="overflow-hidden rounded-[2rem] bg-white text-[#0B0F1E]">
            <div className="flex items-center gap-3 px-4 pb-3 pt-5">
              <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full p-2 ring-2 ring-offset-2" style={{ background: f.palette[3] ?? "#F5F5F5", ["--tw-ring-color" as any]: f.palette[0] }}>
                {f.logo ? <img src={f.logo} alt="" className="max-h-full max-w-full object-contain" /> : null}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[15px] font-semibold">{f.handle} <BadgeCheck className="size-4 text-[#3897F0]" aria-hidden /></span>
                <span className="block text-xs text-[#5B6275]">{t(`${f.posts.length} publications préparées`, `${f.posts.length} posts prepared`)}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-0.5">
              {f.posts.slice(0, 9).map((src, k) => (
                <button key={src} type="button" onClick={() => setSel(k)} aria-pressed={sel === k} aria-label={t(`Afficher la publication ${k + 1}`, `Show post ${k + 1}`)} className={cx("relative cursor-pointer", sel === k && "after:absolute after:inset-0 after:ring-2 after:ring-inset after:ring-[#3897F0]")}>
                  <img src={src} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Publication mise en avant */}
        <figure className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[1.75rem] border border-line bg-card hp-elev">
          <div className="flex items-center gap-2.5 px-4 py-3">
            <span className="grid size-8 place-items-center overflow-hidden rounded-full p-1" style={{ background: f.palette[3] ?? "#F5F5F5" }}>{f.logo ? <img src={f.logo} alt="" className="max-h-full max-w-full object-contain" /> : null}</span>
            <span className="text-sm font-semibold">{f.handle}</span>
          </div>
          <img key={big} src={big} alt={t(`Publication créée par le studio pour ${f.brand}`, `Post created by the studio for ${f.brand}`)} className="aspect-[4/5] w-full object-cover [animation:hp-rise_.35s_cubic-bezier(.16,1,.3,1)_both]" />
          <div className="flex items-center gap-4 px-4 py-3 text-ink-2" aria-hidden>
            <Heart className="size-5" /><MessageCircle className="size-5" /><Send className="size-5" />
          </div>
          <figcaption className="px-4 pb-4 text-xs text-muted">{t("Démonstration : publication préparée par le studio, jamais publiée sans accord.", "Demo: a post prepared by the studio, never published without approval.")}</figcaption>
        </figure>
      </div>
    </div>
  );
}

export type ThemeShot = { id: string; name: string; src: string };

/** Les 30 thèmes en simples captures, sur deux rangées qui défilent lentement (pause au survol, fixes si mouvement réduit). */
export function ThemesWall({ themes, label }: { themes: ThemeShot[]; label: string }) {
  if (!themes.length) return null;
  const half = Math.ceil(themes.length / 2);
  const rows = [themes.slice(0, half), themes.slice(half)];
  return (
    <div className="relative overflow-hidden py-2" aria-label={label} role="img">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-paper-2 to-transparent sm:w-32" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-paper-2 to-transparent sm:w-32" aria-hidden />
      {rows.map((row, r) => (
        <div key={r} className="group flex overflow-hidden py-2.5" aria-hidden>
          <div className={cx("hp-wall flex shrink-0 gap-4 pr-4 sm:gap-5 sm:pr-5", r === 1 && "hp-wall-rev")}>
            {[...row, ...row].map((x, k) => (
              <img key={k} src={x.src} alt="" loading="lazy" decoding="async" className="aspect-[16/10] w-72 shrink-0 rounded-2xl object-cover object-top shadow-[0_22px_48px_-26px_rgba(10,16,40,.6)] ring-1 ring-black/5 sm:w-[26rem]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
