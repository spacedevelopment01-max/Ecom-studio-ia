/**
 * Chaîne des trois angles de SINA (lot 3, 16 novembre 2026 ; méthode acceptée par le propriétaire le 14 novembre 2026).
 *
 *   1. Le dossier, sans IA : les faits du client (sa fiche, ce qu'il a dit à SINA), sa marque choisie, et l'étude du
 *      marché déjà faite pour la marque (paroles réelles d'acheteurs, concurrents). Rien n'est repayé. Un complément
 *      d'écoute sur le web ne part que s'il manque des paroles d'acheteurs.
 *   2. Trois stratèges SÉPARÉES, en même temps, chacune avec son entrée : sûr (les faits du client), émotion (les
 *      paroles d'acheteurs), audacieux (le moule de la catégorie). Chaque angle est une scène : qui, quand, avant, après.
 *   3. Le contrôle du Studio, sans IA : un chiffre ou un mot de garantie absent des faits du client, une accroche
 *      répétée.
 *   4. Un juge à part note chaque proposition sur 10 et choisit les trois à montrer. Sous 8, l'entrée est reprise UNE
 *      fois par sa stratège, puis rejugée. Un angle qui reste sous 8 est montré avec le doute de SINA.
 *   5. Un lecteur qui ne sait rien lit les phrases courtes des trois angles ; ce qu'il ne comprend pas est réécrit, puis
 *      relu.
 *
 * Tâche de fond : chaque appel payant est un point de reprise ; un plafond borne la tâche entière.
 */
import { z } from "zod";
import { UserFacingError, type JobContext } from "../jobs";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { callCostBoundMicro, estimateCallMicro, llmJson } from "../ai/llm";
import { CostCapReached, withTrace } from "../ai/trace";
import { webResearch, webSearchQuoteMicro, type WebFinding } from "../ai/web-search";
import { ReaderSchema, StudySchema, chainSettings, quotesReadOnPages, verifiedQuotes, type ChainQuote, type ChainSettings, type Study } from "./brand-chain";
import * as BP from "./brand-prompts";
import { unprovenIn } from "./brand-routes";
import { briefFromJourney, normText } from "./identities";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { chosenRoute } from "./logos";
import * as P from "./angles-prompts";
import { ANGLE_ROLES, type AngleRole } from "./angles-prompts";
import { angleFacts, brandStudyOf, type SinaAngle, type SinaAngles } from "./angles";

export const SINA_ANGLES_JOB = "syna.angles";

/** Propositions écrites par chaque stratège, puis par sa reprise. */
export const CANDIDATES = 3, REWORKED = 2;
/** Note du juge à partir de laquelle un angle est gardé (règle du propriétaire : 8 sur 10). */
export const KEPT_NOTE = 8;
/** En dessous de ce nombre de paroles d'acheteurs, SINA retourne écouter le web avant d'écrire. */
export const MIN_QUOTES = 8;

// ---------------------------------------------------------------- devis

type Tier = "strong" | "craft";
const CALLS = {
  listen: { tier: "craft", input: 18_000, output: 5_000, max: 9_000 },
  strategist: { tier: "strong", input: 9_000, output: 7_000, max: 12_000 },
  judge: { tier: "strong", input: 16_000, output: 4_000, max: 8_000 },
  rework: { tier: "strong", input: 11_000, output: 5_500, max: 10_000 },
  recheck: { tier: "strong", input: 14_000, output: 2_500, max: 6_000 },
  reader: { tier: "strong", input: 2_500, output: 2_000, max: 5_000 },
  clarify: { tier: "strong", input: 5_000, output: 2_000, max: 5_000 },
} as const satisfies Record<string, { tier: Tier; input: number; output: number; max: number }>;
type CallId = keyof typeof CALLS;

/**
 * Devis des angles. Plafond : la somme des coûts maximaux de tous les appels possibles (aucun ne part au-delà).
 * Coût probable : le déroulé habituel (une entrée reprise, quelques phrases réécrites). `listen` : il manque des
 * paroles d'acheteurs, l'écoute du web est comptée comme probable.
 */
export function anglesQuote(o: { listen?: boolean; settings?: ChainSettings } = {}): ChainQuote {
  const s = o.settings ?? chainSettings();
  const most: Record<CallId, number> = { listen: 1, strategist: 3, judge: 1, rework: 3, recheck: 1, reader: 2, clarify: 1 };
  const usual: Record<CallId, number> = { listen: o.listen ? 1 : 0, strategist: 3, judge: 1, rework: 1, recheck: 1, reader: 1, clarify: 1 };
  const search = webSearchQuoteMicro(s.craft) ?? 0;
  let max = search, probable: number | null = o.listen ? search / 2 : 0;
  for (const id of Object.keys(CALLS) as CallId[]) {
    const c = CALLS[id], m = s[c.tier];
    const bound = callCostBoundMicro(m.provider, m.model, c.input * 1.5, c.max, m.effort), one = estimateCallMicro(m.provider, m.model, c.input, c.output);
    max += (bound ?? (one ?? 0) * 4) * most[id];
    probable = probable == null || one == null ? null : probable + one * usual[id];
  }
  return { maxMicro: Math.ceil(max), ...(probable ? { probableMicro: Math.ceil(probable) } : {}) };
}

// ---------------------------------------------------------------- formes rendues par les spécialistes

const txt = (max: number) => z.string().min(1).max(max);
export const AngleDraftSchema = z.object({
  title: txt(90), person: txt(320), moment: txt(320), before: txt(400), after: txt(400), emotion: txt(120), promise: txt(260), hook: txt(160),
  site: z.object({ title: txt(120), text: txt(360), button: txt(48) }),
  post: z.object({ title: txt(120), text: txt(700) }),
  show: txt(600),
  arguments: z.array(z.string().max(300)).max(5).default([]),
  objections: z.array(z.object({ objection: z.string().max(300), answer: z.string().max(400) })).max(4).default([]),
  quotes: z.array(z.number().int().min(0)).max(8).default([]),
  toConfirm: z.array(z.string().max(240)).max(3).default([]),
  why: txt(500), tone: z.string().max(160).default(""),
});
export type AngleDraft = z.infer<typeof AngleDraftSchema>;
const StrategistSchema = z.object({ angles: z.array(AngleDraftSchema).min(1).max(5) });
const RoleSchema = z.enum(["sur", "emotion", "audacieux"]);
const JudgeSchema = z.object({
  angles: z.array(z.object({ id: z.string().max(24), note: z.number().min(0).max(10), why: z.string().max(500).default(""), fixes: z.array(z.string().max(400)).max(4).default([]) })).min(1).max(24),
  selection: z.object({ sur: z.string().max(24).default(""), emotion: z.string().max(24).default(""), audacieux: z.string().max(24).default(""), recommande: RoleSchema.catch("sur"), pourquoi: z.string().max(500).default("") }).optional(),
  overall: z.string().max(600).default(""),
});
type Judge = z.infer<typeof JudgeSchema>;
const ClarifySchema = z.object({ texts: z.array(z.object({ id: z.string().max(12), text: z.string().min(1).max(700) })).max(20).default([]) });

export type Candidate = AngleDraft & { id: string; role: AngleRole; issues: string[] };
type Verdict = { note: number; why: string; fixes: string[] };

export type AnglesAi = {
  research: (id: string, query: string) => Promise<WebFinding[]>;
  ask: <S extends z.ZodType>(id: string, call: { system: string; prompt: string; schema: S; kind: CallId }) => Promise<z.infer<S>>;
};
export const anglesChainDeps: { ai?: (ctx: JobContext) => AnglesAi } = {};

function realAi(ctx: JobContext, who: { userId: string; projectId: string }, s: ChainSettings, capMicro: number): AnglesAi {
  const scope = (step: string) => ({ jobId: ctx.job.id, projectId: who.projectId, step, costCapMicro: capMicro });
  return {
    research: async (id, query) => (await withTrace(scope(`angles-${id}`), () => webResearch({ userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:angles:web:${id}`, prefer: s.craft }, query))).findings,
    // En direct : le client attend ses angles devant l'écran, et le différé n'y ferait gagner que quelques centimes.
    ask: (id, c) => withTrace(scope(`angles-${id}`), () => llmJson({
      task: "strategy", userId: who.userId, projectId: who.projectId, jobId: ctx.job.id, system: c.system, prompt: c.prompt, promptKey: `syna-angles-${c.kind}-1`,
      maxTokens: CALLS[c.kind].max, maxOutputTokens: CALLS[c.kind].max + 6000, usageKey: `${ctx.job.id}:angles:${id}`,
      routing: { difficulty: CALLS[c.kind].tier === "strong" ? "complex" : "standard", prefer: s[CALLS[c.kind].tier] },
    }, c.schema)),
  };
}

// ---------------------------------------------------------------- le dossier (sans IA)

const numbered = (lines: string[]) => lines.map((l, i) => `${i}. ${l}`).join("\n");

/** La marque choisie, telle que les stratèges la lisent : son nom, ce qu'elle vend, son idée, sa voix. */
export function brandBlock(j: Journey, projectId: string): string {
  const r = chosenRoute(j);
  const p = (() => { try { return loadProject(projectId); } catch { return null; } })();
  if (!r) return p?.brand ? [`Nom : ${p.brand.name}`, p.brand.tagline ? `Signature : ${p.brand.tagline}` : "", p.brand.positioning ? `Promesse : ${p.brand.positioning}` : ""].filter(Boolean).join("\n") : "Marque non précisée.";
  const b = r.board;
  return [
    `Nom : ${r.name}`, `Signature : ${r.slogan}`, b.descriptor ? `Ce qu'elle vend, en quelques mots : ${b.descriptor}` : "", `Promesse : ${r.promise}`,
    `Idée de la marque : ${b.idea.belief}`, `Son adversaire : ${b.idea.enemy}`, `Ton : ${r.tone.adjectives.join(", ")}`,
    b.voice.is?.length ? `Elle est : ${b.voice.is.join(" ")}` : "", `Ses mots : ${b.voice.houseWords.join(", ")}`, `Mots qu'elle n'emploie jamais : ${b.voice.bannedWords.join(", ")}`,
    `Ceci, pas cela : ${b.voice.thisNotThat.map((t) => `${t.yes} (pas : ${t.no})`).join(" ; ")}`,
    b.lines?.length ? `Phrases écrites dans sa voix : ${b.lines.slice(0, 3).map((l: string) => `« ${l} »`).join(" ")}` : "",
    b.toProve.length ? `Ce qui reste à prouver (jamais à présenter comme acquis) : ${b.toProve.join(" ; ")}` : "",
  ].filter(Boolean).join("\n");
}

function dossier(o: { facts: string; brand: string; study: Study; guidance?: string; shown?: SinaAngle[] }): string {
  const st = o.study;
  return [
    "# Les faits du client (la seule source de vérité sur son produit ou sa prestation)", o.facts || "Aucun fait donné.", "",
    "# Sa marque", o.brand, "",
    `# Paroles réelles d'acheteurs (${st.quotes.length}, mot pour mot, lues sur le web)`, st.quotes.length ? numbered(st.quotes.map((q) => `« ${q.text} »`)) : "Aucune trouvée : n'invente aucune parole, et laisse quotes vide.", "",
    "# Ses concurrents et le moule de la catégorie",
    `Concurrents : ${st.competitors.map((c) => `${c.name}${c.codes ? ` (${c.codes})` : ""}`).join(" ; ") || "non trouvé"}.`,
    `Ce que tous disent de la même façon : ${st.mould || "non trouvé"}`,
    `Ce que font les gens à la place : ${st.substitutes.join(" ; ") || "non trouvé"}.`,
    ...(st.facts.length ? [`Faits d'usage du marché (ce ne sont PAS des promesses du client) : ${st.facts.map((f) => f.text).join(" ; ")}.`] : []),
    ...(o.guidance ? ["", "# Ce que le client demande pour cette nouvelle proposition (ses mots)", o.guidance] : []),
    ...(o.shown?.length ? ["", "# Angles déjà montrés au client (ne les refais pas, ne les reformule pas)", ...o.shown.map((a) => `- ${a.title} : « ${a.message} »`)] : []),
  ].join("\n");
}

// ---------------------------------------------------------------- contrôles du Studio (sans IA)

/** Les textes d'un angle que liront les acheteurs, ou qui affirment quelque chose du produit. */
const angleTexts = (a: AngleDraft) => [a.hook, a.promise, a.after, a.site.title, a.site.text, a.site.button, a.post.title, a.post.text, a.show];

/**
 * Chiffres et mots de garantie absents des faits du client. Une heure de la journée ou un nombre seul fait partie d'une
 * scène (« 7 h, la cuisine est encore sombre ») : ce n'est pas une promesse, le juge en reste seul juge. Un prix, un
 * poids, une durée en jours ou en années, un pourcentage, une note : c'est une affirmation sur le produit.
 */
const SCENE_NUMBER = /^\d+(?:[.,]\d+)?(?:\s?(?:h|heures?))?$/i;
export function draftIssues(a: AngleDraft, facts: string): string[] {
  const claims = unprovenIn(angleTexts(a), facts).filter((c) => !SCENE_NUMBER.test(c));
  return claims.length ? [`affirme sans que le client l'ait dit : ${claims.join(", ")}`] : [];
}

/** Range les propositions d'une stratège : identifiants, paroles citées qui existent, contrôles du Studio. */
export function candidatesOf(role: AngleRole, drafts: AngleDraft[], o: { facts: string; quotes: number; from?: number; hooks?: string[] }): Candidate[] {
  const seen = new Set((o.hooks ?? []).map(normText));
  return drafts.map((d, i) => {
    const issues = draftIssues(d, o.facts), key = normText(d.hook);
    if (seen.has(key)) issues.push("accroche déjà écrite pour une autre proposition");
    seen.add(key);
    return { ...d, quotes: [...new Set(d.quotes)].filter((n) => n < o.quotes), id: `${role}-${(o.from ?? 0) + i + 1}`, role, issues };
  });
}

/** Note retenue : celle du juge, plafonnée à 5 quand le Studio a relevé une affirmation que le client n'a pas faite. */
function verdictsOf(judge: Judge, list: Candidate[]): Map<string, Verdict> {
  const out = new Map<string, Verdict>();
  for (const c of list) {
    const v = judge.angles.find((x) => x.id === c.id);
    const note = v ? Math.round(v.note) : 0, capped = c.issues.some((i) => i.startsWith("affirme")) ? Math.min(note, 5) : note;
    out.set(c.id, { note: capped, why: v ? (capped < note ? `${v.why} (${c.issues[0]})`.trim() : v.why) : "non relu", fixes: [...(v?.fixes ?? []), ...(capped < note ? [`Retire ce que le client n'a pas dit, ou range-le dans « à confirmer » : ${c.issues[0]}.`] : [])] });
  }
  return out;
}

/** La meilleure proposition d'une entrée : celle que le juge a choisie si elle est gardée, sinon la mieux notée. */
function bestOf(role: AngleRole, list: Candidate[], notes: Map<string, Verdict>, preferred?: string): Candidate | null {
  const mine = list.filter((c) => c.role === role);
  const pick = mine.find((c) => c.id === preferred && (notes.get(c.id)?.note ?? 0) >= KEPT_NOTE);
  return pick ?? [...mine].sort((a, b) => (notes.get(b.id)?.note ?? 0) - (notes.get(a.id)?.note ?? 0))[0] ?? null;
}

const judgeView = (c: Candidate) => ({ id: c.id, entree: c.role, title: c.title, person: c.person, moment: c.moment, before: c.before, after: c.after, emotion: c.emotion, promise: c.promise, hook: c.hook, site: c.site, post: c.post, show: c.show, quotes: c.quotes, toConfirm: c.toConfirm, ...(c.issues.length ? { controleDuStudio: c.issues } : {}) });

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url.slice(0, 60); } };

/** L'angle tel qu'il est gardé dans le parcours et montré au client. */
export function sinaAngleOf(c: Candidate, id: string, study: Study, v?: Verdict, doubt?: string): SinaAngle {
  const quotes = c.quotes.map((n) => study.quotes[n]).filter(Boolean);
  const pages = [...new Set(quotes.map((q) => q.url).filter(Boolean))].slice(0, 4);
  return {
    id, role: c.role, title: c.title, audience: c.person, motivation: c.after, message: c.hook, emotion: c.emotion,
    proofsToConfirm: c.toConfirm, arguments: c.arguments, sources: pages.map((url) => ({ title: host(url), url })),
    goal: "", why: c.why, story: `${c.person} ${c.moment}`.trim(), show: c.show, organicExample: c.post.text, cta: c.site.button,
    person: c.person, moment: c.moment, before: c.before, after: c.after, promise: c.promise, tone: c.tone, site: c.site, post: c.post,
    objections: c.objections, quotes: quotes.slice(0, 4), ...(v ? { note: v.note } : {}), ...(doubt ? { doubt } : {}),
  };
}

/** Les phrases courtes d'un angle que liront les acheteurs : c'est elles que lit le lecteur qui ne sait rien. */
const READ_FIELDS = [["hook", "l'accroche"], ["title", "le titre du haut du site"], ["btn", "le bouton du site"], ["post", "le titre de la publication"]] as const;
type ReadField = (typeof READ_FIELDS)[number][0];
const readText = (c: Candidate, f: ReadField) => (f === "hook" ? c.hook : f === "title" ? c.site.title : f === "btn" ? c.site.button : c.post.title);
const withText = (c: Candidate, f: ReadField, text: string): Candidate => (f === "hook" ? { ...c, hook: text } : f === "title" ? { ...c, site: { ...c.site, title: text } } : f === "btn" ? { ...c, site: { ...c.site, button: text } } : { ...c, post: { ...c.post, title: text } });
export function readerTextsOf(c: Candidate): { id: string; role: AngleRole; field: ReadField; label: string; text: string }[] {
  return READ_FIELDS.map(([field, label]) => ({ id: `${c.role[0]}-${field}`, role: c.role, field, label, text: readText(c, field) }));
}

// ---------------------------------------------------------------- la tâche

const Payload = z.object({
  projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(),
  /** Nouvelle proposition demandée par le client, avec ses mots. */
  guidance: z.string().max(1500).optional(),
});
export type AnglesJobPayload = z.infer<typeof Payload>;

export async function runSinaAnglesJob(ctx: JobContext) {
  const a = Payload.parse(ctx.payload);
  const p = loadProject(a.projectId);
  const j = journeyOf(a.conversationId);
  const settings = chainSettings();
  const ai = anglesChainDeps.ai ? anglesChainDeps.ai(ctx) : realAi(ctx, { userId: p.userId, projectId: p.id }, settings, a.capMicro);
  const notes: string[] = [], issues: string[] = [];
  const facts = angleFacts(j, p.id), brand = brandBlock(j, p.id);
  const round = (j.angles?.round ?? 0) + 1, before = j.angles?.shown?.length ? j.angles.list.filter((x) => j.angles!.shown!.some((s) => s.id === x.id)) : [];

  // 1. Le dossier : l'étude de la marque, reprise sans être repayée. Trop peu de paroles d'acheteurs : SINA retourne les écouter.
  ctx.progress(0.05, L("Je relis ce que disent tes acheteurs", "Reading what your buyers say"));
  const known = brandStudyOf(j);
  const study = await ctx.step("angles:study", async (): Promise<Study> => {
    const base: Study = known ?? { quotes: [], competitors: [], mould: "", substitutes: [], facts: [], notFound: [], sources: 0, dropped: 0 };
    if (base.quotes.length >= MIN_QUOTES) return base;
    let findings: WebFinding[] = [];
    const q = BP.researchQueries(briefFromJourney(j)).find((x) => x.id === "paroles")!;
    try { findings = await ai.research(q.id, q.query); } catch (e) { if (e instanceof CostCapReached) throw e; notes.push("écoute des acheteurs sans résultat"); }
    if (!findings.length) return base;
    const pages = findings.slice(0, 30).map((f, i) => `[page ${i}] ${f.url}\n${f.title}\n${f.excerpt.slice(0, 2400)}`).join("\n\n");
    let raw: z.infer<typeof StudySchema>;
    try { raw = await ai.ask("listen", { kind: "listen", system: BP.STUDY_SYSTEM, schema: StudySchema, prompt: `# Fiche de départ du client (ses mots)\n${briefFromJourney(j)}\n\n# Pages trouvées (${Math.min(findings.length, 30)})\n${pages}` }); }
    catch (e) { if (e instanceof CostCapReached) throw e; notes.push("écoute des acheteurs illisible"); return base; }
    // Deux relectures gratuites, comme pour la marque : la parole est dans l'extrait, puis dans la page elle-même.
    const read = await quotesReadOnPages(verifiedQuotes(raw.quotes, findings).kept);
    const have = new Set(base.quotes.map((x) => normText(x.text)));
    return {
      ...base, quotes: [...base.quotes, ...read.kept.filter((x) => !have.has(normText(x.text)))].slice(0, 40),
      competitors: base.competitors.length ? base.competitors : raw.competitors, mould: base.mould || raw.mould, substitutes: base.substitutes.length ? base.substitutes : raw.substitutes,
      sources: base.sources + new Set(findings.map((f) => f.url)).size,
    };
  });
  if (study.quotes.length < MIN_QUOTES) issues.push(L(study.quotes.length ? `Je n'ai trouvé que ${study.quotes.length} parole${study.quotes.length > 1 ? "s" : ""} réelle${study.quotes.length > 1 ? "s" : ""} d'acheteurs : ces angles s'appuient surtout sur ce que tu m'as dit.` : "Je n'ai trouvé aucune parole réelle d'acheteurs sur le web : ces angles s'appuient sur ce que tu m'as dit.", "Few real buyer quotes were found."));
  const file = dossier({ facts, brand, study, guidance: a.guidance, shown: before });

  // 2. Trois stratèges séparées, en même temps : elles ne se voient pas.
  ctx.progress(0.2, L("Je cherche tes trois angles", "Looking for your three angles"));
  const written = await Promise.all(ANGLE_ROLES.map((role) => ctx.step(`angles:strategist:${round}:${role}`, async () => {
    try { return (await ai.ask(`strategist-${round}-${role}`, { kind: "strategist", system: P.strategistSystem(role, CANDIDATES), schema: StrategistSchema, prompt: file })).angles.slice(0, CANDIDATES); }
    catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`stratège « ${role} » sans réponse : ${String((e as Error)?.message ?? e).slice(0, 120)}`); return [] as AngleDraft[]; }
  })));
  let all: Candidate[] = [];
  for (const [i, role] of ANGLE_ROLES.entries()) all.push(...candidatesOf(role, written[i], { facts, quotes: study.quotes.length, hooks: all.map((c) => c.hook) }));
  const empty = ANGLE_ROLES.filter((r) => !all.some((c) => c.role === r));
  if (empty.length) throw new UserFacingError(L("Je n'ai pas réussi à écrire tes trois angles (une de mes recherches n'a pas abouti). Dis-moi si tu veux que je relance.", "The three angles could not be written."));

  // 3 et 4. Le juge à part : une note par proposition, les trois à montrer.
  ctx.progress(0.5, L("Je relis chaque angle sévèrement", "Reviewing each angle"));
  const judgeFile = (list: Candidate[], keptOthers: Candidate[] = []) => JSON.stringify({
    faitsDuClient: facts.split("\n"), marque: brand.split("\n"), parolesDAcheteurs: study.quotes.map((q, n) => `${n}. ${q.text}`),
    concurrents: study.competitors.map((c) => c.name), mouleDeLaCategorie: study.mould,
    ...(keptOthers.length ? { anglesDejaRetenusPourLesAutresEntrees: keptOthers.map(judgeView) } : {}),
    propositions: list.map(judgeView),
  });
  let judged: "juges" | "non_juges" = "juges";
  let verdict: Judge | null = null;
  try { verdict = await ctx.step(`angles:judge:${round}`, () => ai.ask(`judge-${round}`, { kind: "judge", system: P.JUDGE_SYSTEM, schema: JudgeSchema, prompt: judgeFile(all) })); }
  catch (e) { if (e instanceof CostCapReached) throw e; judged = "non_juges"; notes.push(`juge sans réponse : ${String((e as Error)?.message ?? e).slice(0, 120)}`); }

  const notesOf = verdict ? verdictsOf(verdict, all) : new Map<string, Verdict>();
  const picked = new Map<AngleRole, Candidate>();
  const doubts = new Map<AngleRole, string>();
  const redone: AngleRole[] = [];
  if (!verdict) {
    // Juge en panne : la première proposition sans remarque du Studio de chaque entrée, et c'est dit au client.
    for (const role of ANGLE_ROLES) { const mine = all.filter((c) => c.role === role); picked.set(role, mine.find((c) => !c.issues.length) ?? mine[0]); }
  } else {
    for (const role of ANGLE_ROLES) picked.set(role, bestOf(role, all, notesOf, verdict.selection?.[role])!);
    const weak = ANGLE_ROLES.filter((r) => (notesOf.get(picked.get(r)!.id)?.note ?? 0) < KEPT_NOTE);
    if (weak.length) {
      // Reprise, UNE fois, par la stratège de l'entrée, avec les remarques du juge ; puis le juge relit la reprise.
      ctx.progress(0.65, L("Je reprends ce qui ne me convainc pas", "Reworking what does not convince me"));
      const strong = ANGLE_ROLES.filter((r) => !weak.includes(r)).map((r) => picked.get(r)!);
      const again = await Promise.all(weak.map((role) => ctx.step(`angles:rework:${round}:${role}`, async () => {
        const mine = all.filter((c) => c.role === role);
        const remarks = mine.map((c) => { const v = notesOf.get(c.id)!; return `- « ${c.title} » (accroche : « ${c.hook} ») : ${v.note} sur 10. ${v.why}${v.fixes.length ? ` À corriger : ${v.fixes.join(" ; ")}` : ""}`; }).join("\n");
        const prompt = `${file}\n\n# Tes premières propositions, refusées par le juge\n${remarks}\n\n# Angles déjà retenus pour les autres entrées (n'empiète pas sur leur territoire)\n${strong.map((c) => `- ${c.title} : ${c.person} | ${c.moment} | ${c.emotion} | « ${c.hook} »`).join("\n") || "aucun pour l'instant"}`;
        try { return (await ai.ask(`rework-${round}-${role}`, { kind: "rework", system: P.reworkSystem(role, REWORKED), schema: StrategistSchema, prompt })).angles.slice(0, REWORKED); }
        catch (e) { if (e instanceof CostCapReached) throw e; notes.push(`reprise « ${role} » sans réponse`); return [] as AngleDraft[]; }
      })));
      const fresh: Candidate[] = [];
      for (const [i, role] of weak.entries()) fresh.push(...candidatesOf(role, again[i], { facts, quotes: study.quotes.length, from: CANDIDATES, hooks: [...all, ...fresh].map((c) => c.hook) }));
      if (fresh.length) {
        all = [...all, ...fresh];
        try {
          const second = await ctx.step(`angles:recheck:${round}`, () => ai.ask(`recheck-${round}`, { kind: "recheck", system: P.JUDGE_SYSTEM, schema: JudgeSchema, prompt: judgeFile(fresh, strong) }));
          for (const [id, v] of verdictsOf(second, fresh)) notesOf.set(id, v);
        } catch (e) { if (e instanceof CostCapReached) throw e; notes.push("reprise non relue par le juge : elle n'est pas montrée"); }
      }
      for (const role of weak) {
        const best = bestOf(role, all, notesOf)!, v = notesOf.get(best.id);
        picked.set(role, best);
        if (fresh.some((c) => c.id === best.id)) redone.push(role);
        if ((v?.note ?? 0) < KEPT_NOTE) doubts.set(role, (v?.why || "je ne le trouve pas assez fort").replace(/\s+/g, " ").trim().slice(0, 320));
      }
    }
  }

  // 5. Le lecteur qui ne sait rien : clair d'abord, beau ensuite.
  ctx.progress(0.82, L("Je vérifie que chaque phrase se comprend du premier coup", "Checking every sentence is clear"));
  const sells = chosenRoute(j)?.board.descriptor || j.start.offer?.value?.slice(0, 120) || "";
  const ask = (texts: ReturnType<typeof readerTextsOf>) => texts.map((t) => `- id ${t.id} | l'entreprise vend : ${sells || "non précisé"} | phrase : « ${t.text} »`).join("\n");
  try {
    const texts = ANGLE_ROLES.flatMap((r) => readerTextsOf(picked.get(r)!));
    const read = await ctx.step(`angles:reader:${round}`, () => ai.ask(`reader-${round}`, { kind: "reader", system: BP.readerSystem(), schema: ReaderSchema, prompt: ask(texts) }));
    const unclear = read.texts.filter((v) => !v.clear).map((v) => ({ v, t: texts.find((x) => x.id === v.id) })).filter((x): x is { v: (typeof read.texts)[number]; t: (typeof texts)[number] } => !!x.t);
    if (unclear.length) {
      notes.push(`lecteur qui ne sait rien : ${unclear.length} phrase(s) reprise(s)`);
      const prompt = [
        "# Les faits du client", facts || "Aucun fait donné.", "", "# Sa marque", brand, "",
        "# Les angles", ...ANGLE_ROLES.map((r) => { const c = picked.get(r)!; return `- ${c.title} : ${c.person} ${c.moment} Promesse : ${c.promise}`; }), "",
        "# Phrases à réécrire", ...unclear.map(({ v, t }) => `- id ${t.id} | angle « ${picked.get(t.role)!.title} » | ${t.label} : « ${t.text} » | ce qui bloque : ${v.why || "pas claire"} | compris : « ${v.understood || "rien"} »`),
      ].join("\n");
      const fixed = await ctx.step(`angles:clarify:${round}`, () => ai.ask(`clarify-${round}`, { kind: "clarify", system: P.CLARIFY_SYSTEM, schema: ClarifySchema, prompt }));
      const changed: typeof texts = [];
      for (const f of fixed.texts) {
        const t = unclear.find((x) => x.t.id === f.id)?.t; if (!t) continue;
        const next = withText(picked.get(t.role)!, t.field, f.text.trim());
        // Une réécriture qui affirme ce que le client n'a pas dit est écartée : la phrase d'origine reste.
        if (draftIssues(next, facts).length > picked.get(t.role)!.issues.filter((i) => i.startsWith("affirme")).length) continue;
        picked.set(t.role, next); changed.push({ ...t, text: f.text.trim() });
      }
      // La réécriture est relue à son tour : rien n'est montré sans avoir été relu.
      if (changed.length) {
        const second = await ctx.step(`angles:reader:${round}:2`, () => ai.ask(`reader-${round}-2`, { kind: "reader", system: BP.readerSystem(), schema: ReaderSchema, prompt: ask(changed) }));
        for (const v of second.texts.filter((x) => !x.clear)) { const t = changed.find((x) => x.id === v.id); if (t) issues.push(L(`Angle « ${picked.get(t.role)!.title} » : ${t.label} (« ${t.text} ») peut encore ne pas être comprise du premier coup. Dis-moi si tu veux que je la reprenne.`, "One sentence may still be unclear.")); }
      }
      const left = unclear.filter((x) => !changed.some((c) => c.id === x.t.id));
      for (const { t } of left) issues.push(L(`Angle « ${picked.get(t.role)!.title} » : ${t.label} (« ${t.text} ») peut ne pas être comprise du premier coup. Dis-moi si tu veux que je la reprenne.`, "One sentence may be unclear."));
    }
  } catch (e) { if (e instanceof CostCapReached) throw e; notes.push("lecture par quelqu'un qui ne sait rien : non faite"); issues.push(L("Je n'ai pas pu faire relire ces phrases par quelqu'un qui ne connaît pas ta marque, comme je le fais d'habitude.", "The clarity read could not be done.")); }
  if (judged === "non_juges") issues.push(L("Je n'ai pas pu relire ces angles aussi sévèrement que d'habitude.", "These angles could not be reviewed as usual."));

  // Ce qui est gardé : les trois montrés (identifiant = leur entrée), puis la réserve (gardés par le juge, jamais montrés comme choix).
  const shownIds = new Set(ANGLE_ROLES.map((r) => picked.get(r)!.id));
  const shown = ANGLE_ROLES.map((role) => ({ id: role as string, role }));
  const reserveOf = all.filter((c) => !shownIds.has(c.id) && (notesOf.get(c.id)?.note ?? 0) >= KEPT_NOTE);
  const list: SinaAngle[] = [
    ...ANGLE_ROLES.map((role) => sinaAngleOf(picked.get(role)!, role, study, notesOf.get(picked.get(role)!.id), doubts.get(role))),
    ...reserveOf.map((c) => sinaAngleOf(c, `reserve-${c.id}`, study, notesOf.get(c.id))),
  ];
  const sel = verdict?.selection;
  // Jamais recommandé sans le dire : un angle dont SINA doute n'est recommandé que si les trois en sont là.
  const sure = ANGLE_ROLES.filter((r) => !doubts.has(r));
  const recommended: AngleRole = sel && (!doubts.has(sel.recommande) || !sure.length) ? sel.recommande : sure[0] ?? "sur";
  const result: SinaAngles = {
    list, shown, reserve: reserveOf.map((c) => `reserve-${c.id}`), recommendedId: recommended,
    recommendation: sel && sel.recommande === recommended ? sel.pourquoi.trim().slice(0, 600) : "",
    sourceCount: study.sources, quoteCount: study.quotes.length, at: Date.now(), judged, redone, issues: [...new Set(issues)], round, chainJobId: ctx.job.id,
    ...(a.guidance ? { guidance: a.guidance } : {}),
  };
  updateJourney(a.conversationId, (x) => {
    x.angles = result;
    // Nouvelle proposition après un choix : l'ancien choix ne désigne plus ces angles ; l'angle actif du projet reste jusqu'au nouveau choix.
    if (x.angleChoice) x.angleChoice = undefined;
    setStep(x, 4, "review");
  });
  return {
    angles: ANGLE_ROLES.map((r) => ({ id: r, titre: picked.get(r)!.title, accroche: picked.get(r)!.hook, note: notesOf.get(picked.get(r)!.id)?.note ?? null, ...(doubts.has(r) ? { doute: doubts.get(r) } : {}) })),
    recommande: recommended, reserve: reserveOf.length, ecrits: all.length, reprises: redone, paroles: study.quotes.length, sources: study.sources, issues: result.issues, notes,
  };
}
