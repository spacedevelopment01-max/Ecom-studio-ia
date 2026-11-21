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
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import type { JobContext } from "../jobs";
import { L } from "../i18n-server";
import { CostCapReached } from "../ai/trace";
import { one, run } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import { getJsonSetting } from "../settings";
import { BOARD_OBJECT_LABEL } from "./brand-board";
import type { ChainAi } from "./brand-chain";
import * as P from "./brand-prompts";
import { RouteSchema, type Route } from "./brand-routes";
import { cleanArtwork, onDarkVersion } from "../logo-v2/artwork";
import { FONT_CHARACTER, fontFamily, normText } from "./identities";

export const IMAGE_SLOTS = ["logo", "hero", "object", "signs", "site", "post0", "post1", "post2"] as const;
/**
 * Images réellement créées. Le haut de l'accueil du site en fait partie (retour du propriétaire du 15 novembre 2026,
 * après le haut de site rendu en code par le Studio : « je veux juste qu'OpenAI fasse une maquette du haut de l'accueil
 * du site, même si après ce n'est pas forcément ressemblant ; le but est vraiment d'avoir quelque chose de qualité et de
 * beau à regarder ; ça ne doit pas être la même maquette entre les projets, et ça doit se faire à l'identité de la
 * carte » ; puis : « je veux la maquette sur téléphone et dans le téléphone, ça c'est bien »). C'est une maquette
 * d'écran de téléphone, en portrait, montrée dans le cadre du téléphone de la planche.
 */
export const CREATED_SLOTS = [...IMAGE_SLOTS];
export type ImageSlot = (typeof IMAGE_SLOTS)[number];
export type ImageAspect = "1:1" | "16:9" | "9:16" | "4:5";
/** Format demandé pour chaque image (le modèle rend du carré, du paysage 3:2 ou du portrait 2:3). */
export const SLOT_ASPECT: Record<ImageSlot, ImageAspect> = { logo: "1:1", hero: "16:9", object: "1:1", signs: "1:1", site: "9:16", post0: "4:5", post1: "4:5", post2: "4:5" };
/** Images de référence envoyées avec chaque demande (le logo pour l'objet et le site ; aucun modèle pour le logo lui-même). */
export const SLOT_REFERENCES: Record<ImageSlot, number> = { logo: 1, hero: 0, object: 1, signs: 1, site: 2, post0: 1, post1: 1, post2: 1 };

/**
 * Les images d'une planche se créent en DEUX temps (lot 2, 15 novembre 2026 : « images complètes pour la seule identité
 * choisie ») : chaque identité proposée reçoit son logo et sa grande scène ; l'objet, les signes et les trois
 * publications ne sont créés que pour l'identité que le client choisit (deux tiers des images ne servaient jamais).
 */
/** Reprises d'une image refusée à la relecture, avant de montrer la planche (jamais une planche incomplète). */
export const MAX_IMAGE_RETRIES = 2;
export const PROPOSAL_SLOTS: ImageSlot[] = ["logo", "hero", "site"];
export const FINISH_SLOTS: ImageSlot[] = ["object", "signs", "post0", "post1", "post2"];
/** Les images de planche sont toujours créées par OpenAI (plus aucun dessin en code à leur place). */
export const brandImagesOn = (): boolean => true;
/** Route des images de SINA (la même que les photos du thème sur mesure : réglage `syna.mockup.image_route`). */
export function boardImageRoute(): { provider: string; model: string } {
  const [provider, model] = getJsonSetting<string>("syna.mockup.image_route", "openai:gpt-image-2.6-flare").split(":");
  return { provider, model };
}

export const ImagerySchema = z.object({
  look: z.string().max(900).default(""),
  logo: z.string().min(1).max(1600), hero: z.string().min(1).max(2200), object: z.string().min(1).max(2200), site: z.string().min(1).max(2200),
  /** Les signes de la marque posés sur de vrais objets de son monde (remplace les pictogrammes dessinés en code). */
  signs: z.string().max(2200).default(""),
  posts: z.array(z.string().min(1).max(2200)).length(3),
});
export type Imagery = z.infer<typeof ImagerySchema>;
export const ImageReviewSchema = z.object({
  // Jusqu'à 12 avis : les 8 images d'une planche, plus les images jointes pour comparer (logo, logos aimés), que le
  // relecteur juge parfois aussi (ses avis sur elles sont ignorés).
  // defect : la nature du défaut d'une image refusée. Seul « texte » peut être contredit par la lecture elle-même ;
  // un défaut non précisé vaut « autre » (l'image reste refusée : c'est le côté sûr).
  images: z.array(z.object({ slot: z.string().max(12), ok: z.boolean(), read: z.array(z.string().max(400)).max(14).default([]), why: z.string().max(260).default(""), defect: z.enum(["texte", "personne", "coupe", "abime", "autre"]).default("autre") })).max(12).default([]),
});
/** Seconde lecture d'une image dont le jugement contredit la lecture : seulement recopier, sans juger. */
export const ImageRereadSchema = z.object({ images: z.array(z.object({ slot: z.string().max(12), read: z.array(z.string().max(400)).max(14).default([]) })).max(12).default([]) });

/** Même texte, à la casse, aux espaces, au type d'apostrophe et au point final près ; jamais aux lettres ni aux accents. */
const plain = (t: string) => t.normalize("NFC").replace(/[’ʼ`´]/g, "'").replace(/[«»“”"]/g, " ").replace(/[_＿]+|[—–]{2,}/g, "_").replace(/\s*\/\s*/g, "/").replace(/\s+([:;!?])/g, "$1").replace(/\s+/g, " ").trim().replace(/[.\s]+$/, "").toLowerCase();

/**
 * Le Studio compare lui-même ce que le relecteur a LU avec ce que l'image devait porter (essai réel du 13 novembre
 * 2026 : il avait recopié « Ça a le goût de mordre dedans. » sans une faute, puis refusé l'image pour « dedans mal
 * écrit » ; deux bonnes publications perdues). missing : texte attendu qu'on ne retrouve pas tel quel dans la lecture ;
 * extra : texte lu que personne n'avait demandé (le nom de la marque, lui, est toujours permis).
 */
export function textCheck(expected: string[], read: string[], name: string): { missing: string[]; extra: string[] } {
  const want = expected.map(plain).filter(Boolean), got = read.map(plain).filter(Boolean), all = got.join(" ");
  // Un titre dessiné sur plusieurs lignes est souvent recopié ligne par ligne : il est cherché aussi dans la suite des
  // mots lus, sans la ponctuation (essai réel du 16 novembre 2026 : « Cousu ici. Recousu ici. » lu en deux blocs).
  const words = (t: string) => t.replace(/[^\p{L}\p{N}']+/gu, " ").trim(), run = ` ${words(all)} `;
  const missing = expected.filter((t) => { const p = plain(t); return !!p && !got.includes(p) && !all.includes(p) && !(words(p) && run.includes(` ${words(p)} `)); });
  // Un bloc lu peut réunir plusieurs textes attendus : ce qu'il en reste une fois ces textes retirés est en trop.
  const known = [...want, plain(name)].filter(Boolean).sort((a, b) => b.length - a.length);
  // Un bloc lu qui n'est qu'un morceau d'un texte attendu (un texte dessiné sur deux lignes) n'est pas en trop.
  const wanted = ` ${words(want.join(" "))} `;
  const extra = read.filter((t) => { let p = plain(t); if (!p) return false; if (words(p) && wanted.includes(` ${words(p)} `)) return false; for (const w of known) p = p.split(w).join(" "); return /[\p{L}\p{N}]/u.test(p); });
  return { missing, extra };
}

const same = (a: string, b: string) => normText(a) === normText(b);
/** Les textes que chaque image doit porter, lettre pour lettre (ils viennent de la planche, jamais du modèle). */
export function slotTexts(x: Route): Record<ImageSlot, string[]> {
  // Trois lignes au plus sont écrites sur l'objet : une ligne prévue mais non donnée était inventée par le modèle
  // (essai réel du 16 novembre 2026 : une autre ville que celle de la cliente).
  const b = x.board, front = b.object.front.filter((l) => !same(l, x.name)).slice(0, 3);
  return {
    logo: [x.name], hero: [], object: [x.name, ...front], signs: [], site: [x.name, b.site.headline, b.site.button],
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
/**
 * Le trait sous le nom, avec PARCIMONIE (propriétaire, 20 novembre 2026 : « j'ai toujours les traits en dessous »,
 * puis « il doit juste être là par parcimonie ») : jamais interdit, mais un seul logo au plus par série le porte. Sur 43
 * logos du Studio d'essai, presque toutes les marques calmes sortaient avec le signe en haut, le nom, un trait souligné.
 */
/** La planche des 50 logos aimés du propriétaire, jointe au RELECTEUR seulement (jamais au dessinateur). Absente : null. */
export async function planchedesLogosAimes(): Promise<Buffer | null> {
  try { return await sharp(fs.readFileSync(path.resolve(process.cwd(), "docs/sina-savoir/logos-aimes/planche-des-50.jpg"))).resize(1200, 1200, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer(); } catch { return null; }
}
export const LOGO_TRAIT_DEJA_PRIS = "Un des logos déjà faits a un trait, un filet ou une ligne près du nom : celui-ci n'en a pas.";
export const LOGO_OWN = "Une conception propre à cette marque, tirée de son idée et de son métier, jamais une recette déjà vue ailleurs.";
const exact = (texts: string[]) => `Textes à écrire dans l'image, lettre pour lettre, accents et ponctuation compris : ${texts.map((t) => `« ${t} »`).join(" ; ")}. Aucun autre texte, aucun mot inventé, aucun faux texte de remplissage.`;
/**
 * Le logo joint à la maquette du site. Sur une identité à fond sombre, c'est sa version claire, posée sur le foncé de
 * la marque (retour du propriétaire du 16 novembre 2026 : « le logo sombre sur un fond sombre, ça marche pas ») :
 * OpenAI recopie le logo tel qu'il le reçoit. Gratuit, sans IA ; en cas d'échec, le logo d'origine est joint.
 */
/**
 * Le logo de la planche pour un fond sombre : TOUT ce qui est foncé passe en clair, même une couleur foncée de la
 * marque (essai réel du 16 novembre 2026 : un nom brun, gardé brun avec un simple liseré, restait illisible sur le
 * fond sombre de sa planche et de sa maquette) ; les couleurs vives du dessin sont gardées. Gratuit, sans IA.
 */
export const lightLogo = (png: Buffer, light = "#FBF8F2"): Promise<Buffer> => onDarkVersion(png, null, light);
export async function logoForGround(logo: Buffer | null, x: Pick<Route, "ground" | "palette">): Promise<Buffer | null> {
  if (!logo || x.ground !== "sombre") return logo;
  try { return await sharp(await lightLogo(await cleanArtwork(logo))).flatten({ background: /^#[0-9a-f]{6}$/i.test(x.palette.dark) ? x.palette.dark : "#16161A" }).png().toBuffer(); } catch { return logo; }
}
const paletteLine = (x: Route) => `Couleurs de la marque : foncé ${x.palette.dark}, couleur de marque ${x.palette.primary}, surface ${x.palette.secondary}, accent ${x.palette.accent}, clair ${x.palette.light}.`;

/** Toutes les raisons des refus d'une image, de la plus ancienne à la plus récente, pour la redessiner sans revenir en arrière. */
/** Une raison qui ne dit rien de l'image (relecture impossible) : jamais donnée au dessinateur comme une correction. */
const TECHNIQUE = /pas pu la (vérifier|relire)|non relue|could not (check|review)/i;
export const fixLine = (whys: string[], attempt: number): string => {
  const list = [...new Set(whys.filter((w) => !TECHNIQUE.test(w)).map((w) => w.replace(/\s+/g, " ").trim().slice(0, 300)).filter(Boolean))];
  if (!list.length) return attempt > 1 ? "\nFais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge." : "";
  const head = list.length > 1
    ? `\nCORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :\n${list.map((w, i) => `${i + 1}. « ${w} »`).join("\n")}`
    : `\nCORRECTION : une première image a été refusée pour cette raison : « ${list[0] ?? ""} ». Refais l'image en corrigeant ce point.`;
  return head + (attempt > 1 ? "\nFais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge." : "");
};

/** Consigne complète d'une image : la direction globale, la consigne de la directrice artistique, les lignes fixes du Studio. */
export function imagePrompt(slot: ImageSlot, x: Route, imagery: Imagery, o: { logo: boolean } = { logo: true }): string {
  const look = imagery.look.trim(), texts = slotTexts(x)[slot];
  if (slot === "logo") {
    // Carte blanche (retour du propriétaire du 15 novembre 2026 : « tu dois laisser libre OpenAI pour faire les logos,
    // juste lui donner les indications de métier et identité de marque, couleur, typo ») : SINA donne ce qu'il faut
    // savoir de la marque, jamais une idée de dessin ; seuls restent le nom exact et ce qui permet de s'en servir
    // (un seul logo, à plat, sur fond blanc : le fond se retire ensuite depuis les bords, jamais de carré autour).
    return [
      `Crée le logo de la marque « ${x.name} ». Tu es totalement libre du dessin : l'idée, la forme, le dessin des lettres et le signe éventuel sont à toi.`,
      `Le nom s'écrit exactement « ${x.name} », lettre par lettre : ${spell(x.name)}. Aucune lettre ajoutée, retirée ni changée, accents compris. Aucun autre mot.`,
      x.board.descriptor ? `Métier : ${x.board.descriptor.trim().replace(/\.+$/, "")}.` : "",
      // Ce que la marque est (son idée, son ton, son métier) ; la lumière et les matières des photos n'y vont plus.
      imagery.logo.trim() ? `La marque : ${imagery.logo.trim()}` : "",
      paletteLine(x),
      `Typographie de la marque : un caractère ${FONT_CHARACTER[x.fonts.heading.replace(/_[ni]\d$/, "")] ?? "de titres"} (dans l'esprit de ${fontFamily(x.fonts.heading)}) ; tu peux le redessiner à ta façon.`,
      "Un seul logo, centré, à plat, net et lisible même en tout petit, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni maquette, ni photo, ni cadre, ni ombre portée.",
    ].filter(Boolean).join("\n");
  }
  const brief = slot === "hero" ? imagery.hero : slot === "object" ? imagery.object : slot === "signs" ? imagery.signs : slot === "site" ? imagery.site : imagery.posts[Number(slot.slice(4))];
  const post = slot.startsWith("post"), withLogo = (slot === "object" || slot === "site" || slot === "signs" || post) && o.logo;
  // Le nom est porté par le logo fourni ; sans logo, il est écrit comme les autres textes.
  const written = slot === "hero" ? [] : texts.filter((t) => !withLogo || !same(t, x.name)).filter((t, i) => slot === "object" || slot === "site" || i === 0);
  // La maquette du site : ses mots sont le titre, le bouton et les entrées du menu ; rien d'autre n'est écrit.
  return [
    look ? `Direction artistique : ${look}` : "", brief.trim(), paletteLine(x),
    withLogo ? "Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change." : "",
    slot === "site" ? "Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus (l'heure et les signes du téléphone en haut, puis l'en-tête du site). Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots. Le logo de l'en-tête est GRAND et net (au moins un tiers de la largeur de l'écran), recopié tel quel depuis l'image de référence, chaque lettre du nom lisible. Mise en page nette et précise : typographie soignée, alignements exacts, de l'air. Rien autour du téléphone : ni main, ni table, ni décor." : "",
    slot === "site" ? `Si la maquette montre des tuiles, des pastilles ou des entrées de menu, elles ne portent QUE ces mots, écrits tels quels : ${x.board.site.menu.length ? x.board.site.menu.map((t) => `« ${t} »`).join(", ") : "aucun (pas de tuile ni de pastille)"}. N'invente aucune prestation, aucune catégorie, aucune offre.` : "",
    post ? "Visuel de publication pour un réseau social, en portrait, bord à bord : aucun cadre d'application, aucun bouton, aucun pseudonyme." : "",
    // Une publication est vue par quelqu'un qui ne connaît pas la marque : elle la signe (retour du propriétaire du
    // 16 novembre 2026, devant trois publications sans nom : « j'ai pas compris l'angle marketing des images »).
    post && withLogo ? "Le logo est posé en PETIT dans un coin calme de l'image, entier, net et lisible, sans gêner le texte. Sur une zone foncée de l'image, il est dans sa version claire (ses parties foncées en clair) : jamais un logo foncé sur du foncé." : "",
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
  `Site (haut de l'accueil) : titre « ${x.board.site.headline} » ; ligne dessous « ${x.board.site.text} » ; bouton « ${x.board.site.button} » ; entrées du menu : ${x.board.site.menu.join(" · ") || "aucune"}${x.board.site.layout?.opening ? ` ; manière d'ouvrir choisie pour cette identité : ${x.board.site.layout.opening}` : ""}`,
  "Publications (dans l'ordre) :", ...x.board.posts.map((q, i) => `  ${i + 1}. « ${q.text} »`),
].join("\n");

const SLOT_LABEL: Record<ImageSlot, { fr: string; en: string }> = {
  logo: { fr: "le logo", en: "the logo" }, hero: { fr: "la grande image", en: "the main image" }, object: { fr: "l'image de l'objet", en: "the object image" }, signs: { fr: "l'image des signes", en: "the signs image" }, site: { fr: "la maquette de ton site", en: "your site mock-up" },
  post0: { fr: "la première publication", en: "the first post" }, post1: { fr: "la deuxième publication", en: "the second post" }, post2: { fr: "la troisième publication", en: "the third post" },
};
const ROLE_FOR_REVIEW: Record<ImageSlot, string> = {
  logo: "le logo de la marque", hero: "la grande image de la marque (aucun texte attendu)", object: "l'objet de la marque, avec le logo posé dessus : EXACTEMENT celui de l'image « logo » (même signe, même dessin de lettres, même graisse) ; une autre police est un défaut", signs: "les signes de la marque posés sur de vrais objets de son monde, le logo fourni compris (aucun autre texte attendu ; une icône plate ou un pictogramme est un défaut)", site: "la maquette du haut de la page d'accueil, dans un téléphone entier vu de face : elle doit être BELLE et donner envie, comme la page d'un studio de design primé (un titre TRÈS grand au caractère affirmé, une photo de campagne au sujet très grand, toute l'image dans la teinte de la marque, un seul bouton, très peu de mots, le logo fourni tel quel et net) ; un titre petit ou timide, une photo d'ambiance banale, une mise en page pauvre, vide ou confuse, un logo flou sont des défauts (defect « autre »). Le bouton principal porte son texte, écrit DANS le bouton : un bouton vide, avec seulement une flèche, est un défaut (defect « autre »). Le logo de l'en-tête est CELUI de la marque (compare-le à l'image « logo » fournie avec les autres) : même signe, même dessin de lettres ; sur un écran sombre, il est dans sa version claire (ses parties foncées en clair), et une nuance de couleur différente n'est pas un défaut. Seul un AUTRE signe ou un autre dessin du nom à la place du sien est un défaut (defect « autre »). Les petits mots d'interface (l'heure, une ligne sous le titre, une entrée secondaire) sont normaux",
  post0: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)", post1: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)", post2: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)",
};

type Made = { id: string; w: number; h: number };
/** Ce que le client voit à la place d'une image non gardée (dit tel quel, jamais un dessin qui n'existe pas). */
const instead = (_x: Route, slot: ImageSlot): string => slot === "signs" ? "les signes restent décrits en mots" : slot === "logo" ? "tu vois ton nom dessiné à la place" : "je ne la montre pas";
/**
 * Un trait fin et horizontal dans un logo (filet sous le nom, ligne de chaque côté) : une rangée de pixels sombres
 * presque continue, longue (au moins 22 % du dessin), fine (au plus 4 %, ou 5 points) et isolée. Sans IA. Essayé sur les 43 logos
 * du Studio d'essai (20 novembre 2026), puis réglé le 21 : un trait doré de 4 points sous le nom passait pour un aplat.
 */
export async function traitHorizontal(png: Buffer): Promise<{ trouve: boolean; detail: string }> {
  const { data, info } = await sharp(png).flatten({ background: "#FFFFFF" }).resize(400, 400, { fit: "inside" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, sombre = (x: number, y: number) => data[y * W + x] < 215;
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (sombre(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw < 20 || bh < 20) return { trouve: false, detail: "" };
  const run = (y: number) => { let best = 0, cur = 0, gap = 0; for (let x = x0; x <= x1; x++) { if (sombre(x, y)) { cur += 1 + gap; gap = 0; } else if (cur && gap < 2) gap++; else { best = Math.max(best, cur); cur = 0; gap = 0; } } return Math.max(best, cur); };
  const longue = (y: number) => run(y) >= 0.22 * bw;
  for (let y = y0; y <= y1; y++) {
    if (!longue(y)) continue;
    let e = y; while (e + 1 <= y1 && longue(e + 1)) e++;
    if (e - y + 1 <= Math.max(5, 0.04 * bh)) {
      const avant = y - 2 >= y0 ? run(y - 2) : 0, apres = e + 2 <= y1 ? run(e + 2) : 0;
      if (avant < 0.15 * bw && apres < 0.15 * bw) return { trouve: true, detail: `rangée ${y - y0} sur ${bh}, longueur ${Math.round((100 * run(y)) / bw)} %` };
    }
    y = e;
  }
  return { trouve: false, detail: "" };
}
/** Planche des logos déjà créés dans la série (côte à côte sur blanc), donnée au dessinateur. Rien : null. */
export async function logoSheet(logos: Buffer[]): Promise<Buffer | null> {
  const tiles = (await Promise.all(logos.slice(-4).map((b) => sharp(b).flatten({ background: "#FFFFFF" }).resize(512, 512, { fit: "contain", background: "#FFFFFF" }).png().toBuffer().catch(() => null)))).filter(Boolean) as Buffer[];
  if (!tiles.length) return null;
  return sharp({ create: { width: 512 * tiles.length, height: 512, channels: 3, background: "#FFFFFF" } }).composite(tiles.map((input, i) => ({ input, left: 512 * i, top: 0 }))).png().toBuffer();
}

/** Le logo que le client garde (sa propre image, déposée dans le Studio). */
export type ClientLogo = { id: string; w: number; h: number; data: Buffer };
export async function clientLogoOf(projectId: string): Promise<ClientLogo | null> {
  const row = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", projectId);
  const a = row ? getAsset(row.id) : undefined;
  if (!a) return null;
  try { const data = assetData(a), meta = await sharp(data).metadata(); return { id: a.id, w: meta.width ?? 1024, h: meta.height ?? 1024, data }; } catch { return null; }
}
export type BoardImagesResult = { route: Route; made: number; rejected: number; notes: string[]; issues: string[]; /** Haut du site refait et refusé : celui d'avant est gardé (il porte l'ancien logo). */ siteGarde?: boolean };

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
  /** Logos déjà créés dans la même série pour ce client : donnés au dessinateur pour qu'il en fasse un complètement différent. */
  madeLogos?: Buffer[];
  /** Ce que le client a dit de l'image qu'il veut (ses mots, refus compris) : donné au RELECTEUR des images, jamais au
   * dessinateur du logo (propriétaire, 21 novembre 2026 : « enlève la 7 »). */
  gouts?: string | null;
  /** Direction artistique déjà écrite pour cette planche (premier temps) : reprise telle quelle, jamais repayée. */
  imagery?: Imagery;
  /** Logo GARDÉ par le client : jamais redessiné ; il est la marque de la planche et se pose sur ce qui le porte. */
  clientLogo?: ClientLogo | null;
}): Promise<BoardImagesResult> {
  const { ctx, ai, route: x, round } = o, key = x.key, notes: string[] = [], issues: string[] = [];
  const wanted = new Set<ImageSlot>(o.slots?.length ? o.slots : CREATED_SLOTS);
  if (o.clientLogo) wanted.delete("logo");
  // Un nouvel essai d'une partie des images a sa propre étape (jamais la réponse en cache du premier essai).
  const pass = o.slots?.length ? `:${[...wanted].join("+")}` : "";
  const tag = (line: string) => L(`Identité ${key} : ${line}`, `Identity ${key}: ${line}`);
  // Rien des autres logos n'est transmis, ni en image ni en mots (demande du propriétaire du 16 novembre 2026 : « ça doit
  // repartir de 0 pour les logos, le seul truc qu'il a c'est le nom et l'identité de marque, et c'est tout »).
  const imagery = o.imagery ?? await ctx.step(`brand:imagery:${round}:${key}${pass}`, () => ai.ask(`imagery-${round}-${key}${pass}`, { kind: "imagery", system: P.imagerySystem(o.kind), schema: ImagerySchema, prompt: `${o.brief}\n\n# La route à mettre en images\n${imageryBrief(x)}` }));

  const made = new Map<ImageSlot, Made>();
  const bufferOf = (slot: ImageSlot): Buffer | null => { const m = made.get(slot), a = m ? getAsset(m.id) : undefined; return a ? assetData(a) : null; };
  let capped = false;
  type Refs = { logo?: Buffer | null; scene?: Buffer | null; avoid?: Buffer | null };
  // Ce qui a servi à créer chaque image : repris tel quel pour la refaire quand la relecture la refuse.
  const calls = new Map<ImageSlot, { refs: Refs; prompt: string }>();
  // Les images refusées, avec la raison : refaites avant d'être montrées (règle du propriétaire du 16 novembre 2026 :
  // « on ne peut pas donner une identité de marque incomplète »).
  const dropped = new Map<ImageSlot, string>();
  // Ce qui est DIT au client pour une image non gardée : une phrase simple du Studio, jamais les mots du relecteur
  // (retour du 16 novembre 2026 : « blocs de pixels visibles » affiché à une cliente). La raison détaillée du relecteur
  // sert seulement à refaire l'image.
  const saidWhy = new Map<ImageSlot, string>();
  const SAID: Record<string, string> = { texte: L("un texte y est mal écrit", "a text is misspelt"), personne: L("une personne y apparaît", "a person appears"), coupe: L("le sujet y est coupé", "the subject is cropped"), abime: L("l'image est abîmée", "the image is damaged"), autre: L("elle n'est pas au niveau", "it is not good enough") };
  const make = async (slot: ImageSlot, refs: Refs, prompt: string, retry = "") => {
    if (capped) return;
    if (!retry) calls.set(slot, { refs, prompt });
    try {
      made.set(slot, await ctx.step(`brand:image:${round}:${key}:${slot}${pass}${retry}`, async (): Promise<Made> => {
        const data = await ai.draw(`image-${round}-${key}-${slot}${pass}${retry}`, { prompt, aspect: SLOT_ASPECT[slot], logo: refs.logo ? await onWhite(refs.logo) : null, scene: refs.scene ?? null, avoid: refs.avoid ?? null, examples: slot === "logo" ? await planchedesLogosAimes() : null });
        const png = await sharp(data).png().toBuffer(), meta = await sharp(png).metadata();
        const asset = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "review", meta: { synaBoard: { key, slot, round, name: x.name } } });
        return { id: asset.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      }));
    } catch (e) {
      if (e instanceof CostCapReached) { capped = true; notes.push(`plafond de dépense atteint pendant les images de ${key}`); return; }
      // Une image qui échoue n'est jamais relancée seule : la planche garde le dessin de SINA à cette place.
      notes.push(`${SLOT_LABEL[slot].fr} de ${key} non créé(e) : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      issues.push(tag(L(`je n'ai pas pu créer ${SLOT_LABEL[slot].fr} ; ${instead(x, slot)}.`, `I could not create ${SLOT_LABEL[slot].en}; ${slot === "signs" ? "the signs stay described in words" : slot === "logo" ? "you see your drawn name instead" : "I am not showing it"}.`)));
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
    // Le premier logo d'une série est créé avec les seules consignes de base ; chacun des suivants reçoit en plus ceux
    // déjà créés dans la série, avec « je veux un logo complètement différent » (mots du propriétaire).
    // Seulement les logos de CETTE série, dans l'ordre (règle du propriétaire, redite le 20 novembre 2026 : le premier
    // logo créé est donné pour faire le deuxième, « complètement différent » ; puis les deux premiers pour le troisième).
    // Jamais les logos d'une série précédente ni d'un autre projet.
    const already = o.madeLogos ?? [], shown = await logoSheet(already);
    const n = Math.min(already.length, 4);
    // Parcimonie du trait : un seul logo par série le porte (contrôle sans IA des logos déjà faits).
    const traitPris = (await Promise.all(already.map((b) => traitHorizontal(b).then((r) => r.trouve).catch(() => false)))).some(Boolean);
    await make("logo", shown ? { avoid: shown } : {}, imagePrompt("logo", x, imagery, { logo: true }) + (traitPris ? `\n${LOGO_TRAIT_DEJA_PRIS}` : "") + (shown ? `\nL'image jointe montre ${n > 1 ? `les ${n} logos déjà faits` : "le logo déjà fait"} pour ce client. Je veux un logo complètement différent de ${n > 1 ? "ceux-là" : "celui-là"}, dans un autre style que ${n > 1 ? "chacun d'eux" : "lui"} : une autre façon de faire (je ne t'impose aucun style), y compris dans la disposition, la place du signe et la façon de poser le nom.` : ""));
    let drawn = bufferOf("logo");
    // Contrôle sans IA de la parcimonie : un trait alors qu'un logo de la série en a déjà un, le logo est redessiné UNE
    // fois ; s'il le garde encore, il est montré et c'est dit au client. Le premier trait d'une série est gardé.
    if (drawn && traitPris && (await traitHorizontal(drawn)).trouve) {
      mark(made.get("logo")!.id, "rejected", "un trait près du nom, déjà pris par un autre logo de la série"); made.delete("logo");
      notes.push(`logo de ${key} redessiné : un trait près du nom, déjà pris dans la série (contrôle sans IA)`);
      await make("logo", calls.get("logo")!.refs, `${calls.get("logo")!.prompt}\nLe logo précédent avait lui aussi un trait ou un filet près du nom : refais-le sans trait, sans filet ni ligne.`, ":sans-trait");
      drawn = bufferOf("logo");
      if (drawn && (await traitHorizontal(drawn)).trouve) issues.push(tag(L("son logo garde un trait sous le nom, malgré un second dessin.", "its logo still has a line under the name.")));
    }
    if (drawn && !(await logoOnWhite(drawn))) {
      const why = L("il n'est pas sur un fond blanc net : il ne se lirait pas sur tes supports", "it is not on a clean white background");
      mark(made.get("logo")!.id, "rejected", why); made.delete("logo"); dropped.set("logo", why);
      notes.push(`logo de ${key} refusé par le contrôle du fond (sans IA)`);
    }
  }
  // Le logo à poser sur l'objet : celui qui vient d'être créé, sinon celui déjà gardé sur la planche.
  const kept = x.board.images?.logo, keptBuffer = () => { const a = kept ? getAsset(kept.id) : undefined; return a ? assetData(a) : null; };
  const logo = o.clientLogo?.data ?? bufferOf("logo") ?? (wanted.has("logo") ? null : keptBuffer());
  // 2. La grande scène, puis ce qui porte le logo, puis les publications.
  ctx.progress(0.965, L(`Je crée les images de la planche ${key}`, `Creating the images of board ${key}`));
  if (wanted.has("hero")) await make("hero", {}, imagePrompt("hero", x, imagery));
  // La maquette du haut de l'accueil : le logo et la grande scène lui sont fournis (elle garde l'identité de la planche).
  if (wanted.has("site") && imagery.site.trim()) {
    const heroKept = x.board.images?.hero, heroBuffer = bufferOf("hero") ?? (() => { const a = heroKept ? getAsset(heroKept.id) : undefined; return a ? assetData(a) : null; })();
    await make("site", { logo: await logoForGround(logo, x), scene: heroBuffer }, imagePrompt("site", x, imagery, { logo: !!logo }));
  } else if (wanted.has("site")) {
    // Sans consigne de maquette, rien n'est créé ni payé, et c'est dit (SINA ne parle jamais d'une maquette absente).
    notes.push(`maquette du site de ${key} non créée : la direction artistique n'a pas rendu sa consigne`);
    issues.push(tag(L("je n'ai pas pu préparer la maquette de ton site ; je peux la refaire si tu me le demandes.", "I could not prepare your site mock-up; I can redo it if you ask.")));
  }
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
  for (const slot of ["post0", "post1", "post2"] as const) if (wanted.has(slot)) await make(slot, { logo }, imagePrompt(slot, x, imagery, { logo: !!logo }));

  // 3. La relecture : aucune image n'est montrée sans avoir été regardée.
  let blind = false;
  const currentLogo = () => o.clientLogo?.data ?? bufferOf("logo") ?? logo;
  const review = async (slots: ImageSlot[], rt = "") => {
    if (!slots.length) return;
    const logo = currentLogo();
    const texts = slotTexts(x);
    const drop = (slot: ImageSlot, why: string, said = why) => { mark(made.get(slot)!.id, "rejected", why); made.delete(slot); dropped.set(slot, why); saidWhy.set(slot, said); };
    // Raison écrite par le Studio d'après la lecture (jamais une phrase confuse du relecteur montrée au client).
    // Un texte attendu qui manque est dit en premier : pour la maquette du site, un petit mot en trop n'est pas un défaut.
    const textReason = (c: { missing: string[]; extra: string[] }) => c.extra.length && !c.missing.length ? L(`un texte non demandé y apparaît : « ${c.extra[0].slice(0, 60)} »`, `an unrequested text appears: "${c.extra[0].slice(0, 60)}"`) : L(`le texte « ${c.missing[0].slice(0, 60)} » n'y est pas écrit exactement`, `the text "${c.missing[0].slice(0, 60)}" is not written exactly`);
    // Relecture impossible (plafond, appel en échec) : des images non relues ne sont jamais montrées.
    const unreviewed = () => {
      for (const s of slots) { const m = made.get(s); if (m) mark(m.id, "rejected", "non relue"); made.delete(s); }
      rejected += slots.length; blind = true;
      issues.push(tag(L("je n'ai pas pu relire ses images, donc je ne te les montre pas.", "I could not review its images, so I am not showing them.")));
    };
    // Un logo à fond transparent est montré au relecteur posé sur du blanc, comme le client le verra.
    const seen: { data: Buffer; label: string }[] = await Promise.all(slots.map(async (s) => ({ data: s === "logo" ? await onWhite(bufferOf(s)!) : bufferOf(s)!, label: s as string })));
    // Un objet qui porte un logo gardé d'avant : ce logo est joint, en dernier, pour que le relecteur compare.
    const reference = !slots.includes("logo") && logo && slots.some((s) => s !== "hero") ? await onWhite(logo) : null;
    if (reference) seen.push({ data: reference, label: "logo" });
    // Un logo à juger : la planche des logos que le propriétaire aime, en dernier, comme niveau à atteindre.
    const aimes = slots.includes("logo") ? await planchedesLogosAimes() : null;
    if (aimes) seen.push({ data: aimes, label: "logos aimés" });
    if (capped) unreviewed();
    else try {
      const review = await ctx.step(`brand:imagecheck:${round}:${key}${pass}${rt}`, () => ai.look(`imagecheck-${round}-${key}${pass}${rt}`, {
        system: P.imageReviewSystem(), schema: ImageReviewSchema,
        prompt: [`Marque : « ${x.name} ».${x.board.descriptor ? ` Métier : ${x.board.descriptor}.` : ""} Voici ${slots.length} image(s), dans l'ordre.${reference ? ` La dernière image jointe (${slots.length + 1}) est seulement le logo de la marque, pour comparer : ne la juge pas.` : ""}`,
          ...(aimes ? [`La dernière image jointe est la planche des logos que le propriétaire du Studio aime : elle donne le NIVEAU attendu pour le logo, ne la juge pas et ne la recopie pas.`] : []),
          // Ce que le client refuse (essai réel du 20 novembre 2026 : une goutte d'eau refusée par le client, passée au contrôle).
          ...(o.gouts?.trim() ? [`Ce que le client a dit de l'image qu'il veut, avec ses mots : « ${o.gouts.trim()} ». Une image, et surtout le logo, qui montre ce qu'il refuse est un défaut (defect « autre »).`] : []), ...slots.map((s, i) => `Image ${i + 1} — slot "${s}" : ${(s === "object" || s === "signs") && !logo ? "l'objet ou les signes de la marque SANS logo fourni : le nom seul en lettres simples ; un logo, une patte, une silhouette ou un symbole inventés sont un défaut (defect « autre »)" : ROLE_FOR_REVIEW[s]}. Textes attendus : ${texts[s].length ? texts[s].map((t) => `« ${t} »`).join(" ; ") : "aucun"}.${s === "site" ? ` Seules entrées permises sur des tuiles, des pastilles ou un menu : ${x.board.site.menu.length ? x.board.site.menu.map((t) => `« ${t} »`).join(", ") : "aucune"} ; une autre prestation, catégorie ou offre affichée (que le client ne propose pas) est un défaut (defect « texte »).` : ""}`)].join("\n"),
        images: seen,
      }));
      // Le Studio compare la lecture du relecteur aux textes attendus. Quand son jugement et sa propre lecture se
      // contredisent (refus « texte » alors qu'il a tout recopié sans faute, ou accord alors qu'il a lu un texte en
      // trop), l'image est RELUE une seconde fois, seulement recopiée, et c'est la comparaison du Studio qui tranche.
      const doubt: ImageSlot[] = [], complete = new Set<ImageSlot>();
      for (const s of slots) {
        const v = review.images.find((r) => r.slot === s);
        if (!v) { drop(s, L("elle n'a pas pu être relue", "it could not be reviewed")); continue; }
        const c = textCheck(texts[s], v.read, x.name), exact = !c.missing.length && (s === "site" || !c.extra.length);
        if (s === "site" && !c.missing.length) complete.add(s);
        if (!v.ok) {
          if (v.defect === "texte" && exact) doubt.push(s);
          else if (v.defect === "texte" && (c.missing.length || c.extra.length) && v.read.length) drop(s, textReason(c));
          else drop(s, v.why || L("elle ne passe pas ma relecture", "it does not pass my review"), SAID[v.defect] ?? SAID.autre);
          continue;
        }
        // Contrôle du Studio, en plus du jugement : le logo doit porter le nom, lu tel quel.
        if (s === "logo" && !normText(v.read.join(" ")).includes(normText(x.name))) { drop(s, L("le nom n'y est pas écrit exactement", "the name is not written exactly")); continue; }
        // La maquette du site porte aussi de petits mots d'interface (l'heure, une ligne, une entrée) : seuls les mots
        // attendus (le nom, le titre, le bouton) y sont exigés à la lettre.
        if (s === "site" ? c.missing.length : c.extra.length) doubt.push(s);
      }
      if (doubt.length) {
        let second: z.infer<typeof ImageRereadSchema> | null = null;
        try {
          second = await ctx.step(`brand:imagereread:${round}:${key}${pass}${rt}`, () => ai.look(`imagereread-${round}-${key}${pass}${rt}`, {
            system: P.imageRereadSystem(), schema: ImageRereadSchema,
            prompt: [`Voici ${doubt.length} image(s), dans l'ordre.`, ...doubt.map((s, i) => `Image ${i + 1} — slot "${s}".`)].join("\n"),
            images: doubt.map((s) => ({ data: bufferOf(s)!, label: s })),
          }));
        } catch (e) { if (e instanceof CostCapReached) capped = true; else notes.push(`seconde lecture des images de ${key} impossible : ${String((e as Error)?.message ?? e).slice(0, 140)}`); }
        for (const s of doubt) {
          const r = second?.images.find((y) => y.slot === s);
          // Jamais montrée sans vérification : pas de seconde lecture, pas d'image.
          // La maquette dont la première lecture a trouvé le nom, le titre et le bouton est gardée, même si la seconde
          // lecture n'a rien rendu (essai réel du 16 novembre 2026 : une bonne maquette jetée pour cette seule raison).
          if (!r && complete.has(s)) { notes.push(`${SLOT_LABEL[s].fr} de ${key} : seconde lecture sans réponse ; gardé(e), la première lecture avait trouvé tous ses textes`); continue; }
          if (!r) { drop(s, L("je n'ai pas pu la vérifier une seconde fois", "I could not verify it a second time")); continue; }
          const c = textCheck(texts[s], r.read, x.name);
          if (c.missing.length || (s !== "site" && c.extra.length)) drop(s, textReason(c));
          else notes.push(`${SLOT_LABEL[s].fr} de ${key} : jugement et lecture se contredisaient ; gardé(e) après une seconde lecture, texte exact`);
        }
      }
    } catch (e) {
      if (e instanceof CostCapReached) capped = true;
      else notes.push(`relecture des images de ${key} impossible : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      unreviewed();
    }
  };
  await review(IMAGE_SLOTS.filter((s) => made.has(s)));

  // 3 bis. Une image refusée est refaite avant d'être montrée : deux reprises au plus, avec la raison du refus donnée au
  // modèle ; à la seconde, la consigne est simplifiée. Les reprises restent dans le plafond déjà accepté par le client.
  // Un logo refait emporte ce qui le porte (créé avec le logo refusé).
  const whyHistory = new Map<ImageSlot, string[]>();
  const CARRIERS: ImageSlot[] = ["site", "object", "signs", "post0", "post1", "post2"];
  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES && dropped.size && !capped && !blind; attempt++) {
    const again = IMAGE_SLOTS.filter((s) => dropped.has(s) && calls.has(s));
    if (!again.length) break;
    ctx.progress(0.97, L(`Je reprends ${again.length > 1 ? "des images" : "une image"} de la planche ${key}`, `Redoing images of board ${key}`));
    // Toutes les raisons des refus de l'image, pas seulement la dernière (essai réel du 21 novembre 2026 : le 3e logo
    // d'Aplomb, corrigé seulement de « trop sage », a remis la goutte retirée au 2e).
    const fix = (slot: ImageSlot, why: string) => { const h = [...(whyHistory.get(slot) ?? []), why]; whyHistory.set(slot, h); return fixLine(h, attempt); };
    const redone: ImageSlot[] = [];
    if (again.includes("logo")) {
      const c = calls.get("logo")!, why = dropped.get("logo")!; dropped.delete("logo");
      await make("logo", c.refs, c.prompt + fix("logo", why), `:r${attempt}`);
      const drawn = bufferOf("logo");
      if (drawn && !(await logoOnWhite(drawn))) { const w = L("il n'est pas sur un fond blanc net : il ne se lirait pas sur tes supports", "it is not on a clean white background"); mark(made.get("logo")!.id, "rejected", w); made.delete("logo"); dropped.set("logo", w); }
      else if (drawn) {
        await review(["logo"], `:r${attempt}`);
        // Le nouveau logo est gardé : ce qui portait l'ancien est refait avec lui.
        if (made.has("logo")) for (const s of CARRIERS) if (made.has(s) && calls.has(s) && !o.clientLogo) { mark(made.get(s)!.id, "rejected", "logo refait"); made.delete(s); dropped.set(s, L("le logo de la marque a été refait : reprends l'image avec le logo fourni", "the brand logo was redone")); saidWhy.set(s, SAID.autre); }
      } else dropped.set("logo", why);
    }
    for (const s of IMAGE_SLOTS.filter((v) => v !== "logo" && dropped.has(v) && calls.has(v))) {
      if (attempt === 1 && !again.includes(s)) continue; // porteur d'un logo refait à l'instant : repris au tour suivant
      const c = calls.get(s)!, why = dropped.get(s)!; dropped.delete(s);
      const now = currentLogo(), refs = c.refs.logo ? { ...c.refs, logo: s === "site" ? await logoForGround(now, x) : now } : c.refs;
      await make(s, refs, c.prompt + fix(s, why), `:r${attempt}`);
      if (made.has(s)) redone.push(s); else dropped.set(s, why);
    }
    await review(redone, `:r${attempt}`);
  }
  // Ce qui reste refusé après les reprises est dit au client, sans image fausse à la place.
  for (const [slot, raw] of dropped) { const why = saidWhy.get(slot) ?? raw; rejected++; issues.push(tag(L(`je n'ai pas gardé ${SLOT_LABEL[slot].fr} (${why.replace(/\.+$/, "")}) ; ${instead(x, slot)}.`, `I did not keep ${SLOT_LABEL[slot].en} (${why}); ${slot === "logo" ? "you see your drawn name instead" : "I am not showing it"}.`))); }

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
      // Point de reprise : une relance de la tâche ne range pas ces deux fichiers une seconde fois.
      marks = await ctx.step(`brand:marks:${round}:${key}${pass}:${logoMade.id}`, async () => {
        const clear = await cleanArtwork(logoPng);
        return { mark: await save(clear, "mark"), markDark: await save(await lightLogo(clear), "markDark") };
      });
    } catch (e) { notes.push(`logo de ${key} gardé, mais sans version détourée : ${String((e as Error)?.message ?? e).slice(0, 120)}`); }
  }

  // Une planche à fond sombre dont le logo est gardé : sa version claire est refaite (gratuit, sans IA) quand une de
  // ses images est reprise, pour qu'une planche créée avant la règle du logo clair en profite aussi.
  let lightKept: Made | undefined;
  if (!logoMade && !o.clientLogo && x.ground === "sombre" && kept) {
    try {
      lightKept = await ctx.step(`brand:marklight:${round}:${key}${pass}:${kept.id}`, async () => {
        const png = await lightLogo(await cleanArtwork(keptBuffer()!)), meta = await sharp(png).metadata();
        const a = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-markDark.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "ready", meta: { synaBoard: { key, slot: "markDark", round, name: x.name, from: kept.id } } });
        return { id: a.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      });
    } catch { /* l'ancienne version reste */ }
  }

  // Les images gardées d'avant restent quand seule une partie est refaite ; une image refaite et refusée ne garde
  // jamais l'ancienne à sa place si elle portait l'ancien logo (l'objet) : la planche montre alors le dessin de SINA.
  const before = (x.board.images ?? {}) as NonNullable<Route["board"]["images"]>;
  // Jamais une planche incomplète (règle du propriétaire ; essai réel du 21 novembre 2026 : le haut du site d'Aplomb,
  // refait trois fois et refusé, avait laissé la planche sans téléphone) : la grande scène et le haut du site refaits
  // et refusés gardent ceux d'avant. Le haut du site d'avant porte l'ancien logo : il est refait au choix (siteGarde).
  const siteGarde = wanted.has("site") && !made.get("site") && !!before.site;
  const keep = <K extends "logo" | "hero" | "object" | "signs" | "site">(k: K) => (wanted.has(k as ImageSlot) ? made.get(k as ImageSlot) ?? (k === "site" || k === "hero" ? before[k] : undefined) : before[k]) ?? undefined;
  // Pas de logo gardé : l'ancien logo, l'ancien objet qui le porte et l'ancienne marque de planche restent ensemble.
  if (skipCarriers) { if (before.logo) made.set("logo", before.logo); for (const k of ["object", "signs"] as const) if (before[k]) made.set(k, before[k]!); }
  const posts = (["post0", "post1", "post2"] as const).map((s, i) => (wanted.has(s) ? made.get(s) : before.posts?.[i]) ?? null);
  const logoNow = keep("logo");
  const own = o.clientLogo ? { id: o.clientLogo.id, w: o.clientLogo.w, h: o.clientLogo.h } : null;
  const markNow = own ? { mark: own, markDark: own } : wanted.has("logo") && !skipCarriers ? marks : { mark: before.mark, markDark: lightKept ?? before.markDark };
  const images = {
    ...(logoNow ? { logo: logoNow } : {}), ...(keep("hero") ? { hero: keep("hero")! } : {}),
    ...(keep("object") ? { object: keep("object")! } : {}), ...(keep("site") ? { site: keep("site")! } : {}), ...(keep("signs") ? { signs: keep("signs")! } : {}),
    ...(posts.some(Boolean) ? { posts } : {}), ...(imagery.look.trim() ? { look: imagery.look.trim().slice(0, 700) } : before.look ? { look: before.look } : {}),
    ...((logoNow || own) && markNow.mark ? { mark: markNow.mark } : {}), ...((logoNow || own) && markNow.markDark ? { markDark: markNow.markDark } : {}),
    ...(imagery.logo.trim() ? { logoIdea: imagery.logo.trim().slice(0, 900) } : before.logoIdea ? { logoIdea: before.logoIdea } : {}),
  };
  const any = !!(images.logo || images.mark || images.hero || images.object || images.signs || images.site || images.posts);
  const { images: _old, ...boardRest } = x.board as Route["board"] & { images?: unknown };
  const next = RouteSchema.safeParse({ ...x, board: { ...boardRest, ...(any ? { images } : {}) } });
  if (capped) issues.push(tag(L("le plafond annoncé a été atteint avant la fin de ses images.", "the announced cap was reached before its images were finished.")));
  return { route: next.success ? next.data : x, made: next.success ? made.size : 0, rejected, notes, issues, siteGarde };
}
