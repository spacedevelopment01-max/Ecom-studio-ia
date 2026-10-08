/**
 * Video & UGC Engine V2 (phase 7A) — moteur central.
 *
 * PROJECT BRAIN → INTENTION → STRATÉGIE → SCRIPT (local, puis IA contrôlée) → STORYBOARD → PLANS (procédé le plus
 * sobre) → MÉDIAS (bibliothèque, Image Engine V2, génération routée SEULEMENT si utile, autorisée et dans le budget)
 * → DOCUMENT VIDÉO éditable → AUDIO → RENDU → BARRIÈRE VIDÉO → reprise ciblée (un plan, l'audio, les sous-titres —
 * jamais toute la vidéo) → BIBLIOTHÈQUE.
 *
 * Coûts : estimation avant tout envoi, plafond réel par tâche (le plan payant est remplacé par un plan local si le
 * budget ne suffit pas), plans FINAL mémorisés et réutilisés (une reprise ne repaie jamais un plan accepté), aucune
 * génération sans contrôle de vision disponible, aucune génération sans accord du client (`approveGeneration`).
 */
import { execFile } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { aiActiveFor } from "../ai/access";
import { all } from "../db";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { gateSave } from "../quality/store";
import { POLICIES } from "../quality/policies";
import { saveAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { contentLang } from "../i18n-server";
import { EUR } from "../billing";
import { brandTypo, palette } from "../engine/images";
import { adInsight } from "../ads-v2/insight";
import type { AdInsight } from "../ads-v2/types";
import { tmpDir } from "../storage";
import { videoIntent, type VideoAsk } from "./intent";
import { videoStrategy } from "./strategy";
import { fromDraft, localScript, scriptIssues, scriptPrompt, scriptSystem } from "./script";
import { buildStoryboard, storyboardIssues, type Inventory } from "./storyboard";
import { planShots } from "./shots";
import { chooseProvider, estimateMicro, shootDuration, VIDEO_CAPABILITIES } from "./providers";
import { cuesForVoice, defaultSubtitleStyle, endCardDoc, interfaceDoc, kineticDoc, overlayText, packshotDoc, safeZone, SIZES, VIDEO_DOC_VERSION, voiceClip } from "./doc";
import { gateShot, gateVideo, localVideoChecks } from "./quality";
import { engineVideoKey, keyFrames, rememberShot, renderVideoFile, saveRendered, saveVideoVersion, shotKey, shotMemo, videoUserOwned } from "./store";
import { disclosureLabel, honestLine, personaPrompt, personaSheet, ugcScriptIssues, type PersonaSheet } from "./ugc";
import { realVideoDeps, type VideoV2Deps } from "./deps";
import type { Clip, CreativeStrategy, ShotOutcome, ShotPlan, VideoDocument, VideoReview, VideoRunResult, VideoScript } from "./types";
import type { GateDecision } from "../quality/gate";

const exec = promisify(execFile);
export const VIDEO_V2_VERSION = "7a.1";
export const DEFAULT_VIDEO_CAP_EUR = 6;

export type VideoRequestV2 = {
  ask: VideoAsk;
  offer?: string | null;
  /** Plafond de dépense RÉEL de la tâche (euros). */
  maxCostEur?: number;
  /** Le client a vu l'estimation et accepte les plans générés (sinon : uniquement montage local). */
  approveGeneration?: boolean;
  /** Plan seul (intention, stratégie, script, storyboard, procédés, estimation) : rien n'est produit ni payé. */
  planOnly?: boolean;
  /** Rendu du fichier (par défaut oui) ; échelle et images/s réduites pour les tests. */
  render?: boolean;
  renderScale?: number;
  fps?: number;
};

type Media = { kind: "image" | "video" | "doc"; assetId: string | null; durationS?: number; generated?: boolean; doc?: Clip["source"] };
type Budget = { capMicro: number; spentMicro: number };

const hash = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 16);

export async function runVideoEngineV2(ctx: JobContext | null, projectId: string, req: VideoRequestV2, injected?: VideoV2Deps): Promise<VideoRunResult> {
  const p = loadProject(projectId);
  const jobId = ctx?.job.id ?? null;
  const deps = injected ?? realVideoDeps(ctx, p, aiActiveFor(p.userId));
  const before = jobId ? (all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0) : 0;
  const capMicro = Math.round((req.maxCostEur ?? DEFAULT_VIDEO_CAP_EUR) * EUR);
  const cur = currentTrace();
  const own = before + capMicro;
  return withTrace({ ...(jobId ? { jobId } : {}), projectId, ...(cur.intent ? {} : { intent: "CREATE_VIDEO" }), costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, own) : own }, () => engine(ctx, p, req, deps, { capMicro, spentMicro: 0 }));
}

async function engine(ctx: JobContext | null, p: Project, req: VideoRequestV2, deps: VideoV2Deps, budget: Budget): Promise<VideoRunResult> {
  const lang = contentLang();
  const jobId = ctx?.job.id ?? null;
  const runId = crypto.randomUUID();
  const notes: string[] = [];
  const stats = { generated: 0, reused: 0, retries: 0, localShots: 0, skippedForBudget: 0, reviews: 0 };

  // 1-2. Intention et stratégie (gratuites).
  const intent = videoIntent(p, req.ask);
  const insight = adInsight(p, { audience: intent.audience, offer: req.offer });
  const strategy = videoStrategy(p, intent, { offer: req.offer, insight });
  notes.push(...strategy.gaps.map((g) => `à compléter : ${g}`));

  // 3. Script : local d'abord, IA ensuite (contrôlée, une reprise ciblée au plus).
  // Plan seul (estimation affichée avant accord) : script local, aucun appel d'IA.
  const script = await writeScript(p, deps, insight, strategy, intent, jobId, notes, !req.planOnly);
  const ugc = intent.kind === "ugc";
  const persona: PersonaSheet | null = ugc ? personaSheet(p.id, insight) : null;

  // 4-5. Storyboard et procédé de chaque plan.
  const inv = deps.inventory();
  const storyboard = buildStoryboard(insight, strategy, intent, script, inv);
  const sbIssues = storyboardIssues(storyboard, strategy.durationS);
  if (sbIssues.length) notes.push(...sbIssues.map((x) => `storyboard : ${x}`));
  const canGenerate = req.ask.allowGeneration !== false && deps.generationAllowed && deps.canReview;
  if (req.ask.allowGeneration !== false && !deps.canReview && deps.generationAllowed) notes.push("contrôle de vision indisponible : aucun plan généré (il ne pourrait pas être validé)");
  const planning = planShots(storyboard, {
    intent,
    strategy,
    inv,
    allowGeneration: canGenerate,
    provider: (need) => chooseProvider(need, { available: deps.available, preferred: deps.preferred, estimate: deps.estimate ?? estimateMicro }),
    budgetMicro: budget.capMicro,
  });
  notes.push(...planning.notes);
  stats.skippedForBudget += planning.skippedForBudget;
  const result: VideoRunResult = { runId, docKey: null, intent, strategy, script, shots: planning.shots, outcomes: [], verdict: "PROVISIONAL", codes: [], reason: "", issues: [], videoAssetId: null, stats, costMicro: 0, estimateMicro: planning.estimateMicro, stoppedByCostCap: false, notes };
  if (req.planOnly) return result;

  // Accord du client : sans accord explicite, les plans payants deviennent des plans locaux (rien n'est dépensé).
  let shots = planning.shots;
  if (planning.estimateMicro > 0 && !req.approveGeneration) {
    notes.push(`génération non approuvée (estimation ${(planning.estimateMicro / EUR).toFixed(2)} €) : vidéo montée sans plan généré`);
    shots = planShots(storyboard, { intent, strategy, inv, allowGeneration: false, provider: () => null, budgetMicro: 0 }).shots;
    result.shots = shots;
    result.estimateMicro = 0;
  }

  try {
    // 6. Médias de chaque plan.
    const pal = palette(p);
    const typo = brandTypo(p);
    const size = SIZES[intent.aspect];
    const safe = safeZone(intent.aspect, intent.platform);
    const media = new Map<string, Media>();
    let characterRef: { assetId: string; data: Buffer } | null = null;
    for (const s of shots) {
      const out = await resolveShot({ p, ctx, deps, s, inv, strategy, intent, budget, stats, persona, characterRef, notes, pal, typo, size, safe, insight });
      media.set(s.id, out.media);
      result.outcomes.push(out.outcome);
      if (out.characterRef && !characterRef) characterRef = out.characterRef;
    }

    // 7. Document vidéo (timeline éditable).
    let doc = assemble({ p, intent, strategy, shots, media, inv, pal, typo, size, safe, insight, runId });
    // Voix off : seulement si un fournisseur de synthèse vocale existe (sinon la voix reste à enregistrer).
    if (deps.voice) await recordVoices(p, deps, doc, jobId, notes);
    else if (doc.audio.voice.length) notes.push("voix off : aucun fournisseur de synthèse vocale configuré — texte prêt à enregistrer, porté par les sous-titres");

    // 8. Lignée : une vidéo modifiée par le client n'est jamais écrasée (nouvelle lignée).
    let docKey = engineVideoKey(p.id, intent.kind, intent.aspect, intent.platform);
    if (videoUserOwned(p.id, docKey)) {
      docKey = `vid:${runId.replace(/-/g, "").slice(0, 20)}`;
      notes.push("vidéo précédente modifiée par le client : conservée, la nouvelle version est une nouvelle vidéo");
    }
    result.docKey = docKey;

    // 9-11. Rendu, barrière, reprises ciblées (gratuites d'abord).
    if (req.render === false) {
      saveVideoVersion(p.id, docKey, doc, { note: "moteur — non rendu" });
      result.reason = "document créé (rendu non demandé)";
      return result;
    }
    const shotCodes = [...new Set(result.outcomes.flatMap((o) => (o.verdict === "REJECTED" ? [] : o.codes)))];
    let decision: GateDecision | null = null;
    let renderedId: string | null = null;
    for (let attempt = 0; attempt <= POLICIES.video_v2.maxRetries; attempt++) {
      ctx?.progress(0.7, "Rendu de la vidéo");
      const ex = await renderVideoFile(p.id, doc, { scale: req.renderScale, fps: req.fps, onProgress: (x) => ctx?.progress(0.7 + x * 0.2, `Rendu ${Math.round(x * 100)} %`) });
      try {
        const probe = await probeDuration(ex.file);
        const local = localVideoChecks(doc, { targetS: strategy.durationS, scriptIssues: [...script.issues], audio: ex.audio, fileDurationS: probe });
        let review: VideoReview | null = null;
        let reviewError: string | null = null;
        if (!local.codes.length && deps.canReview) {
          stats.reviews++;
          try {
            const frames = await keyFrames(p.id, doc, 6, 0.4);
            review = await withCandidate(`video2:${docKey}`, attempt, () => deps.reviewVideo(frames, reviewText(doc, script, strategy, local.measures), `${jobId ?? "video2"}:video2:review:${hash({ docKey, attempt, v: doc.clips.map((c) => [c.id, c.durationS, c.source.kind]) })}`));
          } catch (e) {
            if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
            reviewError = (e as Error).message;
          }
        }
        decision = gateVideo({ local, review, reviewError, shotCodes, attempt });
        result.issues = [...local.issues, ...(review?.issues ?? [])];
        const g = gateSave({ userId: p.userId, projectId: p.id, jobId, candidateId: `video2:${docKey}` }, decision);
        const saved = await saveRendered(p.id, p.userId, docKey, doc, ex, { ...g.meta, videoV2Run: { runId, version: VIDEO_V2_VERSION, attempt, verdict: decision.verdict, codes: [...decision.fatalCodes, ...decision.blockingCodes] } });
        renderedId = saved.videoId;
        saveVideoVersion(p.id, docKey, doc, { note: `moteur — essai ${attempt + 1} (${decision.verdict})`, renderedAssetId: renderedId });
        if (decision.verdict !== "RETRY" || decision.action !== "regenerate") break;
        // Reprise ciblée : la cause décide (sous-titres, audio, montage : gratuit ; un plan : ce plan seul).
        const fixed = await targetedFix({ p, ctx, deps, doc, review, decision, shots, inv, strategy, intent, budget, stats, persona, characterRef, notes, pal, typo, size, safe, insight, media });
        if (!fixed) break;
        stats.retries++;
        doc = fixed;
      } finally {
        fs.rmSync(ex.dir, { recursive: true, force: true });
      }
    }
    result.videoAssetId = renderedId;
    if (decision) {
      result.verdict = decision.verdict;
      result.codes = [...decision.fatalCodes, ...decision.blockingCodes];
      result.reason = decision.reason;
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    result.stoppedByCostCap = true;
    notes.push(`arrêt au plafond de dépense : ${e.message}`);
  }
  result.costMicro = jobId ? (all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0) : budget.spentMicro;
  if (!jobId) result.costMicro = budget.spentMicro;
  void lang;
  return result;
}

async function probeDuration(file: string): Promise<number | null> {
  const { stdout } = await exec("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file]).catch(() => ({ stdout: "" }));
  const n = Number(stdout);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function reviewText(doc: VideoDocument, script: VideoScript, st: CreativeStrategy, measures: Record<string, unknown>) {
  return [
    `Objectif : ${st.objective}. Audience : ${st.audience}. Message : ${st.message}. Langage visuel : ${st.style.language}. Durée visée : ${st.durationS} s.`,
    `Script : ${script.sections.map((s) => `[${s.part}] ${s.voice || s.onScreen}`).join(" / ")}`,
    `Plans : ${doc.clips.map((c) => `${c.shotId} ${c.label} (${c.source.kind}${c.generated ? ", généré" : ""}, ${c.durationS} s)`).join(" ; ")}`,
    `Mesures : ${JSON.stringify(measures)}. Mention IA : ${doc.disclosure ?? "aucune"}.`,
  ].join("\n");
}

// ------------------------------------------------------------------------------------------- script

async function writeScript(p: Project, deps: VideoV2Deps, i: AdInsight, st: CreativeStrategy, intent: ReturnType<typeof videoIntent>, jobId: string | null, notes: string[], allowAi: boolean): Promise<VideoScript> {
  const local = localScript(i, st, intent);
  const ugcFix = (s: VideoScript): VideoScript => {
    if (intent.kind !== "ugc") return s;
    const bad = ugcScriptIssues(s.sections);
    if (!bad.length) return s;
    // Faux témoignage : la réplique devient une présentation honnête.
    const sections = s.sections.map((x) => (ugcScriptIssues([x]).length ? { ...x, voice: honestLine(i), onScreen: x.onScreen && ugcScriptIssues([{ ...x, voice: "" }]).length ? "" : x.onScreen } : x));
    return { ...s, sections, issues: [...s.issues.filter((x) => !bad.includes(x))] };
  };
  if (!allowAi || !deps.canWrite || intent.complexity === "simple") return ugcFix(local);
  const material = { proofs: st.proofs, facts: i.facts, claimsToAvoid: i.claimsToAvoid };
  let feedback: string | undefined;
  for (let round = 0; round < 2; round++) {
    try {
      const draft = await deps.writeScript(scriptSystem(contentLang()), scriptPrompt(i, st, intent, local.sections.map((s) => ({ part: s.part, durationS: s.durationS })), feedback), `${jobId ?? "video2"}:video2:script:${hash({ p: p.id, k: intent.kind, d: st.durationS, h: st.hook })}:${round}`);
      const sections = fromDraft(draft, local, st.proofs.length > 0);
      const issues = [...scriptIssues(sections, material), ...(intent.kind === "ugc" ? ugcScriptIssues(sections) : [])];
      if (sections.length >= 3 && !issues.length) return { style: st.style.narrative, sections, by: "ai", issues: [] };
      feedback = issues.join(" ; ") || "sections manquantes";
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      notes.push(`rédaction IA indisponible (${(e as Error).message.slice(0, 80)}) : script local`);
      return ugcFix(local);
    }
  }
  notes.push(`script IA refusé au contrôle (${feedback}) : script local gardé`);
  return ugcFix(local);
}

// ------------------------------------------------------------------------------------------- plans

type ResolveInput = {
  p: Project;
  ctx: JobContext | null;
  deps: VideoV2Deps;
  s: ShotPlan;
  inv: Inventory;
  strategy: CreativeStrategy;
  intent: ReturnType<typeof videoIntent>;
  budget: Budget;
  stats: VideoRunResult["stats"];
  persona: PersonaSheet | null;
  characterRef: { assetId: string; data: Buffer } | null;
  notes: string[];
  pal: ReturnType<typeof palette>;
  typo: ReturnType<typeof brandTypo>;
  size: { w: number; h: number };
  safe: VideoDocument["safe"];
  insight: AdInsight;
  feedback?: string;
};

/** Plan sans génération (gratuit) : photo réelle, vidéo réelle, composition — jamais d'appel payant. */
function localMedia(s: ShotPlan): Media {
  if (s.method === "existing_video" && s.source.assetId) return { kind: "video", assetId: s.source.assetId };
  if ((s.method === "animated_image" || s.method === "ui_animation") && s.source.kind === "asset" && s.source.assetId) return { kind: "image", assetId: s.source.assetId };
  return { kind: "doc", assetId: null };
}

async function clipFrames(buf: Buffer): Promise<Buffer[]> {
  const dir = tmpDir("video2-frames");
  try {
    const f = path.join(dir, "in.mp4");
    fs.writeFileSync(f, buf);
    const d = (await probeDuration(f)) ?? 4;
    const out: Buffer[] = [];
    for (const [k, t] of [d * 0.08, d * 0.5, d * 0.92].entries()) {
      const img = path.join(dir, `f${k}.jpg`);
      await exec("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", f, "-frames:v", "1", "-q:v", "3", img]).catch(() => null);
      if (fs.existsSync(img)) out.push(fs.readFileSync(img));
    }
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Consigne de tournage d'un plan : sujet, action, cadrage, mouvement, lumière ; produit à garder identique. */
function shotPrompt(s: ShotPlan, st: CreativeStrategy, persona: PersonaSheet | null, feedback?: string): string {
  const cam: Record<string, string> = { static: "locked-off camera", push_in: "slow push-in", pull_out: "slow pull-out", pan_left: "slow pan left", pan_right: "slow pan right", tilt_up: "gentle tilt up", orbit: "slow orbit around the subject", handheld: "subtle handheld movement" };
  return [
    `${s.subject} — ${s.action}. Setting: ${s.environment}. Framing: ${s.framing.replace("_", " ")}; camera: ${cam[s.camera] ?? s.camera}; light: ${s.lighting}.`,
    `Visual language: ${st.style.camera}; ${st.style.light}. Motion starts on the first frame.`,
    s.showsProduct ? "The product must remain exactly identical to the start frame (shape, colors, proportions, logo, packaging, printed text); never redraw or invent it." : "",
    persona && s.character ? personaPrompt(persona) : "No people in frame unless already present in the start frame.",
    "No text overlay, no captions, no watermark.",
    feedback ? `Fix from the previous take: ${feedback}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

async function resolveShot(o: ResolveInput): Promise<{ media: Media; outcome: ShotOutcome; characterRef?: { assetId: string; data: Buffer } | null }> {
  const { p, deps, s, stats } = o;
  const base: ShotOutcome = { shotId: s.id, method: s.method, verdict: "FINAL", assetId: null, attempts: 0, reused: false, costMicro: 0, reason: s.why, codes: [] };
  // Image Engine V2 pour un plan sans visuel (recherche d'abord, génération selon ses propres règles et plafond).
  if (s.source.kind === "image_v2") {
    const img = await o.deps.image({ kind: o.p.business === "services" ? "trade_photo" : "ambiance", support: "video", aspect: o.intent.aspect === "16:9" ? "16:9" : o.intent.aspect === "1:1" ? "1:1" : "9:16", topic: s.subject, allowGenerate: o.intent.complexity !== "simple", name: `video-${s.part}`, maxControls: 2 });
    stats.localShots++;
    if (img) return { media: { kind: "image", assetId: img.assetId }, outcome: { ...base, assetId: img.assetId, reason: "image de l'Image Engine V2" } };
    o.notes.push(`${s.id} : aucune image retenue par l'Image Engine V2 — typographie animée`);
    return { media: { kind: "doc", assetId: null }, outcome: { ...base, method: "kinetic_type", reason: "aucune image : typographie animée" } };
  }
  if (s.source.kind !== "generate") {
    stats.localShots++;
    const m = localMedia(s);
    return { media: m, outcome: { ...base, assetId: m.assetId, reason: s.why } };
  }

  // Plan généré : image de départ réelle (référence) ; personnage : même image de départ pour toute la vidéo.
  const provider = s.source.provider!;
  const model = s.source.model!;
  const startId = s.character && o.characterRef ? o.characterRef.assetId : s.source.assetId ?? s.reference.assetId;
  let start = startId ? deps.data(startId) : null;
  let startAsset = startId;
  if (!start) {
    const img = await deps.image({ kind: s.character ? "lifestyle" : o.p.business === "services" ? "trade_photo" : "usage_scene", support: "video", aspect: o.intent.aspect === "16:9" ? "16:9" : "9:16", topic: s.subject, allowGenerate: true, name: `video-depart-${s.id}`, maxControls: 2 });
    if (img) {
      start = img.data;
      startAsset = img.assetId;
    }
  }
  if (!start) {
    stats.localShots++;
    o.notes.push(`${s.id} : aucune image de départ fiable — plan monté localement`);
    return { media: { kind: "doc", assetId: null }, outcome: { ...base, method: "kinetic_type", reason: "aucune image de départ : composition locale" } };
  }
  const productRef = s.showsProduct && o.inv.cutout ? deps.data(o.inv.cutout.id) : null;
  const key = shotKey({ v: 1, p: p.id, provider, model, subject: s.subject, action: s.action, camera: s.camera, framing: s.framing, d: s.durationS, start: startAsset, persona: o.persona?.id ?? null, fb: o.feedback ?? null });
  const memo = shotMemo(p.id, key);
  if (memo?.verdict === "FINAL" && memo.assetId) {
    stats.reused++;
    return { media: { kind: "video", assetId: memo.assetId, generated: true }, outcome: { ...base, verdict: "FINAL", assetId: memo.assetId, reused: true, reason: "plan déjà accepté : réutilisé (aucun coût)" }, characterRef: s.character && startAsset ? { assetId: startAsset, data: start } : null };
  }
  const capability = VIDEO_CAPABILITIES.find((c) => c.provider === provider && c.model === model);
  const seconds = capability ? shootDuration(capability, s.durationS) : Math.ceil(s.durationS);
  const est = (deps.estimate ?? estimateMicro)(provider, model, seconds) ?? s.source.estimateMicro ?? 0;
  let feedback = o.feedback;
  let spent = 0;
  let last: { verdict: ShotOutcome["verdict"]; codes: string[]; reason: string; assetId: string | null } = { verdict: "REJECTED", codes: [], reason: "", assetId: null };
  const maxAttempts = POLICIES.video_shot_v2.maxRetries + 1;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Plafond : vérifié AVANT l'envoi ; au-delà, plan local (la vidéo n'est jamais bloquée).
    if (o.budget.spentMicro + est > o.budget.capMicro) {
      stats.skippedForBudget++;
      o.notes.push(`${s.id} : génération arrêtée avant envoi (budget ${(o.budget.capMicro / EUR).toFixed(2)} € atteint) — plan local`);
      break;
    }
    o.ctx?.progress(0.3, `Tournage du plan ${s.id}`);
    const buf = await withCandidate(`video2:${s.id}`, attempt, () => deps.generateClip({ provider, model, image: start!, prompt: shotPrompt(s, o.strategy, o.persona, feedback), aspect: o.intent.aspect === "16:9" ? "16:9" : "9:16", seconds, people: s.character }, `${o.ctx?.job.id ?? "video2"}:video2:shot:${key}:${attempt}`));
    o.budget.spentMicro += est;
    spent += est;
    stats.generated++;
    const frames = await clipFrames(buf);
    let review = null;
    let error: string | null = null;
    try {
      review = await withCandidate(`video2:${s.id}`, attempt, () => deps.reviewShot(frames, { product: productRef, character: s.character ? (o.characterRef?.data ?? null) : null }, `Plan ${s.id} (${s.part}) : ${s.subject} — ${s.action}. Objectif : ${s.purpose}.`, `${o.ctx?.job.id ?? "video2"}:video2:shotqc:${key}:${attempt}`));
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      error = (e as Error).message;
    }
    if (!frames.length) error = "plan illisible (aucune image extraite)";
    const d = gateShot({ review, error, expectsProduct: s.showsProduct, expectsCharacter: s.character && !!o.characterRef, attempt });
    const g = gateSave({ userId: p.userId, projectId: p.id, jobId: o.ctx?.job.id ?? null, candidateId: `video2:${s.id}` }, d);
    const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: buf, name: `plan-${s.id}-${s.part}${attempt ? `-essai-${attempt + 1}` : ""}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: startAsset ?? null, status: d.verdict === "FINAL" ? "review" : "rejected", meta: { videoV2Shot: { key, shotId: s.id, provider, model, attempt, verdict: d.verdict }, ...g.meta } });
    last = { verdict: d.verdict, codes: [...d.fatalCodes, ...d.blockingCodes], reason: [d.reason, d.feedback].filter(Boolean).join(" — "), assetId: asset.id };
    if (d.verdict === "FINAL") break;
    if (d.verdict !== "RETRY" || d.action !== "regenerate") break;
    stats.retries++;
    feedback = d.feedback || review?.issues.join("; ");
  }
  rememberShot(p.id, key, { assetId: last.verdict === "FINAL" ? last.assetId : null, method: s.method, verdict: last.verdict, provider, model, costMicro: spent, attempts: maxAttempts, reason: last.reason });
  if (last.verdict === "FINAL" && last.assetId) return { media: { kind: "video", assetId: last.assetId, generated: true }, outcome: { ...base, verdict: "FINAL", assetId: last.assetId, attempts: maxAttempts, costMicro: spent, reason: "plan généré accepté au contrôle", codes: [] }, characterRef: s.character && startAsset ? { assetId: startAsset, data: start } : null };
  // Plan refusé (produit transformé, personnage incohérent…) : jamais monté ; plan local à la place.
  stats.localShots++;
  if (last.assetId) o.notes.push(`${s.id} : plan généré refusé (${last.reason || last.codes.join(", ")}) — remplacé par un plan local`);
  const fallback = s.showsProduct && o.inv.cutout ? "packshot" : s.reference.assetId && o.inv.photos.some((x) => x.id === s.reference.assetId) ? "animated_image" : "kinetic_type";
  return { media: fallback === "animated_image" ? { kind: "image", assetId: s.reference.assetId } : { kind: "doc", assetId: null }, outcome: { ...base, method: fallback, verdict: last.assetId ? last.verdict : "PROVISIONAL", assetId: null, attempts: maxAttempts, costMicro: spent, reason: `plan local après ${last.assetId ? "refus" : "arrêt"} du plan généré`, codes: last.codes } };
}

// ------------------------------------------------------------------------------------------- assemblage

type AssembleInput = {
  p: Project;
  intent: ReturnType<typeof videoIntent>;
  strategy: CreativeStrategy;
  shots: ShotPlan[];
  media: Map<string, Media>;
  inv: Inventory;
  pal: ReturnType<typeof palette>;
  typo: ReturnType<typeof brandTypo>;
  size: { w: number; h: number };
  safe: VideoDocument["safe"];
  insight: AdInsight;
  runId: string;
};

const PART_LABEL: Record<string, string> = { hook: "Accroche", development: "Développement", demonstration: "Démonstration", proof: "Preuve", conclusion: "Conclusion", cta: "Appel à l'action" };

const fold = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function clipFor(s0: ShotPlan, m: Media, a: Pick<AssembleInput, "pal" | "typo" | "size" | "safe" | "insight" | "inv" | "strategy">, index: number): Clip {
  // Le texte à l'écran ne répète pas mot pour mot le sous-titre (la voix) : il est alors retiré, le sous-titre suffit.
  const s = s0.onScreen && s0.voice && (fold(s0.voice).startsWith(fold(s0.onScreen)) || fold(s0.onScreen).startsWith(fold(s0.voice))) && s0.part !== "cta" ? { ...s0, onScreen: "" } : s0;
  const { w, h } = a.size;
  const common = { w, h, safe: a.safe, pal: a.pal, typo: a.typo, brand: a.insight.brand };
  const label = `${PART_LABEL[s.part] ?? s.part} · ${s.id}`;
  const transitionIn = { kind: index === 0 ? ("cut" as const) : s.transition, durationS: index === 0 || s.transition === "cut" ? 0 : 0.4 };
  const base = { id: `c-${s.id}`, shotId: s.id, label, part: s.part, durationS: s.durationS, transitionIn, overlays: [] as Clip["overlays"] };
  if (m.kind === "video" && m.assetId) {
    const dur = m.durationS ?? s.durationS;
    return { ...base, durationS: Math.min(s.durationS, Math.max(0.8, dur)), source: { kind: "video", assetId: m.assetId, inS: 0, outS: Math.min(dur, s.durationS), muted: !(s.character && !!s.voice) }, overlays: s.onScreen ? overlayText({ ...common, text: s.onScreen, place: s.part === "hook" ? "lower" : "lower" }) : [], generated: !!m.generated };
  }
  if (m.kind === "image" && m.assetId) return { ...base, source: { kind: "image", assetId: m.assetId, motion: s.camera === "handheld" ? "push_in" : s.camera, crop: null }, overlays: s.onScreen ? overlayText({ ...common, text: s.onScreen, place: "lower" }) : [] };
  // Compositions (calques de l'éditeur publicitaire).
  if (s.part === "cta") return { ...base, source: { kind: "doc", doc: endCardDoc({ ...common, cta: a.strategy.cta, line: a.strategy.message.slice(0, 70), logoId: a.inv.logo?.id ?? null }), animate: "rise" } };
  if (s.method === "packshot" && a.inv.cutout) return { ...base, source: { kind: "doc", doc: packshotDoc({ ...common, cutoutId: a.inv.cutout.id, title: s.onScreen || undefined }), animate: "rise" } };
  if (s.method === "ui_animation") return { ...base, source: { kind: "doc", doc: interfaceDoc({ ...common, text: s.onScreen || s.subject }), animate: "rise" } };
  return { ...base, source: { kind: "doc", doc: kineticDoc({ ...common, text: s.onScreen || s.subject, dark: s.part === "proof" }), animate: "fade" } };
}

function assemble(a: AssembleInput): VideoDocument {
  const { w, h } = a.size;
  const clips = a.shots.map((s, k) => clipFor(s, a.media.get(s.id) ?? { kind: "doc", assetId: null }, a, k));
  // Durée tenue : le temps perdu par un plan vidéo plus court revient au plan suivant composé.
  const lost = a.shots.reduce((t, s, k) => t + (s.durationS - clips[k].durationS), 0);
  if (lost > 0.05) {
    const target = [...clips].reverse().find((c) => c.source.kind !== "video");
    if (target) target.durationS = Math.round((target.durationS + lost) * 100) / 100;
  }
  const doc: VideoDocument = {
    version: VIDEO_DOC_VERSION,
    width: w,
    height: h,
    fps: 30,
    aspect: a.intent.aspect,
    platform: a.intent.platform,
    safe: a.safe,
    clips,
    subtitles: { style: defaultSubtitleStyle({ width: w, height: h }, a.typo, a.pal), cues: [] },
    audio: { voice: [], voiceId: null, music: a.strategy.style.music === "none" ? null : { source: "synth", mood: a.strategy.style.music, gainDb: -14 }, sfx: [], duckingDb: -10, loudnessLufs: -14 },
    brand: { palette: { ...a.pal }, fonts: { heading: a.typo.heading, body: a.typo.body }, name: a.insight.brand },
    disclosure: null,
    meta: { intent: a.intent.kind, source: "engine", createdFrom: null, runId: a.runId },
  };
  for (const [k, s] of a.shots.entries()) {
    const c = clips[k];
    if (!s.voice.trim()) continue;
    // Composition dont le texte principal EST la phrase dite : pas de sous-titre en double (la voix reste).
    const shown = c.source.kind === "doc" ? c.source.doc.layers.filter((l) => l.kind === "text").map((l) => fold((l as { text: string }).text)).join(" ") : "";
    if (!(shown && fold(s.voice) && shown.includes(fold(s.voice)))) doc.subtitles.cues.push(...cuesForVoice(c.id, s.voice, c.durationS, doc.subtitles.style.maxChars, `q-${s.id}`));
    const v = voiceClip(c, s.voice);
    if (v) doc.audio.voice.push(v);
  }
  if (clips.some((c) => c.generated) || a.intent.kind === "ugc") doc.disclosure = disclosureLabel();
  return doc;
}

async function recordVoices(p: Project, deps: VideoV2Deps, doc: VideoDocument, jobId: string | null, notes: string[]) {
  for (const v of doc.audio.voice) {
    try {
      const r = await deps.voice!(v.text, doc.audio.voiceId, `${jobId ?? "video2"}:video2:voice:${hash({ t: v.text, id: doc.audio.voiceId })}`);
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: r.data, name: `voix-${v.clipId}.${r.mime.includes("mpeg") ? "mp3" : "wav"}`, mime: r.mime, role: "voice", folderKey: "videos.ads", origin: "generated", meta: { videoV2Voice: { clipId: v.clipId } } });
      v.assetId = a.id;
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      notes.push(`voix du plan ${v.clipId} indisponible (${(e as Error).message.slice(0, 60)})`);
    }
  }
}

// ------------------------------------------------------------------------------------------- reprises

type FixInput = ResolveInput extends infer R ? Omit<R & {}, "s"> & { doc: VideoDocument; review: VideoReview | null; decision: GateDecision; shots: ShotPlan[]; media: Map<string, Media> } : never;

/**
 * Reprise ciblée d'après le diagnostic : sous-titres (taille, débit), audio (gain), montage (transitions) —
 * gratuits ; un plan précis — ce plan seul (génération si c'était un plan généré et que le budget le permet,
 * sinon procédé local). Jamais toute la vidéo. Retourne null s'il n'y a rien de sûr à corriger.
 */
async function targetedFix(o: FixInput): Promise<VideoDocument | null> {
  const doc = structuredClone(o.doc);
  const codes = [...o.decision.blockingCodes];
  const target = o.review?.fix.target ?? (codes.includes("illegible_text") || codes.includes("out_of_sync") ? "subtitles" : codes.includes("audio_unusable") ? "audio" : codes.includes("repetitive_editing") ? "editing" : codes.includes("character_inconsistent") || codes.includes("off_topic") || codes.includes("major_artifacts") ? "shot" : "none");
  if (target === "subtitles") {
    doc.subtitles.style = { ...doc.subtitles.style, size: Math.round(Math.max(doc.subtitles.style.size, Math.min(doc.width, doc.height) * 0.05)), maxChars: Math.max(18, doc.subtitles.style.maxChars - 4), offsetY: 0 };
    // Débit : chaque carton est re-découpé sur la voix du plan.
    const voices = new Map(doc.audio.voice.map((v) => [v.clipId, v.text]));
    doc.subtitles.cues = doc.clips.flatMap((c) => (voices.get(c.id) ? cuesForVoice(c.id, voices.get(c.id)!, c.durationS, doc.subtitles.style.maxChars, `q-${c.shotId}-r`) : doc.subtitles.cues.filter((q) => q.clipId === c.id)));
    o.notes.push("reprise ciblée : sous-titres agrandis et redécoupés (gratuit)");
    return doc;
  }
  if (target === "audio") {
    if (doc.audio.music) doc.audio.music = { ...doc.audio.music, gainDb: doc.audio.music.gainDb - 4 };
    o.notes.push("reprise ciblée : musique baissée (gratuit)");
    return doc;
  }
  if (target === "editing") {
    doc.clips.forEach((c, k) => (c.transitionIn = k === 0 ? { kind: "cut", durationS: 0 } : k % 3 === 0 ? { kind: "fade", durationS: 0.35 } : { kind: "cut", durationS: 0 }));
    o.notes.push("reprise ciblée : transitions simplifiées (gratuit)");
    return doc;
  }
  if (target === "shot") {
    const shotId = o.review?.fix.shotId ?? o.shots.find((s) => o.media.get(s.id)?.generated)?.id ?? null;
    const s = o.shots.find((x) => x.id === shotId);
    const k = doc.clips.findIndex((c) => c.shotId === shotId);
    if (!s || k < 0 || doc.clips[k].userEdited) return null;
    const out = await resolveShot({ ...o, s, feedback: o.review?.fix.instruction || o.decision.feedback });
    o.media.set(s.id, out.media);
    doc.clips[k] = { ...clipFor(s, out.media, o, k), id: doc.clips[k].id };
    o.notes.push(`reprise ciblée : plan ${s.id} seul (${out.outcome.reason})`);
    return doc;
  }
  return null;
}

/**
 * Nouveau plan pour UNE séquence d'une vidéo existante (« Remplace le deuxième plan » avec génération acceptée) :
 * les autres plans ne bougent pas ; une nouvelle version du document est enregistrée.
 */
export async function regenerateClip(ctx: JobContext | null, projectId: string, docKey: string, clipId: string, o: { approve: boolean; maxCostEur?: number; instruction?: string }, injected?: VideoV2Deps): Promise<{ doc: VideoDocument; outcome: ShotOutcome; notes: string[] }> {
  const { latestVideo } = await import("./store");
  const p = loadProject(projectId);
  const deps = injected ?? realVideoDeps(ctx, p, aiActiveFor(p.userId));
  const cur = latestVideo(projectId, docKey);
  if (!cur) throw new Error("vidéo introuvable");
  const k = cur.doc.clips.findIndex((c) => c.id === clipId);
  if (k < 0) throw new Error("plan introuvable");
  const clip = cur.doc.clips[k];
  const intent = videoIntent(p, { kind: cur.doc.meta.intent as never, aspect: cur.doc.aspect, platform: cur.doc.platform, durationS: Math.round(cur.doc.clips.reduce((t, c) => t + c.durationS, 0)) });
  const insight = adInsight(p, {});
  const strategy = videoStrategy(p, intent, { insight });
  const inv = deps.inventory();
  const notes: string[] = [];
  const shot: ShotPlan = { id: clip.shotId, durationS: clip.durationS, part: clip.part ?? "development", subject: o.instruction?.trim() || clip.label, action: "plan de remplacement", environment: strategy.style.camera, framing: "medium", camera: "push_in", lighting: strategy.style.light, reference: { assetId: inv.photos[0]?.id ?? null, note: "photo réelle" }, voice: "", onScreen: "", sound: "", transition: clip.transitionIn.kind, purpose: "remplacer la séquence", showsProduct: !!inv.cutout && p.business === "products", character: intent.kind === "ugc", method: "ai_video", source: { kind: "compose" }, why: "" };
  const choice = o.approve && deps.generationAllowed && deps.canReview ? chooseProvider({ imageToVideo: true, people: shot.character, nativeAudio: false, aspect: cur.doc.aspect, durationS: clip.durationS }, { available: deps.available, preferred: deps.preferred, estimate: deps.estimate ?? estimateMicro }) : null;
  if (choice) shot.source = { kind: "generate", assetId: shot.reference.assetId, provider: choice.provider, model: choice.model, estimateMicro: choice.estimateMicro };
  else {
    notes.push(o.approve ? "aucun fournisseur vidéo compatible et disponible : plan local" : "génération non approuvée : plan local");
    shot.method = shot.reference.assetId ? "animated_image" : "kinetic_type";
    shot.source = shot.reference.assetId ? { kind: "asset", assetId: shot.reference.assetId } : { kind: "compose" };
  }
  const budget = { capMicro: Math.round((o.maxCostEur ?? 2) * EUR), spentMicro: 0 };
  const stats = { generated: 0, reused: 0, retries: 0, localShots: 0, skippedForBudget: 0, reviews: 0 };
  const pal = palette(p);
  const typo = brandTypo(p);
  const out = await withTrace({ projectId, intent: "CREATE_VIDEO", costCapMicro: budget.capMicro }, () =>
    resolveShot({ p, ctx, deps, s: shot, inv, strategy, intent, budget, stats, persona: intent.kind === "ugc" ? personaSheet(p.id, insight) : null, characterRef: null, notes, pal, typo, size: { w: cur.doc.width, h: cur.doc.height }, safe: cur.doc.safe, insight }),
  );
  const doc = structuredClone(cur.doc);
  doc.clips[k] = { ...clipFor(shot, out.media, { pal, typo, size: { w: doc.width, h: doc.height }, safe: doc.safe, insight, inv, strategy }, k), id: clip.id, overlays: clip.overlays, transitionIn: clip.transitionIn, durationS: clip.durationS };
  if (doc.clips.some((c) => c.generated) && !doc.disclosure) doc.disclosure = disclosureLabel();
  doc.meta = { ...doc.meta, source: out.media.generated ? "ai" : "user" };
  saveVideoVersion(projectId, docKey, doc, { note: `plan ${clip.shotId} remplacé (${out.outcome.reason})` });
  return { doc, outcome: out.outcome, notes };
}

/** Rendu du document enregistré (après modifications du client) : local et gratuit, contrôles locaux, bibliothèque. */
export async function renderLatest(ctx: JobContext | null, projectId: string, docKey: string, o: { scale?: number; fps?: number } = {}): Promise<{ videoAssetId: string; verdict: string; issues: string[] }> {
  const { latestVideo } = await import("./store");
  const p = loadProject(projectId);
  const cur = latestVideo(projectId, docKey);
  if (!cur) throw new Error("vidéo introuvable");
  const ex = await renderVideoFile(projectId, cur.doc, { scale: o.scale, fps: o.fps, onProgress: (x) => ctx?.progress(x * 0.9, `Rendu ${Math.round(x * 100)} %`) });
  try {
    const { timeline } = await import("./doc");
    const local = localVideoChecks(cur.doc, { targetS: timeline(cur.doc).total, scriptIssues: [], audio: ex.audio, fileDurationS: await probeDuration(ex.file) });
    // Rendu d'une version modifiée par le client : au mieux PROVISOIRE (le client valide lui-même).
    const d = gateVideo({ local, review: null, attempt: 0 });
    const g = gateSave({ userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: `video2:${docKey}` }, d);
    const saved = await saveRendered(projectId, p.userId, docKey, cur.doc, ex, { ...g.meta, videoV2Render: { version: cur.version.version } });
    saveVideoVersion(projectId, docKey, cur.doc, { note: `rendu de la version ${cur.version.version}`, renderedAssetId: saved.videoId });
    return { videoAssetId: saved.videoId, verdict: d.verdict, issues: local.issues };
  } finally {
    fs.rmSync(ex.dir, { recursive: true, force: true });
  }
}
