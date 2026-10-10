"use client";
/**
 * Logo V2 : directions créatives (territoire, style, concept, pourquoi), logo complet dessiné par l'IA d'images (image
 * originale) ou construit, note du contrôle, choix. Le client choisit un style ou laisse l'IA en proposer plusieurs.
 * Les logos complets écartés restent visibles (image originale et défauts) ; une nouvelle version dessinée ne se fait
 * qu'à sa demande, coût confirmé.
 */
import { useState } from "react";
import { Check, RefreshCw, Sparkles, X } from "lucide-react";
import { api, Badge, Button, Card, useApi, useToast } from "../ui";
import { useProject } from "./project-context";
import { SectionTitle } from "./common";
import { useT } from "../i18n";

type Proposal = {
  id: string;
  url?: string;
  territory: { name: string; concept: string; why: string; markType: string; composition: string; typography: string; distinctive: string; source: "ai" | "local"; style?: string | null; descriptor?: string | null };
  artwork?: { textCorrected: boolean; originalUrl: string | null; provider: string | null; issues: string[]; choosable: boolean; previous: string | null } | null;
  font: string;
  score: number | null;
  verdict: string | null;
  reason: string;
  attempts: number;
  change: string | null;
};
type LiveDir = { id: string; name: string; style: string | null; status: "waiting" | "drawing" | "checking" | "done" | "failed"; verdict?: string | null; score?: number | null; reason?: string; assetId?: string; progress?: { phase: "sent" | "partial" | "received" | "saved"; partials?: number; atMs?: number; streamed?: boolean } };
type Live = { jobId: string; startedAt: number; updatedAt: number; stage: "prepare" | "images" | "save" | "done" | "failed"; art: string | null; directions: LiveDir[]; error?: string };
type JobRow = { id: string; type: string; status: string; progress: number; message: string; error: string | null; created_at: number; updated_at: number };
type View = {
  run: { id: string; at?: number; ai: string; art?: string | null; style?: string; stoppedByCostCap: boolean; territories: { name: string }[]; rejected: { name: string; reason: string }[]; failures?: { id: string; name: string; style: string | null; reason: string }[]; notes?: string[] } | null;
  job?: JobRow | null;
  live?: Live | null;
  proposals: Proposal[];
  studio?: Proposal[];
  discarded: Proposal[];
  applied?: string | null;
  tagline?: { text: string; validated: boolean } | null;
  styles?: string[];
};

const STYLE: Record<string, [string, string]> = {
  auto: ["Laisser l'IA proposer plusieurs styles", "Let the AI suggest several styles"],
  illustrated: ["Illustré", "Illustrated"],
  minimal: ["Minimaliste", "Minimal"],
  typographic: ["Typographique", "Typographic"],
  monogram: ["Monogramme", "Monogram"],
  emblem: ["Emblème / badge", "Emblem / badge"],
  textured: ["Texturé, artisanal", "Textured, artisanal"],
  gradient: ["Dégradés modernes", "Modern gradients"],
  premium: ["Premium, haut de gamme", "Premium, high-end"],
};

const MARK: Record<string, [string, string]> = {
  wordmark: ["Logotype", "Wordmark"],
  lettermark: ["Lettre seule", "Lettermark"],
  monogram: ["Monogramme + nom", "Monogram + name"],
  symbol_wordmark: ["Symbole + nom", "Symbol + name"],
  abstract_mark: ["Marque abstraite + nom", "Abstract mark + name"],
  emblem: ["Emblème", "Emblem"],
};

export function LogoV2Panel({ onApplied }: { onApplied?: () => void }) {
  const { id } = useProject();
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [style, setStyle] = useState("auto");
  const { data, reload } = useApi<View>(`/api/projects/${id}/brand/logo-v2`, { poll: 5000 });
  async function post(body: Record<string, unknown>, ok: string, key: string) {
    setBusy(key);
    try {
      await api(`/api/projects/${id}/brand/logo-v2`, { body });
      toast("ok", ok);
      reload();
      if (body.action === "choose") onApplied?.();
    } catch (e) {
      toast("bad", (e as Error).message);
    } finally {
      setBusy(null);
    }
  }
  /** Devis avant tout appel payant : montant MAXIMAL (qui sert aussi de plafond), accepté par le client. */
  async function quote(assetId?: string): Promise<{ ai: boolean; quote: { mode: string; creations: number; images: number; maxEur: number } | null } | null> {
    try {
      return await api(`/api/projects/${id}/brand/logo-v2`, { body: { action: "quote", ...(assetId ? { assetId } : {}) } });
    } catch (e) {
      toast("bad", (e as Error).message);
      return null;
    }
  }
  const eur = (n: number) => n.toLocaleString(t("fr-FR", "en-GB"), { style: "currency", currency: "EUR" });
  const generate = async () => {
    const q = await quote();
    if (!q) return;
    const msg = !q.ai || !q.quote
      ? t("Créer de nouvelles directions de logo ? Sans IA active, elles sont construites par le studio (0 €).", "Create new logo directions? Without active AI, they are built by the studio (€0).")
      : q.quote.mode === "artwork"
        ? t(`Créer ${q.quote.creations} logos complets dessinés par l'IA d'images ? Devis : ${eur(q.quote.maxEur)} au maximum (${q.quote.images} images et leurs relectures), décompté de votre budget IA. Ce montant est aussi le plafond : rien ne sera dépensé au-delà, et aucune image ne sera relancée sans votre accord.`, `Create ${q.quote.creations} full logos drawn by the image AI? Quote: ${eur(q.quote.maxEur)} at most (${q.quote.images} images and their reviews), counted against your AI budget. This amount is also the cap: nothing is spent beyond it, and no image is restarted without your consent.`)
        : t(`Créer ${q.quote.creations} directions de logo construites ? Devis : ${eur(q.quote.maxEur)} au maximum (relectures par l'IA), décompté de votre budget IA. Ce montant est aussi le plafond.`, `Create ${q.quote.creations} built logo directions? Quote: ${eur(q.quote.maxEur)} at most (AI reviews), counted against your AI budget. This amount is also the cap.`);
    if (!window.confirm(msg)) return;
    post({ action: "generate", style }, t("Directions créatives lancées : quelques minutes.", "Creative directions started: a few minutes."), "gen");
  };
  const redraw = async (p: Proposal) => {
    const q = await quote(p.id);
    if (!q) return;
    const price = q.quote ? eur(q.quote.maxEur) : t("[non disponible]", "[not available]");
    const feedback = window.prompt(t(`Nouvelle version de « ${p.territory.name} » : une image payée, ${price} au maximum (plafond). Vos remarques (facultatif) :`, `New version of "${p.territory.name}": one paid image, ${price} at most (cap). Your remarks (optional):`), "");
    if (feedback === null) return;
    post({ action: "redraw", assetId: p.id, feedback }, t("Nouvelle version en cours : la précédente reste disponible.", "New version in progress: the previous one stays available."), `v${p.id}`);
  };
  const proposals = data?.proposals ?? [];
  const studio = data?.studio ?? [];
  const card = (p: Proposal, isStudio: boolean) => (
          <div key={p.id} className="min-w-0 rounded-xl border border-line p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <strong className="text-sm">{p.territory.name}</strong>
              <Badge>{t(...(MARK[p.territory.markType] ?? [p.territory.markType, p.territory.markType]))}</Badge>
              {p.territory.style && STYLE[p.territory.style] && <Badge>{t(...STYLE[p.territory.style])}</Badge>}
              {p.artwork && <Badge tone="info">{t("Dessiné par l'IA d'images", "Drawn by the image AI")}</Badge>}
              {!isStudio && p.score != null && <Badge tone="ok">{t(`Validé ${p.score}/10`, `Approved ${p.score}/10`)}</Badge>}
              {isStudio && <Badge tone="warn">{t("Provisoire", "Provisional")}</Badge>}
              {data?.applied === p.id && <Badge tone="info">{t("Appliqué", "Applied")}</Badge>}
            </div>
            {p.url && <img src={p.url} alt={p.territory.name} className="mb-3 w-full rounded-lg bg-[#F4F3EF] object-contain p-4" />}
            <p className="text-sm"><span className="font-medium">{t("Concept : ", "Concept: ")}</span>{p.territory.concept}</p>
            <p className="mt-1 text-sm text-ink-2"><span className="font-medium">{t("Pourquoi : ", "Why: ")}</span>{p.territory.why}</p>
            {p.artwork ? (
              <p className="mt-1 text-xs text-muted">
                {t("Image originale haute définition (livrable principal).", "Original high-resolution image (main deliverable).")}
                {p.artwork.textCorrected && <> {t("Nom réécrit par le studio, dessin intact.", "Name rewritten by the studio, drawing untouched.")}</>} {p.artwork.originalUrl && <a className="underline" href={p.artwork.originalUrl} target="_blank" rel="noreferrer">{t("Fichier original reçu", "Original file received")}</a>}
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted">{t(`Typographie : ${p.font} · ${p.attempts} essai(s)`, `Typeface: ${p.font} · ${p.attempts} attempt(s)`)}{p.change ? ` · ${p.change}` : ""}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" icon={<Check className="size-4" />} loading={busy === p.id} onClick={() => post({ action: "choose", assetId: p.id }, t("Logo choisi : déclinaisons et charte en préparation.", "Logo chosen: variations and guidelines being prepared."), p.id)}>{t("Choisir ce logo", "Choose this logo")}</Button>
              <Button size="sm" variant="ghost" icon={<X className="size-4" />} onClick={() => post({ action: "reject", assetId: p.id }, t("Direction écartée : elle ne sera plus proposée.", "Direction dismissed: it won't be offered again."), `r${p.id}`)}>{t("Écarter", "Dismiss")}</Button>
              {p.artwork && <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} loading={busy === `v${p.id}`} onClick={() => redraw(p)}>{t("Nouvelle version", "New version")}</Button>}
            </div>
          </div>
  );
  return (
    <Card className="min-w-0 p-5 sm:p-7">
      <SectionTitle
        title={t("Logo", "Logo")}
        action={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <label className="sr-only" htmlFor="logo-style">{t("Style du logo", "Logo style")}</label>
            <select id="logo-style" value={style} onChange={(e) => setStyle(e.target.value)} className="h-9 w-full min-w-0 max-w-full truncate rounded-full border border-line bg-paper px-3 text-sm sm:w-auto">
              {["auto", ...(data?.styles ?? Object.keys(STYLE).filter((k) => k !== "auto"))].map((k) => <option key={k} value={k}>{t(...(STYLE[k] ?? [k, k]))}</option>)}
            </select>
            <Button size="sm" variant="secondary" icon={<Sparkles className="size-4" />} loading={busy === "gen"} onClick={generate}>
              {proposals.length ? t("Nouvelles directions", "New directions") : t("Créer les directions", "Create directions")}
            </Button>
          </div>
        }
      >
        {t("Comme en agence : plusieurs directions vraiment différentes (illustré, minimaliste, typographique, monogramme, emblème, texturé, dégradés…). Avec un modèle d'images capable d'écrire le nom, chaque direction est un logo complet dessiné par l'IA : l'image originale est gardée telle quelle, le nom exact est vérifié (et réécrit par le studio s'il est faux), et le contrôle juge selon le style. Sinon, le logo est construit avec de vraies polices.", "Like an agency: several genuinely different directions (illustrated, minimal, typographic, monogram, emblem, textured, gradients…). With an image model able to write the name, each direction is a full logo drawn by the AI: the original image is kept as is, the exact name is checked (and rewritten by the studio if wrong), and the review judges by style. Otherwise the logo is built with real fonts.")}
      </SectionTitle>
      {data?.job && <SeriesProgress job={data.job} live={data.live ?? null} runId={data.run?.id ?? null} runAt={data.run?.at ?? null} />}
      {data?.tagline && !data.tagline.validated && <p className="mb-3 text-xs text-muted">{t(`Slogan « ${data.tagline.text} » : proposition à valider dans Identité. Il n'apparaîtra dans un logo qu'une fois validé par vous.`, `Slogan "${data.tagline.text}": a proposal to validate in Identity. It will only appear in a logo once you validate it.`)}</p>}
      {data?.run?.stoppedByCostCap && <p className="mb-3 text-xs text-warn">{t("Série arrêtée au plafond de dépense fixé.", "Series stopped at the set spending cap.")}</p>}
      {data?.run && !proposals.length && <p className="mb-3 text-sm text-ink-2">{studio.length ? t("Aucune direction relue par l'IA dans cette série : les versions du studio ci-dessous servent de logo provisoire.", "No AI-reviewed direction in this series: the studio versions below serve as a provisional logo.") : data.run.failures?.length && !data.discarded.length ? t("Aucune proposition : les images n'ont pas pu être produites (raisons ci-dessous).", "No proposal: the images could not be produced (reasons below).") : t("Aucune direction n'a atteint le niveau attendu dans cette série : les essais écartés sont montrés ci-dessous.", "No direction reached the expected level in this series: the rejected attempts are shown below.")}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {proposals.map((p) => card(p, false))}
      </div>
      {studio.length > 0 && (
        <div className="mt-5">
          <p className="mb-1 text-sm font-medium">{t("Versions du studio (sans relecture par l'IA)", "Studio versions (not reviewed by AI)")}</p>
          <p className="mb-3 text-xs text-muted">{t("Construites et contrôlées localement (nom exact, lisibilité), mais non relues par l'IA : elles servent de logo provisoire. En choisir une en fait votre logo.", "Built and checked locally (exact name, legibility) but not reviewed by AI: they serve as a provisional logo. Choosing one makes it your logo.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">{studio.map((p) => card(p, true))}</div>
        </div>
      )}
      {!!data?.discarded.filter((d) => d.artwork && d.url).length && (
        <div className="mt-5">
          <p className="mb-1 text-sm font-medium">{t("Logos complets écartés par le contrôle (images originales)", "Full logos rejected by the check (original images)")}</p>
          <p className="mb-3 text-xs text-muted">{t("Gardés et montrés tels que l'IA les a dessinés, avec la raison. Vous pouvez en choisir un quand le nom est exact (il restera marqué « non validé par le contrôle »), ou demander une nouvelle version.", "Kept and shown as the AI drew them, with the reason. You can choose one when the name is exact (it stays marked \"not validated by the check\"), or ask for a new version.")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.discarded.filter((d) => d.artwork && d.url).map((d) => (
              <div key={d.id} className="min-w-0 rounded-xl border border-dashed border-line p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{d.territory.name}</strong>
                  {d.territory.style && STYLE[d.territory.style] && <Badge>{t(...STYLE[d.territory.style])}</Badge>}
                  <Badge tone="warn">{d.score != null ? t(`Non validé ${d.score}/10`, `Not approved ${d.score}/10`) : t("Non validé", "Not approved")}</Badge>
                </div>
                <img src={d.url} alt={d.territory.name} className="mb-3 w-full rounded-lg bg-[#F4F3EF] object-contain p-4" />
                <p className="text-xs text-ink-2">{d.reason}</p>
                {!!d.artwork?.issues.length && <p className="mt-1 text-xs text-muted">{d.artwork.issues.join(" ; ")}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {d.artwork?.choosable && <Button size="sm" variant="secondary" icon={<Check className="size-4" />} loading={busy === d.id} onClick={() => { if (window.confirm(t("Ce logo n'a pas atteint le niveau du contrôle. Le choisir quand même ?", "This logo did not reach the check's level. Choose it anyway?"))) post({ action: "choose", assetId: d.id }, t("Logo choisi : déclinaisons et charte en préparation.", "Logo chosen: variations and guidelines being prepared."), d.id); }}>{t("Choisir quand même", "Choose anyway")}</Button>}
                  <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />} loading={busy === `v${d.id}`} onClick={() => redraw(d)}>{t("Nouvelle version", "New version")}</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!!data?.run?.failures?.length && (
        <div className="mt-5">
          <p className="mb-1 text-sm font-medium">{t("Directions sans image", "Directions without an image")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.run.failures.map((f) => (
              <div key={f.id} className="min-w-0 rounded-xl border border-dashed border-bad/40 p-4 text-sm" data-testid="logo-failure">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <strong>{f.name}</strong>
                  {f.style && STYLE[f.style] && <Badge>{t(...STYLE[f.style])}</Badge>}
                  <Badge tone="bad">{t("Échec", "Failed")}</Badge>
                </div>
                <p className="text-xs text-ink-2">{f.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {!!data?.run?.notes?.length && (
        <details className="mt-4 text-xs text-muted">
          <summary>{t("Notes de la série", "Series notes")}</summary>
          <ul className="mt-2 list-disc pl-5">{data.run.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </details>
      )}
      {!!data?.discarded.length && (
        <details className="mt-4 text-xs text-muted">
          <summary>{t(`${data.discarded.length} essai(s) écarté(s) par le contrôle (diagnostic)`, `${data.discarded.length} attempt(s) discarded by the check (diagnostics)`)}</summary>
          <ul className="mt-2 list-disc pl-5">
            {data.discarded.map((d) => <li key={d.id}>{d.territory.name} — {d.verdict}{d.score != null ? ` ${d.score}/10` : ""} : {d.reason}</li>)}
            {data.run?.rejected.map((r) => <li key={r.name}>{r.name} — {r.reason}</li>)}
          </ul>
        </details>
      )}
    </Card>
  );
}

/**
 * Avancement d'une série, étape par étape : préparation des directions, génération des images, contrôle qualité,
 * résultat. Une tâche échouée reste affichée avec son erreur (jamais une barre qui disparaît) ; si la série montrée
 * dessous est plus ancienne, c'est écrit.
 */
function SeriesProgress({ job, live, runId, runAt }: { job: JobRow; live: Live | null; runId: string | null; runAt: number | null }) {
  const t = useT();
  const active = job.status === "queued" || job.status === "running" || job.status === "paused";
  const failed = job.status === "failed" || job.status === "cancelled" || live?.stage === "failed";
  const dirs = live?.directions ?? [];
  const total = dirs.length;
  const drawn = dirs.filter((d) => d.status === "checking" || d.status === "done" || (d.status === "failed" && !/image non dessinée|interrompue|plafond/.test(d.reason ?? ""))).length;
  const checked = dirs.filter((d) => d.status === "done").length;
  const stage = live?.stage ?? (job.status === "done" ? "done" : active ? "prepare" : "failed");
  type StepState = "todo" | "active" | "done" | "partial" | "failed";
  // État de CHAQUE étape, d'après ce qui s'est réellement passé (une étape sans résultat n'est jamais cochée en vert).
  const past = (k: Live["stage"]) => ["prepare", "images", "save", "done"].indexOf(stage) > ["prepare", "images", "save", "done"].indexOf(k);
  const count = (n: number): StepState => (n === total ? "done" : n === 0 ? "failed" : "partial");
  const prep: StepState = stage === "prepare" ? (failed ? "failed" : "active") : "done";
  const imgs: StepState = stage === "prepare" ? "todo" : stage === "images" && !failed ? (dirs.some((d) => d.status === "drawing") ? "active" : drawn ? "partial" : "active") : total ? count(drawn) : failed ? "failed" : "done";
  const revs: StepState = stage === "prepare" ? "todo" : stage === "images" && !failed ? (dirs.some((d) => d.status === "checking") ? "active" : checked ? "partial" : "todo") : total ? (drawn === 0 ? "failed" : count(checked)) : failed ? "failed" : "done";
  const res: StepState = failed ? "failed" : stage === "done" ? (total && checked === 0 ? "failed" : "done") : past("images") ? "active" : "todo";
  // Réception et sauvegarde des images (logos complets dessinés par l'IA d'images seulement).
  const saved = dirs.filter((d) => d.progress?.phase === "saved").length;
  const recv: StepState = stage === "prepare" ? "todo" : stage === "images" && !failed ? (dirs.some((d) => d.progress && d.progress.phase !== "saved") ? "active" : saved ? "partial" : "todo") : total ? count(saved) : failed ? "failed" : "done";
  const provider = live?.art ? (live.art.startsWith("openai") ? "OpenAI" : live.art.startsWith("google") ? "Gemini" : live.art) : null;
  const steps: { key: string; label: string; detail: string; state: StepState }[] = [
    { key: "prepare", label: t("Brief et directions", "Brief and directions"), detail: total ? t(`${total} direction(s)`, `${total} direction(s)`) : "", state: prep },
    { key: "images", label: provider ? t(`Génération ${provider}`, `${provider} generation`) : t("Construction des logos", "Building the logos"), detail: total ? `${drawn}/${total}` : "", state: imgs },
    ...(live?.art ? [{ key: "receive", label: t("Réception et sauvegarde", "Received and saved"), detail: total ? `${saved}/${total}` : "", state: recv }] : []),
    { key: "review", label: t("Contrôle qualité", "Quality check"), detail: total ? `${checked}/${total}` : "", state: revs },
    { key: "result", label: t("Résultat", "Result"), detail: "", state: res },
  ];
  const STATUS: Record<LiveDir["status"], [string, string]> = { waiting: ["En attente", "Waiting"], drawing: [live?.art ? "Image en cours" : "Construction en cours", live?.art ? "Drawing" : "Building"], checking: ["Contrôle qualité en cours", "Quality check in progress"], done: ["Contrôlé", "Checked"], failed: ["Échec", "Failed"] };
  const secs = (ms?: number) => (ms ? ` (${Math.round(ms / 1000)} s)` : "");
  const progressText = (p: NonNullable<LiveDir["progress"]>) =>
    p.phase === "sent" ? t(`demande envoyée à ${provider ?? "l'IA"}${p.streamed ? ", réponse en flux" : ""}`, `request sent to ${provider ?? "the AI"}${p.streamed ? ", streamed response" : ""}`)
    : p.phase === "partial" ? t(`aperçu ${p.partials ?? 1} reçu${secs(p.atMs)}`, `preview ${p.partials ?? 1} received${secs(p.atMs)}`)
    : p.phase === "received" ? t(`image reçue${secs(p.atMs)}`, `image received${secs(p.atMs)}`)
    : t("image reçue et sauvegardée", "image received and saved");
  const old = runId && runId !== job.id;
  return (
    <div className={`mb-4 rounded-xl border p-4 ${failed ? "border-bad/40 bg-bad/5" : "border-line"}`} role="status" aria-live="polite" data-testid="logo-series-progress">
      <ol className={`grid gap-2 ${live?.art ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}>
        {steps.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 text-sm" data-step={s.key} data-state={s.state}>
            <span className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${s.state === "done" ? "bg-ok text-white" : s.state === "active" ? "bg-signal text-white" : s.state === "failed" ? "bg-bad text-white" : s.state === "partial" ? "bg-warn text-white" : "bg-paper-2 text-muted"}`} aria-hidden>{s.state === "done" ? "✓" : s.state === "failed" ? "✕" : s.state === "partial" ? "!" : i + 1}</span>
            <span className={s.state === "todo" ? "text-muted" : ""}>{s.label}{s.detail ? <span className="ml-1 text-xs text-muted">{s.detail}</span> : null}{s.state === "failed" && <span className="sr-only"> — {t("échec", "failed")}</span>}</span>
          </li>
        ))}
      </ol>
      {active && <p className="mt-2 text-xs text-muted">{job.message} · {Math.round(job.progress * 100)} %</p>}
      {failed && (
        <div className="mt-3 text-sm" role="alert">
          <p className="font-medium text-bad">{job.status === "cancelled" ? t("Création annulée.", "Creation canceled.") : t("La création des logos a échoué.", "Logo creation failed.")}</p>
          {(live?.error || job.error) && <p className="mt-1 text-xs">{live?.error || job.error}</p>}
          <p className="mt-1 text-xs text-muted">{t("Une image refusée par le fournisseur n'est pas facturée. Corrigez la cause (modèle choisi pour « Logos », budget, clé) puis relancez.", "An image refused by the provider is not billed. Fix the cause (model chosen for \"Logos\", budget, key) then try again.")}</p>
        </div>
      )}
      {!!dirs.length && (
        <ul className="mt-3 grid gap-1 text-xs">
          {dirs.map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline gap-x-2">
              <strong className="text-ink">{d.name}</strong>
              {d.style && STYLE[d.style] && <span className="text-muted">{t(...STYLE[d.style])}</span>}
              <span className={d.status === "failed" ? "text-bad" : d.status === "done" ? (d.verdict === "FINAL" ? "text-ok" : "text-warn") : "text-muted"}>
                {d.status === "done" ? (d.verdict === "FINAL" ? t(`Validé ${d.score ?? ""}/10`, `Approved ${d.score ?? ""}/10`) : d.verdict === "PROVISIONAL" ? t("Version du studio", "Studio version") : t(`Écarté par le contrôle${d.score != null ? ` (${d.score}/10)` : ""}`, `Rejected by the check${d.score != null ? ` (${d.score}/10)` : ""}`)) : t(...STATUS[d.status])}
              </span>
              {(d.status === "failed" || (d.status === "done" && d.verdict !== "FINAL")) && d.reason && <span className="text-muted">— {d.reason}</span>}
              {(d.status === "drawing" || d.status === "checking") && d.progress && <span className="text-muted" data-progress={d.progress.phase}>— {progressText(d.progress)}</span>}
            </li>
          ))}
        </ul>
      )}
      {!active && old && runAt && <p className="mt-3 text-xs text-muted">{t(`La série affichée ci-dessous est la précédente (du ${new Date(runAt).toLocaleString("fr-FR")}).`, `The series shown below is the previous one (from ${new Date(runAt).toLocaleString("en-GB")}).`)}</p>}
    </div>
  );
}
