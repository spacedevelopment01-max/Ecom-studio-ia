/**
 * Étape 1 du parcours SINA (#492) : les identités de marque (proposer, refaire, choisir, mélanger).
 *
 * Depuis les décisions du propriétaire du 12 novembre 2026, la création passe par la CHAÎNE de `brand-chain.ts` (tâche
 * de fond : étude du marché, idées, noms par équipes, planches, directeur de création) et propose 2, 3 ou 4 identités
 * selon le forfait. L'ancienne création en un seul appel (3 identités, contrôle gratuit, une reprise au plus) reste
 * disponible par le réglage `sina.brand_method` = « simple », par sécurité, tant que la chaîne n'a pas été validée sur
 * un essai réel. Le choix est gratuit et enregistre la marque du projet (nom, slogan, promesse, palette, polices, ton).
 */
import { z } from "zod";
import fs from "node:fs";
import { json as parseJson, one } from "../../db";
import { enqueue, getJob, pendingJob } from "../../jobs";
import { getSetting } from "../../settings";
import { L } from "../../i18n-server";
import { loadProject, remember, saveBrand } from "../../projects";
import { assetData, getAsset } from "../../library";
import { localBrand } from "../../engine/local";
import { estimateCallMicro, llmJson, type LlmImage } from "../../ai/llm";
import { withTrace } from "../../ai/trace";
import type { Brand } from "../../project-types";
import type { AgentTool, ToolContext } from "../types";
import { attachmentsOf } from "../attachments";
import { getRun } from "../store";
import { jobSpentMicro } from "../budget";
import { journeyOf, setStep, updateJourney, type Journey } from "../journey";
import {
  IDENTITY_SYSTEM, IdentitiesSchema, LOGO_STYLE_LABEL, fontFamily, identityIssues, identityPrompt, prepareIdentities, type Identity,
} from "../identities";
import { SINA_BRAND_JOB, boardImagesQuote, chainQuote, finishQuote, routeCountOfProject } from "../brand-chain";
import { CREATED_SLOTS, FINISH_SLOTS, type ImageSlot } from "../brand-images";
import { finishSlots } from "../brand-finish";
import { ROUTE_KEYS, routeKeys } from "../brand-routes";
import { project, short } from "./common";

/** Plafond d'une proposition (micro-euros), création ET reprise éventuelle comprises (jamais dépassé au total). */
export const IDENTITY_CAP_MICRO = 600_000;
/**
 * Coût probable d'une proposition (un essai, sans reprise) : tarif du modèle sur le déroulé habituel (consigne et fiche
 * d'environ 14 000 jetons, réponse d'environ 12 000 avec la réflexion). C'est le devis montré au client.
 */
export function identityProbableMicro(): number | undefined {
  try { return estimateCallMicro(IDENTITY_MODEL.provider, IDENTITY_MODEL.model, 14_000, 12_000) ?? undefined; } catch { return undefined; }
}
/** Modèle de la création des identités : le plus fort (consigne n° 1 du propriétaire : niveau 2026). */
export const IDENTITY_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "medium" };

/** Dépendance remplaçable par les tests (aucun appel réel). */
export const identityDeps: { generate?: (call: Parameters<typeof llmJson>[0]) => Promise<unknown> } = {};

const KEYS = ROUTE_KEYS;
type Key = (typeof KEYS)[number];

/**
 * Méthode de création de la marque : « chaine » (sept temps, décisions du 12 novembre 2026) par défaut ; « simple » =
 * l'ancienne création en un appel (3 identités), gardée par sécurité jusqu'à la validation de la chaîne sur un essai réel.
 */
export const brandMethod = (): "chaine" | "simple" => (getSetting("sina.brand_method") === "simple" ? "simple" : "chaine");

/** L'atelier de la proposition précédente (étude, idées, réserve de noms) peut-il resservir sans être repayé ? */
function workshopReady(j: Journey): boolean {
  const id = j.identities?.chainJobId;
  if (!id) return false;
  try { return !!parseJson<Record<string, unknown>>(getJob(id)?.checkpoint ?? "{}", {})["brand:strategy"]; } catch { return false; }
}

type ProposeArgs = { guidance?: string; redo?: Key[]; only?: "noms" };
/** Travail demandé à la chaîne : combien d'identités à faire, et si l'atelier précédent ressert. */
function chainWork(ctx: ToolContext, a: ProposeArgs | undefined) {
  const count = ctx.projectId ? routeCountOfProject(ctx.projectId) : 2;
  const j = journeyOf(ctx.conversationId);
  const previous = j.identities?.list ?? [];
  const sameShape = previous.length === count && previous.every((x) => !!x.board);
  const redo = (a?.redo ?? []).filter((k) => routeKeys(count).includes(k));
  const partial = sameShape && redo.length > 0 && redo.length < count;
  const fresh = !((redo.length || a?.only || a?.guidance) && workshopReady(j));
  return { j, count, previous, sameShape, redo, routes: partial ? redo.length : count, fresh };
}

/**
 * Devis montré au client pour ses identités : la création des planches, PLUS la fin de la marque de celle qu'il
 * choisira (un seul accord pour toute l'étape « La marque »). Une reprise après le choix ne recompte pas la fin.
 */
function proposalQuote(w: ReturnType<typeof chainWork>) {
  const q = chainQuote({ routes: w.routes, fresh: w.fresh });
  if (w.j.identityChoice) return q;
  const f = finishQuote(FINISH_SLOTS);
  return { maxMicro: q.maxMicro + f.maxMicro, ...(q.probableMicro && f.probableMicro ? { probableMicro: q.probableMicro + f.probableMicro } : {}) };
}

/** Création par la chaîne : tâche de fond de plusieurs minutes ; SINA reprend quand les planches sont prêtes. */
function proposeByChain(ctx: ToolContext, a: ProposeArgs) {
  const p = project(ctx);
  const w = chainWork(ctx, a);
  if ((a.redo?.length || a.only) && !w.sameShape) return { ok: false, summary: L("Aucune proposition à refaire pour l'instant.", "Nothing to redo yet."), hint: "Lance d'abord une proposition complète (identity.propose sans redo ni only)." };
  // Une seule création à la fois (jamais deux chaînes payées en parallèle).
  if (pendingJob(p.id, SINA_BRAND_JOB)) return { ok: false, summary: L("Tes identités sont déjà en cours de création : attends-les.", "Your identities are already being created.") };
  const quote = chainQuote({ routes: w.routes, fresh: w.fresh });
  const round = (w.j.identities?.round ?? 0) + 1;
  // L'accord du client couvre aussi la fin de sa marque (devis affiché : `estimate`) : elle partira dès son choix.
  if (!w.j.identityChoice) updateJourney(ctx.conversationId, (x) => { x.brandFinish = { prepaidMicro: finishQuote().maxMicro }; });
  const job = enqueue({
    userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L(`${w.count} identités de marque (SINA)`, `${w.count} brand identities (SINA)`),
    payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: quote.maxMicro, count: w.count, ...(a.guidance ? { guidance: a.guidance } : {}), ...(w.redo.length ? { redo: w.redo } : {}), ...(a.only === "noms" ? { namesOnly: true } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand:${round}`,
  });
  updateJourney(ctx.conversationId, (x) => setStep(x, 1, "doing"));
  return {
    ok: true, jobs: [job.id], data: { identites: w.count, plafondMicro: quote.maxMicro },
    summary: L(`Création de ${w.routes === w.count ? `tes ${w.count} identités de marque` : `${w.routes} identité${w.routes > 1 ? "s" : ""}`} lancée (plusieurs minutes : ${w.fresh ? "j'étudie ton marché, je cherche l'idée et les noms, puis " : ""}je prépare les planches et je relis tout). Je reprends quand c'est prêt.`, "Creating your brand identities (several minutes)."),
  };
}

/** Logo gardé (refonte) montré à Claude : pièce jointe désignée, sinon logo du client déjà rangé. */
function keptLogoImage(ctx: ToolContext, j: Journey): LlmImage[] {
  if (!j.keep.includes("logo")) return [];
  const aid = (j as any).logoAttachmentId as string | undefined;
  const at = aid ? attachmentsOf(ctx.conversationId).find((x) => x.id === aid && x.kind === "image") : null;
  if (at) { try { return [{ data: fs.readFileSync(at.path), label: "Logo gardé par le client" }]; } catch { /* fichier absent */ } }
  const row = ctx.projectId ? one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", ctx.projectId) : null;
  const a = row ? getAsset(row.id) : undefined;
  if (a) { try { return [{ data: assetData(a), label: "Logo gardé par le client" }]; } catch { /* fichier absent */ } }
  return [];
}

async function generate(ctx: ToolContext, j: Journey, opts: { guidance?: string; redo?: Key[]; previous?: Identity[]; namesOnly?: boolean }, attempt: number, capMicro: number, feedback?: string[]) {
  const jobId = getRun(ctx.runId)?.job_id ?? null;
  const call = {
    task: "strategy" as const, userId: ctx.user.id, projectId: ctx.projectId, jobId,
    system: IDENTITY_SYSTEM, promptKey: "syna-identities-1",
    prompt: identityPrompt(j, { guidance: opts.guidance, feedback, previous: feedback?.length || opts.redo?.length || opts.namesOnly ? opts.previous : undefined, redo: opts.redo, namesOnly: opts.namesOnly }),
    images: (() => { const im = keptLogoImage(ctx, j); return im.length ? im : undefined; })(),
    prepare: prepareIdentities,
    // Réflexion comprise : une limite trop basse coupait la réponse et faisait payer un second appel (essai réel).
    maxTokens: 16000, maxOutputTokens: 20000,
    usageKey: `syna-identities:${ctx.runId}:${attempt}`,
    routing: { difficulty: "complex" as const, prefer: IDENTITY_MODEL },
  };
  if (identityDeps.generate) return IdentitiesSchema.parse(prepareIdentities(await identityDeps.generate(call)));
  return withTrace({ jobId, projectId: ctx.projectId, step: "identity", costCapMicro: capMicro }, () => llmJson(call, IdentitiesSchema));
}

/** Vue courte d'une identité (lue par SINA et montrée dans le fil). */
export const identityView = (x: Identity) => ({
  cle: x.key, nom: x.name, slogan: x.slogan, promesse: x.promise, territoire: x.territory,
  fond: x.ground, ...(x.gradient ? { degrade: x.gradient } : {}), couleurs: x.palette, polices: { titres: fontFamily(x.fonts.heading), textes: fontFamily(x.fonts.body) },
  ton: x.tone.adjectives.join(", "), pourquoi: x.why,
  ...(x.board ? { idee: x.board.idea.belief, resteAProuver: x.board.toProve } : {}),
});

/** « Seulement les noms » : tout le reste des identités est remis tel quel (jamais changé en silence). */
export function keepAllButNames(fresh: Identity[], previous: Identity[]): Identity[] {
  return fresh.map((x) => {
    const p = previous.find((y) => y.key === x.key);
    return p ? { ...p, name: x.name, nameStyle: x.nameStyle, nameKind: x.nameKind, nameWhy: x.nameWhy, nameAnchor: x.nameAnchor, nameTest: x.nameTest, nameExpression: x.nameExpression, nameCandidates: x.nameCandidates, slogan: x.slogan, sloganTone: x.sloganTone, logoIdea: x.logoIdea } : x;
  });
}

const proposeTool: AgentTool<ProposeArgs> = {
  name: "identity.propose", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 1 : crée les identités de marque du client, VRAIMENT différentes : 2, 3 ou 4 selon son forfait (le Studio le sait). Chaque identité est une PLANCHE de marque : l'idée, le nom et sa logique, la signature, les signes, l'objet, le site sur téléphone, des publications, la voix, ce qui reste à prouver ; couleurs, polices et ton compris (le logo est dessiné à l'étape 2). Tu étudies d'abord son marché sur le web (paroles réelles de clients avec leur page), tu cherches l'idée et les noms, puis tu relis tout : tâche de fond de plusieurs minutes. Payant : le Studio montre le devis au client (carte d'accord) avant de lancer. À appeler quand le client est prêt, ou quand il demande une nouvelle proposition : guidance = ce qu'il veut de différent (ses mots) ; redo = les identités à refaire (les autres restent identiques) ; only « noms » = refaire seulement les noms et les phrases (couleurs, polices et le reste gardés). Les planches s'affichent dans le fil.",
  args: z.object({ guidance: z.string().max(1500).optional(), redo: z.array(z.enum(KEYS)).min(1).max(4).optional(), only: z.enum(["noms"]).optional() }).strict(),
  estimate: (ctx, a) => {
    if (brandMethod() === "simple") return { maxMicro: IDENTITY_CAP_MICRO, probableMicro: identityProbableMicro(), label: "3 identités de marque" };
    const w = chainWork(ctx, a);
    return { ...proposalQuote(w), label: w.routes === w.count ? `${w.count} identités de marque` : `${w.routes} identité${w.routes > 1 ? "s" : ""} de marque à refaire` };
  },
  run: async (ctx, a) => {
    project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[0]?.status !== "done") return { ok: false, summary: L("L'étape 0 (questions de départ) n'est pas encore validée : termine-la d'abord.", "Step 0 is not validated yet.") };
    // Après le choix, une nouvelle proposition seulement si le client la demande avec ses mots (guidance).
    if (j.steps[1]?.status === "done" && !a.guidance) return { ok: false, summary: L("L'identité est déjà choisie.", "The identity is already chosen."), hint: "Pour en changer, le client choisit une autre identité (identity.choose), ou demande avec ses mots une nouvelle proposition (identity.propose avec guidance = ses mots)." };
    if (brandMethod() === "chaine") return proposeByChain(ctx, a);
    const previous = j.identities?.list;
    if ((a.redo?.length || a.only) && !previous?.length) return { ok: false, summary: L("Aucune proposition à refaire pour l'instant.", "Nothing to redo yet."), hint: "Lance d'abord une proposition complète." };
    updateJourney(ctx.conversationId, (x) => setStep(x, 1, "doing"));
    let out: { identities: Identity[]; comparison: string };
    let issues: string[] = [], firstIssues: string[] = [];
    // Plafond commun aux deux essais (audit du 10 novembre 2026 : chacun recevait le plafond entier, jusqu'à 2 fois le devis).
    const runJob = getRun(ctx.runId)?.job_id ?? null;
    const capTotal = (runJob ? jobSpentMicro(runJob) : 0) + IDENTITY_CAP_MICRO;
    try {
      const namesOnly = a.only === "noms";
      out = await generate(ctx, j, { guidance: a.guidance, redo: a.redo, previous, namesOnly }, 1, capTotal);
      if (namesOnly && previous) out.identities = keepAllButNames(out.identities, previous);
      // Identités qu'on ne devait pas refaire : remises telles quelles (jamais modifiées en silence).
      if (a.redo?.length && previous) out.identities = out.identities.map((x) => (a.redo!.includes(x.key) ? x : previous.find((p) => p.key === x.key) ?? x));
      issues = identityIssues(out.identities, j);
      firstIssues = issues;
      if (issues.length) {
        // Une seule reprise, avec les corrections exactes ; au-delà, les points restants sont dits au client.
        const retry = await generate(ctx, j, { guidance: a.guidance, redo: a.redo, previous: out.identities, namesOnly }, 2, capTotal, issues);
        if (namesOnly && previous) retry.identities = keepAllButNames(retry.identities, previous);
        if (a.redo?.length && previous) retry.identities = retry.identities.map((x) => (a.redo!.includes(x.key) ? x : previous.find((p) => p.key === x.key) ?? x));
        const again = identityIssues(retry.identities, j);
        if (again.length <= issues.length) { out = retry; issues = again; }
      }
    } catch (e) {
      updateJourney(ctx.conversationId, (x) => setStep(x, 1, previous?.length ? "review" : "todo"));
      throw e;
    }
    const round = (j.identities?.round ?? 0) + 1;
    updateJourney(ctx.conversationId, (x) => {
      x.identities = { list: out.identities, issues, comparison: out.comparison, at: Date.now(), round, ...(firstIssues.length ? { corrected: firstIssues } : {}), ...(a.guidance ? { guidance: a.guidance } : {}) };
      setStep(x, 1, "review");
    });
    return {
      ok: true,
      summary: L(`3 identités proposées (proposition n° ${round}) : ${out.identities.map((x) => `${x.key} « ${x.name} »`).join(", ")}.${issues.length ? ` Points non validés par le contrôle : ${issues.join(" ; ")}` : " Contrôle du Studio : OK."}`, "3 identities proposed."), ...(issues.length ? { hint: "Dis ces points non validés au client." } : {}),
      data: { proposition: round, identites: out.identities.map(identityView), pointsNonValides: issues, comparaison: short(out.comparison, 600) },
      changes: [{ module: "marque", object: "3 identités de marque", summary: out.identities.map((x) => `${x.key} : ${x.name} — ${x.slogan}`).join(" | "), after: out.identities.map((x) => x.name), verified: true }],
    };
  },
};

const PARTS = ["name", "slogan", "palette", "fonts", "tone", "logo"] as const;
type Part = (typeof PARTS)[number];

/** Identité retenue : une base, des éléments pris aux autres (mélange), des retouches du client mot pour mot. */
export function mixIdentity(list: Identity[], key: Key, mix: Partial<Record<Part, Key>> = {}, edits: { name?: string; slogan?: string } = {}): Identity {
  const pick = (k?: Key) => list.find((x) => x.key === (k ?? key))!;
  const base = pick(key);
  const out: Identity = {
    ...base,
    name: edits.name?.trim() || pick(mix.name).name,
    nameWhy: edits.name ? "" : pick(mix.name).nameWhy,
    nameAnchor: edits.name ? "" : pick(mix.name).nameAnchor,
    nameExpression: edits.name ? "" : pick(mix.name).nameExpression,
    slogan: edits.slogan?.trim() || pick(mix.slogan).slogan,
    palette: pick(mix.palette).palette, paletteFamily: pick(mix.palette).paletteFamily, ground: pick(mix.palette).ground, gradient: pick(mix.palette).gradient,
    fonts: pick(mix.fonts).fonts, fontStyle: pick(mix.fonts).fontStyle,
    tone: pick(mix.tone).tone,
    logoStyle: pick(mix.logo).logoStyle, logoIdea: pick(mix.logo).logoIdea,
    // Le « pourquoi » d'une identité parle de SES couleurs, polices et ton : il n'est plus vrai après un mélange de ces
    // éléments (essai réel : « fond en dégradé, vert basilic » affiché sur un fond blanc au bouton bleu).
    why: (["palette", "fonts", "tone"] as const).some((part) => mix[part] && mix[part] !== key) ? "" : base.why,
    // Les images d'une planche (logo, sachet, site) portent SON nom, SES couleurs et SES polices : après un mélange
    // ou une retouche du nom ou de la signature, elles ne sont plus vraies ; la planche revient aux dessins.
    ...(base.board?.images && (edits.name || edits.slogan || (["name", "slogan", "palette", "fonts"] as const).some((part) => mix[part] && mix[part] !== key)) ? { board: (({ images: _gone, ...rest }) => rest)(base.board) } : {}),
  };
  // Le nom de domaine a été contrôlé pour LE nom de la planche : nom retouché ou pris ailleurs, il n'est plus vrai.
  if (out.board?.domains && (edits.name || (mix.name && mix.name !== key))) out.board = (({ domains: _old, ...rest }) => rest)(out.board) as typeof out.board;
  return out;
}

/** Marque du projet construite à partir de l'identité retenue (les champs non couverts gardent la valeur existante). */
export function brandFromIdentity(p: ReturnType<typeof loadProject>, x: Identity, j: Journey, others: Identity[], logoAssetId?: string): Brand {
  const base: Brand = p.brand ? structuredClone(p.brand) : localBrand(p.product, x.name, p as any).brand;
  const keptName = j.keep.includes("nom");
  return {
    ...base,
    name: x.name,
    nameStatus: keptName ? "provided" : "validated",
    alternatives: keptName ? [] : others.map((o) => o.name).filter((n) => n !== x.name),
    tagline: x.slogan,
    // Jamais les slogans des AUTRES identités dans la charte (écrits pour un autre nom, un autre territoire).
    taglineAlternatives: [],
    positioning: x.promise,
    audience: j.start.audience?.status === "answered" ? j.start.audience.value : base.audience,
    personality: x.tone.adjectives,
    tone: { voice: x.tone.adjectives.join(", "), do: base.tone?.do ?? [], dont: x.tone.avoid },
    palette: x.palette,
    ground: x.ground,
    // Dégradé gardé seulement pour un fond en dégradé (les autres fonds n'en ont pas).
    ...(x.ground === "degrade" && x.gradient ? { gradient: x.gradient } : {}),
    paletteRoles: "sina-2026",
    paletteMode: j.keep.includes("couleurs") ? "client" : "direction",
    ...(j.keep.includes("couleurs") ? { clientPalette: x.palette } : {}),
    fonts: x.fonts,
    logo: logoAssetId
      ? { ...base.logo, assetId: logoAssetId, status: "provided", concept: x.logoIdea }
      : { concept: "", status: "proposed" }, // le logo est dessiné à l'étape 2, en carte blanche
    // Le « pourquoi » s'adresse au client (tutoiement) : ce n'est pas l'histoire de la marque (la charte affiche « [À
    // écrire à partir de faits réels…] » tant qu'elle n'est pas donnée).
    story: base.story,
    // Choix du client : nom, palette et polices verrouillés (aucun traitement automatique ne les change, ex. couleurs
    // tirées d'un logo) ; le slogan n'est pas verrouillé ici pour ne pas l'écrire dans les logos.
    validated: [...new Set([...(base.validated ?? []), "identity", "name", "palette", "fonts"])],
    generatedBy: "ai",
  };
}

const choiceKey = z.enum(KEYS);
const chooseTool: AgentTool<{ key: Key; mix?: Partial<Record<Part, Key>>; name?: string; slogan?: string }> = {
  name: "identity.choose", module: "marque", kind: "write", needsProject: true,
  description: "Étape 1 : enregistre l'identité choisie PAR LE CLIENT (jamais à sa place) comme marque du projet et valide l'étape 1. key = identité de base (A, B, C ou D, parmi celles affichées). mix = éléments pris à une autre identité si le client mélange (ex. le nom de A avec les couleurs de C : key « A », mix {palette: « C »}) ; parties : name, slogan, palette, fonts, tone, logo. name / slogan = retouche du client, reprise mot pour mot. Gratuit.",
  args: z.object({ key: choiceKey, mix: z.object({ name: choiceKey, slogan: choiceKey, palette: choiceKey, fonts: choiceKey, tone: choiceKey, logo: choiceKey }).partial().strict().optional(), name: z.string().min(1).max(60).optional(), slogan: z.string().min(1).max(120).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const list = j.identities?.list;
    if (!list?.length) return { ok: false, summary: L("Aucune identité proposée pour l'instant.", "No identity proposed yet."), hint: "Lance d'abord identity.propose." };
    if (j.keep.includes("nom") && a.name) return { ok: false, summary: L("Le client garde son nom tel quel : il ne peut pas être changé ici.", "The name is kept as is.") };
    if (j.keep.includes("slogan") && a.slogan) return { ok: false, summary: L("Le client garde son slogan tel quel : il ne peut pas être changé ici.", "The tagline is kept as is.") };
    const keysShown = list.map((x) => x.key);
    if (!keysShown.includes(a.key) || Object.values(a.mix ?? {}).some((k) => k && !keysShown.includes(k))) return { ok: false, summary: L(`Cette identité n'est pas dans la proposition affichée (${keysShown.join(", ")}).`, "This identity is not in the displayed proposal.") };
    const chosen = mixIdentity(list, a.key, a.mix, { name: a.name, slogan: a.slogan });
    const others = list.filter((x) => x.key !== a.key);
    const logo = j.keep.includes("logo") ? one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", p.id)?.id : undefined;
    const before = p.brand ? { name: p.brand.name, tagline: p.brand.tagline } : null;
    const brand = brandFromIdentity(p, chosen, j, others, logo);
    saveBrand(p.id, brand);
    const after = loadProject(p.id).brand;
    const verified = !!after && after.name === chosen.name && after.tagline === chosen.slogan && after.palette.primary === chosen.palette.primary;
    const mixed = Object.entries(a.mix ?? {}).filter(([, k]) => k !== a.key).map(([part, k]) => `${part} de ${k}`);
    remember(p.id, { kind: "decision", key: "syna.identite", value: JSON.stringify({ base: a.key, mix: a.mix ?? {}, retouches: { name: a.name, slogan: a.slogan }, identite: chosen }), source: "user" } as any);
    const logoKept = j.keep.includes("logo");
    // Identité réellement changée après les logos ou l'image de marque (audit du 10 novembre 2026) : les logos dessinés
    // avec l'ancien nom, le logo choisi et l'image de marque ne valent plus ; tout repart de l'étape 2.
    const prev = j.identityChoice ? mixIdentity(list, j.identityChoice.key, j.identityChoice.mix as any, j.identityChoice.edits ?? {}) : null;
    const changed = !!prev && (prev.name !== chosen.name || prev.slogan !== chosen.slogan || prev.palette.primary !== chosen.palette.primary || prev.fonts.heading !== chosen.fonts.heading);
    updateJourney(ctx.conversationId, (x) => {
      x.identityChoice = { key: a.key, mix: a.mix ?? {}, ...(a.name || a.slogan ? { edits: { ...(a.name ? { name: a.name } : {}), ...(a.slogan ? { slogan: a.slogan } : {}) } } : {}), at: Date.now() };
      if (!verified) return; // étape validée seulement si la marque est bien relue
      setStep(x, 1, "done");
      if (changed) { x.logos = undefined; x.logoChoice = undefined; x.brandKit = undefined; x.brandFinish = { prepaidMicro: 0 }; }
      // Logo gardé tel quel : pas de nouveaux logos (étape 2 sans objet).
      setStep(x, 2, logoKept ? "skipped" : "todo", logoKept ? "logo gardé par le client" : undefined);
      setStep(x, 3, "todo");
    });
    if (verified && changed && !logoKept) {
      const b2 = loadProject(p.id).brand;
      if (b2) saveBrand(p.id, { ...b2, validated: (b2.validated ?? []).filter((v) => v !== "logo") });
    }
    // La fin de la marque part tout de suite quand l'accord donné pour les identités la couvre déjà ; sinon SINA
    // appelle brand.finish, qui montre son prix.
    const finish = verified && finishEstimate(journeyOf(ctx.conversationId)).maxMicro === 0 ? startFinish(ctx, {}) : null;
    return {
      ok: verified,
      summary: verified
        ? L(`Identité ${a.key}${mixed.length ? ` (avec ${mixed.join(", ")})` : ""} enregistrée comme marque du projet : « ${chosen.name} » — « ${chosen.slogan} ». ${finish?.jobs ? "Je finis maintenant ta marque (ton logo, l'objet qui le porte, les signes, trois publications, ta charte) : quelques minutes, déjà compris dans ton accord." : "Reste à finir ta marque : appelle brand.finish."}`, "Identity saved.")
        : L("La marque n'a pas pu être relue après l'enregistrement.", "Brand could not be verified."),
      ...(finish?.jobs ? { jobs: finish.jobs } : verified ? { hint: "Appelle maintenant brand.finish (sans argument) : le Studio montre son prix au client s'il n'est pas déjà couvert par son accord." } : {}),
      data: { identite: identityView(chosen), etapeSuivante: logoKept ? 3 : 2 },
      changes: [{ module: "marque", object: "identité de marque", summary: `${chosen.name} — ${chosen.slogan}`, before, after: after ? { name: after.name, tagline: after.tagline, palette: after.palette, fonts: after.fonts } : null, verified }],
    };
  },
};

/** Les images d'une planche que SINA peut refaire (le haut du site est une vraie page, jamais une image). */
const REDO_IMAGES = CREATED_SLOTS as unknown as [string, ...string[]];
type ImagesArgs = { keys: Key[]; images: string[]; guidance?: string };
/**
 * Refaire SEULEMENT certaines images d'une ou plusieurs planches (retour du propriétaire du 14 novembre 2026, sur
 * l'essai de la toiletteuse : « c'est à SINA d'y faire, pas à toi ») : la planche, son nom, ses textes et ses autres
 * images ne bougent pas. Le camion ou l'objet qui porte le logo est refait avec le logo gardé ; sans logo gardé, il ne
 * l'est pas. Devis par image refaite, accord du client avant.
 */
const imagesTool: AgentTool<ImagesArgs> = {
  name: "identity.images", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 1 : refait SEULEMENT certaines images des planches déjà montrées (le logo, la grande image « hero », l'objet ou le véhicule qui porte le logo « object », l'image des signes « signs », les publications « post0 », « post1 », « post2 »), sans toucher au nom, aux textes ni aux autres images. À utiliser quand une image est fausse ou refusée (la planche le dit) ou quand le client signale un défaut (« le camion n'est pas assez grand », « le logo n'est pas le même sur le camion ») : dis-lui ce que tu refais et pourquoi, et mets sa correction, avec ses mots, dans guidance. Le logo refait est aussi reposé sur l'objet si tu refais l'objet. keys = les planches (A, B, C, D) ; images = les images à refaire.",
  args: z.object({ keys: z.array(z.enum(KEYS)).min(1).max(4), images: z.array(z.enum(REDO_IMAGES)).min(1).max(7), guidance: z.string().max(1500).optional() }).strict(),
  estimate: (_ctx, a) => ({ ...boardImagesQuote(a.keys.length, undefined, a.images as never), label: `${a.images.length} image${a.images.length > 1 ? "s" : ""} à refaire sur ${a.keys.length} planche${a.keys.length > 1 ? "s" : ""}` }),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const list = j.identities?.list ?? [];
    const keys = [...new Set(a.keys)].filter((k) => list.some((x) => x.key === k && !!x.board));
    if (!keys.length) return { ok: false, summary: L("Il n'y a pas encore de planche à reprendre.", "There is no board to redo yet."), hint: "Les images se refont sur des planches déjà montrées (identity.propose d'abord)." };
    if (pendingJob(p.id, SINA_BRAND_JOB)) return { ok: false, summary: L("Une création de marque est déjà en cours : attends-la.", "A brand job is already running.") };
    const images = [...new Set(a.images)];
    const quote = boardImagesQuote(keys.length, undefined, images as never);
    const job = enqueue({
      userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L(`Images refaites sur ${keys.length} planche${keys.length > 1 ? "s" : ""} (SINA)`, `Board images redone (SINA)`),
      payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: quote.maxMicro, count: routeCountOfProject(p.id), imagesOnly: true, images: true, redo: keys, slots: images, ...(a.guidance ? { guidance: a.guidance } : {}) },
      maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand-images:${keys.join("")}:${images.join("+")}`,
    });
    return {
      ok: true, jobs: [job.id], data: { planches: keys, images, plafondMicro: quote.maxMicro },
      summary: L(`Je refais ${images.length} image${images.length > 1 ? "s" : ""} sur ${keys.map((k) => `« ${list.find((x) => x.key === k)?.name ?? k} »`).join(" et ")} (quelques minutes) ; le reste des planches ne bouge pas.`, "Redoing the board images."),
    };
  },
};

/** Images de la marque finie que le client peut faire refaire. */
const FINISH_REDO = CREATED_SLOTS as unknown as [string, ...string[]];
type FinishArgs = { redo?: string[]; guidance?: string };

/**
 * Devis de la fin de marque : gratuit quand l'accord donné pour les identités la couvre déjà (premier choix, identité
 * prise telle quelle) ; sinon le prix des images à créer, moins ce qui était déjà couvert.
 */
export function finishEstimate(j: Journey, a: FinishArgs = {}): { maxMicro: number; probableMicro?: number; slots: ImageSlot[] } {
  const slots = finishSlots(j, a.redo as ImageSlot[] | undefined);
  if (!slots.length) return { maxMicro: 0, slots };
  const q = finishQuote(slots), prepaid = a.redo?.length ? 0 : j.brandFinish?.prepaidMicro ?? 0;
  if (prepaid >= q.maxMicro) return { maxMicro: 0, slots };
  return { maxMicro: q.maxMicro - prepaid, ...(q.probableMicro ? { probableMicro: Math.max(1, q.probableMicro - prepaid) } : {}), slots };
}

/** Met en file la fin de marque (une seule à la fois). */
function startFinish(ctx: ToolContext, a: FinishArgs): { jobs?: string[]; refused?: string } {
  const p = project(ctx), j = journeyOf(ctx.conversationId);
  if (pendingJob(p.id, SINA_BRAND_JOB)) return { refused: L("Ta marque est déjà en cours de création : attends-la.", "Your brand is already being created.") };
  const slots = finishSlots(j, a.redo as ImageSlot[] | undefined);
  const cap = Math.max(1, slots.length ? finishQuote(slots).maxMicro : 1);
  const job = enqueue({
    userId: ctx.user.id, projectId: p.id, type: SINA_BRAND_JOB, label: L("Ta marque complète (SINA)", "Your complete brand (SINA)"),
    payload: { projectId: p.id, conversationId: ctx.conversationId, capMicro: cap, count: routeCountOfProject(p.id), finish: true, ...(a.redo?.length ? { slots } : {}), ...(a.guidance ? { guidance: a.guidance } : {}) },
    maxAttempts: 1, idempotencyKey: `syna:${ctx.runId}:brand-finish:${(a.redo ?? []).join("+")}:${j.identityChoice?.at ?? 0}`,
  });
  updateJourney(ctx.conversationId, (x) => { if (x.brandFinish) x.brandFinish.prepaidMicro = 0; if (x.steps[2]?.status !== "skipped") setStep(x, 2, "doing"); });
  return { jobs: [job.id] };
}

const finishTool: AgentTool<FinishArgs> = {
  name: "brand.finish", module: "marque", kind: "generate", needsProject: true,
  description: "Étape « La marque », après le choix de l'identité : finit la marque du client, ou en refait une partie. Sans argument : crée ce qui manque à son identité (le logo s'il n'y en a pas, l'objet qui porte le logo, les signes, trois publications), adopte son logo (fond retiré, déclinaisons) et prépare sa charte complète ; c'est déjà compris dans son accord quand il a pris une identité telle quelle. redo = les images à refaire quand il le demande ou qu'une image est ratée : « logo » (un AUTRE logo, créé pour sa marque ; l'objet et les signes sont refaits avec lui), « hero » (la grande scène), « object », « signs », « post0 », « post1 », « post2 » ; guidance = ce qu'il veut de différent, avec ses mots. Payant quand ce n'est pas déjà couvert : le Studio montre le prix au client avant. La marque complète s'affiche dans le fil.",
  args: z.object({ redo: z.array(z.enum(FINISH_REDO)).min(1).max(7).optional(), guidance: z.string().max(1500).optional() }).strict(),
  estimate: (ctx, a) => {
    const e = finishEstimate(journeyOf(ctx.conversationId), a);
    return { maxMicro: e.maxMicro, ...(e.probableMicro ? { probableMicro: e.probableMicro } : {}), label: a.redo?.length ? L(`${e.slots.length} image${e.slots.length > 1 ? "s" : ""} de ta marque à refaire`, "brand images to redo") : L("ta marque complète", "your complete brand") };
  },
  run: (ctx, a) => {
    const j = journeyOf(ctx.conversationId);
    if (j.steps[1]?.status !== "done" || !j.identityChoice) return { ok: false, summary: L("L'identité doit être choisie avant de finir la marque.", "Choose the identity first."), hint: "Le client choisit d'abord une identité (identity.choose)." };
    if (j.steps[3]?.status === "done" && !a.redo?.length) return { ok: false, summary: L("La marque est déjà validée.", "The brand is already validated.") };
    if (a.redo?.includes("logo") && j.keep.includes("logo")) return { ok: false, summary: L("Tu gardes ton logo : je ne le redessine pas.", "You keep your logo: I do not redraw it.") };
    const r = startFinish(ctx, a);
    if (!r.jobs) return { ok: false, summary: r.refused! };
    return { ok: true, jobs: r.jobs, summary: a.redo?.length ? L("Je refais ce que tu m'as demandé (quelques minutes) ; le reste de ta marque ne bouge pas.", "Redoing what you asked.") : L("Je finis ta marque (quelques minutes) : ton logo, l'objet qui le porte, les signes, trois publications et ta charte.", "Finishing your brand.") };
  },
};

export const identityTools: AgentTool[] = [proposeTool, chooseTool, imagesTool, finishTool];
