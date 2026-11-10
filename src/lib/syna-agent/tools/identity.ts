/**
 * Étape 1 du parcours SINA (#492) : 3 identités de marque (proposer, refaire, choisir, mélanger). La création est
 * payante (Claude, modèle fort, une reprise au plus si le contrôle gratuit du Studio échoue) ; le choix est gratuit et
 * enregistre la marque du projet (nom, slogan, promesse, palette, polices, ton, idée de logo).
 */
import { z } from "zod";
import fs from "node:fs";
import { one } from "../../db";
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

const KEYS = ["A", "B", "C"] as const;
type Key = (typeof KEYS)[number];

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
});

/** « Seulement les noms » : tout le reste des identités est remis tel quel (jamais changé en silence). */
export function keepAllButNames(fresh: Identity[], previous: Identity[]): Identity[] {
  return fresh.map((x) => {
    const p = previous.find((y) => y.key === x.key);
    return p ? { ...p, name: x.name, nameStyle: x.nameStyle, nameKind: x.nameKind, nameWhy: x.nameWhy, nameAnchor: x.nameAnchor, nameTest: x.nameTest, nameExpression: x.nameExpression, nameCandidates: x.nameCandidates, slogan: x.slogan, sloganTone: x.sloganTone, logoIdea: x.logoIdea } : x;
  });
}

const proposeTool: AgentTool<{ guidance?: string; redo?: Key[]; only?: "noms" }> = {
  name: "identity.propose", module: "marque", kind: "generate", needsProject: true,
  description: "Étape 1 : crée 3 identités de marque VRAIMENT différentes (nom, slogan, promesse, territoire, palette, polices, ton ; le logo est dessiné à l'étape 2, en carte blanche) à partir de la fiche de départ, avec Claude (modèle fort), puis les contrôle. Payant : le Studio montre le devis au client (carte d'accord) avant de lancer. À appeler quand le client est prêt, ou quand il demande une nouvelle proposition : guidance = ce qu'il veut de différent (ses mots) ; redo = les identités à refaire (les autres restent identiques) ; only « noms » = refaire seulement les noms et les slogans (couleurs, polices et le reste gardés). Les cartes des identités s'affichent dans le fil.",
  args: z.object({ guidance: z.string().max(1500).optional(), redo: z.array(z.enum(KEYS)).min(1).max(3).optional(), only: z.enum(["noms"]).optional() }).strict(),
  estimate: () => ({ maxMicro: IDENTITY_CAP_MICRO, probableMicro: identityProbableMicro(), label: "3 identités de marque" }),
  run: async (ctx, a) => {
    project(ctx);
    const j = journeyOf(ctx.conversationId);
    if (j.steps[0]?.status !== "done") return { ok: false, summary: L("L'étape 0 (questions de départ) n'est pas encore validée : termine-la d'abord.", "Step 0 is not validated yet.") };
    // Après le choix, une nouvelle proposition seulement si le client la demande avec ses mots (guidance).
    if (j.steps[1]?.status === "done" && !a.guidance) return { ok: false, summary: L("L'identité est déjà choisie.", "The identity is already chosen."), hint: "Pour en changer, le client choisit une autre identité (identity.choose), ou demande avec ses mots une nouvelle proposition (identity.propose avec guidance = ses mots)." };
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
  return {
    ...base,
    name: edits.name?.trim() || pick(mix.name).name,
    nameWhy: edits.name ? "" : pick(mix.name).nameWhy,
    slogan: edits.slogan?.trim() || pick(mix.slogan).slogan,
    palette: pick(mix.palette).palette, paletteFamily: pick(mix.palette).paletteFamily, ground: pick(mix.palette).ground, gradient: pick(mix.palette).gradient,
    fonts: pick(mix.fonts).fonts, fontStyle: pick(mix.fonts).fontStyle,
    tone: pick(mix.tone).tone,
    logoStyle: pick(mix.logo).logoStyle, logoIdea: pick(mix.logo).logoIdea,
    // Le « pourquoi » d'une identité parle de SES couleurs, polices et ton : il n'est plus vrai après un mélange de ces
    // éléments (essai réel : « fond en dégradé, vert basilic » affiché sur un fond blanc au bouton bleu).
    why: (["palette", "fonts", "tone"] as const).some((part) => mix[part] && mix[part] !== key) ? "" : base.why,
  };
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
  description: "Étape 1 : enregistre l'identité choisie PAR LE CLIENT (jamais à sa place) comme marque du projet et valide l'étape 1. key = identité de base (A, B ou C). mix = éléments pris à une autre identité si le client mélange (ex. le nom de A avec les couleurs de C : key « A », mix {palette: « C »}) ; parties : name, slogan, palette, fonts, tone, logo. name / slogan = retouche du client, reprise mot pour mot. Gratuit.",
  args: z.object({ key: choiceKey, mix: z.object({ name: choiceKey, slogan: choiceKey, palette: choiceKey, fonts: choiceKey, tone: choiceKey, logo: choiceKey }).partial().strict().optional(), name: z.string().min(1).max(60).optional(), slogan: z.string().min(1).max(120).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const j = journeyOf(ctx.conversationId);
    const list = j.identities?.list;
    if (!list?.length) return { ok: false, summary: L("Aucune identité proposée pour l'instant.", "No identity proposed yet."), hint: "Lance d'abord identity.propose." };
    if (j.keep.includes("nom") && a.name) return { ok: false, summary: L("Le client garde son nom tel quel : il ne peut pas être changé ici.", "The name is kept as is.") };
    if (j.keep.includes("slogan") && a.slogan) return { ok: false, summary: L("Le client garde son slogan tel quel : il ne peut pas être changé ici.", "The tagline is kept as is.") };
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
      if (changed) { x.logos = undefined; x.logoChoice = undefined; x.brandKit = undefined; }
      // Logo gardé tel quel : pas de nouveaux logos (étape 2 sans objet).
      setStep(x, 2, logoKept ? "skipped" : "todo", logoKept ? "logo gardé par le client" : undefined);
      setStep(x, 3, "todo");
    });
    if (verified && changed && !logoKept) {
      const b2 = loadProject(p.id).brand;
      if (b2) saveBrand(p.id, { ...b2, validated: (b2.validated ?? []).filter((v) => v !== "logo") });
    }
    return {
      ok: verified,
      summary: verified
        ? L(`Identité ${a.key}${mixed.length ? ` (avec ${mixed.join(", ")})` : ""} enregistrée comme marque du projet : « ${chosen.name} » — « ${chosen.slogan} ». Étape 1 validée. Prochaine étape : ${logoKept ? "l'image de marque complète (ton logo est gardé)" : "les 3 logos"}.`, "Identity saved.")
        : L("La marque n'a pas pu être relue après l'enregistrement.", "Brand could not be verified."),
      data: { identite: identityView(chosen), etapeSuivante: logoKept ? 3 : 2 },
      changes: [{ module: "marque", object: "identité de marque", summary: `${chosen.name} — ${chosen.slogan}`, before, after: after ? { name: after.name, tagline: after.tagline, palette: after.palette, fonts: after.fonts } : null, verified }],
    };
  },
};

export const identityTools: AgentTool[] = [proposeTool, chooseTool];
