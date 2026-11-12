"use client";
/**
 * Planches de marque de SINA (décision du propriétaire du 12 novembre 2026) : chaque identité se montre en situation,
 * dans SES couleurs et SES polices : l'idée, le nom dessiné, les signes, l'objet, le site sur téléphone, des
 * publications, la voix, ce qui reste à prouver.
 *
 * Tout est dessiné par les composants du Studio à partir de textes courts et de tracés déjà nettoyés : aucun HTML ni
 * script venu du modèle (React échappe chaque texte ; les dessins ne reçoivent que des tracés `d`).
 */
import type { CSSProperties, ReactNode } from "react";
import { Button, cx } from "../ui";
import { useT } from "../i18n";

type Face = { family: string; file: string; weight: number } | null;
type Shape = { d: string; tone: "main" | "accent"; paint: "fill" | "stroke"; width?: number; rule?: "nonzero" | "evenodd" };
type Picto = { viewBox: [number, number, number]; shapes: Shape[] };
type Drawn = { width: number; height: number; shapes: Shape[]; text: string; symbol?: { x: number; y: number; size: number; viewBox: [number, number, number]; shapes: Shape[] } };
type Look = { backgrounds: string[]; text: string; surface: string; surfaceText: string; button: string; buttonText: string };
type Board = {
  idea: { belief: string; confession: string; confessionSupport: number; enemy: string; proof: string; cost: string };
  nameCheck: "rien_trouve" | "non_verifie";
  lines: string[];
  voice: { sliders: { left: string; right: string; value: number }[]; thisNotThat: { yes: string; no: string }[]; houseWords: string[]; bannedWords: string[] };
  signs: { kind: string; kindLabel: string; title: string; text: string; symbol?: Picto }[];
  object: { kind: string; label: string; front: string[]; back: string[] };
  site: { headline: string; text: string; button: string; menu: string[] };
  posts: { text: string; look: "fond" | "couleur" | "motif" | "citation" }[];
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

const paint = (s: Shape, main: string, accent: string) => {
  const c = s.tone === "accent" ? accent : main;
  return s.paint === "stroke" ? { fill: "none", stroke: c, strokeWidth: s.width ?? 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const } : { fill: c, fillRule: s.rule };
};

/** Le nom dessiné : les tracés composés par le Studio ; à défaut, le nom dans la police de titres. */
function Wordmark({ x, main, accent, className, style }: { x: BoardCard; main: string; accent: string; className?: string; style?: CSSProperties }) {
  const w = x.drawn;
  if (!w) return <span className={className} style={{ ...style, color: main, fontFamily: x.faces.heading ? `"SINA ${x.faces.heading.family}", serif` : "serif", fontWeight: x.faces.heading?.weight ?? 700 }}>{x.name}</span>;
  return (
    <svg viewBox={`0 0 ${w.width} ${w.height}`} className={className} style={style} role="img" aria-label={x.name} data-wordmark={x.key}>
      {w.symbol && <svg x={w.symbol.x} y={w.symbol.y} width={w.symbol.size} height={w.symbol.size} viewBox={`${w.symbol.viewBox[0]} ${w.symbol.viewBox[1]} ${w.symbol.viewBox[2]} ${w.symbol.viewBox[2]}`}>{w.symbol.shapes.map((s, i) => <path key={i} d={s.d} {...paint(s, main, accent)} />)}</svg>}
      {w.shapes.map((s, i) => <path key={i} d={s.d} {...paint(s, main, accent)} />)}
    </svg>
  );
}

function PictoView({ p, main, accent, className }: { p: Picto; main: string; accent: string; className?: string }) {
  return <svg viewBox={`${p.viewBox[0]} ${p.viewBox[1]} ${p.viewBox[2]} ${p.viewBox[2]}`} className={className} aria-hidden>{p.shapes.map((s, i) => <path key={i} d={s.d} {...paint(s, main, accent)} />)}</svg>;
}

const groundCss = (x: BoardCard) => (x.look.backgrounds.length > 1 ? `linear-gradient(135deg, ${x.look.backgrounds[0]}, ${x.look.backgrounds[1]})` : x.look.backgrounds[0]);

/** Silhouettes des objets : formes simples du Studio, une par famille d'objet. */
const OBJECT_SHAPE: Record<string, { ratio: string; radius: string; width: string; top?: "zip" | "lid" | "cap" | "hole" | "posts"; wheels?: boolean }> = {
  sachet: { ratio: "5 / 7", radius: "10px 10px 18px 18px", width: "8.5rem", top: "zip" },
  pot: { ratio: "4 / 5", radius: "14px", width: "8.5rem", top: "lid" }, boite: { ratio: "1 / 1", radius: "8px", width: "8.5rem", top: "lid" },
  flacon: { ratio: "3 / 6", radius: "16px", width: "6rem", top: "cap" }, bouteille: { ratio: "3 / 7", radius: "18px", width: "5.5rem", top: "cap" }, tube: { ratio: "2 / 6", radius: "10px 10px 22px 22px", width: "4.5rem", top: "cap" },
  etiquette: { ratio: "3 / 4", radius: "8px", width: "7.5rem", top: "hole" }, sac: { ratio: "4 / 5", radius: "6px", width: "8.5rem", top: "posts" },
  carte: { ratio: "85 / 55", radius: "8px", width: "11rem" }, enseigne: { ratio: "16 / 7", radius: "6px", width: "12rem", top: "posts" },
  vehicule: { ratio: "16 / 9", radius: "14px 26px 8px 8px", width: "12rem", wheels: true }, tablier: { ratio: "4 / 5", radius: "10px 10px 26px 26px", width: "8rem", top: "posts" },
};

const sameText = (a: string, b: string) => a.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase() === b.normalize("NFD").replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

function ObjectFace({ x, lines: all, back, head }: { x: BoardCard; lines: string[]; back?: boolean; head: string }) {
  const s = OBJECT_SHAPE[x.board.object.kind] ?? OBJECT_SHAPE.sachet;
  // Devant, le nom est déjà dessiné : une ligne qui le répète n'est pas écrite une seconde fois.
  const lines = back ? all : all.filter((l) => !sameText(l, x.name));
  const bg = back ? x.look.surface : x.look.button, fg = back ? x.look.surfaceText : x.look.buttonText;
  return (
    <div className="relative shrink-0" style={{ width: s.width }} data-object-face={back ? "dos" : "devant"}>
      {s.top === "cap" && <span className="mx-auto block h-3 w-2/5 rounded-t" style={{ background: x.palette.dark }} aria-hidden />}
      {s.top === "posts" && <span className="mx-auto flex w-3/5 justify-between" aria-hidden><i className="block h-3 w-1 rounded-t" style={{ background: x.look.text, opacity: 0.5 }} /><i className="block h-3 w-1 rounded-t" style={{ background: x.look.text, opacity: 0.5 }} /></span>}
      <div className="flex flex-col overflow-hidden shadow-lg" style={{ aspectRatio: s.ratio, borderRadius: s.radius, background: bg, color: fg }}>
        {s.top === "zip" && <span className="block h-2.5 shrink-0" style={{ background: `repeating-linear-gradient(90deg, ${fg}33 0 3px, transparent 3px 7px)` }} aria-hidden />}
        {s.top === "lid" && <span className="block h-3 shrink-0" style={{ background: x.palette.dark, opacity: 0.85 }} aria-hidden />}
        {s.top === "hole" && <span className="mx-auto mt-1.5 block h-2 w-2 shrink-0 rounded-full" style={{ background: x.look.backgrounds[0] }} aria-hidden />}
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1 p-2.5">
          {!back && <Wordmark x={x} main={fg} accent={fg} className="block max-h-[45%] w-full" style={{ fontSize: "1rem", lineHeight: 1.05 }} />}
          {lines.map((l, i) => <p key={i} className={cx("leading-tight", !back && i === 0 ? "text-[11px] font-semibold" : "text-[10px]")} style={{ opacity: back ? 0.92 : 1 }}>{l}</p>)}
        </div>
      </div>
      {s.wheels && <span className="-mt-2 flex justify-around px-4" aria-hidden><i className="block h-4 w-4 rounded-full" style={{ background: x.palette.dark }} /><i className="block h-4 w-4 rounded-full" style={{ background: x.palette.dark }} /></span>}
    </div>
  );
}

function Part({ title, children, x }: { title: string; children: ReactNode; x: BoardCard }) {
  return <section className="mt-5"><h4 className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: x.look.text, opacity: 0.75 }}>{title}</h4>{children}</section>;
}

function Planche({ x, label, chosen, faded, canChoose, busy, onChoose }: { x: BoardCard; label?: string; chosen?: boolean; faded?: boolean; canChoose: boolean; busy: boolean; onChoose: (key: string) => void }) {
  const t = useT();
  const b = x.board, k = x.look;
  const head = x.faces.heading ? `"SINA ${x.faces.heading.family}", serif` : "serif", body = x.faces.body ? `"SINA ${x.faces.body.family}", sans-serif` : "sans-serif";
  const tile: CSSProperties = { background: k.surface, color: k.surfaceText };
  const groundLabel = { blanc: t("fond blanc", "white background"), degrade: t("fond en dégradé", "gradient background"), sombre: t("fond sombre", "dark background"), uni: t("fond clair coloré", "tinted light background") }[x.ground];
  const firstPicto = b.signs.find((s) => s.symbol)?.symbol;
  return (
    <article className={cx("overflow-hidden rounded-2xl border", chosen ? "border-ink ring-2 ring-ink" : "border-line", faded && "opacity-60")} data-brand-board={x.key}>
      <div className="px-4 pb-5 pt-4 @2xl:px-6" style={{ background: groundCss(x), color: k.text, fontFamily: body }}>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-75">{label ?? `${t("Identité", "Identity")} ${x.key}`} · {x.territory}</p>
        <div className="mt-3 grid items-center gap-4 @2xl:grid-cols-[1.1fr_.9fr]">
          <Wordmark x={x} main={k.text} accent={x.palette.accent} className="block max-h-44 w-full max-w-md text-5xl" style={{ lineHeight: 1 }} />
          <div>
            <p className="text-2xl leading-tight" style={{ fontFamily: head, fontWeight: x.faces.heading?.weight ?? 700 }} data-signature>{x.slogan}</p>
            <p className="mt-2 text-sm opacity-90">{x.promise}</p>
          </div>
        </div>

        <Part x={x} title={t("L'idée", "The idea")}>
          <div className="grid gap-2 @2xl:grid-cols-3">
            <div className="rounded-xl p-3" style={tile}><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{t("Ce que la marque croit", "What the brand believes")}</p><p className="mt-1 text-sm leading-snug">{b.idea.belief}</p></div>
            <div className="rounded-xl p-3" style={tile} data-confession={b.idea.confessionSupport > 0 ? "appuye" : "hypothese"}>
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{t("Ce que ton client pense tout bas", "What your customer thinks quietly")}</p>
              <p className="mt-1 text-sm leading-snug">« {b.idea.confession} »</p>
              <p className="mt-1.5 text-[11px] opacity-80">{b.idea.confessionSupport > 0 ? t(`Appuyé par ${b.idea.confessionSupport} parole${b.idea.confessionSupport > 1 ? "s" : ""} réelle${b.idea.confessionSupport > 1 ? "s" : ""} de clients.`, `Backed by ${b.idea.confessionSupport} real customer quote(s).`) : t("Hypothèse : pas encore de parole réelle pour l'appuyer.", "Hypothesis: no real quote backs it yet.")}</p>
            </div>
            <div className="rounded-xl p-3" style={tile}><p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{t("Ce qu'elle combat", "What it fights")}</p><p className="mt-1 text-sm leading-snug">{b.idea.enemy}</p></div>
          </div>
          <p className="mt-2 text-xs opacity-90"><b>{t("La preuve, dans l'objet", "The proof, in the object")} :</b> {b.idea.proof} <b className="ml-1">{t("Ce que ça coûte", "What it costs")} :</b> {b.idea.cost}</p>
        </Part>

        {(x.nameWhy || x.nameAnchor) && <Part x={x} title={t("Le nom", "The name")}>
          <p className="text-sm">{x.nameWhy}</p>
          {(x.nameAnchor || x.nameExpression) && <p className="mt-1 text-xs opacity-85">{x.nameAnchor && <><b>{t("Le détail réel", "The real detail")} :</b> {x.nameAnchor}. </>}{x.nameExpression && <><b>{t("La deuxième lecture", "The second reading")} :</b> {x.nameExpression}.</>}</p>}
        </Part>}

        <Part x={x} title={t("Les signes qu'on reconnaît sans lire le nom", "Signs you recognise without reading the name")}>
          <div className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
            {b.signs.map((s, i) => (
              <div key={i} className="rounded-xl p-3" style={tile} data-sign={s.kind}>
                {s.symbol ? <PictoView p={s.symbol} main={k.surfaceText} accent={x.palette.accent} className="mb-2 h-10 w-10" /> : <span className="mb-2 block h-1.5 w-8 rounded-full" style={{ background: x.palette.accent }} aria-hidden />}
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{s.kindLabel}</p>
                <p className="text-sm font-semibold leading-snug">{s.title}</p>
                <p className="mt-0.5 text-xs leading-snug opacity-90">{s.text}</p>
              </div>
            ))}
          </div>
        </Part>

        <Part x={x} title={t("En situation", "In real life")}>
          <div className="grid items-end gap-5 @2xl:grid-cols-[auto_auto_1fr]">
            <figure className="m-0" data-object={b.object.kind}>
              <div className="flex items-end gap-3"><ObjectFace x={x} lines={b.object.front} head={head} />{b.object.back.length > 0 && <ObjectFace x={x} lines={b.object.back} back head={head} />}</div>
              <figcaption className="mt-2 text-[11px] opacity-75">{b.object.label}{b.object.back.length > 0 ? t(", devant et dos", ", front and back") : ""}</figcaption>
            </figure>
            <figure className="m-0" data-phone>
              <div className="flex w-44 flex-col overflow-hidden rounded-[22px] border-[5px] shadow-lg" style={{ borderColor: "#0B0D18", aspectRatio: "9 / 17", background: groundCss(x), color: k.text }}>
                <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5"><Wordmark x={x} main={k.text} accent={x.palette.accent} className="block h-5 w-auto max-w-[60%] text-xs" /><span className="truncate text-[8px] opacity-70">{b.site.menu.join(" · ")}</span></div>
                <div className="flex flex-1 flex-col justify-center gap-1.5 px-2.5">
                  <p className="text-[17px] leading-[1.05]" style={{ fontFamily: head, fontWeight: x.faces.heading?.weight ?? 700 }}>{b.site.headline}</p>
                  <p className="text-[9.5px] leading-snug opacity-90">{b.site.text}</p>
                  <span className="mt-1 inline-block self-start rounded-full px-2.5 py-1 text-[9.5px] font-semibold" style={{ background: k.button, color: k.buttonText }}>{b.site.button}</span>
                </div>
                <div className="mx-2.5 mb-2.5 rounded-lg p-2 text-[8.5px] leading-snug" style={tile}>{b.lines[0]}</div>
              </div>
              <figcaption className="mt-2 text-[11px] opacity-75">{t("Le haut de ton site, sur téléphone", "The top of your site, on a phone")}</figcaption>
            </figure>
            <figure className="m-0 min-w-0" data-posts>
              <div className="grid grid-cols-3 gap-2">
                {b.posts.map((p, i) => {
                  const st: CSSProperties = p.look === "couleur" ? { background: k.button, color: k.buttonText } : p.look === "fond" ? { background: groundCss(x), color: k.text, border: `1px solid ${k.text}22` } : tile;
                  return (
                    <div key={i} className="relative flex flex-col justify-end overflow-hidden rounded-lg p-2 shadow" style={{ ...st, aspectRatio: "4 / 5" }} data-post={p.look}>
                      {p.look === "motif" && firstPicto && <PictoView p={firstPicto} main={k.surfaceText} accent={x.palette.accent} className="absolute -right-3 -top-3 h-20 w-20 opacity-20" />}
                      {p.look === "citation" && <span className="mb-1 block h-1 w-6 rounded-full" style={{ background: x.palette.accent }} aria-hidden />}
                      <p className="relative text-[12px] leading-[1.1] @2xl:text-sm" style={{ fontFamily: head, fontWeight: x.faces.heading?.weight ?? 700 }}>{p.look === "citation" ? `« ${p.text} »` : p.text}</p>
                    </div>
                  );
                })}
              </div>
              <figcaption className="mt-2 text-[11px] opacity-75">{t("Trois publications", "Three posts")}</figcaption>
            </figure>
          </div>
        </Part>

        <Part x={x} title={t("La voix", "The voice")}>
          <div className="grid gap-2 @2xl:grid-cols-2">
            <div className="space-y-2 rounded-xl p-3" style={tile}>
              {b.voice.sliders.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_4.5rem_1fr] items-center gap-2 text-[11px]" data-slider={Math.round(s.value)}>
                  <span>{s.left}</span>
                  <span className="relative block h-1.5 rounded-full" style={{ background: `${k.surfaceText}33` }}><i className="absolute top-1/2 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${Math.min(100, Math.max(0, s.value))}%`, background: k.button }} /></span>
                  <span className="text-right">{s.right}</span>
                </div>
              ))}
              <p className="pt-1 text-[11px]"><b>{t("Ses mots", "Its words")} :</b> {b.voice.houseWords.join(", ")}</p>
              <p className="text-[11px]"><b>{t("Jamais", "Never")} :</b> {b.voice.bannedWords.join(", ")}</p>
            </div>
            <div className="space-y-1.5 rounded-xl p-3 text-xs" style={tile}>
              {b.voice.thisNotThat.map((p, i) => <p key={i} className="leading-snug"><span className="font-semibold">{t("Elle dit", "It says")} :</span> {p.yes} <span className="opacity-70">· {t("jamais", "never")} : {p.no}</span></p>)}
              {b.lines.map((l, i) => <p key={`l${i}`} className="leading-snug" style={{ fontFamily: head }} data-line>{l}</p>)}
            </div>
          </div>
        </Part>

        <div className="mt-5 rounded-xl border p-3 text-xs" style={{ borderColor: `${k.text}55`, color: k.text }} data-to-prove>
          <p className="font-bold">{t("Ce qui reste à prouver", "What is still to prove")}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">{b.toProve.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </div>
      </div>
      <div className="flex h-5 border-y border-black/10" aria-label={t("Palette", "Palette")}>
        {(["light", "dark", "primary", "secondary", "accent"] as const).map((r) => <span key={r} className="flex-1" style={{ background: x.palette[r] }} />)}
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
    <section className="rounded-xl border border-line bg-card p-4 text-sm" data-brand-study>
      <h3 className="text-sm font-semibold">{t("Ce que j'ai compris de ton marché", "What I understood about your market")}</h3>
      <p className="mt-1 text-xs text-muted">{s.sources > 0 ? t(`J'ai lu ${s.sources} page${s.sources > 1 ? "s" : ""} et gardé ${s.quoteCount} parole${s.quoteCount > 1 ? "s" : ""} de clients, mot pour mot.`, `I read ${s.sources} page(s) and kept ${s.quoteCount} customer quote(s), word for word.`) : t("Ma recherche sur le web n'a rien donné : je n'ai lu aucune parole réelle de clients.", "My web research returned nothing: I read no real customer quotes.")}</p>
      {s.quotes.length > 0 && <ul className="mt-2 grid gap-2 @2xl:grid-cols-2">{s.quotes.map((q, i) => <li key={i} className="rounded-lg border-l-4 border-ink bg-paper px-3 py-2 text-xs"><span>« {q.text} »</span>{/^https?:\/\//i.test(q.url) && <a className="mt-0.5 block truncate text-[11px] text-muted underline" href={q.url} target="_blank" rel="noreferrer noopener">{q.url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}</a>}</li>)}</ul>}
      {!!s.mould && <p className="mt-2 text-xs"><b>{t("Ce que font tous tes concurrents", "What all your competitors do")} :</b> {s.mould}</p>}
      {s.competitors.length > 0 && <p className="mt-1 text-xs"><b>{t("Concurrents regardés", "Competitors looked at")} :</b> {s.competitors.join(", ")}</p>}
      {s.substitutes.length > 0 && <p className="mt-1 text-xs"><b>{t("Ce que font les gens à la place", "What people do instead")} :</b> {s.substitutes.join(" ; ")}</p>}
      {s.notFound.length > 0 && <p className="mt-1 text-xs text-muted"><b>{t("Cherché, pas trouvé", "Searched, not found")} :</b> {s.notFound.join(" ; ")}</p>}
    </section>
  );
}

/** Étape 1 : les identités en planches de marque (2, 3 ou 4 selon le forfait), puis le choix du client. */
export function BrandBoards({ ids, busy, onChoose }: { ids: BoardSet; busy: boolean; onChoose: (key: string) => void }) {
  const t = useT();
  const faces = [...ids.list, ...(ids.final ? [ids.final] : [])].flatMap((x) => [x.faces.heading, x.faces.body]).filter((f): f is NonNullable<Face> => !!f);
  const css = [...new Map(faces.map((f) => [f.file, f])).values()].map((f) => `@font-face{font-family:"SINA ${f.family}";src:url(/api/syna/fonts/${f.file}) format("truetype");font-weight:${f.weight};font-display:swap}`).join("");
  return (
    <div className="@container mt-2 space-y-3" data-syna-brand-boards={ids.round}>
      <style>{css}</style>
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
