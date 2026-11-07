"use client";
/**
 * SINA agent (#492) : LE fil unique du projet. Discussion libre, pièces jointes (photos, vidéos, documents), actions
 * dans tous les modules, accords pour les actions sensibles et hors budget, changements vérifiés par module.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Button, cx, Textarea } from "../ui";
import { useT } from "../i18n";
import { useOptionalProject } from "./project-context";
import { stepLabel } from "./journey-labels";

type Msg = { id: string; seq: number; role: "user" | "assistant" | "tool" | "event"; runId: string | null; content: any; createdAt: number };
type View = {
  conversationId: string; projectId: string | null; messages: Msg[];
  run: { id: string; status: string; step: number; pending: any; error: string | null } | null;
  budget: { authorizedPct: number | null; spentPct: number | null };
  attachments: { id: string; kind: string; name: string; analysis: any }[];
  journey?: { current: number; mode: "creation" | "refonte"; keep: string[]; steps: { n: number; fr: string; en: string; status: "todo" | "doing" | "review" | "done" | "skipped"; ready?: boolean }[]; identities?: Identities | null; logos?: Logos | null };
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
                <ToolResult m={tm} projectId={v.projectId} onChoose={(n) => send(t(`Je choisis la maquette ${n}.`, `I choose mockup ${n}.`))} busy={busy || working} />
                {tm.id === lastLogos && v.journey?.logos && <LogoCards logos={v.journey.logos} brandBg={brandBackground(v.journey.identities)} busy={busy || working} onChoose={(k) => send(t(`Je choisis le logo ${k}.`, `I choose logo ${k}.`))} />}
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
      {mockups && mockups.some((x) => x.href && !x.versionId) && <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3" data-syna-mockup-images>{mockups.filter((x) => x.href && !x.versionId).map((x) => (
        <div key={x.assetId} className="overflow-hidden rounded-lg border border-line bg-card">
          <a href={x.href} target="_blank" rel="noreferrer"><img src={x.href} alt={`${t("Maquette", "Mockup")} ${x.n} — ${x.direction}`} className="h-56 w-full object-cover object-top" loading="lazy" /></a>
          <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs"><span>{x.n}. {x.direction}</span><span className="flex gap-1"><a className="underline" href={x.href} target="_blank" rel="noreferrer">{t("Agrandir", "Enlarge")}</a><Button size="sm" variant="secondary" disabled={busy} onClick={() => onChoose(x.n)}>{t("Choisir", "Choose")}</Button></span></div>
        </div>))}</div>}
      {c.data?.preview && !mockups && <a className="mt-1 inline-block text-xs underline" href={c.data.preview} target="_blank" rel="noreferrer">{t("Voir l'aperçu", "Open preview")}</a>}
      {c.data?.href && <a className="mt-1 inline-block text-xs underline" href={c.data.href} data-syna-download>{t("Télécharger", "Download")} {c.data.name ?? ""}</a>}
    </div>
  );
}

function EventLine({ m }: { m: Msg }) {
  const t = useT(), c = m.content;
  if (c.kind === "error") return <p className="text-xs text-red-600">{t("Erreur : ", "Error: ")}{c.message}</p>;
  if (c.kind === "stopped") return <p className="text-xs text-muted">{t("Arrêté à ta demande.", "Stopped.")}</p>;
  if (c.kind === "waiting_jobs") return <p className="text-xs text-muted">⏳ {t("Création lancée en arrière-plan ; SINA reprendra seule.", "Creation running in the background; SINA will resume.")}</p>;
  return null;
}
