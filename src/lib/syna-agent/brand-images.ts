/**
 * Images qui FINISSENT une planche de marque (demande du propriétaire du 12 novembre 2026 : « faire intervenir OpenAI
 * pour générer les images qui viendront finir réellement les planches […] chaque logo des planches par OpenAI […] une
 * vraie direction artistique complète » ; puis : « les publications, si les gens voient ça ils peuvent se dire que le
 * studio n'est pas à la hauteur. Comme le téléphone avec le site »).
 *
 * Pour UNE planche : une direction artistique globale, puis sept images créées par le modèle d'images du Studio
 * (OpenAI, la route des images de SINA) : le logo (à partir du nom composé par le Studio ET de la direction
 * artistique), la grande scène, l'objet avec le logo posé dessus, le haut du site sur téléphone, les trois
 * publications. Les petits signes restent dessinés par SINA.
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
import { RouteSchema, safeWordmark, type Route } from "./brand-routes";
import { drawWordmark, wordmarkPng } from "./brand-wordmark";
import { normText } from "./identities";

export const IMAGE_SLOTS = ["logo", "hero", "object", "site", "post0", "post1", "post2"] as const;
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export type ImageAspect = "1:1" | "16:9" | "9:16" | "4:5";
/** Format demandé pour chaque image (le modèle rend du carré, du paysage 3:2 ou du portrait 2:3). */
export const SLOT_ASPECT: Record<ImageSlot, ImageAspect> = { logo: "1:1", hero: "16:9", object: "1:1", site: "9:16", post0: "4:5", post1: "4:5", post2: "4:5" };
/** Images de référence envoyées avec chaque demande (le nom composé pour le logo ; le logo pour l'objet et le site). */
export const SLOT_REFERENCES: Record<ImageSlot, number> = { logo: 1, hero: 0, object: 1, site: 2, post0: 0, post1: 0, post2: 0 };

/**
 * Réglage `sina.brand_images` : « dessins » (par défaut : la planche garde les dessins de SINA) ou « openai » (les
 * sept images sont créées). Reste sur « dessins » tant que le propriétaire n'a pas validé un essai réel.
 */
export const brandImagesOn = (): boolean => getJsonSetting<string>("sina.brand_images", "dessins") === "openai";
/** Route des images de SINA (la même que les photos du thème sur mesure : réglage `syna.mockup.image_route`). */
export function boardImageRoute(): { provider: string; model: string } {
  const [provider, model] = getJsonSetting<string>("syna.mockup.image_route", "openai:gpt-image-2.6-flare").split(":");
  return { provider, model };
}

export const ImagerySchema = z.object({
  look: z.string().max(900).default(""),
  logo: z.string().min(1).max(1600), hero: z.string().min(1).max(2200), object: z.string().min(1).max(2200), site: z.string().min(1).max(2200),
  posts: z.array(z.string().min(1).max(2200)).length(3),
});
export type Imagery = z.infer<typeof ImagerySchema>;
export const ImageReviewSchema = z.object({
  images: z.array(z.object({ slot: z.string().max(12), ok: z.boolean(), read: z.array(z.string().max(400)).max(14).default([]), why: z.string().max(260).default("") })).max(8).default([]),
});

const same = (a: string, b: string) => normText(a) === normText(b);
/** Les textes que chaque image doit porter, lettre pour lettre (ils viennent de la planche, jamais du modèle). */
export function slotTexts(x: Route): Record<ImageSlot, string[]> {
  const b = x.board, front = b.object.front.filter((l) => !same(l, x.name)).slice(0, 2);
  return {
    logo: [x.name], hero: [], object: [x.name, ...front], site: [x.name, b.site.headline, b.site.text, b.site.button],
    post0: [b.posts[0].text], post1: [b.posts[1].text], post2: [b.posts[2].text],
  };
}

const NO_PERSON = "Aucune personne, aucun visage, aucune main. Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.";
const NO_TEXT = "Aucun texte, aucune lettre, aucun chiffre, aucun logo, aucun filigrane.";
const exact = (texts: string[]) => `Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : ${texts.map((t) => `« ${t} »`).join(" ; ")}. Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.`;
const paletteLine = (x: Route) => `Couleurs de la marque : foncé ${x.palette.dark}, couleur de marque ${x.palette.primary}, surface ${x.palette.secondary}, accent ${x.palette.accent}, clair ${x.palette.light}.`;

/** Consigne complète d'une image : la direction globale, la consigne de la directrice artistique, les lignes fixes du Studio. */
export function imagePrompt(slot: ImageSlot, x: Route, imagery: Imagery, o: { logo: boolean } = { logo: true }): string {
  const look = imagery.look.trim(), texts = slotTexts(x)[slot];
  if (slot === "logo") {
    // Fond blanc : il se retire ensuite depuis les bords quand ce logo devient celui du projet (jamais de carré autour).
    return [
      `Logo de la marque « ${x.name} ».`, imagery.logo.trim(),
      `L'image de référence montre le nom composé avec les bonnes lettres : garde EXACTEMENT ces lettres, dans cet ordre (« ${x.name} »), sans en ajouter, en retirer ni en changer une seule.`,
      look ? `Direction artistique de la marque : ${look}` : "", paletteLine(x),
      "Un seul logo, centré, à plat, sur un fond BLANC uni, avec de l'air autour ; ses couleurs se lisent bien sur du blanc. Aucun autre texte que le nom, aucune maquette, aucun objet autour, aucun cadre, aucune ombre portée, aucune personne.",
    ].filter(Boolean).join("\n");
  }
  const brief = slot === "hero" ? imagery.hero : slot === "object" ? imagery.object : slot === "site" ? imagery.site : imagery.posts[Number(slot.slice(4))];
  const withLogo = (slot === "object" || slot === "site") && o.logo;
  // Le nom est porté par le logo fourni ; sans logo, il est écrit comme les autres textes.
  const written = slot === "hero" ? [] : texts.filter((t) => !withLogo || !same(t, x.name)).filter((t, i) => slot === "object" || slot === "site" || i === 0);
  return [
    look ? `Direction artistique : ${look}` : "", brief.trim(), paletteLine(x),
    withLogo ? "Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change." : "",
    slot === "site" ? "Montre seulement l'écran, bord à bord, en portrait : ni téléphone, ni cadre, ni main, ni fond autour." : "",
    slot.startsWith("post") ? "Visuel de publication pour un réseau social, en portrait, bord à bord : aucun cadre d'application, aucun bouton, aucun pseudonyme." : "",
    written.length ? exact(written) : NO_TEXT, NO_PERSON,
  ].filter(Boolean).join("\n");
}

/** Ce que la directrice artistique des images reçoit d'une route. */
const imageryBrief = (x: Route) => [
  `Nom : ${x.name}`, `Signature : ${x.slogan}`, `Promesse : ${x.promise}`, `Territoire : ${x.territory}`,
  `Ce que croit la marque : ${x.board.idea.belief}`, `Elle se bat contre : ${x.board.idea.enemy}`, `La preuve, dans l'objet : ${x.board.idea.proof}`,
  `Fond de page : ${x.ground}${x.gradient ? ` (${x.gradient.from} → ${x.gradient.to})` : ""}`, paletteLine(x),
  `Nom composé (image de référence du logo) : ${(x.board.wordmark.lines ?? [x.name]).join(" / ")}`,
  "Signes de la marque :", ...x.board.signs.map((g) => `  - ${g.title} — ${g.text}`),
  `Objet : ${BOARD_OBJECT_LABEL[x.board.object.kind].fr.toLowerCase()} ; écrit devant : ${x.board.object.front.join(" · ")}`,
  `Site (haut de l'accueil) : titre « ${x.board.site.headline} » ; texte « ${x.board.site.text} » ; bouton « ${x.board.site.button} »`,
  "Publications (dans l'ordre) :", ...x.board.posts.map((q, i) => `  ${i + 1}. « ${q.text} »`),
].join("\n");

const SLOT_LABEL: Record<ImageSlot, { fr: string; en: string }> = {
  logo: { fr: "le logo", en: "the logo" }, hero: { fr: "la grande image", en: "the main image" }, object: { fr: "l'image de l'objet", en: "the object image" }, site: { fr: "l'image du site", en: "the site image" },
  post0: { fr: "la première publication", en: "the first post" }, post1: { fr: "la deuxième publication", en: "the second post" }, post2: { fr: "la troisième publication", en: "the third post" },
};
const ROLE_FOR_REVIEW: Record<ImageSlot, string> = {
  logo: "le logo de la marque", hero: "la grande image de la marque (aucun texte attendu)", object: "l'objet de la marque, avec le logo posé dessus", site: "le haut de la page d'accueil, sur téléphone",
  post0: "une publication", post1: "une publication", post2: "une publication",
};

type Made = { id: string; w: number; h: number };
export type BoardImagesResult = { route: Route; made: number; rejected: number; notes: string[]; issues: string[] };

/**
 * Crée, relit et pose les images d'UNE planche. Rend la route avec `board.images` (seulement les images acceptées),
 * les notes de la chaîne, et ce qui est dit au client pour chaque image non gardée.
 */
export async function runBoardImages(o: { ctx: JobContext; ai: ChainAi; who: { userId: string; projectId: string }; brief: string; kind: "produits" | "services"; route: Route; round: number }): Promise<BoardImagesResult> {
  const { ctx, ai, route: x, round } = o, key = x.key, notes: string[] = [], issues: string[] = [];
  const tag = (line: string) => L(`Identité ${key} : ${line}`, `Identity ${key}: ${line}`);
  const imagery = await ctx.step(`brand:imagery:${round}:${key}`, () => ai.ask(`imagery-${round}-${key}`, { kind: "imagery", system: P.imagerySystem(o.kind), schema: ImagerySchema, prompt: `${o.brief}\n\n# La route à mettre en images\n${imageryBrief(x)}` }));

  const made = new Map<ImageSlot, Made>();
  const bufferOf = (slot: ImageSlot): Buffer | null => { const m = made.get(slot), a = m ? getAsset(m.id) : undefined; return a ? assetData(a) : null; };
  let capped = false;
  const make = async (slot: ImageSlot, refs: { logo?: Buffer | null; scene?: Buffer | null }, prompt: string) => {
    if (capped) return;
    try {
      made.set(slot, await ctx.step(`brand:image:${round}:${key}:${slot}`, async (): Promise<Made> => {
        const data = await ai.draw(`image-${round}-${key}-${slot}`, { prompt, aspect: SLOT_ASPECT[slot], logo: refs.logo ?? null, scene: refs.scene ?? null });
        const png = await sharp(data).png().toBuffer(), meta = await sharp(png).metadata();
        const asset = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "review", meta: { synaBoard: { key, slot, round, name: x.name } } });
        return { id: asset.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      }));
    } catch (e) {
      if (e instanceof CostCapReached) { capped = true; notes.push(`plafond de dépense atteint pendant les images de ${key}`); return; }
      // Une image qui échoue n'est jamais relancée seule : la planche garde le dessin de SINA à cette place.
      notes.push(`${SLOT_LABEL[slot].fr} de ${key} non créé(e) : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      issues.push(tag(L(`je n'ai pas pu créer ${SLOT_LABEL[slot].fr} ; tu vois mon dessin à la place.`, `I could not create ${SLOT_LABEL[slot].en}; you see my drawing instead.`)));
    }
  };

  // 1. Le logo : le nom composé par le Studio sert de modèle (lettres exactes), sur fond clair.
  let composed: Buffer | null = null;
  try { composed = await wordmarkPng(drawWordmark(x.name, safeWordmark(x.board.wordmark, x.name), x.fonts.heading), { main: x.palette.dark, accent: x.palette.primary, background: "#FFFFFF" }, 1024); } catch { composed = null; }
  ctx.progress(0.96, L(`Je dessine le logo de la planche ${key}`, `Drawing the logo of board ${key}`));
  await make("logo", { logo: composed }, imagePrompt("logo", x, imagery));
  const logo = bufferOf("logo");
  // 2. La grande scène, puis ce qui porte le logo, puis les publications.
  ctx.progress(0.965, L(`Je crée les images de la planche ${key}`, `Creating the images of board ${key}`));
  await make("hero", {}, imagePrompt("hero", x, imagery));
  await make("object", { logo }, imagePrompt("object", x, imagery, { logo: !!logo }));
  await make("site", { logo, scene: bufferOf("hero") }, imagePrompt("site", x, imagery, { logo: !!logo }));
  for (const slot of ["post0", "post1", "post2"] as const) await make(slot, {}, imagePrompt(slot, x, imagery));

  // Dans la bibliothèque du client : une image attend sa relecture (« review »), puis elle est gardée (« ready ») ou
  // refusée (« rejected », avec la raison) : une image ratée n'y est jamais rangée comme une bonne image.
  const mark = (id: string, status: "ready" | "rejected", why = "") => run("UPDATE assets SET status=?, meta=json_set(meta,'$.synaBoard.review',json(?)) WHERE id=? AND project_id=?", status, JSON.stringify({ status, why: why.slice(0, 240) }), id, o.who.projectId);

  // 3. La relecture : aucune image n'est montrée sans avoir été regardée.
  const slots = IMAGE_SLOTS.filter((s) => made.has(s));
  let rejected = 0;
  if (slots.length) {
    const texts = slotTexts(x);
    const drop = (slot: ImageSlot, why: string) => { mark(made.get(slot)!.id, "rejected", why); made.delete(slot); rejected++; issues.push(tag(L(`je n'ai pas gardé ${SLOT_LABEL[slot].fr} (${why.replace(/\.+$/, "")}) ; tu vois mon dessin à la place.`, `I did not keep ${SLOT_LABEL[slot].en} (${why}); you see my drawing instead.`))); };
    // Relecture impossible (plafond, appel en échec) : des images non relues ne sont jamais montrées.
    const unreviewed = () => {
      for (const s of slots) { const m = made.get(s); if (m) mark(m.id, "rejected", "non relue"); made.delete(s); }
      rejected += slots.length;
      issues.push(tag(L("je n'ai pas pu relire ses images, donc je ne te les montre pas ; tu vois mes dessins à la place.", "I could not review its images, so I am not showing them; you see my drawings instead.")));
    };
    if (capped) unreviewed();
    else try {
      const review = await ctx.step(`brand:imagecheck:${round}:${key}`, () => ai.look(`imagecheck-${round}-${key}`, {
        system: P.imageReviewSystem(), schema: ImageReviewSchema,
        prompt: [`Marque : « ${x.name} ». Voici ${slots.length} image(s), dans l'ordre.`, ...slots.map((s, i) => `Image ${i + 1} — slot "${s}" : ${ROLE_FOR_REVIEW[s]}. Textes attendus : ${texts[s].length ? texts[s].map((t) => `« ${t} »`).join(" ; ") : "aucun"}.`)].join("\n"),
        images: slots.map((s) => ({ data: bufferOf(s)!, label: s })),
      }));
      for (const s of slots) {
        const v = review.images.find((r) => r.slot === s);
        if (!v) { drop(s, L("elle n'a pas pu être relue", "it could not be reviewed")); continue; }
        if (!v.ok) { drop(s, v.why || L("elle ne passe pas ma relecture", "it does not pass my review")); continue; }
        // Contrôle du Studio, en plus du jugement : le logo doit porter le nom, lu tel quel.
        if (s === "logo" && !normText(v.read.join(" ")).includes(normText(x.name))) drop(s, L("le nom n'y est pas écrit exactement", "the name is not written exactly"));
      }
    } catch (e) {
      if (e instanceof CostCapReached) capped = true;
      else notes.push(`relecture des images de ${key} impossible : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      unreviewed();
    }
  }

  for (const m of made.values()) mark(m.id, "ready");
  const posts = (["post0", "post1", "post2"] as const).map((s) => made.get(s) ?? null);
  const images = {
    ...(made.get("logo") ? { logo: made.get("logo")! } : {}), ...(made.get("hero") ? { hero: made.get("hero")! } : {}),
    ...(made.get("object") ? { object: made.get("object")! } : {}), ...(made.get("site") ? { site: made.get("site")! } : {}),
    ...(posts.some(Boolean) ? { posts } : {}), ...(imagery.look.trim() ? { look: imagery.look.trim().slice(0, 700) } : {}),
  };
  const next = RouteSchema.safeParse({ ...x, board: { ...x.board, ...(made.size ? { images } : {}) } });
  if (capped) issues.push(tag(L("le plafond annoncé a été atteint avant la fin de ses images.", "the announced cap was reached before its images were finished.")));
  return { route: next.success ? next.data : x, made: next.success ? made.size : 0, rejected, notes, issues };
}
