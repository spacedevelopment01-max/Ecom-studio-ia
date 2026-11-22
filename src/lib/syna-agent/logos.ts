/**
 * Le logo de la marque de SINA : une seule façon de faire. Le logo est créé par OpenAI avec les images de la planche
 * (`brand-images.ts`), relu, puis adopté comme logo de la marque par la fin de marque (`brand-finish.ts`). Ce fichier
 * garde ce qui sert à cette adoption : l'identité retenue par le client (`chosenRoute`), le rangement du logo de la
 * planche comme proposition du moteur de logos (`saveBoardLogo`) et, en secours quand aucun logo n'est validé, le nom
 * dessiné par le Studio, exact à la lettre (`savePlancheLogo`).
 *
 * Les trois logos libres, le logo redessiné et la tâche de fond « syna.logos » ont été retirés le 16 novembre 2026.
 */
import { contrast } from "../color";
import { L } from "../i18n-server";
import type { Brand } from "../project-types";
import type { JobContext } from "../jobs";
import type { TerritoryDraft } from "../logo-v2/territories";
import type { Candidate, LogoStyle, ProposalResult, Territory } from "../logo-v2/types";
import { nearestWeight } from "../logo-v2/territories";
import { canvasFamily } from "../media/fonts";
import type { LogoSpec } from "../media/logo";
import { FORBIDDEN_LOGO_RENDERS } from "../logo-v2/artwork";
import { saveProposal } from "../logo-v2/engine";
import type { Journey } from "./journey";
import type { Identity } from "./identities";
import { isRoute, safeWordmark, type Route } from "./brand-routes";
import { drawWordmark, wordmarkPng, type DrawnWordmark } from "./brand-wordmark";
import { mixIdentity } from "./tools/identity";

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

export type SinaLogo = {
  source: "A" | "B" | "C"; name: string; style: LogoStyle; assetId: string | null; verdict: string; score: number | null; reason: string; best?: boolean; choosable?: boolean;
  /**
   * « planche » : le nom dessiné en code de la planche de marque (secours du logo unique, exact à la lettre).
   * « image » : le logo créé avec les images de la planche choisie, déjà relu (repris tel quel, sans rien repayer).
   */
  kind?: "planche" | "image";
};

/** L'identité choisie par le client, avec sa planche de marque (mélange et retouches compris). null : rien de choisi. */
export function chosenRoute(j: Journey): Route | null {
  const c = j.identityChoice, list = j.identities?.list;
  if (!c || !list?.some((x) => x.key === c.key)) return null;
  const x: Identity = mixIdentity(list, c.key, c.mix as never, c.edits ?? {});
  if (!isRoute(x)) return null;
  // Les images de l'identité RETENUE (créées après le choix, mélange compris) priment sur celles de la planche proposée.
  return j.brandFinish?.images ? { ...x, board: { ...x.board, images: j.brandFinish.images } } : x;
}

/** Le nom dessiné de la planche (tracés du Studio, lettres exactes). */
export function plancheWordmark(x: Route): DrawnWordmark {
  // En lettres seules : aucun pictogramme dessiné en code, même sur une planche d'avant (audit du 22 novembre 2026, 2.12).
  return drawWordmark(x.name, safeWordmark({ ...x.board.wordmark, symbol: undefined }, x.name), x.fonts.heading);
}

/**
 * Le texte rangé avec le logo dans sa fiche du moteur de logos (`imageBrief`) : la marque, son idée, d'où vient son
 * nom, ses signes. Plus aucun dessin n'est commandé avec ce texte (le logo vient de la planche) ; il est gardé tel
 * quel pour que la fiche enregistrée ne change pas.
 */
function singleLogoPrompt(f: FreeLogoFacts, x: Route): string {
  const b = x.board, clean = (s: string) => s.trim().replace(/\.+$/, "");
  return [
    `Crée le logo de la marque « ${f.name} ». Ce qu'elle fait : ${clean(f.activity)}.`,
    `L'idée de la marque : ${clean(b.idea.belief)}. Ce qu'elle combat : ${clean(b.idea.enemy)}.`,
    x.nameAnchor || x.nameExpression ? `D'où vient le nom : ${[x.nameAnchor, x.nameExpression].filter(Boolean).map(clean).join(" ; ")}.` : "",
    `Ses signes, à faire vivre dans le logo quand ils s'y prêtent : ${b.signs.map((s) => `${clean(s.title)} (${clean(s.text)})`).join(" ; ")}.`,
    "Conçois-le toi-même à partir de cette marque, sans modèle : UNE idée graphique tirée de son idée et de son métier (une lettre travaillée, un signe intégré au nom, une forme qui porte le nom).",
    `Ton de la marque : ${x.tone.adjectives.join(", ")}.`,
    f.audience ? `Pour qui : ${clean(f.audience)}.` : "",
    `Couleurs de la marque, à utiliser librement : ${f.colors.join(", ")} (et le blanc).`,
    `Le seul texte du logo est le nom « ${f.name} », écrit exactement, lettre par lettre, avec ses accents. Aucun autre mot : ni slogan, ni phrase, ni ligne d'activité.`,
    `À éviter : un rendu daté (années 80 ou 90, clip-art) ; ${FORBIDDEN_LOGO_RENDERS.join(" ; ")}.`,
    "Une seule proposition de logo dans l'image, jamais une planche de plusieurs versions ou déclinaisons.",
    "Logo seul, centré, sur un fond blanc uni, dessiné à plat : aucune maquette, aucune photo, aucune personne.",
  ].filter(Boolean).join("\n");
}

/**
 * La fiche sous laquelle le moteur de logos range le logo de la marque : elle ne dicte aucun dessin (le logo existe
 * déjà, créé avec la planche).
 */
export function singleTerritory(f: FreeLogoFacts, x: Route): TerritoryDraft {
  const base: TerritoryDraft = {
    name: "Lettrage", concept: "", whyItFits: `Un logo beau et moderne pour ${f.activity.slice(0, 160)}.`,
    markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 3,
    typography: { style: "humanist_sans", weight: "regular", case: "title", tracking: "normal", rationale: "libre" },
    colorRole: { ink: "dark", accent: "primary", rationale: "couleurs de la marque" },
    symbolIdea: null, distinctive: "libre", avoid: [], style: "libre" as LogoStyle, descriptor: null,
    imageBrief: "", colors: f.colors.slice(0, 3),
  };
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

/** Range le logo de la planche comme proposition de logo (fond clair retiré depuis les bords, jamais de carré autour). */
export async function saveBoardLogo(ctx: JobContext, who: { userId: string; projectId: string }, x: Route, territory: Territory, png: Buffer): Promise<string> {
  const colors = plancheColors(x), family = canvasFamily(x.fonts.heading), w = safeWordmark(x.board.wordmark, x.name);
  const spec: LogoSpec = { name: x.name, family, weight: nearestWeight(family, 700), case: w.case, tracking: w.tracking, layout: "wordmark", emblem: "none", color: colors.main, accent: colors.accent, markFrame: false, ...(w.dot ? { dot: true } : {}) };
  const candidate: Candidate = { territoryId: territory.id, attempt: 0, spec, change: null, symbolSource: "artwork", artwork: { png, expected: { name: x.name, descriptor: null, tagline: null }, textBox: null, textCorrected: false, provider: "planche" } };
  const result: ProposalResult = { territory, candidate, verdict: "PROVISIONAL", score: null, reason: L("créé avec ta planche et relu : ton nom y est exact", "made with your board and reviewed: your name is exact"), codes: [], attempts: 0, checkId: null };
  return saveProposal(ctx, who.userId, who.projectId, result, { boardLogo: true });
}
