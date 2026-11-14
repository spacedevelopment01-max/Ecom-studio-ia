/**
 * Images qui FINISSENT une planche de marque (demande du propriétaire du 12 novembre 2026 : « faire intervenir OpenAI
 * pour générer les images qui viendront finir réellement les planches […] chaque logo des planches par OpenAI […] une
 * vraie direction artistique complète » ; puis : « les publications, si les gens voient ça ils peuvent se dire que le
 * studio n'est pas à la hauteur. Comme le téléphone avec le site »).
 *
 * Pour UNE planche : une direction artistique globale, puis six images créées par le modèle d'images du Studio
 * (OpenAI, la route des images de SINA) : le logo, la grande scène, l'objet avec le logo posé dessus, le haut du site sur téléphone, les trois
 * publications. Les petits signes restent dessinés par SINA.
 *
 * Le LOGO est conçu par OpenAI à partir de la marque elle-même (son idée, son métier, sa direction artistique), avec
 * carte blanche, sans modèle composé par le Studio (retour du propriétaire du 14 novembre 2026, sur l'essai réel de la
 * toiletteuse : « Pelage et Coussinet, le logo c'est la même conception que Pulpe ; on a dit les logos doivent être
 * faits par OpenAI et sur la base de la nouvelle marque » : le nom composé envoyé en modèle portait la vague de Pulpe,
 * et OpenAI la recopiait). Le nom composé par le Studio ne sert plus que de secours. Un logo gardé devient aussi la
 * marque en tête de planche et dans le haut du site (fond retiré par le Studio, version pour fond sombre comprise).
 *
 * Règles du propriétaire tenues ici :
 * - chaque image est RELUE avant d'être montrée ; une image fausse (nom mal écrit, texte en trop, personne, sujet
 *   coupé) n'est pas montrée : la planche garde le dessin de SINA à sa place, et c'est dit ;
 * - une image qui échoue n'est jamais relancée seule ; le plafond de dépense arrête tout, sans rien cacher ;
 * - les textes écrits dans une image viennent de la planche, lettre pour lettre, jamais du modèle ;
 * - aucune personne.
 */
import sharp from "sharp";
import { z } from "zod";
import type { JobContext } from "../jobs";
import { L } from "../i18n-server";
import { CostCapReached } from "../ai/trace";
import { run } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import { getJsonSetting } from "../settings";
import { BOARD_OBJECT_LABEL } from "./brand-board";
import type { ChainAi } from "./brand-chain";
import * as P from "./brand-prompts";
import { RouteSchema, type Route } from "./brand-routes";
import { cleanArtwork, onDarkVersion } from "../logo-v2/artwork";
import { normText } from "./identities";

export const IMAGE_SLOTS = ["logo", "hero", "object", "signs", "site", "post0", "post1", "post2"] as const;
/**
 * Images réellement créées. Le haut du site sur téléphone n'en fait plus partie (retour du propriétaire du 13 novembre
 * 2026 sur l'image créée par l'IA : « 3/10, ça doit être mieux fait et plus représentatif de ce que ça devrait
 * devenir ») : le Studio le rend lui-même, en vraie page, avec la grande image en ouverture (brand-boards.tsx,
 * PhoneSite). « site » reste un emplacement connu pour les planches faites avant.
 */
export const CREATED_SLOTS = IMAGE_SLOTS.filter((s) => s !== "site");
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export type ImageAspect = "1:1" | "16:9" | "9:16" | "4:5";
/** Format demandé pour chaque image (le modèle rend du carré, du paysage 3:2 ou du portrait 2:3). */
export const SLOT_ASPECT: Record<ImageSlot, ImageAspect> = { logo: "1:1", hero: "16:9", object: "1:1", signs: "1:1", site: "9:16", post0: "4:5", post1: "4:5", post2: "4:5" };
/** Images de référence envoyées avec chaque demande (le logo pour l'objet et le site ; aucun modèle pour le logo lui-même). */
export const SLOT_REFERENCES: Record<ImageSlot, number> = { logo: 0, hero: 0, object: 1, signs: 1, site: 2, post0: 0, post1: 0, post2: 0 };

/**
 * Réglage `sina.brand_images` : « dessins » (par défaut : la planche garde les dessins de SINA) ou « openai » (les
 * six images sont créées). Reste sur « dessins » tant que le propriétaire n'a pas validé un essai réel.
 */
export const brandImagesOn = (): boolean => getJsonSetting<string>("sina.brand_images", "dessins") === "openai";
/** Route des images de SINA (la même que les photos du thème sur mesure : réglage `syna.mockup.image_route`). */
export function boardImageRoute(): { provider: string; model: string } {
  const [provider, model] = getJsonSetting<string>("syna.mockup.image_route", "openai:gpt-image-2.6-flare").split(":");
  return { provider, model };
}

export const ImagerySchema = z.object({
  look: z.string().max(900).default(""),
  logo: z.string().min(1).max(1600), hero: z.string().min(1).max(2200), object: z.string().min(1).max(2200), site: z.string().max(2200).default(""),
  /** Les signes de la marque posés sur de vrais objets de son monde (remplace les pictogrammes dessinés en code). */
  signs: z.string().max(2200).default(""),
  posts: z.array(z.string().min(1).max(2200)).length(3),
});
export type Imagery = z.infer<typeof ImagerySchema>;
export const ImageReviewSchema = z.object({
  // defect : la nature du défaut d'une image refusée. Seul « texte » peut être contredit par la lecture elle-même ;
  // un défaut non précisé vaut « autre » (l'image reste refusée : c'est le côté sûr).
  images: z.array(z.object({ slot: z.string().max(12), ok: z.boolean(), read: z.array(z.string().max(400)).max(14).default([]), why: z.string().max(260).default(""), defect: z.enum(["texte", "personne", "coupe", "abime", "autre"]).default("autre") })).max(8).default([]),
});
/** Seconde lecture d'une image dont le jugement contredit la lecture : seulement recopier, sans juger. */
export const ImageRereadSchema = z.object({ images: z.array(z.object({ slot: z.string().max(12), read: z.array(z.string().max(400)).max(14).default([]) })).max(8).default([]) });

/** Même texte, à la casse, aux espaces, au type d'apostrophe et au point final près ; jamais aux lettres ni aux accents. */
const plain = (t: string) => t.normalize("NFC").replace(/[’ʼ`´]/g, "'").replace(/[«»“”"]/g, " ").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "").toLowerCase();

/**
 * Le Studio compare lui-même ce que le relecteur a LU avec ce que l'image devait porter (essai réel du 13 novembre
 * 2026 : il avait recopié « Ça a le goût de mordre dedans. » sans une faute, puis refusé l'image pour « dedans mal
 * écrit » ; deux bonnes publications perdues). missing : texte attendu qu'on ne retrouve pas tel quel dans la lecture ;
 * extra : texte lu que personne n'avait demandé (le nom de la marque, lui, est toujours permis).
 */
export function textCheck(expected: string[], read: string[], name: string): { missing: string[]; extra: string[] } {
  const want = expected.map(plain).filter(Boolean), got = read.map(plain).filter(Boolean), all = got.join(" ");
  const missing = expected.filter((t) => { const p = plain(t); return !!p && !got.includes(p) && !all.includes(p); });
  // Un bloc lu peut réunir plusieurs textes attendus : ce qu'il en reste une fois ces textes retirés est en trop.
  const known = [...want, plain(name)].filter(Boolean).sort((a, b) => b.length - a.length);
  const extra = read.filter((t) => { let p = plain(t); if (!p) return false; for (const w of known) p = p.split(w).join(" "); return /[\p{L}\p{N}]/u.test(p); });
  return { missing, extra };
}

const same = (a: string, b: string) => normText(a) === normText(b);
/** Les textes que chaque image doit porter, lettre pour lettre (ils viennent de la planche, jamais du modèle). */
export function slotTexts(x: Route): Record<ImageSlot, string[]> {
  const b = x.board, front = b.object.front.filter((l) => !same(l, x.name)).slice(0, 2);
  return {
    logo: [x.name], hero: [], object: [x.name, ...front], signs: [], site: [x.name, b.site.headline, b.site.text, b.site.button],
    post0: [b.posts[0].text], post1: [b.posts[1].text], post2: [b.posts[2].text],
  };
}

const NO_PERSON = "Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.";
/**
 * Aucune autre marque que celle du client (essai réel du 14 novembre 2026 : le camion de « Pelage » portait le losange
 * d'un vrai constructeur) : véhicule, appareil, emballage sans logo ni nom de fabricant.
 */
const NO_OTHER_BRAND = "Aucune autre marque que celle-ci : un véhicule, un appareil ou un objet du quotidien ne porte aucun logo, aucun emblème ni aucun nom de constructeur ou de fabricant (calandre, jantes, hayon lisses).";
const NO_TEXT = "Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.";
/**
 * Les signes de la marque en vraie photo (retour du propriétaire du 14 novembre 2026 sur les planches de la
 * toiletteuse : « Tu me ressors encore des vieux pictogrammes dégueulasses ») : jamais une icône plate.
 */
/** Sans logo gardé, le modèle en inventait un (une patte sur le camion de « Pelage », essai réel du 14 novembre 2026). */
export const NO_INVENTED_MARK = "Aucun logo ni symbole inventé : le nom est écrit seul, en lettres simples, sans patte, sans silhouette, sans dessin ni pictogramme à côté.";
export const SIGNS_LINE = "Une vraie photographie haut de gamme, comme dans le livre d'identité d'une grande agence : les signes de la marque sont appliqués sur de vrais objets de son monde, en vraies matières (impression, broderie, gravure, peinture, sérigraphie). Jamais une icône plate, jamais un pictogramme, jamais une grille de cases ni un nuancier dessiné.";
/** Le nom épelé (« P, e, l, a, g, e ») : sans modèle d'image, c'est ce qui tient les lettres exactes. */
export const spell = (name: string) => [...name.normalize("NFC")].map((c) => (c === " " ? "(espace)" : c)).join(", ");
/**
 * Gestes de logo déjà pris par des marques faites avec le Studio : jamais redonnés (la vague qui coupe le nom, à moitié
 * dans l'eau, est celle de « Pulpe », validée par le propriétaire le 13 novembre 2026).
 */
/**
 * Un logo, pas une illustration (essai réel du 14 novembre 2026 : « Pelage » est revenu en scène dessinée, une
 * toiletteuse à genoux près de son camion, alors que la consigne disait « aucune personne »).
 */
export const LOGO_NOT_SCENE = "Un LOGO, pas une illustration ni une scène : le nom, et au plus UN signe simple et fort (un seul objet ou une seule forme), lisible en tout petit comme un tampon. Aucune personne, aucun personnage, aucune silhouette humaine, aucune main ; aucune scène avec un décor, un véhicule garé ou une maison.";
export const LOGO_OWN = "Une conception propre à cette marque, tirée de son idée et de son métier, jamais une recette : pas de nom coupé ou barré par une ligne ondulée, pas de nom à moitié plongé dans l'eau ou dans l'ombre (c'est le logo d'une autre marque).";
const exact = (texts: string[]) => `Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : ${texts.map((t) => `« ${t} »`).join(" ; ")}. Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.`;
const paletteLine = (x: Route) => `Couleurs de la marque : foncé ${x.palette.dark}, couleur de marque ${x.palette.primary}, surface ${x.palette.secondary}, accent ${x.palette.accent}, clair ${x.palette.light}.`;

/** Consigne complète d'une image : la direction globale, la consigne de la directrice artistique, les lignes fixes du Studio. */
export function imagePrompt(slot: ImageSlot, x: Route, imagery: Imagery, o: { logo: boolean } = { logo: true }): string {
  const look = imagery.look.trim(), texts = slotTexts(x)[slot];
  if (slot === "logo") {
    // Carte blanche, sans modèle : le logo naît de la marque (jamais d'une composition du Studio qu'il recopierait).
    // Fond blanc : il se retire ensuite depuis les bords (jamais de carré autour).
    return [
      `Logo de la marque « ${x.name} ». Tu le conçois toi-même, comme le meilleur créateur de logos le ferait pour CETTE marque : la forme, le dessin des lettres et le signe éventuel sont à toi.`,
      `Le nom s'écrit exactement « ${x.name} », lettre par lettre : ${spell(x.name)}. Aucune lettre ajoutée, retirée ni changée, accents compris.`,
      imagery.logo.trim(), look ? `Direction artistique de la marque : ${look}` : "", paletteLine(x),
      LOGO_OWN, LOGO_NOT_SCENE,
      "Un seul logo, centré, à plat, net et lisible d'un coup d'œil, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour ; ses couleurs se lisent bien sur du blanc. Aucun fond noir ni coloré, aucun dégradé, aucune lueur, aucun relief. Aucun autre texte que le nom, aucune maquette, aucun objet autour, aucun cadre, aucune ombre portée, aucune personne.",
    ].filter(Boolean).join("\n");
  }
  const brief = slot === "hero" ? imagery.hero : slot === "object" ? imagery.object : slot === "signs" ? imagery.signs : slot === "site" ? imagery.site : imagery.posts[Number(slot.slice(4))];
  const withLogo = (slot === "object" || slot === "site" || slot === "signs") && o.logo;
  // Le nom est porté par le logo fourni ; sans logo, il est écrit comme les autres textes.
  const written = slot === "hero" ? [] : texts.filter((t) => !withLogo || !same(t, x.name)).filter((t, i) => slot === "object" || slot === "site" || i === 0);
  return [
    look ? `Direction artistique : ${look}` : "", brief.trim(), paletteLine(x),
    withLogo ? "Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change." : "",
    slot === "site" ? "Montre seulement l'écran, bord à bord, en portrait : ni téléphone, ni cadre, ni main, ni fond autour." : "",
    slot.startsWith("post") ? "Visuel de publication pour un réseau social, en portrait, bord à bord : aucun cadre d'application, aucun bouton, aucun pseudonyme." : "",
    slot === "signs" ? SIGNS_LINE : "",
    (slot === "object" || slot === "site") && !withLogo ? NO_INVENTED_MARK : "",
    slot === "signs" ? (withLogo ? "Aucun autre texte que le logo : aucune lettre, aucun chiffre, aucun mot, aucun filigrane." : NO_TEXT) : written.length ? exact(written) : NO_TEXT, NO_PERSON, NO_OTHER_BRAND,
  ].filter(Boolean).join("\n");
}

/** Ce que la directrice artistique des images reçoit d'une route. */
const imageryBrief = (x: Route) => [
  `Nom : ${x.name}`, `Signature : ${x.slogan}`, `Promesse : ${x.promise}`, `Territoire : ${x.territory}`,
  `Ce que croit la marque : ${x.board.idea.belief}`, `Elle se bat contre : ${x.board.idea.enemy}`, `La preuve, dans l'objet : ${x.board.idea.proof}`,
  `Fond de page : ${x.ground}${x.gradient ? ` (${x.gradient.from} → ${x.gradient.to})` : ""}`, paletteLine(x),
  // Le signe « lettrage » décrit le nom composé par le Studio (sur les planches d'avant le 14 novembre 2026, la vague de
  // « Pulpe ») : il n'est jamais donné pour concevoir le logo, qui naît de la marque elle-même.
  "Signes de la marque (hors lettrage : le logo ne reprend rien du nom composé par le Studio) :", ...x.board.signs.filter((g) => g.kind !== "lettrage").map((g) => `  - ${g.title} — ${g.text}`),
  `Objet : ${BOARD_OBJECT_LABEL[x.board.object.kind].fr.toLowerCase()} ; écrit devant : ${x.board.object.front.join(" · ")}`,
  `Site (haut de l'accueil) : titre « ${x.board.site.headline} » ; texte « ${x.board.site.text} » ; bouton « ${x.board.site.button} »`,
  "Publications (dans l'ordre) :", ...x.board.posts.map((q, i) => `  ${i + 1}. « ${q.text} »`),
].join("\n");

const SLOT_LABEL: Record<ImageSlot, { fr: string; en: string }> = {
  logo: { fr: "le logo", en: "the logo" }, hero: { fr: "la grande image", en: "the main image" }, object: { fr: "l'image de l'objet", en: "the object image" }, signs: { fr: "l'image des signes", en: "the signs image" }, site: { fr: "l'image du site", en: "the site image" },
  post0: { fr: "la première publication", en: "the first post" }, post1: { fr: "la deuxième publication", en: "the second post" }, post2: { fr: "la troisième publication", en: "the third post" },
};
const ROLE_FOR_REVIEW: Record<ImageSlot, string> = {
  logo: "le logo de la marque", hero: "la grande image de la marque (aucun texte attendu)", object: "l'objet de la marque, avec le logo posé dessus", signs: "les signes de la marque posés sur de vrais objets de son monde, le logo fourni compris (aucun autre texte attendu ; une icône plate ou un pictogramme est un défaut)", site: "le haut de la page d'accueil, sur téléphone",
  post0: "une publication", post1: "une publication", post2: "une publication",
};

type Made = { id: string; w: number; h: number };
/** Ce que le client voit à la place d'une image non gardée (dit tel quel, jamais un dessin qui n'existe pas). */
const instead = (x: Route, slot: ImageSlot): string => slot === "signs" ? "les signes restent décrits en mots, sans dessin" : hasDrawing(x, slot) ? "tu vois mon dessin à la place" : "sa place garde la forme simple de la planche";
/** Reste-t-il un dessin de SINA à cette place (l'illustratrice l'a rendu, et sa relecture en image ne l'a pas retiré) ? */
const hasDrawing = (x: Route, slot: ImageSlot): boolean => {
  const b = x.board as { hero?: unknown; object: { art?: unknown }; site: { art?: unknown }; posts: { art?: unknown }[] };
  return slot === "signs" ? false : slot === "hero" ? !!b.hero : slot === "object" ? !!b.object.art : slot === "site" ? !!b.site.art : slot === "logo" ? true : !!b.posts[Number(slot.slice(4))]?.art;
};
export type BoardImagesResult = { route: Route; made: number; rejected: number; notes: string[]; issues: string[] };

/** Un logo à fond transparent posé sur du blanc, pour qu'un relecteur le voie comme le client le verra. */
export const onWhite = (png: Buffer): Promise<Buffer> => sharp(png).flatten({ background: "#FFFFFF" }).png().toBuffer().catch(() => png);

/**
 * Contrôle gratuit, sans IA : le logo est-il sur un fond blanc net jusqu'aux bords ? (essai réel du 14 novembre 2026 :
 * le logo de « Coussinet » est sorti noir, flou et lumineux, illisible, et le relecteur l'avait gardé.) On regarde une
 * bande le long des quatre bords : au moins 92 % de pixels presque blancs.
 */
export async function logoOnWhite(png: Buffer): Promise<boolean> {
  try {
    // Un fond transparent compte comme blanc (essai réel du 14 novembre 2026 : OpenAI a rendu les logos sur fond
    // transparent, que le contrôle lisait comme du noir).
    const { data, info } = await sharp(png).flatten({ background: "#FFFFFF" }).resize(256, 256, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height, c = info.channels, band = Math.max(3, Math.round(w * 0.04));
    let white = 0, all = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * c, r = data[i], g = data[i + 1], b = data[i + 2];
      all++; if (Math.min(r, g, b) >= 228 && Math.max(r, g, b) - Math.min(r, g, b) <= 24) white++;
    }
    return all > 0 && white / all >= 0.92;
  } catch { return false; }
}

/**
 * Crée, relit et pose les images d'UNE planche. Rend la route avec `board.images` (seulement les images acceptées),
 * les notes de la chaîne, et ce qui est dit au client pour chaque image non gardée.
 */
export async function runBoardImages(o: {
  ctx: JobContext; ai: ChainAi; who: { userId: string; projectId: string }; brief: string; kind: "produits" | "services"; route: Route; round: number;
  /** Seulement ces images (les autres images déjà gardées restent telles quelles) ; par défaut, toutes. */
  slots?: ImageSlot[];
  /** Idées de logo des AUTRES planches de la série : le logo de celle-ci doit être une conception nettement différente. */
  otherLogos?: string[];
}): Promise<BoardImagesResult> {
  const { ctx, ai, route: x, round } = o, key = x.key, notes: string[] = [], issues: string[] = [];
  const wanted = new Set<ImageSlot>(o.slots?.length ? o.slots : CREATED_SLOTS);
  // Un nouvel essai d'une partie des images a sa propre étape (jamais la réponse en cache du premier essai).
  const pass = o.slots?.length ? `:${[...wanted].join("+")}` : "";
  const tag = (line: string) => L(`Identité ${key} : ${line}`, `Identity ${key}: ${line}`);
  const others = (o.otherLogos ?? []).map((t) => t.trim()).filter(Boolean);
  const othersBlock = others.length ? `\n\n# Logos déjà prévus pour les AUTRES propositions de cette série\n${others.map((t, i) => `${i + 1}. ${t.slice(0, 500)}`).join("\n")}\nLe logo de cette proposition est une conception NETTEMENT différente de ceux-là : autre forme, autre dessin de lettre, autre idée.` : "";
  const imagery = await ctx.step(`brand:imagery:${round}:${key}${pass}`, () => ai.ask(`imagery-${round}-${key}${pass}`, { kind: "imagery", system: P.imagerySystem(o.kind), schema: ImagerySchema, prompt: `${o.brief}\n\n# La route à mettre en images\n${imageryBrief(x)}${othersBlock}` }));

  const made = new Map<ImageSlot, Made>();
  const bufferOf = (slot: ImageSlot): Buffer | null => { const m = made.get(slot), a = m ? getAsset(m.id) : undefined; return a ? assetData(a) : null; };
  let capped = false;
  const make = async (slot: ImageSlot, refs: { logo?: Buffer | null; scene?: Buffer | null }, prompt: string) => {
    if (capped) return;
    try {
      made.set(slot, await ctx.step(`brand:image:${round}:${key}:${slot}${pass}`, async (): Promise<Made> => {
        const data = await ai.draw(`image-${round}-${key}-${slot}${pass}`, { prompt, aspect: SLOT_ASPECT[slot], logo: refs.logo ?? null, scene: refs.scene ?? null });
        const png = await sharp(data).png().toBuffer(), meta = await sharp(png).metadata();
        const asset = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "review", meta: { synaBoard: { key, slot, round, name: x.name } } });
        return { id: asset.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      }));
    } catch (e) {
      if (e instanceof CostCapReached) { capped = true; notes.push(`plafond de dépense atteint pendant les images de ${key}`); return; }
      // Une image qui échoue n'est jamais relancée seule : la planche garde le dessin de SINA à cette place.
      notes.push(`${SLOT_LABEL[slot].fr} de ${key} non créé(e) : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      issues.push(tag(L(`je n'ai pas pu créer ${SLOT_LABEL[slot].fr} ; ${instead(x, slot)}.`, `I could not create ${SLOT_LABEL[slot].en}; ${slot === "signs" ? "the signs stay described in words" : "you see my drawing instead"}.`)));
    }
  };

  // Dans la bibliothèque du client : une image attend sa relecture (« review »), puis elle est gardée (« ready ») ou
  // refusée (« rejected », avec la raison) : une image ratée n'y est jamais rangée comme une bonne image.
  const mark = (id: string, status: "ready" | "rejected", why = "") => run("UPDATE assets SET status=?, meta=json_set(meta,'$.synaBoard.review',json(?)) WHERE id=? AND project_id=?", status, JSON.stringify({ status, why: why.slice(0, 240) }), id, o.who.projectId);
  let rejected = 0;

  // 1. Le logo : conçu par OpenAI à partir de la marque, sans modèle. Contrôle gratuit du fond blanc avant toute
  // relecture : un logo sur fond noir ou coloré n'est ni gardé ni posé sur l'objet.
  if (wanted.has("logo")) {
    ctx.progress(0.96, L(`Je dessine le logo de la planche ${key}`, `Drawing the logo of board ${key}`));
    await make("logo", {}, imagePrompt("logo", x, imagery));
    const drawn = bufferOf("logo");
    if (drawn && !(await logoOnWhite(drawn))) {
      const why = L("il n'est pas sur un fond blanc net : il ne se lirait pas sur tes supports", "it is not on a clean white background");
      mark(made.get("logo")!.id, "rejected", why); made.delete("logo"); rejected++;
      notes.push(`logo de ${key} refusé par le contrôle du fond (sans IA)`);
      issues.push(tag(L(`je n'ai pas gardé le logo (${why}) ; tu vois mon nom dessiné à la place.`, `I did not keep the logo (${why}); you see my drawn name instead.`)));
    }
  }
  // Le logo à poser sur l'objet : celui qui vient d'être créé, sinon celui déjà gardé sur la planche.
  const kept = x.board.images?.logo, keptBuffer = () => { const a = kept ? getAsset(kept.id) : undefined; return a ? assetData(a) : null; };
  const logo = bufferOf("logo") ?? (wanted.has("logo") ? null : keptBuffer());
  // 2. La grande scène, puis ce qui porte le logo, puis les publications.
  ctx.progress(0.965, L(`Je crée les images de la planche ${key}`, `Creating the images of board ${key}`));
  if (wanted.has("hero")) await make("hero", {}, imagePrompt("hero", x, imagery));
  // Reprise d'une partie des images : l'objet et les signes portent le logo de la planche ; sans logo gardé, ils ne
  // sont pas refaits (retour du propriétaire du 14 novembre 2026 : « les logos ne sont pas les mêmes entre le logo et
  // sur le camion » : sans logo fourni, OpenAI en inventait un autre). Rien n'est payé pour une image fausse d'avance.
  const skipCarriers = !!o.slots?.length && !logo;
  if (skipCarriers) for (const slot of ["object", "signs"] as const) if (wanted.has(slot)) {
    notes.push(`${SLOT_LABEL[slot].fr} de ${key} non refait(e) : aucun logo gardé à poser dessus`);
    issues.push(tag(L(`je n'ai pas refait ${SLOT_LABEL[slot].fr} : sans logo gardé, il porterait un autre logo que le tien.`, `I did not redo ${SLOT_LABEL[slot].en}: without a kept logo it would carry a different one.`)));
  }
  if (wanted.has("object") && !skipCarriers) await make("object", { logo }, imagePrompt("object", x, imagery, { logo: !!logo }));
  if (wanted.has("signs") && !skipCarriers && imagery.signs.trim()) await make("signs", { logo }, imagePrompt("signs", x, imagery, { logo: !!logo }));
  for (const slot of ["post0", "post1", "post2"] as const) if (wanted.has(slot)) await make(slot, {}, imagePrompt(slot, x, imagery));

  // 3. La relecture : aucune image n'est montrée sans avoir été regardée.
  const slots = IMAGE_SLOTS.filter((s) => made.has(s));
  if (slots.length) {
    const texts = slotTexts(x);
    const drop = (slot: ImageSlot, why: string) => { mark(made.get(slot)!.id, "rejected", why); made.delete(slot); rejected++; issues.push(tag(L(`je n'ai pas gardé ${SLOT_LABEL[slot].fr} (${why.replace(/\.+$/, "")}) ; ${instead(x, slot)}.`, `I did not keep ${SLOT_LABEL[slot].en} (${why}); ${hasDrawing(x, slot) ? "you see my drawing instead" : "its place keeps the plain shape of the board"}.`))); };
    // Raison écrite par le Studio d'après la lecture (jamais une phrase confuse du relecteur montrée au client).
    const textReason = (c: { missing: string[]; extra: string[] }) => c.extra.length ? L(`un texte non demandé y apparaît : « ${c.extra[0].slice(0, 60)} »`, `an unrequested text appears: "${c.extra[0].slice(0, 60)}"`) : L(`le texte « ${c.missing[0].slice(0, 60)} » n'y est pas écrit exactement`, `the text "${c.missing[0].slice(0, 60)}" is not written exactly`);
    // Relecture impossible (plafond, appel en échec) : des images non relues ne sont jamais montrées.
    const unreviewed = () => {
      for (const s of slots) { const m = made.get(s); if (m) mark(m.id, "rejected", "non relue"); made.delete(s); }
      rejected += slots.length;
      issues.push(tag(L("je n'ai pas pu relire ses images, donc je ne te les montre pas ; tu vois mes dessins à la place.", "I could not review its images, so I am not showing them; you see my drawings instead.")));
    };
    // Un logo à fond transparent est montré au relecteur posé sur du blanc, comme le client le verra.
    const seen = await Promise.all(slots.map(async (s) => ({ data: s === "logo" ? await onWhite(bufferOf(s)!) : bufferOf(s)!, label: s })));
    if (capped) unreviewed();
    else try {
      const review = await ctx.step(`brand:imagecheck:${round}:${key}${pass}`, () => ai.look(`imagecheck-${round}-${key}${pass}`, {
        system: P.imageReviewSystem(), schema: ImageReviewSchema,
        prompt: [`Marque : « ${x.name} ».${x.board.descriptor ? ` Métier : ${x.board.descriptor}.` : ""} Voici ${slots.length} image(s), dans l'ordre.`, ...slots.map((s, i) => `Image ${i + 1} — slot "${s}" : ${(s === "object" || s === "signs") && !logo ? "l'objet ou les signes de la marque SANS logo fourni : le nom seul en lettres simples ; un logo, une patte, une silhouette ou un symbole inventés sont un défaut (defect « autre »)" : ROLE_FOR_REVIEW[s]}. Textes attendus : ${texts[s].length ? texts[s].map((t) => `« ${t} »`).join(" ; ") : "aucun"}.`)].join("\n"),
        images: seen,
      }));
      // Le Studio compare la lecture du relecteur aux textes attendus. Quand son jugement et sa propre lecture se
      // contredisent (refus « texte » alors qu'il a tout recopié sans faute, ou accord alors qu'il a lu un texte en
      // trop), l'image est RELUE une seconde fois, seulement recopiée, et c'est la comparaison du Studio qui tranche.
      const doubt: ImageSlot[] = [];
      for (const s of slots) {
        const v = review.images.find((r) => r.slot === s);
        if (!v) { drop(s, L("elle n'a pas pu être relue", "it could not be reviewed")); continue; }
        const c = textCheck(texts[s], v.read, x.name), exact = !c.missing.length && !c.extra.length;
        if (!v.ok) {
          if (v.defect === "texte" && exact) doubt.push(s);
          else drop(s, v.defect === "texte" && (c.missing.length || c.extra.length) && v.read.length ? textReason(c) : v.why || L("elle ne passe pas ma relecture", "it does not pass my review"));
          continue;
        }
        // Contrôle du Studio, en plus du jugement : le logo doit porter le nom, lu tel quel.
        if (s === "logo" && !normText(v.read.join(" ")).includes(normText(x.name))) { drop(s, L("le nom n'y est pas écrit exactement", "the name is not written exactly")); continue; }
        if (c.extra.length) doubt.push(s);
      }
      if (doubt.length) {
        let second: z.infer<typeof ImageRereadSchema> | null = null;
        try {
          second = await ctx.step(`brand:imagereread:${round}:${key}${pass}`, () => ai.look(`imagereread-${round}-${key}${pass}`, {
            system: P.imageRereadSystem(), schema: ImageRereadSchema,
            prompt: [`Voici ${doubt.length} image(s), dans l'ordre.`, ...doubt.map((s, i) => `Image ${i + 1} — slot "${s}".`)].join("\n"),
            images: doubt.map((s) => ({ data: bufferOf(s)!, label: s })),
          }));
        } catch (e) { if (e instanceof CostCapReached) capped = true; else notes.push(`seconde lecture des images de ${key} impossible : ${String((e as Error)?.message ?? e).slice(0, 140)}`); }
        for (const s of doubt) {
          const r = second?.images.find((y) => y.slot === s);
          // Jamais montrée sans vérification : pas de seconde lecture, pas d'image.
          if (!r) { drop(s, L("je n'ai pas pu la vérifier une seconde fois", "I could not verify it a second time")); continue; }
          const c = textCheck(texts[s], r.read, x.name);
          if (c.missing.length || c.extra.length) drop(s, textReason(c));
          else notes.push(`${SLOT_LABEL[s].fr} de ${key} : jugement et lecture se contredisaient ; gardé(e) après une seconde lecture, texte exact`);
        }
      }
    } catch (e) {
      if (e instanceof CostCapReached) capped = true;
      else notes.push(`relecture des images de ${key} impossible : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      unreviewed();
    }
  }

  for (const m of made.values()) mark(m.id, "ready");

  // 4. Le logo gardé devient la marque de la planche (en tête, dans le haut du site) : fond retiré par le Studio,
  // et une version pour fond sombre. Gratuit, sans IA ; en cas d'échec, le nom dessiné reste à sa place.
  let marks: { mark?: Made; markDark?: Made } = {};
  const logoMade = made.get("logo"), logoPng = bufferOf("logo");
  if (logoMade && logoPng) {
    try {
      const save = async (png: Buffer, slot: "mark" | "markDark"): Promise<Made> => {
        const meta = await sharp(png).metadata();
        const a = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key, slot, round, name: x.name, from: logoMade.id } } });
        return { id: a.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      };
      const clear = await cleanArtwork(logoPng);
      marks = { mark: await save(clear, "mark"), markDark: await save(await onDarkVersion(clear), "markDark") };
    } catch (e) { notes.push(`logo de ${key} gardé, mais sans version détourée : ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
  }

  // Les images gardées d'avant restent quand seule une partie est refaite ; une image refaite et refusée ne garde
  // jamais l'ancienne à sa place si elle portait l'ancien logo (l'objet) : la planche montre alors le dessin de SINA.
  const before = (x.board.images ?? {}) as NonNullable<Route["board"]["images"]>;
  const keep = <K extends "logo" | "hero" | "object" | "signs" | "site">(k: K) => (wanted.has(k as ImageSlot) ? made.get(k as ImageSlot) : before[k]) ?? undefined;
  // Pas de logo gardé : l'ancien logo, l'ancien objet qui le porte et l'ancienne marque de planche restent ensemble.
  if (skipCarriers) { if (before.logo) made.set("logo", before.logo); for (const k of ["object", "signs"] as const) if (before[k]) made.set(k, before[k]!); }
  const posts = (["post0", "post1", "post2"] as const).map((s, i) => (wanted.has(s) ? made.get(s) : before.posts?.[i]) ?? null);
  const logoNow = keep("logo");
  const markNow = wanted.has("logo") && !skipCarriers ? marks : { mark: before.mark, markDark: before.markDark };
  const images = {
    ...(logoNow ? { logo: logoNow } : {}), ...(keep("hero") ? { hero: keep("hero")! } : {}),
    ...(keep("object") ? { object: keep("object")! } : {}), ...(keep("site") ? { site: keep("site")! } : {}), ...(keep("signs") ? { signs: keep("signs")! } : {}),
    ...(posts.some(Boolean) ? { posts } : {}), ...(imagery.look.trim() ? { look: imagery.look.trim().slice(0, 700) } : before.look ? { look: before.look } : {}),
    ...(logoNow && markNow.mark ? { mark: markNow.mark } : {}), ...(logoNow && markNow.markDark ? { markDark: markNow.markDark } : {}),
    ...(imagery.logo.trim() ? { logoIdea: imagery.logo.trim().slice(0, 900) } : before.logoIdea ? { logoIdea: before.logoIdea } : {}),
  };
  const any = !!(images.logo || images.hero || images.object || images.signs || images.site || images.posts);
  const { images: _old, ...boardRest } = x.board as Route["board"] & { images?: unknown };
  const next = RouteSchema.safeParse({ ...x, board: { ...boardRest, ...(any ? { images } : {}) } });
  if (capped) issues.push(tag(L("le plafond annoncé a été atteint avant la fin de ses images.", "the announced cap was reached before its images were finished.")));
  return { route: next.success ? next.data : x, made: next.success ? made.size : 0, rejected, notes, issues };
}
