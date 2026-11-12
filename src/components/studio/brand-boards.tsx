"use client";
/**
 * Planches de marque de SINA (décision du propriétaire du 12 novembre 2026) : chaque identité se montre en situation,
 * dans SES couleurs et SES polices : la scène, le nom dessiné, l'idée, le nom, les signes, l'objet, le site sur
 * téléphone, des publications, le colis, la voix, ce qui reste à prouver.
 *
 * Mise en page reprise des planches faites à la main que le propriétaire a préférées (« les cartes ne sont pas toutes
 * droites […] beaucoup plus d'icônes, d'images […] les dégradés sont mieux faits ») : objets penchés, publications
 * décalées, tuiles translucides, fonds à lueurs, un dessin dans chaque partie.
 *
 * Tout est dessiné par les composants du Studio à partir de textes courts et de dessins déjà filtrés
 * (`brand-art.ts`) : aucun HTML ni script venu du modèle. React échappe chaque texte ; un dessin n'est redessiné
 * qu'avec les balises et les attributs de la liste ci-dessous ; la feuille de style est fixe (les couleurs y entrent
 * par des variables posées par React, jamais par du texte collé dans la feuille).
 */
import { createElement, useId, type CSSProperties, type ReactNode } from "react";
import { Button, cx } from "../ui";
import { useT } from "../i18n";

type Face = { family: string; file: string; weight: number } | null;
type Shape = { d: string; tone: "main" | "accent"; paint: "fill" | "stroke"; width?: number; rule?: "nonzero" | "evenodd"; transform?: string; part?: "note" };
type Picto = { viewBox: [number, number, number]; shapes: Shape[] };
type ArtNode = { t: string; a: Record<string, string>; c?: ArtNode[] };
type Art = { box: [number, number, number, number]; nodes: ArtNode[] };
type Role = "dark" | "primary" | "secondary" | "accent" | "light";
type Drawn = {
  width: number; height: number; shapes: Shape[]; text: string;
  symbol?: { x: number; y: number; size: number; viewBox: [number, number, number]; shapes: Shape[] };
  cut?: { y: number; wave: string };
  arts?: { x: number; y: number; size: number; art: Art; transform?: string }[];
  core?: { width: number; height: number };
};
type Look = { backgrounds: string[]; text: string; surface: string; surfaceText: string; button: string; buttonText: string };
type Board = {
  idea: { belief: string; confession: string; confessionSupport: number; enemy: string; proof: string; cost: string };
  nameCheck: "rien_trouve" | "non_verifie";
  descriptor?: string; hero?: Art;
  lines: string[];
  voice: { sliders: { left: string; right: string; value: number }[]; thisNotThat: { yes: string; no: string }[]; houseWords: string[]; bannedWords: string[]; is?: string[]; micro?: { where: string; text: string }[] };
  signs: { kind: string; kindLabel: string; title: string; text: string; symbol?: Picto; art?: Art; ground?: Role; sample?: string; hand?: boolean }[];
  object: { kind: string; label: string; front: string[]; back: string[]; art?: Art; note?: string };
  parcel?: { tape: string };
  site: { headline: string; text: string; button: string; menu: string[]; art?: Art };
  posts: { text: string; look: "fond" | "couleur" | "motif" | "citation"; art?: Art; ground?: Role; note?: string }[];
  toProve: string[];
};
export type BoardCard = {
  key: "A" | "B" | "C" | "D"; name: string; nameWhy?: string; nameAnchor?: string; nameExpression?: string; slogan: string; promise: string; territory: string;
  ground: "blanc" | "degrade" | "sombre" | "uni"; gradient?: { from: string; to: string };
  palette: { dark: string; primary: string; secondary: string; accent: string; light: string }; paletteFamily: string; fontStyle: string;
  tone: { adjectives: string[]; avoid: string[] }; why: string; faces: { heading: Face; body: Face };
  board: Board; drawn: Drawn | null; look: Look;
};
export type StudyCard = { quotes: { text: string; url: string }[]; quoteCount: number; sources: number; competitors: string[]; mould: string; substitutes: string[]; notFound: string[] };
export type BoardSet = { round: number; issues: string[]; chosen: { key: string; mix: Record<string, string> } | null; list: BoardCard[]; final?: (BoardCard & { mixLabel?: string }) | null; study?: StudyCard | null };

// ---------------------------------------------------------------- couleurs (calculs simples, côté écran)

const HEX = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v: string, fallback = "#777777") => (HEX.test(v) ? v : fallback);
const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(safeHex(hex).slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a: string, b: string) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** Le texte le plus lisible sur un fond, parmi les couleurs de la marque (ou un noir et un blanc presque purs). */
const inkOn = (bg: string, p: BoardCard["palette"]) => [p.dark, p.light, "#141414", "#FFFFFF"].reduce((a, b) => (contrast(b, bg) > contrast(a, bg) ? b : a));
/** La couleur vive de la marque qui se voit sur ces fonds (pour un mot en couleur, une signature) ; sinon le texte. */
const popOn = (bgs: string[], p: BoardCard["palette"], ink: string, min = 1.9) => [p.accent, p.primary, p.secondary].find((c) => Math.min(...bgs.map((b) => contrast(c, b))) >= min) ?? ink;

// ---------------------------------------------------------------- dessins

const ART_TAGS = new Set(["g", "path", "circle", "ellipse", "rect", "line", "polygon", "polyline", "defs", "linearGradient", "radialGradient", "stop", "clipPath", "filter", "feGaussianBlur"]);
const ART_ATTRS = new Set(["id", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "opacity", "fill-opacity", "stroke-opacity", "fill-rule", "clip-rule", "transform", "clip-path", "filter", "gradientUnits", "gradientTransform", "spreadMethod", "fx", "fy", "offset", "stop-color", "stop-opacity", "stdDeviation"]);
const REF = /url\(#([A-Za-z][\w-]*)\)/g;
/** Redessine un dessin filtré : seulement les balises et attributs connus ; les identifiants prennent un préfixe propre à l'endroit. */
function artNodes(nodes: ArtNode[], prefix: string, path = ""): ReactNode[] {
  return nodes.filter((n) => ART_TAGS.has(n.t)).map((n, i) => {
    const props: Record<string, string> = { key: `${path}${i}` };
    for (const [k, v] of Object.entries(n.a ?? {})) {
      if (!ART_ATTRS.has(k) || typeof v !== "string") continue;
      props[k.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())] = k === "id" ? prefix + v : v.replace(REF, (_m, id: string) => `url(#${prefix}${id})`);
    }
    return createElement(n.t, props, n.c?.length ? artNodes(n.c, prefix, `${path}${i}-`) : undefined);
  });
}
const cleanId = (id: string) => id.replace(/[^a-zA-Z0-9]/g, "");
function ArtView({ art, cover, className, style, label }: { art: Art; cover?: boolean; className?: string; style?: CSSProperties; label?: string }) {
  const id = cleanId(useId());
  return <svg viewBox={art.box.join(" ")} preserveAspectRatio={cover ? "xMidYMid slice" : "xMidYMid meet"} className={className} style={style} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} data-art>{artNodes(art.nodes, `a${id}-`)}</svg>;
}

/**
 * Vignette (dessin avec son fond) dans un cadre de proportions fixes : elle le remplit si ses proportions sont celles
 * du cadre, sinon elle y tient ENTIÈRE (règle du propriétaire : rien de coupé).
 */
function Vignette({ art, ratio, label }: { art: Art; ratio: number; label?: string }) {
  return <ArtView art={art} cover={Math.abs(art.box[2] / art.box[3] - ratio) / ratio < 0.06} label={label} />;
}

const paint = (s: Shape, main: string, accent: string) => {
  const c = s.tone === "accent" ? accent : main;
  return s.paint === "stroke" ? { fill: "none", stroke: c, strokeWidth: s.width ?? 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : { fill: c, fillRule: s.rule };
};

/** Le nom dessiné : les tracés composés par le Studio (gestes de lettrage compris) ; à défaut, le nom dans la police de titres. */
function Wordmark({ x, main, accent, className, style, start, compact }: { x: BoardCard; main: string; accent: string; className?: string; style?: CSSProperties; /** Calé à gauche de sa place (sinon centré). */ start?: boolean; /** En petit : sans les mots écrits à la main. */ compact?: boolean }) {
  const uid = cleanId(useId());
  const full = x.drawn;
  const w = full && compact && full.core ? { ...full, ...full.core, shapes: full.shapes.filter((s) => s.part !== "note") } : full;
  if (!w) return <span className={className} style={{ ...style, color: main, fontFamily: "var(--bb-head)", fontWeight: x.faces.heading?.weight ?? 700 }}>{x.name}</span>;
  const fills = w.shapes.filter((s) => s.paint === "fill"), strokes = w.shapes.filter((s) => s.paint === "stroke");
  const draw = (list: Shape[], m: string, a: string, k: string) => list.map((s, i) => <path key={k + i} d={s.d} transform={s.transform} {...paint(s, m, a)} />);
  return (
    <svg viewBox={`0 0 ${w.width} ${w.height}`} preserveAspectRatio={start ? "xMinYMid meet" : "xMidYMid meet"} className={className} style={style} role="img" aria-label={x.name} data-wordmark={x.key}>
      {w.symbol && <svg x={w.symbol.x} y={w.symbol.y} width={w.symbol.size} height={w.symbol.size} viewBox={`${w.symbol.viewBox[0]} ${w.symbol.viewBox[1]} ${w.symbol.viewBox[2]} ${w.symbol.viewBox[2]}`}>{w.symbol.shapes.map((s, i) => <path key={i} d={s.d} {...paint(s, main, accent)} />)}</svg>}
      {w.cut ? (
        <>
          <defs>
            <clipPath id={`${uid}h`}><rect x={0} y={0} width={w.width} height={w.cut.y} /></clipPath>
            <clipPath id={`${uid}b`}><rect x={0} y={w.cut.y} width={w.width} height={Math.max(0, w.height - w.cut.y)} /></clipPath>
          </defs>
          <g clipPath={`url(#${uid}h)`}>{draw(fills, main, accent, "h")}</g>
          <g clipPath={`url(#${uid}b)`}>{draw(fills, accent, accent, "b")}</g>
          <path d={w.cut.wave} fill="none" stroke={main} strokeWidth={3} strokeLinecap="round" />
        </>
      ) : draw(fills, main, accent, "f")}
      {(w.arts ?? []).map((a, i) => <g key={i} transform={a.transform}><svg x={a.x} y={a.y} width={a.size} height={a.size} viewBox={a.art.box.join(" ")} color={main}>{artNodes(a.art.nodes, `w${uid}${i}-`)}</svg></g>)}
      {draw(strokes, main, accent, "s")}
    </svg>
  );
}

function PictoView({ p, main, accent, className, style }: { p: Picto; main: string; accent: string; className?: string; style?: CSSProperties }) {
  return <svg viewBox={`${p.viewBox[0]} ${p.viewBox[1]} ${p.viewBox[2]} ${p.viewBox[2]}`} className={className} style={style} aria-hidden>{p.shapes.map((s, i) => <path key={i} d={s.d} {...paint(s, main, accent)} />)}</svg>;
}

/** Scène de secours (identité sans dessin : anciennes planches, dessin refusé) : un astre, des vagues, le signe de la marque. */
function FallbackScene({ x, picto, className }: { x: BoardCard; picto?: Picto; className?: string }) {
  const id = cleanId(useId()), p = x.palette, dark = x.ground === "sombre";
  const sky = dark ? p.dark : p.secondary, ink = inkOn(sky, p);
  return (
    <svg viewBox="0 0 320 250" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden data-art="secours">
      <defs>
        <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={p.accent} stopOpacity=".7" /><stop offset="1" stopColor={p.accent} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky} /><stop offset="1" stopColor={p.primary} /></linearGradient>
      </defs>
      <rect width="320" height="250" fill={`url(#${id}s)`} />
      <circle cx="244" cy="62" r="78" fill={`url(#${id}g)`} />
      <circle cx="244" cy="62" r="30" fill={p.accent} />
      <path d="M0 168 Q40 150 80 168 T160 168 T240 168 T320 168 V250 H0Z" fill={p.primary} fillOpacity=".75" />
      <path d="M0 196 Q40 180 80 196 T160 196 T240 196 T320 196 V250 H0Z" fill={dark ? p.secondary : p.dark} fillOpacity=".55" />
      {picto && [[58, 96, 74, -12], [150, 138, 52, 10]].map(([cx, cy, s, r], i) => (
        <svg key={i} x={cx - s / 2} y={cy - s / 2} width={s} height={s} viewBox={`${picto.viewBox[0]} ${picto.viewBox[1]} ${picto.viewBox[2]} ${picto.viewBox[2]}`}><g transform={`rotate(${r} ${picto.viewBox[0] + picto.viewBox[2] / 2} ${picto.viewBox[1] + picto.viewBox[2] / 2})`}>{picto.shapes.map((sh, j) => <path key={j} d={sh.d} {...paint(sh, ink, p.accent)} />)}</g></svg>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------- feuille de style fixe de la planche

const BOARD_CSS = `
.bb{position:relative;overflow:hidden;isolation:isolate;color:var(--bb-ink);font-family:var(--bb-body);padding:1.15rem 1rem 1.5rem;background:var(--bb-bg1)}
@container (min-width:42rem){.bb{padding:1.7rem 1.7rem 2rem}}
.bb-g-sombre{background:radial-gradient(95% 34rem at 100% 0%,color-mix(in srgb,var(--bb-secondary) 78%,transparent),transparent 64%),radial-gradient(85% 30rem at 0% 100%,color-mix(in srgb,var(--bb-accent) 22%,transparent),transparent 60%),radial-gradient(60% 26rem at 0% 36%,color-mix(in srgb,var(--bb-primary) 9%,transparent),transparent 66%),linear-gradient(180deg,var(--bb-bg1),color-mix(in srgb,var(--bb-bg1) 76%,#000))}
.bb-g-degrade{background:radial-gradient(75% 26rem at 96% 0%,color-mix(in srgb,#fff 46%,transparent),transparent 62%),radial-gradient(60% 22rem at 0% 52%,color-mix(in srgb,#fff 16%,transparent),transparent 66%),linear-gradient(165deg,var(--bb-bg1) 0%,color-mix(in oklab,var(--bb-bg1) 50%,var(--bb-bg2)) 46%,var(--bb-bg2) 100%)}
.bb-g-blanc{background:radial-gradient(85% 26rem at 100% 0%,color-mix(in srgb,var(--bb-primary) 17%,transparent),transparent 62%),radial-gradient(75% 24rem at 0% 100%,color-mix(in srgb,var(--bb-accent) 15%,transparent),transparent 64%),radial-gradient(55% 20rem at 0% 30%,color-mix(in srgb,var(--bb-secondary) 12%,transparent),transparent 66%),var(--bb-bg1)}
.bb-g-uni{background:radial-gradient(85% 26rem at 100% 0%,color-mix(in srgb,var(--bb-primary) 24%,transparent),transparent 62%),radial-gradient(75% 24rem at 0% 100%,color-mix(in srgb,var(--bb-accent) 22%,transparent),transparent 64%),var(--bb-bg1)}
.bb[data-ink="clair"]{--bb-tile:rgba(255,255,255,.085);--bb-edge:rgba(255,255,255,.12);--bb-soft:rgba(255,255,255,.2)}
.bb[data-ink="fonce"]{--bb-tile:rgba(255,255,255,.64);--bb-edge:rgba(255,255,255,.55);--bb-soft:rgba(0,0,0,.14)}
.bb-g-blanc[data-ink="fonce"]{--bb-tile:color-mix(in srgb,var(--bb-primary) 7%,#fff);--bb-edge:color-mix(in srgb,var(--bb-primary) 18%,transparent)}
.bb-route{font-size:.7rem;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
.bb-h{font-size:.7rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;opacity:.78;margin:1.9rem 0 .7rem}
.bb-head{display:grid;gap:1.1rem;align-items:center;margin-top:.9rem}
@container (min-width:42rem){.bb-head{grid-template-columns:1.1fr .9fr}}
.bb-name{display:block;width:100%;max-width:30rem;max-height:13rem}
.bb-genre{margin-top:.8rem;font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.82}
.bb-sign{margin-top:.7rem;font-family:var(--bb-head);font-size:clamp(1.35rem,1.05rem + 2.2cqi,2.1rem);line-height:1.1;text-wrap:balance;color:var(--bb-pop)}
.bb-promise{margin-top:.5rem;font-size:.88rem;line-height:1.45;opacity:.92;max-width:34rem}
.bb-scene{border-radius:20px;overflow:hidden;aspect-ratio:32/25;box-shadow:0 30px 50px -30px rgba(0,0,0,.75);transform:rotate(1.2deg)}
.bb-scene>svg{display:block;width:100%;height:100%}
.bb-3{display:grid;gap:.6rem}
@container (min-width:42rem){.bb-3{grid-template-columns:repeat(3,1fr)}.bb-2{grid-template-columns:1fr 1fr}}
.bb-2{display:grid;gap:.6rem}
.bb-tile{border-radius:16px;padding:.85rem .95rem;min-width:0;background:var(--bb-tile);box-shadow:inset 0 0 0 1px var(--bb-edge)}
.bb-tile small{display:block;font-size:.66rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.72;margin-bottom:.3rem}
.bb-tile p{font-size:.95rem;line-height:1.4}
.bb-tile .bb-note{display:block;margin-top:.4rem;font-size:.76rem;opacity:.8;line-height:1.35}
.bb-signs{display:grid;gap:.6rem;grid-template-columns:repeat(2,1fr)}
@container (min-width:42rem){.bb-signs{grid-template-columns:repeat(4,1fr)}}
.bb-signcard{border-radius:16px;padding:.7rem;min-width:0;display:grid;gap:.55rem;align-content:start;background:var(--bb-tile);box-shadow:inset 0 0 0 1px var(--bb-edge)}
.bb-signcard:nth-child(odd) .bb-seen{transform:rotate(-1.4deg)}
.bb-signcard:nth-child(even) .bb-seen{transform:rotate(1.2deg)}
.bb-seen{height:7rem;border-radius:12px;display:grid;place-items:center;overflow:hidden;position:relative;box-shadow:0 12px 18px -14px rgba(0,0,0,.55)}
.bb-seen>svg{width:100%;height:100%;display:block}
.bb-signcard p{font-size:.8rem;line-height:1.35}
.bb-live{display:grid;gap:1.5rem .9rem;grid-template-columns:1fr 1fr;align-items:end}
@container (min-width:42rem){.bb-live{grid-template-columns:repeat(4,1fr);align-items:center}}
.bb-live figure{margin:0;display:grid;gap:.6rem;justify-items:center;min-width:0}
.bb-live figcaption{font-size:.72rem;opacity:.8;text-align:center;line-height:1.3}
.bb-wide{grid-column:1/-1}
.bb-obj{position:relative;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 30px -18px rgba(0,0,0,.6);transform:rotate(-3deg)}
.bb-obj.bb-back{transform:rotate(2.5deg)}
.bb-obj .bb-field{flex:1;min-height:0;position:relative;display:grid;align-content:center;gap:.3rem;padding:.55rem .6rem;overflow:hidden}
.bb-obj .bb-field>svg[data-art]{position:absolute;inset:0;width:100%;height:100%}
.bb-obj .bb-band{padding:.35rem .55rem .45rem;display:grid;gap:.2rem;font-size:.6rem;line-height:1.2;min-height:0}
.bb-phone{width:min(100%,13.2rem);aspect-ratio:9/18.5;border-radius:26px;border:6px solid #0B0D18;overflow:hidden;position:relative;box-shadow:0 22px 34px -20px rgba(0,0,0,.62);display:flex;flex-direction:column;transform:rotate(1.5deg);background:var(--bb-bg1)}
.bb-phone.bb-alt{transform:rotate(-1.8deg)}
.bb-phone .bb-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.7rem .7rem 0}
.bb-phone .bb-big{font-family:var(--bb-head);font-size:1.3rem;line-height:1.02;text-wrap:balance}
.bb-phone .bb-txt{font-size:.66rem;line-height:1.35;opacity:.92}
.bb-phone .bb-pic+.bb-btn{margin-top:auto;padding-top:.5rem}
.bb-phone .bb-pic{margin-bottom:.55rem}
.bb-phone .bb-pic{margin:.5rem .6rem 0;border-radius:12px;overflow:hidden;flex:0 1 auto;aspect-ratio:20/13;min-height:2.6rem}
.bb-phone .bb-pic>svg{display:block;width:100%;height:100%}
.bb-btn{flex:none;margin:auto .7rem .75rem;font-weight:600;font-size:.68rem;line-height:1.2;padding:.5rem .7rem;border-radius:999px;text-align:center;background:var(--bb-btn);color:var(--bb-btn-ink)}
.bb-posts{display:grid;grid-template-columns:repeat(3,1fr);gap:.55rem;width:100%;max-width:38rem;padding:.4rem .2rem}
.bb-post{aspect-ratio:4/5;border-radius:10px;position:relative;overflow:hidden;display:grid;align-content:end;padding:.6rem;box-shadow:0 16px 26px -18px rgba(0,0,0,.62);min-width:0}
.bb-post:nth-child(1){transform:rotate(-2.4deg) translateY(.3rem)}
.bb-post:nth-child(2){transform:rotate(1.6deg) translateY(-.35rem)}
.bb-post:nth-child(3){transform:rotate(-1deg) translateY(.2rem)}
.bb-post>svg[data-art]{position:absolute;inset:0 0 26% 0;width:100%;height:74%}
.bb-scrim{position:absolute;inset:0;display:block}
.bb-post p{position:relative;font-family:var(--bb-head);line-height:1.02;overflow-wrap:break-word;text-wrap:balance}
.bb-stack{display:grid;gap:1.4rem;justify-items:center;align-content:center;align-self:center;min-width:0;width:100%}
.bb-stack figure{width:100%}
.bb-sticker{width:min(78%,8.4rem);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;padding:17%;transform:rotate(8deg);box-shadow:0 14px 22px -14px rgba(0,0,0,.6);outline:1.5px dashed currentColor;outline-offset:-7px}
.bb-parcel{width:min(100%,15rem);aspect-ratio:4/3;position:relative;border-radius:6px;background:linear-gradient(160deg,#E2C49C,#CDA878);box-shadow:0 22px 30px -20px rgba(0,0,0,.6);overflow:hidden;transform:rotate(-2deg)}
.bb-parcel::before{content:"";position:absolute;inset:0 auto 0 50%;width:1px;background:rgba(0,0,0,.18)}
.bb-tape{position:absolute;left:-6%;right:-6%;top:36%;height:25%;display:flex;align-items:center;white-space:nowrap;overflow:hidden;font-family:var(--bb-head);font-size:.74rem;transform:rotate(-4deg);box-shadow:0 2px 5px rgba(0,0,0,.22)}
.bb-label{position:absolute;right:7%;bottom:8%;background:#fff;color:#111;font-size:.5rem;line-height:1.25;padding:.3rem .4rem;border-radius:3px;width:40%}
.bb-is{font-family:var(--bb-head);font-size:1.15rem;line-height:1.25}
.bb-micro{list-style:none;margin:0;padding:0;display:grid;gap:.55rem}
.bb-micro li{font-size:.9rem;line-height:1.35}
.bb-lines{display:flex;flex-wrap:wrap;gap:.5rem .6rem;margin-top:.7rem}
.bb-line{font-family:var(--bb-head);font-size:1rem;line-height:1.15;padding:.5rem .8rem;border-radius:12px;background:var(--bb-tile);box-shadow:inset 0 0 0 1px var(--bb-edge)}
.bb-line:nth-child(odd){transform:rotate(-1.2deg)}
.bb-line:nth-child(even){transform:rotate(1deg)}
.bb-slider{display:grid;grid-template-columns:1fr 4.6rem 1fr;gap:.5rem;align-items:center;font-size:.74rem}
.bb-slider>span:last-child{text-align:right}
.bb-slider i{display:block;height:6px;border-radius:3px;position:relative;background:var(--bb-soft)}
.bb-slider i::after{content:"";position:absolute;top:50%;left:var(--p);width:14px;height:14px;border-radius:50%;transform:translate(-50%,-50%);background:var(--bb-pop)}
.bb-hand{font-family:"SINA Caveat",cursive;font-weight:700;line-height:1;display:inline-block;transform:rotate(-3deg)}
.bb-sample{padding:.5rem .6rem;font-family:var(--bb-head);font-size:1.05rem;line-height:1.02;text-wrap:balance;width:100%}
.bb-sample.bb-hand{font-family:"SINA Caveat",cursive;font-size:1.55rem;text-align:center}
.bb-post .bb-hand{position:relative;font-size:clamp(.85rem,3.6cqi,1.35rem);margin-top:.25rem}
.bb-obj .bb-field .bb-hand{position:absolute;left:.5rem;bottom:.3rem;font-size:1.05rem}
.bb-prove{margin-top:1.6rem;font-size:.84rem;line-height:1.45}
.bb-prove ul{margin:.4rem 0 0;padding-left:1.1em;list-style:disc}
.bb-prove li+li{margin-top:.3em}
@media (prefers-reduced-motion:no-preference){.bb-obj,.bb-phone,.bb-post,.bb-parcel,.bb-sticker{transition:transform .25s ease}.bb-obj:hover,.bb-phone:hover,.bb-post:hover,.bb-parcel:hover,.bb-sticker:hover{transform:rotate(0) translateY(-2px)}}
`;

// ---------------------------------------------------------------- objets

/** Silhouettes des objets : formes simples du Studio, une par famille d'objet. */
const OBJECT_SHAPE: Record<string, { ratio: string; radius: string; width: string; top?: "zip" | "lid" | "cap" | "hole" | "posts"; wheels?: boolean }> = {
  sachet: { ratio: "5 / 7", radius: "12px 12px 18px 18px", width: "10.2rem", top: "zip" },
  pot: { ratio: "4 / 5", radius: "14px", width: "9.6rem", top: "lid" }, boite: { ratio: "1 / 1", radius: "8px", width: "9.6rem", top: "lid" },
  flacon: { ratio: "3 / 6", radius: "16px", width: "6.6rem", top: "cap" }, bouteille: { ratio: "3 / 7", radius: "18px", width: "6rem", top: "cap" }, tube: { ratio: "2 / 6", radius: "10px 10px 22px 22px", width: "4.8rem", top: "cap" },
  etiquette: { ratio: "3 / 4", radius: "8px", width: "8.6rem", top: "hole" }, sac: { ratio: "4 / 5", radius: "6px", width: "9.6rem", top: "posts" },
  carte: { ratio: "85 / 55", radius: "8px", width: "11.5rem" }, enseigne: { ratio: "16 / 7", radius: "6px", width: "12.5rem", top: "posts" },
  vehicule: { ratio: "16 / 9", radius: "14px 26px 8px 8px", width: "12.5rem", wheels: true }, tablier: { ratio: "4 / 5", radius: "10px 10px 26px 26px", width: "9rem", top: "posts" },
};

const sameText = (a: string, b: string) => a.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase() === b.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Une face de l'objet. Devant : le dessin, le nom dessiné, ce qui est écrit ; dos : le mode d'emploi, la phrase. */
function ObjectFace({ x, back, pop }: { x: BoardCard; back?: boolean; pop: string }) {
  const b = x.board, p = x.palette, s = OBJECT_SHAPE[b.object.kind] ?? OBJECT_SHAPE.sachet;
  const dark = x.ground === "sombre";
  // Devant, le nom est déjà dessiné : une ligne qui le répète n'est pas écrite une seconde fois.
  const lines = back ? b.object.back : b.object.front.filter((l) => !sameText(l, x.name));
  const body = back ? (dark ? p.dark : p.light) : dark ? p.dark : p.light, ink = inkOn(body, p);
  // La bande du bas : la nuit sur un fond sombre, la première couleur du dégradé, sinon la couleur de marque.
  const band = back || dark ? body : x.ground === "degrade" ? safeHex(x.look.backgrounds[0], p.primary) : p.primary, bandInk = inkOn(band, p);
  const edge = dark ? "0 0 0 1.5px rgba(255,255,255,.24)" : `0 0 0 2px ${p.dark}`;
  const art = !back ? b.object.art : undefined;
  return (
    <div className="relative shrink-0" style={{ width: `min(100%, ${s.width})` }} data-object-face={back ? "dos" : "devant"}>
      {s.top === "cap" && <span className="mx-auto block h-3 w-2/5 rounded-t" style={{ background: p.dark }} aria-hidden />}
      {s.top === "posts" && <span className="mx-auto flex w-3/5 justify-between" aria-hidden><i className="block h-3 w-1 rounded-t" style={{ background: x.look.text, opacity: 0.5 }} /><i className="block h-3 w-1 rounded-t" style={{ background: x.look.text, opacity: 0.5 }} /></span>}
      <div className={cx("bb-obj", back && "bb-back")} style={{ aspectRatio: s.ratio, borderRadius: s.radius, background: body, color: ink, boxShadow: `${edge}, 0 20px 30px -18px rgba(0,0,0,.6)` }}>
        {s.top === "zip" && <span className="block shrink-0" style={{ height: "8%", background: `repeating-linear-gradient(90deg, ${ink}33 0 3px, transparent 3px 7px)` }} aria-hidden />}
        {s.top === "lid" && <span className="block h-3 shrink-0" style={{ background: p.dark, opacity: 0.85 }} aria-hidden />}
        {s.top === "hole" && <span className="mx-auto mt-1.5 block h-2 w-2 shrink-0 rounded-full" style={{ background: x.look.backgrounds[0] }} aria-hidden />}
        <div className="bb-field" style={art ? { flex: "none", aspectRatio: "19 / 13" } : undefined}>
          {art && <Vignette art={art} ratio={19 / 13} />}
          {!back && b.object.note && <span className="bb-hand" style={{ color: [p.primary, p.accent].find((c) => contrast(c, body) >= 2.6) ?? ink }}>{b.object.note}</span>}
          {back ? lines.map((l, i) => <p key={i} className={i === 0 ? "text-[15px] leading-[1.05]" : "text-[9.5px] leading-snug"} style={i === 0 ? { fontFamily: "var(--bb-head)", fontWeight: x.faces.heading?.weight ?? 700 } : { opacity: 0.9 }}>{l}</p>)
            : !art && lines.slice(0, 2).map((l, i) => <p key={i} className={i === 0 ? "text-[17px] leading-[1.02]" : "text-[10px] leading-snug"} style={i === 0 ? { fontFamily: "var(--bb-head)", fontWeight: x.faces.heading?.weight ?? 700 } : undefined}>{l}</p>)}
        </div>
        {!back && (
          <div className="bb-band" style={{ flex: art ? 1 : "none", alignContent: "center", background: band, color: bandInk, boxShadow: dark ? "inset 0 1px 0 rgba(255,255,255,.2)" : `inset 0 2px 0 ${p.dark}` }}>
            <Wordmark x={x} main={bandInk} accent={[pop, p.accent, p.primary].find((c) => contrast(c, band) >= 1.9) ?? bandInk} start compact className="block w-full" style={{ fontSize: ".9rem", lineHeight: 1, maxHeight: "2.5rem" }} />
            {(art ? lines : lines.slice(2)).slice(0, 2).map((l, i) => <span key={i}>{l}</span>)}
          </div>
        )}
      </div>
      {s.wheels && <span className="-mt-2 flex justify-around px-4" aria-hidden><i className="block h-4 w-4 rounded-full" style={{ background: p.dark }} /><i className="block h-4 w-4 rounded-full" style={{ background: p.dark }} /></span>}
    </div>
  );
}

/**
 * Fond d'un signe ou d'une publication : la couleur demandée dans la palette, sinon une couleur par rang. Pour les
 * publications (`unique`), jamais deux fois le même fond : trois publications, trois couleurs.
 */
function grounds(count: number, asked: (Role | undefined)[], p: BoardCard["palette"], order: Role[], unique = false): string[] {
  const used = new Set<string>();
  return Array.from({ length: count }, (_u, i) => {
    const free = (r: Role) => !used.has(p[r]);
    const role = asked[i] && (!unique || free(asked[i]!)) ? asked[i]! : order.find(free) ?? order[i % order.length];
    used.add(p[role]);
    return safeHex(p[role]);
  });
}

function Planche({ x, label, chosen, faded, canChoose, busy, onChoose }: { x: BoardCard; label?: string; chosen?: boolean; faded?: boolean; canChoose: boolean; busy: boolean; onChoose: (key: string) => void }) {
  const t = useT();
  const b = x.board, k = x.look, p = x.palette;
  const head = x.faces.heading ? `"SINA ${x.faces.heading.family}", serif` : "serif", body = x.faces.body ? `"SINA ${x.faces.body.family}", sans-serif` : "sans-serif";
  const bgs = k.backgrounds.map((c) => safeHex(c, "#FFFFFF")), ink = safeHex(k.text, "#141414"), light = lum(ink) > 0.5;
  // Couleur vive des gestes du nom (grand, décoratif) ; une phrase entière en couleur demande un contraste plus fort.
  const pop = popOn(bgs, p, ink), popText = popOn(bgs, p, ink, 3);
  const vars = {
    "--bb-bg1": bgs[0], "--bb-bg2": bgs[1] ?? bgs[0], "--bb-ink": ink, "--bb-pop": popText, "--bb-primary": safeHex(p.primary), "--bb-secondary": safeHex(p.secondary), "--bb-accent": safeHex(p.accent),
    "--bb-btn": safeHex(k.button), "--bb-btn-ink": safeHex(k.buttonText, "#FFFFFF"), "--bb-head": head, "--bb-body": body,
  } as CSSProperties;
  const headWeight = x.faces.heading?.weight ?? 700;
  const groundLabel = { blanc: t("fond blanc", "white background"), degrade: t("fond en dégradé", "gradient background"), sombre: t("fond sombre", "dark background"), uni: t("fond clair coloré", "tinted light background") }[x.ground];
  const firstPicto = b.signs.find((s) => s.symbol)?.symbol;
  const signBg = grounds(b.signs.length, b.signs.map((s) => s.ground), p, x.ground === "sombre" ? ["primary", "accent", "secondary", "light", "dark"] : ["dark", "accent", "secondary", "primary", "light"]);
  const postBg = grounds(3, b.posts.map((q) => q.ground), p, ["dark", "accent", "primary", "secondary", "light"], true);
  const stickerBg = safeHex(p.accent), stickerInk = inkOn(stickerBg, p);
  const tape = b.parcel?.tape ?? x.slogan, tapeBg = safeHex(p.primary), tapeInk = inkOn(tapeBg, p);
  const support = b.idea.confessionSupport;
  return (
    <article className={cx("overflow-hidden rounded-2xl border", chosen ? "border-ink ring-2 ring-ink" : "border-line", faded && "opacity-60")} data-brand-board={x.key}>
      <div className={cx("bb", `bb-g-${x.ground}`)} data-ink={light ? "clair" : "fonce"} style={vars}>
        <p className="bb-route">{label ?? `${t("Identité", "Identity")} ${x.key}`} · {x.territory}</p>
        <div className="bb-head">
          <div>
            <Wordmark x={x} main={ink} accent={pop} start className="bb-name text-5xl" style={{ lineHeight: 1 }} />
            {b.descriptor && <p className="bb-genre" data-descriptor>{b.descriptor}</p>}
            <p className="bb-sign" style={{ fontWeight: headWeight }} data-signature>{x.slogan}</p>
            <p className="bb-promise">{x.promise}</p>
          </div>
          <div className="bb-scene" data-scene={b.hero ? "dessin" : "secours"}>{b.hero ? <Vignette art={b.hero} ratio={32 / 25} label={t("La scène de la marque", "The brand's scene")} /> : <FallbackScene x={x} picto={firstPicto} />}</div>
        </div>

        <h4 className="bb-h">{t("L'idée", "The idea")}</h4>
        <div className="bb-3">
          <div className="bb-tile" data-confession={support > 0 ? "appuye" : "hypothese"}>
            <small>{t("Ce que ton client pense sans le dire", "What your customer thinks quietly")}</small>
            <p>« {b.idea.confession} »</p>
            <span className="bb-note">{support > 0 ? t(`Appuyé par ${support} parole${support > 1 ? "s" : ""} réelle${support > 1 ? "s" : ""} de clients.`, `Backed by ${support} real customer quote(s).`) : t("Hypothèse : pas encore de parole réelle pour l'appuyer.", "Hypothesis: no real quote backs it yet.")}</span>
          </div>
          <div className="bb-tile"><small>{t("Ce que croit la marque", "What the brand believes")}</small><p>{b.idea.belief}</p></div>
          <div className="bb-tile"><small>{t("Elle se bat contre", "It fights")}</small><p>{b.idea.enemy}</p></div>
        </div>
        <div className="bb-2 mt-[.6rem]">
          <div className="bb-tile"><small>{t("La preuve, dans l'objet", "The proof, in the object")}</small><p>{b.idea.proof}</p></div>
          <div className="bb-tile"><small>{t("Ce que ça coûte", "What it costs")}</small><p>{b.idea.cost}</p></div>
        </div>

        {(x.nameWhy || x.nameAnchor || x.nameExpression) && (
          <>
            <h4 className="bb-h">{t("Le nom", "The name")}</h4>
            <div className="bb-3" data-name-story>
              {x.nameAnchor && <div className="bb-tile"><small>{t("Le détail réel", "The real detail")}</small><p>{x.nameAnchor}</p></div>}
              {x.nameExpression && <div className="bb-tile"><small>{t("La deuxième lecture", "The second reading")}</small><p>{x.nameExpression}</p></div>}
              {x.nameWhy && <div className="bb-tile"><small>{t("Pourquoi lui", "Why this one")}</small><p>{x.nameWhy}</p><span className="bb-note">{b.nameCheck === "rien_trouve" ? t("Aucune marque trouvée à ce nom sur le web. Reste à vérifier à l'INPI.", "No brand found under this name on the web. Still to check with the trademark office.") : t("Nom pas encore vérifié sur le web ni à l'INPI.", "Name not checked yet.")}</span></div>}
            </div>
          </>
        )}

        <h4 className="bb-h">{t("Ce qu'on reconnaît sans lire le nom", "What you recognise without reading the name")}</h4>
        <div className="bb-signs">
          {b.signs.map((s, i) => {
            const bg = signBg[i], on = inkOn(bg, p), acc = [p.accent, p.primary, p.secondary, on].find((c) => contrast(c, bg) >= 2.2) ?? on;
            return (
              <div key={i} className="bb-signcard" data-sign={s.kind}>
                <div className="bb-seen" style={{ background: bg, color: on }} data-seen={s.art ? "dessin" : s.sample ? "mots" : s.symbol ? "signe" : "secours"}>
                  {s.art ? <ArtView art={s.art} />
                    : s.sample ? <span className={cx("bb-sample", s.hand && "bb-hand")} style={s.hand ? { color: acc } : { fontWeight: headWeight }} data-sample>{s.sample}</span>
                    : s.kind === "lettrage" ? <Wordmark x={x} main={on} accent={acc} className="max-h-[70%] max-w-[86%] text-xl" />
                      : s.kind === "couleur" ? <span className="flex h-full w-full" aria-hidden>{(["dark", "primary", "secondary", "accent", "light"] as const).map((r) => <i key={r} className="block flex-1" style={{ background: safeHex(p[r]) }} />)}</span>
                        : s.kind === "phrase" ? <span className="px-2 text-center text-[15px] leading-[1.05]" style={{ fontFamily: "var(--bb-head)", fontWeight: headWeight }}>{x.slogan}</span>
                          : s.symbol ? <PictoView p={s.symbol} main={on} accent={acc} style={{ width: "62%", height: "62%" }} />
                            : <span className="block h-10 w-10 rounded-full" style={{ background: acc }} aria-hidden />}
                </div>
                <p><b>{s.title}</b> {s.text}</p>
              </div>
            );
          })}
        </div>

        <h4 className="bb-h">{t("En situation", "In real life")}</h4>
        <div className="bb-live">
          <figure data-object={b.object.kind}><ObjectFace x={x} pop={pop} /><figcaption>{b.object.label}</figcaption></figure>
          {b.object.back.length > 0 && <figure><ObjectFace x={x} back pop={pop} /><figcaption>{t("Le dos", "The back")}</figcaption></figure>}
          <figure data-phone>
            <div className="bb-phone" style={{ color: ink }}>
              <div className="bb-top"><Wordmark x={x} main={ink} accent={pop} start compact className="block h-7 w-[58%] text-xs" /><span className="truncate text-[8px] opacity-75">{b.site.menu.slice(0, 2).join(" · ")}</span></div>
              <div className="grid gap-2 px-[.7rem] pt-3"><p className="bb-big" style={{ fontWeight: headWeight, fontSize: b.site.headline.length <= 26 ? "1.3rem" : b.site.headline.length <= 42 ? "1.08rem" : ".92rem" }}>{b.site.headline}</p><p className="bb-txt">{b.site.text}</p></div>
              <div className="bb-pic">{b.site.art ? <Vignette art={b.site.art} ratio={20 / 13} /> : b.hero ? <Vignette art={b.hero} ratio={20 / 13} /> : <FallbackScene x={x} picto={firstPicto} />}</div>
              <span className="bb-btn">{b.site.button}</span>
            </div>
            <figcaption>{t("Le haut de ton site, sur téléphone", "The top of your site, on a phone")}</figcaption>
          </figure>
          <div className="bb-stack">
            <figure data-sticker>
              <div className="bb-sticker" style={{ background: stickerBg, color: stickerInk }}><Wordmark x={x} main={stickerInk} accent={[p.primary, p.dark, p.light].find((c) => contrast(c, stickerBg) >= 2.2) ?? stickerInk} compact className="block h-full w-full" /></div>
              <figcaption>{t("L'autocollant", "The sticker")}</figcaption>
            </figure>
            <figure data-parcel>
              <div className="bb-parcel"><div className="bb-tape" style={{ background: tapeBg, color: tapeInk, fontWeight: headWeight }} aria-label={tape}>{Array.from({ length: 5 }, (_u, i) => <span key={i} aria-hidden>&nbsp;{tape}&nbsp;·</span>)}</div><div className="bb-label">{t("[Nom de ta cliente]", "[Your customer's name]")}<br />{t("[Adresse]", "[Address]")}</div></div>
              <figcaption>{t("Le colis", "The parcel")}</figcaption>
            </figure>
          </div>
          <figure className="bb-wide" data-posts>
            <div className="bb-posts">
              {b.posts.map((q, i) => {
                const bg = postBg[i], on = inkOn(bg, p);
                // Taille du texte : le mot le plus long tient sur une ligne, et tout le texte tient dans le bas de la carte.
                const longest = Math.max(...q.text.split(/\s+/).map((w) => w.length), 1);
                const size = Math.min(36 / longest, Math.sqrt(620 / Math.max(q.text.length, 6)), 6.4);
                const short = q.text.length <= 18;
                return (
                  <div key={i} className="bb-post" style={{ background: bg, color: on }} data-post={q.look}>
                    {q.art ? <ArtView art={q.art} /> : q.look === "motif" && firstPicto ? <PictoView p={firstPicto} main={on} accent={[p.accent, p.primary].find((c) => contrast(c, bg) >= 2) ?? on} className="absolute -right-3 -top-3 h-20 w-20 opacity-30" /> : null}
                    {q.art && <i className="bb-scrim" style={{ background: `linear-gradient(to top, ${bg} ${short ? 14 : 30}%, ${bg}00 ${short ? 38 : 64}%)` }} aria-hidden />}
                    <p style={{ fontWeight: headWeight, fontSize: `clamp(.6rem, ${size.toFixed(2)}cqi, 1.7rem)` }}>{q.look === "citation" ? `« ${q.text} »` : q.text}</p>
                    {q.note && <span className="bb-hand" style={{ color: [p.accent, p.primary, p.secondary].find((c) => contrast(c, bg) >= 2.6) ?? on }}>{q.note}</span>}
                  </div>
                );
              })}
            </div>
            <figcaption>{t("Trois publications", "Three posts")}</figcaption>
          </figure>
        </div>

        <h4 className="bb-h">{t("Sa voix", "Its voice")}</h4>
        <div className="bb-2">
          <div className="bb-tile" data-voice-is>
            <small>{t("Elle est", "It is")}</small>
            <p className="bb-is" style={{ fontWeight: headWeight }}>{b.voice.is?.length ? b.voice.is.join(" ") : x.tone.adjectives.map((a, i) => (i === 0 ? a.charAt(0).toUpperCase() + a.slice(1) : a)).join(", ") + "."}</p>
            <span className="bb-note"><b>{t("Ses mots", "Its words")} :</b> {b.voice.houseWords.join(", ")}. <b>{t("Jamais", "Never")} :</b> {b.voice.bannedWords.join(", ")}.</span>
          </div>
          <div className="bb-tile" data-voice-micro>
            <ul className="bb-micro">
              {b.voice.micro?.length ? b.voice.micro.map((m, i) => <li key={i}><small>{m.where}</small>{m.text}</li>)
                : b.voice.thisNotThat.map((q, i) => <li key={i}><small>{t("Elle dit", "It says")}</small>{q.yes}<span className="bb-note">{t("Jamais", "Never")} : {q.no}</span></li>)}
            </ul>
          </div>
        </div>
        <div className="bb-2 mt-[.6rem]">
          <div className="bb-tile grid gap-2">
            {b.voice.sliders.map((s, i) => <div key={i} className="bb-slider" data-slider={Math.round(s.value)}><span>{s.left}</span><i style={{ "--p": `${Math.min(100, Math.max(0, s.value))}%` } as CSSProperties} /><span>{s.right}</span></div>)}
          </div>
          {!!b.voice.micro?.length && <div className="bb-tile"><ul className="bb-micro">{b.voice.thisNotThat.map((q, i) => <li key={i}><small>{t("Elle dit", "It says")}</small>{q.yes}<span className="bb-note">{t("Jamais", "Never")} : {q.no}</span></li>)}</ul></div>}
        </div>
        <div className="bb-lines">{b.lines.map((l, i) => <span key={i} className="bb-line" style={{ fontWeight: headWeight }} data-line>{l}</span>)}</div>

        <div className="bb-tile bb-prove" data-to-prove>
          <b>{t("Ce qui reste à prouver", "What is still to prove")}</b>
          <ul>{b.toProve.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </div>
      <div className="flex h-5 border-y border-black/10" aria-label={t("Palette", "Palette")}>
        {(["light", "dark", "primary", "secondary", "accent"] as const).map((r) => <span key={r} className="flex-1" style={{ background: p[r] }} />)}
      </div>
      <div className="space-y-1 bg-card px-4 py-3 text-xs">
        <p><b>{t("Couleurs", "Colours")} :</b> {x.paletteFamily ? `${x.paletteFamily}, ` : ""}{groundLabel}. <b>{t("Polices", "Fonts")} :</b> {x.faces.heading?.family ?? "?"} / {x.faces.body?.family ?? "?"}. <b>{t("Ton", "Tone")} :</b> {x.tone.adjectives.join(", ")}.</p>
        {!!x.why && <p><b>{t("Pourquoi pour toi", "Why it fits you")} :</b> {x.why}</p>}
        <div className="pt-1">
          {chosen ? <p className="font-semibold">✓ {t("Ton identité, enregistrée comme marque du projet", "Your identity, saved as the project's brand")}</p>
            : canChoose && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.key)}>{t(`Je choisis ${x.key}`, `I choose ${x.key}`)}</Button>}
        </div>
      </div>
    </article>
  );
}

/** « Voici ce que j'ai compris de ton marché » : les paroles réelles lues sur le web, avec leur page. */
function Study({ s }: { s: StudyCard }) {
  const t = useT();
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-card p-4 text-sm" data-brand-study>
      <h3 className="text-sm font-semibold">{t("Ce que j'ai compris de ton marché", "What I understood about your market")}</h3>
      <p className="mt-1 text-xs text-muted">{s.sources > 0 ? t(`J'ai lu ${s.sources} page${s.sources > 1 ? "s" : ""} et gardé ${s.quoteCount} parole${s.quoteCount > 1 ? "s" : ""} de clients, mot pour mot.`, `I read ${s.sources} page(s) and kept ${s.quoteCount} customer quote(s), word for word.`) : t("Ma recherche sur le web n'a rien donné : je n'ai lu aucune parole réelle de clients.", "My web research returned nothing: I read no real customer quotes.")}</p>
      {s.quotes.length > 0 && <ul className="mt-2 grid grid-cols-1 gap-2 @2xl:grid-cols-2">{s.quotes.map((q, i) => <li key={i} className="min-w-0 overflow-hidden rounded-lg border-l-4 border-ink bg-paper px-3 py-2 text-xs"><span className="block break-words">« {q.text} »</span>{/^https?:\/\//i.test(q.url) && <a className="mt-0.5 block truncate text-[11px] text-muted underline" href={q.url} target="_blank" rel="noreferrer noopener">{q.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>}</li>)}</ul>}
      {!!s.mould && <p className="mt-2 text-xs"><b>{t("Ce que font tous tes concurrents", "What all your competitors do")} :</b> {s.mould}</p>}
      {s.competitors.length > 0 && <p className="mt-1 text-xs"><b>{t("Concurrents regardés", "Competitors looked at")} :</b> {s.competitors.join(", ")}</p>}
      {s.substitutes.length > 0 && <p className="mt-1 text-xs"><b>{t("Ce que font les gens à la place", "What people do instead")} :</b> {s.substitutes.join(" ; ")}</p>}
      {s.notFound.length > 0 && <p className="mt-1 text-xs text-muted"><b>{t("Cherché, pas trouvé", "Searched, not found")} :</b> {s.notFound.join(" ; ")}</p>}
    </section>
  );
}

/** L'écriture à la main des notes (aveux, signatures) : police du catalogue, servie comme les autres. */
const NOTE_FONT: NonNullable<Face> = { family: "Caveat", file: "Caveat-700.ttf", weight: 700 };

/** Étape 1 : les identités en planches de marque (2, 3 ou 4 selon le forfait), puis le choix du client. */
export function BrandBoards({ ids, busy, onChoose }: { ids: BoardSet; busy: boolean; onChoose: (key: string) => void }) {
  const t = useT();
  const faces = [...ids.list, ...(ids.final ? [ids.final] : [])].flatMap((x) => [x.faces.heading, x.faces.body]).filter((f): f is NonNullable<Face> => !!f);
  const css = [...new Map([...faces, NOTE_FONT].map((f) => [f.file, f])).values()].filter((f) => /^[\w .-]+$/.test(f.family) && /^[\w.-]+$/.test(f.file)).map((f) => `@font-face{font-family:"SINA ${f.family}";src:url(/api/syna/fonts/${f.file}) format("truetype");font-weight:${Number(f.weight) || 400};font-display:swap}`).join("");
  return (
    <div className="@container mt-2 space-y-3" data-syna-brand-boards={ids.round}>
      <style>{css + BOARD_CSS}</style>
      {ids.study && !ids.final && <Study s={ids.study} />}
      {ids.final ? (
        <>
          <p className="text-xs font-semibold">{t("Ton identité", "Your identity")}{ids.final.mixLabel ? ` · ${ids.final.mixLabel}` : ""}</p>
          <Planche x={ids.final} label={t("Ton identité", "Your identity")} chosen canChoose={false} busy={busy} onChoose={onChoose} />
          <p className="text-xs text-muted">{t("Les autres propositions", "The other proposals")} : {ids.list.filter((x) => x.key !== ids.chosen?.key).map((x) => `${x.key} « ${x.name} »`).join(", ")}.</p>
        </>
      ) : ids.list.map((x) => <Planche key={x.key} x={x} canChoose={!ids.chosen} busy={busy} onChoose={onChoose} />)}
      {!ids.chosen && <p className="text-xs text-muted">{t("Tu peux aussi mélanger (par exemple le nom de A avec les couleurs de B), retoucher un nom ou une phrase, ou demander une nouvelle proposition : écris-le simplement.", "You can also mix (e.g. A's name with B's colours), tweak a name or a line, or ask for a new proposal.")}</p>}
      {!!ids.issues.length && <div className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-ink dark:bg-amber-950/30" data-syna-identity-issues><p className="font-semibold">{t("Ce que je n'ai pas pu régler", "What I could not settle")}</p><ul className="mt-1 list-disc pl-4">{ids.issues.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
    </div>
  );
}
