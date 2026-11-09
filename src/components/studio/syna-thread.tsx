"use client";
/**
 * SINA agent (#492) : LE fil unique du projet. Discussion libre, pièces jointes (photos, vidéos, documents), actions
 * dans tous les modules, accords pour les actions sensibles et hors budget, changements vérifiés par module.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, cx, Textarea, useApi } from "../ui";
import { ThemeDemoViewer } from "./theme-demo-viewer";
import type { ThemeDemoStatus } from "@/lib/theme/theme-demos";
import type { DirectionCard } from "@/lib/theme/directions";
import { useT } from "../i18n";
import { useOptionalProject } from "./project-context";
import { stepLabel } from "./journey-labels";

type Msg = { id: string; seq: number; role: "user" | "assistant" | "tool" | "event"; runId: string | null; content: any; createdAt: number };
type View = {
  conversationId: string; projectId: string | null; messages: Msg[];
  run: { id: string; status: string; step: number; pending: any; error: string | null } | null;
  budget: { authorizedPct: number | null; spentPct: number | null };
  attachments: { id: string; kind: string; name: string; analysis: any }[];
  journey?: { current: number; mode: "creation" | "refonte"; keep: string[]; steps: { n: number; fr: string; en: string; status: "todo" | "doing" | "review" | "done" | "skipped"; ready?: boolean }[]; identities?: Identities | null; logos?: Logos | null; brandKit?: Kit | null; angles?: Angles | null; activity?: Activity | null; themes?: Themes | null; families?: Families | null; siteCopy?: { pages: Record<string, CopyPage> } | null };
};
type Face = { family: string; file: string; weight: number } | null;
type IdentityCard = { nameWhy?: string;
  key: "A" | "B" | "C"; name: string; nameStyle: string; slogan: string; promise: string; territory: string; ground: "blanc" | "degrade" | "sombre"; gradient?: { from: string; to: string };
  palette: { dark: string; primary: string; secondary: string; accent: string; light: string }; paletteFamily: string;
  fontStyle: string; tone: { adjectives: string[]; avoid: string[] }; logoStyleLabel: string; logoIdea: string; why: string;
  faces: { heading: Face; body: Face };
};
type Identities = { round: number; issues: string[]; chosen: { key: string; mix: Record<string, string> } | null; list: IdentityCard[]; final?: (IdentityCard & { mixLabel?: string }) | null };

/** Étape 1 : les 3 identités côte à côte, chacune dans SES couleurs et SES vraies polices. */
function IdentityCards({ ids, busy, onChoose }: { ids: Identities; busy: boolean; onChoose: (key: string) => void }) {
  const t = useT();
  const faces = [...ids.list, ...(ids.final ? [ids.final] : [])].flatMap((x) => [x.faces.heading, x.faces.body]).filter((f): f is NonNullable<Face> => !!f);
  const css = [...new Map(faces.map((f) => [f.file, f])).values()].map((f) => `@font-face{font-family:"SINA ${f.family}";src:url(/api/syna/fonts/${f.file}) format("truetype");font-weight:${f.weight};font-display:swap}`).join("");
  const fam = (f: Face, fallback: string) => (f ? `"SINA ${f.family}", ${fallback}` : fallback);
  const card = (x: IdentityCard, o: { key: string; label?: string; chosen?: boolean; faded?: boolean }) => {
    const { key, label, chosen, faded } = o;
    return (
            <article key={key} className={cx("overflow-hidden rounded-xl border", chosen ? "border-ink ring-2 ring-ink" : "border-line", faded && "opacity-60")} data-identity={key}>
        <div className="px-4 pb-4 pt-3" style={{ background: x.ground === "sombre" ? x.palette.dark : x.ground === "degrade" && x.gradient ? `linear-gradient(135deg, ${x.gradient.from}, ${x.gradient.to})` : x.palette.light, color: x.ground === "sombre" ? x.palette.light : x.ground === "degrade" && x.gradient ? readable(x.palette, [x.gradient.from, x.gradient.to]) : x.palette.dark, fontFamily: fam(x.faces.body, "sans-serif") }}>
          <p className="text-[11px] uppercase tracking-wider opacity-70">{label ?? `${t("Identité", "Identity")} ${x.key}`} · {t({ blanc: "fond blanc", degrade: "fond en dégradé", sombre: "fond sombre" }[x.ground] ?? "", { blanc: "white background", degrade: "gradient background", sombre: "dark background" }[x.ground] ?? "")} · {x.territory}</p>
          <h3 className="mt-2 text-3xl leading-tight" style={{ fontFamily: fam(x.faces.heading, "serif"), fontWeight: x.faces.heading?.weight ?? 600 }}>{x.name}</h3>
          <span className="mt-2 block h-1 w-10 rounded-full" style={{ background: x.palette.accent }} aria-hidden />
          <p className="mt-1 text-base">{x.slogan}</p>
          <p className="mt-3 text-sm opacity-90">{x.promise}</p>
          <span className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold" style={{ background: x.palette.primary, color: [x.palette.dark, x.palette.light, "#141414", "#FFFFFF"].reduce((a, b) => (ratioOf(b, x.palette.primary) > ratioOf(a, x.palette.primary) ? b : a)) }}>{t("Bouton d'exemple", "Sample button")}</span>
        </div>
        <div className="flex h-6 border-y border-black/10" aria-label={t("Palette", "Palette")}>
          {(["light", "dark", "primary", "secondary", "accent"] as const).map((r) => <span key={r} className={cx("flex-1", r === "light" && "border-r border-black/10")} style={{ background: x.palette[r] }} title={`${r} ${x.palette[r]}`} />)}
        </div>
        <dl className="space-y-1 bg-card px-4 py-3 text-xs">
          {!!x.nameWhy && <div><dt className="inline font-semibold">{t("Pourquoi ce nom", "Why this name")} : </dt><dd className="inline">{x.nameWhy}</dd></div>}
          <div><dt className="inline font-semibold">{t("Couleurs", "Colours")} : </dt><dd className="inline">{x.paletteFamily} — {x.ground === "degrade" && x.gradient ? `${t("dégradé", "gradient")} ${x.gradient.from} → ${x.gradient.to}` : `${t("fond", "background")} ${x.ground === "sombre" ? x.palette.dark : x.palette.light}`}, {t("texte", "text")} {x.ground === "sombre" ? x.palette.light : x.palette.dark}, {t("bouton", "button")} {x.palette.primary}, {t("surface", "surface")} {x.palette.secondary}, {t("accent", "accent")} {x.palette.accent}</dd></div>
          <div><dt className="inline font-semibold">{t("Polices", "Fonts")} : </dt><dd className="inline">{x.faces.heading?.family ?? "?"} / {x.faces.body?.family ?? "?"}{x.fontStyle ? ` — ${x.fontStyle}` : ""}</dd></div>
          <div><dt className="inline font-semibold">{t("Ton", "Tone")} : </dt><dd className="inline">{x.tone.adjectives.join(", ")} · {t("jamais", "never")} : {x.tone.avoid.join(", ")}</dd></div>
          <div><dt className="inline font-semibold">{t("Idée de logo", "Logo idea")} : </dt><dd className="inline">{x.logoStyleLabel} — {x.logoIdea}</dd></div>
          {!!x.why && <div><dt className="inline font-semibold">{t("Pourquoi pour toi", "Why it fits you")} : </dt><dd className="inline">{x.why}</dd></div>}
        </dl>
        <div className="border-t border-line bg-card px-4 py-2">
          {chosen
            ? <p className="text-xs font-semibold">✓ {t("Ton identité, enregistrée comme marque du projet", "Your identity, saved as the project's brand")}</p>
            : !ids.chosen && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.key)}>{t(`Je choisis ${x.key}`, `I choose ${x.key}`)}</Button>}
        </div>
      </article>
    );
  };
  return (
    <div className="@container mt-2 space-y-2" data-syna-identities={ids.round}>
      <style>{css}</style>
      {/* Largeur du fil (panneau étroit ou plein cadre), pas de l'écran : une carte par ligne dans le panneau. */}
      {ids.final && <div className="space-y-1" data-syna-identity-final>
        <p className="text-xs font-semibold">{t("Ton identité", "Your identity")}{ids.final.mixLabel ? ` · ${ids.final.mixLabel}` : ""}</p>
        {card(ids.final, { key: "final", label: t("Ton identité", "Your identity"), chosen: true })}
        <p className="pt-1 text-xs text-muted">{t("Les 3 propositions de départ :", "The 3 original proposals:")}</p>
      </div>}
      <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-3">
        {ids.list.map((x) => card(x, { key: x.key, faded: !!ids.final }))}
      </div>
      {!ids.chosen && <p className="text-xs text-muted">{t("Tu peux aussi mélanger (par exemple le nom de A avec les couleurs de C), retoucher un nom ou un slogan, ou demander une nouvelle proposition : écris-le simplement.", "You can also mix (e.g. A's name with C's colours), tweak a name or tagline, or ask for a new proposal.")}</p>}
      {!!ids.issues.length && <p className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs text-ink dark:bg-amber-950/30" data-syna-identity-issues>{t("Points que le contrôle du Studio n'a pas pu valider", "Points the Studio check could not validate")} : {ids.issues.join(" ; ")}</p>}
    </div>
  );
}
type CalItem = { entryId: string; kind: "publication" | "publicite"; ymd: string; time: string; networkLabel: string; action: string; title: string; copyText: string; files: { assetId: string; fileName: string; kind: string; href: string; thumb: string }[]; status: "a_publier" | "publie" | "en_retard" | "introuvable"; statusLabel: string };
type CalView = { days: { ymd: string; label: string; today: boolean; items: CalItem[] }[]; warnings: string[]; totals: { items: number; done: number; late: number; todo: number }; icsHref: string; printHref: string };

/**
 * Étape 11 : le calendrier de publication MANUEL dans le fil. Jour par jour : fichier à envoyer, texte à copier, case
 * « publié » que le client coche lui-même (gratuit, sans passer par SINA, permis pendant le chantier).
 */
function CalendarCard({ projectId, refreshKey }: { projectId: string; refreshKey: string }) {
  const t = useT();
  const [v, setV] = useState<CalView | null>(null), [all, setAll] = useState(false), [err, setErr] = useState(""), [copied, setCopied] = useState("");
  useEffect(() => { api<CalView>(`/api/projects/${projectId}/calendrier`).then(setV).catch((e) => setErr(e.message)); }, [projectId, refreshKey]);
  async function tick(i: CalItem) {
    try { const r = await api<{ view: CalView }>(`/api/projects/${projectId}/calendrier`, { body: { entryIds: [i.entryId], done: i.status !== "publie" } }); setV(r.view); } catch (e: any) { setErr(e.message); }
  }
  async function copy(i: CalItem) { try { await navigator.clipboard.writeText(i.copyText); setCopied(i.entryId); setTimeout(() => setCopied(""), 1500); } catch { /* presse-papiers refusé */ } }
  if (err) return <p className="mt-2 text-xs text-red-600">{err}</p>;
  if (!v) return null;
  const days = v.days.filter((d) => d.items.length);
  const shown = all ? days : days.slice(0, 7);
  return (
    <div className="mt-2 rounded-xl border border-line bg-card px-3 py-2 text-sm" data-syna-calendar>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{t(`${v.totals.done} publiée(s) · ${v.totals.todo} à publier${v.totals.late ? ` · ${v.totals.late} en retard` : ""}`, `${v.totals.done} posted · ${v.totals.todo} to post${v.totals.late ? ` · ${v.totals.late} late` : ""}`)}</span>
        <span className="flex gap-3"><a className="underline" href={v.icsHref}>{t("Ajouter à mon agenda", "Add to my calendar")}</a><a className="underline" href={v.printHref}>{t("Liste à imprimer", "Printable list")}</a></span>
      </div>
      <ol className="mt-2 space-y-3">
        {shown.map((d) => (
          <li key={d.ymd} data-calendar-day={d.ymd}>
            <p className={cx("text-xs font-semibold first-letter:uppercase", d.today && "text-signal")}>{d.label}{d.today ? ` · ${t("aujourd'hui", "today")}` : ""}</p>
            <ul className="mt-1 space-y-2">
              {d.items.map((i) => (
                <li key={i.entryId} className={cx("rounded-lg border px-2 py-2", i.status === "publie" ? "border-line opacity-70" : i.status === "en_retard" ? "border-amber-400" : "border-line")} data-calendar-entry={i.entryId} data-status={i.status}>
                  <div className="flex items-start gap-2">
                    {i.files[0] && <a href={i.files[0].href} download={i.files[0].fileName} title={t("Télécharger", "Download")}><img src={i.files[0].thumb} alt={i.files[0].fileName} className="h-14 w-14 rounded object-cover" loading="lazy" /></a>}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs"><b>{i.time}</b> · {i.action}</p>
                      {i.title && <p className="truncate text-xs text-muted">{i.title}</p>}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        {i.files.map((f) => <a key={f.assetId} className="underline" href={f.href} download={f.fileName}>{f.fileName}</a>)}
                        {!!i.copyText && <button type="button" className="underline" onClick={() => copy(i)}>{copied === i.entryId ? t("Texte copié", "Text copied") : t("Copier le texte", "Copy the text")}</button>}
                      </div>
                    </div>
                    {i.status !== "introuvable" && <label className="flex shrink-0 items-center gap-1 text-xs"><input type="checkbox" checked={i.status === "publie"} onChange={() => tick(i)} />{t("Publié", "Posted")}</label>}
                  </div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      {days.length > 7 && <button type="button" className="mt-2 text-xs underline" onClick={() => setAll((x) => !x)}>{all ? t("Voir moins", "Show less") : t(`Voir les ${days.length} jours`, `Show all ${days.length} days`)}</button>}
      {!days.length && <p className="text-xs text-muted">{t("Rien à publier pour l'instant.", "Nothing to post yet.")}</p>}
      {!!v.warnings.length && <p className="mt-2 text-xs text-muted">{v.warnings.join(" ")}</p>}
    </div>
  );
}

type Logos = { round: number; chosen: string | null; list: { source: "A" | "B" | "C"; name: string; style: string; assetId: string | null; href: string | null; verdict: string; score: number | null; reason: string; best?: boolean }[] };

/** Étape 2 : les 3 logos, chacun sur fond blanc et sur le fond de la marque, avec le verdict honnête du contrôle. */
function LogoCards({ logos, brandBg, busy, onChoose }: { logos: Logos; brandBg: string | null; busy: boolean; onChoose: (source: string) => void }) {
  const t = useT();
  return (
    <div className="@container mt-2 space-y-2" data-syna-logos={logos.round}>
      <div className="grid grid-cols-1 gap-2 @3xl:grid-cols-3">
        {logos.list.map((x) => {
          const chosen = logos.chosen === x.source;
          const ok = x.verdict === "FINAL";
          return (
            <article key={x.source} className={cx("overflow-hidden rounded-xl border bg-card", chosen ? "border-ink ring-2 ring-ink" : "border-line", logos.chosen && !chosen && "opacity-60")} data-logo={x.source} data-verdict={x.verdict}>
              <div className="grid grid-cols-2">
                <div className="flex h-44 items-center justify-center bg-white p-3">{x.href ? <img src={x.href} alt={`${t("Logo", "Logo")} ${x.source} — ${x.name}`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-muted">{t("Pas de dessin", "No drawing")}</span>}</div>
                <div className="flex h-44 items-center justify-center p-3" style={{ background: brandBg ?? "#F5F5F5" }}>{x.href && <img src={x.href} alt="" className="max-h-full max-w-full object-contain" />}</div>
              </div>
              <div className="space-y-1 px-3 py-2 text-xs">
                <p className="font-semibold">{t("Logo", "Logo")} {x.source} · {x.name}</p>
                <p className={ok ? "text-emerald-700" : "text-amber-700"} data-logo-verdict>{ok ? `✓ ${t("Validé par le contrôle", "Passed the check")}${x.score != null ? ` (${String(x.score).replace(".", ",")}/10)` : ""}` : x.assetId ? `${t("Non validé par le contrôle", "Did not pass the check")} : ${x.reason}` : `${t("Pas de dessin", "No drawing")} : ${x.reason}`}</p>
              </div>
              <div className="border-t border-line px-3 py-2">
                {chosen ? <p className="text-xs font-semibold">✓ {t("Logo de ta marque", "Your brand logo")}</p> : !logos.chosen && x.assetId && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.source)}>{t(`Je choisis le logo ${x.source}`, `I choose logo ${x.source}`)}</Button>}
              </div>
            </article>
          );
        })}
      </div>
      {!logos.chosen && <p className="text-xs text-muted">{t("Tu peux aussi demander une nouvelle proposition, avec tes mots (par exemple « plus simple », « sans illustration »).", "You can also ask for a new proposal, in your own words.")}</p>}
    </div>
  );
}

type Angles = { list: { id: string; title: string; goal?: string; why?: string; story?: string; show?: string; organicExample?: string; cta?: string; audience: string; motivation: string; message: string; emotion: string; proofsToConfirm: string[]; arguments: string[]; sources: { title: string; url: string }[] }[]; recommendedId: string | null; sourceCount: number; chosen: string[] | null };

/** Couleurs des bandeaux, reprises du guide « 5 angles marketing » du propriétaire. */
const ANGLE_BANDS = ["#9C3343", "#74533F", "#43644A", "#B46D25", "#73507F"];

/**
 * Étape 4 : les 5 angles au format du guide du propriétaire (7 novembre 2026) — bandeau titre + objectif, pourquoi,
 * accroche, ce qu'on raconte, ce qu'on montre, publication conseillée, appel à l'action, informations à confirmer,
 * sources. Le client peut en choisir PLUSIEURS : le premier coché est l'angle principal.
 */
function AngleCards({ angles, busy, onChoose }: { angles: Angles; busy: boolean; onChoose: (titles: string[]) => void }) {
  const t = useT();
  const [picked, setPicked] = useState<string[]>([]);
  const chosen = angles.chosen ?? [];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const row = (label: string, value?: string | null) => (value ? <div><dt className="font-semibold" style={{ color: "inherit" }}>{label}</dt><dd className="text-ink/90">{value}</dd></div> : null);
  return (
    <div className="@container mt-2 space-y-2" data-syna-angles>
      <p className="text-xs text-muted">{t(`${angles.sourceCount} sources lues sur le web (places de marché exclues). Tu peux choisir un ou plusieurs angles : le premier coché sera l'angle principal de ton site, les autres serviront aux publications et aux publicités.`, `${angles.sourceCount} web sources read. You can pick one or several angles.`)}</p>
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
        {angles.list.map((a, i) => {
          const band = ANGLE_BANDS[i % ANGLE_BANDS.length];
          const rank = chosen.length ? chosen.indexOf(a.id) : picked.indexOf(a.id);
          return (
            <article key={a.id} className={cx("overflow-hidden rounded-xl border bg-card text-xs", rank >= 0 ? "ring-2" : "border-line", chosen.length > 0 && rank < 0 && "opacity-60")} style={rank >= 0 ? { borderColor: band, boxShadow: `0 0 0 2px ${band}` } : undefined} data-angle={a.id}>
              <header className="px-4 py-3 text-white" style={{ background: band }}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-bold leading-tight">{String(i + 1).padStart(2, "0")}  {a.title}</h4>
                  {angles.recommendedId === a.id && <span className="shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold" style={{ color: band }}>{t("Recommandé", "Recommended")}</span>}
                </div>
                {!!a.goal && <p className="mt-1 text-sm opacity-90">{a.goal}</p>}
              </header>
              <dl className="space-y-2 px-4 py-3" style={{ color: band }}>
                {row(t("Pourquoi cet angle", "Why this angle"), a.why || a.motivation)}
                {row(t("Accroche proposée", "Proposed hook"), a.message)}
                {row(t("Ce qu'on raconte", "What we tell"), a.story)}
                {row(t("Ce qu'on montre", "What we show"), a.show)}
                {row(t("Exemple de contenu organique", "Organic content example"), a.organicExample)}
                {row(t("Appel à l'action", "Call to action"), a.cta)}
                {row(t("Informations à confirmer", "To confirm"), a.proofsToConfirm.join(" ; "))}
              </dl>
              {!!a.sources.length && <p className="px-4 pb-2 text-[11px] text-muted">{t("Sources", "Sources")} : {a.sources.map((x, k) => <span key={x.url}>{k ? " · " : ""}<a className="underline" href={x.url} target="_blank" rel="noreferrer">{x.title}</a></span>)}</p>}
              <div className="border-t border-line px-4 py-2">
                {chosen.length
                  ? rank >= 0 && <p className="font-semibold" style={{ color: band }}>✓ {rank === 0 ? t("Angle principal", "Main angle") : t("Angle retenu", "Selected angle")}</p>
                  : <Button size="sm" variant={rank >= 0 ? "primary" : "secondary"} disabled={busy} onClick={() => toggle(a.id)} data-angle-pick={a.id}>{rank >= 0 ? (rank === 0 ? t("✓ Angle principal", "✓ Main angle") : t(`✓ Retenu (${rank + 1})`, `✓ Selected (${rank + 1})`)) : t("Choisir cet angle", "Pick this angle")}</Button>}
              </div>
              <p className="px-4 pb-2 text-[10px] text-muted">{t("Un angle principal par contenu. Les scènes doivent démontrer la promesse.", "One main angle per content.")}</p>
            </article>
          );
        })}
      </div>
      {!chosen.length && !!picked.length && <Button disabled={busy} onClick={() => onChoose(picked.map((id) => angles.list.find((x) => x.id === id)!.title))} data-angles-validate>{t(picked.length > 1 ? `Valider mes ${picked.length} angles` : "Valider cet angle", picked.length > 1 ? `Confirm my ${picked.length} angles` : "Confirm this angle")}</Button>}
    </div>
  );
}

type Themes = { list: { id: string; name: string; tagline: string; preview: string; why: string; recommended: boolean; allowed: boolean; blocked?: string; demo: boolean }[]; recommendedId: string | null; all: boolean; chosen: string | null };

/**
 * Étape 6 : les thèmes du Studio TELS QU'ILS SONT (consigne du propriétaire : images et textes d'origine de leur
 * démonstration, jamais recomposés avec le projet du client), la démonstration complète, puis le choix du client :
 * un thème ou un thème sur mesure, jamais fait à sa place.
 */
function ThemeCards({ themes, busy, onChoose, onAll, onMockup }: { themes: Themes; busy: boolean; onChoose: (name: string) => void; onAll: () => void; onMockup: () => void }) {
  const t = useT();
  // Démo complète de chaque thème (ordinateur ou téléphone, toutes ses pages) : la visionneuse de la galerie du Studio.
  const { data: demoData } = useApi<{ demos: ThemeDemoStatus[] }>("/api/theme-demos");
  const demos = Object.fromEntries((demoData?.demos ?? []).map((x) => [x.id, x]));
  const [viewing, setViewing] = useState<string | null>(null);
  const shown = viewing ? themes.list.find((x) => x.id === viewing) : null;
  const shownDemo = viewing ? demos[viewing] : null;
  return (
    <div className="@container mt-2 space-y-2" data-syna-themes>
      <p className="text-xs text-muted">{t("Voici les thèmes du Studio tels qu'ils sont, avec les images et les textes de leur démonstration. Choisir un thème est gratuit : ton site s'y compose ensuite avec ta marque et tes produits. Tu peux aussi préférer un thème sur mesure : monté pour toi dans le style que tu choisis, modifiable sur demande (seules les photos nouvelles sont payantes, prix annoncé avant).", "Here are the Studio themes as they are, with their demo images and copy. Choosing a theme is free; you can also prefer a custom mockup (paid, price shown first).")}</p>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
        {themes.list.map((th) => {
          const chosen = themes.chosen === th.id;
          return (
            <article key={th.id} className={cx("overflow-hidden rounded-xl border bg-card text-xs", chosen ? "border-accent ring-2 ring-accent" : "border-line", themes.chosen && !chosen && "opacity-60")} data-theme={th.id}>
              <button type="button" className="relative block aspect-[4/3] w-full overflow-hidden bg-paper-2 disabled:cursor-default" disabled={!demos[th.id]?.ready} onClick={() => setViewing(th.id)} title={t("Voir la démo complète (ordinateur ou téléphone)", "See the full demo (desktop or phone)")} data-theme-open={th.id}>
                <img src={th.preview} alt={t(`Démonstration du thème ${th.name}`, `${th.name} theme demo`)} className="h-full w-full object-cover object-top" loading="lazy" />
                {th.recommended && <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-paper">{t("Recommandé", "Recommended")}</span>}
              </button>
              <div className="space-y-1 px-3 py-2">
                <h4 className="text-sm font-bold">{th.name} <span className="font-normal text-muted">· {th.tagline}</span></h4>
                <p>{th.why}</p>
                {!th.allowed && <p className="text-amber-700">{th.blocked ?? t("Non inclus dans ton forfait.", "Not included in your plan.")}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
                {demos[th.id]?.ready
                  ? <Button size="sm" variant="ghost" onClick={() => setViewing(th.id)} data-theme-demo={th.id}>{t("Voir la démo (ordinateur / téléphone)", "See the demo (desktop / phone)")}</Button>
                  : demoData && <span className="text-muted">{demos[th.id]?.preparing ? t("Démo en préparation…", "Demo being prepared…") : t("Démo pas encore disponible", "Demo not available yet")}</span>}
                {themes.chosen
                  ? chosen && <p className="font-semibold">✓ {t("Thème choisi", "Theme chosen")}</p>
                  : th.allowed && <Button size="sm" variant={th.recommended ? "primary" : "secondary"} disabled={busy} onClick={() => onChoose(th.name)} data-theme-pick={th.id}>{t("Choisir ce thème", "Choose this theme")}</Button>}
              </div>
            </article>
          );
        })}
      </div>
      {shown && shownDemo && <ThemeDemoViewer theme={{ id: shown.id, name: shown.name } as DirectionCard} status={shownDemo} onClose={() => setViewing(null)} current={themes.chosen === shown.id} blocked={shown.allowed ? null : shown.blocked ?? null} onChoose={themes.chosen || !shown.allowed ? undefined : () => { setViewing(null); onChoose(shown.name); }} choosing={busy} />}
      {!themes.chosen && <div className="flex flex-wrap items-center gap-2">
        {!themes.all && <Button size="sm" variant="ghost" disabled={busy} onClick={onAll} data-themes-all>{t("Voir tous les thèmes", "See all themes")}</Button>}
        {/* Après avoir vu les thèmes, le client peut préférer un thème sur mesure. */}
        <Button size="sm" variant="secondary" disabled={busy} onClick={onMockup} data-themes-mockup>{t("Je préfère un thème sur mesure", "I'd rather have a custom theme")}</Button>
      </div>}
    </div>
  );
}

type Families = { cards: { family: string; style: string; title: string; titleEn: string; pitch: string; pitchEn: string; mood: string; preview: string; demo?: string; sections: number }[]; chosen: string | null };

/**
 * Étape 6 : les familles de sections EN IMAGE (Classique ; Moderne · Sport chic ; Moderne · Streetwear néon). Le client
 * choisit le style qu'il préfère ; le thème n'est ensuite monté qu'avec les sections de cette famille (jamais de mélange).
 */
function FamilyCards({ families, busy, onChoose }: { families: Families; busy: boolean; onChoose: (title: string) => void }) {
  const t = useT();
  return (
    <div className="@container mt-2 space-y-2" data-syna-families>
      <p className="text-xs text-muted">{t("Deux familles de styles pour ton site, qui ne se mélangent jamais. Ouvre chaque thème en vrai (pages, panier, téléphone), puis choisis celui qui te ressemble : il sera repris à tes couleurs, avec ta marque et tes produits. C'est gratuit.", "Two style families for your site, never mixed. Open each theme live (pages, cart, phone), then pick the one that feels like you: it will use your colours, brand and products. It's free.")}</p>
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-3">
        {families.cards.map((c) => {
          const key = `${c.family}:${c.style}`, chosen = families.chosen === key;
          return (
            <article key={key} className={cx("overflow-hidden rounded-xl border bg-card text-xs", chosen ? "border-accent ring-2 ring-accent" : "border-line", families.chosen && !chosen && "opacity-60")} data-family={key}>
              <img src={c.preview} alt={t(`Aperçu du style ${c.title}`, `${c.titleEn} style preview`)} className="block aspect-[16/10] w-full object-cover object-top" loading="lazy" />
              <div className="space-y-1 px-3 py-2">
                <h4 className="text-sm font-bold">{t(c.title, c.titleEn)}</h4>
                <p>{t(c.pitch, c.pitchEn)}</p>
                <p className="text-muted">{c.mood} · {t(`${c.sections} sections au choix`, `${c.sections} sections to choose from`)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2">
                {c.demo && <a className="underline" href={c.demo} target="_blank" rel="noreferrer" data-family-demo={key}>{t("Voir le thème en vrai", "See the live theme")}</a>}
                {families.chosen
                  ? chosen && <p className="font-semibold">✓ {t("Style choisi", "Style chosen")}</p>
                  : <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(c.title)} data-family-pick={key}>{t("Je préfère ce style", "I prefer this style")}</Button>}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type CustomThemeView = { href: string; open: string; rev: number; choisi: boolean; pages: { key: string; label: string; sections: { uid: string; titre: string; textesClient: boolean }[] }[] };
type Picked = { uid: string; page: string | null; kind: string; path: string | null; text: string | null; src: string | null; role: string | null };

/**
 * Thème sur mesure (étape 6, décision du propriétaire du 9 novembre 2026) : le thème EN VRAI dans le fil (pages,
 * ordinateur ou téléphone) ; le client DÉSIGNE un élément (titre, texte, bouton, image, section) et dit ce qu'il veut
 * changer : SINA reçoit sa désignation et ne modifie que lui.
 */
function CustomThemeCard({ card, busy, onSend }: { card: CustomThemeView; busy: boolean; onSend: (text: string) => void }) {
  const t = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState(card.pages[0]?.key ?? "home"), [phone, setPhone] = useState(false), [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Picked | null>(null), [ask, setAsk] = useState("");
  const post = useCallback((m: object) => frame.current?.contentWindow?.postMessage({ source: "ct-studio", ...m }, "*"), []);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data;
      if (!d || d.source !== "ct-preview" || e.source !== frame.current?.contentWindow) return;
      if (d.type === "ready") { post({ type: "go", page }); post({ type: "view", view: phone ? "phone" : "desk" }); if (picking) post({ type: "pick", on: true }); }
      if (d.type === "page" && typeof d.page === "string") setPage(d.page);
      if (d.type === "picked") { setPicked({ uid: String(d.uid), page: d.page ?? null, kind: String(d.kind), path: d.path ?? null, text: d.text ?? null, src: d.src ?? null, role: d.role ?? null }); setPicking(false); post({ type: "pick", on: false }); }
    };
    addEventListener("message", on);
    return () => removeEventListener("message", on);
  }, [page, phone, picking, post]);
  const label = (k: string | null) => card.pages.find((p) => p.key === k)?.label ?? k ?? "";
  const section = picked ? card.pages.flatMap((p) => p.sections).find((s) => s.uid === picked.uid)?.titre ?? (picked.role === "header" ? t("En-tête", "Header") : picked.role === "footer" ? t("Pied de page", "Footer") : "") : "";
  function submit() {
    if (!picked || !ask.trim()) return;
    const where = [`section ${picked.uid}${section ? ` « ${section} »` : ""}`, picked.page ? `page ${label(picked.page)}` : "", picked.kind, picked.path ? `adresse ${picked.path}` : "", picked.src ? `photo ${picked.src}` : "", picked.text ? `« ${picked.text.slice(0, 160)} »` : ""].filter(Boolean).join(" · ");
    onSend(`[Élément désigné · ${where}] ${ask.trim()}`);
    setAsk(""); setPicked(null); post({ type: "unpick" });
  }
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-line bg-card text-xs" data-syna-custom-theme>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <b className="text-sm">{t("Ton thème sur mesure", "Your custom theme")}{card.choisi ? ` · ✓ ${t("choisi", "chosen")}` : ""}</b>
        <span className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant={phone ? "ghost" : "secondary"} onClick={() => { setPhone(false); post({ type: "view", view: "desk" }); }}>{t("Ordinateur", "Desktop")}</Button>
          <Button size="sm" variant={phone ? "secondary" : "ghost"} onClick={() => { setPhone(true); post({ type: "view", view: "phone" }); }}>{t("Téléphone", "Phone")}</Button>
          <a className="underline" href={card.open} target="_blank" rel="noreferrer">{t("Ouvrir en grand", "Open full size")}</a>
        </span>
      </div>
      <div className="flex flex-wrap gap-1 px-3 py-2">{card.pages.map((p) => <button key={p.key} type="button" className={cx("rounded-full border px-2 py-0.5", p.key === page ? "border-accent bg-accent text-paper" : "border-line")} onClick={() => { setPage(p.key); post({ type: "go", page: p.key }); }}>{p.label}</button>)}</div>
      <iframe ref={frame} key={card.rev} title={t("Thème sur mesure", "Custom theme")} src={card.href} className="block h-[560px] w-full border-y border-line bg-white" />
      <div className="space-y-2 px-3 py-2">
        <Button size="sm" variant={picking ? "secondary" : "ghost"} disabled={busy} onClick={() => { const on = !picking; setPicking(on); post({ type: "pick", on }); }} data-ct-pick>
          {picking ? t("Clique sur l'élément à changer dans le thème…", "Click the element to change…") : t("🎯 Désigner un élément", "🎯 Point at an element")}
        </Button>
        {picked && <div className="rounded-lg border border-accent/50 bg-paper-2 p-2" data-ct-picked>
          <p><b>{t("Élément désigné", "Selected element")}</b> : {picked.kind}{section ? ` — ${section}` : ""}{picked.page ? ` (${label(picked.page)})` : ""}{picked.text ? ` · « ${picked.text.slice(0, 90)} »` : ""}</p>
          <div className="mt-1 flex gap-2">
            <input className="min-w-0 flex-1 rounded border border-line bg-card px-2 py-1" value={ask} onChange={(e) => setAsk(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder={t("Que veux-tu changer ? (texte, photo, couleur, retirer…)", "What should change?")} aria-label={t("Ce que tu veux changer", "What to change")} />
            <Button size="sm" disabled={busy || !ask.trim()} onClick={submit}>{t("Envoyer à SINA", "Send to SINA")}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setPicked(null); post({ type: "unpick" }); }} aria-label={t("Retirer la désignation", "Clear selection")}>×</Button>
          </div>
        </div>}
        {!card.choisi && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onSend(t("Je choisis ce thème sur mesure.", "I choose this custom theme."))}>{t("Je choisis ce thème", "I choose this theme")}</Button>}
      </div>
    </div>
  );
}

type CopyPage = { seo: { title: string; description: string }; sections: { section: string; title: string | null; text: string | null; button: string | null; items: { title: string; text: string | null }[] }[] };
const COPY_PAGE_LABELS: Record<string, string> = { home: "Accueil" };

/** Étape 6, maquettes : les textes de la page, en entier, avant toute image (le client les lit et les valide). */
function CopyCard({ pages }: { pages: Record<string, CopyPage> }) {
  const t = useT();
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-line bg-card px-4 py-3 text-xs" data-syna-copy>
      {Object.entries(pages).map(([key, c]) => (
        <section key={key} className="space-y-2">
          <h4 className="text-sm font-bold">{t("Textes de la page", "Page copy")} « {COPY_PAGE_LABELS[key] ?? key} »</h4>
          <p className="text-muted">{t("Référencement", "SEO")} : <b className="text-ink">{c.seo.title}</b> — {c.seo.description}</p>
          {c.sections.map((s, i) => (
            <div key={i} className="border-t border-line pt-2">
              <p className="text-[10px] uppercase tracking-wide text-muted">{s.section}</p>
              {s.title && <p className="font-semibold">{s.title}</p>}
              {s.text && <p>{s.text}</p>}
              {!!s.items.length && <ul className="list-disc space-y-0.5 pl-4">{s.items.map((x, k) => <li key={k}><b className="font-medium">{x.title}</b>{x.text ? ` — ${x.text}` : ""}</li>)}</ul>}
              {s.button && <p className="mt-1 inline-block rounded-full border border-line px-2 py-0.5">{s.button}</p>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

type Activity = {
  company: Record<string, string | undefined>; none?: string[]; missing: { key: string; question: string; required: boolean }[];
  angle: { title: string; goal: string; message: string; story: string; cta: string; others: string[] } | null;
  keyMessages: string[]; objections: { objection: string; answer: string }[]; offer: { price: string | null; facts: string[] };
  products: { id: string; title: string; price: number | null; status: string }[]; gaps: string[]; validated: boolean;
};
const COMPANY_LABELS: [string, string][] = [["legalName", "Entreprise"], ["email", "E-mail"], ["phone", "Téléphone"], ["address", "Adresse"], ["siret", "SIRET"], ["shipping", "Livraison"], ["returns", "Retours"]];

/** Étape 5 : « Ton activité » — ce que le site va dire, réuni en une carte, puis la validation du client. */
function ActivityCard({ a, busy, onValidate }: { a: Activity; busy: boolean; onValidate: () => void }) {
  const t = useT();
  const block = (title: string, body: React.ReactNode) => <section className="space-y-1"><h5 className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</h5>{body}</section>;
  return (
    <div className="mt-2 space-y-3 rounded-xl border border-line bg-card p-4 text-xs" data-syna-activity>
      <h4 className="text-base font-semibold">{t("Ton activité", "Your business")}</h4>
      {block(t("L'entreprise", "The company"), <dl className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">{COMPANY_LABELS.map(([k, label]) => <div key={k}><dt className="inline font-semibold">{label} : </dt><dd className={cx("inline", !a.company[k] && a.missing.some((m) => m.key === k) && "text-amber-700", !a.company[k] && !a.missing.some((m) => m.key === k) && "text-muted")}>{a.company[k] || (a.missing.some((m) => m.key === k) ? t("à compléter", "to complete") : (a.none ?? []).includes(k) ? t("pas sur le site", "not on the site") : t("plus tard", "later"))}</dd></div>)}</dl>)}
      {a.angle && block(t("Angle principal", "Main angle"), <div><p className="text-sm font-semibold">{a.angle.title}{a.angle.goal ? <span className="font-normal text-muted"> — {a.angle.goal}</span> : null}</p>{!!a.angle.message && <p className="italic">« {a.angle.message} »</p>}{!!a.angle.cta && <p>{t("Appel à l'action", "Call to action")} : {a.angle.cta}</p>}{!!a.angle.others.length && <p className="text-muted">{t("Aussi retenus", "Also selected")} : {a.angle.others.join(", ")}</p>}</div>)}
      {!!a.keyMessages.length && block(t("Messages clés", "Key messages"), <ul className="list-disc pl-4">{a.keyMessages.map((m) => <li key={m}>{m}</li>)}</ul>)}
      {!!a.objections.length && block(t("Objections et réponses", "Objections and answers"), <ul className="space-y-1">{a.objections.map((o) => <li key={o.objection}><span className="font-semibold">« {o.objection} »</span> — {o.answer}</li>)}</ul>)}
      {block(t("L'offre", "The offer"), <div>{a.offer.price && <p>{t("Prix confirmé", "Confirmed price")} : {a.offer.price}</p>}{!!a.offer.facts.length && <ul className="list-disc pl-4">{a.offer.facts.map((f) => <li key={f}>{f}</li>)}</ul>}</div>)}
      {block(t("Produits (onglet Produits)", "Products"), a.products.length ? <ul className="space-y-0.5">{a.products.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.title}</span><span className={x.price == null ? "text-amber-700" : ""}>{x.price == null ? t("prix à compléter", "price missing") : `${String(x.price.toFixed(2)).replace(".", ",")} €`}</span></li>)}</ul> : <p className="text-amber-700">{t("Aucun produit pour l'instant.", "No product yet.")}</p>)}
      {a.validated ? <p className="font-semibold">✓ {t("Activité validée", "Business validated")}</p> : a.gaps.length ? <p className="text-amber-700" data-activity-gaps>{t("Encore à compléter", "Still to complete")} : {a.gaps.join(" ; ")}</p> : <Button size="sm" disabled={busy} onClick={onValidate}>{t("Je valide mon activité", "I validate my business")}</Button>}
    </div>
  );
}

type Kit = { validated: boolean; notes: string[]; items: { key: string; label: string; href: string; dark?: boolean; downloadHref?: string }[]; board: string | null; book: string | null; pages: string[] };

/** Étape 3 : l'image de marque complète (planche, déclinaisons du logo, charte PDF), puis la validation du client. */
function BrandKitCard({ kit, darkBg, busy, onValidate }: { kit: Kit; darkBg: string; busy: boolean; onValidate: () => void }) {
  const t = useT();
  return (
    <div className="@container mt-2 space-y-2 rounded-xl border border-line bg-card p-3" data-syna-brand-kit>
      {kit.board && <a href={kit.board} target="_blank" rel="noreferrer"><img src={kit.board} alt={t("Planche de marque", "Brand board")} className="w-full rounded-lg border border-line" data-kit-board /></a>}
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        {kit.items.filter((x) => !x.downloadHref).map((x) => (
          <figure key={x.key} className="overflow-hidden rounded-lg border border-line" data-kit-item={x.key}>
            <div className="flex h-28 items-center justify-center p-2" style={{ background: x.dark ? darkBg : x.key === "favicon-32" ? "#F4F4F2" : "#FFFFFF" }}>
              <img src={x.href} alt={x.label} className={cx("max-h-full max-w-full object-contain", x.key === "avatar" && "h-24 w-24 rounded-full", x.key === "favicon-32" && "h-8 w-8")} />
            </div>
            <figcaption className="border-t border-line px-2 py-1 text-[11px]">{x.label}</figcaption>
          </figure>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {kit.book && <a className="underline" href={kit.book} target="_blank" rel="noreferrer" data-kit-book>{t(`Ouvrir la charte de marque (PDF, ${kit.pages.length} pages)`, `Open the brand book (PDF, ${kit.pages.length} pages)`)}</a>}
        {kit.items.filter((x) => x.downloadHref).map((x) => <a key={x.key} className="underline" href={x.downloadHref} data-kit-download={x.key}>{t("Télécharger", "Download")} : {x.label}</a>)}
      </div>
      {!!kit.notes.length && <ul className="list-disc pl-4 text-xs text-amber-700" data-kit-notes>{kit.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      {kit.validated ? <p className="text-xs font-semibold">✓ {t("Image de marque validée", "Brand kit validated")}</p> : <Button size="sm" disabled={busy} onClick={onValidate}>{t("Je valide mon image de marque", "I validate my brand kit")}</Button>}
    </div>
  );
}

/** Fond de la marque choisie (aperçu des logos sur ce fond) : sombre, dégradé ou couleur de surface. */
function brandBackground(ids: Identities | null | undefined): string | null {
  const f = ids?.final;
  if (!f) return null;
  return f.ground === "sombre" ? f.palette.dark : f.ground === "degrade" && f.gradient ? `linear-gradient(135deg, ${f.gradient.from}, ${f.gradient.to})` : f.palette.secondary;
}

/** Texte le plus lisible sur les deux couleurs d'un dégradé. */
function readable(p: { dark: string; light: string }, bgs: string[]) {
  const worst = (fg: string) => Math.min(...bgs.map((b) => ratioOf(fg, b)));
  return worst(p.dark) >= worst(p.light) ? p.dark : p.light;
}
function ratioOf(a: string, b: string) {
  const lum = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05);
}
/** Texte lisible sur une couleur (clair ou sombre de la palette). */
function contrastText(bg: string, dark: string, light: string) {
  const lum = (h: string) => { const n = parseInt(h.slice(1), 16); const c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return ratio(bg, dark) >= ratio(bg, light) ? dark : light;
}
const WORKING = ["queued", "running", "waiting_jobs"];

/** Frise du chantier : les étapes 0 à 13 du parcours de création, leur état, l'étape en cours. */
function JourneyBar({ journey, compact }: { journey: NonNullable<View["journey"]>; compact: boolean }) {
  const t = useT();
  const cur = journey.steps.find((s) => s.n === journey.current);
  const started = cur && cur.status !== "todo";
  return (
    <div className="border-b border-line px-3 py-2" data-syna-journey>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{started ? `${t("Étape", "Step")} ${journey.current}` : t("Prochaine étape", "Next step")} · {cur ? t(cur.fr, cur.en) : ""}{cur && !started && cur.ready === false ? ` · ${t("bientôt disponible", "coming soon")}` : ""}</span>
        {journey.mode === "refonte" && <span className="text-muted">{t("Refonte · gardé tel quel", "Redesign · kept as is")} : {journey.keep.join(", ")}</span>}
      </div>
      <ol className={cx("mt-1.5 flex gap-1", compact ? "" : "sm:gap-1.5")} aria-label={t("Étapes du parcours", "Journey steps")}>
        {journey.steps.map((s) => (
          <li key={s.n} className="min-w-0 flex-1" title={`${s.n}. ${t(s.fr, s.en)} — ${stepLabel(s, journey.current, t)}`} data-step={s.n} data-status={s.status}>
            <span className={cx("block h-1.5 rounded-full",
              s.status === "done" ? "bg-ink" : s.status === "doing" ? "bg-signal" : s.n === journey.current && s.status === "todo" ? "bg-signal opacity-40" : s.status === "review" ? "bg-warn" : s.status === "skipped" ? "bg-line opacity-50" : "bg-line")} />
            <span className="sr-only">{s.n}. {t(s.fr, s.en)} : {stepLabel(s, journey.current, t)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
/**
 * Texte de SINA : paragraphes, listes à puces (« - … ») et gras (**…**) rendus proprement, sans jamais interpréter de
 * HTML (aucun risque d'injection : seuls du texte et des balises <strong>, <ul>, <li>, <p> sont produits).
 */
function inline(s: string, key: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => /^\*\*[^*]+\*\*$/.test(part) ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : <span key={`${key}-${i}`}>{part}</span>);
}
export function RichText({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: string[] = [], para: string[] = [];
  const flushList = () => { if (list.length) { const items = list, k = blocks.length; blocks.push(<ul key={`ul${k}`} className="mt-1 list-disc space-y-0.5 pl-5">{items.map((x, i) => <li key={i}>{inline(x, `li${k}-${i}`)}</li>)}</ul>); list = []; } };
  // Lignes consécutives = un paragraphe (retours à la ligne gardés) ; une ligne vide sépare les paragraphes.
  const flushPara = () => { if (para.length) { const lines = para, k = blocks.length; blocks.push(<p key={`p${k}`} className="[&:not(:first-child)]:mt-2">{lines.map((l, i) => <span key={i}>{i > 0 && <br />}{inline(l, `p${k}-${i}`)}</span>)}</p>); para = []; } };
  for (const raw of String(text ?? "").split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
    if (bullet) { flushPara(); list.push(bullet[1]); continue; }
    flushList();
    if (!line.trim()) { flushPara(); continue; }
    para.push(line);
  }
  flushPara(); flushList();
  return <div data-syna-text>{blocks}</div>;
}

const ACCEPT = "image/*,video/mp4,video/quicktime,video/webm,application/pdf,.docx,.txt,.md,.csv";

export function SynaThread({ projectId, compact = false, subscriptionKey }: { projectId: string | null; compact?: boolean; subscriptionKey?: string }) {
  const t = useT(), router = useRouter(), project = useOptionalProject();
  const [v, setV] = useState<View | null>(null);
  const [text, setText] = useState(""), [files, setFiles] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [budgetEdit, setBudgetEdit] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null), lastRun = useRef<string>("");

  const load = useCallback(async () => {
    const view = await api<View>("/api/syna/open", { body: { projectId, ...(projectId ? {} : subscriptionKey ? { subscriptionKey } : {}) } });
    setV(view);
  }, [projectId, subscriptionKey]);
  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  // Suivi de l'exécution : relecture régulière tant que SINA travaille, puis rafraîchissement des onglets du Studio.
  const working = !!v?.run && WORKING.includes(v.run.status);
  // Brouillon : dès que SINA a créé le projet, le client est emmené dans son projet, où la même conversation continue
  // (sinon l'accueil, qui affiche alors « Mes projets », ferait disparaître le fil en pleine étape 0).
  const moved = useRef(false);
  useEffect(() => {
    if (!projectId && v?.projectId && !moved.current) { moved.current = true; router.push(`/studio/${v.projectId}/pilote`); }
  }, [projectId, v?.projectId, router]);
  useEffect(() => {
    if (!v) return;
    if (!working) {
      if (lastRun.current && lastRun.current === v.run?.id) { lastRun.current = ""; project?.reload?.(); if (v.projectId && v.projectId !== projectId) router.push(`/studio/${v.projectId}/pilote`); router.refresh(); }
      return;
    }
    lastRun.current = v.run!.id;
    const h = setTimeout(() => api<View>(`/api/syna/${v.conversationId}`).then(setV).catch(() => undefined), 1800);
    return () => clearTimeout(h);
  }, [v, working, project, router, projectId]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [v?.messages.length]);

  async function send(message?: string) {
    const body = (message ?? text).trim();
    if (!v || !body || busy) return;
    setBusy(true); setError("");
    try {
      const next = await api<View>(`/api/syna/${v.conversationId}`, { body: { requestId: crypto.randomUUID(), text: body, attachmentIds: message ? [] : files.map((f) => f.id) } });
      setV(next); if (!message) { setText(""); setFiles([]); }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function attach(list: FileList | null) {
    if (!v || !list?.length) return;
    setBusy(true); setError("");
    try {
      for (const f of Array.from(list)) {
        const form = new FormData(); form.append("file", f);
        const a = await api<{ id: string; kind: string; name: string }>(`/api/syna/${v.conversationId}/attachments`, { form });
        setFiles((x) => [...x, a]);
      }
    } catch (e: any) { setError(e.message); } finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }
  async function decide(pendingId: string, approve: boolean) {
    if (!v) return; setBusy(true);
    try { setV(await api<View>(`/api/syna/${v.conversationId}/decision`, { body: { pendingId, approve } })); } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function saveBudget() {
    if (!v || budgetEdit == null) return;
    try { setV(await api<View>(`/api/syna/${v.conversationId}/budget`, { body: { pct: Number(budgetEdit.replace(",", ".")) } })); setBudgetEdit(null); } catch (e: any) { setError(e.message); }
  }
  async function stop() { if (v) setV(await api<View>(`/api/syna/${v.conversationId}/stop`, { body: {} })); }

  // Les résultats d'outils d'une même exécution sont regroupés sous la réponse de SINA, par module.
  const items = useMemo(() => groupThread(v?.messages ?? []), [v?.messages]);
  // Cartes des identités : sous la DERNIÈRE proposition réussie (les anciennes sont remplacées).
  const lastCalendar = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && String(m.content?.tool ?? "").startsWith("calendar.") && m.content?.ok)?.id, [v?.messages]);
  const lastAngles = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "angles.propose" && m.content?.ok && m.content?.data?.angles)?.id, [v?.messages]);
  const lastActivity = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "activity.plan" && m.content?.ok)?.id, [v?.messages]);
  const lastCopy = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "mockup.copy" && m.content?.ok)?.id, [v?.messages]);
  const lastCustom = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && String(m.content?.tool ?? "").startsWith("custom.") && m.content?.ok && m.content?.data?.customTheme)?.id, [v?.messages]);
  const lastFamilies = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "theme.families" && m.content?.ok)?.id, [v?.messages]);
  const lastThemes = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "theme.propose" && m.content?.ok)?.id, [v?.messages]);
  const lastKit = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "brand.kit" && m.content?.ok)?.id, [v?.messages]);
  const lastLogos = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && (m.content?.tool === "logo.propose" || (m.content?.tool === "jobs.wait" && JSON.stringify(m.content?.data ?? "").includes("syna.logos"))) && m.content?.ok)?.id, [v?.messages]);
  const lastIdentity = useMemo(() => [...(v?.messages ?? [])].reverse().find((m) => m.role === "tool" && m.content?.tool === "identity.propose" && m.content?.ok)?.id, [v?.messages]);
  if (!v) return <div className="p-4 text-sm text-muted">{error || t("Ouverture du fil SINA…", "Opening SINA thread…")}</div>;
  const pending = v.run?.status === "waiting_confirmation" ? v.run.pending : null;

  return (
    <div className={cx("flex h-full min-h-0 flex-col", compact ? "text-sm" : "")} data-syna-thread>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-xs text-muted">
        {budgetEdit == null
          ? <button type="button" className="underline-offset-2 hover:underline" onClick={() => setBudgetEdit(String(v.budget.authorizedPct ?? 10))} data-syna-budget>
              {t("Budget autorisé", "Authorised budget")} : {fmt(v.budget.authorizedPct)} % · {t("engagé", "used")} {fmt(v.budget.spentPct)} %
            </button>
          : <span className="flex items-center gap-1">{t("Budget autorisé (%)", "Authorised budget (%)")}<input className="w-14 rounded border border-line bg-card px-1" value={budgetEdit} onChange={(e) => setBudgetEdit(e.target.value)} inputMode="decimal" aria-label={t("Budget autorisé en pourcentage", "Authorised budget in percent")} /><Button size="sm" variant="secondary" onClick={saveBudget}>OK</Button></span>}
        {working && <Button size="sm" variant="ghost" onClick={stop}>{t("Arrêter", "Stop")}</Button>}
      </div>
      {v.journey && <JourneyBar journey={v.journey} compact={compact} />}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3" aria-live="polite">
        {!items.length && <p className="text-muted">{t("Décris ton objectif, joins une photo, une vidéo ou un document : SINA choisit les outils du Studio, les enchaîne et te montre ce qui a changé.", "Describe your goal or attach a photo, video or document.")}</p>}
        {items.map((it) => it.kind === "user"
          ? <div key={it.m.id} className="ml-6 rounded-2xl bg-ink px-3 py-2 text-paper" data-syna-user>
              <p className="whitespace-pre-wrap">{it.m.content.text}</p>
              {!!it.m.content.attachments?.length && <p className="mt-1 text-xs opacity-80">📎 {it.m.content.attachments.map((aid: string) => v.attachments.find((a) => a.id === aid)?.name ?? aid).join(", ")}</p>}
            </div>
          : it.kind === "assistant"
          ? <div key={it.m.id} className="mr-4 space-y-2" data-syna-assistant>
              {!!it.m.content.message && <div className="rounded-2xl border border-line bg-card px-3 py-2"><RichText text={it.m.content.message} /></div>}
              {it.m.content.question && <div className="rounded-xl border border-accent/40 bg-paper-2 px-3 py-2" data-syna-question>
                <p className="font-medium">{it.m.content.question.text}</p>
                {!!it.m.content.question.choices?.length && <div className="mt-2 flex flex-wrap gap-2">{it.m.content.question.choices.map((c: string) => <Button key={c} size="sm" variant="secondary" disabled={busy || working} onClick={() => send(c)}>{c}</Button>)}</div>}
              </div>}
              {it.tools.map((tm) => <div key={tm.id}>
                <ToolResult m={tm} projectId={v.projectId} onChoose={(n) => send(t(`Je choisis le thème sur mesure ${n}.`, `I choose custom theme ${n}.`))} busy={busy || working} />
                {tm.id === lastLogos && v.journey?.logos && <LogoCards logos={v.journey.logos} brandBg={brandBackground(v.journey.identities)} busy={busy || working} onChoose={(k) => send(t(`Je choisis le logo ${k}.`, `I choose logo ${k}.`))} />}
                {tm.id === lastActivity && v.journey?.activity && <ActivityCard a={v.journey.activity} busy={busy || working} onValidate={() => send(t("Je valide mon activité.", "I validate my business."))} />}
                {tm.id === lastAngles && v.journey?.angles && <AngleCards angles={v.journey.angles} busy={busy || working} onChoose={(titles) => send(titles.length > 1 ? t(`Je choisis ces angles : ${titles.map((x, i) => `« ${x} »${i === 0 ? " (principal)" : ""}`).join(", ")}.`, `I choose these angles: ${titles.join(", ")}.`) : t(`Je choisis l'angle « ${titles[0]} ».`, `I choose the angle "${titles[0]}".`))} />}
                {tm.id === lastCopy && v.journey?.siteCopy && <CopyCard pages={v.journey.siteCopy.pages} />}
                {tm.id === lastCustom && v.projectId && <CustomThemeCard card={tm.content.data.customTheme} busy={busy || working} onSend={(text) => send(text)} />}
                {tm.id === lastFamilies && v.journey?.families && v.projectId && <FamilyCards families={v.journey.families} busy={busy || working} onChoose={(title) => send(t(`Je préfère le style ${title}.`, `I prefer the ${title} style.`))} />}
                {tm.id === lastThemes && v.journey?.themes && v.projectId && <ThemeCards themes={v.journey.themes} busy={busy || working} onChoose={(name) => send(t(`Je choisis le thème ${name}.`, `I choose the ${name} theme.`))} onAll={() => send(t("Je veux voir tous les thèmes.", "I want to see all themes."))} onMockup={() => send(t("Je préfère un thème sur mesure.", "I'd rather have a custom theme."))} />}
                {tm.id === lastKit && v.journey?.brandKit && <BrandKitCard kit={v.journey.brandKit} darkBg={v.journey.identities?.final?.palette.dark ?? "#16161A"} busy={busy || working} onValidate={() => send(t("Je valide mon image de marque.", "I validate my brand kit."))} />}
                {tm.id === lastCalendar && v.projectId && <CalendarCard projectId={v.projectId} refreshKey={tm.id} />}
                {tm.id === lastIdentity && v.journey?.identities && <IdentityCards ids={v.journey.identities} busy={busy || working} onChoose={(k) => send(t(`Je choisis l'identité ${k}.`, `I choose identity ${k}.`))} />}
              </div>)}
            </div>
          : <EventLine key={it.m.id} m={it.m} />)}
        {pending && <div className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-ink dark:bg-amber-950/30" data-syna-confirmation>
          <p className="font-medium">{pending.reason === "budget" ? t("Dépense au-delà du budget autorisé", "Spending beyond the authorised budget") : t("Action à confirmer", "Action to confirm")}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{pending.preview}</p>
          {pending.tool === "budget.raise"
            ? <p className="mt-2 text-xs">{t("Augmente le budget autorisé ci-dessus, puis demande à SINA de continuer.", "Raise the budget above, then ask SINA to continue.")}</p>
            : <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => decide(pending.id, true)} disabled={busy}>{t("Confirmer", "Confirm")}</Button><Button size="sm" variant="secondary" onClick={() => decide(pending.id, false)} disabled={busy}>{t("Refuser", "Decline")}</Button></div>}
        </div>}
        {working && <p className="text-xs text-muted" data-syna-working>{v.run?.status === "waiting_jobs" ? t("SINA attend la fin d'une création (images, vidéo ou site) puis reprend seule…", "SINA is waiting for a creation to finish…") : t("SINA travaille…", "SINA is working…")}</p>}
        {v.run?.status === "failed" && <p className="text-xs text-red-600">{t("L'exécution s'est arrêtée : ", "The run stopped: ")}{v.run.error}</p>}
        <div ref={end} />
      </div>

      <div className="border-t border-line p-3">
        {!!files.length && <div className="mb-2 flex flex-wrap gap-1">{files.map((f) => <span key={f.id} className="rounded-full border border-line px-2 py-0.5 text-xs">{f.kind === "video" ? "🎬" : f.kind === "image" ? "🖼" : "📄"} {f.name} <button type="button" aria-label={t("Retirer", "Remove")} onClick={() => setFiles((x) => x.filter((y) => y.id !== f.id))}>×</button></span>)}</div>}
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={compact ? 3 : 4} maxLength={8000} placeholder={t("Ta demande, même avec plusieurs modifications…", "Your request, even with several changes…")} aria-label={t("Message à SINA", "Message to SINA")}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <input ref={fileInput} type="file" accept={ACCEPT} multiple className="sr-only" aria-label={t("Joindre des fichiers", "Attach files")} onChange={(e) => attach(e.target.files)} />
          <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()} disabled={busy}>📎 {t("Photo, vidéo, document", "Photo, video, document")}</Button>
          <Button size="sm" onClick={() => send()} disabled={busy || working || !text.trim()}>{t("Envoyer", "Send")}</Button>
        </div>
        {error && <p className="mt-2 text-xs text-red-600" role="alert">{error}</p>}
      </div>
    </div>
  );
}

const fmt = (n: number | null | undefined) => (n == null ? "—" : n < 1 ? n.toFixed(2).replace(".", ",") : String(Math.round(n * 10) / 10).replace(".", ","));

type Item = { kind: "user" | "event"; m: Msg } | { kind: "assistant"; m: Msg; tools: Msg[] };
function groupThread(ms: Msg[]): Item[] {
  const out: Item[] = [];
  for (const m of ms) {
    if (m.role === "tool") { const last = [...out].reverse().find((x) => x.kind === "assistant") as any; if (last) last.tools.push(m); continue; }
    if (m.role === "assistant") { out.push({ kind: "assistant", m, tools: [] }); continue; }
    if (m.role === "event" && !["error", "stopped", "waiting_jobs"].includes(m.content.kind)) continue;
    out.push({ kind: m.role === "user" ? "user" : "event", m });
  }
  return out;
}

const READ_TOOLS = /^(site\.outline|site\.versions|catalogue\.list|ads\.list|posts\.list|brand\.read|files\.list|videos\.list|bookings\.(services|list)|pilot\.state|strategy\.read|jobs\.status|attachment\.read)$/;

function ToolResult({ m, projectId, onChoose, busy }: { m: Msg; projectId: string | null; onChoose: (n: number) => void; busy: boolean }) {
  const t = useT(), c = m.content;
  // Erreur de SINA elle-même (argument mal formé) : elle se corrige seule, le client ne la voit jamais.
  if (c.internal) return null;
  if (READ_TOOLS.test(c.tool) && c.ok) return <p className="text-xs text-muted" data-syna-read={c.tool}>🔎 {c.summary}</p>;
  const mockups: any[] | undefined = c.data?.mockups;
  const changes: any[] = c.changes ?? [];
  return (
    <div className={cx("rounded-xl border px-3 py-2 text-sm", c.ok ? "border-line bg-paper-2" : "border-red-300 bg-red-50 dark:bg-red-950/30")} data-syna-tool={c.tool} data-syna-ok={c.ok ? "1" : "0"}>
      <p className={cx("text-xs font-medium", c.ok ? "text-muted" : "text-red-700")}>{c.ok ? "✓" : "✕"} {c.summary}</p>
      {!!changes.length && <ul className="mt-1 space-y-0.5 text-xs">{changes.map((x, i) => <li key={i} data-syna-change={x.module}><b className="font-semibold">{x.module}</b> · {x.object} — {x.summary}{x.verified ? " ✓" : ` (${t("non vérifié", "not verified")})`}</li>)}</ul>}
      {mockups && projectId && <div className="mt-2 grid grid-cols-1 gap-2" data-syna-mockups>{mockups.filter((x) => x.versionId).map((x) => (
        <div key={x.versionId} className="overflow-hidden rounded-lg border border-line bg-card">
          <div className="relative h-40 overflow-hidden"><iframe title={x.name} src={x.preview} className="pointer-events-none absolute left-0 top-0 h-[640px] w-[1280px] origin-top-left scale-[0.25]" loading="lazy" /></div>
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs"><span>{x.n}. {x.name}</span><span className="flex gap-1"><a className="underline" href={x.preview} target="_blank" rel="noreferrer">{t("Voir", "View")}</a><Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.n)}>{t("Choisir", "Choose")}</Button></span></div>
        </div>))}</div>}
      {/* Images de maquette : en grand (le client doit voir sa page), libellées avec ses mots ; « Choisir » seulement
          quand la maquette est complète (sinon le choix serait refusé). */}
      {mockups && mockups.some((x) => x.href && !x.versionId) && <div className="mt-2 grid grid-cols-1 gap-3" data-syna-mockup-images>{mockups.filter((x) => x.href && !x.versionId).map((x) => (
        <figure key={x.assetId} className="overflow-hidden rounded-xl border border-line bg-card">
          <a href={x.href} target="_blank" rel="noreferrer" title={t("Ouvrir en grand", "Open full size")}><img src={x.href} alt={`${t("Thème sur mesure", "Custom theme")} ${x.name ?? x.direction} — ${x.label ?? ""}`} className="w-full" loading="lazy" /></a>
          <figcaption className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
            <span><b className="font-semibold">{x.name ? t(`Thème sur mesure « ${x.name} »`, `Custom theme “${x.name}”`) : x.direction}</b>{x.label ? ` · ${x.label}` : ""}</span>
            <span className="flex items-center gap-2"><a className="underline" href={x.href} target="_blank" rel="noreferrer">{t("Ouvrir en grand", "Open full size")}</a>{c.data?.complete !== false && <Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.n)}>{t("Choisir", "Choose")}</Button>}</span>
          </figcaption>
        </figure>))}</div>}
      {c.data?.preview && !mockups && <a className="mt-1 inline-block text-xs underline" href={c.data.preview} target="_blank" rel="noreferrer">{t("Voir l'aperçu", "Open preview")}</a>}
      {c.data?.href && <a className="mt-1 inline-block text-xs underline" href={c.data.href} data-syna-download>{t("Télécharger", "Download")} {c.data.name ?? ""}</a>}
    </div>
  );
}

function EventLine({ m }: { m: Msg }) {
  const t = useT(), c = m.content;
  if (c.kind === "error") return <p className="text-xs text-red-600">{t("Erreur : ", "Error: ")}{c.message}</p>;
  if (c.kind === "stopped") return <p className="text-xs text-muted">{t("Arrêté à ta demande.", "Stopped.")}</p>;
  if (c.kind === "waiting_jobs") return <p className="text-xs text-muted">⏳ {t("Tâche lancée en arrière-plan ; je reprends dès qu'elle est finie.", "Task running in the background; I'll resume when it's done.")}</p>;
  return null;
}
