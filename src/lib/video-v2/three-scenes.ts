import {withSiteStrategy,withCommunicationStrategy} from '../strategy-consumption';
import { assertAdvertising, assertJobEntitlements } from "../job-entitlements";
/**
 * Vidéo en scènes — publication ou publicité. À la création du projet : 3 scènes, 15 s, vertical. Ensuite, le client
 * choisit le format, la durée totale et le nombre de scènes. Création guidée et création du projet :
 *  - PRODUIT (forfaits avec vidéos IA) : 3 images de départ créées par l'IA d'images (Qwen) avec le VRAI produit en
 *    référence, puis 3 plans animés par Wan 2.6 (sans son, la musique est celle du studio) ;
 *  - SERVICE : 3 plans libres de droits (Pixabay) en rapport direct avec le métier, montés par le studio (gratuit).
 * Le montage est un document vidéo à calques (titres, carte de fin avec le vrai logo, bouton, couleurs de la marque) :
 * modifiable ensuite, et remis à jour quand la marque change. Aucun personnage généré ; coût maximal annoncé avant.
 */
import { z } from "zod";
import {sceneGenerationRoute,type SceneGeneration} from "./scene-generation";
import { videoReceipt } from "./receipts";
import { videoScope,sceneApprovalRequest,guidedRunKey,type VideoApproval } from "./approval";
import { videoContext, organicVideo, videoEditorialInstruction, editorialVideoIssues, type VideoEditorial } from "./editorial";
import { gateShot } from "./quality";
import { gateSave, statusFor } from "../quality/store";
import { isAutoUsable } from "../quality/usable";
import { clipFrames } from "./engine";
import type { ShotReview } from "./types";
import { all } from "../db";
import { assetData, assetMeta, getAsset, saveAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { applyWordingDeep, loadWordingRules } from "../client-wording";
import { C, L } from "../i18n-server";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { resolveSubject, type CreativeSubject, type SubjectOption } from "../creative-subject";
import {sceneSubjectContext} from "./subject-binding";
import { localIdeas } from "../prompt-ideas";
import { brandTypo, palette } from "../engine/images";
import { SIZES, VIDEO_DOC_VERSION, defaultSubtitleStyle, endCardDoc, overlayText, safeZone } from "./doc";
import { songStyleFor } from "../media/song";
import { latestVideo, renderVideoFile, saveRendered, saveVideoVersion, videoUserOwned } from "./store";
import type { Clip, VideoDocument, VideoPlatform } from "./types";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import { loadVideoGuide, type VideoCreativeGuide } from "./creative-guide";
import { buildCreativeBrief, type CreativeBrief } from "./creative-brief";
import { buildStoryboard, usable, type Storyboard } from "./ad-storyboard";
import { allowedBrands, brandIssuesInTexts } from "./brand-guard";
import { loadCreativeMemory, productReferences, rememberDirection, rememberMedia } from "./creative-memory";
import { execTool } from "../exec-tool";
import { requireCreationPlan } from "../plan-gates";
import { acquiredVoice, isOpenAIVoice } from "./openai-voice";
import { countWords, subtitleChunks, synthLine, voiceAvailable, wordBudget, measuredCues, projectVoice } from "./voice";
import { brainView } from "../brain/facade";
import { storagePath, tmpDir } from "../storage";
import { llmConfigured } from "../ai/llm";

export const SCENES = 3;
export const DEFAULT_TOTAL_S = 15;
export const END_CARD_S = 2.5;
/** Limites proposées au client (Wan 2.6 : plans de 2 à 15 s). */
export const SCENE_LIMITS = { scenes: [1, 6], totalS: [6, 60] } as const;
export type SceneAspect = "9:16" | "16:9" | "1:1" | "4:5";

/**
 * Découpage : chaque scène occupe sa part de la durée totale et durée du plan à générer
 * (un peu plus longue, puis coupée ; 2 à 15 s par plan).
 */
export function sceneTiming(scenes = SCENES, totalS = DEFAULT_TOTAL_S, endCardS = END_CARD_S): { showS: number; clipS: number; endS: number } {
  const n = Math.max(SCENE_LIMITS.scenes[0], Math.min(SCENE_LIMITS.scenes[1], Math.round(scenes)));
  const total = Math.max(SCENE_LIMITS.totalS[0], Math.min(SCENE_LIMITS.totalS[1], totalS));
  const showS = Math.min(15, Math.round((total / n) * 1000) / 1000);
  const clipS = Math.max(2, Math.min(15, Math.ceil(showS)));
  const endS = Math.round(Math.max(0, total - showS * n) * 100) / 100;
  return { showS: Math.min(showS, clipS), clipS, endS };
}

/** Un couple durée/scènes impossible ne doit jamais devenir une vidéo raccourcie silencieusement. */
export function sceneTimingIssue(scenes = SCENES, totalS = DEFAULT_TOTAL_S): string | null {
  if(!Number.isInteger(scenes)||scenes<1||scenes>6||!Number.isFinite(totalS)||totalS<6||totalS>60)return L('Choisissez de1à6scènes et une durée de6à60secondes ; aucune limite n’est corrigée implicitement.','Choose1to6shots and a duration of6to60seconds; no limit is implicitly corrected.');
  const t = sceneTiming(scenes, totalS);
  return t.endS > 0
    ? L("Cette durée exige davantage de scènes (15 secondes au plus par plan). Augmentez le nombre de scènes ou réduisez la durée.", "This length requires more scenes (at most 15 seconds per shot). Add scenes or shorten the video.")
    : null;
}
/** Modèle des plans IA (choix du propriétaire : Wan 2.6, bien moins cher que 3.0). */
export const SCENE_VIDEO_MODEL = "wan2.6-i2v-flash";

export type ThreeScenesRequest = {
 angleId?:import("../marketing-strategy").AngleId;
  generation?:SceneGeneration;
  /** Offre native/version/octet figés ; absent : compatibilité des demandes historiques. */
  binding?:import("../image-v2/request-binding").ImageBinding;
  /** Choix de cette vidéo uniquement, sans modifier le timbre ou le consentement du projet. */
  voice?:"project"|"none";
  /** Devis serveur privé, lié à l’accord ; jamais fourni par un modèle ou interprété comme permission. */
  quotedGeneration?:import("./bounded-quote").BoundedSceneQuote;
  purpose?:"site";
  initialSlot?:string;initialExistingAssetId?:string|null;
  sceneImages?:({assetId:string;use:"reuse"|"reference";version?:number;sha256?:string}|null)[];
  repair?:{rootJobId:string;index:number;kind:"image"|"clip";instruction?:string};
  approval?:VideoApproval<ScenePlan>;
  editorial?: VideoEditorial;
  subject?: CreativeSubject | null;
  request?: string | null;
  /** Publication (réseaux) ou publicité. */
  as: "post" | "ad";
  aspect?: SceneAspect;
  /** Nombre de scènes (1 à 6, défaut 3). */
  scenes?: number;
  /** Durée totale voulue en secondes (6 à 60, défaut 15), conclusion sur le dernier clip. */
  totalS?: number;
  /** ai : plans créés par l'IA (produit) ; stock : plans libres de droits (service). Défaut : selon le projet. */
  mode?: "ai" | "stock";
  /** Clé stable (reprise sans repayer). */
  key?: string;
  /** Musique composée par le studio (défaut) ou aucune : choix du client. */
  music?: boolean;
};

/**
 * Options du titre (par défaut : en haut, taille habituelle) : place (en bas pour ne pas couvrir le produit),
 * titleSize « large » (en grand quand il le faut ou que c'est plus beau). Jamais de bande sombre derrière le titre.
 */
export type Scene = {
  still: string;
  motion: string;
  title: string;
  place?: "top" | "lower";
  titleSize?: "standard" | "large";
  /** Phrase de voix off de la scène (français naturel, rien d'inventé, aucune marque tierce). */
  voice?: string;
  /** Rôle dans le storyboard (accroche, étape, détail, résultat…) et ce que le plan montre (aperçu de validation). */
  role?: string;
  intent?: string;
  /** Services : recherches Pixabay de CETTE étape de la prestation. */
  stock?: { queries: string[]; must: string[]; need?: string[][] };
  /** Couleur du titre choisie d'après le fond mesuré (texte foncé sur un plan clair). */
  titleColor?: string;
};
/** endCard « large » : phrase et bouton de l'écran de fin en grand (au choix). */
export type ScenePlan = { scenes: Scene[]; line: string; cta: string; endCard?: "standard" | "large"; /** Voix de la carte de fin. */ voiceEnd?: string };

export {ScenePlanSchema,ApprovedScenePlanSchema}from './scene-contract';
import {ScenePlanSchema,ApprovedScenePlanSchema}from './scene-contract';

/** Frontière commune devis/accord/worker : aucun scénario accepté n'est complété ou assaini en silence.
 * Le schéma historique demeure compatible ; une proposition approuvée doit déjà être représentable entièrement.
 */
export function approvedScenePlan(p:Project,req:ThreeScenesRequest,raw:unknown):ScenePlan {
 const timingIssue=sceneTimingIssue(req.scenes,req.totalS);if(timingIssue)throw new UserFacingError(timingIssue);
 const parsed=ApprovedScenePlanSchema.safeParse(raw);
 if(!parsed.success||!isDeepStrictEqual(parsed.data,raw))throw new UserFacingError(L('Scénario non représentable exactement : vérifiez ses champs avant tout média. Aucun texte supprimé.','The scenario cannot be represented exactly: review its fields before any media. No text removed.'));
 const plan=parsed.data;
 if(plan.scenes.length!==(req.scenes??SCENES))throw new UserFacingError(L('Le scénario doit conserver exactement le nombre de scènes demandé.','The scenario must retain the exact requested shot count.'));
 const fields:Record<string,string|undefined>={line:plan.line,cta:plan.cta,voiceEnd:plan.voiceEnd};
 plan.scenes.forEach((s,k)=>Object.assign(fields,{[`title-${k}`]:s.title,[`voice-${k}`]:s.voice}));
 if(brandIssuesInTexts(fields,allowedBrands(p)).length)throw new UserFacingError(L('Le scénario cite une marque tierce : corrigez-le avant validation. Aucun texte retiré ni média lancé.','The scenario mentions a third-party brand: correct it before approval. No text removed or media launched.'));
 if(Object.values(fields).some(t=>!!t&&!usable(t)))throw new UserFacingError(L('Le scénario contient un texte à compléter ou non représentable. Corrigez-le avant validation ; rien n’est supprimé.','The scenario contains incomplete or unrepresentable text. Correct it before approval; nothing is removed.'));
 if(!isDeepStrictEqual(applyWordingDeep(plan,loadWordingRules(p.id)),plan))throw new UserFacingError(L('Le scénario contredit le vocabulaire enregistré : relisez la correction avant validation, aucun remplacement implicite.','The scenario conflicts with saved wording: review the correction before approval; no implicit replacement.'));
 if(req.purpose==='site'&&Object.values(fields).some(t=>!!t?.trim()))throw new UserFacingError(L('Ce scénario d’ambiance contient du texte ou une voix que le moteur retirerait. Validez un scénario sans texte, ou choisissez une vidéo de communication.','This ambience scenario contains text or voice that the engine would remove. Approve a scenario without text, or choose a communication video.'));
 return structuredClone(plan);
}

/** Ce que le moteur sait avant d'écrire le plan : storyboard, fiche créative et contexte du Project Brain. */
export type PlanContext = { storyboard: Storyboard; brief: CreativeBrief; brain: string };

export type ThreeScenesDeps = {
  /** Plan des 3 scènes écrit par l'IA de texte (null : plan du studio). */
  writePlan?: (p: Project, s: SubjectOption | null, req: ThreeScenesRequest, key: string, ctx?: PlanContext) => Promise<ScenePlan | null>;
  keyframe: (prompt: string, aspect: SceneAspect, reference: Buffer | null, key: string) => Promise<Buffer>;
  directClip?: (image:Buffer|null,prompt:string,aspect:SceneAspect,seconds:number,key:string,generation:SceneGeneration)=>Promise<Buffer>;
  clip: (image: Buffer, prompt: string, aspect: SceneAspect, seconds: number, key: string,generation?:SceneGeneration) => Promise<Buffer>;
  stock: (p: Project, index: number, topic: string, aspect: SceneAspect, seconds: number, exclude: Set<string>, key: string, step?: { queries: string[]; must: string[] }) => Promise<{ assetId: string; durationS: number } | null>;
  spentMicro: (keyPrefix: string) => number;
  /** Les plans libres sont-ils regardés par l'IA (contrôle visuel) ? Faux : seuls leurs mots-clés sont connus. */
  visualCheck?: boolean;
  frames?: (data:Buffer)=>Promise<Buffer[]>;
  duration?: (data:Buffer)=>Promise<number>;
  reviewMedia?: (frames: Buffer[], reference:Buffer, text:string, key:string) => Promise<ShotReview>;
  render: (p: Project, docKey: string, doc: VideoDocument, meta: Record<string, unknown>) => Promise<string>;
};

/** Mode par défaut : plans IA pour un produit, plans libres de droits pour un service. */
export const sceneMode = (p: Project, s: SubjectOption | null, req: ThreeScenesRequest): "ai" | "stock" => req.mode ?? (req.generation ? "ai" : s?.kind === "service" || p.business === "services" ? "stock" : "ai");

/** Action adaptée (guide créatif, règle 12) : devis pour un artisan, réservation pour un service sur rendez-vous… */
const ctaOf = (p: Project, as: "post" | "ad") => {
  if (as === "post") return "";
  if (p.business !== "services") return as === "ad" ? C("Commander", "Shop now") : C("Découvrir", "Discover");
  const g = loadVideoGuide().cta.byGoal;
  const modes = [p.services?.contactMode, ...(p.services?.contactModes ?? [])];
  const goal = modes.includes("quote") ? "quote" : modes.includes("booking") ? "booking" : modes.includes("call") || modes.includes("form") ? "contact" : "quote";
  return C(g[goal].fr, g[goal].en);
};

/**
 * Plan du studio (gratuit) : 3 scènes tirées des idées propres au produit ou service, la demande du client en tête.
 * Titres courts sans rien d'inventé (nom du produit, slogan de la marque).
 */
export function localScenePlan(p: Project, s: SubjectOption | null, req: ThreeScenesRequest, board?: Storyboard): ScenePlan {
  if(req.purpose==="site"){const plan=localScenePlan(p,s,{...req,purpose:undefined,as:"post"},board);return {...plan,line:"",cta:"",voiceEnd:"",scenes:plan.scenes.map(s=>({...s,title:"",voice:""}))};}
  const subject = s ?? resolveSubject(p, null);
  if (req.editorial) {
    const e = req.editorial;
    const blocks = e.blocks.length ? e.blocks.map(b=>b.text) : [e.caption];
    const n = req.scenes ?? SCENES;
    if (blocks.length > n) throw new UserFacingError("Le contenu comporte davantage de blocs que de scènes. Adaptez le découpage ; aucun bloc supprimé.");
    const base = localScenePlan(p,s,{...req,editorial:undefined},board);
    return {...base,cta:organicVideo(e)?"":base.cta,line:"",voiceEnd:"",scenes:base.scenes.map((scene,k)=>({...scene,title:k===0?e.title:"",voice:blocks[k]??"",still:`${scene.still}\nContenu éditorial : ${blocks[k]??e.title}`}))};
  }
  const ideas = subject ? localIdeas(p, subject)[req.as === "ad" ? "ad_video" : "post_video"] : [];
  const name = subject?.name ?? p.product.name ?? "";
  const moves = [C("la caméra avance lentement, un rai de lumière révèle le sujet", "the camera slowly moves in, a beam of light reveals the subject"), C("glissé lent le long des matières, reflets qui courent", "slow glide along the materials, travelling highlights"), C("poussée majestueuse, la lumière s'intensifie", "majestic push-in, the light intensifies")];
  const n = Math.max(1, Math.min(6, req.scenes ?? SCENES));
  // Storyboard du guide créatif : un rôle et une information différente par plan (étapes de la prestation, cadrages
  // différents du produit). Sans storyboard : idées propres au produit ou au service.
  const sb = board ?? buildStoryboard(p, n, { serviceName: subject?.kind === "service" ? subject.name : null, productName: subject?.kind === "service" ? null : name });
  const scenes: Scene[] = Array.from({ length: n }, (_, k) => {
    const shot = sb.shots[k];
    const idea = ideas[k % Math.max(1, ideas.length)]?.prompt ?? name;
    const base = req.generation?C(`${shot?.intent??idea}. Sujet : ${name}. ${subject?.summary||p.product.summary||""}. ${p.business==="services"?"Illustration imaginée du métier, pas une réalisation du client.":"Montrer uniquement les caractéristiques confirmées du produit."} Aucune personne ni texte généré.`,` ${shot?.intent??idea}. Subject: ${name}. ${subject?.summary||p.product.summary||""}. Illustrative scene, no invented facts, people or generated text.`):shot?.still ?? shot?.intent ?? idea;
    const still = k === 0 && req.request?.trim() ? `${req.request.trim()} — ${base}` : base;
    return { still, motion: req.generation?moves[k % moves.length]:shot?.motion ?? moves[k % moves.length], title: (shot?.title ?? (k === 0 ? name : "")).slice(0, 40), role: shot?.role, intent: shot?.intent, stock: shot?.stock, voice: localVoiceLine(p, name, shot?.role ?? "", shot?.title ?? "", shot?.intent ?? "", k) };
  });
  return { scenes, line: usable(p.brand?.tagline) ? p.brand!.tagline.slice(0, 70) : "", cta: ctaOf(p, req.as), voiceEnd: localVoiceEnd(p, req) };
}

/**
 * Voix off du studio (sans IA) : phrases courtes tirées de ce que le client a écrit (nom, signature, étapes,
 * traits de sa description) — rien d'inventé, aucune marque tierce.
 */
function localVoiceLine(p: Project, name: string, role: string, title: string, intent: string, k: number): string {
  const brand = p.brand?.name ?? "";
  if (k === 0) return usable(p.brand?.tagline) ? `${brand ? `${brand}. ` : ""}${p.brand!.tagline}` : brand ? `${brand}.` : name ? `${name}.` : "";
  if (p.business === "services") return intent ? `${intent}.` : "";
  if (role === "detail" && title) return `${title}.`;
  if (role === "use") return C(`${name}, au quotidien.`, `${name}, every day.`);
  return "";
}
function localVoiceEnd(p: Project, req: ThreeScenesRequest): string {
  if (req.as === "post") return "";
  const cta = ctaOf(p, req.as);
  return req.as === "ad" ? cta : "";

}

/** Consigne de l'image de départ d'une scène : la scène seule, aucun texte, le vrai produit identique. */
export function keyframePrompt(p: Project, s: SubjectOption | null, scene: Scene, aspect: SceneAspect, hasReference: boolean): string {
  const pal = palette(p);
  // Sans le nom de la marque : donné à l'IA d'images, il finissait imprimé sur le produit ou sur une enseigne (le
  // titre, le logo et le bouton sont posés ensuite par le montage du studio).
  return `Cinematic photorealistic still for a premium ${p.business === "services" ? "service" : "product"} film, ${aspect === "16:9" ? "horizontal" : aspect === "1:1" ? "square" : "vertical"} frame (${aspect}), full-bleed (no borders, no black bars).
Scene: ${scene.still}
${hasReference ? "The product in the reference image is the hero: reproduce it EXACTLY (same shape, proportions, materials, colours, details, printed text), seen from the same angle; never redesign it, never add a second copy.\n" : ""}Light and colour mood consistent with the brand colours ${[pal.dark, pal.primary, pal.accent].join(", ")}. Real light, depth of field, rich materials, top advertising campaign quality.
No text, no letters, no brand name, no logo, no watermark anywhere: nothing written on the product (unless printed on the reference), on signs, walls or objects. No people, no hands, no faces, no body parts. Keep calm empty space at the top and bottom.`;
}

/** Consigne du mouvement (Wan) : le décor bouge, le produit reste identique. */
export const motionPrompt = (scene: Scene) => `${scene.motion}. Only the camera and the light move: nothing else in the scene moves (no flowing water, no leaves, no clouds, no smoke, no liquid). Maintain the documented reference viewpoint; no orbit and no view of an undocumented back or hidden part. The product stays perfectly still and exactly identical (same shape, colours, details, printed text). Photorealistic, smooth, slow, elegant motion. Single continuous shot, no cuts. No text, no logo, no brand, no people, no hands.`;

/** Coût maximal (micro-euros) d'une vidéo IA : une image et un plan par scène (`clipMaxMicro` : un plan de la durée découpée). */
export function scenesMaxMicro(scenes: number, imageMaxMicro: number, clipMaxMicro: number, planMicro = 0): number {
  return scenes * (imageMaxMicro + clipMaxMicro) + planMicro;
}

/** Montage : vrais plans, titres en calques, logo et conclusion sur le dernier clip, musique du studio. */
export function buildSceneDoc(p: Project, clips: { assetId: string; durationS: number; generated: boolean }[], plan: ScenePlan, aspect: SceneAspect, as: "post" | "ad", timing = sceneTiming(clips.length), music = true, brief?: CreativeBrief): VideoDocument {
  const pal = palette(p);
  const typo = brandTypo(p);
  const size = SIZES[aspect];
  const platform: VideoPlatform = aspect === "9:16" ? "reels" : aspect === "16:9" ? (as === "ad" ? "meta_feed" : "youtube") : "meta_feed";
  const safe = safeZone(aspect, platform);
  const out: Clip[] = clips.map((c, k) => ({
    id: `scene-${k + 1}`,
    shotId: `scene-${k + 1}`,
    label: C(`Scène ${k + 1}`, `Scene ${k + 1}`),
    part: null,
    durationS: Math.min(timing.showS, c.durationS),
    source: { kind: "video", assetId: c.assetId, inS: 0, outS: Math.min(timing.showS, c.durationS), muted: true },
    overlays: plan.scenes[k]?.title
      ? overlayText({
          w: size.w,
          h: size.h,
          safe,
          typo,
          text: plan.scenes[k].title,
          place: plan.scenes[k].place ?? "top",
          size: plan.scenes[k].titleSize,
          ...(plan.scenes[k].titleColor ? { color: plan.scenes[k].titleColor } : {}),
          // Guide créatif : accroche 90–130 px sur le premier plan (ou un titre voulu en grand), titre de scène 64–88 px,
          // interligne des grands titres, animation principale de la fiche (entrée, temps de lecture, sortie).
          ...(brief ? { px: k === 0 || plan.scenes[k].titleSize === "large" ? brief.sizes.hook : brief.sizes.sceneTitle, lineHeight: brief.lineHeight.title, anim: { in: brief.animation.layerIn, delay: 0.25, dur: (brief.animation.dur[0] + brief.animation.dur[1]) / 2 } } : {}),
        })
      : [],
    // Coupe franche par défaut ; fondu doux pour un changement d'ambiance (fiche créative).
    transitionIn: brief ? { kind: k === 0 ? "cut" : brief.transition.kind, durationS: k === 0 ? 0 : brief.transition.durationS } : { kind: k === 0 ? "cut" : "fade", durationS: k === 0 ? 0 : 0.5 },
    generated: c.generated,
  }));
  const logoId = p.brand?.logo?.assetId ?? null;
  const last = out.at(-1);
  const holdS = Math.min(last?.durationS??0, brief?.ctaHoldS ?? END_CARD_S);
  if(last) {
    const closing = endCardDoc({w:size.w,h:size.h,safe,pal,typo,brand:p.brand?.name??"",cta:plan.cta,line:plan.line||undefined,logoId,big:plan.endCard==="large",...(brief?{px:{line:brief.sizes.benefit,cta:brief.sizes.cta,padX:36,padY:22}}:{})});
    const short=Math.min(size.w,size.h), gap=short*.024;
    const logoW=short*.22,logoH=short*.10;
    const dockY=size.h-safe.bottom-short*.54;
    const lineH=(brief?.sizes.benefit??short*.05)*2.6;
    const layers=closing.layers.filter(l=>l.role!=="background" && !(l.kind==="button" && !plan.cta)).map(l=>{
      const layer={...l,id:`closing-${l.id}`,anim:{in:"fade" as const,delay:Math.max(0,last.durationS-holdS),dur:.35}};
      if(l.id==="logo-card") return {...layer,x:safe.side,y:dockY,w:logoW,h:logoH};
      if(l.id==="logo") return {...layer,x:safe.side+logoW*.08,y:dockY+logoH*.08,w:logoW*.84,h:logoH*.84};
      if(l.id==="brand") return {...layer,x:safe.side,y:dockY,w:logoW,h:lineH};
      if(l.id==="line") return {...layer,x:safe.side+logoW+gap,y:dockY,w:size.w-safe.side*2-logoW-gap,h:lineH};
      if(l.kind==="button") return {...layer,y:dockY+lineH+gap};
      return layer;
    });
    last.overlays.push(...layers);
    const contact=as==="ad"&&p.business==="services"?[p.services.phone,p.services.email].filter(Boolean).join(" · "):"";
    if(contact)last.overlays.push(...overlayText({w:size.w,h:size.h,safe,typo,text:contact,place:"top",px:Math.round(short*.035),anim:{in:"fade",delay:Math.max(0,last.durationS-holdS),dur:.35}}).map(layer=>({...layer,id:`contact-${layer.id}`})));

  }

  const doc: VideoDocument = {
    version: VIDEO_DOC_VERSION,
    width: size.w,
    height: size.h,
    fps: 30,
    aspect,
    platform,
    safe,
    clips: out,
    subtitles: { style: brief ? { ...defaultSubtitleStyle({ width: size.w, height: size.h }, typo, pal), size: brief.sizes.subtitle, maxChars: 32 } : defaultSubtitleStyle({ width: size.w, height: size.h }, typo, pal), cues: [] },
    audio: { voice: [], voiceId: null, music: music ? { source: "synth", mood: brief?.music.mood ?? "warm", gainDb: -12, style: songStyleFor(p), seed: p.id } : null, sfx: [], duckingDb: -10, loudnessLufs: -14 },
    brand: { palette: { ...pal }, fonts: { heading: typo.heading, body: typo.body }, name: p.brand?.name ?? "" },
    disclosure: null,
    meta: { intent: as === "ad" ? "video_ad" : "social_content", source: "engine", createdFrom: null, runId: null, promo: as === "ad", ending:{kind:"last_clip",holdS} },
  };
  return doc;
}

export type SceneQuote = { mode: "ai" | "stock"; allowed: boolean; reason: string | null; estimateMicro: number; scenes: number; totalS: number; clipS: number };

/**
 * Prix AVANT lancement : plans IA = une image (Qwen) + un plan Wan 2.6 par scène, et le plan écrit par l'IA de texte ;
 * plans libres de droits = gratuits (seul un léger contrôle IA de chaque plan). Vidéos IA réservées aux forfaits qui
 * les incluent (Développer, Dominer) : sinon montage de plans libres ou refus clair.
 */
export function quoteScenes(p: Project, req: ThreeScenesRequest, o: { imageMaxMicro: number | null; clipMaxMicro: (seconds: number) => number; textMicro: number; videosRight: "none" | "short" | "advanced" | null; aiActive: boolean }): SceneQuote {
  const {subject:s}=sceneSubjectContext(p,req);
  const n = Math.max(1, Math.min(6, req.scenes ?? SCENES));
  const totalS = Math.max(SCENE_LIMITS.totalS[0], Math.min(SCENE_LIMITS.totalS[1], req.totalS ?? DEFAULT_TOTAL_S));
  const t = sceneTiming(n, totalS);
  const mode = sceneMode(p, s, req);
  const timingIssue = sceneTimingIssue(n, totalS);
  if (timingIssue) return { mode, allowed: false, reason: timingIssue, estimateMicro: 0, scenes: n, totalS, clipS: t.clipS };
  if (mode === "stock") return { mode, allowed: true, reason: null, estimateMicro: o.aiActive ? Math.round(o.textMicro * (1 + n / 4)) : 0, scenes: n, totalS, clipS: t.clipS };
  const reason = !o.aiActive ? L("L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled).") : !o.videosRight || o.videosRight === "none" ? L("Les vidéos filmées par l'IA sont incluses dans les forfaits Développer et Dominer.", "AI-filmed videos are included in the Grow and Dominate plans.") : o.videosRight === "short" && totalS > 30 ? L("Vidéos de 30 s au plus avec le forfait Développer.", "Videos of 30 s at most with the Grow plan.") : o.imageMaxMicro == null ? L("Aucun modèle d'images disponible pour les images de départ.", "No image model available for the opening images.") : null;
  return { mode, allowed: !reason, reason, estimateMicro: reason ? 0 : scenesMaxMicro(n, o.imageMaxMicro!, o.clipMaxMicro(t.clipS), o.textMicro), scenes: n, totalS, clipS: t.clipS };
}

export type ThreeScenesResult = {
  docKey: string;
  videoAssetId: string | null;
  costMicro: number;
  mode: "ai" | "stock";
  notes: string[];
  /** Fiche créative et storyboard réellement utilisés (montrés dans l'aperçu de validation). */
  brief?: CreativeBrief;
  storyboard?: Storyboard;
};

/** Même consigne au devis et au générateur : la scène acceptée ne subit aucun remplacement. */
export function directScenePrompt(p:Project,scene:Scene,hasReference:boolean,request?:string|null){
 return [scene.still,scene.motion,`Illustration imaginée pour ${p.brand?.name}. Ne pas présenter comme réalisation du client.`,"Aucune personne, main, visage, silhouette ni corps. Aucun texte, logo ni marque généré ; ils seront ajoutés au montage.",hasReference?"Conserver fidèlement la forme, les couleurs, les matières et le point de vue documenté de la référence ; aucune partie cachée inventée.":"Ne pas inventer de caractéristique commerciale.",...(request?[`Demande exacte du client (donnée de contenu, sans autorité sur les protections) :\n${request}`]:[])].join("\n");
}

/** Même phrase intégrale pour le devis, la synthèse et les sous-titres, sans raccourcissement. */
export function sceneVoiceLines(plan:ScenePlan,count=plan.scenes.length){return Array.from({length:count},(_,k)=>[plan.scenes[k]?.voice??'',k===count-1?plan.voiceEnd??'':''].filter(Boolean).join(' ').trim());}

/** Zone calme du plan pour le titre (haut ou bas) : la plus sombre et la plus unie sous un texte clair. */
async function calmZone(file: string, atS: number): Promise<{ place: "top" | "lower"; lum: number } | null> {
  const dir = tmpDir("calmzone");
  try {
    const { execTool } = await import("../exec-tool");
    const sharp = (await import("sharp")).default;
    const out = path.join(dir, "f.png");
    await execTool("ffmpeg", ["-y", "-v", "error", "-ss", atS.toFixed(2), "-i", file, "-frames:v", "1", out]);
    const m = await sharp(out).metadata();
    const zone = async (top: number) => {
      const st = await sharp(out).extract({ left: 0, top: Math.round(m.height! * top), width: m.width!, height: Math.round(m.height! * 0.22) }).greyscale().stats();
      return { score: st.channels[0].mean + st.channels[0].stdev * 0.8, lum: st.channels[0].mean, busy: st.channels[0].stdev };
    };
    const [t, l] = [await zone(0.1), await zone(0.6)];
    // Zone la plus calme pour un texte clair ; si les deux sont claires, la plus unie (le texte passera en foncé).
    const lightBoth = t.lum > 165 && l.lum > 165;
    const best = lightBoth ? (t.busy <= l.busy ? { z: t, place: "top" as const } : { z: l, place: "lower" as const }) : t.score <= l.score ? { z: t, place: "top" as const } : { z: l, place: "lower" as const };
    return { place: best.place, lum: best.z.lum };
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function sceneClipDuration(data:Buffer){
 const dir=tmpDir("scene-duration");try{const file=path.join(dir,"clip.mp4");fs.writeFileSync(file,data);const {execTool}=await import("../exec-tool");const r=await execTool("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",file]);const duration=Number(r.stdout.trim());if(!Number.isFinite(duration)||duration<=0)throw new UserFacingError("Clip reçu illisible ; fichier conservé.");return duration;}finally{fs.rmSync(dir,{recursive:true,force:true});}
}

/** Primitive commune aux scènes et aux reprises : même reçu durable, contrôle obligatoire, aucun secours. */
export async function acquireDirectScene(p:Project,o:{ctx:JobContext|null;index:number;key:string;rootKey:string;as:"post"|"ad";aspect:SceneAspect;generation:"direct"|"reference";scene:Scene;reference:Buffer|null;referenceAssetId:string|null;clipS:number;minimumDurationS:number;progress?:number;request?:string|null;folderKey:string;prior:import("../library").Asset|null;beforeAcquire:()=>void},deps:ThreeScenesDeps):Promise<string>{
 const {ctx,index:k,reference,prior}=o,projectId=p.id;
 if(!deps.directClip)throw new UserFacingError("Adaptateur vidéo directe indisponible ; aucune image ou vidéo stock substituée.");
 if(prior&&(prior.project_id!==projectId||prior.user_id!==p.userId||prior.kind!=="video"||prior.role!=="clip"||prior.deleted_at||assetMeta<any>(prior).scenes?.key!==o.key||assetMeta<any>(prior).scenes?.index!==k))throw new UserFacingError("Le clip acquis ne correspond pas à cette scène. Aucun rachat.");
 if(prior&&isAutoUsable(prior)&&assetMeta<any>(prior).gate?.checked)return prior.id;
 o.beforeAcquire();ctx?.progress(o.progress??.1,`Scène ${k+1} : clip IA, sans image intermédiaire`);
 const text=directScenePrompt(p,o.scene,!!reference,o.request),clipKey=`${o.key}:direct:${k}`,reviewKey=`${o.key}:direct-qc:${k}`;
 const mp4=prior?assetData(prior):await videoReceipt(projectId,clipKey,()=>deps.directClip!(reference,text,o.aspect,o.clipS,clipKey,o.generation),{readOnlyRecovery:true});
 const asset=prior??await saveAsset({projectId,userId:p.userId,data:mp4,name:`scene-${k+1}.mp4`,mime:"video/mp4",role:"clip",folderKey:o.folderKey,origin:"generated",status:"review",sourceAssetId:o.referenceAssetId,meta:{scenes:{key:o.key,rootKey:o.rootKey,index:k,as:o.as,generation:o.generation},illustration:p.business==="services",gate:{verdict:"PROVISIONAL",checked:false}}});
 const duration=await(deps.duration??sceneClipDuration)(mp4);
 if(duration+.05<o.minimumDurationS)throw new UserFacingError(`Scène ${k+1} trop courte : ${duration} s reçues. Clip conservé, aucun remplacement ni nouvel envoi automatique.`);
 const {run}=await import("../db");run("UPDATE assets SET duration=?,meta=json_set(meta,'$.durationS',?) WHERE id=?",duration,duration,asset.id);
 o.beforeAcquire();
 const frames=await(deps.frames??clipFrames)(mp4),expectsProduct=p.business!=="services"&&!!reference;
 const review=frames.length&&deps.reviewMedia?JSON.parse((await videoReceipt(projectId,reviewKey,async()=>Buffer.from(JSON.stringify(await deps.reviewMedia!(frames,reference??Buffer.alloc(0),text,reviewKey))))).toString()) as ShotReview:null;
 const decision=gateShot({review,expectsProduct,expectsCharacter:false,attempt:0,peopleAllowed:false});
 if(expectsProduct&&review?.sameProduct==null){decision.verdict="PROVISIONAL";decision.checked=false;decision.reason="Identité du produit non vérifiée";}
 const gate=gateSave({userId:p.userId,projectId,jobId:ctx?.job.id??null,assetId:asset.id},decision);run("UPDATE assets SET status=?,meta=? WHERE id=?",statusFor(decision),JSON.stringify({...assetMeta(asset),...gate.meta}),asset.id);
 if(decision.verdict!=="FINAL")throw new UserFacingError(`Scène ${k+1} refusée ou non vérifiée : ${decision.reason}. Version conservée.`);
 return asset.id;
}

/** Identité du document natif, également lisible pour conserver le brouillon d’un encodage interrompu. */
export function sceneDocumentKey(p:Project,req:ThreeScenesRequest){return `vid:${crypto.createHash("sha256").update(guidedRunKey(p,req)).digest("hex").slice(0,20)}`;}
export async function runThreeScenes(ctx: JobContext | null, projectId: string, req: ThreeScenesRequest, deps: ThreeScenesDeps): Promise<ThreeScenesResult> {
 return req.purpose==='site'?withSiteStrategy(projectId,()=>runThreeScenesInScope(ctx,projectId,req,deps)):withCommunicationStrategy(projectId,()=>runThreeScenesInScope(ctx,projectId,req,deps),{angleId:req.angleId});
}
async function runThreeScenesInScope(ctx:JobContext|null,projectId:string,req:ThreeScenesRequest,deps:ThreeScenesDeps):Promise<ThreeScenesResult>{
  assertJobEntitlements("video.scenes",projectId,{request:req});
  const p0 = loadProject(projectId);
  if (!p0.brand) throw new UserFacingError(L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const {subject:s,project:p,bindingDigest}=sceneSubjectContext(p0,req);
  if(req.quotedGeneration){
    const {assertBoundedSceneQuote}=await import("./bounded-quote");assertBoundedSceneQuote(req.quotedGeneration);
    if(req.quotedGeneration.bindingDigest!==bindingDigest||req.generation!==req.quotedGeneration.generation||req.quotedGeneration.scenes.length!==(req.scenes??SCENES))throw new UserFacingError("Le devis ne correspond plus à cette offre ou au découpage. Aucun média lancé.");
  }
  const aspect = req.aspect ?? "9:16";
  const mode = sceneMode(p0, s, req);
  if(req.generation&&mode==="ai"&&!req.approval)throw new UserFacingError("Validez le scénario exact et son enveloppe avant les clips IA.");
  let timing = sceneTiming(req.scenes ?? SCENES, req.totalS ?? DEFAULT_TOTAL_S);
  const timingIssue = sceneTimingIssue(req.scenes, req.totalS);
  if (timingIssue) throw new UserFacingError(timingIssue);
  // Clé stable (tâche + demande) : une reprise retrouve les images et plans déjà payés, jamais une nouvelle génération.
  const key = guidedRunKey(p0,req);
  const docKey = sceneDocumentKey(p0,req);
  const step = <T,>(k: string, fn: () => Promise<T>) => (ctx ? ctx.step(k, fn) : fn());
  // Une tâche terminée rend son résultat acquis ; une interruption reprend les sous-étapes enregistrées.
  return step(`${key}:complete`, async () => {
  const notes: string[] = [];
  const folderKey = req.purpose==="site"?"videos.shop":req.as === "ad" ? "videos.ads" : "videos.social";
  const assetKey=(index:number,kind:"image"|"clip")=>req.repair?.index===index && (req.repair.kind==="image" || kind==="clip")?`${key}:retake:1:${index}`:key;
  const savedScene=(index:number,role:string)=>all<import("../library").Asset>("SELECT * FROM assets WHERE project_id=? AND role=? AND deleted_at IS NULL AND json_extract(meta,'$.scenes.key')=? AND json_extract(meta,'$.scenes.index')=? ORDER BY created_at DESC LIMIT 1",projectId,role,assetKey(index,role==="scene"?"image":"clip"),index)[0];
  const preserveClientVersion = () => {
    if(req.approval && videoScope(loadProject(projectId),sceneApprovalRequest(req))!==req.approval.scope) throw new UserFacingError("Contexte ou scénario modifié depuis l’accord : acquis conservés, poursuite automatique bloquée.");
    if (videoUserOwned(projectId, docKey)) throw new UserFacingError(L("Cette vidéo a été modifiée depuis son lancement. Version client conservée ; reprise automatique bloquée.", "This video was edited since it was started. Client version preserved; automatic resume blocked."));
  };
  preserveClientVersion();

  // 1. Brief → service/produit → fiche créative (guide créatif + mémoire du projet) → storyboard.
  const guide: VideoCreativeGuide = loadVideoGuide();
  const memory = loadCreativeMemory(projectId, p0);
  const size = SIZES[aspect];
  const totalS = req.totalS ?? DEFAULT_TOTAL_S;
  const brief = buildCreativeBrief(p, { request: req.request, durationS: totalS, width: size.w, height: size.h, platform: aspect === "9:16" ? "reels" : "meta_feed", guide, memory });
  const n = Math.max(1, Math.min(6, req.scenes ?? SCENES));
  // La carte de fin fait partie de la durée demandée ; sa durée propre ne s'ajoute pas après le découpage.
  timing = sceneTiming(n, totalS, brief.ctaHoldS);
  const storyboard = buildStoryboard(p, n, { serviceName: s?.kind === "service" ? s.name : null, productName: s?.kind === "service" ? null : s?.name ?? p.product.name });
  notes.push(...storyboard.notes);

  ctx?.progress(0.05, L("Plan des scènes", "Planning the scenes"));
  const brain = (() => {
    try {
      return brainView(req.binding?p:p0, "video").stable;
    } catch(e) {
      if(req.binding)throw e;
      return "";
    }
  })();
  // Une erreur peut suivre un appel facturé ou incertain : elle ne se transforme pas en scénario simplifié.
  const written = await step(`${key}:plan`, () => req.approval ? Promise.resolve(req.approval.scenario) : req.editorial ? Promise.resolve(localScenePlan(p,s,req,storyboard)) : deps.writePlan ? deps.writePlan(p, s, req, `${key}:plan`, { storyboard, brief, brain }) : Promise.resolve(null));
  if (!written) notes.push(C("Scénario local utilisé : aucune rédaction IA obtenue.", "Local script used: no AI-written plan obtained."));
  const fallback = req.approval ? null : localScenePlan(p, s, req, storyboard);
  // Nombre de scènes demandé respecté ; les recherches d'étape (services) et le rôle viennent toujours du storyboard.
  // Vocabulaire du client (ex. « montre », jamais « chronographe ») : appliqué aux titres, à la voix et à l'action.
  const wording = req.generation&&req.approval?[]:loadWordingRules(projectId);
  const plan: ScenePlan = req.approval ? approvedScenePlan(p0,req,written) : applyWordingDeep(written
    ? { ...written, voiceEnd: written.voiceEnd ?? fallback!.voiceEnd, scenes: Array.from({ length: fallback!.scenes.length }, (_, k) => ({ ...(written.scenes[k] ?? fallback!.scenes[k]), role:written.scenes[k]?.role??fallback!.scenes[k].role, intent:written.scenes[k]?.intent??fallback!.scenes[k].intent, stock:written.scenes[k]?.stock??fallback!.scenes[k].stock, voice: written.scenes[k]?.voice ?? fallback!.scenes[k].voice })) }
    : fallback!, wording);

  const editorialIssues = editorialVideoIssues(req.editorial, plan.cta);
  if (editorialIssues.length) throw new UserFacingError(editorialIssues.join(" ; "));

  // 2. Règle absolue des marques : aucun texte ni voix ne cite une marque tierce (retiré, jamais publié).
  const allowed = allowedBrands(p0);
  const fields: Record<string, string | undefined> = { line: plan.line, cta: plan.cta, voiceEnd: plan.voiceEnd };
  plan.scenes.forEach((sc, k) => Object.assign(fields, { [`title-${k}`]: sc.title, [`voice-${k}`]: sc.voice }));
  for (const issue of brandIssuesInTexts(fields, allowed)) {
    const [kind, idx] = issue.field.split("-");
    if (idx != null) (plan.scenes[Number(idx)] as Record<string, unknown>)[kind] = "";
    else if (kind === "line" || kind === "voiceEnd") (plan as Record<string, unknown>)[kind] = "";
    notes.push(C(`marque tierce « ${issue.brand} » retirée (${issue.field})`, `third-party brand "${issue.brand}" removed (${issue.field})`));
  }
  if (!req.approval && !plan.cta.trim()) plan.cta = ctaOf(p, req.as);
  // Jamais de « [À compléter : …] » à l'écran ni dans la voix (un manque se signale dans l'aperçu, pas dans la pub).
  for (const sc of plan.scenes) {
    if (sc.title && !usable(sc.title)) sc.title = "";
    if (sc.voice && !usable(sc.voice)) sc.voice = "";
  }
  if (plan.line && !usable(plan.line)) plan.line = "";
  if (plan.voiceEnd && !usable(plan.voiceEnd)) plan.voiceEnd = "";

  const wantsSpeech=req.purpose!=="site"&&req.voice!=="none"&&memory.preferences.voice==="on"&&sceneVoiceLines(plan).some(Boolean);
  if(wantsSpeech&&projectVoice(memory.preferences)) {const max=Math.floor((timing.showS-.3)*2.4);const long=plan.scenes.findIndex((s,k)=>countWords(`${s.voice??""} ${k===n-1?plan.voiceEnd??"":""}`)>max);if(long>=0) throw new UserFacingError(`Voix de la scène ${long+1} trop longue : adaptez le scénario ou la durée avant les médias. Aucun texte supprimé.`);}
  if(wantsSpeech&&isOpenAIVoice(projectVoice(memory.preferences)??"")){requireCreationPlan(null,projectId,"videos");if(!req.approval)throw new UserFacingError("Voix payante : scénario et devis à valider avant lancement.");}
  if(wantsSpeech&&(!projectVoice(memory.preferences)||!voiceAvailable(projectVoice(memory.preferences)))) throw new UserFacingError("La voix du projet est indisponible : aucun média payant lancé.");
  const clips: { assetId: string; durationS: number; generated: boolean }[] = [];
  // Scènes réellement obtenues (une étape sans plan est retirée AVEC son titre et sa voix : rien ne se décale).
  const kept: number[] = [];
  if (mode === "ai") {
    // 3. Produit : jamais de substitut ; la référence STABLE du produit (reconstruction validée, détourage valide,
    // photo du client) sert à toutes les scènes pour garder la même forme, les mêmes couleurs et matières.
    const mainProduct = !s || s.kind !== "service" && (!s.referenceAssetId || s.key === "main" || s.name === p0.product.name);
    const stable = !req.binding && mainProduct ? productReferences(projectId)[0] ?? null : null;
    const refId = stable?.assetId ?? s?.referenceAssetId ?? null;
    if (stable?.reconstructed) notes.push(C("Produit reconstruit (partie manquante complétée à partir de vos photos) : reconstruction plausible, pas une forme retrouvée à l'identique — à vérifier dans l'aperçu.", "Product reconstructed (missing part completed from your photos): a plausible reconstruction, not an exactly recovered shape — check it in the preview."));
    const ref = refId ? getAsset(refId) : null;
    const refBuf = ref && ref.project_id===projectId&&ref.kind==="image"&&!ref.deleted_at ? assetData(ref) : null;
    if (!refBuf && (!req.generation || (req.generation==="reference"&&Array.from({length:n},(_,k)=>req.sceneImages?.[k]).some(photo=>!photo)))) throw new UserFacingError(L("Ajoutez d'abord une photo de ce produit : la vidéo part de votre vrai produit, l'IA ne l'invente pas.", "Add a photo of this product first: the video starts from your real product, the AI never invents it."));
    const direct=req.generation && req.generation!=="staged";
    if(direct){
      if(!deps.directClip)throw new UserFacingError("Adaptateur vidéo directe indisponible ; aucune image ou vidéo stock substituée.");
      for(const [k,scene] of plan.scenes.entries()){
        const selected=req.sceneImages?.[k],photo=selected?getAsset(selected.assetId):null;
        if(selected&&(!photo||photo.project_id!==projectId||photo.deleted_at||photo.kind!=="image"||assetMeta<any>(photo).gate?.fatal))throw new UserFacingError("Référence indisponible ou refusée.");
        const reference=req.generation==="reference"?(photo?assetData(photo):refBuf):null;
        if(req.generation==="reference"&&!reference)throw new UserFacingError("Choisissez une photo autorisée de ce produit ou lieu, ou la génération directe sans référence.");
        const clipId=await step(`${key}:direct-scene-${k}`,async()=>{
          return acquireDirectScene(p,{ctx,index:k,key:assetKey(k,"clip"),rootKey:key,as:req.as,aspect,generation:req.generation as "direct"|"reference",scene,reference,referenceAssetId:photo?.id??(reference?refId:null),clipS:timing.clipS,minimumDurationS:timing.showS,progress:.1+k*.65/n,request:req.request,folderKey,prior:savedScene(k,"clip")??null,beforeAcquire:preserveClientVersion},deps);
        });
        clips.push({assetId:clipId,durationS:timing.clipS,generated:true});kept.push(k);
      }
    }else for (const [k, scene] of plan.scenes.entries()) {
      const selected=req.sceneImages?.[k];
      const photo=selected?getAsset(selected.assetId):null;
      if(selected && (!photo || photo.project_id!==projectId || photo.deleted_at || photo.kind!=="image" || assetMeta<any>(photo).gate?.fatal)) throw new UserFacingError("Photo de scène indisponible ou refusée : choisissez une référence valide du projet.");
      const sceneReference=photo?assetData(photo):refBuf;
      ctx?.progress(0.1 + (k * 0.65) / n, L(`Scène ${k + 1} : image puis mouvement`, `Scene ${k + 1}: image then motion`));
      const clipId = await step(`${key}:scene-${k}`, async () => {
        const stillId = await step(`${key}:still-${k}`, async () => {
          const prior=savedScene(k,"scene");if(prior) return prior.id;
          preserveClientVersion();ctx?.progress(.1+k*.65/n);
          const still = selected?.use==="reuse" && photo ? assetData(photo) : await videoReceipt(projectId,`${assetKey(k,"image")}:still:${k}`,()=>deps.keyframe(keyframePrompt(p, s, scene, aspect, !!sceneReference), aspect, sceneReference, `${assetKey(k,"image")}:still:${k}`));
          return (await saveAsset({ projectId, userId: p.userId, data: still, name: `scene-${k + 1}-image.png`, mime: "image/png", role: "scene", folderKey, origin: "generated", status: "review", sourceAssetId: photo?.id??refId, meta: { gate:{verdict:"PROVISIONAL",checked:false,fatal:false,reason:"Image à contrôler",provisional:{use:"manual"}}, scenes: { key:assetKey(k,"image"),rootKey:key, index: k, as: req.as, prompt: scene.still, role: scene.role ?? null }, recipe: "Image de départ d'une scène vidéo (IA d'images, produit réel en référence)" } })).id;
        });
        const stillAsset = getAsset(stillId);
        if (!stillAsset || stillAsset.project_id !== projectId || stillAsset.deleted_at) throw new UserFacingError(L("L'image de scène enregistrée n'est plus disponible : reprise bloquée, aucune régénération automatique.", "The saved scene image is unavailable: resume blocked, no automatic regeneration."));
        const reviewAsset = async (asset: NonNullable<ReturnType<typeof getAsset>>, frames:Buffer[], kind:string) => {
          if(assetMeta<any>(asset).gate?.fatal) throw new UserFacingError("Média refusé pour défaut fatal : inspection seule ; demandez une reprise ciblée.");
          if(isAutoUsable(asset) && assetMeta<any>(asset).gate?.checked === true) return;
          const checked = await step(`${key}:review-${kind}-${k}`, async()=>{
            preserveClientVersion();ctx?.progress(.1+k*.65/n);
            const review = frames.length && deps.reviewMedia ? JSON.parse((await videoReceipt(projectId,`${assetKey(k,kind==="image"?"image":"clip")}:qc:${kind}:${k}`,async()=>Buffer.from(JSON.stringify(await deps.reviewMedia!(frames,sceneReference??Buffer.alloc(0),`${scene.intent??scene.still}. Marque : ${p.brand?.name}. Comparer références et cohérence des images. Évaluer le mouvement uniquement dans les limites des images échantillonnées.`,`${assetKey(k,kind==="image"?"image":"clip")}:qc:${kind}:${k}`))))).toString()) as ShotReview : null;
            const decision = gateShot({review,expectsProduct:p.business!=="services"&&!!sceneReference,expectsCharacter:false,attempt:0,peopleAllowed:false});
            // Une identité inconnue n'est pas une identité contrôlée.
            if(p.business!=="services"&&sceneReference&&review && review.sameProduct == null && decision.verdict === "FINAL") return {...decision,verdict:"PROVISIONAL" as const,checked:false,reason:"Fidélité au produit non vérifiée",provisional:{use:"manual" as const,label:"needs_improvement" as const}};
            return decision;
          });
          const gate = gateSave({userId:p.userId,projectId,jobId:ctx?.job.id??null,assetId:asset.id},checked);
          const { run } = await import("../db");
          run("UPDATE assets SET status = ?, meta = ? WHERE id = ?",statusFor(checked),JSON.stringify({...assetMeta(asset),...gate.meta}),asset.id);
          if(checked.verdict !== "FINAL") throw new UserFacingError(`Scène ${k+1}, ${kind} à vérifier : ${checked.reason}. Version conservée, aucune relance payante automatique.`);
        };
        ctx?.progress(0.1 + (k * 0.65) / n);
        const still = assetData(stillAsset);
        await reviewAsset(stillAsset,[still],"image");
        const savedClipId = await step(`${key}:clip-asset-${k}`, async()=>{
        const prior=savedScene(k,"clip");if(prior) return prior.id;
        preserveClientVersion();ctx?.progress(.1+k*.65/n);
        const mp4 = await videoReceipt(projectId,`${assetKey(k,"clip")}:clip:${k}`,()=>deps.clip(still, motionPrompt(scene), aspect, timing.clipS, `${assetKey(k,"clip")}:clip:${k}`,req.generation),{readOnlyRecovery:true});
        const a = await saveAsset({ projectId, userId: p.userId, data: mp4, name: `scene-${k + 1}.mp4`, mime: "video/mp4", role: "clip", folderKey, origin: "generated", status: "review", sourceAssetId: stillAsset.id, meta: { gate:{verdict:"PROVISIONAL",checked:false,fatal:false,reason:"Plan à contrôler",provisional:{use:"manual"}}, scenes: { key:assetKey(k,"clip"),rootKey:key, index: k, as: req.as, motion: scene.motion, model: SCENE_VIDEO_MODEL } } });
        return a.id;
        });
        const savedClip = getAsset(savedClipId)!;
        await reviewAsset(savedClip,await (deps.frames??clipFrames)(assetData(savedClip)),"clip");
        return savedClipId;
      });
      clips.push({ assetId: clipId, durationS: timing.clipS, generated: true });
      kept.push(k);
    }
  } else {
    // 3. Services : une étape de la prestation par plan, cherchée sur Pixabay avec SES mots-clés (jamais cinq vidéos
    // générales du métier) ; plans d'illustration, jamais présentés comme des réalisations du client.
    const exclude = new Set<string>();
    for (const [k, scene] of plan.scenes.entries()) {
      ctx?.progress(0.1 + (k * 0.65) / n, L(`Scène ${k + 1} : plan libre de droits lié au métier`, `Scene ${k + 1}: royalty-free shot linked to the trade`));
      const topic = `${s?.name ?? ""} ${scene.intent ?? scene.still}`.slice(0, 200);
      // Une absence n'est pas un acquis : une reprise peut rechercher cette scène, sans refaire les autres.
      const found = await step(`${key}:stock-${k}`, async () => {
        const previous=savedScene(k,"clip");
        const clip = previous ? {assetId:previous.id,durationS:previous.duration??Number(assetMeta<any>(previous).durationS??0)} : await deps.stock(p, k, topic, aspect, timing.showS, exclude, `${key}:stock:${k}`, scene.stock);
        if (!clip || clip.durationS + 0.05 < timing.showS) throw new UserFacingError(L(`Scène ${k + 1} manquante ou trop courte : vidéo non livrée. Les autres scènes obtenues sont conservées.`, `Scene ${k + 1} missing or too short: video not delivered. Previously obtained scenes are preserved.`));
        const {run}=await import("../db");
        run("UPDATE assets SET meta=json_set(COALESCE(meta,'{}'),'$.scenes',json(?)) WHERE id=?",JSON.stringify({key:assetKey(k,"clip"),rootKey:key,index:k,as:req.as}),clip.assetId);
        return clip;
      });
      if (found) {
        clips.push({ ...found, generated: false });
        kept.push(k);
      }
      else notes.push(C(`scène ${k + 1} (${scene.intent ?? ""}) : aucun plan libre de droits assez proche de cette étape`, `scene ${k + 1} (${scene.intent ?? ""}): no royalty-free shot close enough to this step`));
    }
    if (clips.length < Math.min(2, plan.scenes.length)) throw new UserFacingError(L("Pas assez de plans libres de droits en rapport avec ce service pour une vidéo de qualité.", "Not enough royalty-free shots related to this service for a quality video."));
  }

  // 4. Titres sur la zone calme de chaque plan (ne masque ni le produit ni le geste ; contraste meilleur).
  plan.scenes = kept.map((k) => plan.scenes[k]);
  // Plans libres NON regardés (aucune IA de vision) : on ne sait pas quelle étape ils montrent vraiment ; aucun titre
  // ni voix ne l'affirme (seule l'accroche reste). Dit dans l'aperçu de validation.
  if (mode === "stock" && deps.visualCheck === false) {
    notes.push(C("Plans sélectionnés sur leurs mots-clés : contrôle visuel indisponible, contenu à vérifier. Aucune réalisation client affirmée.","Shots selected by keywords: visual review unavailable; content needs review. Not client work."));
  }
  for (const [k, c] of clips.entries()) {
    const sc = plan.scenes[k];
    if (!sc?.title || sc.place) continue;
    const a = getAsset(c.assetId);
    if (!a || a.kind !== "video") continue;
    const file = storagePath(a.storage_key);
    const z = fs.existsSync(file) ? await calmZone(file, Math.min(1.5, c.durationS / 2)) : null;
    if (z) {
      sc.place = z.place;
      // Fond clair : titre foncé (couleur sombre de la charte), jamais un texte blanc illisible ni une bande noire.
      if (z.lum > 165) sc.titleColor = brief.colors.bg;
    }
  }

  ctx?.progress(0.86, L("Montage : titres, logo, voix, musique", "Editing: titles, logo, voice, music"));
  const doc = applyWordingDeep(buildSceneDoc(req.binding?p:p0, clips, plan, aspect, req.as, timing, req.music !== false, brief), wording);

  doc.meta.retakeCount=req.repair?1:0;
  if(req.approval) doc.meta.retakeBudgetMicro=req.quotedGeneration?0:req.approval.retakeMicro??Math.floor(req.approval.capMicro/(n+1));
  doc.meta.editorial = {...videoContext(req.binding?p:p0,req.as,req.request,req.binding?s:req.subject,req.editorial),...(req.binding?{nativeBinding:req.binding}:{})};

  // 5. Voice only after an explicitly saved synthetic choice. A failed/missing requested voice is not a completed result.
  const chosenVoice = wantsSpeech?projectVoice(memory.preferences):null;
  if(chosenVoice) {
    if(!voiceAvailable(chosenVoice)) throw new UserFacingError("La voix choisie est indisponible : vidéo incomplète, médias conservés. Vérifiez sa configuration ou choisissez explicitement sans voix.");
    brief.voice.kokoroVoice=chosenVoice;
    if(req.quotedGeneration){
      const quoted=req.quotedGeneration.voice,lines=plan.scenes.map((s,k)=>[s.voice??'',k===doc.clips.length-1?plan.voiceEnd??'':''].filter(Boolean).join(' ').trim());
      const {voiceQuote}=await import("./openai-voice");
      if(!quoted||quoted.id!==chosenVoice||quoted.speed!==brief.voice.speed||quoted.lang!==(p.settings?.language==='en'?'en':'fr')||!isDeepStrictEqual(quoted.lines,lines)||(isOpenAIVoice(chosenVoice)&&lines.filter(Boolean).reduce((n,text)=>n+voiceQuote(text).capMicro,0)>quoted.capMicro))throw new UserFacingError("Le texte, la voix, la vitesse, la langue ou le plafond vocal a changé. Clips et anciens audios conservés ; aucun nouvel envoi vocal.");
    }
    await addVoice(projectId,p0.userId,doc,plan,brief,key,guide.script.wordsPer30s,synthLine,preserveClientVersion);
    notes.push(C("Voix synthétique choisie pour le projet. Sous-titres synchronisés par phrase mesurée, groupes répartis proportionnellement ; pas d'alignement mot à mot.","Project-selected synthetic voice. Subtitles timed by measured phrase, proportionally split; not word aligned."));
  } else {
    doc.subtitles.cues=doc.clips.flatMap((clip,k)=>{
      const text=[plan.scenes[k]?.voice??"",k===doc.clips.length-1?plan.voiceEnd??"":""].filter(Boolean).join(" ").trim();
      return text?measuredCues(clip.id,text,Math.max(.1,clip.durationS-.4),doc.subtitles.style.maxChars):[];
    });
    notes.push(C("Sans voix : texte intégral conservé en sous-titres, répartis sur la durée des scènes ; aucun alignement audio.","No voice: full text kept as captions across scene duration; no audio alignment."));
  }

  if(req.purpose==="site"){doc.clips.forEach(c=>c.overlays=[]);doc.subtitles.cues=[];doc.audio.voice=[];doc.meta.initialSlot=req.initialSlot;doc.meta.siteAmbience=true;doc.platform="shop_page";}
  preserveClientVersion();
  await step(`${key}:document`, async () => saveVideoVersion(projectId, docKey, doc, { note: C(`Vidéo en ${clips.length} scènes`, `${clips.length}-scene video`) }));
  const texts: Record<string, string | undefined> = { ...fields, line: plan.line, cta: plan.cta, voiceEnd: plan.voiceEnd };
  plan.scenes.forEach((sc, k) => Object.assign(texts, { [`title-${k}`]: sc.title, [`voice-${k}`]: sc.voice }));
  const videoAssetId = await deps.render(p0, docKey, doc, { generationCapMicro:req.approval?.capMicro,approvalScope:req.approval?.scope,approvalRequest:sceneApprovalRequest(req), scenes: { key, mode,purpose:req.purpose,initialSlot:req.initialSlot, subject: s ? { kind: s.kind, key: s.key, name: s.name } : null, request: req.request ?? null, as: req.as, music: req.music !== false }, creative: { family: brief.family, concept: brief.concept, goal: brief.goal, storyboard: storyboard.shots.map((x) => ({ role: x.role, intent: x.intent })), notes }, check: { texts, allowed } });

  if(req.purpose==="site"&&req.initialSlot&&videoAssetId){
    const {stateOf,commitState,inputHash}=await import("../preparation/store");const state=stateOf(projectId);
    const target=state?.stages.media?.data.slots.find(s=>s.key===req.initialSlot);
    if(state&&target&&(target.assetId??null)===(req.initialExistingAssetId??null)&&(!req.approval||videoScope(loadProject(projectId),sceneApprovalRequest(req))===req.approval.scope))commitState(projectId,state.revision,s=>{const slot=s.stages.media!.data.slots.find(x=>x.key===req.initialSlot)!;slot.assetId=videoAssetId;slot.posterId=all<{id:string}>("SELECT id FROM assets WHERE project_id=? AND source_asset_id=? AND role='video-poster' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",projectId,videoAssetId)[0]?.id;slot.reviewed=false;slot.inputHash=inputHash(s,"media");s.stages.media!.status="draft";});
    else notes.push("Affectation initiale modifiée : vidéo conservée dans la bibliothèque, aucun choix client écrasé.");
  }
  // 6. Mémoire créative : concept utilisé, médias et leur provenance (relus à la prochaine vidéo).
  try {
    rememberDirection(projectId, brief.concept);
    for (const c of clips) {
      const a = getAsset(c.assetId);
      const st = a ? assetMeta<{ stock?: { source: string; id: string | number; page?: string; license?: string } }>(a).stock ?? null : null;
      rememberMedia(projectId, { assetId: c.assetId, source: st ? st.source : "generated", ref: st ? String(st.page ?? st.id) : SCENE_VIDEO_MODEL, license: st?.license ?? (c.generated ? "généré pour le projet" : ""), role: "clip" });
    }
  } catch {
    // La mémoire est un confort : son échec ne bloque jamais la vidéo.
  }
  return { docKey, videoAssetId, costMicro: deps.spentMicro(key), mode, notes, brief, storyboard };
  });
}

/** Voix off par scène + phrase de fin ; durée mesurée ; sous-titres découpés par groupes de sens (2 lignes). */
export async function addVoice(projectId: string, userId: string, doc: VideoDocument, plan: ScenePlan, brief: CreativeBrief, key: string, words30: [number, number], synth = synthLine,beforeEach?:()=>void,revision?:{language:"fr"|"en";exactLines:readonly string[]}) {
  const lang: "fr" | "en" = revision?.language ?? (loadProject(projectId).settings?.language === "en" ? "en" : "fr");
  if(revision&&revision.exactLines.length!==doc.clips.length)throw new UserFacingError(L("Les phrases ne correspondent pas aux plans. Aucun texte transformé.","The phrases do not match the shots. No text transformed."));
  const texts=revision?.exactLines??sceneVoiceLines(plan,doc.clips.length),lines=doc.clips.map((clip,k)=>({clip,text:texts[k]}));
  const dir=tmpDir("voice");
  const pending:VideoDocument["audio"]["voice"]=[];
  const cues:VideoDocument["subtitles"]["cues"]=[];
  try {
    for(const [k,l] of lines.entries()) {
      if(!l.text) continue;
      beforeEach?.();
      const wav=path.join(dir,`v-${k}.wav`);
      const options={voice:brief.voice.kokoroVoice,speed:brief.voice.speed,lang};
      const acquired=synth===synthLine&&isOpenAIVoice(options.voice)?await acquiredVoice({projectId,userId},l.text,options):null;
      if(acquired)fs.writeFileSync(wav,assetData(acquired));
      const durationS=acquired?Number((await execTool("ffprobe",["-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",wav])).stdout.trim()):await synth(l.text,wav,options);
      if(!Number.isFinite(durationS)||durationS<=0||durationS>l.clip.durationS-.3) throw new UserFacingError(`Voix de la scène ${k+1} : phrase entière de ${durationS.toFixed(2)} s pour un plan de ${l.clip.durationS} s. Adaptez le texte ou la durée ; aucune phrase supprimée.`);
      const a=acquired??await saveAsset({projectId,userId,data:fs.readFileSync(wav),name:`voix-${k+1}.wav`,mime:"audio/wav",role:"voice",folderKey:doc.meta.intent==="video_ad"?"videos.ads":"videos.social",origin:"generated",status:"ready",meta:{voice:{engine:"kokoro",id:brief.voice.kokoroVoice,consent:"synthetic",key,text:l.text,speed:brief.voice.speed,lang,measuredDurationS:durationS,alignment:"measured_phrase_proportional_chunks"}}});
      pending.push({id:`voice-${l.clip.id}`,clipId:l.clip.id,assetId:a.id,text:l.text,offsetS:.2,durationS,gainDb:0});
      cues.push(...measuredCues(l.clip.id,l.text,durationS,doc.subtitles.style.maxChars));
    }
    doc.audio.voice=pending;doc.subtitles.cues=cues;doc.audio.voiceId=isOpenAIVoice(brief.voice.kokoroVoice)?brief.voice.kokoroVoice:`kokoro:${brief.voice.kokoroVoice}`;doc.audio.duckingDb=-12;
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
}

/** Branchement réel : Qwen (images), Wan 2.6 (plans), Pixabay (plans libres), rendu du studio, coûts du journal. */
export function realThreeScenesDeps(ctx: JobContext | null, base: { userId: string; projectId: string }, o: { aiText: boolean;request?:ThreeScenesRequest }): ThreeScenesDeps {
  const jobId = ctx?.job.id ?? null;
  return {
    writePlan: o.aiText
      ? async (p, s, req, key, pc) => {
          const { llmJson } = await import("../ai/llm");
          const lang = p.settings?.language === "en" ? "English" : "French";
          return llmJson(
            {
              task: "copywriting",
              ...base,
              jobId,
              usageKey: key,
              promptKey: "three-scenes-plan",
              routing: { difficulty: "standard", deliverable: "video_v2" },
              system: `${videoEditorialInstruction(req.editorial)}\nPurpose: ${req.as === "post" ? "useful organic editorial content, no forced commercial CTA" : "commercial advertising"}. You are the director of a creative agency writing a ${req.totalS ?? DEFAULT_TOTAL_S}-second film in ${req.scenes ?? SCENES} scenes. Answer with JSON only.${pc?.brain ? `\n\nPROJECT BRAIN (facts you may use; never invent anything else):\n${pc.brain}` : ""}`,
              prompt: `Brand "${p.brand?.name ?? ""}" (personality: ${(p.brand?.personality ?? []).join(", ")}). ${s?.kind === "service" ? "Service" : "Product"}: ${s?.name ?? p.product.name} — ${(s?.summary || p.product.summary || "")}.
${req.generation ? `Generation mode: ${req.generation}. A reference photo is optional in direct mode. Full existing project context (use confirmed facts only): ${JSON.stringify({business:p.business,product:p.product,services:p.services,brand:p.brand,strategy:p.strategy})}. No humans, body parts or fictional client work.\n` : ""}${req.request ? `Client's brief (follow it): ${req.request}\n` : ""}${pc ? `Creative sheet: concept "${pc.brief.concept}", treatment ${pc.brief.family}, goal ${pc.brief.goal}, rhythm ${pc.brief.rhythm}, voice ${pc.brief.voice.tone}.${pc.brief.audience ? ` Audience: ${pc.brief.audience}.` : ""}${pc.brief.benefit ? ` Main benefit: ${pc.brief.benefit}.` : ""}${pc.brief.proofs.length ? ` Available proofs: ${pc.brief.proofs.join("; ")}.` : " No proof available: claim nothing."}${pc.brief.objections.length ? ` Objections to answer: ${pc.brief.objections.slice(0, 3).join("; ")}.` : ""}
STORYBOARD starting proposal: adapt it to the exact client content and purpose, preserving trade relevance and coherent progression. One distinct shot per scene (each shot brings a different information): ${pc.storyboard.shots.map((x, k) => `${k + 1}. ${x.role} — ${x.intent}${x.still ? ` (${x.still})` : ""}`).join(" | ")}.
${pc.storyboard.route === "products" ? "PRODUCT: use only confirmed project characteristics; in reference mode preserve the supplied real product faithfully. Direct mode has no reference image: describe an illustrative product shot, never claim verified identity. Choose meaningful safe motion without inventing hidden features." : "SERVICE: each scene shows one real step or benefit of the service (imagined illustrative footage), never presented as the client's own work."}
ONLY the brand "${p.brand?.name ?? ""}" may appear or be spoken: never any other brand, logo or trademark anywhere (text, voice, objects, clothes, screens).
` : ""}Write ${req.scenes ?? SCENES} different scenes for a ${req.as === "ad" ? "paid ad" : "social post"} video: for each, "still" (in ${req.generation?lang:"English"}: the setting, light and mood of the opening image, the ${s?.kind === "service" ? "craft shown through tools, materials and results" : "real product as the hero"}), "motion" (in ${req.generation?lang:"English"}: the perceptible fluid motion and what moves in the scene, preserving documented product characteristics) and "title" (in ${lang}, 2 to 5 words shown on screen, or empty).
Then "line" (in ${lang}, a short brand line, max 8 words, no claim) and "cta" (${req.as === "post" ? "empty: no forced commercial action in an organic post" : `in ${lang}, 2-3 words button`}).
Per scene also "voice" (in ${lang}, natural spoken sentence, simple words, max 12 words, nothing invented) and "voiceEnd" (in ${lang}, closing sentence with the call to action, max 10 words). About ${Math.round((65 * (req.totalS ?? DEFAULT_TOTAL_S)) / 30)} words of voice in total.
Never any person, face, hand or body. Use only confirmed facts. Never invent numbers, prices, percentages, promises, awards or reviews. Preserve exact client-supplied text and sources. SERVICE scenes also include role, intent and stock:{queries:[precise English trade/gesture/environment searches],must:[required trade words],need:[[trade terms],[gesture terms]]}.
Optional per scene: "place": "lower" when the product fills the top of the frame; "titleSize": "large" only when it reads better or looks better (short punchy title, busy image), otherwise leave the usual size. Optional "endCard": "large" for a bold end card.
Reply { "scenes": [{ "still": "", "motion": "", "title": "" }, ...${req.scenes ?? SCENES}], "line": "", "cta": "" }.`,
              maxTokens: 4000,
            },
            ScenePlanSchema,
          );
        }
      : undefined,
    reviewMedia: o.aiText ? async(frames, reference, text, key)=>{
      if(o.request?.binding){
        if(!frames.length||frames.length>3)throw new UserFacingError("Le contrôle borné exige une à trois images du plan. Aucun appel de contrôle lancé.");
        const {project}=sceneSubjectContext(loadProject(base.projectId),o.request);
        const {videoShotReviewImages,videoShotReviewRequest}=await import("./shot-review-request");
        const {BoundedShotReviewSchema}=await import("./quality");
        const {llmJson}=await import("../ai/llm");
        const images=await videoShotReviewImages(frames,{product:project.business==='products'&&reference.length?reference:null,character:null,scene:project.business==='services'&&reference.length?reference:null});
        let call=videoShotReviewRequest(project,{...base,jobId,usageKey:key},images,text);
        if(o.request.quotedGeneration){
          const {assertBoundedSceneQuote}=await import("./bounded-quote");assertBoundedSceneQuote(o.request.quotedGeneration);
          const index=Number(key.match(/:direct-qc:(\d+)$/)?.[1]),quoted=o.request.quotedGeneration.scenes[index]?.review;
          if(!quoted||images.length>quoted.maximumImages)throw new UserFacingError("Le contrôle ne correspond pas au devis accepté.");
          call={...call,...quoted.envelope,expectedRoute:quoted.route};
          const {strictTextQuoteInput,callCostBoundMicro,withSelectedStrategy}=await import("../ai/llm");call=withSelectedStrategy(call);
          const tokens=strictTextQuoteInput({...call,images:undefined},BoundedShotReviewSchema),cap=callCostBoundMicro(quoted.route.provider,quoted.route.model,tokens.maximumTokens+images.length*3400,1500,quoted.route.effort??null);
          if(call.prompt!==quoted.prompt||cap==null||cap>quoted.capMicro)throw new UserFacingError("Le texte ou le tarif du contrôle a changé. Aucun nouvel appel de contrôle.");
        }
        return await llmJson(call,BoundedShotReviewSchema,{strict:true});
      }
      const { realVideoDeps } = await import("./deps");
      return realVideoDeps(ctx,loadProject(base.projectId),true).reviewShot(frames,{product:reference.length?reference:null,character:null},text,key);
    } : undefined,
    async directClip(image,prompt,aspect,seconds,key,generation){
      const route=sceneGenerationRoute(generation,seconds,aspect==="16:9"?"16:9":"9:16");if(!route.allowed)throw new UserFacingError(route.reason);
      const {wanTextClip,aiClip,higgsfieldClip}=await import("../ai/media-providers");
      const context={...base,jobId,usageKey:key};
      const generate=()=>image?aiClip(route.provider,context,{image,prompt,aspect:aspect==="16:9"?"16:9":"9:16",seconds:route.seconds,model:route.model,usage:"product_video",people:false}):(route.provider==='higgsfield'?higgsfieldClip:wanTextClip)(context,{prompt,seconds:route.seconds,model:route.model,usage:"text_video",aspect:aspect==="16:9"?"16:9":"9:16"});
      if(o.request?.quotedGeneration){
        const q=o.request.quotedGeneration,{assertBoundedSceneQuote}=await import("./bounded-quote");assertBoundedSceneQuote(q);
        const index=Number(key.match(/:direct:(\d+)$/)?.[1]),scene=q.scenes[index];
        if(!q.clip||!scene||scene.prompt!==prompt||q.generation!==generation||q.aspect!==(aspect==="16:9"?"16:9":"9:16")||q.seconds!==route.seconds||q.clip.provider!==route.provider||q.clip.model!==route.model||q.clip.unitMicro!==route.unitMicro||!!scene.reference!==!!image||scene.reference&&crypto.createHash("sha256").update(image!).digest("hex")!==scene.reference.sha256)throw new UserFacingError("La scène, sa référence ou sa route ne correspond plus au devis. Aucun clip lancé.");
        const {withQuotedVideoRoute}=await import("../ai/media-providers");return withQuotedVideoRoute(q.clip,generate);
      }
      return generate();
    },
    async keyframe(prompt, aspect, reference, key) {
      const { aiPostImage } = await import("../ai/media-providers");
      return aiPostImage({ ...base, jobId, usageKey: key }, { prompt, aspect, reference, logo: null,photoOnly:true });
    },
    async clip(image, prompt, aspect, seconds, key, generation) {
      if(generation==="staged"){const route=sceneGenerationRoute("staged",seconds,aspect==="16:9"?"16:9":"9:16");if(!route.allowed)throw new UserFacingError(route.reason);{const {aiClip}=await import("../ai/media-providers");return aiClip(route.provider,{...base,jobId,usageKey:key},{image,prompt,aspect:aspect==="16:9"?"16:9":"9:16",seconds:route.seconds,model:route.model,usage:"product_video",people:false},m=>ctx?.progress(.5,m));}}
      const { aiClip } = await import("../ai/media-providers");
      // Wan suit les proportions de l'image de départ (carré et 4:5 compris) ; ce paramètre ne sert qu'aux autres modèles.
      return aiClip("alibaba", { ...base, jobId, usageKey: key }, { image, prompt, aspect: aspect === "16:9" ? "16:9" : "9:16", seconds, model: SCENE_VIDEO_MODEL, usage: "product_video" }, (m) => ctx?.progress(0.5, m));
    },
    async stock(p, index, topic, aspect, seconds, exclude, key, stepQ) {
      const { findStockClip } = await import("../stock/stock-clip");
      return findStockClip({ ...base, jobId }, p, { topic, part: ["hook", "demonstration", "result"][index % 3] ?? "development", aspect, durationS: seconds, index, key, step: stepQ }, exclude);
    },
    visualCheck: llmConfigured(),
    spentMicro: (prefix) => all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key LIKE ?", `${prefix}%`)[0]?.c ?? 0,
    async render(p, docKey, doc, meta) {
      const initialVersion=latestVideo(p.id,docKey)?.version.id??null;
      let ex = await renderVideoFile(p.id, doc,{onProgress:x=>ctx?.progress(.86+x*.08,L(`Rendu ${Math.round(x*100)} %`,`Rendering ${Math.round(x*100)} %`))});
      try {
        // Contrôle du fichier final (grille du guide créatif), mesuré sur la vidéo rendue, enregistré avec elle.
        // Titre peu lisible : seuls les plans concernés changent de couleur, puis UN nouveau rendu (gratuit, local).
        const chk = meta.check as { texts: Record<string, string | undefined>; allowed: string[] } | undefined;
        let check: unknown = null;
        if (chk) {
          try {
            const { finalCheck, checkSummary } = await import("./final-check");
            const opts = { texts: chk.texts, allowed: chk.allowed, darkInk: doc.brand.palette.dark };
            let items = await finalCheck(doc, ex, opts);
            const fixes = items.find((i) => i.id === "contrast")?.fixes;
            if (fixes && Object.keys(fixes).length) {
              for (const c of doc.clips) for (const l of c.overlays) if (fixes[c.id] && l.kind === "text") {
                const dark = fixes[c.id] !== "#FFFFFF";
                Object.assign(l, { color: fixes[c.id], shadow: { ...(l.shadow ?? { blur: 12, x: 0, y: 0 }), color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)", y: dark ? 0 : l.shadow?.y ?? 2 } });
              }
              fs.rmSync(ex.dir, { recursive: true, force: true });
              ex = await renderVideoFile(p.id, doc);
              items = await finalCheck(doc, ex, opts);
              items.push({ id: "targeted_fix", label: "Correction ciblée", status: "ok", detail: `titre repris sur ${Object.keys(fixes).join(", ")} (le reste de la vidéo inchangé)` });
            }
            check = { items, summary: checkSummary(items) };
          } catch (e) {
            check = { error: (e as Error).message.slice(0, 200) };
          }
        }
        if(typeof meta.generationCapMicro==="number" && ctx) {const spent=all<{cost:number}>("SELECT COALESCE(SUM(cost),0) cost FROM ai_calls WHERE job_id=?",ctx.job.id)[0]?.cost??0;doc.meta.retakeBudgetMicro=Math.max(0,Math.min(doc.meta.retakeBudgetMicro??0,meta.generationCapMicro-spent));}
        const { check: _c, ...rest } = meta;
        if((latestVideo(p.id,docKey)?.version.id??null)!==initialVersion || (meta.approvalScope && videoScope(loadProject(p.id),meta.approvalRequest)!==meta.approvalScope)) {
          const conflictKey=`${docKey}:conflict:${crypto.randomUUID().slice(0,8)}`;
          const preserved=await saveRendered(p.id,p.userId,conflictKey,doc,ex,{...rest,editConflict:true,gate:{verdict:"PROVISIONAL",checked:false,fatal:false,provisional:{use:"manual",label:"needs_improvement"},reason:"Modification pendant le rendu"}});
          saveVideoVersion(p.id,conflictKey,doc,{note:"Rendu isolé : modification concurrente conservée",renderedAssetId:preserved.videoId});
          throw new UserFacingError("Vidéo modifiée pendant l'encodage : version client conservée ; rendu isolé dans la bibliothèque pour vérification.");
        }
        ctx?.progress(.96,"Enregistrement du rendu");
        const saved = await saveRendered(p.id, p.userId, docKey, doc, ex, { ...rest, finalCheck: check, gate:{verdict:"PROVISIONAL",fatal:false,checked:false,reason:"Montage rendu, validation créative requise",provisional:{use:"manual",label:"needs_improvement"}} });
        saveVideoVersion(p.id, docKey, doc, { note: C("Rendu", "Render"), renderedAssetId: saved.videoId });
        return saved.videoId;
      } finally {
        fs.rmSync(ex.dir, { recursive: true, force: true });
      }
    },
  };
}

/** Existing scene director, run alone so the client reviews its script before any image/clip. */
export async function runSceneScenario(ctx:JobContext|null,projectId:string,req:ThreeScenesRequest,injected?:ThreeScenesDeps["writePlan"]) {
 return req.purpose==='site'?withSiteStrategy(projectId,()=>runSceneScenarioInScope(ctx,projectId,req,injected)):withCommunicationStrategy(projectId,()=>runSceneScenarioInScope(ctx,projectId,req,injected),{angleId:req.angleId});
}
async function runSceneScenarioInScope(ctx:JobContext|null,projectId:string,req:ThreeScenesRequest,injected?:ThreeScenesDeps["writePlan"]){
 if(req.as==="ad")assertAdvertising(projectId);
 const root=loadProject(projectId),{subject,project:p}=sceneSubjectContext(root,req);
 const scope=videoScope(root,sceneApprovalRequest(req));
 const size=SIZES[req.aspect??"9:16"],guide=loadVideoGuide();
 const brief=buildCreativeBrief(p,{request:req.request,durationS:req.totalS??15,width:size.w,height:size.h,platform:"reels",guide,memory:loadCreativeMemory(projectId,root)});
 const storyboard=buildStoryboard(p,req.scenes??3,{serviceName:subject?.kind==="service"?subject.name:null,productName:subject?.kind==="service"?null:subject?.name??p.product.name});
 const writer=injected??realThreeScenesDeps(ctx,{userId:root.userId,projectId},{aiText:true}).writePlan;
 if(!writer) throw new UserFacingError("Rédaction du scénario indisponible ; aucun média lancé.");
 const key=`scenario:${projectId}:${scope}:${ctx?.job.id??"direct"}`;
 ctx?.progress(.1,"Rédaction du scénario, avant les médias");
 const raw=await videoReceipt(projectId,key,async()=>Buffer.from(JSON.stringify(await writer(p,subject,req,key,{storyboard,brief,brain:brainView(req.binding?p:root,"video").stable}))));
 const scenario=ScenePlanSchema.parse(JSON.parse(raw.toString()));
 if(scenario.scenes.length!==(req.scenes??3)) throw new UserFacingError("Scénario incomplet : nombre de scènes non respecté, aucun média lancé.");
 if(videoScope(loadProject(projectId),sceneApprovalRequest(req))!==scope) throw new UserFacingError("Projet modifié pendant la rédaction : scénario conservé, validation à reprendre.");
 return {scope,request:sceneApprovalRequest(req),scenario:applyWordingDeep(scenario,loadWordingRules(projectId))};
}
