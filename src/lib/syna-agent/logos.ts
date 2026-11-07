/**
 * Étape 2 du parcours SINA (#492) : 3 logos de 3 styles différents pour l'identité CHOISIE à l'étape 1 (son nom, sa
 * palette et ses polices), un par idée de logo des trois identités proposées (charte qualité 2026 § 2.2 à 2.4).
 *
 * Seule pièce nouvelle : Claude adapte les trois idées de logo à l'identité choisie (ex. le monogramme « PP » de
 * « Pot Commun » devient « HD » pour « Heure Dorée ») sous forme de territoires du moteur de logos existant (Logo V2).
 * Le dessin, la relecture par Claude (vision), la réécriture gratuite d'un nom mal écrit, le relais de qualité vers un
 * autre modèle, l'enregistrement des propositions et le choix du client sont ceux du moteur V2 (src/lib/logo-v2/).
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import type { Brand } from "../project-types";
import { llmJson, type LlmCall } from "../ai/llm";
import { withTrace } from "../ai/trace";
import { jobSpentMicro } from "./budget";
import type { JobContext } from "../jobs";
import { TerritorySchema, type TerritoryDraft } from "../logo-v2/territories";
import { LOGO_STYLES as ENGINE_STYLES, type EngineRun, type LogoStyle, type ProposalResult } from "../logo-v2/types";
import { STYLE_GUIDE } from "../logo-v2/artwork";
import { realLogoV2Ai, type LogoV2Ai } from "../logo-v2/ai";
import { runLogoEngineV2 } from "../logo-v2/engine";
import { logoSeriesQuote } from "../logo-v2/quote";
import { LOGO_STYLE_LABEL, fontFamily, type Identity } from "./identities";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { mixIdentity } from "./tools/identity";

/** Style du moteur de logos le plus proche de chaque style de la charte (étape 1). */
export const ENGINE_STYLE: Record<Identity["logoStyle"], LogoStyle> = {
  lettrage: "typographic", symbole: "minimal", monogramme: "monogram", embleme: "emblem", cachet: "emblem",
  mascotte: "illustrated", trait: "minimal", abstrait: "minimal", pixel: "textured", brutaliste: "typographic",
  isometrie: "illustrated", aquarelle: "textured", artdeco: "premium", popart: "illustrated",
};

/** Plafond de l'adaptation des idées de logo (un appel Claude, modèle fort). */
export const LOGO_TERRITORIES_CAP_MICRO = 300_000;
export const LOGO_TERRITORIES_MODEL = { provider: "anthropic" as const, model: "claude-opus-5-5", effort: "medium" };

export const SinaTerritoriesSchema = z.object({
  territories: z.array(TerritorySchema.extend({ source: z.enum(["A", "B", "C"]) })).length(3),
});
export type SinaTerritory = TerritoryDraft & { source: "A" | "B" | "C" };

/** Consignes stables (mises en cache) : forme exacte des territoires du moteur V2. */
export const LOGO_TERRITORIES_SYSTEM = `Tu es directeur artistique de logos, au niveau des meilleures agences de 2026. Le client a CHOISI son identité de marque (nom exact, palette, polices). Pour cette identité, tu prépares TROIS logos de TROIS styles différents, chacun tiré d'une des trois idées de logo proposées à l'étape précédente : garde l'idée et le style de chaque source, mais ADAPTE-la à l'identité choisie (son nom exact, ses initiales, ses couleurs, son univers). Exemple : un monogramme « PP » imaginé pour « Pot Commun » devient un monogramme des initiales du nom choisi.

Règles :
- Le seul texte du logo est le nom EXACT de la marque (accents, espaces, casse) : aucun slogan, aucune ligne d'activité (descriptor: null), aucun autre mot, chiffre ou lettre.
- Couleurs : uniquement des codes de la palette choisie (champ colors : 1 à 3 codes exacts de la palette), contrastées, accordées à l'univers.
- Chaque logo est simple, astucieux, mémorisable, exécuté proprement (dessin vectoriel net, épaisseurs cohérentes, nom parfaitement lisible, composition équilibrée) ; jamais de WordArt, de dégradé gratuit, de cliché maladroit ni de ressemblance avec une marque connue.
- Les trois logos diffèrent par leur style (champ style), leur type de marque, leur composition, leur construction et leur typographie.
- imageBrief : en ANGLAIS, brief précis pour le modèle d'images (ce que montre le logo, l'idée centrale, la composition, le traitement du nom, les couleurs exactes en hexadécimal, la finition, ce qu'il faut éviter), fond blanc uni, logo centré, rien d'autre sur l'image.
- concept, whyItFits, distinctive : en français, en tutoyant le client si tu t'adresses à lui.

Valeurs autorisées :
- style : ${ENGINE_STYLES.join(", ")} (${Object.entries(STYLE_GUIDE).map(([k, v]) => `${k} = ${v.split(":")[0]}`).join(" ; ")})
- markType : wordmark, lettermark, monogram, symbol_wordmark, abstract_mark, emblem
- composition : horizontal, stacked, wordmark_only, badge
- construction : geometric, organic, typographic, modular, illustrative
- typography.style : geometric_sans, humanist_sans, grotesque, high_contrast_serif, classic_serif, contemporary_serif ; weight : light, regular, bold, black ; case : upper, title, lower ; tracking : tight, normal, wide
- colorRole.ink / colorRole.accent : primary, secondary, accent, light, dark (rôles de la palette)
- sobriety : 1 (très sobre) à 5 (expressif)

Réponds UNIQUEMENT avec un objet JSON :
{"territories": [{"source": "A", "name": "", "concept": "", "whyItFits": "", "markType": "", "composition": "", "typography": {"style": "", "weight": "", "case": "", "tracking": "", "rationale": ""}, "colorRole": {"ink": "", "accent": "", "rationale": ""}, "sobriety": 3, "construction": "", "symbolIdea": "", "distinctive": "", "avoid": [""], "style": "", "descriptor": null, "imageBrief": "", "colors": ["#RRGGBB"]}, {"source": "B", …}, {"source": "C", …}]}`;

/** Demande : identité choisie et les trois idées de logo à adapter. */
export function logoTerritoriesPrompt(brand: Brand, sources: Identity[], guidance?: string): string {
  const pal = brand.palette;
  return [
    "# Identité choisie par le client",
    `Nom exact : « ${brand.name} »`,
    `Slogan (pas dans le logo) : « ${brand.tagline} »`,
    `Fond de page : ${brand.ground ?? "blanc"} ; palette : texte ${pal.dark}, fond clair ${pal.light}, bouton et couleur de marque ${pal.primary}, surface ${pal.secondary}, accent ${pal.accent}`,
    `Polices : titres ${fontFamily(brand.fonts.heading)}, textes ${fontFamily(brand.fonts.body)}`,
    `Ton : ${brand.personality.join(", ")} ; positionnement : ${brand.positioning}`,
    "",
    "# Les trois idées de logo à adapter (une par logo, dans cet ordre, source A, B puis C)",
    ...sources.map((x) => `${x.key}. Style « ${LOGO_STYLE_LABEL[x.logoStyle]} » (style du moteur : ${ENGINE_STYLE[x.logoStyle]}) — idée imaginée pour « ${x.name} » : ${x.logoIdea}`),
    ...(guidance ? ["", "# Ce que le client demande pour ces logos", guidance] : []),
    "",
    `Prépare les trois logos de « ${brand.name} ». Réponds avec l'objet JSON demandé.`,
  ].join("\n");
}

/** Contrôle gratuit des territoires avant tout dessin payé. */
export function territoryIssues(list: SinaTerritory[], brand: Brand): string[] {
  const issues: string[] = [];
  const palette = Object.values(brand.palette).map((c) => c.toLowerCase());
  if (list.map((t) => t.source).sort().join("") !== "ABC") issues.push("Un logo par source A, B et C est attendu.");
  if (new Set(list.map((t) => t.style)).size < list.length) issues.push("Trois styles de logo différents sont attendus.");
  for (const t of list) {
    if (!t.style) issues.push(`Logo ${t.source} : style manquant.`);
    if (!t.imageBrief || t.imageBrief.length < 60) issues.push(`Logo ${t.source} : brief d'image trop court.`);
    if (!t.colors?.length) issues.push(`Logo ${t.source} : couleurs manquantes.`);
    for (const c of t.colors ?? []) if (!palette.includes(c.toLowerCase())) issues.push(`Logo ${t.source} : couleur ${c} hors de la palette choisie.`);
    if (t.descriptor) issues.push(`Logo ${t.source} : aucune ligne d'activité sous le nom (descriptor doit être null).`);
  }
  return [...new Set(issues)];
}

/** Dépendances remplaçables par les tests (aucun appel réel). */
export const logoDeps: { territories?: (call: LlmCall) => Promise<unknown>; ai?: (ctx: JobContext, userId: string, projectId: string) => LogoV2Ai } = {};

async function adaptIdeas(ctx: JobContext, p: ReturnType<typeof loadProject>, sources: Identity[], guidance: string | undefined, feedback?: string[]): Promise<SinaTerritory[]> {
  const call: LlmCall = {
    task: "strategy", userId: p.userId, projectId: p.id, jobId: ctx.job.id,
    system: LOGO_TERRITORIES_SYSTEM, promptKey: "syna-logo-territories-1",
    prompt: logoTerritoriesPrompt(p.brand!, sources, guidance) + (feedback?.length ? `\n\n# Corrections exigées par le contrôle du Studio\n${feedback.map((f) => `- ${f}`).join("\n")}` : ""),
    maxTokens: 16000, maxOutputTokens: 20000, usageKey: `${ctx.job.id}:sina-logo-territories:${feedback?.length ? 2 : 1}`,
    routing: { difficulty: "complex", prefer: LOGO_TERRITORIES_MODEL },
  };
  if (logoDeps.territories) return SinaTerritoriesSchema.parse(await logoDeps.territories(call)).territories as SinaTerritory[];
  const cap = jobSpentMicro(ctx.job.id) + LOGO_TERRITORIES_CAP_MICRO;
  const r = await withTrace({ jobId: ctx.job.id, projectId: p.id, step: "sina-logos", costCapMicro: cap }, () => llmJson(call, SinaTerritoriesSchema));
  return r.territories as SinaTerritory[];
}

export type SinaLogo = { source: "A" | "B" | "C"; name: string; style: LogoStyle; assetId: string | null; verdict: string; score: number | null; reason: string; best?: boolean };

/** Proposition retenue de chaque territoire (FINALE d'abord, puis version du studio, puis meilleur essai). */
export function logosOfRun(run: EngineRun, territories: SinaTerritory[]): SinaLogo[] {
  const all: ProposalResult[] = [...run.shown, ...run.studio, ...run.discarded];
  const rank = (r: ProposalResult) => (r.verdict === "FINAL" ? 300 : r.verdict === "PROVISIONAL" ? 200 : 0) + (r.score ?? 0) + (r.assetId === run.best ? 100 : 0);
  return run.territories.map((t) => {
    const src = territories.find((x) => x.name === t.name)?.source ?? "A";
    const mine = all.filter((r) => r.territory.id === t.id || r.territory.id === `${t.id}-relais` || r.territory.name === t.name).sort((a, b) => rank(b) - rank(a))[0];
    return { source: src, name: t.name, style: t.style, assetId: mine?.assetId ?? null, verdict: mine?.verdict ?? "ECHEC", score: mine?.score ?? null, reason: mine?.reason ?? L("aucun dessin obtenu", "no drawing obtained"), ...(mine?.assetId && mine.assetId === run.best ? { best: true } : {}) };
  });
}

/** Coût maximal d'une proposition de 3 logos : adaptation des idées + série du moteur (images, relectures, relais). */
export function logosMaxMicro(): number {
  return LOGO_TERRITORIES_CAP_MICRO + logoSeriesQuote().maxMicro;
}

export const SINA_LOGOS_JOB = "syna.logos";

/** Tâche de fond : adaptation des idées (Claude), puis les 3 logos par le moteur V2 ; résultat rangé dans le parcours. */
export async function runSinaLogosJob(ctx: JobContext) {
  const { projectId, conversationId, capMicro, guidance } = z.object({ projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(), guidance: z.string().max(1500).optional() }).parse(ctx.payload);
  const p = loadProject(projectId);
  const j = journeyOf(conversationId);
  if (!p.brand || !j.identities?.list.length || !j.identityChoice) throw new HttpError(409, L("L'identité de marque doit être choisie avant les logos (étape 1).", "Choose the brand identity first (step 1)."));
  const chosen = mixIdentity(j.identities.list, j.identityChoice.key, j.identityChoice.mix as any);
  // Sources : l'idée de logo de l'identité retenue d'abord, puis les deux autres.
  const sources = [chosen, ...j.identities.list.filter((x) => x.key !== j.identityChoice!.key)].map((x, i) => ({ ...x, key: (["A", "B", "C"] as const)[i] }));
  let territories = await ctx.step("sina:logo-territories:1", () => adaptIdeas(ctx, p, sources, guidance));
  let issues = territoryIssues(territories, p.brand);
  if (issues.length) {
    territories = await ctx.step("sina:logo-territories:2", () => adaptIdeas(ctx, p, sources, guidance, issues));
    issues = territoryIssues(territories, p.brand);
    if (issues.length) throw new HttpError(422, L(`Idées de logo impossibles à préparer correctement : ${issues.join(" ")} Aucune image n'a été demandée.`, "Logo ideas could not be prepared. No image requested."));
  }
  const base = logoDeps.ai ? logoDeps.ai(ctx, p.userId, projectId) : realLogoV2Ai(ctx, { userId: p.userId, projectId });
  // Le moteur reçoit nos territoires au lieu d'en inventer : seule la source des idées change.
  const ai: LogoV2Ai = { ...base, territories: async () => territories.map(({ source: _s, ...t }) => t) };
  const run = await runLogoEngineV2(ctx, projectId, { ai, territories: 3, capMicro: Math.max(1, capMicro - jobSpentMicro(ctx.job.id)), instructions: guidance });
  const logos = logosOfRun(run, territories);
  updateJourney(conversationId, (x) => {
    x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes: run.notes.slice(0, 8) };
    setStep(x, 2, "review");
  });
  return { logos, notes: run.notes.slice(0, 8), stoppedByCostCap: run.stoppedByCostCap };
}

