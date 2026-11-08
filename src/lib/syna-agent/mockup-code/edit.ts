/**
 * Retouche LOCALISÉE d'une image de maquette (demande du propriétaire du 8 novembre, sur l'accueil téléphone de
 * Brindi : « pourquoi ça change tout le thème ? Je veux cette maquette avec le journal corrigé et sans le bouton tout
 * en haut ; on ne doit pas refaire les maquettes autant de fois, attention à modifier que les détails demandés »).
 *
 * 1) Un modèle de lecture rapide repère chaque zone demandée sur l'image (en % de la largeur et de la hauteur) et lit
 *    ses textes ; 2) seules ces zones sont repeintes par le modèle des maquettes (masque) ; 3) le Studio recolle ces
 *    seules zones sur l'image d'origine : tout le reste reste identique au pixel près.
 */
import sharp from "sharp";
import { z } from "zod";
import { jsonCallMaxMicro, type LlmCall } from "../../ai/llm";
import { CHECK_MODEL } from "./check";

export type EditChange = { zone: string; change: string };
export type Box = { left: number; top: number; right: number; bottom: number };

export const LocateSchema = z.object({
  zones: z.array(z.object({
    n: z.number().int().min(1).max(8),
    found: z.boolean(),
    /** Bords de la zone en pourcentage de la largeur (left, right) et de la hauteur (top, bottom) de l'image. */
    left: z.number().min(0).max(100), top: z.number().min(0).max(100), right: z.number().min(0).max(100), bottom: z.number().min(0).max(100),
    /** Textes lisibles dans la zone, mot pour mot. */
    texts: z.array(z.string().max(200)).max(20),
  })).max(8),
}).strict();
export type Locate = z.infer<typeof LocateSchema>;

const LOCATE_OUTPUT_TOKENS = 2000;
export function locateMaxMicro(): number {
  return jsonCallMaxMicro(CHECK_MODEL.provider, CHECK_MODEL.model, 6000, LOCATE_OUTPUT_TOKENS, LOCATE_OUTPUT_TOKENS, CHECK_MODEL.effort)?.maxMicro ?? 20_000;
}

export function locateCall(base: Pick<LlmCall, "userId" | "projectId" | "jobId" | "usageKey">, image: Buffer, changes: EditChange[]): LlmCall {
  return {
    ...base, task: "quality_control", promptKey: "syna-mockup-locate-1",
    system: "Tu repères des zones sur une image de maquette de site web, avec précision, et tu lis leurs textes mot pour mot. Tu réponds en JSON.",
    prompt: [
      "Pour chaque zone ci-dessous, donne le rectangle qui l'entoure ENTIÈREMENT (titre, cartes, boutons et fond de la partie compris, sans déborder sur les parties voisines), en pourcentage : left et right de la largeur de l'image, top et bottom de sa hauteur (0 = bord gauche ou haut, 100 = bord droit ou bas). Si la page est montrée en plusieurs bandes côte à côte, le rectangle reste dans la bande de la zone. found = false si la zone n'existe pas sur l'image.",
      ...changes.map((c, i) => `Zone ${i + 1} : ${c.zone}.`),
      "texts : les textes lisibles dans chaque zone, mot pour mot.",
    ].join("\n"),
    images: [{ data: image, label: "maquette" }],
    maxTokens: LOCATE_OUTPUT_TOKENS, maxOutputTokens: LOCATE_OUTPUT_TOKENS,
    routing: { difficulty: "standard", prefer: CHECK_MODEL },
  } as LlmCall;
}

/** Rectangles en pixels, élargis d'une petite marge (les bords repérés ne sont jamais exacts), dans l'image. */
export function boxesOf(l: Locate, count: number, w: number, h: number, margin = { x: 1, y: 0.6 }): (Box | null)[] {
  return Array.from({ length: count }, (_, i) => {
    const z = l.zones.find((x) => x.n === i + 1);
    if (!z || !z.found || z.right <= z.left || z.bottom <= z.top) return null;
    const px = (v: number, max: number) => Math.round(Math.min(max, Math.max(0, (v / 100) * max)));
    // Marge plus fine en hauteur (essai réel : 1,2 % mordait sur le logo au-dessus et sur le titre de la partie suivante).
    return { left: px(z.left - margin.x, w), right: px(z.right + margin.x, w), top: px(z.top - margin.y, h), bottom: px(z.bottom + margin.y, h) };
  });
}

/** Masque OpenAI : transparent = à repeindre (les zones), opaque ailleurs. */
export async function editMask(w: number, h: number, boxes: Box[]): Promise<Buffer> {
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) px[i * 4 + 3] = 255;
  for (const b of boxes) for (let y = b.top; y < b.bottom; y++) for (let x = b.left; x < b.right; x++) px[(y * w + x) * 4 + 3] = 0;
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Recolle SEULEMENT les zones retouchées sur l'image d'origine : le reste reste identique au pixel près. */
export async function pasteZones(original: Buffer, edited: Buffer, boxes: Box[]): Promise<Buffer> {
  const meta = await sharp(original).metadata();
  const w = meta.width!, h = meta.height!;
  const ed = await sharp(edited).resize(w, h, { fit: "fill" }).png().toBuffer();
  const parts = await Promise.all(boxes.map(async (b) => ({ input: await sharp(ed).extract({ left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top }).png().toBuffer(), left: b.left, top: b.top })));
  return sharp(original).composite(parts).png().toBuffer();
}

const norm = (t: string) => t.toLocaleLowerCase("fr-FR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
/** Textes lus dans une zone et présents mot pour mot dans les textes de la page (jamais une lecture approximative). */
export function exactTexts(read: string[], pageTexts: string[]): string[] {
  const all = pageTexts.map(norm);
  return read.map((t) => pageTexts[all.indexOf(norm(t))]).filter((t, i, a): t is string => !!t && a.indexOf(t) === i);
}

export function mockupEditPrompt(changes: EditChange[], keep: string[][], viewport: "desktop" | "phone"): string {
  return [
    `Retouche localisée d'une maquette de site web (version ${viewport === "phone" ? "téléphone" : "ordinateur"}). Seules les zones transparentes du masque sont repeintes ; tout le reste de l'image reste exactement identique.`,
    ...changes.map((c, i) => `Zone ${i + 1} (${c.zone}) : ${c.change}.${keep[i]?.length ? ` Textes de cette zone, écrits lettre pour lettre (sauf ceux que la modification retire) : ${keep[i].map((t) => `« ${t} »`).join(" ; ")}.` : ""}`),
    "Dans chaque zone repeinte, le même style que le reste de la page : mêmes couleurs, mêmes polices, mêmes tailles de texte, mêmes arrondis et ombres, mêmes photos quand elles restent. La zone se raccorde sans couture à ce qui l'entoure.",
    viewport === "phone" ? "Mise en page de téléphone : jamais trois éléments côte à côte ; boutons sur toute la largeur." : "",
    "Aucun autre texte, aucune lettre inventée, aucun logo en plus, aucune personne, aucune main.",
  ].filter(Boolean).join("\n");
}
