/**
 * Étape 2 du parcours SINA (#492) : 3 logos LIBRES pour l'identité CHOISIE à l'étape 1 (son nom exact, ses couleurs).
 *
 * Décision du propriétaire du 7 novembre 2026, après deux essais réels (« des logos des années 80 ») : plus aucune idée
 * imposée (aquarelle, cachet, monogramme…) ni style dicté. Le modèle d'images reçoit une demande courte qui lui laisse
 * CARTE BLANCHE (« qu'il se fasse plaisir ») : la marque, ce qu'elle fait, ce qu'elle doit faire ressentir, ses
 * couleurs, le nom exact, et seulement les rendus interdits par le propriétaire.
 *
 * La relecture par Claude (vision), la réécriture gratuite d'un nom mal écrit, l'enregistrement des propositions et
 * le choix du client restent ceux du moteur de logos V2 (src/lib/logo-v2/), avec le style « libre ».
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import type { Brand } from "../project-types";
import type { JobContext } from "../jobs";
import type { TerritoryDraft } from "../logo-v2/territories";
import type { EngineRun, LogoStyle, ProposalResult } from "../logo-v2/types";
import { FORBIDDEN_LOGO_RENDERS } from "../logo-v2/artwork";
import { realLogoV2Ai, type LogoV2Ai } from "../logo-v2/ai";
import { runLogoEngineV2 } from "../logo-v2/engine";
import { logoSeriesQuote } from "../logo-v2/quote";
import { logoArtworkImage } from "../ai/media-providers";
import { jobSpentMicro } from "./budget";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";

/**
 * Trois DIRECTIONS ARTISTIQUES franchement différentes, une par proposition (retour du propriétaire du 7 novembre :
 * « la direction artistique doit être différente entre les 3 propositions, le même logo avec juste des éléments
 * déplacés ne convient pas »). Ce sont des familles larges, jamais un objet, une matière ou une forme imposés : à
 * l'intérieur de sa direction, le dessinateur garde carte blanche.
 */
export const FREE_DIRECTIONS = [
  {
    label: "illustration",
    text: "une ILLUSTRATION riche et généreuse : un sujet ou une scène dessinés avec talent, pleins de vie et de couleurs, réunis avec le nom écrit dans un lettrage soigné",
  },
  {
    label: "lettrage",
    text: "un LETTRAGE : le nom lui-même est le dessin, un lettrage sur mesure, expressif et élégant ; au plus un petit détail graphique intégré aux lettres ; aucune illustration, aucune scène, aucun symbole séparé",
  },
  {
    label: "symbole moderne",
    text: "un SYMBOLE MODERNE : un signe graphique contemporain en aplats nets, une idée maligne qui se comprend d'un coup d'œil, composé avec le nom en typographie actuelle pour former un tout ; aucune scène, aucun détail illustré, jamais une lettre seule avec une forme de base",
  },
] as const;

/** Compatibilité : la ligne de direction de chaque proposition. */
export const FREE_MOODS = FREE_DIRECTIONS.map((d, i) => `Proposition ${i + 1} : ${d.text}.`);

/** Direction de la proposition n, avec les deux autres à ne pas approcher. */
export function directionLine(n: number): string {
  const i = n % FREE_DIRECTIONS.length;
  const others = FREE_DIRECTIONS.filter((_, k) => k !== i).map((d) => d.label);
  return [
    `Direction artistique de cette proposition : ${FREE_DIRECTIONS[i].text}.`,
    `Les trois propositions présentées au client ont trois directions artistiques complètement différentes ; les deux autres sont « ${others[0]} » et « ${others[1]} » : ne t'en approche pas. Jamais le même logo avec des éléments déplacés ou recolorés.`,
  ].join("\n");
}

/** Ce que la marque doit faire ressentir, avec les mots du client et de l'identité choisie. */
export type FreeLogoFacts = { name: string; activity: string; feeling: string; audience: string | null; colors: string[] };

export function freeLogoFacts(brand: Brand, j: Journey): FreeLogoFacts {
  const answer = (f: "offer" | "image" | "audience") => (j.start[f]?.status === "answered" ? j.start[f]!.value : "");
  const colors = [...new Set([brand.palette.primary, brand.palette.accent, brand.palette.dark, brand.palette.secondary])];
  return {
    name: brand.name,
    activity: answer("offer") || brand.positioning,
    feeling: [brand.personality.join(", "), answer("image")].filter(Boolean).join(" — "),
    audience: answer("audience") || null,
    colors,
  };
}

/** Demande au modèle d'images : courte, positive, carte blanche ; seuls le nom exact et les interdits sont fixés. */
export function freeLogoPrompt(f: FreeLogoFacts, n: number, feedback?: string): string {
  return [
    `Crée le logo de la marque « ${f.name} ». Ce qu'elle fait : ${f.activity.trim().replace(/\.$/, "")}.`,
    f.feeling ? `Ce qu'elle doit faire ressentir : ${f.feeling}.` : "",
    f.audience ? `Pour qui : ${f.audience.trim().replace(/\.$/, "")}.` : "",
    directionLine(n),
    "Dans cette direction, tu as carte blanche totale sur l'idée, le sujet, la typographie et la composition : fais-toi plaisir et surprends-nous avec un logo beau, moderne et mémorable, au niveau des meilleures agences de branding de 2026.",
    `Couleurs de la marque, à utiliser librement : ${f.colors.join(", ")} (et le blanc).`,
    `Le seul texte du logo est le nom « ${f.name} », écrit exactement, lettre par lettre, avec ses accents. Aucun autre mot.`,
    `À éviter : un rendu daté (années 80 ou 90, clip-art) ; ${FORBIDDEN_LOGO_RENDERS.join(" ; ")}.`,
    feedback ? `Changements demandés pour cette version : ${feedback.trim().replace(/\.$/, "")}.` : "",
    // Essai réel du 7 novembre : en carte blanche, le modèle livrait parfois une PLANCHE de trois variantes.
    "Une seule proposition de logo dans l'image, jamais une planche de plusieurs versions ou déclinaisons.",
    "Logo seul, centré, sur un fond blanc uni, dessiné à plat : aucune maquette, aucune photo, aucune personne.",
  ].filter(Boolean).join("\n");
}

/**
 * Trois territoires « libres » pour le moteur : aucun ne dicte le dessin (la demande est freeLogoPrompt) ; leurs axes
 * techniques diffèrent seulement pour que le moteur les garde comme trois propositions distinctes.
 */
export function freeTerritories(f: FreeLogoFacts): TerritoryDraft[] {
  const axes = [
    { composition: "stacked", construction: "illustrative", sobriety: 5, type: "classic_serif" },
    { composition: "wordmark_only", construction: "typographic", sobriety: 3, type: "humanist_sans" },
    { composition: "horizontal", construction: "geometric", sobriety: 1, type: "geometric_sans" },
  ] as const;
  return axes.map((a, i) => ({
    name: `Création libre ${i + 1}`,
    concept: `Direction « ${FREE_DIRECTIONS[i].label} », carte blanche au dessinateur pour « ${f.name} » : ${FREE_DIRECTIONS[i].text}.`,
    whyItFits: `Un logo beau et moderne pour ${f.activity.slice(0, 160)}.`,
    markType: i === 1 ? "wordmark" : "symbol_wordmark", composition: a.composition, construction: a.construction, sobriety: a.sobriety,
    typography: { style: a.type, weight: "regular", case: "title", tracking: "normal", rationale: "libre" },
    colorRole: { ink: "dark", accent: "primary", rationale: "couleurs de la marque" },
    symbolIdea: null, distinctive: "libre", avoid: [], style: "libre" as LogoStyle, descriptor: null,
    imageBrief: freeLogoPrompt(f, i), colors: f.colors.slice(0, 3),
  }));
}

/** Dépendances remplaçables par les tests (aucun appel réel). */
export const logoDeps: { ai?: (ctx: JobContext, userId: string, projectId: string) => LogoV2Ai; draw?: (prompt: string, territoryId: string) => Promise<Buffer> } = {};

export type SinaLogo = { source: "A" | "B" | "C"; name: string; style: LogoStyle; assetId: string | null; verdict: string; score: number | null; reason: string; best?: boolean };

/**
 * Motif du contrôle dit au client (tutoiement, sans renvoyer vers un bouton d'un autre écran) : « note 7,4/10, il
 * faut 7,5 » au lieu de « sous la barrière (7.4/10, attendu 7.5) — aucune nouvelle image sans votre accord (bouton…) ».
 */
export function clientReason(reason: string): string {
  return reason
    .replace(/\s*[—-]\s*aucune nouvelle image sans votre accord[^)]*\)?\)?/i, "")
    .replace(/sous la barrière \((\d+(?:[.,]\d+)?)\/10, attendu (\d+(?:[.,]\d+)?)\)/i, (_m, a: string, b: string) => `note ${a.replace(".", ",")}/10, il faut ${b.replace(".", ",")}`)
    .replace(/\bvotre\b/g, "ton").replace(/\bvos\b/g, "tes").replace(/\bvous\b/g, "toi")
    .trim();
}

/** Proposition retenue de chaque territoire (FINALE d'abord, puis version du studio, puis meilleur essai). */
export function logosOfRun(run: EngineRun): SinaLogo[] {
  const all: ProposalResult[] = [...run.shown, ...run.studio, ...run.discarded];
  const rank = (r: ProposalResult) => (r.verdict === "FINAL" ? 300 : r.verdict === "PROVISIONAL" ? 200 : 0) + (r.score ?? 0) + (r.assetId === run.best ? 100 : 0);
  return run.territories.map((t, i) => {
    const mine = all.filter((r) => r.territory.id === t.id || r.territory.id === `${t.id}-relais` || r.territory.name === t.name).sort((a, b) => rank(b) - rank(a))[0];
    return { source: (["A", "B", "C"] as const)[i] ?? "A", name: t.name, style: t.style, assetId: mine?.assetId ?? null, verdict: mine?.verdict ?? "ECHEC", score: mine?.score ?? null, reason: mine?.reason ? clientReason(mine.reason) : L("aucun dessin obtenu", "no drawing obtained"), ...(mine?.assetId && mine.assetId === run.best ? { best: true } : {}) };
  });
}

/** Coût maximal d'une proposition de 3 logos : la série du moteur (images, relectures). */
export function logosMaxMicro(): number {
  return logoSeriesQuote().maxMicro;
}

export const SINA_LOGOS_JOB = "syna.logos";

/** Tâche de fond : 3 logos libres dessinés et relus par le moteur V2 ; résultat rangé dans le parcours. */
export async function runSinaLogosJob(ctx: JobContext) {
  const { projectId, conversationId, capMicro, guidance } = z.object({ projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(), guidance: z.string().max(1500).optional() }).parse(ctx.payload);
  const p = loadProject(projectId);
  const j = journeyOf(conversationId);
  if (!p.brand || !j.identityChoice) throw new HttpError(409, L("L'identité de marque doit être choisie avant les logos (étape 1).", "Choose the brand identity first (step 1)."));
  const facts = freeLogoFacts(p.brand, j);
  const drafts = freeTerritories(facts);
  const base = logoDeps.ai ? logoDeps.ai(ctx, p.userId, projectId) : realLogoV2Ai(ctx, { userId: p.userId, projectId });
  const index = (t: { name: string }) => Math.max(0, drafts.findIndex((d) => d.name === t.name));
  const ai: LogoV2Ai = {
    ...base,
    territories: async () => drafts,
    // Dessin LIBRE : la demande courte de carte blanche, jamais la consigne structurée du moteur (style, composition…).
    drawArtwork: async (t, _brief, feedback) => {
      const prompt = freeLogoPrompt(facts, index(t), [guidance, feedback].filter(Boolean).join(" ; ") || undefined);
      if (logoDeps.draw) return logoDeps.draw(prompt, t.id);
      return logoArtworkImage({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:sina-libre:${t.id}${feedback ? `:r${feedback.length}` : ""}` }, { prompt });
    },
  };
  const run = await runLogoEngineV2(ctx, projectId, { ai, territories: 3, capMicro: Math.max(1, capMicro - jobSpentMicro(ctx.job.id)), instructions: guidance });
  const logos = logosOfRun(run);
  updateJourney(conversationId, (x) => {
    x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes: run.notes.slice(0, 8) };
    setStep(x, 2, "review");
  });
  return { logos, notes: run.notes.slice(0, 8), stoppedByCostCap: run.stoppedByCostCap };
}
