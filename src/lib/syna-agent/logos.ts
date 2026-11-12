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
import { contrast } from "../color";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import type { Brand } from "../project-types";
import { JobCancelled, JobPaused, LeaseLost, type JobContext } from "../jobs";
import type { TerritoryDraft } from "../logo-v2/territories";
import type { Candidate, EngineRun, LogoStyle, ProposalResult, Territory } from "../logo-v2/types";
import { nearestWeight } from "../logo-v2/territories";
import { canvasFamily } from "../media/fonts";
import type { LogoSpec } from "../media/logo";
import { FORBIDDEN_LOGO_RENDERS } from "../logo-v2/artwork";
import { realLogoV2Ai, type LogoV2Ai } from "../logo-v2/ai";
import { runLogoEngineV2, saveProposal } from "../logo-v2/engine";
import { logoRedrawQuote, logoSeriesQuote } from "../logo-v2/quote";
import { logoArtworkImage } from "../ai/media-providers";
import { artworkChoosable } from "../logo-v2/choose";
import { getAsset } from "../library";
import { json } from "../db";
import { jobSpentMicro } from "./budget";
import { journeyOf, setStep, updateJourney, type Journey } from "./journey";
import { FONT_CHARACTER, fontFamily, type Identity } from "./identities";
import { isRoute, safeWordmark, type Route } from "./brand-routes";
import { drawWordmark, wordmarkPng, type DrawnWordmark } from "./brand-wordmark";
import { mixIdentity } from "./tools/identity";

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
export function freeLogoPrompt(f: FreeLogoFacts, n: number, wishes?: string, fix?: string): string {
  return [
    `Crée le logo de la marque « ${f.name} ». Ce qu'elle fait : ${f.activity.trim().replace(/\.$/, "")}.`,
    f.feeling ? `Ce qu'elle doit faire ressentir : ${f.feeling.trim().replace(/\.+$/, "")}.` : "",
    f.audience ? `Pour qui : ${f.audience.trim().replace(/\.$/, "")}.` : "",
    directionLine(n),
    "Dans cette direction, tu as carte blanche totale sur l'idée, le sujet, la typographie et la composition : fais-toi plaisir et surprends-nous avec un logo beau, moderne et mémorable, au niveau des meilleures agences de branding de 2026.",
    `Couleurs de la marque, à utiliser librement : ${f.colors.join(", ")} (et le blanc).`,
    `Le seul texte du logo est le nom « ${f.name} », écrit exactement, lettre par lettre, avec ses accents. Aucun autre mot : ni slogan, ni phrase, ni ligne d'activité.`,
    `À éviter : un rendu daté (années 80 ou 90, clip-art) ; ${FORBIDDEN_LOGO_RENDERS.join(" ; ")}.`,
    wishes ? `Souhaits du client, avec ses mots : ${wishes.trim().replace(/\.+$/, "")}. Ils ne changent pas le texte du logo (le nom seul).` : "",
    fix ? `Correction pour cette nouvelle version : ${fix.trim().replace(/\.+$/, "")}.` : "",
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
    // Nom montré au client (cartes, charte) : la direction, en clair (« Création libre 3 » ne lui disait rien).
    name: FREE_DIRECTIONS[i].label.charAt(0).toUpperCase() + FREE_DIRECTIONS[i].label.slice(1),
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

export type SinaLogo = {
  source: "A" | "B" | "C"; name: string; style: LogoStyle; assetId: string | null; verdict: string; score: number | null; reason: string; best?: boolean; choosable?: boolean;
  /** « planche » : le nom dessiné en code de la planche de marque (secours du logo unique, exact à la lettre). */
  kind?: "planche";
};

/**
 * Motif du contrôle dit au client (tutoiement, sans renvoyer vers un bouton d'un autre écran) : « note 7,4/10, il
 * faut 7,5 » au lieu de « sous la barrière (7.4/10, attendu 7.5) — aucune nouvelle image sans votre accord (bouton…) ».
 */
/** Défauts du contrôle, dits au client en clair (essai réel : « défaut bloquant : artifacts »). */
export const CLIENT_DEFECTS: Record<string, string> = {
  artifacts: "des détails mal dessinés (formes ou lettres déformées)",
  amateur: "un rendu daté ou peu soigné",
  cliche: "un dessin trop banal",
  generic_concept: "une idée trop générique",
  forbidden: "un rendu que le Studio refuse",
  extra_text: "des mots en trop dans le logo",
  name_mismatch: "le nom mal écrit",
  text_mismatch: "un texte mal écrit",
  text_unreadable: "un texte illisible",
  resembles_known_brand: "une ressemblance avec une marque connue",
  unauthorized_person: "une personne dessinée",
  placeholder_shape: "une forme vide sans idée",
  duplicate: "un logo trop proche d'un autre",
  corrupt: "une image abîmée",
};

export function clientReason(reason: string): string {
  reason = reason.replace(/défaut (bloquant|rédhibitoire) : ([a-z_, ]+)/i, (_m, _k: string, codes: string) => `refusé par le contrôle : ${codes.split(/,\s*/).map((c) => CLIENT_DEFECTS[c.trim()] ?? c.trim().replace(/_/g, " ")).join(", ")}`);
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
  const used = new Set<string>();
  const out = run.territories.map((t, i) => {
    const mine = all.filter((r) => r.territory.id === t.id || r.territory.id === `${t.id}-relais` || r.territory.name === t.name).sort((a, b) => rank(b) - rank(a))[0];
    if (mine?.assetId) used.add(mine.assetId);
    return { source: (["A", "B", "C"] as const)[i] ?? "A", name: t.name, style: t.style, assetId: mine?.assetId ?? null, verdict: mine?.verdict ?? "ECHEC", score: mine?.score ?? null, reason: mine?.reason ? clientReason(mine.reason) : L("aucun dessin obtenu", "no drawing obtained"), ...(mine?.assetId && mine.assetId === run.best ? { best: true } : {}) } as SinaLogo;
  });
  // Règle du propriétaire : le client finit toujours avec au moins un logo. Une carte sans dessin présentable reçoit la
  // version de secours du Studio (audit du 10 novembre 2026 : elles n'étaient jamais montrées).
  const spares = run.studio.filter((r) => r.assetId && !used.has(r.assetId)).sort((a, b) => rank(b) - rank(a));
  for (const x of out) {
    if (x.assetId && x.verdict !== "ECHEC") continue;
    const spare = spares.shift();
    if (!spare?.assetId) continue;
    Object.assign(x, { assetId: spare.assetId, verdict: spare.verdict, score: spare.score ?? null, reason: L("version du Studio, faute de dessin validé", "Studio version") });
  }
  return out;
}

/** Le client peut-il choisir ce logo ? (validé, version du Studio, ou dessin complet sans défaut grave). */
export function logoChoosable(x: SinaLogo): boolean {
  if (!x.assetId) return false;
  if (x.verdict === "FINAL" || x.verdict === "PROVISIONAL") return true;
  try { const a = getAsset(x.assetId); return !!a && artworkChoosable(json<any>(a.meta as any, {})); } catch { return false; }
}

// ---------------------------------------------------------------- logo unique (décision du propriétaire du 12 novembre 2026)

/**
 * Identité choisie quand elle a une planche de marque (routes du 12 novembre 2026) : SINA dessine alors UN seul logo,
 * à partir de l'idée de la marque et du nom dessiné de la planche. null : identité d'avant (3 logos libres).
 */
export function chosenRoute(j: Journey): Route | null {
  const c = j.identityChoice, list = j.identities?.list;
  if (!c || !list?.some((x) => x.key === c.key)) return null;
  const x: Identity = mixIdentity(list, c.key, c.mix as never, c.edits ?? {});
  return isRoute(x) ? x : null;
}

const CASE_WORDS: Record<string, string> = { upper: "en capitales", lower: "en minuscules", title: "avec une capitale à chaque mot", asis: "écrit tel quel" };

/** Le nom dessiné de la planche (tracés du Studio, lettres exactes). */
export function plancheWordmark(x: Route): DrawnWordmark {
  return drawWordmark(x.name, safeWordmark(x.board.wordmark, x.name), x.fonts.heading);
}

/**
 * Demande du logo unique : l'idée de la marque, d'où vient le nom, ses signes, et le nom tel qu'il est déjà dessiné
 * sur la planche choisie par le client. Le dessinateur part de ce dessin et en fait un vrai logo.
 */
export function singleLogoPrompt(f: FreeLogoFacts, x: Route, wishes?: string, fix?: string): string {
  const b = x.board, w = safeWordmark(b.wordmark, x.name), clean = (s: string) => s.trim().replace(/\.+$/, "");
  const lines = w.lines?.length ? `sur ${w.lines.length} lignes (« ${w.lines.join(" / ")} »)` : "sur une seule ligne";
  const key = x.fonts.heading.replace(/_[ni]\d$/, "");
  return [
    `Crée le logo de la marque « ${f.name} ». Ce qu'elle fait : ${clean(f.activity)}.`,
    `L'idée de la marque : ${clean(b.idea.belief)}. Ce qu'elle combat : ${clean(b.idea.enemy)}.`,
    x.nameAnchor || x.nameExpression ? `D'où vient le nom : ${[x.nameAnchor, x.nameExpression].filter(Boolean).map(clean).join(" ; ")}.` : "",
    `Ses signes, à faire vivre dans le logo quand ils s'y prêtent : ${b.signs.map((s) => `${clean(s.title)} (${clean(s.text)})`).join(" ; ")}.`,
    `Le nom est déjà dessiné sur la planche que le client a choisie : ${lines}, ${CASE_WORDS[w.case] ?? "écrit tel quel"}, dans un caractère « ${FONT_CHARACTER[key] ?? "de titres"} » (proche de ${fontFamily(x.fonts.heading)})${w.dot ? ", avec un point final de couleur" : ""}. Pars de ce dessin : garde son esprit (la casse, la coupe des lignes, le caractère des lettres) et fais-en un vrai logo, avec UNE idée graphique tirée de l'idée de la marque (une lettre travaillée, un signe intégré au nom, une forme qui porte le nom).`,
    `Ton de la marque : ${x.tone.adjectives.join(", ")}.`,
    f.audience ? `Pour qui : ${clean(f.audience)}.` : "",
    `Couleurs de la marque, à utiliser librement : ${f.colors.join(", ")} (et le blanc).`,
    `Le seul texte du logo est le nom « ${f.name} », écrit exactement, lettre par lettre, avec ses accents. Aucun autre mot : ni slogan, ni phrase, ni ligne d'activité.`,
    `À éviter : un rendu daté (années 80 ou 90, clip-art) ; ${FORBIDDEN_LOGO_RENDERS.join(" ; ")}.`,
    wishes ? `Souhaits du client, avec ses mots : ${clean(wishes)}. Ils ne changent pas le texte du logo (le nom seul).` : "",
    fix ? `Correction pour cette nouvelle version : ${clean(fix)}.` : "",
    "Une seule proposition de logo dans l'image, jamais une planche de plusieurs versions ou déclinaisons.",
    "Logo seul, centré, sur un fond blanc uni, dessiné à plat : aucune maquette, aucune photo, aucune personne.",
  ].filter(Boolean).join("\n");
}

/** Le territoire unique du moteur : il ne dicte pas le dessin (la demande est singleLogoPrompt). */
export function singleTerritory(f: FreeLogoFacts, x: Route): TerritoryDraft {
  const base = freeTerritories(f)[1];
  return { ...base, name: L("Ton logo", "Your logo"), concept: `Logo tiré de l'idée de la marque « ${f.name} » : ${x.board.idea.belief}`, markType: x.board.wordmark.symbol ? "symbol_wordmark" : "wordmark", imageBrief: singleLogoPrompt(f, x) };
}

/** Couleurs du nom dessiné sur fond blanc : l'encre de la marque si elle se lit, l'accent pour le point ou le signe. */
function plancheColors(x: Route) {
  const ink = [x.palette.dark, x.palette.primary, "#1A1A1A"].find((c) => contrast(c, "#FFFFFF") >= 4.5) ?? "#1A1A1A";
  const accent = [x.palette.primary, x.palette.accent].find((c) => contrast(c, "#FFFFFF") >= 2 && c !== ink) ?? ink;
  return { main: ink, accent };
}

/**
 * Logo de secours : le nom dessiné en code de la planche, enregistré comme une proposition « version du Studio »
 * (choisissable, déclinable). Toujours exact à la lettre : le client finit toujours avec un logo.
 */
export async function savePlancheLogo(ctx: JobContext, who: { userId: string; projectId: string }, x: Route, territory: Territory): Promise<string> {
  const colors = plancheColors(x), drawn = plancheWordmark(x);
  const png = await wordmarkPng(drawn, colors, 1600);
  const family = canvasFamily(x.fonts.heading), w = safeWordmark(x.board.wordmark, x.name);
  const spec: LogoSpec = { name: x.name, family, weight: nearestWeight(family, 700), case: w.case, tracking: w.tracking, layout: "wordmark", emblem: "none", color: colors.main, accent: colors.accent, markFrame: false, ...(w.dot ? { dot: true } : {}) };
  const candidate: Candidate = { territoryId: territory.id, attempt: 0, spec, change: null, symbolSource: "artwork", artwork: { png, expected: { name: x.name, descriptor: null, tagline: null }, textBox: null, textCorrected: false, provider: "studio" } };
  const result: ProposalResult = { territory: { ...territory, markType: "wordmark" }, candidate, verdict: "PROVISIONAL", score: null, reason: L("nom dessiné par le Studio", "name drawn by the Studio"), codes: [], attempts: 0, checkId: null };
  return saveProposal(ctx, who.userId, who.projectId, result, { planche: true });
}

/** Le logo dessiné de la série à un seul logo (jamais la version de secours du moteur : la planche la remplace). */
export function singleLogoOfRun(run: EngineRun): SinaLogo | null {
  const rank = (r: ProposalResult) => (r.verdict === "FINAL" ? 300 : 0) + (r.score ?? 0) + (r.assetId === run.best ? 100 : 0);
  const mine = [...run.shown, ...run.discarded].filter((r) => r.assetId && r.candidate.artwork).sort((a, b) => rank(b) - rank(a))[0];
  if (!mine?.assetId) return null;
  return { source: "A", name: L("Ton logo", "Your logo"), style: mine.territory.style, assetId: mine.assetId, verdict: mine.verdict, score: mine.score ?? null, reason: mine.reason ? clientReason(mine.reason) : "" };
}

/** Devis du logo unique : une image et ses relectures (le même calcul que « Nouvelle version »). */
export function singleLogoQuote(): { maxMicro: number; probableMicro?: number } {
  const q = logoRedrawQuote();
  if (q) return { maxMicro: q.maxMicro, ...(q.probableMicro ? { probableMicro: q.probableMicro } : {}) };
  // Tarif du modèle de logos inconnu : le plafond de la série reste la borne sûre (rien n'est dépensé au-delà).
  return { maxMicro: logoSeriesQuote().maxMicro };
}

/** Coût maximal d'une proposition de 3 logos : la série du moteur (images, relectures). */
export function logosMaxMicro(): number {
  return logoSeriesQuote().maxMicro;
}
/** Coût probable d'une série (un essai, sans reprise) : c'est le devis montré au client, le plafond en plus. */
export function logosProbableMicro(): number | undefined {
  try { return logoSeriesQuote().probableMicro; } catch { return undefined; }
}

export const SINA_LOGOS_JOB = "syna.logos";

/** Tâche de fond : 3 logos libres dessinés et relus par le moteur V2 ; résultat rangé dans le parcours. */
export async function runSinaLogosJob(ctx: JobContext) {
  const { projectId, conversationId, capMicro, guidance } = z.object({ projectId: z.string(), conversationId: z.string(), capMicro: z.number().int().positive(), guidance: z.string().max(1500).optional() }).parse(ctx.payload);
  const p = loadProject(projectId);
  const j = journeyOf(conversationId);
  if (!p.brand || !j.identityChoice) throw new HttpError(409, L("L'identité de marque doit être choisie avant les logos (étape 1).", "Choose the brand identity first (step 1)."));
  const facts = freeLogoFacts(p.brand, j);
  const route = chosenRoute(j);
  if (route) return runSingleLogo(ctx, { projectId, conversationId, capMicro, guidance }, facts, route);
  const drafts = freeTerritories(facts);
  const base = logoDeps.ai ? logoDeps.ai(ctx, p.userId, projectId) : realLogoV2Ai(ctx, { userId: p.userId, projectId });
  const index = (t: { name: string }) => Math.max(0, drafts.findIndex((d) => d.name === t.name));
  const ai: LogoV2Ai = {
    ...base,
    territories: async () => drafts,
    // Dessin LIBRE : la demande courte de carte blanche, jamais la consigne structurée du moteur (style, composition…).
    drawArtwork: async (t, _brief, feedback) => {
      const prompt = freeLogoPrompt(facts, index(t), guidance, feedback);
      if (logoDeps.draw) return logoDeps.draw(prompt, t.id);
      return logoArtworkImage({ userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:sina-libre:${t.id}${feedback ? `:r${feedback.length}` : ""}` }, { prompt });
    },
  };
  const run = await runLogoEngineV2(ctx, projectId, { ai, territories: 3, capMicro: Math.max(1, capMicro - jobSpentMicro(ctx.job.id)), instructions: guidance });
  const logos = logosOfRun(run).map((x) => ({ ...x, choosable: logoChoosable(x) }));
  // Notes internes du moteur (modèle, relais, clé, tarif) : jamais montrées au client (essai réel : « dessiné par le
  // modèle principal faute de relais de secours »).
  const notes = run.notes.filter((n) => !/relais|cl[ée] |tarif|mod[eè]le principal|provider|fournisseur/i.test(n)).slice(0, 8);
  updateJourney(conversationId, (x) => {
    x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes };
    setStep(x, 2, "review");
  });
  return { logos, notes, stoppedByCostCap: run.stoppedByCostCap };
}

/**
 * Logo unique (décision du propriétaire du 12 novembre 2026) : UN logo dessiné pour l'identité choisie, à partir de
 * l'idée de la marque et du nom dessiné de sa planche ; relu par le contrôle avant d'être montré. S'il n'est pas
 * validé, ou si le dessin échoue, le nom dessiné en code de la planche est proposé en secours.
 */
async function runSingleLogo(ctx: JobContext, a: { projectId: string; conversationId: string; capMicro: number; guidance?: string }, facts: FreeLogoFacts, route: Route) {
  const p = loadProject(a.projectId);
  const draft = singleTerritory(facts, route);
  const base = logoDeps.ai ? logoDeps.ai(ctx, p.userId, a.projectId) : realLogoV2Ai(ctx, { userId: p.userId, projectId: a.projectId });
  const ai: LogoV2Ai = {
    ...base,
    territories: async () => [draft],
    drawArtwork: async (t, _brief, feedback) => {
      const prompt = singleLogoPrompt(facts, route, a.guidance, feedback);
      if (logoDeps.draw) return logoDeps.draw(prompt, t.id);
      return logoArtworkImage({ userId: p.userId, projectId: a.projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:sina-logo:${t.id}${feedback ? `:r${feedback.length}` : ""}` }, { prompt });
    },
  };
  const notes: string[] = [];
  let run: EngineRun | null = null;
  try {
    run = await runLogoEngineV2(ctx, a.projectId, { ai, territories: 1, capMicro: Math.max(1, a.capMicro - jobSpentMicro(ctx.job.id)), instructions: a.guidance });
  } catch (e) {
    // Arrêt demandé : on rend la main. Toute autre panne du dessin : le secours de la planche prend le relais, et c'est dit.
    if (e instanceof JobCancelled || e instanceof JobPaused || e instanceof LeaseLost) throw e;
    notes.push(L("Le dessin du logo n'a pas abouti : je te propose le nom dessiné de ta planche.", "The logo drawing failed: here is the name drawn on your board."));
  }
  const drawn = run ? singleLogoOfRun(run) : null;
  const logos: SinaLogo[] = drawn ? [{ ...drawn, choosable: logoChoosable(drawn) }] : [];
  if (!drawn || drawn.verdict !== "FINAL") {
    const territory: Territory = run?.territories[0] ?? ({ ...draft, id: "planche", style: "libre" } as Territory);
    const assetId = await savePlancheLogo(ctx, { userId: p.userId, projectId: a.projectId }, route, territory);
    logos.push({ source: drawn ? "B" : "A", name: L("Le nom dessiné de ta planche", "The name drawn on your board"), style: "libre", assetId, verdict: "PROVISIONAL", score: null, reason: L("dessiné par le Studio, exact à la lettre", "drawn by the Studio, letter-perfect"), choosable: true, kind: "planche" });
  }
  if (run) notes.push(...run.notes.filter((n) => !/relais|cl[ée] |tarif|mod[eè]le principal|provider|fournisseur|versions du studio/i.test(n)).slice(0, 6));
  updateJourney(a.conversationId, (x) => {
    x.logos = { list: logos, at: Date.now(), round: (x.logos?.round ?? 0) + 1, notes };
    setStep(x, 2, "review");
  });
  return { logos, notes, stoppedByCostCap: run?.stoppedByCostCap ?? false };
}
