/**
 * Contrôle automatique d'une image de maquette créée (demande du propriétaire du 8 novembre : « corrige bien toutes ses
 * erreurs, elles ne doivent pas se reproduire »). Quatre essais réels de l'accueil en téléphone ont montré : la page
 * d'ordinateur dans un téléphone dessiné, puis des rangées de trois ou quatre éléments côte à côte ; SINA, en regardant
 * l'image, n'avait vu qu'une partie des défauts. Un modèle qui lit l'image partie par partie le relève, sans jamais
 * relancer de création payante : une image en défaut est dite ratée, le client décide.
 */
import { z } from "zod";
import { jsonCallMaxMicro, type LlmCall } from "../../ai/llm";
import type { MockupImage } from "./mockup-set";

/**
 * Modèle de lecture rapide (essai réel du 8 novembre : avec un plafond fixe de 0,04 $, le Studio refusait l'appel, son
 * pire cas comptant 8 000 jetons de sortie et une reprise ; ce pire cas vaut environ 0,18 € avec un modèle moyen,
 * environ 0,01 € avec celui-ci).
 */
export const CHECK_MODEL = { provider: "anthropic" as const, model: "claude-haiku-5-5", effort: "low" };
const CHECK_INPUT_TOKENS = 6000, CHECK_OUTPUT_TOKENS = 1500;
/** Plafond d'un contrôle, calculé comme le Studio le vérifie (pire cas, reprise comprise). */
export function checkMaxMicro(): number {
  return jsonCallMaxMicro(CHECK_MODEL.provider, CHECK_MODEL.model, CHECK_INPUT_TOKENS, CHECK_OUTPUT_TOKENS, CHECK_OUTPUT_TOKENS, CHECK_MODEL.effort)?.maxMicro ?? 20_000;
}

export const MockupCheckSchema = z.object({
  /** Un téléphone, un écran ou un appareil est dessiné autour de la page. */
  deviceFrame: z.boolean(),
  /** Des liens de menu sont écrits en haut de la page (au lieu d'une icône de menu à trois traits). */
  menuLinksAtTop: z.boolean(),
  /** Chaque partie de la page, de haut en bas, avec le plus grand nombre d'éléments posés côte à côte sur une rangée. */
  sections: z.array(z.object({ name: z.string().max(80), maxSideBySide: z.number().int().min(0).max(12) })).max(24),
  /** Personne, visage, main ou autre partie du corps visible. */
  people: z.boolean(),
  /** Rectangle noir, zone vide ou cassée au milieu de la page (essai réel : deux rectangles noirs jugés « sans défaut »). */
  brokenAreas: z.boolean(),
  /** Mots clairement abîmés, fausses lettres, textes visiblement en trop (vide si rien de net). */
  textProblems: z.array(z.string().max(200)).max(12),
}).strict();
export type MockupCheck = z.infer<typeof MockupCheckSchema>;

export const CHECK_SYSTEM = "Tu contrôles une image de maquette de site web avant qu'elle soit montrée à un client. Tu décris seulement ce que tu vois réellement, partie par partie, de haut en bas, sans rien supposer. Tu réponds en JSON.";

export function mockupCheckPrompt(img: Pick<MockupImage, "viewport" | "pages">, pageNames: string[]): string {
  const phone = img.viewport === "phone";
  return [
    `Image : maquette ${phone ? "en version téléphone (la page peut être montrée en plusieurs bandes étroites posées côte à côte : chaque bande est une suite de la même page, ce n'est pas une rangée d'éléments)" : "en version ordinateur"}, page(s) : ${pageNames.join(", ")}.`,
    "deviceFrame : true si un téléphone, une tablette, un écran ou tout appareil est dessiné autour de la page (coque, encoche, barre d'état).",
    `menuLinksAtTop : true si plusieurs liens de menu sont écrits dans l'en-tête en haut de la page${phone ? "" : " (normal en ordinateur, réponds quand même)"}.`,
    "sections : chaque partie de la page de haut en bas (nom court d'après son titre) et maxSideBySide, le plus grand nombre de cartes, photos ou blocs posés côte à côte sur une même rangée DANS cette partie (1 si tout est l'un sous l'autre).",
    "brokenAreas : true si un rectangle noir, une zone vide ou cassée apparaît au milieu de la page.",
    "people : true si une personne, un visage, une main ou une autre partie du corps est visible.",
    "textProblems : seulement les mots NETTEMENT abîmés ou mal orthographiés, les fausses lettres, les textes en double ; vide si rien de net (un texte trop petit pour être lu n'est pas un problème).",
  ].join("\n");
}

export function mockupCheckCall(base: Pick<LlmCall, "userId" | "projectId" | "jobId" | "usageKey">, image: Buffer, img: Pick<MockupImage, "viewport" | "pages">, pageNames: string[]): LlmCall {
  return { ...base, task: "quality_control", system: CHECK_SYSTEM, promptKey: "syna-mockup-check-1", prompt: mockupCheckPrompt(img, pageNames), images: [{ data: image, label: "maquette à contrôler" }], maxTokens: CHECK_OUTPUT_TOKENS, maxOutputTokens: CHECK_OUTPUT_TOKENS, routing: { difficulty: "standard", prefer: CHECK_MODEL } } as LlmCall;
}

/** Défauts (image ratée) et points à vérifier, en mots simples, d'après la lecture de l'image. */
export function mockupCheckVerdict(c: MockupCheck, viewport: MockupImage["viewport"]): { ok: boolean; problems: string[]; toVerify: string[] } {
  const problems: string[] = [];
  if (c.deviceFrame) problems.push("un appareil est dessiné autour de la page");
  if (c.people) problems.push("une personne ou une partie du corps est visible");
  if (c.brokenAreas) problems.push("une zone noire, vide ou cassée apparaît dans la page");
  if (viewport === "phone") {
    if (c.menuLinksAtTop) problems.push("les liens du menu sont écrits en haut au lieu de l'icône de menu");
    for (const s of c.sections) if (s.maxSideBySide >= 3) problems.push(`« ${s.name} » : ${s.maxSideBySide} éléments côte à côte (deux au plus en téléphone)`);
  }
  return { ok: problems.length === 0, problems, toVerify: c.textProblems };
}
