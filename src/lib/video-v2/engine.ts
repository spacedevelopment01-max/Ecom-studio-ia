import { withStrategyScope, strategyReuseKey } from "../strategy-consumption";
import { assertJobEntitlements } from "../job-entitlements";
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
import { organicVideo, videoContext, editorialVideoIssues } from "./editorial";
import { projectForSubject } from "../social-v2/ai-post";
import { resolveSubject } from "../creative-subject";
import { videoScope,type VideoApproval } from "./approval";
import { videoReceipt } from "./receipts";
import { measuredCues } from "./voice";
import { projectRights } from "../plan-gates";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { JobContext } from "../jobs";
import { JobCancelled, JobPaused } from "../jobs";
import { aiActiveFor } from "../ai/access";
import { all, one } from "../db";
import { CostCapReached, currentTrace, withCandidate, withTrace } from "../ai/trace";
import { gateSave } from "../quality/store";
import { POLICIES } from "../quality/policies";
import { assetData, getAsset, saveAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { applyWordingDeep, loadWordingRules } from "../client-wording";
import { contentLang } from "../i18n-server";
import { EUR } from "../billing";
import { budgetPctText } from "../ai/budget-pct";
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
import { cuesForVoice, defaultSubtitleStyle, endCardDoc, interfaceDoc, kineticDoc, overlayText, packshotDoc, safeZone, SIZES, timeline, VIDEO_DOC_VERSION, voiceClip, inkOn, enlargeSmallTitles, type Palette } from "./doc";
import { gateShot, gateVideo, localVideoChecks } from "./quality";
import { NO_PEOPLE_EN } from "../people-policy";
import { engineVideoKey, keyFrames, rememberShot, renderVideoFile, saveRendered, saveVideoVersion, shotKey, shotMemo, videoUserOwned } from "./store";
import { honestLine, personaPrompt, personaSheet, ugcScriptIssues, type PersonaSheet } from "./ugc";
import { realVideoDeps, type VideoV2Deps } from "./deps";
import type { Clip, CreativeStrategy, ShotOutcome, ShotPlan, VideoDocument, VideoReview, VideoRunResult, VideoScript } from "./types";
import type { GateDecision } from "../quality/gate";
import { execTool } from "../exec-tool";
import { dressPromo } from "./promo";
import { artDirection } from "../art-direction";
import { adArt } from "../ads-v2/art";
import { songGrid, songStyleFor } from "../media/song";
import sharp from "sharp";

/** Durée maximale d'une vidéo IA « courte » (forfait Développer). */
export const SHORT_VIDEO_MAX_S = 30;

const exec = execTool;
export const VIDEO_V2_VERSION = "7a.1";
export const DEFAULT_VIDEO_CAP_EUR = 6;

export type VideoRequestV2 = {
  approval?:VideoApproval<VideoScript>;
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
  return withStrategyScope(projectId, () => runVideoEngineV2InScope(ctx, projectId, req, injected));
}

async function runVideoEngineV2InScope(ctx: JobContext | null, projectId: string, req: VideoRequestV2, injected?: VideoV2Deps): Promise<VideoRunResult> {
  assertJobEntitlements("video.v2",projectId,{request:req});
  if(req.ask.generation&&!req.planOnly&&(!req.approval||!req.approveGeneration))throw new Error("Accord explicite sur le scénario et les clips IA requis ; aucun montage simplifié substitué.");
  const p = loadProject(projectId);
  const jobId = ctx?.job.id ?? null;
  const selected = resolveSubject(p, req.ask.subject ?? null);
  const focused = projectForSubject(p, selected);
  const deps = injected ?? realVideoDeps(ctx, p, aiActiveFor(p.userId, p.id));
  const before = jobId ? (all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jobId)[0]?.c ?? 0) : 0;
  const capMicro = Math.round((req.maxCostEur ?? DEFAULT_VIDEO_CAP_EUR) * EUR);
  const cur = currentTrace();
  const own = capMicro;
  return withTrace({ ...(jobId ? { jobId } : {}), projectId, ...(cur.intent ? {} : { intent: "CREATE_VIDEO" }), costCapMicro: cur.costCapMicro != null ? Math.min(cur.costCapMicro, own) : own }, () => engine(ctx, focused, req, deps, { capMicro, spentMicro: before }));
}

async function engine(ctx: JobContext | null, p: Project, req: VideoRequestV2, deps: VideoV2Deps, budget: Budget): Promise<VideoRunResult> {
  const lang = contentLang();
  const jobId = ctx?.job.id ?? null;
  const runId = crypto.randomUUID();
  const notes: string[] = [];
  const stats = { generated: 0, reused: 0, retries: 0, localShots: 0, skippedForBudget: 0, reviews: 0 };

  if(req.approval && videoScope(loadProject(p.id),{ask:req.ask,offer:req.offer??null})!==req.approval.scope) throw new Error("Contexte modifié depuis l’accord vidéo : poursuite bloquée.");
  // 1-2. Intention et stratégie (gratuites).
  const intent0 = videoIntent(p, req.ask);
  // Forfait du projet (revérifié dans le worker) : Créer = montage sans plans filmés par l'IA ; Développer = vidéos
  // courtes (au plus SHORT_VIDEO_MAX_S) ; Dominer = vidéos avancées.
  const rights = projectRights(p.id);
  const intent = rights?.videos === "short" && intent0.durationS > SHORT_VIDEO_MAX_S ? { ...intent0, durationS: SHORT_VIDEO_MAX_S, reasons: [...intent0.reasons, `durée ramenée à ${SHORT_VIDEO_MAX_S} s (vidéos courtes du forfait ${rights.name.fr})`] } : intent0;
  if (rights?.videos === "none" && req.approveGeneration) req = { ...req, approveGeneration: false };
  const insight = adInsight(p, { audience: intent.audience, offer: req.offer });
  const strategy = videoStrategy(p, intent, { offer: req.offer, insight });
  notes.push(...strategy.gaps.map((g) => `à compléter : ${g}`));

  // 3. Script : local d'abord, IA ensuite (contrôlée, une reprise ciblée au plus).
  // Plan seul (estimation affichée avant accord) : script local, aucun appel d'IA.
  const script = req.approval?.scenario ?? await writeScript(p, deps, insight, strategy, intent, jobId, notes, !req.planOnly);
  if (intent.editorial && script.issues.length) throw new Error(`Contenu vidéo à adapter avant les médias : ${script.issues.join(" ; ")}`);
  const ugc = intent.kind === "ugc";
  const persona: PersonaSheet | null = ugc ? personaSheet(p.id, insight) : null;

  // 4-5. Storyboard et procédé de chaque plan.
  const inv = deps.inventory();
  const storyboard = buildStoryboard(insight, strategy, intent, script, inv);
  const sbIssues = storyboardIssues(storyboard, strategy.durationS);
  if (sbIssues.length) notes.push(...sbIssues.map((x) => `storyboard : ${x}`));
  const canGenerate = req.ask.allowGeneration !== false && deps.generationAllowed && deps.canReview;
  if(intent.generation&&!canGenerate)throw new Error("Les clips IA demandés ne sont pas disponibles ou contrôlables ; aucun stock ni montage local substitué.");
  if (req.ask.allowGeneration !== false && !deps.canReview && deps.generationAllowed) notes.push("contrôle de vision indisponible : aucun plan généré (il ne pourrait pas être validé)");
  const planning = planShots(storyboard, {
    intent,
    strategy,
    inv,
    allowGeneration: canGenerate,
    provider: (need) => chooseProvider(need, { available: deps.available, preferred: deps.preferredFor ? deps.preferredFor(!!need.people) : deps.preferred, estimate: deps.estimate ?? estimateMicro }),
    budgetMicro: budget.capMicro,
  });
  notes.push(...planning.notes);
  stats.skippedForBudget += planning.skippedForBudget;
  const result: VideoRunResult = { runId, docKey: null, intent, strategy, script, shots: planning.shots, outcomes: [], verdict: "PROVISIONAL", codes: [], reason: "", issues: [], videoAssetId: null, stats, costMicro: 0, estimateMicro: planning.estimateMicro, stoppedByCostCap: false, notes };
  if (req.planOnly) return result;

  // Accord du client : sans accord explicite, les plans payants deviennent des plans locaux (rien n'est dépensé).
  let shots = planning.shots;
  if (planning.estimateMicro > 0 && !req.approveGeneration) {
    if(intent.generation)throw new Error("Accord clips IA manquant ; aucun remplacement local.");
    notes.push(`génération non approuvée (coût probable ${budgetPctText(p.userId, planning.estimateMicro, p.id)}) : vidéo montée sans plan généré`);
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
    // Plans libres déjà pris dans cette vidéo (jamais deux fois le même) et rotation des recherches.
    const stockTaken = new Set<string>();
    const stockIndex = { n: 0 };
    // Rythme d'une publicité : un plan réel de plus de 3,2 s est coupé en deux plans différents (jamais une image
    // qui s'éternise) — seulement sans voix enregistrée sur ce plan et sans génération.
    if (intent.kind !== "ugc" && deps.stockClip) {
      shots = splitLongShots(shots, !!deps.voice);
      result.shots = shots;
    }
    for (const s of shots) {
      const out = await resolveShot({ p, ctx, deps, s, inv, strategy, intent, budget, stats, persona, characterRef, notes, pal, typo, size, safe, insight, stockTaken, stockIndex });
      media.set(s.id, out.media);
      result.outcomes.push(out.outcome);
      if (out.characterRef && !characterRef) characterRef = out.characterRef;
    }

    // 7. Document vidéo (timeline éditable), habillé façon publicité quand des plans réels existent.
    const thumbs = intent.kind === "ugc" ? [] : await promoThumbs(p, media, inv);
    const icons = intent.kind === "ugc" ? [] : await promoIcons(p, pal);
    // Vocabulaire du client (ex. « montre », jamais « chronographe ») : textes à l'écran et voix, avant l'enregistrement.
    let doc = applyWordingDeep(assemble({ p, intent, strategy, shots, media, inv, pal, typo, size, safe, insight, runId, thumbs, icons }), loadWordingRules(p.id));
    doc.meta.editorial=videoContext(p,intent.purpose==="organic" || intent.kind === "social_content"?"post":"ad",req.ask.text,req.ask.subject,req.ask.editorial);
    // Voix off : seulement si un fournisseur de synthèse vocale existe (sinon la voix reste à enregistrer).
    if (deps.voice) await recordVoices(p, deps, doc, jobId, notes);
    else if (doc.audio.voice.length) notes.push("voix off : aucun fournisseur de synthèse vocale configuré — texte prêt à enregistrer, porté par les sous-titres");
    // Musique : une vraie piste libre de droits (licence commerciale enregistrée) avant la musique composée.
    if (doc.audio.music?.source === "synth" && doc.audio.music.mood !== "none" && deps.music) {
      const mood = doc.audio.music.mood === "pulse" ? "pulse" : doc.audio.music.mood === "warm" ? "warm" : "calm";
      const track = await deps.music(mood, timeline(doc).total, doc.audio.music.style).catch((e) => {
        if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        return null;
      });
      if (track) {
        doc.audio.music = { source: "library", assetId: track.assetId, licence: track.licence, gainDb: -12, ...(track.startS ? { startS: track.startS } : {}) };
        notes.push(`musique libre de droits — ${track.credit}`);
      } else notes.push(`musique : morceau composé par le studio (style ${doc.audio.music.style ?? doc.audio.music.mood}, vrais instruments)`);
    }
    // Habillage publicitaire sans voix enregistrée : les titres portent le message, pas de sous-titres en double.
    if (doc.meta.promo && !doc.audio.voice.some((v) => v.assetId)) doc.subtitles.style.enabled = false;

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
      const beforeEncode=(await import("./store")).latestVideo(p.id,docKey)?.version.id??null;
      let ex:Awaited<ReturnType<typeof renderVideoFile>>;
      try {ex = await renderVideoFile(p.id, doc, { scale: req.renderScale, fps: req.fps, onProgress: (x) => ctx?.progress(0.7 + x * 0.2, `Rendu ${Math.round(x * 100)} %`) });}
      catch(error) {
        const changed=((await import("./store")).latestVideo(p.id,docKey)?.version.id??null)!==beforeEncode || !!(req.approval&&videoScope(loadProject(p.id),{ask:req.ask,offer:req.offer??null})!==req.approval.scope);
        const target=changed?`${docKey}:conflict:${crypto.randomUUID().slice(0,8)}`:docKey;
        saveVideoVersion(p.id,target,doc,{note:"Document conservé après interruption du rendu"});
        throw error;
      }
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
        decision = gateVideo({ local, review, reviewError, shotCodes, attempt, peopleAllowed: intent.people !== false });
        if(!decision.fatal && !local.codes.length && !shotCodes.length && review?.unchecked?.length) decision={...decision,verdict:"PROVISIONAL",action:"none",checked:false,provisional:{use:"manual",label:"needs_improvement"},reason:`Vérification humaine requise : ${review.unchecked.join(", ")}`};
        result.issues = [...local.issues, ...(review?.issues ?? [])];
        const g = gateSave({ userId: p.userId, projectId: p.id, jobId, candidateId: `video2:${docKey}` }, decision);
        const conflict=((await import("./store")).latestVideo(p.id,docKey)?.version.id??null)!==beforeEncode || !!(req.approval && videoScope(loadProject(p.id),{ask:req.ask,offer:req.offer??null})!==req.approval.scope);
        if(conflict) {
          const conflictKey=`${docKey}:conflict:${crypto.randomUUID().slice(0,8)}`;
          const preserved=await saveRendered(p.id,p.userId,conflictKey,doc,ex,{editConflict:true,gate:{verdict:"PROVISIONAL",checked:false,fatal:false,provisional:{use:"manual",label:"needs_improvement"}}});
          saveVideoVersion(p.id,conflictKey,doc,{note:"Rendu isolé après modification concurrente",renderedAssetId:preserved.videoId});
          throw new Error("Modification pendant le rendu : version client conservée et rendu isolé.");
        }
        if(req.approval) doc.meta.retakeBudgetMicro=Math.max(0,req.approval.capMicro-(jobId?all<{c:number}>("SELECT COALESCE(SUM(cost),0) c FROM ai_calls WHERE job_id=?",jobId)[0]?.c??0:budget.spentMicro));
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
  if (intent.editorial || !allowAi || !deps.canWrite || intent.complexity === "simple") return ugcFix(local);
  const material = { proofs: st.proofs, facts: i.facts, claimsToAvoid: i.claimsToAvoid,ctaRequired:intent.purpose!=="organic",names:[i.brand,i.offerName] };
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
  /** Plans libres déjà pris dans cette vidéo et rang du prochain (rotation des recherches). */
  stockTaken?: Set<string>;
  stockIndex?: { n: number };
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

export async function clipFrames(buf: Buffer): Promise<Buffer[]> {return (await inspectClip(buf)).frames;}
async function inspectClip(buf:Buffer):Promise<{frames:Buffer[];durationS:number|null}> {
  const dir = tmpDir("video2-frames");
  try {
    const f = path.join(dir, "in.mp4");
    fs.writeFileSync(f, buf);
    const durationS=await probeDuration(f),d=durationS??4;
    const out: Buffer[] = [];
    for (const [k, t] of [d * 0.08, d * 0.5, d * 0.92].entries()) {
      const img = path.join(dir, `f${k}.jpg`);
      await exec("ffmpeg", ["-y", "-v", "error", "-ss", String(t), "-i", f, "-frames:v", "1", "-q:v", "3", img]).catch(() => null);
      if (fs.existsSync(img)) out.push(fs.readFileSync(img));
    }
    return {frames:out,durationS};
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Consigne de tournage d'un plan : sujet, action, cadrage, mouvement, lumière ; produit à garder identique. */
function shotPrompt(s: ShotPlan, st: CreativeStrategy, persona: PersonaSheet | null, feedback?: string, people = true): string {
  const cam: Record<string, string> = { static: "locked-off camera", push_in: "slow push-in", pull_out: "slow pull-out", pan_left: "slow pan left", pan_right: "slow pan right", tilt_up: "gentle tilt up", orbit: "slow orbit around the subject", handheld: "subtle handheld movement" };
  return [
    `${s.subject} — ${s.action}. Setting: ${s.environment}. Framing: ${s.framing.replace("_", " ")}; camera: ${cam[s.camera] ?? s.camera}; light: ${s.lighting}.`,
    `Visual language: ${st.style.camera}; ${st.style.light}. Motion starts on the first frame.`,
    s.showsProduct ? "The product must remain exactly identical to the start frame (shape, colors, proportions, logo, packaging, printed text); never redraw or invent it." : "",
    // Règle de présence humaine : sans autorisation, aucune personne, même déjà présente dans l'image de départ.
    !people ? NO_PEOPLE_EN : persona && s.character ? personaPrompt(persona) : "No people in frame unless already present in the start frame.",
    "No text overlay, no captions, no watermark.",
    feedback ? `Fix from the previous take: ${feedback}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Moments d'une vidéo illustrés par un plan vidéo libre de droits. Services : accroche, développement, démonstration
 * (le métier en action). Boutique : accroche et développement (l'univers du produit) ; la démonstration et la
 * conclusion montrent le VRAI produit (photos, packshot) — jamais un produit d'une banque d'images à sa place.
 */
function stockFor(p: Project, s: ShotPlan): boolean {
  // Chaque moment reçoit une vraie image animée en fond (preuve, conclusion et fin comprises : le texte et la carte
  // de fin se posent dessus) ; seuls les plans qui montrent le produit gardent ses vraies photos.
  if (p.business === "services") return true;
  return !s.showsProduct;
}

async function resolveShot(o: ResolveInput): Promise<{ media: Media; outcome: ShotOutcome; characterRef?: { assetId: string; data: Buffer } | null }> {
  const { p, deps, s, stats } = o;
  const base: ShotOutcome = { shotId: s.id, method: s.method, verdict: "FINAL", assetId: null, attempts: 0, reused: false, costMicro: 0, reason: s.why, codes: [] };
  // Image Engine V2 pour un plan sans visuel (recherche d'abord, génération selon ses propres règles et plafond).
  if (s.source.kind === "image_v2" && p.business !== "services") {
    const img = await o.deps.image({ kind: o.p.business === "services" ? "trade_photo" : "ambiance", support: "video", aspect: o.intent.aspect === "16:9" ? "16:9" : o.intent.aspect === "1:1" ? "1:1" : "9:16", topic: s.subject, allowGenerate: o.intent.complexity !== "simple", name: `video-${s.part}`, maxControls: 2 });
    stats.localShots++;
    if (img) return { media: { kind: "image", assetId: img.assetId }, outcome: { ...base, assetId: img.assetId, reason: "image de l'Image Engine V2" } };
    o.notes.push(`${s.id} : aucune image retenue par l'Image Engine V2 — typographie animée`);
    return { media: { kind: "doc", assetId: null }, outcome: { ...base, method: "kinetic_type", reason: "aucune image : typographie animée" } };
  }
  // Plan libre de droits (Pixabay d'abord) : chaque moment de la vidéo qui ne montre pas le produit et n'a pas de
  // vidéo du client reçoit SON plan vidéo réel, cherché pour lui (métier, prestation, univers du produit) — gratuit.
  // Les plans du produit (photos réelles, packshot), la preuve, la conclusion et l'appel à l'action restent composés.
  if (deps.stockClip && ((p.business === "services"&&!o.intent.generation) || s.source.kind !== "generate") && s.method !== "existing_video" && stockFor(o.p, s)) {
    const clip = await deps
      .stockClip({ topic: s.subject, part: s.part, aspect: o.intent.aspect === "16:9" ? "16:9" : o.intent.aspect === "1:1" ? "1:1" : o.intent.aspect === "4:5" ? "4:5" : "9:16", durationS: s.durationS, index: o.stockIndex ? o.stockIndex.n++ : 0, key: `${o.ctx?.job.id ?? "video"}:${s.id}` }, o.stockTaken ?? new Set())
      .catch((e) => {
        if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        return null;
      });
    if (clip) {
      if(clip.durationS < s.durationS || o.stockTaken?.has(clip.assetId)) throw new Error(`Scène ${s.id} trop courte ou répétée : montage incomplet`);
      o.stockTaken?.add(clip.assetId);
      stats.localShots++;
      return { media: { kind: "video", assetId: clip.assetId, durationS: clip.durationS }, outcome: { ...base, method: "existing_video", assetId: clip.assetId, reason: "plan vidéo libre de droits (Pixabay ou Pexels) choisi pour ce moment" } };
    }
  }
  if(p.business === "services" && !o.intent.generation && s.method !== "existing_video") throw new Error(`Scène ${s.id} : aucun plan pertinent trouvé pour cette prestation. Vidéo incomplète ; acquis conservés.`);
  if (s.source.kind !== "generate") {
    stats.localShots++;
    const m = localMedia(s);
    if(m.kind==="video")m.durationS=o.inv.videos.find(v=>v.id===m.assetId)?.durationS;
    return { media: m, outcome: { ...base, assetId: m.assetId, reason: s.why } };
  }

  // Plan généré : image de départ réelle (référence) ; personnage : même image de départ pour toute la vidéo.
  const provider = s.source.provider!;
  const model = s.source.model!;
  const startId = o.intent.generation==="direct"?null:s.character && o.characterRef ? o.characterRef.assetId : s.source.assetId ?? s.reference.assetId;
  let start = startId ? deps.data(startId) : null;
  let startAsset = startId;
  if (!start && !o.intent.generation) {
    const img = await deps.image({ kind: s.character ? "lifestyle" : o.p.business === "services" ? "trade_photo" : "usage_scene", support: "video", aspect: o.intent.aspect === "16:9" ? "16:9" : "9:16", topic: s.subject, allowGenerate: true, name: `video-depart-${s.id}`, maxControls: 2 });
    if (img) {
      start = img.data;
      startAsset = img.assetId;
    }
  }
  if (!start && o.intent.generation!=="direct") throw new Error(`Scène ${s.id} : référence nécessaire pour un vrai clip, aucun substitut local.`);

  const productRef = s.showsProduct && o.inv.cutout ? deps.data(o.inv.cutout.id) : null;
  const key = shotKey({ marketingStrategy: strategyReuseKey(p.id), v: 1, p: p.id, provider, model, subject: s.subject, action: s.action, camera: s.camera, framing: s.framing, d: s.durationS, start: startAsset, persona: o.persona?.id ?? null, fb: o.feedback ?? null });
  const memo = shotMemo(p.id, key);
  if (memo?.verdict === "FINAL" && memo.assetId) {
    stats.reused++;
    return { media: { kind: "video", assetId: memo.assetId, generated: true,durationS:Number(JSON.parse(getAsset(memo.assetId)?.meta??"{}").durationS)||undefined }, outcome: { ...base, verdict: "FINAL", assetId: memo.assetId, reused: true, reason: "plan déjà accepté : réutilisé (aucun coût)" }, characterRef: s.character && startAsset && start ? { assetId: startAsset, data: start } : null };
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
      o.notes.push(`${s.id} : génération arrêtée avant envoi (plafond de ${budgetPctText(p.userId, o.budget.capMicro, p.id)} atteint) — plan local`);
      break;
    }
    o.ctx?.progress(0.3, `Tournage du plan ${s.id}`);
    const buf = await videoReceipt(p.id,`${o.ctx?.job.id??"video2"}:video2:${key}:${attempt}`,()=>withCandidate(`video2:${s.id}`, attempt, () => deps.generateClip({ provider, model, image: start!, prompt: shotPrompt(s, o.strategy, o.persona, feedback, o.intent.people !== false), aspect: o.intent.aspect === "16:9" ? "16:9" : "9:16", seconds, people: s.character }, `${o.ctx?.job.id ?? "video2"}:video2:shot:${key}:${attempt}`)));
    o.budget.spentMicro += est;
    spent += est;
    stats.generated++;
    const inspected=await inspectClip(buf),frames=inspected.frames;
    let review = null;
    let error: string | null = null;
    try {
      review = await withCandidate(`video2:${s.id}`, attempt, () => deps.reviewShot(frames, { product: productRef, character: s.character ? (o.characterRef?.data ?? null) : null }, `Plan ${s.id} (${s.part}) : ${s.subject} — ${s.action}. Objectif : ${s.purpose}.`, `${o.ctx?.job.id ?? "video2"}:video2:shotqc:${key}:${attempt}`));
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      error = (e as Error).message;
    }
    if (!frames.length) error = "plan illisible (aucune image extraite)";
    if(!inspected.durationS || inspected.durationS+.12<s.durationS)error="Plan reçu plus court que la scène demandée : aucun arrêt sur image ajouté.";
    const d = gateShot({ review, error, expectsProduct: s.showsProduct, expectsCharacter: s.character && !!o.characterRef, attempt, peopleAllowed: o.intent.people !== false });
    const g = gateSave({ userId: p.userId, projectId: p.id, jobId: o.ctx?.job.id ?? null, candidateId: `video2:${s.id}` }, d);
    const asset = await saveAsset({ projectId: p.id, userId: p.userId, data: buf, name: `plan-${s.id}-${s.part}${attempt ? `-essai-${attempt + 1}` : ""}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: startAsset ?? null, status: d.verdict === "FINAL" ? "review" : "rejected", meta: {durationS:inspected.durationS, videoV2Shot: { key, shotId: s.id, provider, model, attempt, verdict: d.verdict }, ...g.meta } });
    last = { verdict: d.verdict, codes: [...d.fatalCodes, ...d.blockingCodes], reason: [d.reason, d.feedback].filter(Boolean).join(" — "), assetId: asset.id };
    if (d.verdict === "FINAL") break;
    if (d.verdict !== "RETRY" || d.action !== "regenerate") break;
    stats.retries++;
    feedback = d.feedback || review?.issues.join("; ");
  }
  rememberShot(p.id, key, { assetId: last.verdict === "FINAL" ? last.assetId : null, method: s.method, verdict: last.verdict, provider, model, costMicro: spent, attempts: maxAttempts, reason: last.reason });
  if (last.verdict === "FINAL" && last.assetId) return { media: { kind: "video", assetId: last.assetId, generated: true,durationS:Number(JSON.parse(getAsset(last.assetId)?.meta??"{}").durationS)||undefined }, outcome: { ...base, verdict: "FINAL", assetId: last.assetId, attempts: maxAttempts, costMicro: spent, reason: "plan généré accepté au contrôle", codes: [] }, characterRef: s.character && startAsset && start ? { assetId: startAsset, data: start } : null };
  throw new Error(`Scène ${s.id} non obtenue ou refusée : ${last.reason || last.codes.join(", ")}. Versions conservées, aucun plan simplifié substitué.`);
}

// ------------------------------------------------------------------------------------------- assemblage

type AssembleInput = {
  p: Project;
  /** Vignettes de l'habillage publicitaire (images extraites des plans réels, photos du projet). */
  thumbs?: string[];
  /** Pictogrammes du panneau des prestations (un par élément). */
  icons?: string[];
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
  // Compositions (calques de l'éditeur publicitaire). Le sujet du plan est une consigne de recherche interne
  // (« le lieu de travail…, sans personne ») : il n'est jamais écrit à l'écran ; à défaut de texte, la marque.
  if (s.part === "cta") return { ...base, source: { kind: "doc", doc: endCardDoc({ ...common, cta: a.strategy.cta, line: a.strategy.message.slice(0, 70), logoId: a.inv.logo?.id ?? null }), animate: "rise" } };
  if (s.method === "packshot" && a.inv.cutout) return { ...base, source: { kind: "doc", doc: packshotDoc({ ...common, cutoutId: a.inv.cutout.id, title: s.onScreen || undefined }), animate: "rise" } };
  if (s.method === "ui_animation") return { ...base, source: { kind: "doc", doc: interfaceDoc({ ...common, text: s.onScreen || s0.onScreen || a.insight.brand }), animate: "rise" } };
  return { ...base, source: { kind: "doc", doc: kineticDoc({ ...common, text: s.onScreen || s0.onScreen || a.insight.brand, dark: s.part === "proof" }), animate: "fade" } };
}

/**
 * Vignettes de l'habillage : une image nette extraite de chaque plan réel (au tiers du plan), puis les photos du
 * projet. Gardées dans la bibliothèque du projet (le rendu ne lit jamais de fichier extérieur).
 */
async function promoThumbs(p: Project, media: Map<string, Media>, inv: Inventory): Promise<string[]> {
  const out: string[] = [];
  const dir = tmpDir("vignettes");
  try {
    for (const m of media.values()) {
      if (m.kind !== "video" || !m.assetId || out.length >= 6) continue;
      const a = getAsset(m.assetId);
      if (!a) continue;
      const src = path.join(dir, `${m.assetId}.mp4`);
      const jpg = path.join(dir, `${m.assetId}.jpg`);
      fs.writeFileSync(src, assetData(a));
      try {
        await execTool("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.max(0.3, (m.durationS ?? 3) * 0.35)), "-i", src, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "3", jpg]);
        const img = await saveAsset({ projectId: p.id, userId: p.userId, data: fs.readFileSync(jpg), name: "vignette-video.jpg", mime: "image/jpeg", role: "video-frame", folderKey: "videos.ads", origin: "import", meta: { videoThumbOf: m.assetId } });
        out.push(img.id);
      } catch {
        // Image non extraite : la vignette suivante prend sa place.
      }
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // Boutique : les vraies photos du produit d'abord (le produit se voit dès l'ouverture).
  const photos = inv.photos.map((x) => x.id).filter((x) => !out.includes(x));
  return p.business === "services" ? [...out, ...photos] : [...photos, ...out];
}

/**
 * Pictogrammes du panneau des prestations (bibliothèque libre Tabler, licence MIT) : un symbole par prestation
 * (rouleau, truelle…) ou par point fort du produit, dans la couleur lisible sur sa pastille. Tous ou aucun (sinon
 * les pastilles gardent leurs numéros).
 */
async function promoIcons(p: Project, pal: Palette): Promise<string[]> {
  const { productPoints, accentOf } = await import("./promo");
  const items = p.business === "services" ? (p.services?.services ?? []).map((s) => s.name.trim()).filter(Boolean).slice(0, 3) : productPoints(p);
  if (items.length < 3) return [];
  try {
    const { iconSvg, searchIcons, tradeKeywords } = await import("../media/icon-library");
    const acc = accentOf(pal);
    // Pastille blanche sur un accent foncé (pictogramme couleur d'accent), pastille sombre sinon (pictogramme blanc).
    const color = inkOn(acc) === "#FFFFFF" ? acc : "#FFFFFF";
    const used = new Set<string>();
    const out: string[] = [];
    for (const it of items) {
      // Le mot-clé de la prestation elle-même d'abord (« Plâtrerie » → truelle, « Peinture » → rouleau), dans
      // l'ordre, puis la recherche large ; jamais deux fois le même pictogramme.
      const own = tradeKeywords(it);
      const words = [...own, ...tradeKeywords(`${p.product.category ?? ""} ${it}`), "sparkles", "circle-check", "star"];
      const name = [...words.filter((w) => iconSvg(w)), ...searchIcons(words, 8)].find((n) => !used.has(n));
      const svg = name ? iconSvg(name) : null;
      if (!name || !svg) return [];
      used.add(name);
      const png = await sharp(Buffer.from(svg.replace(/currentColor/g, color).replace("<svg ", '<svg width="192" height="192" '))).png().toBuffer();
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: png, name: `picto-${name}.png`, mime: "image/png", role: "icon", folderKey: "videos.ads", origin: "generated", meta: { icon: { name, library: "tabler (MIT)" } } });
      out.push(a.id);
    }
    return out;
  } catch {
    return [];
  }
}

/** Coupe en deux les plans longs montés sur des images réelles (voir l'appel). */
export function splitLongShots(shots: ShotPlan[], voiced: boolean): ShotPlan[] {
  return shots.flatMap((s) => {
    const splittable = s.durationS >= 3.2 && s.source.kind !== "generate" && s.method !== "packshot" && s.part !== "cta" && !(voiced && s.voice.trim());
    if (!splittable) return [s];
    const a = Math.round((s.durationS / 2) * 100) / 100;
    return [{ ...s, durationS: a }, { ...s, id: `${s.id}b`, durationS: Math.round((s.durationS - a) * 100) / 100, onScreen: "", voice: "", transition: "cut" as const }];
  });
}

/**
 * Montage calé sur la musique : chaque coupe tombe sur un temps du morceau composé (durée totale inchangée, chaque
 * plan garde au moins deux temps). Un plan vidéo lit la durée de son nouveau plan.
 */
export function snapToBeat(clips: Clip[], beatS: number): Clip[] {
  if (!(beatS > 0.2) || clips.length < 2) return clips;
  const total = clips.reduce((t, c) => t + c.durationS, 0);
  let acc = 0;
  let prev = 0;
  const cuts: number[] = [];
  for (const c of clips.slice(0, -1)) {
    acc += c.durationS;
    const snapped = Math.max(prev + 2 * beatS, Math.round(acc / beatS) * beatS);
    cuts.push(Math.min(snapped, total - 2 * beatS * (clips.length - 1 - cuts.length)));
    prev = cuts[cuts.length - 1];
  }
  const bounds = [0, ...cuts, total];
  // A musical cut never extends an approved filmed passage past its source window.
  if(clips.some((c,k)=>c.source.kind==="video"&&bounds[k+1]-bounds[k]>Math.min(c.durationS,c.source.outS-c.source.inS)+.001))return clips.map(c=>structuredClone(c));
  return clips.map((c, k) => {
    const d = Math.round((bounds[k + 1] - bounds[k]) * 1000) / 1000;
    const source = c.source.kind === "video" ? { ...c.source, outS: c.source.inS + d } : c.source;
    return { ...c, durationS: d, source };
  });
}

function assemble(a: AssembleInput): VideoDocument {
  const { w, h } = a.size;
  let clips = a.shots.map((s, k) => clipFor(s, a.media.get(s.id) ?? { kind: "doc", assetId: null }, a, k));
  // Durée tenue : le temps perdu par un plan vidéo plus court revient au plan suivant composé.
  const lost = a.shots.reduce((t, s, k) => t + (s.durationS - clips[k].durationS), 0);
  if (lost > 0.05) {
    const target = [...clips].reverse().find((c) => c.source.kind !== "video");
    if (target) target.durationS = Math.round((target.durationS + lost) * 100) / 100;
  }
  const promo = !organicVideo(a.intent.editorial) && a.intent.purpose!=="organic" && a.intent.kind !== "ugc" && clips.some((c) => c.source.kind === "video");
  if (promo && a.strategy.style.music !== "none") clips = snapToBeat(clips, songGrid(songStyleFor(a.p), clips.reduce((t, c) => t + c.durationS, 0)).beatS);
  // Direction artistique de la marque : la même ligne que les publications (typographie, élément graphique, rythme, lumière).
  const look = artDirection(adArt(a.p, a.typo)).video;
  if (promo) clips = dressPromo(clips, a.shots, { p: a.p, pal: a.pal, typo: a.typo, w, h, safe: a.safe, brand: a.insight.brand, logoId: a.inv.logo?.id ?? null, thumbs: a.thumbs ?? [], productPhotos: a.p.business === "services" ? [] : a.inv.photos.map((x) => x.id), icons: a.icons ?? [], cta: a.strategy.cta, message: a.strategy.message, look });
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
    audio: { voice: [], voiceId: null, music: a.strategy.style.music === "none" ? null : { source: "synth", mood: a.strategy.style.music, gainDb: -14, style: songStyleFor(a.p), seed: a.p.id }, sfx: [], duckingDb: -10, loudnessLufs: -14 },
    brand: { palette: { ...a.pal }, fonts: { heading: a.typo.heading, body: a.typo.body }, name: a.insight.brand },
    disclosure: null,
    grade: look.grade,
    meta: { editorial:videoContext(a.p, a.intent.editorial?.purpose === "organic" ? "post" : "ad", a.intent.goal, null, a.intent.editorial), intent: a.intent.kind, source: "engine", createdFrom: null, runId: a.runId, ...(promo ? { promo: true } : {}) },
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
  enlargeSmallTitles(doc);
  return doc;
}

async function recordVoices(p: Project, deps: VideoV2Deps, doc: VideoDocument, jobId: string | null, notes: string[]) {
  doc.audio.voiceId=deps.voiceId??doc.audio.voiceId;
  for (const v of doc.audio.voice) {
    try {
      const r = await deps.voice!(v.text, doc.audio.voiceId, `${jobId ?? "video2"}:video2:voice:${hash({ t: v.text, id: doc.audio.voiceId })}`);
      const a = await saveAsset({ projectId: p.id, userId: p.userId, data: r.data, name: `voix-${v.clipId}.${r.mime.includes("mpeg") ? "mp3" : "wav"}`, mime: r.mime, role: "voice", folderKey: "videos.ads", origin: "generated", meta: { videoV2Voice: { clipId: v.clipId } } });
      v.assetId = a.id;
      const file=path.join(tmpDir("voice-measure"),"voice");
      let actual:number|null=null;
      try {fs.writeFileSync(file,r.data);actual=await probeDuration(file);} finally {fs.rmSync(path.dirname(file),{recursive:true,force:true});}
      const clip=doc.clips.find(c=>c.id===v.clipId)!;
      if(!actual || actual>clip.durationS-v.offsetS-.1) throw new Error(`Phrase du plan ${v.clipId} trop longue ou illisible ; adaptez sa durée, aucun texte supprimé.`);
      v.durationS=actual;
      doc.subtitles.cues=doc.subtitles.cues.filter(c=>c.clipId!==v.clipId);
      doc.subtitles.cues.push(...measuredCues(v.clipId,v.text,actual,doc.subtitles.style.maxChars,v.offsetS));
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof CostCapReached) throw e;
      throw new Error(`Voix du plan ${v.clipId} incomplète : ${(e as Error).message}. Version et texte conservés.`);
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
    // Textes posés sur les plans trop petits : agrandis au minimum lisible (gratuit).
    const grown = enlargeSmallTitles(doc);
    if (grown) o.notes.push(`reprise ciblée : ${grown} texte(s) agrandi(s) (gratuit)`);
    doc.subtitles.style = { ...doc.subtitles.style, size: Math.round(Math.max(doc.subtitles.style.size, Math.min(doc.width, doc.height) * 0.05)), maxChars: Math.max(18, doc.subtitles.style.maxChars - 4), offsetY: 0 };
    // Débit : chaque carton est re-découpé sur la voix du plan.
    const voices = new Map(doc.audio.voice.map((v) => [v.clipId, v]));
    doc.subtitles.cues = doc.clips.flatMap((c) => (voices.get(c.id) ? measuredCues(c.id, voices.get(c.id)!.text, voices.get(c.id)!.durationS, doc.subtitles.style.maxChars, voices.get(c.id)!.offsetS) : doc.subtitles.cues.filter((q) => q.clipId === c.id)));
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
    const prev = doc.clips[k];
    const next = clipFor(s, out.media, o, k);
    // Vidéo habillée : le plan refait garde son habillage (titre, panneau, carte de fin) et sa transition.
    const keep = doc.meta.promo && (next.source.kind === "video" || next.source.kind === "image") ? { overlays: prev.overlays, transitionIn: prev.transitionIn } : {};
    doc.clips[k] = { ...next, ...keep, id: prev.id };
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
  const deps = injected ?? realVideoDeps(ctx, p, aiActiveFor(p.userId, p.id));
  const cur = latestVideo(projectId, docKey);
  if (!cur) throw new Error("vidéo introuvable");
  const k = cur.doc.clips.findIndex((c) => c.id === clipId);
  if (k < 0) throw new Error("plan introuvable");
  if(o.approve && ((cur.doc.meta.retakeCount??0)>=1 || one("SELECT 1 FROM jobs WHERE project_id=? AND type='video.v2.clip' AND json_extract(payload,'$.docKey')=? AND id<>? LIMIT 1",projectId,docKey,ctx?.job.id??""))) throw new Error("Limite de reprise ciblée atteinte : version utilisable conservée ; nouveau scénario et devis requis.");
  const clip = cur.doc.clips[k];
  const oldClip=clip.source.kind === "video" ? getAsset(clip.source.assetId) : null;
  const originalStill=oldClip?.source_asset_id?getAsset(oldClip.source_asset_id):null;
  const referenceId=originalStill?.project_id === projectId && originalStill.kind === "image" ? originalStill.id : null;
  const intent = videoIntent(p, { kind: cur.doc.meta.intent as never, aspect: cur.doc.aspect, platform: cur.doc.platform, durationS: Math.round(cur.doc.clips.reduce((t, c) => t + c.durationS, 0)) });
  const insight = adInsight(p, {});
  const strategy = videoStrategy(p, intent, { insight });
  const inv = deps.inventory();
  const notes: string[] = [];
  const shot: ShotPlan = { id: clip.shotId, durationS: clip.durationS, part: clip.part ?? "development", subject: o.instruction?.trim() || clip.label, action: "plan de remplacement", environment: strategy.style.camera, framing: "medium", camera: "push_in", lighting: strategy.style.light, reference: { assetId: referenceId??inv.photos[0]?.id ?? null, note: "photo réelle" }, voice: "", onScreen: "", sound: "", transition: clip.transitionIn.kind, purpose: "remplacer la séquence", showsProduct: !!inv.cutout && p.business === "products", character: intent.kind === "ugc", method: "ai_video", source: { kind: "compose" }, why: "" };
  const choice = (p.business!=="services" || intent.kind==="ugc") && o.approve && deps.generationAllowed && deps.canReview ? chooseProvider({ imageToVideo: true, people: shot.character, nativeAudio: false, aspect: cur.doc.aspect, durationS: clip.durationS }, { available: deps.available, preferred: deps.preferredFor ? deps.preferredFor(!!shot.character) : deps.preferred, estimate: deps.estimate ?? estimateMicro }) : null;
  if (choice) shot.source = { kind: "generate", assetId: shot.reference.assetId, provider: choice.provider, model: choice.model, estimateMicro: choice.estimateMicro };
  else {
    if(o.approve && p.business!=="services") throw new Error("Aucun fournisseur compatible : ancien clip conservé, aucun remplacement local.");
    notes.push(o.approve ? "aucun fournisseur vidéo compatible et disponible : plan local" : "génération non approuvée : plan local");
    shot.method = shot.reference.assetId ? "animated_image" : "kinetic_type";
    shot.source = shot.reference.assetId ? { kind: "asset", assetId: shot.reference.assetId } : { kind: "compose" };
  }
  const budget = { capMicro: Math.min(cur.doc.meta.retakeBudgetMicro??Infinity,Math.round((o.maxCostEur ?? 2) * EUR)), spentMicro: 0 };
  const stats = { generated: 0, reused: 0, retries: 0, localShots: 0, skippedForBudget: 0, reviews: 0 };
  const pal = palette(p);
  const typo = brandTypo(p);
  const out = await withTrace({ projectId, intent: "CREATE_VIDEO", costCapMicro: budget.capMicro }, () =>
    resolveShot({ p, ctx, deps, s: shot, inv, strategy, intent, budget, stats, persona: intent.kind === "ugc" ? personaSheet(p.id, insight) : null, characterRef: null, notes, pal, typo, size: { w: cur.doc.width, h: cur.doc.height }, safe: cur.doc.safe, insight }),
  );
  const doc = structuredClone(cur.doc);
  doc.clips[k] = { ...clipFor(shot, out.media, { pal, typo, size: { w: doc.width, h: doc.height }, safe: doc.safe, insight, inv, strategy }, k), id: clip.id, overlays: clip.overlays, transitionIn: clip.transitionIn, durationS: clip.durationS };
  doc.meta = { ...doc.meta,retakeCount:(cur.doc.meta.retakeCount??0)+(o.approve?1:0), source: out.media.generated ? "ai" : "user" };
  saveVideoVersion(projectId, docKey, doc, { note: `plan ${clip.shotId} remplacé (${out.outcome.reason})` });
  return { doc, outcome: out.outcome, notes };
}

/** Rendu du document enregistré (après modifications du client) : local et gratuit, contrôles locaux, bibliothèque. */
/**
 * Vidéo en scènes (création guidée ou création du projet) : son étiquette (sujet, demande, publication ou publicité)
 * suit ses nouveaux rendus et ses copies (autre format), pour qu'elles restent rangées avec les vidéos du client.
 */
function scenesMetaOf(projectId: string, docKey: string, createdFrom: string | null, doc:VideoDocument): Record<string, unknown> | null {
  for (const key of [docKey, createdFrom]) {
    if (!key) continue;
    const r = one<{ m: string | null }>("SELECT json_extract(meta, '$.scenes') m FROM assets WHERE project_id = ? AND json_extract(meta, '$.videoV2.docKey') = ? AND json_extract(meta, '$.scenes') IS NOT NULL ORDER BY created_at DESC LIMIT 1", projectId, key);
    if (r?.m) return JSON.parse(r.m);
  }
  // Interrupted first encode: no prior rendered asset exists, but the complete guided document survives.
  const e=doc.meta.editorial;
  if(doc.meta.ending?.kind==="last_clip" && e) {
    const raw=e.subject as {kind?:unknown;key?:unknown;name?:unknown}|null;
    const selected=raw?.kind==="product"&&typeof raw.key==="string"?{kind:"product" as const,key:raw.key}:raw?.kind==="service"&&typeof raw.name==="string"?{kind:"service" as const,name:raw.name}:null;
    const subject=resolveSubject(loadProject(projectId),selected);
    return {key:docKey,mode:doc.clips.some(c=>c.generated)?"ai":"stock",as:e.purpose==="ad"?"ad":"post",subject:subject?{kind:subject.kind,key:subject.key,name:subject.name}:null,request:typeof e.request==="string"?e.request:null,music:!!doc.audio.music};
  }
  return null;
}

export async function renderLatest(ctx: JobContext | null, projectId: string, docKey: string, o: { scale?: number; fps?: number } = {}): Promise<{ videoAssetId: string; verdict: string; issues: string[] }> {
  const { latestVideo } = await import("./store");
  const p = loadProject(projectId);
  const cur = latestVideo(projectId, docKey);
  if (!cur) throw new Error("vidéo introuvable");
  const scopeBefore=videoScope(p,{docKey});
  const ex = await renderVideoFile(projectId, cur.doc, { scale: o.scale, fps: o.fps, onProgress: (x) => ctx?.progress(x * 0.9, `Rendu ${Math.round(x * 100)} %`) });
  try {
    const { timeline } = await import("./doc");
    const local = localVideoChecks(cur.doc, { targetS: timeline(cur.doc).total, scriptIssues: [], audio: ex.audio, fileDurationS: await probeDuration(ex.file) });
    // Rendu d'une version modifiée par le client : au mieux PROVISOIRE (le client valide lui-même).
    const d = gateVideo({ local, review: null, attempt: 0 });
    const g = gateSave({ userId: p.userId, projectId, jobId: ctx?.job.id ?? null, candidateId: `video2:${docKey}` }, d);
    const scenes = scenesMetaOf(projectId, docKey, cur.doc.meta.createdFrom,cur.doc);
    const changed=latestVideo(projectId,docKey)?.version.id!==cur.version.id || videoScope(loadProject(projectId),{docKey})!==scopeBefore;
    const targetKey=changed?`${docKey}:conflict:${crypto.randomUUID().slice(0,8)}`:docKey;
    const saved = await saveRendered(projectId, p.userId, targetKey, cur.doc, ex, { ...g.meta, videoV2Render: { version: cur.version.version }, ...(scenes ? { scenes: { ...scenes, music: !!cur.doc.audio.music } } : {}) });
    saveVideoVersion(projectId, targetKey, cur.doc, { note: `rendu de la version ${cur.version.version}`, renderedAssetId: saved.videoId });
    if(changed) throw new Error("Modification pendant l’encodage : version client conservée et rendu isolé dans la bibliothèque.");
    return { videoAssetId: saved.videoId, verdict: d.verdict, issues: local.issues };
  } finally {
    fs.rmSync(ex.dir, { recursive: true, force: true });
  }
}
