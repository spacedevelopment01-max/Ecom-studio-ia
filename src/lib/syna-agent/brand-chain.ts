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
import { planOfProject } from "../plan-gates";
import { json as parseJson } from "../db";
import { BoardSchema, WordmarkSchema, type Board, type BoardSymbol } from "./brand-board";
import { brandKnowledgeReady } from "./brand-knowledge";
import * as P from "./brand-prompts";
import { RouteSchema, clientFacts, isReferenceName, nameIssues, routeCountFor, routeIssues, routeKeys, safeWordmark, withHonestProofs, type Route, type RouteKey } from "./brand-routes";
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
} as const satisfies Record<string, { tier: Tier; input: number; output: number; max: number }>;
type CallId = keyof typeof CALLS;
const RESEARCHES = 3;
/** Pages lues par l'étude (les extraits sont raccourcis) : borne l'entrée de l'appel, donc son coût. */
const MAX_STUDY_PAGES = 45;

/** Nombre d'appels de chaque sorte selon le travail demandé (série complète, ou reprise de quelques routes). */
function callCounts(routes: number, teams: number, fresh: boolean): Record<CallId, number> {
  return { study: fresh ? 1 : 0, strategy: fresh ? 1 : 0, team: fresh ? teams : 0, shortlist: 1, verify: 1, direction: routes, review: 1, fix: routes, recheck: 1 };
}

export type ChainQuote = { maxMicro: number; probableMicro?: number };
/**
 * Devis de la chaîne. Plafond : la somme des coûts MAXIMAUX de tous ses appels (aucun appel ne part au-delà).
 * Coût probable : le déroulé habituel, avec la reprise d'une route sur deux. [Estimation, pas encore mesurée sur un
 * essai réel.]
 */
export function chainQuote(o: { routes: number; fresh?: boolean; settings?: ChainSettings }): ChainQuote {
  const s = o.settings ?? chainSettings(), fresh = o.fresh !== false, n = callCounts(o.routes, s.teams, fresh);
  const search = webSearchQuoteMicro() ?? 0, searches = (fresh ? RESEARCHES : 0) + 1;
  let max = search * searches, probable: number | null = search * searches;
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
const DraftBoard = BoardSchema.omit({ nameCheck: true, signs: true, wordmark: true, idea: true }).extend({
  idea: BoardSchema.shape.idea.omit({ confessionSupport: true }),
  signs: z.array(BoardSchema.shape.signs.element.omit({ symbol: true }).extend({ symbolSvg: z.string().max(6000).default("") })).min(3).max(5),
  wordmark: WordmarkSchema.omit({ symbol: true }).extend({ symbolSvg: z.string().max(6000).default("") }),
});
const DraftSchema = IdentitySchema.pick({ name: true, slogan: true, promise: true, territory: true, ground: true, gradient: true, palette: true, fonts: true, tone: true }).extend({
  nameWhy: z.string().max(400).default(""), nameAnchor: z.string().max(120).default(""), nameExpression: z.string().max(200).default(""),
  sloganTone: z.string().max(80).default(""), paletteFamily: z.string().max(120).default(""), fontStyle: z.string().max(120).default(""), why: z.string().max(500).default(""),
  board: DraftBoard,
});
type Draft = z.infer<typeof DraftSchema>;

const ReviewSchema = z.object({
  routes: z.array(z.object({ key: z.string().max(2), score: z.number().min(0).max(10).default(0), verdict: z.enum(["garder", "reprendre"]).catch("reprendre"), fixes: z.array(z.string().max(400)).max(10).default([]) })).max(4).default([]),
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
    research: async (id, query) => (await withTrace(scope(`brand-${id}`), () => webResearch({ userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:brand:web:${id}` }, query))).findings,
    ask: (id, c) => withTrace(scope(`brand-${id}`), () => llmJson({
      task: "strategy", userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, system: c.system, prompt: c.prompt, promptKey: `syna-brand-${c.kind}-1`,
      prepare: c.prepare, maxTokens: CALLS[c.kind].max, maxOutputTokens: CALLS[c.kind].max + 6000, usageKey: `${ctx.job.id}:brand:${id}`,
      routing: { difficulty: CALLS[c.kind].tier === "strong" ? "complex" : "standard", prefer: s[CALLS[c.kind].tier] },
    }, c.schema)),
  };
}

// ---------------------------------------------------------------- contrôles gratuits des temps de la chaîne

const loose = (s: string) => s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[«»“”"]/g, "").replace(/\s+/g, " ").trim();
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
const prepareDraft = (raw: any) => { const one = prepareIdentities({ identities: [raw?.route ?? raw] })?.identities?.[0]; return one ?? raw; };

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
const routeText = (x: Route) => JSON.stringify({ ...x, board: { ...x.board, signs: x.board.signs.map(({ symbol: _s, ...s }) => s), wordmark: (({ symbol: _s, ...w }) => w)(x.board.wordmark) } });

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
    const read = [...findings].sort((x, y) => Number(y.category === "customers") - Number(x.category === "customers")).slice(0, MAX_STUDY_PAGES);
    const pages = read.map((f, i) => `[page ${i}] ${f.url}\n${f.title}\n${f.excerpt.slice(0, f.category === "customers" ? 2400 : 1000)}`).join("\n\n");
    const raw = await ai.ask("study", { kind: "study", system: P.STUDY_SYSTEM, schema: StudySchema, prompt: `${brief}\n\n# Pages trouvées (${read.length})\n${pages}` });
    const q = verifiedQuotes(raw.quotes, findings);
    const urls = (u: string) => findings.some((f) => sameUrl(f.url, u));
    return { ...raw, quotes: q.kept.slice(0, 40), facts: raw.facts.filter((f) => urls(f.url)), competitors: raw.competitors.map((c) => ({ ...c, url: urls(c.url) ? c.url : "" })), sources: new Set(findings.map((f) => f.url)).size, dropped: q.dropped };
  });
  if (study.quotes.length < 10) notes.push(`${study.quotes.length} parole(s) réelle(s) de clients trouvée(s) : moins de dix`);

  // 2 et 3. L'aveu, l'adversaire, les idées.
  ctx.progress(0.2, L("Je cherche l'idée de ta marque", "Looking for your brand idea"));
  const strategy = await ctx.step("brand:strategy", () => ai.ask("strategy", { kind: "strategy", system: P.strategySystem(), schema: StrategySchema, prompt: `${brief}\n\n# Étude\n${studyDigest(study)}` }));
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
  const drafted: Route[] = [];
  for (const [n, key] of todo.entries()) {
    ctx.progress(0.66 + (0.16 * n) / todo.length, L(`Je prépare la planche ${key}`, `Preparing board ${key}`));
    const r = picks[n], idea = ideaOf(r), old = previous.find((x) => x.key === key);
    const others = [...kept, ...drafted].map((x) => `- ${x.key} « ${x.name} » : fond ${x.ground}, bouton ${x.palette.primary}, titres ${x.fonts.heading}, signature « ${x.slogan} »`);
    const prompt = [
      brief, "", "# Étude", studyDigest(study), "", "# La route à mettre en planche",
      `Nom : ${r.name}${j.keep.includes("nom") ? " (nom gardé par le client)" : ""}`, `Détail réel : ${r.detail}`, `Deuxième lecture : ${r.second}`, `Logique dite au client : ${r.why}`, `Risques connus : ${r.risks.join(" ; ") || "aucun relevé"}`,
      ideaBlock(idea, strategy), `Ton de la route : ${r.tone || idea.tone}`, `Fond de page : ${r.ground}`, `Teinte du bouton : ${r.hue}`, `Caractère de la police de titres : ${r.type}`,
      ...(others.length ? ["", "# Les autres routes de la série (reste nettement différente : autre teinte de bouton, autre police de titres, autres images)", ...others] : []),
      ...(namesOnly && old ? ["", "# Le client garde TOUT de cette route sauf le nom : reprends à l'identique son fond, son dégradé, sa palette, ses polices, son ton, ses curseurs de voix, ses signes et son objet ; réécris le nom, sa logique, la signature et les phrases qui citaient l'ancien nom.", routeText(old)] : []),
    ].join("\n");
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
    const fixesOf = (x: Route) => [...(review.routes.find((r) => r.key === x.key && r.verdict === "reprendre")?.fixes ?? []), ...firstIssues.filter((f) => mine(x, f)), ...(x.key === drafted[0]?.key ? [] : shared)].filter(Boolean);
    const toFix = drafted.filter((x) => fixesOf(x).length);
    if (toFix.length) {
      const fixed: Route[] = [];
      for (const [n, x] of toFix.entries()) {
        ctx.progress(0.88 + (0.06 * n) / toFix.length, L(`Je reprends la planche ${x.key}`, `Reworking board ${x.key}`));
        const draft = await ctx.step(`brand:fix:${round}:${x.key}`, () => ai.ask(`fix-${round}-${x.key}`, { kind: "fix", system: P.fixSystem(kind), schema: DraftSchema, prepare: prepareDraft, prompt: `${brief}\n\n# Ta route\n${routeText(x)}\n\n# Corrections exigées\n${fixesOf(x).map((f) => `- ${f}`).join("\n")}${series ? `\n\n# Sur l'ensemble de la série\n${series}` : ""}` }));
        // Le nom ne change jamais pendant une reprise (il a été jugé et vérifié avant).
        fixed.push(finishRoute({ ...draft, name: x.name, ...(keptSlogan ? { slogan: keptSlogan } : {}) }, x.key, { support: x.board.idea.confessionSupport, nameCheck: x.board.nameCheck, ownName: !!keptName }));
      }
      const recheck = await ctx.step(`brand:recheck:${round}`, () => ai.ask(`recheck-${round}`, { kind: "recheck", system: P.recheckSystem(kind), schema: RecheckSchema, prompt: toFix.map((x) => `# Route ${x.key}\n## Avant\n${routeText(x)}\n## Corrections demandées\n${fixesOf(x).map((f) => `- ${f}`).join("\n")}\n## Après la reprise\n${routeText(fixed.find((f) => f.key === x.key)!)}`).join("\n\n") }));
      // La reprise n'est gardée que si le directeur de création la juge meilleure ; sinon la première version reste.
      const better = fixed.filter((f) => recheck.routes.find((r) => r.key === f.key)?.better !== false);
      list = assemble(drafted.map((x) => better.find((f) => f.key === x.key) ?? x));
      for (const r of recheck.routes) {
        if (r.better === false) remaining.push(...fixesOf(toFix.find((x) => x.key === r.key)!).map((f) => (f.startsWith("Identité") ? f : `Identité ${r.key} : ${f}`)));
        else remaining.push(...r.remaining.filter(Boolean).map((f) => `Identité ${r.key} : ${f}`));
      }
    }
  } catch (e) {
    if (!(e instanceof CostCapReached)) throw e;
    notes.push("plafond de dépense atteint avant la fin de la relecture");
    remaining.push(L("Je n'ai pas pu finir ma relecture : le plafond annoncé était atteint. Regarde ces propositions d'un œil critique.", "I could not finish my review: the announced cap was reached."));
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
