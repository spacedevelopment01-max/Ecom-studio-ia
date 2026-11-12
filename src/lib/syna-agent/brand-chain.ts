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
import { z } from "zod";
import { UserFacingError, getJob, type JobContext } from "../jobs";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { getJsonSetting } from "../settings";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { CostCapReached, withTrace } from "../ai/trace";
import { webResearch, webSearchQuoteMicro, type WebFinding } from "../ai/web-search";
import { sanitizeSymbolSvg } from "../media/logo-symbol";
import { safeFetch } from "../engine/import-link";
import { planOfProject } from "../plan-gates";
import { json as parseJson } from "../db";
import { MAX_ART_CHARS, sanitizeArt } from "./brand-art";
import { BoardSchema, PALETTE_ROLES, WordmarkSchema, type Board, type BoardSymbol } from "./brand-board";
import { brandKnowledgeReady } from "./brand-knowledge";
import * as P from "./brand-prompts";
import { RouteSchema, clientFacts, isReferenceName, nameIssues, routeCountFor, routeIssues, routeKeys, safeWordmark, unprovenClaims, withHonestProofs, type Route, type RouteKey } from "./brand-routes";
import { IdentitySchema, briefFromJourney, keepConstraints, nameKindsFor, normText, prepareIdentities } from "./identities";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";

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
  strong: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  craft: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
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
  verify: { tier: "craft", input: 12_000, output: 2_500, max: 6_000 },
  direction: { tier: "strong", input: 18_000, output: 10_000, max: 18_000 },
  review: { tier: "strong", input: 26_000, output: 6_000, max: 10_000 },
  fix: { tier: "strong", input: 22_000, output: 10_000, max: 18_000 },
  recheck: { tier: "strong", input: 30_000, output: 4_000, max: 8_000 },
  // L'illustratrice : une dizaine de dessins par planche (le gros de sa réponse est du SVG).
  art: { tier: "craft", input: 9_000, output: 16_000, max: 26_000 },
} as const satisfies Record<string, { tier: Tier; input: number; output: number; max: number }>;
type CallId = keyof typeof CALLS;
const RESEARCHES = 3;
/** Pages lues par l'étude (les extraits sont raccourcis) : borne l'entrée de l'appel, donc son coût. */
const MAX_STUDY_PAGES = 45;
/** Pages relues par le Studio pour vérifier les paroles de clients (lecture gratuite). */
const MAX_PAGES_REREAD = 16;

/** Nombre d'appels de chaque sorte selon le travail demandé (série complète, ou reprise de quelques routes). */
function callCounts(routes: number, teams: number, fresh: boolean): Record<CallId, number> {
  // strategy : un second tour d'idées quand trop peu passent les deux épreuves ; fix : une reprise OU un remplacement par route.
  return { study: fresh ? 1 : 0, strategy: fresh ? 2 : 0, team: fresh ? teams : 0, shortlist: 1, verify: 1, direction: routes, review: 1, fix: routes, recheck: 1, art: routes };
}

export type ChainQuote = { maxMicro: number; probableMicro?: number };
/**
 * Devis de la chaîne. Plafond : la somme des coûts MAXIMAUX de tous ses appels (aucun appel ne part au-delà).
 * Coût probable : le déroulé habituel, avec la reprise d'une route sur deux. Mesure du 12 novembre 2026 (essai réel,
 * 3 identités, 20 appels, 14 minutes) : 2,88 € dépensés pour un plafond de 7,83 €.
 */
export function chainQuote(o: { routes: number; fresh?: boolean; settings?: ChainSettings }): ChainQuote {
  const s = o.settings ?? chainSettings(), fresh = o.fresh !== false, n = callCounts(o.routes, s.teams, fresh);
  // Recherches sur le web : faites par le modèle « métier » (réglage économe), pas par le modèle le plus fort.
  const search = webSearchQuoteMicro(s.craft) ?? 0, searches = (fresh ? RESEARCHES : 0) + 1;
  // Coût probable d'une recherche : la moitié de son maximum (essai réel du 12 novembre 2026 : 0,16 à 0,45 € pour 0,50 € au plus).
  let max = search * searches, probable: number | null = (search * searches) / 2;
  for (const id of Object.keys(CALLS) as CallId[]) {
    const c = CALLS[id], m = s[c.tier];
    const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort);
    const usual = estimateCallMicro(m.provider, m.model, c.input, c.output);
    max += (bound ?? (usual ?? 0) * 4) * n[id];
    probable = probable == null || usual == null ? null : probable + usual * (id === "fix" ? Math.ceil(n[id] / 2) : n[id]);
  }
  return { maxMicro: Math.ceil(max), ...(probable ? { probableMicro: Math.ceil(probable) } : {}) };
}

// ---------------------------------------------------------------- formes rendues par les spécialistes

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const StudySchema = z.object({
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
  })).min(1).max(8),
});
type Pick = z.infer<typeof ShortlistSchema>["routes"][number];

const VerifySchema = z.object({ checks: z.array(z.object({ name: z.string().max(60), taken: z.boolean().default(false), url: z.string().max(2000).default(""), note: z.string().max(300).default("") })).max(12).default([]) });

/** Route telle que la rend la direction artistique : la planche avec ses pictogrammes encore en SVG brut. */
const DraftBoard = BoardSchema.omit({ nameCheck: true, signs: true, wordmark: true, idea: true, hero: true, object: true, site: true, posts: true }).extend({
  idea: BoardSchema.shape.idea.omit({ confessionSupport: true }),
  signs: z.array(BoardSchema.shape.signs.element.omit({ symbol: true, art: true }).extend({ symbolSvg: z.string().max(6000).default("") })).min(3).max(5),
  // Les dessins (lettre remplacée comprise) viennent de l'illustratrice, dans un appel à part : jamais de ce brouillon.
  wordmark: WordmarkSchema.omit({ symbol: true, swap: true }).extend({ symbolSvg: z.string().max(6000).default("") }),
  object: BoardSchema.shape.object.omit({ art: true }),
  site: BoardSchema.shape.site.omit({ art: true }),
  posts: z.array(BoardSchema.shape.posts.element.omit({ art: true })).length(3),
});
const DraftSchema = IdentitySchema.pick({ name: true, slogan: true, promise: true, territory: true, ground: true, gradient: true, palette: true, fonts: true, tone: true }).extend({
  nameWhy: z.string().max(400).default(""), nameAnchor: z.string().max(120).default(""), nameExpression: z.string().max(200).default(""),
  sloganTone: z.string().max(80).default(""), paletteFamily: z.string().max(120).default(""), fontStyle: z.string().max(120).default(""), why: z.string().max(500).default(""),
  board: DraftBoard,
});
type Draft = z.infer<typeof DraftSchema>;

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
  research: (id: string, query: string) => Promise<WebFinding[]>;
  /** Appel d'un spécialiste, réponse contrôlée par son schéma. */
  ask: <S extends z.ZodType>(id: string, call: { system: string; prompt: string; schema: S; kind: CallId; prepare?: (raw: unknown) => unknown }) => Promise<z.infer<S>>;
};
export const brandChainDeps: { ai?: (ctx: JobContext) => ChainAi } = {};

function realAi(ctx: JobContext, who: { userId: string; projectId: string }, s: ChainSettings, capMicro: number): ChainAi {
  const scope = (step: string) => ({ jobId: ctx.job.id, projectId: who.projectId, step, costCapMicro: capMicro });
  return {
    research: async (id, query) => (await withTrace(scope(`brand-${id}`), () => webResearch({ userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:web:${id}`, prefer: s.craft }, query))).findings,
    ask: (id, c) => withTrace(scope(`brand-${id}`), () => llmJson({
      task: "strategy", userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, system: c.system, prompt: c.prompt, promptKey: `syna-brand-${c.kind}-1`,
      prepare: c.prepare, maxTokens: CALLS[c.kind].max, maxOutputTokens: CALLS[c.kind].max + 6000, usageKey: `${ctx.job.id}:brand:${id}`,
      routing: { difficulty: CALLS[c.kind].tier === "strong" ? "complex" : "standard", prefer: s[CALLS[c.kind].tier] },
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
    if (!key || seen.has(key) || banned.has(key) || nameIssues(n.name).length || isReferenceName(n.name)) continue;
    seen.add(key);
    out.push({ ...n, name: n.name.trim(), team: t.team });
  }
  return out.slice(0, 240);
}

/** Pictogramme rendu par le modèle : nettoyé par la liste blanche du Studio, ou retiré (jamais le SVG brut à l'écran). */
function cleanSymbol(svg: string, accent: string): BoardSymbol | undefined {
  if (!svg.trim()) return undefined;
  const r = sanitizeSymbolSvg(svg, { accent, maxShapes: 4 });
  return r.ok ? (r.symbol as BoardSymbol) : undefined;
}

/** Brouillon de la direction artistique → route complète et sûre (clé, pictogrammes nettoyés, lignes d'honnêteté). */
export function finishRoute(draft: Draft, key: RouteKey, o: { support: number; nameCheck: Board["nameCheck"]; ownName?: boolean }): Route {
  const d = draft.board;
  const board = withHonestProofs({
    ...d,
    idea: { ...d.idea, confessionSupport: o.support },
    nameCheck: o.nameCheck,
    signs: d.signs.map(({ symbolSvg, ...s }) => { const symbol = cleanSymbol(symbolSvg, draft.palette.accent); return symbol ? { ...s, symbol } : s; }),
    wordmark: (() => { const { symbolSvg, ...w } = d.wordmark; const symbol = cleanSymbol(symbolSvg, draft.palette.accent); return safeWordmark(symbol ? { ...w, symbol } : w, draft.name); })(),
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
 * ne fasse pas refuser toute la planche. Les dessins éventuels du brouillon sont retirés aussi : ils ne viennent que
 * de l'illustratrice, après filtrage.
 */
export function pruneDraft(raw: any): any {
  const b = raw?.board;
  if (!b || typeof b !== "object") return raw;
  const blank = (v: unknown) => v == null || (typeof v === "string" && !v.trim()) || (Array.isArray(v) && !v.length);
  const drop = (o: any, keys: string[]) => { if (o && typeof o === "object") for (const k of keys) if (k in o && blank(o[k])) delete o[k]; };
  const strip = (o: any, keys: string[]) => { if (o && typeof o === "object") for (const k of keys) delete o[k]; };
  drop(b, ["descriptor"]); strip(b, ["hero"]);
  if (b.parcel && blank(b.parcel?.tape)) delete b.parcel;
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
const briefBlock = (j: Journey, guidance?: string) => ["# Fiche de départ du client (ses mots)", briefFromJourney(j), "", "# Existant et refonte", keepConstraints(j), ...(guidance ? ["", "# Ce que le client demande pour cette nouvelle proposition (ses mots)", guidance] : [])].join("\n");
const ideaBlock = (i: Strategy["ideas"][number], s: Strategy) => `Idée ${i.id} : ${i.belief} | aveu : ${s.confessions[i.confession]?.text ?? s.confessions[0].text} | adversaire : ${i.enemy} | preuve dans l'objet : ${i.proof} | ce qu'elle coûte : ${i.cost} | ton : ${i.tone}`;
const routeText = (x: Route) => JSON.stringify({ ...x, board: (({ hero: _h, ...b }) => ({
  ...b, signs: b.signs.map(({ symbol: _s, art: _a, ...s }) => s), wordmark: (({ symbol: _s, swap: _w, ...w }) => w)(b.wordmark),
  object: (({ art: _a, ...o }) => o)(b.object), site: (({ art: _a, ...o }) => o)(b.site), posts: b.posts.map(({ art: _a, ...q }) => q),
}))(x.board) });

// ---------------------------------------------------------------- les dessins de la planche

const svgText = z.string().max(MAX_ART_CHARS + 400).default("");
const ArtDraftSchema = z.object({
  hero: svgText, object: svgText, site: svgText,
  signs: z.array(z.object({ index: z.number().int().min(0).max(4), svg: svgText, ground: z.enum(PALETTE_ROLES).optional().catch(undefined), sample: z.string().max(48).optional().catch(undefined), hand: z.boolean().optional().catch(undefined) })).max(5).default([]),
  posts: z.array(z.object({ index: z.number().int().min(0).max(2), svg: svgText, ground: z.enum(PALETTE_ROLES).optional().catch(undefined) })).max(3).default([]),
  swap: z.object({ letter: z.number().int().min(0).max(39), svg: svgText }).optional().catch(undefined),
});
export type ArtDraft = z.infer<typeof ArtDraftSchema>;

/** Ce que l'illustratrice reçoit d'une route : l'idée, le nom, la palette, et chaque emplacement à dessiner. */
const artBrief = (x: Route) => [
  `Nom : ${x.name}`, `Signature : ${x.slogan}`, `Territoire : ${x.territory}`, `Ce que croit la marque : ${x.board.idea.belief}`, `La preuve, dans l'objet : ${x.board.idea.proof}`,
  `Fond de page : ${x.ground}${x.gradient ? ` (${x.gradient.from} → ${x.gradient.to})` : ""}`,
  `Palette : dark ${x.palette.dark}, primary ${x.palette.primary}, secondary ${x.palette.secondary}, accent ${x.palette.accent}, light ${x.palette.light}`,
  `Nom dessiné : ${(x.board.wordmark.lines ?? [x.name]).join(" / ")}${x.board.wordmark.cut ? " (coupé par une ligne ondulée)" : ""}`,
  `Objet : ${x.board.object.kind} — devant : ${x.board.object.front.join(" · ")}`,
  `Site : ${x.board.site.headline}`,
  "Signes :", ...x.board.signs.map((g, i) => `  ${i}. [${g.kind}] ${g.title} — ${g.text}`),
  "Publications :", ...x.board.posts.map((q, i) => `  ${i}. ${q.text}`),
].join("\n");

/**
 * Pose les dessins de l'illustratrice sur une route. Chaque dessin passe par la liste blanche du Studio ; un dessin
 * refusé est simplement absent (la planche garde sa forme). Rend la route et le nombre de dessins posés et refusés.
 */
export function withArt(route: Route, draft: ArtDraft, facts: string): { route: Route; placed: number; refused: number } {
  let placed = 0, refused = 0;
  const clean = (svg: string | undefined) => { if (!svg?.trim()) return undefined; const r = sanitizeArt(svg); if (r.ok) { placed++; return r.art; } refused++; return undefined; };
  const b = route.board, hero = clean(draft.hero), objectArt = clean(draft.object), siteArt = clean(draft.site);
  const signs = b.signs.map((g, i) => {
    const d = draft.signs.find((x) => x.index === i);
    if (!d || g.kind === "lettrage") return g;
    const art = clean(d.svg), sample = !art && d.sample?.trim() ? d.sample.trim() : undefined;
    return { ...g, ...(art ? { art } : {}), ...(sample ? { sample, ...(d.hand ? { hand: true } : {}) } : {}), ...(d.ground && (art || sample) ? { ground: d.ground } : {}) };
  });
  const posts = b.posts.map((q, i) => { const d = draft.posts.find((x) => x.index === i); if (!d) return q; const art = clean(d.svg); return { ...q, ...(art ? { art } : {}), ...(d.ground ? { ground: d.ground } : {}) }; });
  const swapArt = draft.swap ? clean(draft.swap.svg) : undefined;
  const wordmark = safeWordmark({ ...b.wordmark, ...(swapArt && draft.swap ? { swap: { letter: draft.swap.letter, art: swapArt } } : {}) }, route.name);
  let next: Route = { ...route, board: { ...b, ...(hero ? { hero } : {}), signs, posts, wordmark, object: { ...b.object, ...(objectArt ? { art: objectArt } : {}) }, site: { ...b.site, ...(siteArt ? { art: siteArt } : {}) } } };
  // Les quelques mots ajoutés par l'illustratrice ne portent ni chiffre ni garantie absents de la fiche du client.
  if (unprovenClaims(next, facts).length > unprovenClaims(route, facts).length) next = { ...next, board: { ...next.board, signs: next.board.signs.map(({ sample: _s, hand: _h, ...g }) => g) } };
  const safe = RouteSchema.safeParse(next);
  return safe.success ? { route: safe.data, placed, refused } : { route, placed: 0, refused: placed + refused };
}

// ---------------------------------------------------------------- la tâche

const Payload = z.object({
  projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(),
  count: z.number().int().min(2).max(4), guidance: z.string().max(1500).optional(),
  redo: z.array(z.enum(["A", "B", "C", "D"])).optional(), namesOnly: z.boolean().optional(),
});
export type BrandJobPayload = z.infer<typeof Payload>;

export async function runSinaBrandJob(ctx: JobContext) {
  const a = Payload.parse(ctx.payload);
  const p = loadProject(a.projectId);
  const j = journeyOf(a.conversationId);
  const ready = brandKnowledgeReady();
  if (!ready.ok) throw new UserFacingError(L("La création de la marque ne peut pas commencer : un cahier de métier de SINA manque. Rien n'a été décompté.", "Brand creation cannot start: a knowledge file is missing. Nothing was charged."));
  const settings = chainSettings();
  const ai = brandChainDeps.ai ? brandChainDeps.ai(ctx) : realAi(ctx, { userId: p.userId, projectId: p.id }, settings, a.capMicro);
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
  const brief = briefBlock(j, a.guidance);

  // Atelier d'une proposition précédente (étude, idées, réserve de noms) : repris tel quel, jamais repayé.
  const before = j.identities?.chainJobId ? parseJson<Record<string, unknown>>(getJob(j.identities.chainJobId)?.checkpoint ?? "{}", {}) : {};
  if ((a.redo?.length || a.namesOnly || a.guidance) && before["brand:strategy"]) for (const [k, v] of Object.entries(before)) if (/^brand:(study|strategy|team:)/.test(k) && !(k in ctx.checkpoint)) ctx.save(k, v);

  // 1. Comprendre : trois recherches, puis l'étude. Une recherche qui échoue est dite, jamais remplacée ni relancée.
  ctx.progress(0.03, L("J'étudie ton marché", "Studying your market"));
  const study = await ctx.step("brand:study", async (): Promise<Study> => {
    const findings: WebFinding[] = [];
    for (const q of P.researchQueries(briefFromJourney(j))) {
      try { findings.push(...await ai.research(q.id, q.query)); } catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`recherche « ${q.id} » sans résultat`); }
    }
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
  if (!j.keep.includes("nom")) for (const [i, path] of paths.entries()) {
    ctx.progress(0.3 + (0.2 * i) / paths.length, L(`Je cherche des noms (${i + 1} sur ${paths.length})`, `Looking for names (${i + 1} of ${paths.length})`));
    const r = await ctx.step(`brand:team:${path.id}`, () => ai.ask(`team-${path.id}`, { kind: "team", system: P.teamSystem(kind, path), schema: TeamSchema, prompt: `${brief}\n\n# Idées de marque\n${ideas.map((i) => ideaBlock(i, strategy)).join("\n")}\n\n# Le moule de la catégorie (à ne pas refaire)\n${study.mould || "non trouvé"}\n\n# Noms des concurrents (jamais repris)\n${study.competitors.map((c) => c.name).join(", ") || "non trouvé"}` }));
    teams.push({ team: path.id, names: r.names });
  }
  // Noms déjà montrés AVANT cette tâche, fixés une fois : une relance après coup n'écarte pas ses propres noms.
  const shown = await ctx.step("brand:shown", async () => [...new Set((j.identities?.shownNames ?? []).concat(previous.map((x) => x.name)))]);
  const pool = namePool(teams, { competitors: study.competitors.map((c) => c.name), shown });

  // Premier jugement : les routes (une idée + un nom), plus deux réserves.
  ctx.progress(0.55, L("Je compose les routes de ta marque", "Composing your brand routes"));
  // Numéro de la proposition, fixé une fois pour la tâche : une relance après coup retrouve ses points de reprise.
  const round = await ctx.step("brand:round", async () => (j.identities?.round ?? 0) + 1);
  const shortlistPrompt = [
    brief, "", "# Étude", studyDigest(study), "", "# Idées de marque", ...ideas.map((i) => ideaBlock(i, strategy)), "",
    j.keep.includes("nom") ? "# Nom : le client garde son nom. Chaque route le reprend mot pour mot (name) ; compose des routes aux idées différentes." : `# Noms trouvés par les équipes (${pool.length})\n${pool.map((n) => `- ${n.name} | détail : ${n.detail} | deuxième lecture : ${n.second}${n.idea ? ` | idée ${n.idea}` : ""}`).join("\n")}`,
    ...(kept.length ? ["", `# Routes GARDÉES par le client (ne les refais pas ; les nouvelles doivent en différer : autre idée, autre moule de nom, autre fond, autre teinte, autre police)`, ...kept.map((x) => `- ${x.key} « ${x.name} » : ${x.board.idea.belief} (fond ${x.ground}, bouton ${x.palette.primary}, titres ${x.fonts.heading})`)] : []),
    ...(namesOnly ? ["", "# Le client veut SEULEMENT de nouveaux noms : garde l'idée de chaque route, change le nom.", ...previous.filter((x) => todo.includes(x.key)).map((x) => `- ${x.key} : idée « ${x.board.idea.belief} », fond ${x.ground} ; ancien nom « ${x.name} » (à ne pas reproposer)`)] : []),
    ...(shown.length ? ["", `# Noms déjà montrés au client (jamais reproposés) : ${[...new Set(shown)].join(", ")}`] : []),
    "", `Compose ${todo.length} route(s) pour ${todo.length > 1 ? "les clés" : "la clé"} ${todo.join(", ")}, dans cet ordre, puis 2 réserves.`,
  ].join("\n");
  const shortlist = await ctx.step(`brand:shortlist:${round}`, () => ai.ask("shortlist", { kind: "shortlist", system: P.shortlistSystem(kind, todo.length), schema: ShortlistSchema, prompt: shortlistPrompt }));
  // Un nom que le premier jugement aurait inventé hors de la réserve passe le même contrôle gratuit que les autres.
  const sound = shortlist.routes.filter((r) => j.keep.includes("nom") || (!nameIssues(r.name).length && !isReferenceName(r.name) && !shown.some((s) => normText(s) === normText(r.name))));
  let picks = sound.filter((r) => !r.reserve).slice(0, todo.length);
  const reserves = sound.filter((r) => !picks.includes(r));
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
      try { findings = await ai.research(`verify-${round}`, P.verifyQuery(candidates, briefFromJourney(j))); } catch (e) { if (e instanceof CostCapReached) throw e; return { done: false as const, checks: [] }; }
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
  const ideaOf = (r: Pick) => strategy.ideas.find((i) => i.id === r.idea) ?? ideas[0];
  /** Ce qu'une route doit savoir des autres pour s'en écarter (couleurs, police, phrases, bouton). */
  const seen = (x: Route) => `- ${x.key} « ${x.name} » : fond ${x.ground}, bouton ${x.palette.primary}, titres ${x.fonts.heading} (police de titres déjà prise), signature « ${x.slogan} », titre du site « ${x.board.site.headline} », bouton du site « ${x.board.site.button} »`;
  const routePrompt = (r: Pick, idea: Strategy["ideas"][number], others: Route[], old?: Route) => [
    brief, "", "# Étude", studyDigest(study), "", "# La route à mettre en planche",
    `Nom : ${r.name}${j.keep.includes("nom") ? " (nom gardé par le client)" : ""}`, `Détail réel : ${r.detail}`, `Deuxième lecture : ${r.second}`, `Logique dite au client : ${r.why}`, `Risques connus : ${r.risks.join(" ; ") || "aucun relevé"}`,
    ideaBlock(idea, strategy), `Ton de la route : ${r.tone || idea.tone}`, `Fond de page : ${r.ground}`, `Teinte du bouton : ${r.hue}`, `Caractère de la police de titres : ${r.type}`,
    ...(others.length ? ["", "# Les autres routes de la série (reste nettement différente : autre teinte de bouton, AUTRE police de titres, autres images, autres phrases)", ...others.map(seen)] : []),
    ...(namesOnly && old ? ["", "# Le client garde TOUT de cette route sauf le nom : reprends à l'identique son fond, son dégradé, sa palette, ses polices, son ton, ses curseurs de voix, ses signes et son objet ; réécris le nom, sa logique, la signature et les phrases qui citaient l'ancien nom.", routeText(old)] : []),
  ].join("\n");
  const planOf = new Map(todo.map((k, n) => [k, picks[n]] as const));
  const drafted: Route[] = [];
  for (const [n, key] of todo.entries()) {
    ctx.progress(0.66 + (0.16 * n) / todo.length, L(`Je prépare la planche ${key}`, `Preparing board ${key}`));
    const r = picks[n], idea = ideaOf(r), old = previous.find((x) => x.key === key);
    const prompt = routePrompt(r, idea, [...kept, ...drafted], old);
    const draft = await ctx.step(`brand:direction:${round}:${key}`, () => ai.ask(`direction-${round}-${key}`, { kind: "direction", system: P.directionSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt }));
    const forced: Draft = namesOnly && old ? { ...draft, ground: old.ground, gradient: old.gradient, palette: old.palette, paletteFamily: old.paletteFamily, fonts: old.fonts, fontStyle: old.fontStyle, tone: old.tone } : draft;
    drafted.push(finishRoute({ ...forced, name: keptName || r.name, ...(keptSlogan ? { slogan: keptSlogan } : {}) }, key, { support: support(idea), nameCheck: taken.has(normText(r.name)) ? "non_verifie" : nameCheck, ownName: !!keptName }));
  }
  const assemble = (fresh: Route[]) => keys.map((k) => fresh.find((x) => x.key === k) ?? kept.find((x) => x.key === k)).filter((x): x is Route => !!x);
  let list = assemble(drafted);
  const firstIssues = routeIssues(list, j, keys.length);

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
      const draft = await ctx.step(`brand:fix:${round}:${x.key}`, () => ai.ask(`fix-${round}-${x.key}`, { kind: "fix", system: P.fixSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt: `${brief}\n\n# Ta route\n${routeText(x)}\n\n# Ce qui ne change pas\nLe nom « ${x.name} » (déjà jugé et vérifié) et le fond de page « ${x.ground} » (fixé pour la série) restent tels quels.\n\n# Corrections exigées\n${fixesOf(x).map((f) => `- ${f}`).join("\n")}${series ? `\n\n# Sur l'ensemble de la série\n${series}` : ""}${others.length ? `\n\n# Les autres routes de la série (ne reprends ni leurs phrases, ni leur bouton, ni leurs images, ni leur police de titres)\n${others.map(seen).join("\n")}` : ""}` }));
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
  // Les dessins : l'illustratrice dessine chaque planche neuve, une fois les textes arrêtés. Un appel qui échoue n'est
  // jamais relancé seul : la planche reste sans dessins (elle garde sa forme), et c'est noté.
  const facts = clientFacts(j), fresh = list.filter((x) => todo.includes(x.key));
  try {
    for (const [n, x] of fresh.entries()) {
      ctx.progress(0.95 + (0.04 * n) / fresh.length, L(`Je dessine la planche ${x.key}`, `Drawing board ${x.key}`));
      let drawn: ArtDraft | null = null;
      try { drawn = await ctx.step(`brand:art:${round}:${x.key}`, () => ai.ask(`art-${round}-${x.key}`, { kind: "art", system: P.artSystem(kind), schema: ArtDraftSchema, prompt: `${brief}\n\n# La route à dessiner\n${artBrief(x)}` })); }
      catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`dessins de ${x.key} non faits : ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
      if (!drawn) continue;
      const r = withArt(x, drawn, facts);
      list = list.map((o) => (o.key === x.key ? r.route : o));
      if (r.refused) notes.push(`${r.refused} dessin(s) de ${x.key} refusé(s) par le contrôle`);
      if (!r.placed) notes.push(`planche ${x.key} sans dessin`);
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    notes.push("plafond de dépense atteint avant la fin des dessins");
  }

  for (const [name, url] of taken) if (list.some((x) => normText(x.name) === name)) remaining.push(L(`Le nom « ${list.find((x) => normText(x.name) === name)!.name} » semble déjà porté par une marque de ton secteur (${url}) : je te déconseille de le choisir.`, "This name seems already used in your sector."));

  const issues = [...new Set([...routeIssues(list, j, keys.length), ...remaining])];
  updateJourney(a.conversationId, (x) => {
    x.identities = {
      list, issues, comparison: series, at: Date.now(), round, chainJobId: ctx.job.id,
      shownNames: [...new Set([...(x.identities?.shownNames ?? []), ...(x.identities?.list ?? []).map((i) => i.name), ...list.map((i) => i.name)])].slice(-60),
      study: { quotes: study.quotes.slice(0, 8), quoteCount: study.quotes.length, sources: study.sources, competitors: study.competitors.slice(0, 8).map((c) => c.name), mould: study.mould, substitutes: study.substitutes.slice(0, 4), notFound: study.notFound.slice(0, 4) },
      ...(firstIssues.length ? { corrected: firstIssues } : {}), ...(a.guidance ? { guidance: a.guidance } : {}),
    };
    setStep(x, 1, "review");
  });
  return { routes: list.map((x) => ({ key: x.key, name: x.name, slogan: x.slogan })), issues, notes, quotes: study.quotes.length, sources: study.sources, facts: clientFacts(j).length > 0 };
}

/** Nombre de routes à proposer pour ce projet (forfait du projet). */
export const routeCountOfProject = (projectId: string): number => routeCountFor(planOfProject(projectId));
