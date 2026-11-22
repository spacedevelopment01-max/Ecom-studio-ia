/**
 * Chaîne de création de la marque par SINA (décisions du propriétaire du 12 novembre 2026 ; méthode en sept temps :
 * `docs/sina-savoir/methode-creation-de-marque.md`). Elle remplace « trois identités en un seul appel » :
 *
 *   1. comprendre le marché (recherche sur le web : paroles réelles de clients avec leur source, concurrents, usages) ;
 *   2. l'aveu et l'adversaire, 3. les idées de marque (deux épreuves : le contraire, nous seuls) ;
 *   4. les noms, par équipes SÉPARÉES qui suivent chacune un seul chemin ;
 *      puis un premier jugement compose les routes (une idée + un nom), avec les noms du propriétaire comme mesure ;
 *   5. la vérification des noms (web seulement, dit au client) ;
 *   6. la voix, 7. les signes et les situations : la planche de chaque route ;
 *   enfin le directeur de création relit, exige une reprise, et RELIT LA REPRISE (leçon du premier essai).
 *
 * Tâche de fond : chaque appel payant est un point de reprise (une relance ne repaie rien) ; un plafond de dépense
 * borne la tâche entière ; rien n'est inventé (une parole de client que le Studio ne retrouve pas dans l'extrait de sa
 * page est supprimée ; ce qui n'est pas vérifié est écrit dans « ce qui reste à prouver »).
 */
import { ficheTexte, goutsPour, notesDuProjet } from "./fiche";
import { DEFAULT_MODELS } from "./models";
import { z } from "zod";
import { domainDeps, domainLine, findDomains, type NameDomains } from "./brand-domains";
import { UserFacingError, getJob, type JobContext } from "../jobs";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { assetData, getAsset } from "../library";
import { getJsonSetting } from "../settings";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { aiSiteImageHd, photoRequestMaxMicro, withQuotedImageRoute } from "../ai/media-providers";
import { CostCapReached, withTrace } from "../ai/trace";
import { consigneUneFamille, webResearch, webSearchQuoteMicro, type ResearchCategory, type WebFinding } from "../ai/web-search";
import { safeFetch } from "../engine/import-link";
import { planOfProject } from "../plan-gates";
import { json as parseJson } from "../db";
import { CREATED_SLOTS, FINISH_SLOTS, PROPOSAL_SLOTS, SLOT_ASPECT, SLOT_REFERENCES, boardImageRoute, brandImagesOn, clientLogoOf, proposalImagery, runBoardImages, type ImageAspect, type ImageSlot } from "./brand-images";
import { BoardSchema, WordmarkSchema, type Board } from "./brand-board";
import { brandKnowledgeReady } from "./brand-knowledge";
import * as P from "./brand-prompts";
import { NAME_REFUSALS } from "./brand-references";
import { RouteSchema, clientFacts, isReferenceName, nameIssues, routeCountFor, routeIssues, routeKeys, safeWordmark, withHonestProofs, type Route, type RouteKey } from "./brand-routes";
import { IdentitySchema, briefFromJourney, keepConstraints, nameKindsFor, normText, prepareIdentities } from "./identities";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { marquesRecentes, varierIdentites, varieteMarquesBrief } from "./variete-marques";

export const SINA_BRAND_JOB = "syna.brand";

// ---------------------------------------------------------------- réglages et devis

type Tier = "strong" | "craft";
export type ChainModel = { provider: "anthropic"; model: string; effort: string };
export type ChainSettings = { teams: number; strong: ChainModel; craft: ChainModel };
/**
 * Réglage « économe » (avis donné au propriétaire le 12 novembre 2026, à mesurer sur un essai réel) : le modèle le
 * plus fort là où il trouve l'idée, compose, dessine la planche et juge ; un modèle moins coûteux pour l'étude, les
 * équipes de noms et la vérification. Modifiable sans code : réglage `sina.brand_chain`.
 */
export const DEFAULT_CHAIN: ChainSettings = {
  teams: 4,
  strong: DEFAULT_MODELS.strong,
  craft: DEFAULT_MODELS.craft,
};
export function chainSettings(): ChainSettings {
  const s = getJsonSetting<Partial<ChainSettings>>("sina.brand_chain", {});
  const teams = Number.isFinite(s.teams) ? Math.min(6, Math.max(2, Math.round(s.teams!))) : DEFAULT_CHAIN.teams;
  return { teams, strong: { ...DEFAULT_CHAIN.strong, ...(s.strong ?? {}) }, craft: { ...DEFAULT_CHAIN.craft, ...(s.craft ?? {}) } };
}

/** Déroulé habituel de chaque appel (jetons d'entrée, de sortie avec la réflexion, et limite de sortie). */
const CALLS = {
  study: { tier: "craft", input: 30_000, output: 7_000, max: 12_000 },
  strategy: { tier: "strong", input: 22_000, output: 12_000, max: 20_000 },
  team: { tier: "craft", input: 12_000, output: 9_000, max: 16_000 },
  shortlist: { tier: "strong", input: 26_000, output: 9_000, max: 16_000 },
  // Le juge des noms : il lit tous les noms des équipes et ne rend que ceux qu'il garde (épreuves du propriétaire).
  judge: { tier: "strong", input: 16_000, output: 3_000, max: 7_000 },
  verify: { tier: "craft", input: 12_000, output: 2_500, max: 6_000 },
  direction: { tier: "strong", input: 18_000, output: 10_000, max: 18_000 },
  review: { tier: "strong", input: 26_000, output: 6_000, max: 10_000 },
  fix: { tier: "strong", input: 22_000, output: 10_000, max: 18_000 },
  recheck: { tier: "strong", input: 30_000, output: 4_000, max: 8_000 },
  // Le lecteur qui ne sait rien : il ne lit que les phrases courtes des planches (très peu de texte).
  reader: { tier: "strong", input: 2_500, output: 2_500, max: 5_000 },
  // Images de la planche (réglage `sina.brand_images`) : la direction artistique écrit les consignes ; un modèle
  // qui voit relit les images d'une planche.
  imagery: { tier: "strong", input: 7_000, output: 6_000, max: 10_000 },
  // Le relecteur des images : le modèle le plus fort, une image à la fois (21 novembre 2026).
  look: { tier: "strong", input: 9_000, output: 2_500, max: 6_000 },
} as const satisfies Record<string, { tier: Tier; input: number; output: number; max: number }>;
type CallId = keyof typeof CALLS;
const RESEARCHES = 3;
/** Pages lues par l'étude (les extraits sont raccourcis) : borne l'entrée de l'appel, donc son coût. */
const MAX_STUDY_PAGES = 45;
/** Pages relues par le Studio pour vérifier les paroles de clients (lecture gratuite). */
const MAX_PAGES_REREAD = 16;

/** Nombre d'appels de chaque sorte selon le travail demandé (série complète, ou reprise de quelques routes). */
function callCounts(routes: number, teams: number, fresh: boolean, images = false): Record<CallId, number> {
  // strategy : un second tour d'idées quand trop peu passent les deux épreuves ; fix : une reprise OU un remplacement par route.
  return { study: fresh ? 1 : 0, strategy: fresh ? 2 : 0, team: fresh ? teams : 0, shortlist: 1, judge: 1, verify: 1, direction: routes, review: 1, fix: routes, recheck: 1, reader: 1, imagery: images ? routes : 0, look: images ? routes : 0 };
}

export type ChainQuote = { maxMicro: number; probableMicro?: number };
/**
 * Devis de la chaîne. Plafond : la somme des coûts MAXIMAUX de tous ses appels (aucun appel ne part au-delà).
 * Coût probable : le déroulé habituel, avec la reprise d'une route sur deux. Mesure du 12 novembre 2026 (essai réel,
 * 3 identités, 20 appels, 14 minutes) : 2,88 € dépensés pour un plafond de 7,83 €.
 */
export function chainQuote(o: { routes: number; fresh?: boolean; settings?: ChainSettings; images?: boolean; /** Noms choisis par le client : ni recherche, ni juge. */ imposed?: boolean }): ChainQuote {
  const s = o.settings ?? chainSettings(), fresh = o.fresh !== false, images = o.images ?? brandImagesOn(), n = callCounts(o.routes, s.teams, fresh, images);
  if (o.imposed) { n.team = 0; n.judge = 0; }
  // La direction artistique et la relecture des images sont comptées avec les images (boardImagesQuote), une seule fois.
  if (images) { n.imagery = 0; n.look = 0; }
  // Recherches sur le web : faites par le modèle « métier » (réglage économe), pas par le modèle le plus fort.
  const search = webSearchQuoteMicro(s.craft) ?? 0, searches = (fresh ? RESEARCHES : 0) + 1;
  // Coût probable d'une recherche : la moitié de son maximum (essai réel du 12 novembre 2026 : 0,16 à 0,45 € pour 0,50 € au plus).
  let max = search * searches, probable: number | null = (search * searches) / 2;
  const boundOf = {} as Record<CallId, number>;
  for (const id of Object.keys(CALLS) as CallId[]) {
    const c = CALLS[id], m = s[c.tier];
    const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort);
    const usual = estimateCallMicro(m.provider, m.model, c.input, c.output);
    boundOf[id] = bound ?? (usual ?? 0) * 4;
    max += (bound ?? (usual ?? 0) * 4) * n[id];
    probable = probable == null || usual == null ? null : probable + usual * (id === "fix" ? Math.ceil(n[id] / 2) : n[id]);
  }
  // Second tour de noms (une fois au plus, quand trop peu de noms passent le juge) : compté dans le plafond seulement.
  if (!o.imposed) max += boundOf.team * s.teams + boundOf.judge;
  if (images) { const q = boardImagesQuote(o.routes, s, PROPOSAL_SLOTS); max += q.maxMicro; probable = probable == null || q.probableMicro == null ? null : probable + q.probableMicro; }
  return { maxMicro: Math.ceil(max), ...(probable ? { probableMicro: Math.ceil(probable) } : {}) };
}

/**
 * Devis de l'aperçu des noms seuls sur un projet déjà étudié (l'étude, les idées et les noms déjà trouvés ne sont pas
 * repayés) : le juge des noms, puis, compté comme probable, le second tour de recherche et son juge.
 */
export function namesPreviewQuote(settings?: ChainSettings): ChainQuote {
  const s = settings ?? chainSettings();
  let max = 0, probable: number | null = 0;
  for (const [id, times] of [["judge", 2], ["team", s.teams]] as const) {
    const c = CALLS[id], m = s[c.tier];
    const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort), usual = estimateCallMicro(m.provider, m.model, c.input, c.output);
    max += (bound ?? (usual ?? 0) * 4) * times;
    probable = probable == null || usual == null ? null : probable + usual * times;
  }
  return { maxMicro: Math.ceil(max), ...(probable ? { probableMicro: Math.ceil(probable) } : {}) };
}

/** Borne d'UNE image de planche : la formule de sa réservation (tarif inconnu : une erreur, jamais un prix deviné). */
const imageUnitMax = (aspect: ImageAspect, references: number) => photoRequestMaxMicro(boardImageRoute(), { prompt: "x".repeat(6000), references, aspect, quality: "high" });
/**
 * Devis des images de planche SEULES (direction artistique, six images, relecture, par planche). Le coût probable
 * d'une image est sa borne sans la marge de réservation (un quart) ; une image refusée à la relecture est payée.
 */

export function boardImagesQuote(routes: number, settings?: ChainSettings, slots?: readonly ImageSlot[]): ChainQuote {
  const s = settings ?? chainSettings();
  let max = 0, probable: number | null = 0;
  const list = slots?.length ? CREATED_SLOTS.filter((x) => slots.includes(x)) : CREATED_SLOTS;
  for (const slot of list) { const unit = imageUnitMax(SLOT_ASPECT[slot], SLOT_REFERENCES[slot]); max += unit * routes; probable += (unit / 1.25) * routes; }
  // Le logo seul ne réécrit jamais la direction artistique (audit du 22 novembre 2026, 2.3) : elle n'est pas comptée.
  const logoSeul = list.length === 1 && list[0] === "logo";
  for (const id of (logoSeul ? ["look"] : ["imagery", "look"]) as ("imagery" | "look")[]) {
    // La relecture se fait image par image : une relecture par image.
    const c = CALLS[id], m = id === "look" ? { ...s[c.tier], effort: "high" } : s[c.tier], n = id === "look" ? Math.max(1, list.length) : 1;
    const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort), usual = estimateCallMicro(m.provider, m.model, c.input, c.output);
    max += (bound ?? (usual ?? 0) * 4) * routes * n;
    probable = probable == null || usual == null ? null : probable + usual * routes * n;
  }
  return { maxMicro: Math.ceil(max), ...(probable ? { probableMicro: Math.ceil(probable) } : {}) };
}

/**
 * Devis de la marque FINIE pour l'identité choisie : les images qui lui manquent (par défaut l'objet, les signes et les
 * trois publications), leur relecture, et la direction artistique si elle doit être réécrite. Le logo adopté, ses
 * déclinaisons et la charte sont rendus par le Studio, sans IA.
 */
export function finishQuote(slots: readonly ImageSlot[] = FINISH_SLOTS, settings?: ChainSettings): ChainQuote {
  const q = boardImagesQuote(1, settings, slots);
  // Le symbole seul, tiré du logo : une image carrée avec le logo en référence (sa relecture est déjà comptée avec celle des images).
  const unit = imageUnitMax("1:1", 1);
  return { maxMicro: q.maxMicro + unit, ...(q.probableMicro ? { probableMicro: Math.ceil(q.probableMicro + unit / 1.25) } : {}) };
}

// ---------------------------------------------------------------- formes rendues par les spécialistes

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const StudySchema = z.object({
  quotes: z.array(z.object({ text: z.string().min(1).max(600), url: z.string().max(2000) })).max(60).default([]),
  competitors: z.array(z.object({ name: z.string().min(1).max(80), url: z.string().max(2000).default(""), codes: z.string().max(300).default("") })).max(20).default([]),
  mould: z.string().max(600).default(""),
  substitutes: z.array(z.string().max(240)).max(10).default([]),
  facts: z.array(z.object({ text: z.string().min(1).max(400), url: z.string().max(2000) })).max(20).default([]),
  notFound: z.array(z.string().max(240)).max(10).default([]),
});
export type Study = z.infer<typeof StudySchema> & { sources: number; dropped: number };

const StrategySchema = z.object({
  job: z.string().max(400).default(""),
  confessions: z.array(z.object({ text: z.string().min(1).max(300), quotes: z.array(z.number().int().min(0)).max(40).default([]) })).min(1).max(5),
  ideas: z.array(z.object({
    id: z.string().min(1).max(8), belief: z.string().min(1).max(300), confession: z.number().int().min(0).default(0),
    enemy: z.string().min(1).max(300), proof: z.string().min(1).max(300), cost: z.string().min(1).max(300),
    opposite: z.string().max(300).default(""), onlyUs: z.string().max(300).default(""), tone: z.string().max(160).default(""), strong: z.boolean().default(true),
  })).min(4).max(14),
});
export type Strategy = z.infer<typeof StrategySchema>;

const TeamSchema = z.object({ names: z.array(z.object({ name: z.string().min(1).max(60), detail: z.string().max(240).default(""), second: z.string().max(240).default(""), idea: z.string().max(8).default("") })).min(5).max(80) });
export type PoolName = z.infer<typeof TeamSchema>["names"][number] & { team: string };

const GROUNDS = ["blanc", "degrade", "sombre", "uni"] as const;
const ShortlistSchema = z.object({
  routes: z.array(z.object({
    idea: z.string().min(1).max(8), name: z.string().min(1).max(40), detail: z.string().max(240).default(""), second: z.string().max(240).default(""),
    why: z.string().max(400).default(""), trials: z.string().max(400).default(""), risks: z.array(z.string().max(240)).max(5).default([]),
    tone: z.string().max(160).default(""), ground: z.enum(GROUNDS), hue: z.string().max(60).default(""), type: z.string().max(80).default(""), reserve: z.boolean().default(false),
  })).min(1).max(10),
});
type Pick = z.infer<typeof ShortlistSchema>["routes"][number];
const JudgeSchema = z.object({
  kept: z.array(z.object({ name: z.string().min(1).max(60), seen: z.string().max(260).default(""), why: z.string().max(260).default("") })).max(12).default([]),
  almost: z.array(z.object({ name: z.string().min(1).max(60), why: z.string().max(260).default("") })).max(6).default([]),
});

const VerifySchema = z.object({ checks: z.array(z.object({ name: z.string().max(60), taken: z.boolean().default(false), url: z.string().max(2000).default(""), note: z.string().max(300).default("") })).max(12).default([]) });

/** Route telle que la rend la direction artistique : la planche avec ses pictogrammes encore en SVG brut. */
const DraftBoard = BoardSchema.omit({ nameCheck: true, domains: true, signs: true, wordmark: true, idea: true, hero: true, object: true, site: true, posts: true, images: true }).extend({
  idea: BoardSchema.shape.idea.omit({ confessionSupport: true }),
  signs: z.array(BoardSchema.shape.signs.element.omit({ symbol: true, art: true }).extend({ symbolSvg: z.string().max(6000).default("") })).min(3).max(5),
  // Aucun dessin en code dans ce brouillon (lettre remplacée comprise) : les images de la planche sont créées à part.
  // « cut » (la vague qui coupe le nom) est le geste de « Pulpe » : jamais redonné à une nouvelle marque (retour du
  // propriétaire du 14 novembre 2026 : « Pelage et Coussinet, le logo c'est la même conception que Pulpe »).
  wordmark: WordmarkSchema.omit({ symbol: true, swap: true, cut: true }).extend({ symbolSvg: z.string().max(6000).default("") }),
  object: BoardSchema.shape.object.omit({ art: true }),
  site: BoardSchema.shape.site.omit({ art: true }),
  posts: z.array(BoardSchema.shape.posts.element.omit({ art: true })).length(3),
});
const DraftSchema = IdentitySchema.pick({ name: true, slogan: true, promise: true, territory: true, ground: true, gradient: true, palette: true, fonts: true, tone: true }).extend({
  nameWhy: z.string().max(400).default(""), nameAnchor: z.string().max(120).default(""), nameExpression: z.string().max(200).default(""),
  sloganTone: z.string().max(160).default(""), paletteFamily: z.string().max(120).default(""), fontStyle: z.string().max(120).default(""), why: z.string().max(500).default(""),
  board: DraftBoard,
});
type Draft = z.infer<typeof DraftSchema>;

export const ReaderSchema = z.object({ texts: z.array(z.object({ id: z.string().max(12), understood: z.string().max(400).default(""), clear: z.boolean().catch(true), why: z.string().max(300).default("") })).max(40).default([]) });
/** Les phrases courtes d'une planche que lisent les clients de la marque (jamais un texte gardé mot pour mot du client). */
export function readerTexts(x: Route, keptSlogan = false): { id: string; label: string; text: string }[] {
  const b = x.board;
  return [
    ...(keptSlogan ? [] : [{ id: `${x.key}-s`, label: "la signature", text: x.slogan }]),
    { id: `${x.key}-t`, label: "le titre du site", text: b.site.headline }, { id: `${x.key}-b`, label: "le bouton du site", text: b.site.button },
    ...b.posts.map((q, i) => ({ id: `${x.key}-p${i + 1}`, label: `la publication ${i + 1}`, text: q.text })),
  ].filter((t) => t.text?.trim());
}
const ReviewSchema = z.object({
  routes: z.array(z.object({
    key: z.string().max(2), score: z.number().min(0).max(10).default(0), verdict: z.enum(["garder", "reprendre"]).catch("reprendre"), fixes: z.array(z.string().max(400)).max(10).default([]),
    /** Le nom lui-même ne tient pas : une réserve déjà vérifiée le remplace (jamais un nom changé pendant une reprise). */
    replaceName: z.boolean().default(false).catch(false), nameDoubt: z.string().max(400).default(""),
  })).max(4).default([]),
  series: z.string().max(600).default(""),
});
const RecheckSchema = z.object({ routes: z.array(z.object({ key: z.string().max(2), better: z.boolean().default(true), remaining: z.array(z.string().max(400)).max(8).default([]), score: z.number().min(0).max(10).default(0) })).max(4).default([]) });

// ---------------------------------------------------------------- accès aux modèles (remplaçable par les tests)

export type ChainAi = {
  /** Recherche sur le web : les pages trouvées (liens vérifiés, places de marché exclues). */
  research: (id: string, query: string, /** La seule famille de pages cherchée. */ famille?: ResearchCategory) => Promise<WebFinding[]>;
  /** Appel d'un spécialiste, réponse contrôlée par son schéma. */
  ask: <S extends z.ZodType>(id: string, call: { system: string; prompt: string; schema: S; kind: CallId; prepare?: (raw: unknown) => unknown }) => Promise<z.infer<S>>;
  /** Création d'UNE image par le modèle d'images du Studio (route des images de SINA), avec ses images de référence. */
  draw: (id: string, call: { prompt: string; aspect: ImageAspect; logo?: Buffer | null; scene?: Buffer | null; /** Image montrée pour ne pas la refaire. */ avoid?: Buffer | null; /** Les 50 logos aimés du propriétaire, seulement comme exemples. */ examples?: Buffer | null }) => Promise<Buffer>;
  /** Relecture par un modèle qui voit : des images et une consigne, réponse contrôlée par son schéma. */
  /**
   * Le résumé du client, le même pour toute la chaîne (22 novembre 2026) : une demande qui commence par lui l'envoie à
   * part, gardé en mémoire chez le fournisseur après la consigne, au lieu de le relire au plein prix à chaque appel.
   */
  partage?: (brief: string) => void;
  look: <S extends z.ZodType>(id: string, call: { system: string; prompt: string; schema: S; images: { data: Buffer; label?: string }[]; /** Images identiques pour tous les clients (planche des logos aimés) : en tête, gardées en mémoire. */ fixes?: { data: Buffer; label?: string }[] }) => Promise<z.infer<S>>;
};
export const brandChainDeps: { ai?: (ctx: JobContext) => ChainAi } = {};
/** Le contrôle des noms de domaine interroge le registre : sous une IA simulée (essais), seulement si le test fournit aussi le registre. */
const domainsOn = () => !brandChainDeps.ai || !!domainDeps.lookup;

/**
 * Travail en différé pour les textes de la chaîne (lot 2) : moitié prix chez Anthropic, avec une attente bornée (voir
 * `ai/llm.ts`). Les images n'en profitent pas : le modèle d'images n'a pas de tarif différé. Réglage `sina.differe`
 * (allumé par défaut ; « false » pour comparer avec le direct pendant un essai).
 */
export const deferredOn = (): boolean => getJsonSetting<boolean>("sina.differe", true) !== false;

/** Les appels de la chaîne qui reviennent, l'un après l'autre, avec la même consigne (un par route). */
const REPETES = new Set<CallId>(["direction", "fix", "imagery", "team"]);
/** Les appels de la chaîne dont la consigne ne sert qu'une fois par projet : aucun point de mémoire. */
const UNIQUES = new Set<CallId>(["study", "shortlist", "verify", "reader"]);

/** Une demande qui commence par le résumé du client, coupée en deux : le résumé à part (gardé en mémoire), le reste. */
export function coupeLeResume(commun: string, kind: CallId, prompt: string): { context?: string; prompt: string } {
  return commun && REPETES.has(kind) && prompt.startsWith(`${commun}\n\n`) ? { context: commun, prompt: prompt.slice(commun.length + 2) } : { prompt };
}

function realAi(ctx: JobContext, who: { userId: string; projectId: string }, s: ChainSettings, capMicro: number, direct = false): ChainAi {
  const scope = (step: string) => ({ jobId: ctx.job.id, projectId: who.projectId, step, costCapMicro: capMicro });
  // Une retouche ou la fin de la marque part en direct : le client attend devant, et le différé n'y fait gagner que
  // quelques centimes pour un quart d'heure d'attente (essai réel : vingt minutes pour quatre logos).
  const deferred = deferredOn() && !direct;
  let commun = "";
  /** La demande coupée en deux : le résumé du client à part (gardé en mémoire), le reste propre à l'appel. */
  // Seulement pour les appels qui reviennent plusieurs fois avec la même consigne (un par route) : la mise
  // en mémoire se paie à l'écriture, elle ne rapporte que si elle est relue.
  const coupe = (kind: CallId, prompt: string) => coupeLeResume(commun, kind, prompt);
  return {
    partage: (brief) => { commun = brief.length >= 400 ? brief : ""; },
    research: async (id, query, famille) => (await withTrace(scope(`brand-${id}`), () => webResearch({ userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:web:${id}`, prefer: s.craft, ...(famille ? { consigne: consigneUneFamille(famille) } : {}) }, query))).findings,
    ask: (id, c) => withTrace(scope(`brand-${id}`), () => llmJson({
      task: "strategy", userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, system: c.system, ...coupe(c.kind, c.prompt), ...(UNIQUES.has(c.kind) ? { teteUnique: true } : {}), promptKey: `syna-brand-${c.kind}-1`,
      prepare: c.prepare, maxTokens: CALLS[c.kind].max, maxOutputTokens: CALLS[c.kind].max + 6000, usageKey: `${ctx.job.id}:brand:${id}`, deferred,
      routing: { difficulty: CALLS[c.kind].tier === "strong" ? "complex" : "standard", prefer: s[CALLS[c.kind].tier] },
    }, c.schema)),
    // Route imposée (celle du devis), aucun relais vers un autre modèle ; le plafond de la tâche vaut aussi pour les images.
    draw: (id, c) => withTrace(scope(`brand-${id}`), () => withQuotedImageRoute(boardImageRoute(), () => aiSiteImageHd({ userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:${id}` }, { prompt: c.prompt, aspect: c.aspect, logo: c.logo ?? null, scene: c.scene ?? null, avoid: c.avoid ?? null, examples: c.examples ?? null }))),
    look: (id, c) => withTrace(scope(`brand-${id}`), () => llmJson({
      task: "quality_control", userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, system: c.system, prompt: c.prompt, images: c.images, ...(c.fixes?.length ? { imagesFixes: c.fixes } : {}), promptKey: "syna-brand-look-1",
      maxTokens: CALLS.look.max, maxOutputTokens: CALLS.look.max + 2000, usageKey: `${ctx.job.id}:brand:${id}`, deferred, routing: { difficulty: "complex", prefer: { ...s.strong, effort: "high" } },
    }, c.schema)),
  };
}

// ---------------------------------------------------------------- contrôles gratuits des temps de la chaîne

const loose = (s: string) => s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[«»“”"]/g, "").replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const sameUrl = (a: string, b: string) => a.replace(/[#?].*$/, "").replace(/\/+$/, "") === b.replace(/[#?].*$/, "").replace(/\/+$/, "");

/**
 * Paroles de clients réellement lues : seules restent celles dont le texte se retrouve MOT POUR MOT dans l'extrait de
 * la page citée (les morceaux séparés par « … » sont cherchés un par un). Une parole réécrite ou imaginée disparaît.
 */
export function verifiedQuotes(quotes: { text: string; url: string }[], findings: WebFinding[]): { kept: { text: string; url: string }[]; dropped: number } {
  const kept = quotes.filter((q) => {
    const page = findings.find((f) => sameUrl(f.url, q.url));
    if (!page) return false;
    const text = loose(page.excerpt), parts = q.text.split(/…|\[\.\.\.\]|\.\.\./).map(loose).filter((p) => p.length >= 8);
    return parts.length > 0 && parts.every((p) => text.includes(p));
  });
  return { kept, dropped: quotes.length - kept.length };
}

/** Texte lisible d'une page (balises retirées, entités et échappements décodés) : sert à y retrouver une parole citée. */
export function pageText(html: string): string {
  return html
    .replace(/\\u([0-9a-fA-F]{4})/g, (_m, h: string) => String.fromCharCode(parseInt(h, 16))).replace(/\\[nrt]/g, " ").replace(/\\(["'/])/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, h: string) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;|&rsquo;|&lsquo;/g, "'").replace(/&laquo;|&raquo;|&ldquo;|&rdquo;/g, '"').replace(/&hellip;/g, "…").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

/** Téléchargement d'une page citée (gratuit, adresse publique seulement) ; null si elle ne se laisse pas lire. Remplaçable par les tests. */
export const brandPageDeps: { read?: (url: string) => Promise<string | null> } = {};
async function readPage(url: string): Promise<string | null> {
  try {
    const html = brandPageDeps.read ? await brandPageDeps.read(url) : await (async () => { const r = await safeFetch(url, { maxBytes: 2_500_000, timeoutMs: 12_000 }); return r.status < 400 ? r.body.toString("utf8") : null; })();
    return html == null ? null : pageText(html);
  } catch { return null; }
}

/** La parole se lit-elle vraiment, mot pour mot, dans le texte de la page ? (morceaux séparés par « … » cherchés un par un) */
export function quoteOnPage(quote: string, text: string): boolean {
  const page = loose(text), parts = quote.split(/…|\[\.\.\.\]|\.\.\./).map(loose).filter((p) => p.length >= 8);
  return parts.length > 0 && parts.every((p) => page.includes(p));
}

/**
 * Relecture des PAGES elles-mêmes : la recherche rapporte des extraits, qu'un modèle a écrits ; une parole de client
 * n'est gardée comme « réelle » que si le Studio la retrouve, mot pour mot, en relisant la page citée. Une page qui ne
 * se laisse pas relire (avis chargés après coup, accès refusé) fait écarter ses paroles : c'est dit, jamais maquillé.
 */
export async function quotesReadOnPages(quotes: { text: string; url: string }[]): Promise<{ kept: { text: string; url: string }[]; unread: number }> {
  const urls = [...new Set(quotes.map((q) => q.url))].slice(0, MAX_PAGES_REREAD);
  const texts = new Map(await Promise.all(urls.map(async (u) => [u, await readPage(u)] as const)));
  const kept = quotes.filter((q) => { const t = texts.get(q.url); return !!t && quoteOnPage(q.text, t); });
  return { kept, unread: quotes.length - kept.length };
}

/**
 * Un nom bâti sur un nom déjà montré n'est pas un autre nom (essai réel du 13 novembre 2026 : « Pulpe Vive » gardé par
 * le juge alors que « Pulpe » avait déjà sa planche) : il n'est jamais reproposé. Comparaison mot à mot, sans la casse.
 */
export function builtOnShown(name: string, shown: string[]): boolean {
  const words = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const n = words(name);
  return shown.some((s) => {
    const w = words(s);
    if (!w.length || w.length > n.length) return false;
    for (let i = 0; i + w.length <= n.length; i++) if (w.every((x, k) => n[i + k] === x)) return true;
    return false;
  });
}

/** Réserve de noms : toutes les équipes réunies, sans les noms mal formés, recopiés, déjà montrés ou d'un concurrent. */
export function namePool(teams: { team: string; names: z.infer<typeof TeamSchema>["names"] }[], opts: { competitors?: string[]; shown?: string[] } = {}): PoolName[] {
  const banned = new Set([...(opts.competitors ?? []), ...(opts.shown ?? [])].map(normText));
  const seen = new Set<string>(), out: PoolName[] = [];
  // Une équipe après l'autre, à tour de rôle : aucune ne remplit la réserve à elle seule.
  const longest = Math.max(0, ...teams.map((t) => t.names.length));
  for (let i = 0; i < longest; i++) for (const t of teams) {
    const n = t.names[i];
    if (!n) continue;
    const key = normText(n.name);
    if (!key || seen.has(key) || banned.has(key) || builtOnShown(n.name, opts.shown ?? []) || nameIssues(n.name).length || isReferenceName(n.name)) continue;
    seen.add(key);
    out.push({ ...n, name: n.name.trim(), team: t.team });
  }
  return out.slice(0, 240);
}

/** Brouillon de la direction artistique → route complète et sûre (clé, pictogrammes nettoyés, lignes d'honnêteté). */
export function finishRoute(draft: Draft, key: RouteKey, o: { support: number; nameCheck: Board["nameCheck"]; ownName?: boolean }): Route {
  const d = draft.board;
  const board = withHonestProofs({
    ...d,
    idea: { ...d.idea, confessionSupport: o.support },
    nameCheck: o.nameCheck,
    // Aucun pictogramme dessiné en code (règle du propriétaire) : ce qu'un ancien brouillon en rendrait est jeté.
    signs: d.signs.map(({ symbolSvg: _s, ...s }) => s),
    wordmark: (() => { const { symbolSvg: _s, ...w } = d.wordmark; return safeWordmark(w, draft.name); })(),
  }, { ownName: o.ownName });
  return RouteSchema.parse({
    key, name: draft.name.trim(), nameStyle: "", nameWhy: draft.nameWhy, nameAnchor: draft.nameAnchor, nameTest: "", nameExpression: draft.nameExpression, nameCandidates: [],
    slogan: draft.slogan.trim(), sloganTone: draft.sloganTone, promise: draft.promise, territory: draft.territory, ground: draft.ground,
    ...(draft.ground === "degrade" && draft.gradient ? { gradient: draft.gradient } : {}),
    palette: draft.palette, paletteFamily: draft.paletteFamily, fonts: draft.fonts, fontStyle: draft.fontStyle, tone: draft.tone,
    logoStyle: "lettrage", logoIdea: "", why: draft.why, board,
  });
}

/** Tolérance de forme : polices données par leur nom de famille, comme pour les anciennes identités. */
const prepareDraft = (raw: any) => { const one = prepareIdentities({ identities: [raw?.route ?? raw] })?.identities?.[0]; return pruneDraft(one ?? raw); };

/**
 * Champs facultatifs rendus vides par le modèle (« note »: "", « tilt »: []) : retirés, pour qu'un geste non utilisé
 * ne fasse pas refuser toute la planche. Les dessins éventuels du brouillon sont retirés aussi : une planche ne porte
 * plus de dessin en code, ses images sont créées à part (`brand-images.ts`).
 */
export function pruneDraft(raw: any): any {
  const b = raw?.board;
  if (!b || typeof b !== "object") return raw;
  const blank = (v: unknown) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
  const drop = (o: any, keys: string[]) => { if (o && typeof o === "object") for (const k of keys) if (k in o && blank(o[k])) delete o[k]; };
  const strip = (o: any, keys: string[]) => { if (o && typeof o === "object") for (const k of keys) delete o[k]; };
  drop(b, ["descriptor"]); strip(b, ["hero", "images"]);
  delete b.parcel; // le ruban du colis n'est plus affiché ni demandé (audit du 22 novembre 2026, 2.12)
  if (b.voice && typeof b.voice === "object") {
    if (Array.isArray(b.voice.is)) b.voice.is = b.voice.is.filter((x: unknown) => !blank(x)).slice(0, 4);
    if (Array.isArray(b.voice.micro)) b.voice.micro = b.voice.micro.filter((m: any) => m && !blank(m.where) && !blank(m.text)).slice(0, 4);
    drop(b.voice, ["is", "micro"]);
  }
  const w = b.wordmark;
  if (w && typeof w === "object") {
    drop(w, ["note", "scale", "tilt", "accentWords", "lines"]); strip(w, ["swap"]);
    if (w.cut && !(typeof w.cut.at === "number")) delete w.cut;
    if (w.underline === false) delete w.underline;
    // Un geste, deux au plus : la ligne qui coupe le nom ne se cumule pas avec le trait sous le nom.
    if (w.cut && w.underline) delete w.underline;
  }
  if (b.object && typeof b.object === "object") { drop(b.object, ["note"]); strip(b.object, ["art"]); }
  strip(b.site, ["art"]);
  for (const q of Array.isArray(b.posts) ? b.posts : []) { drop(q, ["note", "ground"]); strip(q, ["art"]); }
  for (const g of Array.isArray(b.signs) ? b.signs : []) { drop(g, ["sample", "ground"]); strip(g, ["art"]); if (g && g.hand === false) delete g.hand; }
  return raw;
}

// ---------------------------------------------------------------- ce que lisent les spécialistes

const numbered = (lines: string[]) => lines.map((l, i) => `${i}. ${l}`).join("\n");
function studyDigest(st: Study): string {
  return [
    `Paroles réelles de clients (${st.quotes.length}, mot pour mot, lues sur le web) :`, st.quotes.length ? numbered(st.quotes.map((q) => `« ${q.text} »`)) : "aucune trouvée : tout aveu est une hypothèse.",
    "", `Concurrents : ${st.competitors.map((c) => `${c.name}${c.codes ? ` (${c.codes})` : ""}`).join(" ; ") || "non trouvé"}.`,
    `Le moule de la catégorie : ${st.mould || "non trouvé"}`,
    `Ce que font les gens à la place : ${st.substitutes.join(" ; ") || "non trouvé"}.`,
    `Faits d'usage du marché (ce ne sont PAS des promesses du client) : ${st.facts.map((f) => f.text).join(" ; ") || "non trouvé"}.`,
    ...(st.notFound.length ? [`Cherché et non trouvé : ${st.notFound.join(" ; ")}.`] : []),
  ].join("\n");
}
/** Les mots du client cités dans une consigne de SINA (« Le client a dit : « … » ») ; rien de ce qu'elle y ajoute. */
export const clientWords = (guidance?: string): string => [...(guidance ?? "").matchAll(/client a dit\s*:\s*«\s*([^»]+?)\s*»/gi)].map((m) => m[1]).join(" ");
/** Le dossier de chaque création de la marque : la fiche ENTIÈRE du client (le socle, 21 novembre 2026), puis la refonte. */
const briefBlock = (j: Journey, projectId: string, guidance?: string) => [ficheTexte({ j, notes: notesDuProjet(projectId), projectId }), "", "# Existant et refonte", keepConstraints(j), ...(guidance ? ["", "# Ce que le client demande pour cette nouvelle proposition (ses mots)", guidance] : [])].join("\n");
/** Ce que le client a dit de l'image qu'il veut : sa réponse de départ, et ses goûts et refus de sa fiche qui valent pour le logo ou les images de la marque. */
export const goutsDuClient = (j: Journey, projectId: string, ...more: (string | null | undefined)[]): string | null => [j.start.image?.value, ...goutsPour(notesDuProjet(projectId), ["logo", "images"]), ...more].filter((v): v is string => !!v?.trim()).join("\n") || null;
const ideaBlock = (i: Strategy["ideas"][number], s: Strategy) => `Idée ${i.id} : ${i.belief} | aveu : ${s.confessions[i.confession]?.text ?? s.confessions[0].text} | adversaire : ${i.enemy} | preuve dans l'objet : ${i.proof} | ce qu'elle coûte : ${i.cost} | ton : ${i.tone}`;
const routeText = (x: Route) => JSON.stringify({ ...x, board: (({ hero: _h, images: _i, ...b }) => ({
  ...b, signs: b.signs.map(({ symbol: _s, art: _a, ...s }) => s), wordmark: (({ symbol: _s, swap: _w, ...w }) => w)(b.wordmark),
  object: (({ art: _a, ...o }) => o)(b.object), site: (({ art: _a, ...o }) => o)(b.site), posts: b.posts.map(({ art: _a, ...q }) => q),
}))(x.board) });

/**
 * Contrôle gratuit : deux identités d'une série n'ont jamais le même haut de site (même place du titre, même menu et
 * même suite). La seconde est reprise ; une identité sans composition choisie est reprise aussi.
 */
export function layoutIssues(list: Route[]): string[] {
  const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
  // La manière d'ouvrir en mots libres ; à défaut (planches d'avant), la place du titre, le menu et la suite.
  const sig = (x: Route) => { const l = x.board.site.layout; return !l ? "" : l.opening ? norm(l.opening) : l.title && l.menu && l.next ? `${l.title}|${l.menu}|${l.next}` : ""; };
  const out: string[] = [];
  for (const [i, x] of list.entries()) {
    if (!sig(x)) { out.push(`Identité ${x.key} : la manière d'ouvrir le haut de son site (board.site.layout.opening) n'est pas choisie ; choisis-la d'après sa planche.`); continue; }
    const twin = list.slice(0, i).find((o) => sig(o) === sig(x));
    if (twin) out.push(`Identité ${x.key} : le haut de son site s'ouvre de la même manière que celui de ${twin.key} ; choisis une autre manière d'ouvrir, d'après sa planche.`);
  }
  return out;
}

// ---------------------------------------------------------------- la tâche

const Payload = z.object({
  projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(),
  count: z.number().int().min(2).max(4), guidance: z.string().max(1500).optional(),
  redo: z.array(z.enum(["A", "B", "C", "D"])).optional(), namesOnly: z.boolean().optional(),
  /**
   * Noms choisis par le client (par exemple dans l'aperçu des noms) : un par route à faire, dans l'ordre. Aucune
   * recherche ni jugement de noms : chaque route reprend son nom lettre pour lettre.
   */
  names: z.array(z.string().min(1).max(40)).min(1).max(4).optional(),
  /** Aperçu des noms seuls : la tâche s'arrête après le juge des noms, sans vérification ni planche (rien n'est enregistré dans le parcours). */
  namesPreview: z.boolean().optional(),
  /** Images de planche créées par le modèle d'images (par défaut : le réglage `sina.brand_images`). */
  images: z.boolean().optional(),
  /** Seulement les images, sur les planches déjà écrites (celles de `redo`, ou toutes) : rien d'autre n'est refait. */
  imagesOnly: z.boolean().optional(),
  /** Avec `imagesOnly` : seulement ces images (ex. le logo et l'objet qui le porte) ; les autres images gardées restent. */
  slots: z.array(z.enum(CREATED_SLOTS)).min(1).optional(),
  /** La marque finie de l'identité CHOISIE : logo adopté, images manquantes (ou `slots` à refaire), charte. */
  finish: z.boolean().optional(),
});
export type BrandJobPayload = z.infer<typeof Payload>;

export async function runSinaBrandJob(ctx: JobContext) {
  const a = Payload.parse(ctx.payload);
  const p = loadProject(a.projectId);
  const j = journeyOf(a.conversationId);
  const ready = brandKnowledgeReady();
  if (!ready.ok) throw new UserFacingError(L("La création de la marque ne peut pas commencer : un cahier de métier de SINA manque. Rien n'a été décompté.", "Brand creation cannot start: a knowledge file is missing. Nothing was charged."));
  const settings = chainSettings();
  const ai = brandChainDeps.ai ? brandChainDeps.ai(ctx) : realAi(ctx, { userId: p.userId, projectId: p.id }, settings, a.capMicro, !!a.imagesOnly || !!a.finish);
  const kind = nameKindsFor(j), keys = routeKeys(a.count), notes: string[] = [];
  // Refonte : le nom ou le slogan gardés par le client sont repris mot pour mot, quoi que rende un spécialiste.
  const keptName = j.keep.includes("nom") ? (j.keptValues?.name || j.imported[0]?.name || "").trim() : "";
  const keptSlogan = j.keep.includes("slogan") ? (j.keptValues?.slogan || j.imported[0]?.tagline || "").trim() : "";
  const previous = (j.identities?.list ?? []).filter((x): x is Route => !!x.board);
  const redo = (a.redo?.length ? keys.filter((k) => a.redo!.includes(k)) : keys).filter((k) => a.redo?.length ? previous.some((x) => x.key === k) : true);
  const partial = !!a.redo?.length && redo.length < keys.length && previous.length === keys.length;
  const kept = partial ? previous.filter((x) => !redo.includes(x.key)) : [];
  const todo = partial ? redo : keys;
  const namesOnly = !!a.namesOnly && previous.length === keys.length;
  // Noms choisis par le client : un par route à faire. Un nom mal formé est refusé avant toute dépense.
  const imposed = (a.names ?? []).map((n) => n.trim()).filter(Boolean);
  if (imposed.length) {
    if (keptName) throw new UserFacingError(L("Tu gardes déjà ton nom : je ne peux pas en imposer un autre. Rien n'a été décompté.", "You are keeping your name already. Nothing was charged."));
    if (imposed.length !== todo.length) throw new UserFacingError(L(`Il me faut un nom par proposition à faire (${todo.length}) ; j'en ai reçu ${imposed.length}. Rien n'a été décompté.`, `One name per route is needed (${todo.length}); got ${imposed.length}. Nothing was charged.`));
    const bad = imposed.flatMap((n) => nameIssues(n));
    if (bad.length) throw new UserFacingError(L(`Ce nom ne peut pas servir tel quel : ${bad[0]} Rien n'a été décompté.`, `This name cannot be used as is: ${bad[0]} Nothing was charged.`));
  }
  const brief = briefBlock(j, p.id, a.guidance);
  ai.partage?.(brief);

  // La marque finie de l'identité choisie (second temps) : rien d'autre n'est refait.
  if (a.finish) return (await import("./brand-finish")).runBrandFinish({ ctx, ai, projectId: p.id, userId: p.userId, conversationId: a.conversationId, brief, kind, slots: a.slots, guidance: a.guidance });
  // Logo gardé par le client : jamais redessiné ; il est posé tel quel sur ce qui le porte.
  const clientLogo = j.keep.includes("logo") ? await clientLogoOf(p.id) : null;

  // Seulement les images : les planches déjà écrites sont gardées telles quelles, chacune reçoit ses images.
  if (a.imagesOnly) {
    if (!previous.length) throw new UserFacingError(L("Il n'y a pas encore de planche à mettre en images. Rien n'a été décompté.", "There is no board to illustrate yet. Nothing was charged."));
    const targets = a.redo?.length ? previous.filter((x) => a.redo!.includes(x.key)) : previous, round = j.identities?.round ?? 1;
    let list = (j.identities?.list ?? []) as Route[];
    const said: string[] = [], redoneLogos: Buffer[] = [], siteGardes: string[] = [];
    // Un logo refait reçoit d'abord les logos des AUTRES planches de la série montrée (règle du propriétaire : chaque logo
    // reçoit ceux déjà faits, « je veux un logo complètement différent » ; audit du 22 novembre 2026 : il ne recevait que
    // ceux refaits dans la même tâche).
    if ((a.slots ?? CREATED_SLOTS).includes("logo")) for (const o of list.filter((y) => !targets.some((t) => t.key === y.key))) {
      const g = o.board?.images?.logo ? getAsset(o.board.images.logo.id) : undefined;
      if (g) { try { redoneLogos.push(assetData(g)); } catch { /* fichier absent */ } }
    }
    // Logo refait seul : la consigne écrite par SINA ne va jamais au dessinateur, même par la fiche de la marque (décision
    // du propriétaire du 21 novembre 2026 : « pas de consigne autre que les 50 logos en exemple » ; essai réel du même
    // jour : SINA y avait mis « logotype sobre, lettres à empattements, un fil à plomb » et neuf signes interdits). Elle
    // va au relecteur, avec les mots du client sur l'image.
    const logoOnly = !!a.slots?.length && a.slots.every((s) => s === "logo");
    const imagesBrief = logoOnly ? briefBlock(j, p.id) : brief;
    const gouts = goutsDuClient(j, p.id, logoOnly ? clientWords(a.guidance) : undefined);
    for (const x of targets) {
      // La direction artistique de la proposition ressert telle quelle (audit du 22 novembre 2026, 2.3) : elle n'est
      // réécrite que si le client dit ce qu'il veut de différent pour une image autre que le logo (ses mots ne vont
      // jamais au dessinateur du logo).
      const reprise = logoOnly || !a.guidance ? proposalImagery(j, x) : undefined;
      const r = await runBoardImages({ ctx, ai, proposition: true, who: { userId: p.userId, projectId: p.id }, brief: imagesBrief, kind, route: list.find((o) => o.key === x.key) ?? x, round, slots: a.slots, clientLogo, madeLogos: [...redoneLogos], gouts, ...(reprise ? { imagery: reprise } : {}) });
      const fresh = (a.slots ?? CREATED_SLOTS).includes("logo") && r.route.board.images?.logo ? getAsset(r.route.board.images.logo.id) : undefined;
      if (fresh) { try { redoneLogos.push(assetData(fresh)); } catch { /* fichier absent */ } }
      list = list.map((o) => (o.key === x.key ? r.route : o));
      if (r.siteGarde) siteGardes.push(x.key);
      said.push(...r.issues); notes.push(...r.notes);
    }
    // Logo refait sans sa maquette : la planche est notée, sa maquette sera refaite si elle est choisie.
    const seul = (a.slots ?? []).includes("logo") && !(a.slots ?? []).includes("site") ? targets.map((x) => x.key) : [], refaite = (a.slots ?? []).includes("site") ? targets.map((x) => x.key).filter((k) => !siteGardes.includes(k)) : [];
    updateJourney(a.conversationId, (y) => { if (y.identities) { y.identities.list = list; y.identities.issues = [...new Set([...y.identities.issues, ...said])]; y.identities.at = Date.now(); y.identities.siteAncienLogo = [...new Set([...(y.identities.siteAncienLogo ?? []), ...seul, ...siteGardes])].filter((k) => !(refaite as string[]).includes(k)); } });
    return { routes: list.map((x) => ({ key: x.key, name: x.name, slogan: x.slogan })), issues: said, notes, images: list.reduce((n, x) => n + Object.values(x.board?.images ?? {}).flat().filter((v) => v && typeof v === "object").length, 0) };
  }

  // Atelier d'une proposition précédente (étude, idées, réserve de noms) : repris tel quel, jamais repayé.
  const before = j.identities?.chainJobId ? parseJson<Record<string, unknown>>(getJob(j.identities.chainJobId)?.checkpoint ?? "{}", {}) : {};
  if ((a.redo?.length || a.namesOnly || a.guidance) && before["brand:strategy"]) for (const [k, v] of Object.entries(before)) if (/^brand:(study|strategy|team:)/.test(k) && !(k in ctx.checkpoint)) ctx.save(k, v);

  // 1. Comprendre : trois recherches, puis l'étude. Une recherche qui échoue est dite, jamais remplacée ni relancée.
  ctx.progress(0.03, L("J'étudie ton marché", "Studying your market"));
  const study = await ctx.step("brand:study", async (): Promise<Study> => {
    // Trois recherches indépendantes, une famille chacune, en même temps (la marque arrive plus tôt) ; une page trouvée
    // deux fois n'est lue qu'une fois.
    const parFamille: Record<string, ResearchCategory> = { paroles: "customers", concurrents: "competitors", usages: "offer" };
    const lots = await Promise.all(P.researchQueries(briefFromJourney(j)).map(async (q) => {
      try { return await ai.research(q.id, q.query, parFamille[q.id]); } catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`recherche « ${q.id} » sans résultat`); return []; }
    }));
    const findings: WebFinding[] = [];
    for (const f of lots.flat()) if (!findings.some((x) => sameUrl(x.url, f.url))) findings.push(f);
    if (!findings.length) return { quotes: [], competitors: [], mould: "", substitutes: [], facts: [], notFound: [L("La recherche sur le web n'a rien donné : je n'ai lu aucune parole réelle de clients.", "Web research returned nothing.")], sources: 0, dropped: 0 };
    // Lecture bornée (coût maîtrisé) : les pages de paroles de clients d'abord et en plus long, 45 pages au plus.
    const shownPages = [...findings].sort((x, y) => Number(y.category === "customers") - Number(x.category === "customers")).slice(0, MAX_STUDY_PAGES);
    const pages = shownPages.map((f, i) => `[page ${i}] ${f.url}\n${f.title}\n${f.excerpt.slice(0, f.category === "customers" ? 2400 : 1000)}`).join("\n\n");
    const raw = await ai.ask("study", { kind: "study", system: P.STUDY_SYSTEM, schema: StudySchema, prompt: `${brief}\n\n# Pages trouvées (${shownPages.length})\n${pages}` });
    // Deux relectures gratuites : la parole est dans l'extrait de la recherche, PUIS dans la page elle-même.
    const q = verifiedQuotes(raw.quotes, findings);
    const read =2 > 1 ? await quotesReadOnPages(q.kept) : { kept: q.kept, unread: 0 };
    const urls = (u: string) => findings.some((f) => sameUrl(f.url, u));
    const notFound = [...raw.notFound, ...(read.unread ? [L(read.unread > 1 ? `${read.unread} paroles rapportées par ma recherche : je n'ai pas pu les relire sur leur page, je ne les ai pas gardées.` : "1 parole rapportée par ma recherche : je n'ai pas pu la relire sur sa page, je ne l'ai pas gardée.", `${read.unread} reported quote(s) could not be re-read on their page and were dropped.`)] : [])].slice(0, 10);
    return { ...raw, notFound, quotes: read.kept.slice(0, 40), facts: raw.facts.filter((f) => urls(f.url)), competitors: raw.competitors.map((c) => ({ ...c, url: urls(c.url) ? c.url : "" })), sources: new Set(findings.map((f) => f.url)).size, dropped: q.dropped + read.unread };
  });
  if (study.quotes.length < 10) notes.push(`${study.quotes.length} parole(s) réelle(s) de clients trouvée(s) : moins de dix`);

  // 2 et 3. L'aveu, l'adversaire, les idées.
  ctx.progress(0.2, L("Je cherche l'idée de ta marque", "Looking for your brand idea"));
  const first = await ctx.step("brand:strategy", () => ai.ask("strategy", { kind: "strategy", system: P.strategySystem(), schema: StrategySchema, prompt: `${brief}\n\n# Étude\n${studyDigest(study)}` }));
  // Trop peu d'idées passent les deux épreuves pour composer des routes différentes (essai réel du 12 novembre 2026 : une
  // seule sur huit) : on en cherche d'AUTRES, une fois. Une idée écartée n'est jamais reformulée pour passer.
  let strategy: Strategy = first;
  if (first.ideas.filter((i) => i.strong).length < Math.min(4, keys.length + 1)) {
    const more = await ctx.step("brand:strategy:2", () => ai.ask("strategy-2", { kind: "strategy", system: P.strategySystem(), schema: StrategySchema, prompt: `${brief}\n\n# Étude\n${studyDigest(study)}\n\n# Idées déjà trouvées (ne les reprends pas, ne les reformule pas)\n${first.ideas.map((i) => `- ${i.belief} (${i.strong ? "forte" : "écartée : elle ne passe pas les deux épreuves"})`).join("\n")}\n\nCherche huit AUTRES idées, par des postures que tu n'as pas encore prises. Numérote-les à partir de i${first.ideas.length + 1}. Rends les aveux auxquels elles répondent (ceux d'avant peuvent resservir : réécris-les alors tels quels).` }));
    const offset = first.confessions.length, used = new Set(first.ideas.map((i) => i.id));
    strategy = { job: first.job, confessions: [...first.confessions, ...more.confessions], ideas: [...first.ideas, ...more.ideas.map((i, n) => ({ ...i, id: used.has(i.id) ? `j${n + 1}` : i.id, confession: i.confession + offset }))] };
  }
  const support = (idea: Strategy["ideas"][number]) => (strategy.confessions[idea.confession]?.quotes ?? []).filter((n) => n < study.quotes.length).length;
  const ideas = strategy.ideas.filter((i) => i.strong).length >= Math.min(todo.length, 2) ? strategy.ideas.filter((i) => i.strong) : strategy.ideas;

  // 4. Les noms : une équipe par chemin, chacune seule (elle ne voit pas le travail des autres).
  const paths = P.teamPathsFor(kind, settings.teams), teams: { team: string; names: z.infer<typeof TeamSchema>["names"] }[] = [];
  const teamPrompt = `${brief}\n\n# Idées de marque\n${ideas.map((i) => ideaBlock(i, strategy)).join("\n")}\n\n# Le moule de la catégorie (à ne pas refaire)\n${study.mould || "non trouvé"}\n\n# Noms des concurrents (jamais repris)\n${study.competitors.map((c) => c.name).join(", ") || "non trouvé"}`;
  // Les équipes ne se voient pas : elles cherchent en même temps (une seule attente au lieu de quatre).
  if (!j.keep.includes("nom") && !imposed.length) {
    ctx.progress(0.3, L("Je cherche des noms", "Looking for names"));
    const found = await Promise.all(paths.map((path) => ctx.step(`brand:team:${path.id}`, () => ai.ask(`team-${path.id}`, { kind: "team", system: P.teamSystem(kind, path), schema: TeamSchema, prompt: `${teamPrompt}\n\n${P.teamPathBlock(path)}` }))));
    for (const [i, path] of paths.entries()) teams.push({ team: path.id, names: found[i].names });
  }
  // Noms déjà montrés AVANT cette tâche, fixés une fois : une relance après coup n'écarte pas ses propres noms.
  const shown = await ctx.step("brand:shown", async () => [...new Set((j.identities?.shownNames ?? []).concat(previous.map((x) => x.name)))]);
  const pool = namePool(teams, { competitors: study.competitors.map((c) => c.name), shown });
  // Numéro de la proposition, fixé une fois pour la tâche : une relance après coup retrouve ses points de reprise.
  const round = await ctx.step("brand:round", async () => (j.identities?.round ?? 0) + 1);

  // 4 bis. Le juge des noms (retours du propriétaire du 12 novembre 2026 : « Tintamarre, c'est nul », « Morceaux
  // Choisis, ça représente rien et c'est moche, tu appellerais ton site comme ça toi ? »). Il lit TOUS les noms des
  // équipes AVANT qu'une route soit composée (essai réel : jugé après la composition, il ne voyait que 7 noms sur 178,
  // et de meilleurs noms n'arrivaient jamais devant lui). Les routes ne se composent qu'avec les noms qu'il garde ; si
  // trop peu tiennent, les équipes repartent chercher UNE fois ; un nom pris faute de mieux l'est avec le doute dit.
  const refusedBefore = (name: string) => NAME_REFUSALS.some((r) => normText(r.name) === normText(name));
  const freeName = (name: string) => !nameIssues(name).length && !isReferenceName(name) && !refusedBefore(name) && !builtOnShown(name, shown);
  const doubts = new Map<string, string>();
  const judged: { name: string; seen: string; why: string }[] = [], almost: { name: string; why: string }[] = [];
  let allowed: PoolName[] = pool, searched = 0;
  // Noms choisis par le client : ce sont les seuls noms permis, sans passer par le juge (il a déjà choisi).
  if (imposed.length) allowed = imposed.map((name) => pool.find((n) => normText(n.name) === normText(name)) ?? { name, detail: "", second: "", idea: "", team: "client" });
  if (!j.keep.includes("nom") && !imposed.length) {
    // Une proposition refaite sans nouveaux mots du client reprend l'étude, les idées et les noms : les verdicts du juge
    // sur ces mêmes noms resservent aussi (audit du 22 novembre 2026, 2.13). Les noms déjà montrés sont écartés avant
    // lui ; seuls des noms nouveaux (second tour) sont jugés.
    const verdictsAvant = !a.guidance && (a.redo?.length || a.namesOnly) ? Object.entries(before).filter(([k]) => /^brand:judge:\d+(:2)?$/.test(k)).map(([, v]) => JudgeSchema.safeParse(v)).flatMap((r) => (r.success ? [r.data] : [])) : [];
    const judge = async (tag: string, list: PoolName[]) => {
      if (!list.length) return;
      const r = tag === "" && verdictsAvant.length ? { kept: verdictsAvant.flatMap((v) => v.kept), almost: verdictsAvant.flatMap((v) => v.almost) } : await ctx.step(`brand:judge:${round}${tag}`, () => ai.ask(`judge-${round}${tag.replace(":", "-")}`, { kind: "judge", system: P.nameJudgeSystem(kind), schema: JudgeSchema, prompt: `${brief}\n\n# Noms trouvés par les équipes (${list.length})\n${list.map((n) => `- ${n.name} | détail réel : ${n.detail} | deuxième lecture : ${n.second}`).join("\n")}` }));
      // Seuls des noms réellement présents dans la liste comptent : le juge ne trouve pas de noms, il trie.
      const known = (name: string) => list.some((n) => normText(n.name) === normText(name));
      judged.push(...r.kept.filter((k) => known(k.name) && !judged.some((x) => normText(x.name) === normText(k.name))));
      almost.push(...r.almost.filter((k) => known(k.name) && !almost.some((x) => normText(x.name) === normText(k.name))));
    };
    ctx.progress(0.52, L("Je passe tous les noms à mon contrôle le plus sévère", "Putting every name through my strictest check"));
    const first = pool.filter((n) => freeName(n.name));
    searched = first.length;
    await judge("", first);
    let second: PoolName[] = [];
    if (judged.length < todo.length && paths.length) {
      ctx.progress(0.54, L("Trop peu de noms sont au niveau : je repars en chercher", "Too few names are good enough: searching again"));
      const level = judged.length ? `Noms gardés par le juge (le niveau à atteindre, à ne pas redonner) : ${judged.map((k) => k.name).join(", ")}` : "Le juge n'a gardé AUCUN nom du premier tour.";
      const near = almost.length ? `\nPresque gardés, avec ce qui leur manque :\n${almost.map((k) => `- ${k.name} : ${k.why}`).join("\n")}` : "";
      const more: typeof teams = [];
      const again = await Promise.all(paths.map((path) => ctx.step(`brand:team:${path.id}:${round}:2`, () => ai.ask(`team-${path.id}-2`, { kind: "team", system: P.teamSystem(kind, path), schema: TeamSchema, prompt: `${teamPrompt}\n\n# Second tour\nLes noms du premier tour n'ont pas suffi. ${level}${near}\n\nCette fois, chaque nom doit tenir SEUL sur l'objet : on doit voir le produit ou son moment sans aucune explication, et le fondateur doit avoir envie de le porter.\n\nNoms déjà trouvés par les équipes (ne les redonne pas) : ${pool.slice(0, 260).map((n) => n.name).join(", ")}\n\n${P.teamPathBlock(path)}` }))));
      for (const [i, path] of paths.entries()) more.push({ team: path.id, names: again[i].names });
      second = namePool(more, { competitors: study.competitors.map((c) => c.name), shown: [...shown, ...pool.map((n) => n.name)] }).filter((n) => freeName(n.name));
      searched += second.length;
      await judge(":2", second);
    }
    const found = (name: string) => [...first, ...second].find((n) => normText(n.name) === normText(name));
    allowed = judged.map((k) => found(k.name)).filter((n): n is PoolName => !!n);
    // Trop peu de noms gardés, même après le second tour : les « presque », puis les premiers trouvés, avec le doute dit.
    for (const k of almost) { if (allowed.length >= todo.length) break; const n = found(k.name); if (n && !allowed.includes(n)) { allowed.push(n); doubts.set(normText(n.name), k.why.replace(/\.+$/, "")); } }
    for (const n of first) { if (allowed.length >= todo.length) break; if (!allowed.includes(n)) { allowed.push(n); doubts.set(normText(n.name), L("il n'a pas passé mon contrôle le plus sévère", "it did not pass my strictest check")); } }
  }
  // Aperçu des noms seuls : rien n'est vérifié, aucune planche n'est faite, le parcours ne change pas.
  if (a.namesPreview) {
    const full = (name: string) => allowed.find((n) => normText(n.name) === normText(name));
    // Le nom de domaine de chaque nom gardé (gratuit) : l'exact, sinon une adresse libre qui garde le nom.
    const domains: Record<string, NameDomains> = {};
    if (domainsOn()) for (const k of judged) { try { domains[k.name] = await ctx.step(`brand:domains:${round}:${normText(k.name)}`, () => findDomains(k.name)); } catch { /* contrôle impossible : rien n'est affirmé */ } }
    return { preview: judged.map((k) => ({ name: k.name, seen: k.seen, why: k.why, detail: full(k.name)?.detail ?? "", second: full(k.name)?.second ?? "", ...(domains[k.name] ? { domains: domains[k.name], domaine: domainLine(domains[k.name]) } : {}) })), almost, searched, notes };
  }

  // Premier jugement : les routes (une idée + un nom), composées seulement avec les noms permis.
  ctx.progress(0.55, L("Je compose les routes de ta marque", "Composing your brand routes"));
  const shortlistPromptFor = (pool: PoolName[]) => [
    brief, "", "# Étude", studyDigest(study), "", "# Idées de marque", ...ideas.map((i) => ideaBlock(i, strategy)), "",
    j.keep.includes("nom") ? "# Nom : le client garde son nom. Chaque route le reprend mot pour mot (name) ; compose des routes aux idées différentes." : `# Noms gardés par le juge des noms (${pool.length}) : les SEULS noms permis\n${pool.map((n) => `- ${n.name} | détail : ${n.detail} | deuxième lecture : ${n.second}${n.idea ? ` | idée ${n.idea}` : ""}`).join("\n")}`,
    ...(kept.length ? ["", `# Routes GARDÉES par le client (ne les refais pas ; les nouvelles doivent en différer : autre idée, autre moule de nom, autre fond, autre teinte, autre police)`, ...kept.map((x) => `- ${x.key} « ${x.name} » : ${x.board.idea.belief} (fond ${x.ground}, bouton ${x.palette.primary}, titres ${x.fonts.heading})`)] : []),
    ...(namesOnly ? ["", "# Le client veut SEULEMENT de nouveaux noms : garde l'idée de chaque route, change le nom.", ...previous.filter((x) => todo.includes(x.key)).map((x) => `- ${x.key} : idée « ${x.board.idea.belief} », fond ${x.ground} ; ancien nom « ${x.name} » (à ne pas reproposer)`)] : []),
    ...(imposed.length ? ["", `# Noms CHOISIS par le client : compose une route par nom, dans cet ordre, en reprenant chaque nom lettre pour lettre (trouve à chacun son détail réel et sa deuxième lecture) ; aucune réserve : ${imposed.map((n) => `« ${n} »`).join(", ")}`] : shown.length ? ["", `# Noms déjà montrés au client (jamais reproposés) : ${[...new Set(shown)].join(", ")}`] : []),
    "", `Compose ${todo.length} route(s) pour ${todo.length > 1 ? "les clés" : "la clé"} ${todo.join(", ")}, dans cet ordre, puis jusqu'à 6 réserves (autant que les noms permis le permettent).`,
  ].join("\n");
  const shortlist = await ctx.step(`brand:shortlist:${round}`, () => ai.ask("shortlist", { kind: "shortlist", system: P.shortlistSystem(kind, todo.length), schema: ShortlistSchema, prompt: shortlistPromptFor(allowed) }));
  // Un nom que la composition aurait pris hors des noms permis est écarté : aucune planche sur un nom non gardé.
  const usable = (r: Pick) => j.keep.includes("nom") || allowed.some((n) => normText(n.name) === normText(r.name));
  const sound = shortlist.routes.filter(usable).filter((r, i, all) => all.findIndex((x) => normText(x.name) === normText(r.name)) === i || j.keep.includes("nom"));
  let picks = sound.filter((r) => !r.reserve).slice(0, todo.length);
  const reserves = sound.filter((r) => !picks.includes(r));
  // Noms choisis par le client : une route par nom, dans son ordre, le nom repris lettre pour lettre ; aucune réserve.
  if (imposed.length) {
    picks = imposed.map((name, i) => ({ ...(shortlist.routes.find((r) => normText(r.name) === normText(name)) ?? shortlist.routes[i] ?? shortlist.routes[0]), name, reserve: false }));
    reserves.length = 0;
  }
  if (picks.length < todo.length) picks = [...picks, ...reserves.splice(0, todo.length - picks.length)];
  if (picks.length < todo.length) throw new UserFacingError(L("Je n'ai pas trouvé assez de routes solides pour ta marque. Dis-moi ce que tu veux de différent et je recommence.", "Not enough solid routes were found."));

  // 5. Vérifier les noms : une marque du même secteur porte-t-elle déjà ce nom ? (web seulement, dit au client)
  ctx.progress(0.62, L("Je vérifie que les noms sont libres", "Checking the names are free"));
  let nameCheck: Board["nameCheck"] = "rien_trouve";
  const taken = new Map<string, string>();
  if (!j.keep.includes("nom")) {
    const candidates = [...picks, ...reserves].map((r) => r.name);
    const check = await ctx.step(`brand:verify:${round}`, async () => {
      let findings: WebFinding[];
      try { findings = await ai.research(`verify-${round}`, P.verifyQuery(candidates, briefFromJourney(j)), "competitors"); } catch (e) { if (e instanceof CostCapReached) throw e; return { done: false as const, checks: [] }; }
      if (!findings.length) return { done: true as const, checks: [] };
      const r = await ai.ask(`verify-${round}`, { kind: "verify", system: P.VERIFY_SYSTEM, schema: VerifySchema, prompt: `# Noms à vérifier\n${candidates.map((n) => `- ${n}`).join("\n")}\n\n# Pages trouvées\n${findings.map((f) => `${f.url}\n${f.title}\n${f.excerpt}`).join("\n\n")}` });
      // Un nom n'est dit « pris » que sur une page réellement trouvée.
      return { done: true as const, checks: r.checks.filter((c) => c.taken && findings.some((f) => sameUrl(f.url, c.url))) };
    });
    if (!check.done) { nameCheck = "non_verifie"; notes.push("vérification des noms sur le web impossible"); }
    for (const c of check.checks) taken.set(normText(c.name), c.url);
    // Un nom déjà pris est écarté : une réserve libre prend sa place et garde le fond, la teinte et la police prévus.
    picks = picks.map((r) => {
      if (!taken.has(normText(r.name))) return r;
      const spare = reserves.findIndex((s) => !taken.has(normText(s.name)) && !picks.some((x) => normText(x.name) === normText(s.name)));
      if (spare < 0) return r;
      const [s] = reserves.splice(spare, 1);
      return { ...s, ground: r.ground, hue: r.hue, type: r.type, reserve: false, ...(namesOnly ? { idea: r.idea } : {}) };
    });
  } else nameCheck = "non_verifie";

  // 6 et 7. La voix, les signes, les situations : la planche de chaque route.
  // Une identité vraiment différente pour chaque marque (demande du propriétaire du 17 novembre 2026) : les polices de
  // titres et les fonds clairs des dernières marques du Studio, lus une fois pour la tâche (une relance retrouve les
  // mêmes), sont donnés à chaque planche ; ce qui en serait repris quand même est corrigé par le Studio, sans IA,
  // avant les images (`variete-marques.ts`). Le client qui garde tout sauf le nom garde aussi ses polices et ses couleurs.
  const recent = await ctx.step("brand:recent", async () => marquesRecentes(p.id));
  const recentBlock = namesOnly ? "" : varieteMarquesBrief(recent);
  const vary = (x: Route, others: Route[]): Route => {
    if (namesOnly) return x;
    const r = varierIdentites([...others, x], recent, { modifiables: [x.key], j });
    notes.push(...r.changes);
    return r.list[r.list.length - 1];
  };
  const ideaOf = (r: Pick) => strategy.ideas.find((i) => i.id === r.idea) ?? ideas[0];
  /** Ce qu'une route doit savoir des autres pour s'en écarter (couleurs, police, phrases, bouton). */
  const seen = (x: Route) => `- ${x.key} « ${x.name} » : fond ${x.ground}, bouton ${x.palette.primary}, titres ${x.fonts.heading} (police de titres déjà prise), signature « ${x.slogan} », titre du site « ${x.board.site.headline} », bouton du site « ${x.board.site.button} »${x.board.site.layout?.opening ? `, manière d'ouvrir son site : ${x.board.site.layout.opening} (la tienne doit en différer)` : ""}`;
  const routePrompt = (r: Pick, idea: Strategy["ideas"][number], others: Route[], old?: Route) => [
    brief, "", "# Étude", studyDigest(study), "", "# La route à mettre en planche",
    `Nom : ${r.name}${j.keep.includes("nom") ? " (nom gardé par le client)" : ""}`, `Détail réel : ${r.detail}`, `Deuxième lecture : ${r.second}`, `Logique dite au client : ${r.why}`, `Risques connus : ${r.risks.join(" ; ") || "aucun relevé"}`,
    ideaBlock(idea, strategy), `Ton de la route : ${r.tone || idea.tone}`, `Fond de page : ${r.ground}`, `Teinte du bouton : ${r.hue}`, `Caractère de la police de titres : ${r.type}`,
    ...(others.length ? ["", "# Les autres routes de la série (reste nettement différente : autre teinte de bouton, AUTRE police de titres, autres images, autres phrases)", ...others.map(seen)] : []),
    ...(namesOnly && old ? ["", "# Le client garde TOUT de cette route sauf le nom : reprends à l'identique son fond, son dégradé, sa palette, ses polices, son ton, ses curseurs de voix, ses signes et son objet ; réécris le nom, sa logique, la signature et les phrases qui citaient l'ancien nom.", routeText(old)] : []),
    ...(recentBlock ? ["", recentBlock] : []),
  ].join("\n");
  const planOf = new Map(todo.map((k, n) => [k, picks[n]] as const));
  const drafted: Route[] = [];
  for (const [n, key] of todo.entries()) {
    ctx.progress(0.66 + (0.16 * n) / todo.length, L(`Je prépare la planche ${key}`, `Preparing board ${key}`));
    const r = picks[n], idea = ideaOf(r), old = previous.find((x) => x.key === key);
    const prompt = routePrompt(r, idea, [...kept, ...drafted], old);
    const draft = await ctx.step(`brand:direction:${round}:${key}`, () => ai.ask(`direction-${round}-${key}`, { kind: "direction", system: P.directionSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt }));
    const forced: Draft = namesOnly && old ? { ...draft, ground: old.ground, gradient: old.gradient, palette: old.palette, paletteFamily: old.paletteFamily, fonts: old.fonts, fontStyle: old.fontStyle, tone: old.tone } : draft;
    drafted.push(vary(finishRoute({ ...forced, name: keptName || r.name, ...(keptSlogan ? { slogan: keptSlogan } : {}) }, key, { support: support(idea), nameCheck: taken.has(normText(r.name)) ? "non_verifie" : nameCheck, ownName: !!keptName }), [...kept, ...drafted]));
  }
  const assemble = (fresh: Route[]) => keys.map((k) => fresh.find((x) => x.key === k) ?? kept.find((x) => x.key === k)).filter((x): x is Route => !!x);
  let list = assemble(drafted);
  // Le lecteur qui ne sait rien lit les phrases courtes des planches neuves, sans rien connaître de la marque : ce qu'il
  // ne comprend pas du premier coup est repris avant la création des images. Sans réponse, la création continue.
  const readerIssues: string[] = [];
  if (drafted.length) try {
    const asked = drafted.flatMap((x) => readerTexts(x, !!keptSlogan).map((t) => ({ ...t, key: x.key, sells: x.board.descriptor || "" })));
    const read = await ctx.step(`brand:reader:${round}`, () => ai.ask(`reader-${round}`, { kind: "reader", system: P.readerSystem(), schema: ReaderSchema, prompt: asked.map((t) => `- id ${t.id} | l'entreprise vend : ${t.sells || "non précisé"} | phrase : « ${t.text} »`).join("\n") }));
    for (const r of read.texts.filter((v) => !v.clear)) {
      const t = asked.find((a) => a.id === r.id); if (!t) continue;
      readerIssues.push(`Identité ${t.key} : ${t.label} « ${t.text} » n'est pas comprise du premier coup par quelqu'un qui ne connaît pas la marque (${(r.why || "pas claire").replace(/\.+$/, "")} ; il comprend : « ${r.understood.replace(/\.+$/, "") || "rien"} »). Réécris-la : claire d'abord, belle ensuite.`);
    }
    if (readerIssues.length) notes.push(`lecteur qui ne sait rien : ${readerIssues.length} phrase(s) à reprendre`);
  } catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`lecture des phrases impossible : ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
  const firstIssues = [...routeIssues(list, j, keys.length), ...layoutIssues(list), ...readerIssues];

  // Le directeur de création relit, exige une reprise, puis relit la reprise. Plafond atteint : dit, jamais caché.
  const remaining: string[] = [];
  let series = "";
  try {
    ctx.progress(0.84, L("Je relis tout avant de te le montrer", "Reviewing everything before showing you"));
    const review = await ctx.step(`brand:review:${round}`, () => ai.ask(`review-${round}`, { kind: "review", system: P.reviewSystem(kind), schema: ReviewSchema, prompt: `${brief}\n\n# Routes à relire (${todo.join(", ")})\n${drafted.map(routeText).join("\n\n")}${kept.length ? `\n\n# Routes gardées par le client (pour comparer, à ne pas corriger)\n${kept.map(routeText).join("\n\n")}` : ""}${firstIssues.length ? `\n\n# Points relevés par le contrôle du Studio\n${firstIssues.map((f) => `- ${f}`).join("\n")}` : ""}` }));
    series = review.series;
    const mine = (x: Route, f: string) => f.includes(`Identité ${x.key}`) || new RegExp(`Identités [A-D]?/?${x.key}\\b`).test(f) || f.includes(`« ${x.name} »`);
    // Points de série sans identité nommée (« deux identités ont la même signature ») : la première garde, les suivantes s'écartent.
    const shared = firstIssues.filter((f) => !list.some((x) => mine(x, f)));
    const verdictOf = (x: Route) => review.routes.find((r) => r.key === x.key);
    const fixesOf = (x: Route) => [...(verdictOf(x)?.verdict === "reprendre" ? verdictOf(x)!.fixes : []), ...firstIssues.filter((f) => mine(x, f)), ...(x.key === drafted[0]?.key ? [] : shared)].filter(Boolean);
    const redone: Route[] = [], asked = new Map<string, string[]>();
    const current = () => assemble(drafted.map((x) => redone.find((f) => f.key === x.key) ?? x));
    const tag = (key: string, f: string) => (f.startsWith("Identité") ? f : `Identité ${key} : ${f}`);

    // Nom refusé par le directeur de création : une réserve déjà vérifiée prend sa place, avec une nouvelle planche
    // (essai réel du 12 novembre 2026 : la reprise avait changé le nom dans les textes seulement, la planche ne tenait plus).
    const refused = keptName ? [] : drafted.filter((x) => verdictOf(x)?.replaceName);
    for (const x of refused) {
      const doubt = (verdictOf(x)?.nameDoubt || L("il ne tient pas à côté des autres", "it does not hold up")).replace(/\.+$/, "");
      const at = reserves.findIndex((sp) => !taken.has(normText(sp.name)) && !current().some((o) => normText(o.name) === normText(sp.name)));
      if (at < 0) { remaining.push(tag(x.key, L(`je trouve le nom « ${x.name} » fragile (${doubt}), et je n'avais plus de nom de réserve pour le remplacer.`, `the name "${x.name}" is fragile (${doubt}) and no spare name was left.`))); continue; }
      const [spare] = reserves.splice(at, 1), plan = planOf.get(x.key);
      const r: Pick = { ...spare, ground: x.ground, hue: plan?.hue ?? spare.hue, type: plan?.type ?? spare.type, reserve: false };
      ctx.progress(0.87, L(`Je refais la planche ${x.key} avec un autre nom`, `Redoing board ${x.key} with another name`));
      const draft = await ctx.step(`brand:replace:${round}:${x.key}`, () => ai.ask(`replace-${round}-${x.key}`, { kind: "direction", system: P.directionSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt: routePrompt(r, ideaOf(r), current().filter((o) => o.key !== x.key)) }));
      redone.push(finishRoute({ ...draft, name: r.name, ...(keptSlogan ? { slogan: keptSlogan } : {}) }, x.key, { support: support(ideaOf(r)), nameCheck }));
      asked.set(x.key, [L(`Nom « ${x.name} » refusé : ${doubt}. Nouvelle route avec le nom de réserve « ${r.name} ».`, `Name "${x.name}" refused: ${doubt}. New route with the spare name "${r.name}".`)]);
    }

    const toFix = drafted.filter((x) => !asked.has(x.key) && fixesOf(x).length);
    for (const [n, x] of toFix.entries()) {
      ctx.progress(0.88 + (0.06 * n) / toFix.length, L(`Je reprends la planche ${x.key}`, `Reworking board ${x.key}`));
      const others = current().filter((o) => o.key !== x.key);
      const draft = await ctx.step(`brand:fix:${round}:${x.key}`, () => ai.ask(`fix-${round}-${x.key}`, { kind: "fix", system: P.fixSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt: `${brief}\n\n# Reprise\n${P.FIX_HEAD}\n\n# Ta route\n${routeText(x)}\n\n# Ce qui ne change pas\nLe nom « ${x.name} » (déjà jugé et vérifié) et le fond de page « ${x.ground} » (fixé pour la série) restent tels quels.\n\n# Corrections exigées\n${fixesOf(x).map((f) => `- ${f}`).join("\n")}${series ? `\n\n# Sur l'ensemble de la série\n${series}` : ""}${others.length ? `\n\n# Les autres routes de la série (ne reprends ni leurs phrases, ni leur bouton, ni leurs images, ni leur police de titres)\n${others.map(seen).join("\n")}` : ""}${recentBlock ? `\n\n${recentBlock}` : ""}` }));
      // Une reprise qui change le nom ou le fond de la série n'est pas une reprise : la première version reste, et c'est dit.
      if (normText(draft.name) !== normText(x.name) || (draft.ground !== x.ground && !namesOnly)) {
        notes.push(`reprise de ${x.key} écartée : elle changeait ${normText(draft.name) !== normText(x.name) ? "le nom" : "le fond de page"}`);
        remaining.push(...fixesOf(x).slice(0, 3).map((f) => tag(x.key, f)));
        continue;
      }
      redone.push(finishRoute({ ...draft, name: x.name, ...(keptSlogan ? { slogan: keptSlogan } : {}) }, x.key, { support: x.board.idea.confessionSupport, nameCheck: x.board.nameCheck, ownName: !!keptName }));
      asked.set(x.key, fixesOf(x));
    }

    if (redone.length) {
      const before = (key: string) => drafted.find((x) => x.key === key)!;
      const recheck = await ctx.step(`brand:recheck:${round}`, () => ai.ask(`recheck-${round}`, { kind: "recheck", system: P.recheckSystem(kind), schema: RecheckSchema, prompt: redone.map((f) => `# Route ${f.key}\n## Avant\n${routeText(before(f.key))}\n## Corrections demandées\n${(asked.get(f.key) ?? []).map((l) => `- ${l}`).join("\n")}\n## Après la reprise\n${routeText(f)}`).join("\n\n") }));
      // La reprise (ou le remplacement) n'est gardée que si le directeur de création la juge meilleure ; sinon la première version reste.
      const better = redone.filter((f) => recheck.routes.find((r) => r.key === f.key)?.better !== false);
      list = assemble(drafted.map((x) => better.find((f) => f.key === x.key) ?? x));
      for (const r of recheck.routes.filter((x) => redone.some((f) => f.key === x.key))) {
        if (r.better === false) remaining.push(...(asked.get(r.key) ?? []).slice(0, 3).map((f) => tag(r.key, f)));
        else remaining.push(...r.remaining.filter(Boolean).slice(0, 3).map((f) => tag(r.key, f)));
      }
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    notes.push("plafond de dépense atteint avant la fin de la relecture");
    remaining.push(L("Je n'ai pas pu finir ma relecture : le plafond annoncé était atteint. Regarde ces propositions d'un œil critique.", "I could not finish my review: the announced cap was reached."));
  }
  // Dernier contrôle de la variété, sans IA, sur la série finale (une reprise a pu revenir à une police ou à un fond
  // déjà pris) : avant toute image payante, puisque le logo et la planche montrent la police et les couleurs.
  if (!namesOnly) {
    const v = varierIdentites(list, recent, { modifiables: todo, j });
    list = v.list; notes.push(...v.changes);
  }
  // Premier temps des images : le logo et la grande scène de chaque planche neuve, créés par OpenAI et relus. Une
  // image non gardée n'est pas montrée, et c'est dit. Le reste (objet, signes, publications) est créé pour la seule
  // identité que le client choisit (`brand-finish.ts`).
  // Les logos créés dans CETTE série, dans l'ordre (demande du propriétaire du 16 novembre 2026) : une fois le premier
  // créé, il est donné au dessinateur avec « je veux un logo complètement différent de celui-là » ; le troisième reçoit
  // les deux premiers, et ainsi de suite, avec les mêmes consignes de base. Jamais les logos d'avant.
  const seriesLogos: Buffer[] = [];
  // Un logo refait avant le choix (une planche reprise, les autres gardées) reçoit les logos des AUTRES planches de la
  // série montrée, avec « je veux un logo complètement différent » (audit du 22 novembre 2026 : il ne les recevait pas).
  for (const o of list.filter((y) => !todo.includes(y.key))) {
    const g = o.board?.images?.logo ? getAsset(o.board.images.logo.id) : undefined;
    if (g) { try { seriesLogos.push(assetData(g)); } catch { /* fichier absent */ } }
  }
  /** Planches dont le haut du site attend le vrai logo (aucun logo gardé) : il sera dessiné si elle est choisie. */
  const siteAttend: string[] = [];
  if (a.images ?? brandImagesOn()) {
    for (const x of list.filter((y) => todo.includes(y.key))) {
      try {
        const r = await runBoardImages({ ctx, ai, proposition: true, who: { userId: p.userId, projectId: p.id }, brief, kind, route: x, round, slots: PROPOSAL_SLOTS, clientLogo, madeLogos: [...seriesLogos], gouts: goutsDuClient(j, p.id) });
        const fresh = r.route.board.images?.logo ? getAsset(r.route.board.images.logo.id) : undefined;
        if (fresh) { try { seriesLogos.push(assetData(fresh)); } catch { /* fichier absent : rien à montrer */ } }
        list = list.map((o) => (o.key === x.key ? r.route : o));
        if (r.siteGarde) siteAttend.push(x.key);
        remaining.push(...r.issues); notes.push(...r.notes);
      } catch (e) {
        if (e instanceof CostCapReached) { notes.push("plafond de dépense atteint avant la fin des images"); break; }
        notes.push(`images de ${x.key} non faites : ${String((e as Error)?.message ?? e).slice(0, 120)}`);
      }
    }
  }

  // Le nom de domaine de chaque planche neuve (gratuit, sans IA) : le domaine exact, sinon une adresse libre qui garde
  // le nom entier (« pulpefrance.fr »). Un contrôle impossible n'affirme rien.
  if (domainsOn()) for (const x of list.filter((y) => todo.includes(y.key))) {
    try {
      const d = await ctx.step(`brand:domains:${round}:${x.key}:${normText(x.name)}`, () => findDomains(x.name, x.board.descriptor));
      list = list.map((o) => (o.key === x.key ? { ...o, board: { ...o.board, domains: d } } : o));
    } catch (e) { notes.push(`nom de domaine de ${x.key} non vérifié : ${String((e as Error)?.message ?? e).slice(0, 100)}`); }
  }

  for (const [name, url] of taken) if (list.some((x) => normText(x.name) === name)) remaining.push(L(`Le nom « ${list.find((x) => normText(x.name) === name)!.name} » semble déjà porté par une marque de ton secteur (${url}) : je te déconseille de le choisir.`, "This name seems already used in your sector."));

  // Un nom gardé faute de mieux : le doute du juge est dit franchement au client, jamais caché.
  for (const x of list.filter((y) => todo.includes(y.key))) {
    const doubt = doubts.get(normText(x.name));
    if (doubt) remaining.push(L(`Identité ${x.key} : je ne suis pas convaincue par le nom « ${x.name} » (${doubt}). Je te le montre faute de mieux : dis-moi si tu veux que je reparte en chercher.`, `Identity ${x.key}: I am not convinced by the name "${x.name}" (${doubt}).`));
  }
  const issues = [...new Set([...routeIssues(list, j, keys.length), ...remaining])];
  updateJourney(a.conversationId, (x) => {
    x.identities = {
      list, issues, comparison: series, at: Date.now(), round, chainJobId: ctx.job.id,
      shownNames: [...new Set([...(x.identities?.shownNames ?? []), ...(x.identities?.list ?? []).map((i) => i.name), ...list.map((i) => i.name)])].slice(-60),
      study: { quotes: study.quotes.slice(0, 8), quoteCount: study.quotes.length, sources: study.sources, competitors: study.competitors.slice(0, 8).map((c) => c.name), mould: study.mould, substitutes: study.substitutes.slice(0, 4), notFound: study.notFound.slice(0, 4) },
      ...(firstIssues.length ? { corrected: firstIssues } : {}), ...(a.guidance ? { guidance: a.guidance } : {}),
      ...((() => { const k = [...(x.identities?.siteAncienLogo ?? []).filter((y) => !(todo as string[]).includes(y) && list.some((o) => o.key === y)), ...siteAttend]; return k.length ? { siteAncienLogo: [...new Set(k)] } : {}; })()),
    };
    setStep(x, 1, "review");
    // Nouvelle proposition demandée APRÈS un choix : l'ancien choix ne désigne plus ces planches. Tout ce qui en
    // dépendait (images de la marque, logo, charte) repart ; la marque du projet reste jusqu'au nouveau choix.
    if (x.identityChoice) { x.identityChoice = undefined; x.brandFinish = { prepaidMicro: 0 }; x.logos = undefined; x.logoChoice = undefined; x.brandKit = undefined; if (x.steps[2]?.status !== "skipped") setStep(x, 2, "todo"); setStep(x, 3, "todo"); }
  });
  return { routes: list.map((x) => ({ key: x.key, name: x.name, slogan: x.slogan })), issues, notes, quotes: study.quotes.length, sources: study.sources, facts: clientFacts(j).length > 0 };
}

/** Nombre de routes à proposer pour ce projet (forfait du projet). */
export const routeCountOfProject = (projectId: string): number => routeCountFor(planOfProject(projectId));
