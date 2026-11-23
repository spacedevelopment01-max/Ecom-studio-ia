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
 * - chaque image est RELUE avant d'être montrée ; une image refusée (nom mal écrit, texte en trop, personne, sujet
 *   coupé, note sous 8) est redessinée avec toutes les raisons de ses refus, deux fois au plus (MAX_IMAGE_RETRIES) ;
 *   ce qui reste refusé n'est pas montré, et c'est dit au client ;
 * - une image dont la DEMANDE échoue chez le fournisseur n'est jamais renvoyée seule ; le plafond de dépense arrête tout,
 *   sans rien cacher ;
 * - les textes écrits dans une image viennent de la planche, lettre pour lettre, jamais du modèle ;
 * - aucune personne.
 */
import { peopleAllowed } from "../people-policy";
import { NOTE_DU_PROPRIETAIRE } from "./note-du-proprietaire";
import { noterRelecture, travailDeLImage } from "./juges";
import { REPRISES_MAX } from "./reprises";
import { aLaChargeDuStudio } from "../billing";
import { pngSansPerte } from "../media/signature-ia";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { getJob, type JobContext } from "../jobs";
import type { Journey } from "./journey";
import { L } from "../i18n-server";
import { CostCapReached } from "../ai/trace";
import { all, json as parseJson, one, run } from "../db";
import { deCote } from "../atelier/verification-photos";
import { assetData, getAsset, saveAsset } from "../library";
import { getJsonSetting } from "../settings";
import { BOARD_OBJECT_LABEL } from "./brand-board";
import { parleDePersonnes } from "./fiche";
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
/** Le vrai produit d'une boutique compte pour la grande scène et le haut du site (essai réel de Nadia, 23 novembre 2026) ; le logo :
 * la planche des logos déjà faits de la série et celle des 50 logos aimés (deux au plus). */
export const SLOT_REFERENCES: Record<ImageSlot, number> = { logo: 2, hero: 1, object: 1, signs: 1, site: 3, post0: 1, post1: 1, post2: 1 };

/**
 * Les images d'une planche se créent en DEUX temps (lot 2, 15 novembre 2026 : « images complètes pour la seule identité
 * choisie ») : chaque identité proposée reçoit son logo et sa grande scène ; l'objet, les signes et les trois
 * publications ne sont créés que pour l'identité que le client choisit (deux tiers des images ne servaient jamais).
 */
/** Reprises d'une image refusée à la relecture, avant de montrer la planche (jamais une planche incomplète). */
export const MAX_IMAGE_RETRIES = REPRISES_MAX;
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
  /**
   * Plus écrite par la directrice artistique (23 novembre 2026 : « comme une maison qui sent bon » a donné 6 maisons sur
   * 9 logos) : la ligne « La marque » du dessinateur du logo est écrite par le Studio (ligneDeLaMarque). Lue encore sur
   * les planches d'avant, jamais donnée au dessinateur.
   */
  logo: z.string().max(1600).default(""), hero: z.string().min(1).max(2200), object: z.string().min(1).max(2200), site: z.string().min(1).max(2200),
  /** Les signes de la marque posés sur de vrais objets de son monde (remplace les pictogrammes dessinés en code). */
  signs: z.string().max(2200).default(""),
  posts: z.array(z.string().min(1).max(2200)).length(3),
});
export type Imagery = z.infer<typeof ImagerySchema>;
/** Note minimale (sur 10) pour qu'une image soit montrée au client. */
export const NOTE_MIN = NOTE_DU_PROPRIETAIRE;
export const ImageReviewSchema = z.object({
  // Jusqu'à 12 avis : les 8 images d'une planche, plus les images jointes pour comparer (logo, logos aimés), que le
  // relecteur juge parfois aussi (ses avis sur elles sont ignorés).
  // defect : la nature du défaut d'une image refusée. Seul « texte » peut être contredit par la lecture elle-même ;
  // un défaut non précisé vaut « autre » (l'image reste refusée : c'est le côté sûr).
  images: z.array(z.object({ slot: z.string().max(12), seen: z.string().max(1500).default(""), score: z.number().min(0).max(10).optional(),
    // ok peut manquer (essai réel de Nadia, 23 novembre 2026) : la note décide alors seule, et jamais en dessous de 8.
    ok: z.boolean().optional(), read: z.array(z.string().max(400)).max(14).default([]), why: z.string().max(260).default(""), defect: z.enum(["texte", "personne", "coupe", "abime", "autre"]).default("autre") })).max(12).default([]),
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

/**
 * Règle des personnes (REGLE_PERSONNES, people-policy.ts) : sans photo d'une personne fournie par le client ni son accord
 * écrit (réglage « personnes autorisées »), aucune personne sur la planche ; avec, la scène peut en montrer une.
 */
const SANS_PERSONNE = "Aucune personne, aucun visage, aucune main.";
const SUJET_ENTIER = "Aucun objet supplémentaire. Le sujet est entier dans le cadre : rien n'est coupé.";
const noPerson = (personnes?: boolean) => (personnes ? SUJET_ENTIER : `${SANS_PERSONNE} ${SUJET_ENTIER}`);
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
/**
 * Consignes de base des photos, dites en positif, tirées des défauts vus le 21 novembre 2026 sur la marque finie
 * d'Aplomb (accord du propriétaire : « les consignes de bases doivent être claires ») : l'image est bonne du premier
 * coup, le relecteur vérifie derrière.
 */
export const BORD_A_BORD = "Image bord à bord : ni vignette, ni cadre arrondi, ni coins assombris.";
export const SITE_REMPLI = "Sous le titre et le bouton, la photo de campagne remplit l'écran du téléphone jusqu'en bas : aucune zone blanche vide.";
export const TEXTE_NET = "Le texte est net, sans ombre ni halo, posé sur une zone calme et unie de l'image, sans vapeur, brume ni fumée derrière lui.";
export const OBJETS_UTILES = "Chaque objet de la scène a un rôle : aucune étiquette, aucun carton ni cadre vierge posé sans raison.";
/**
 * Le VRAI produit du client (essai réel de Nadia, 23 novembre 2026 : ses trois photos n'étaient jamais jointes, et les
 * grandes scènes de « Pénombre » montraient un pot de confiture sans mèche, à l'étiquette vierge). Ses photos sont jointes
 * au dessinateur de la grande scène et du haut du site, comme produit à reproduire fidèlement, et au relecteur, qui compare.
 */
export const PRODUIT_FIDELE = "La photo jointe « product » montre le VRAI produit du client : c'est lui, et lui seul, que montre l'image, reproduit fidèlement (même forme, même contenant, même matière, mêmes couleurs, mêmes détails qui le font reconnaître, étiquette telle qu'elle est). Il est reconnaissable au premier regard pour ce qu'il est, entier dans le cadre. Aucun autre produit à sa place.";
export const PRODUIT_A_COMPARER = "La dernière image jointe, « produit », est la photo du VRAI produit du client : ne la juge pas, compare. Le produit montré doit être le sien, reconnaissable au premier regard pour ce qu'il est, avec ce qui le définit (sa matière, les parties qui le distinguent d'un autre objet). Un autre produit, un produit qui ressemble à autre chose, une partie qui le définit absente, une étiquette vierge ou un contenant différent de sa photo sont un défaut (defect « autre ») : dis lequel dans why.";
/** Photos de produit du client, pour une boutique : ses photos envoyées et vérifiées (jamais son logo, ni une inspiration). */
export function photosDuProduitIds(projectId: string, max = 3): string[] {
  const rows = all<{ id: string; meta: string | null; width: number | null; height: number | null }>("SELECT id, meta, width, height FROM assets WHERE project_id=? AND deleted_at IS NULL AND kind='image' AND origin='upload' AND COALESCE(role,'') NOT LIKE 'logo%' AND COALESCE(status,'')!='rejected' ORDER BY created_at", projectId);
  return rows.filter((r) => {
    const m = parseJson<Record<string, unknown>>(r.meta ?? "{}", {});
    if (m.inspiration || deCote(m)) return false;
    return (r.width == null || r.width >= 300) && (r.height == null || r.height >= 300);
  }).slice(0, max).map((r) => r.id);
}
/** Les photos de produit côte à côte sur blanc (une seule image jointe « product »). Aucune : null. Gratuit, sans IA. */
export async function planchePhotosDuProduit(projectId: string): Promise<Buffer | null> {
  const tiles = (await Promise.all(photosDuProduitIds(projectId).map(async (id) => { const a = getAsset(id); if (!a) return null; try { return await sharp(assetData(a)).rotate().resize(512, 512, { fit: "contain", background: "#FFFFFF" }).flatten({ background: "#FFFFFF" }).png().toBuffer(); } catch { return null; } }))).filter(Boolean) as Buffer[];
  if (!tiles.length) return null;
  if (tiles.length === 1) return tiles[0];
  return sharp({ create: { width: 512 * tiles.length, height: 512, channels: 3, background: "#FFFFFF" } }).composite(tiles.map((input, i) => ({ input, left: 512 * i, top: 0 }))).png().toBuffer();
}
/**
 * Le refus du client, mot pour mot, pour le dessinateur du logo (accord du propriétaire du 21 novembre 2026 : une seule
 * ligne, le refus du client lui-même, sans autre consigne) : seulement ses phrases de refus, telles qu'il les a écrites.
 */
/** Les tournures d'un refus du client (sa règle du 21 novembre 2026 : sa phrase de refus, mot pour mot, au dessinateur). */
const REFUS = new RegExp([
  // N'importe où dans la phrase.
  "(?<![\\p{L}])(ne veu[tx]|ne voulons|pas de|surtout pas|jamais|refuse|n['’]aime pas|j['’]aime pas|déteste|non à|hors de question)(?![\\p{L}])",
  "(?<![\\p{L}])pas d['’]",
  // En tête de phrase seulement : « sans stress », au milieu d'un goût, n'est pas un refus.
  "^\\s*(aucune?s?|sans|évite[rsz]?)(?![\\p{L}])",
].join("|"), "iu");
/** La formule du propriétaire, la même pour tous les clients (21 novembre 2026) : jamais le genre deviné, jamais ses mots changés. */
export const REFUS_FORMULE = "Il ne veut surtout pas";
const sansPonctuation = (t: string) => t.normalize("NFC").toLowerCase().replace(/[’ʼ`´]/g, "'").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
/**
 * La phrase de refus du client pour le dessinateur du logo, mot pour mot, chaque refus une seule fois (essai réel de
 * Nadia, 23 novembre 2026 : sa phrase arrivait deux fois, avec « Il ne veut pas » ajouté, et son refus des mains et du
 * visage arrivait au logo). `words` : ses réponses libres, dont seules les phrases de refus sont prises (un refus de
 * personnes n'y est pris que s'il parle du logo) ; `refus` : les refus de sa fiche qui valent pour le logo
 * (refusPourLeLogo), pris en entier. Les lignes « Il ne veut pas : … » et « Il aime : … » mises en forme par le Studio
 * (goutsPour) sont relues comme un refus noté et un goût. Un refus contenu dans un autre n'est gardé qu'une fois : le plus long.
 */
export function clientRefusal(words?: string | null, refus: readonly string[] = []): string {
  // Une ligne par chose dite (sa fiche) : un goût sur une ligne voisine n'est jamais pris avec le refus.
  // « Pas d'outil », « Aucune goutte », « Sans goutte d'eau », « J'aime pas », « Je déteste », « Évite… » étaient manqués
  // (audit de la marque, 22 novembre 2026) : le relecteur refusait le logo après coup, qui était redessiné et repayé.
  const libres: string[] = [], notes: string[] = [];
  for (const line of (words ?? "").split(/\n+/)) {
    const m = /^\s*Il ne veut pas\s*:\s*(.+)$/iu.exec(line);
    if (m) notes.push(m[1]);
    else if (!/^\s*Il aime\s*:/iu.test(line)) libres.push(line);
  }
  const pourLeLogo = (t: string) => !parleDePersonnes(t) || /(?<![\p{L}])logos?(?![\p{L}])/iu.test(t);
  const candidats = [
    ...libres.flatMap((l) => l.split(/(?<=[.!?])\s+/)).map((t) => t.trim()).filter((t) => t && REFUS.test(t) && pourLeLogo(t)),
    ...notes.map((t) => t.trim()).filter((t) => t && pourLeLogo(t)),
    ...refus.map((t) => t.trim()).filter(Boolean),
  ];
  const gardes: string[] = [];
  for (const t of candidats) {
    const n = sansPonctuation(t);
    if (!n || gardes.some((g) => sansPonctuation(g).includes(n))) continue;
    for (let i = gardes.length - 1; i >= 0; i--) if (n.includes(sansPonctuation(gardes[i]))) gardes.splice(i, 1);
    gardes.push(t);
  }
  // Coupé entre deux refus, jamais au milieu d'une phrase.
  const tenus: string[] = [];
  for (const g of gardes) if ([...tenus, g].join(" ").length <= 600) tenus.push(g);
  return tenus.length ? `${REFUS_FORMULE} : ${tenus.map((t) => `« ${t} »`).join(" ; ")}` : "";
}
export const SIGNS_LINE = "Une vraie photographie haut de gamme, comme dans le livre d'identité d'une grande agence : les signes de la marque sont appliqués sur de vrais objets de son monde, en vraies matières (impression, broderie, gravure, peinture, sérigraphie). Jamais une icône plate, jamais un pictogramme, jamais une grille de cases ni un nuancier dessiné.";
/** Le nom épelé (« P, e, l, a, g, e ») : sans modèle d'image, c'est ce qui tient les lettres exactes. */
export const spell = (name: string) => [...name.normalize("NFC")].map((c) => (c === " " ? "(espace)" : c)).join(", ");
/**
 * Gestes de logo déjà pris par des marques faites avec le Studio : jamais redonnés (la vague qui coupe le nom, à moitié
 * dans l'eau, est celle de « Pulpe », validée par le propriétaire le 13 novembre 2026).
 */
/**
 * Le trait sous le nom, avec PARCIMONIE (propriétaire, 20 novembre 2026 : « j'ai toujours les traits en dessous »,
 * puis « il doit juste être là par parcimonie ») : jamais interdit, mais un seul logo au plus par série le porte. Sur 43
 * logos du Studio d'essai, presque toutes les marques calmes sortaient avec le signe en haut, le nom, un trait souligné.
 */
/**
 * La planche des 50 logos aimés du propriétaire : jointe au dessinateur du logo, annoncée « seulement comme exemples »
 * (décision du 21 novembre 2026), et au relecteur comme niveau attendu. Absente : null.
 */
export async function planchedesLogosAimes(): Promise<Buffer | null> {
  try { return await sharp(fs.readFileSync(path.resolve(process.cwd(), "docs/sina-savoir/logos-aimes/planche-des-50.jpg"))).resize(1200, 1200, { fit: "inside" }).jpeg({ quality: 80 }).toBuffer(); } catch { return null; }
}
export const LOGO_TRAIT_DEJA_PRIS = "Un des logos déjà faits a un trait, un filet ou une ligne près du nom : celui-ci n'en a pas.";
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
/** Seconde reprise d'une photo : moins d'écritures. Jamais pour un logo (essai réel de Nadia, 23 novembre 2026 : hors sujet). */
export const FAIS_PLUS_SIMPLE = "\nFais plus simple : retire de l'image tout élément qui porte une écriture non demandée (étiquette, emballage, enseigne, écran) ou laisse-le vierge.";
export const fixLine = (whys: string[], attempt: number, /** Le genre d'image : un logo reçoit toutes les raisons, sans la ligne des écritures. */ slot?: ImageSlot): string => {
  const list = [...new Set(whys.filter((w) => !TECHNIQUE.test(w)).map((w) => w.replace(/\s+/g, " ").trim().slice(0, 300)).filter(Boolean))];
  const simple = attempt > 1 && slot !== "logo" ? FAIS_PLUS_SIMPLE : "";
  if (!list.length) return simple;
  const head = list.length > 1
    ? `\nCORRECTION : les images précédentes ont été refusées pour ces raisons, à corriger TOUTES à la fois (corriger la dernière ne doit pas ramener une faute déjà corrigée) :\n${list.map((w, i) => `${i + 1}. « ${w} »`).join("\n")}`
    : `\nCORRECTION : une première image a été refusée pour cette raison : « ${list[0] ?? ""} ». Refais l'image en corrigeant ce point.`;
  return head + simple;
};

/** Consigne complète d'une image : la direction globale, la consigne de la directrice artistique, les lignes fixes du Studio. */
export function imagePrompt(slot: ImageSlot, x: Route, imagery: Imagery, o: {
  logo: boolean;
  /** Ses mots sur l'image voulue : seules ses phrases de refus vont au dessinateur du logo (clientRefusal). */
  refusal?: string | null;
  /** La phrase de refus déjà écrite par le Studio (clientRefusal, refus de sa fiche compris) : prise telle quelle. */
  refusLogo?: string | null;
  /** L'idée en mots simples, si elle ne vient pas de la planche (contrôlée comme elle). */
  idee?: string | null;
  /** Personnes autorisées pour ce client (règle des personnes). */ personnes?: boolean;
  /** Photo du vrai produit jointe (grande scène, haut du site). */ produit?: boolean;
} = { logo: true }): string {
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
      // Ce que la marque est (son idée, son ton) : écrit par le Studio, jamais par la directrice artistique.
      ((l) => (l ? `La marque : ${l}` : ""))(ligneDeLaMarque(x, o.idee)),
      paletteLine(x),
      `Typographie de la marque : un caractère ${FONT_CHARACTER[x.fonts.heading.replace(/_[ni]\d$/, "")] ?? "de titres"} (dans l'esprit de ${fontFamily(x.fonts.heading)}) ; tu peux le redessiner à ta façon.`,
      "Un seul logo, centré, à plat, net et lisible même en tout petit, sur un fond BLANC uni jusqu'aux bords, avec de l'air autour. Ni maquette, ni photo, ni cadre, ni ombre portée.",
      o.refusLogo != null ? o.refusLogo : clientRefusal(o.refusal),
    ].filter(Boolean).join("\n");
  }
  const brief = slot === "hero" ? imagery.hero : slot === "object" ? imagery.object : slot === "signs" ? imagery.signs : slot === "site" ? imagery.site : imagery.posts[Number(slot.slice(4))];
  const post = slot.startsWith("post"), withLogo = (slot === "object" || slot === "site" || slot === "signs" || post) && o.logo;
  // Le nom est porté par le logo fourni ; sans logo, il est écrit comme les autres textes.
  const written = slot === "hero" ? [] : texts.filter((t) => !withLogo || !same(t, x.name)).filter((t, i) => slot === "object" || slot === "site" || i === 0);
  // La maquette du site : ses mots sont le titre, le bouton et les entrées du menu ; rien d'autre n'est écrit.
  return [
    look ? `Direction artistique : ${look}` : "", brief.trim(), paletteLine(x),
    (slot === "hero" || slot === "site") && o.produit ? PRODUIT_FIDELE : "",
    withLogo ? "Le logo fourni en image de référence est reproduit tel quel, à la place indiquée : il n'est ni redessiné, ni recoloré, et aucune de ses lettres ne change." : "",
    slot === "site" ? "Maquette de présentation d'un site, au niveau des plus beaux sites primés de 2026 : UN téléphone récent, entier, vu bien de face, posé sur un fond uni très doux, avec une ombre légère ; son écran montre le haut de la page d'accueil décrit ci-dessus (l'heure et les signes du téléphone en haut, puis l'en-tête du site). Le titre est TRÈS grand et occupe une vraie place sur l'écran ; un seul bouton ; très peu de mots. Le logo de l'en-tête est GRAND et net (au moins un tiers de la largeur de l'écran), recopié tel quel depuis l'image de référence, chaque lettre du nom lisible. Mise en page nette et précise : typographie soignée, alignements exacts, de l'air. Rien autour du téléphone : ni main, ni table, ni décor." : "",
    slot === "site" ? `Si la maquette montre des tuiles, des pastilles ou des entrées de menu, elles ne portent QUE ces mots, écrits tels quels : ${x.board.site.menu.length ? x.board.site.menu.map((t) => `« ${t} »`).join(", ") : "aucun (pas de tuile ni de pastille)"}. N'invente aucune prestation, aucune catégorie, aucune offre.` : "",
    post ? "Visuel de publication pour un réseau social, en portrait, bord à bord : aucun cadre d'application, aucun bouton, aucun pseudonyme." : "",
    // Une publication est vue par quelqu'un qui ne connaît pas la marque : elle la signe (retour du propriétaire du
    // 16 novembre 2026, devant trois publications sans nom : « j'ai pas compris l'angle marketing des images »).
    post && withLogo ? "Le logo est posé en PETIT dans un coin calme de l'image, entier, net et lisible, sans gêner le texte. Sur une zone foncée de l'image, il est dans sa version claire (ses parties foncées en clair) : jamais un logo foncé sur du foncé." : "",
    slot === "signs" ? SIGNS_LINE : "",
    BORD_A_BORD, slot === "site" ? SITE_REMPLI : "", post ? TEXTE_NET : "", slot === "object" || slot === "signs" || post ? OBJETS_UTILES : "",
    (slot === "object" || slot === "site") && !withLogo ? NO_INVENTED_MARK : "",
    slot === "signs" ? (withLogo ? "Aucun autre texte que le logo : aucune lettre, aucun chiffre, aucun mot, aucun filigrane." : NO_TEXT) : written.length ? exact(written) : NO_TEXT, noPerson(o.personnes), NO_OTHER_BRAND,
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
  logo: { fr: "le logo", en: "the logo" }, hero: { fr: "la grande image", en: "the main image" }, object: { fr: "l'image de l'objet", en: "the object image" }, signs: { fr: "l'image des signes", en: "the signs image" }, site: { fr: "le haut de ton site", en: "your site mock-up" },
  post0: { fr: "la première publication", en: "the first post" }, post1: { fr: "la deuxième publication", en: "the second post" }, post2: { fr: "la troisième publication", en: "the third post" },
};
export const ROLE_FOR_REVIEW: Record<ImageSlot, string> = {
  logo: "le logo de la marque", hero: "la grande image de la marque (aucun texte attendu)", object: "l'objet de la marque, avec le logo posé dessus : EXACTEMENT celui de l'image « logo » (même signe, même dessin de lettres, même graisse) ; une autre police est un défaut", signs: "les signes de la marque posés sur de vrais objets de son monde, le logo fourni compris (aucun autre texte attendu ; une icône plate ou un pictogramme est un défaut)", site: "la maquette du haut de la page d'accueil, dans un téléphone entier vu de face : elle doit être BELLE et donner envie, comme la page d'un studio de design primé (un titre TRÈS grand au caractère affirmé, une photo de campagne au sujet très grand, toute l'image dans la teinte de la marque, un seul bouton, très peu de mots, le logo fourni tel quel et net) ; un titre petit ou timide, une photo d'ambiance banale, une mise en page pauvre, vide ou confuse, un logo flou sont des défauts (defect « autre »). Le bouton principal porte son texte, écrit DANS le bouton : un bouton vide, avec seulement une flèche, est un défaut (defect « autre »). Le logo de l'en-tête est CELUI de la marque (compare-le à l'image « logo » fournie avec les autres) : même signe, même dessin de lettres ; sur un écran sombre, il est dans sa version claire (ses parties foncées en clair), et une nuance de couleur différente n'est pas un défaut. Seul un AUTRE signe ou un autre dessin du nom à la place du sien est un défaut (defect « autre »). Les petits mots d'interface (l'heure, une ligne sous le titre, une entrée secondaire) sont normaux",
  post0: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)", post1: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)", post2: "une publication (le logo de la marque, quand il est fourni, y figure en petit : ce n'est pas un texte en trop)",
};

type Made = { id: string; w: number; h: number };
/** Ce que le client voit à la place d'une image non gardée (dit tel quel, jamais un dessin qui n'existe pas). */
const instead = (x: Route, slot: ImageSlot): string => slot === "signs" ? "les signes restent décrits en mots" : slot === "logo" ? (x.board.images?.logo ? "je garde celui d'avant" : "tu vois ton nom dessiné à la place") : slot === "site" ? "je ne le montre pas" : "je ne la montre pas";
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
/**
 * Planche des logos déjà dessinés dans la série, gardés ou refusés, en grille sur blanc, donnée au dessinateur. Tous,
 * sans limite (essai réel de Nadia, 23 novembre 2026 : seuls les 4 derniers logos gardés y allaient). Rien : null.
 */
export async function logoSheet(logos: Buffer[]): Promise<Buffer | null> {
  const T = 512, tiles = (await Promise.all(logos.map((b) => sharp(b).flatten({ background: "#FFFFFF" }).resize(T, T, { fit: "contain", background: "#FFFFFF" }).png().toBuffer().catch(() => null)))).filter(Boolean) as Buffer[];
  if (!tiles.length) return null;
  const cols = Math.ceil(Math.sqrt(tiles.length)), rows = Math.ceil(tiles.length / cols);
  return sharp({ create: { width: T * cols, height: T * rows, channels: 3, background: "#FFFFFF" } }).composite(tiles.map((input, i) => ({ input, left: T * (i % cols), top: T * Math.floor(i / cols) }))).png().toBuffer();
}

/** Ce qu'on appelle chaque image d'une planche, quand elle manque. */
const MANQUE_LABEL: Record<string, { fr: string; en: string }> = { logo: { fr: "le logo", en: "the logo" }, hero: { fr: "la grande scène", en: "the main scene" }, site: { fr: "le haut du site", en: "the site header" } };
/**
 * Les images sans lesquelles une planche n'est jamais montrée (règle du propriétaire : « Jamais une planche incomplète :
 * une image refusée est refaite avant d'être montrée ») : le logo (sauf quand le client garde le sien), la grande scène,
 * le haut du site. Rien ne manque : [].
 */
export function manqueDeLaPlanche(x: { board?: { images?: { logo?: unknown; hero?: unknown; site?: unknown } } }, logoDuClient = false): ImageSlot[] {
  const im = x.board?.images;
  return PROPOSAL_SLOTS.filter((s) => (s === "logo" ? !logoDuClient && !im?.logo : !im?.[s as "hero" | "site"]));
}
/** « le logo et la grande scène » (en français ou en anglais). */
export const listeDuManque = (manque: readonly string[]): string => {
  const w = manque.map((s) => L(MANQUE_LABEL[s]?.fr ?? s, MANQUE_LABEL[s]?.en ?? s));
  return w.length > 1 ? `${w.slice(0, -1).join(", ")} ${L("et", "and")} ${w[w.length - 1]}` : w[0] ?? "";
};
/**
 * Ce que SINA dit d'une planche gardée de côté : ce qui manque, pourquoi (les raisons simples du Studio), et la suite :
 * refaire ce qui manque, à la charge du Studio (une image refusée par le relecteur est une erreur de SINA : partie 13).
 */
export function phrasePlancheGardee(x: { key: string; name: string }, manque: readonly string[], raisons: string[] = []): string {
  // Seulement la raison simple du Studio pour chaque image (jamais « tu vois ton nom dessiné », qui n'est plus vrai ici).
  const simple = (r: string) => {
    const t = r.replace(/^(Identité|Identity) [A-D]\s*:\s*/, "");
    const kept = /je n'ai pas gardé (.+?) \((.+)\) ;/.exec(t) ?? /I did not keep (.+?) \((.+)\);/.exec(t);
    if (kept) return `${kept[1]} : ${kept[2].replace(/\.+$/, "")}`;
    const made = /je n'ai pas pu créer (.+?) ;/.exec(t) ?? /I could not create (.+?);/.exec(t);
    if (made) return L(`${made[1]} : la création a échoué chez le fournisseur`, `${made[1]}: the provider failed`);
    return /relire|plafond|review|cap/i.test(t) ? t.replace(/[.\s]+$/, "") : "";
  };
  const why = [...new Set(raisons.map(simple).filter(Boolean))].slice(0, 3).join(" ; ");
  return L(
    `Identité ${x.key} « ${x.name} » : je ne te montre pas cette planche, il lui manque ${listeDuManque(manque)}${why ? ` (${why})` : ""}. Je ne montre jamais une planche à trou : je peux refaire ce qui manque, à ma charge, rien n'est compté sur ton budget.`,
    `Identity ${x.key} "${x.name}": I am not showing this board, it is missing ${listeDuManque(manque)}${why ? ` (${why})` : ""}. I never show an incomplete board: I can redo what is missing, at my expense, nothing is taken from your budget.`,
  );
}

/** Le logo que le client garde (sa propre image, déposée dans le Studio). */
export type ClientLogo = { id: string; w: number; h: number; data: Buffer };
export async function clientLogoOf(projectId: string): Promise<ClientLogo | null> {
  const row = one<{ id: string }>("SELECT id FROM assets WHERE project_id=? AND role='logo' AND origin='upload' AND deleted_at IS NULL ORDER BY created_at DESC", projectId);
  const a = row ? getAsset(row.id) : undefined;
  if (!a) return null;
  try { const data = assetData(a), meta = await sharp(data).metadata(); return { id: a.id, w: meta.width ?? 1024, h: meta.height ?? 1024, data }; } catch { return null; }
}
export type BoardImagesResult = { route: Route; made: number; rejected: number; notes: string[]; issues: string[]; /** Haut du site refait et refusé : celui d'avant est gardé (il porte l'ancien logo). */ siteGarde?: boolean;
  /** Tous les logos dessinés ici, gardés ou refusés, dans l'ordre : la série les donne aux dessins suivants. */ logos: Buffer[];
  /** Images de la planche qui manquent encore après les reprises (logo, grande scène, haut du site) : la planche n'est pas montrée. */ manque?: ImageSlot[] };

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

/** Part de pixels transparents au-delà de laquelle une photo est refusée sans la relire (1 pixel sur 1 000). */
export const PART_TRANSPARENTE_MAX = 0.001;
/**
 * Contrôle sans IA, avant de payer la relecture : une photo doit être pleine. Panne du 21 novembre 2026 : créées avec
 * des images jointes, des photos revenaient d'OpenAI en partie transparentes (brume blanche ou taches sombres selon le
 * fond). Compte les pixels dont l'opacité n'est pas complète ; une image sans couche de transparence est pleine.
 */
export async function photoTransparente(png: Buffer): Promise<{ transparente: boolean; part: number }> {
  try {
    const meta = await sharp(png).metadata();
    if (!meta.hasAlpha) return { transparente: false, part: 0 };
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const n = info.width * info.height, c = info.channels;
    let t = 0;
    for (let i = 0; i < n; i++) if (data[i * c + c - 1] < 250) t++;
    const part = n ? t / n : 0;
    return { transparente: part > PART_TRANSPARENTE_MAX, part };
  } catch { return { transparente: false, part: 0 }; }
}

/**
 * Deux autres contrôles sans IA avant de payer la relecture (rapport sur le coût des images du 22 novembre 2026,
 * partie 3.4) : une image vide ou presque d'une seule couleur, et une image dans le mauvais sens (paysage, carré, portrait). Seulement sur
 * une vraie image (512 points au moins de côté) : une vignette n'est pas jugée. Rend la raison, ou null.
 */
export async function photoVideOuMalFormee(png: Buffer, aspect: string): Promise<string | null> {
  try {
    const meta = await sharp(png).metadata();
    const w = meta.width ?? 0, h = meta.height ?? 0;
    if (Math.min(w, h) < 512) return null;
    const [aw, ah] = aspect.split(":").map(Number);
    // Le sens seulement (paysage, carré, portrait) : un 4:5 est dessiné en 2:3 puis recadré, ce n'est pas une faute.
    const sens = (r: number) => (r > 1.1 ? 1 : r < 0.9 ? -1 : 0);
    if (aw && ah && sens(w / h) !== sens(aw / ah)) return L(`l'image n'a pas le format demandé (${aspect})`, `the image is not in the requested format (${aspect})`);
    const st = await sharp(png).flatten({ background: "#ffffff" }).resize(64, 64, { fit: "fill" }).stats();
    if (st.channels.slice(0, 3).every((c) => c.stdev < 4)) return L("l'image est vide, presque d'une seule couleur", "the image is empty, almost a single colour");
    return null;
  } catch { return null; }
}

/**
 * Crée, relit et pose les images d'UNE planche. Rend la route avec `board.images` (seulement les images acceptées),
 * les notes de la chaîne, et ce qui est dit au client pour chaque image non gardée.
 */
/** La direction artistique écrite pour la planche au premier temps (même tâche de création) : reprise sans la repayer. */
export function proposalImagery(j: Journey, x: Route): Imagery | undefined {
  const id = j.identities?.chainJobId, round = j.identities?.round;
  if (!id || !round) return undefined;
  try {
    const cp = parseJson<Record<string, unknown>>(getJob(id)?.checkpoint ?? "{}", {});
    const key = Object.keys(cp).find((k) => k.startsWith(`brand:imagery:${round}:${x.key}`));
    const r = key ? ImagerySchema.safeParse(cp[key]) : null;
    return r?.success ? r.data : undefined;
  } catch { return undefined; }
}


/**
 * Les mots concrets qui ne vont jamais dans la ligne « La marque » du dessinateur du logo (essai réel de Nadia, 23 novembre
 * 2026 : « comme une maison qui sent bon », « la chaleur d'une maison le soir », « la maison chaude au retour » ont donné
 * des maisons sur 6 logos sur 9) : un objet, un lieu, un moment y deviennent un dessin.
 */
export const MOTS_CONCRETS = ["maison", "chez", "foyer", "flamme", "feu", "mèche", "pot", "couvercle", "soir", "soirée", "hiver", "nuit", "fenêtre", "marché"];
/** Une comparaison est une image : jamais dans la ligne « La marque ». */
export const COMPARAISON = /(?<![\p{L}])(comme|tel(le)?s? que|pareil(le)?s? à|à la manière)(?![\p{L}])/iu;
const MOTS_VIDES = new Set(["avec", "pour", "dans", "sans", "près", "tout", "toute", "tous", "toutes", "très", "plus", "leur", "leurs", "vous", "nous", "votre", "notre", "elle", "elles", "cette", "entre", "chaque", "bien", "aussi", "comme", "fait", "faits", "faite", "faites"]);
/** Le mot sans accent, sans pluriel ni e final : « Flammes », « flamme » et « flammé » se rejoignent. */
const racine = (w: string) => w.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[sx]$/, "").replace(/e$/, "");
const mots = (t: string) => t.split(/[^\p{L}]+/u).filter(Boolean);
/**
 * Les mots du produit et du métier du client, pris dans sa ligne de métier et l'objet de sa planche : sa catégorie (le
 * premier mot de la ligne de métier, « Bougies ») reste permise, le reste (matières, gestes, lieu) ne l'est pas.
 */
function motsDuClient(x: Pick<Route, "board">): Set<string> {
  const ligne = mots(x.board.descriptor ?? ""), categorie = ligne[0] ? racine(ligne[0]) : "";
  const objet = mots(BOARD_OBJECT_LABEL[x.board.object?.kind as keyof typeof BOARD_OBJECT_LABEL]?.fr ?? "").filter((w) => w.length >= 3);
  return new Set([...ligne.filter((w) => w.length >= 4 && !MOTS_VIDES.has(w.toLowerCase())), ...objet].map(racine).filter((r) => r && r !== categorie));
}
/** Contrôle gratuit de l'idée donnée au dessinateur du logo : la raison du refus (une comparaison, un mot concret), ou null. */
export function ideeConcrete(t: string, x: Pick<Route, "board">): string | null {
  const c = COMPARAISON.exec(t);
  if (c) return `une comparaison (« ${c[0]} »)`;
  const interdits = new Set([...MOTS_CONCRETS.map(racine), ...motsDuClient(x)]);
  const w = mots(t).find((m) => interdits.has(racine(m)));
  return w ? `un mot concret (« ${w} »)` : null;
}
/**
 * L'idée donnée au dessinateur du logo : le champ « l'idée en mots simples » de la planche (écrit avec l'identité) ; sur
 * une planche d'avant, ce qu'elle croit et ce contre quoi elle se bat. Refusée par le contrôle gratuit : rien (seul le ton reste).
 */
export function ideeDuDessinateur(x: Route, idee?: string | null): { texte: string; refus?: string } {
  const net = (t?: string | null) => (t ?? "").replace(/\s+/g, " ").trim().replace(/[.;,\s]+$/, "");
  const bas = (t: string) => t.replace(/^./, (c) => c.toLowerCase());
  const que = (t: string) => t.replace(/(?<![\p{L}])que ([aeiouyhéèêàâîôû])/giu, "qu'$1");
  const i = x.board.idea;
  const brute = net(idee) || net(i?.simple) || [net(i?.belief) ? que(`elle croit que ${bas(net(i.belief))}`) : "", net(i?.enemy) ? `elle se bat contre ${bas(net(i.enemy))}` : ""].filter(Boolean).join(", et ");
  if (!brute) return { texte: "" };
  const refus = ideeConcrete(brute, x);
  return refus ? { texte: "", refus } : { texte: `${brute.replace(/^./, (c) => c.toUpperCase())}.` };
}
/**
 * La ligne « La marque » du dessinateur du logo, TOUJOURS écrite par le Studio, jamais par la directrice artistique
 * (décision du 23 novembre 2026) : l'idée en mots simples, contrôlée sans IA, puis le ton. Ce que la règle du 21 novembre
 * permet (« le nom, le métier, l'idée et le ton de la marque ») ; aucun mot de style.
 */
export function ligneDeLaMarque(x: Route, idee?: string | null): string {
  const ton = x.tone?.adjectives?.map((a) => a.trim()).filter(Boolean) ?? [];
  return [ideeDuDessinateur(x, idee).texte, ton.length ? `Son ton : ${ton.join(", ")}.` : ""].filter(Boolean).join(" ");
}

export async function runBoardImages(o: {
  ctx: JobContext; ai: ChainAi; who: { userId: string; projectId: string }; brief: string; kind: "produits" | "services"; route: Route; round: number;
  /** Seulement ces images (les autres images déjà gardées restent telles quelles) ; par défaut, toutes. */
  slots?: ImageSlot[];
  /**
   * TOUS les logos déjà dessinés dans la même série pour ce client, gardés ou refusés, dans l'ordre : donnés au dessinateur
   * pour qu'il en fasse un complètement différent (essai réel de Nadia, 23 novembre 2026 : seuls les gardés y allaient).
   */
  madeLogos?: Buffer[];
  /** Parmi eux, les logos gardés (montrés au client) : le trait près du nom n'est permis qu'une fois parmi eux. Par défaut : madeLogos. */
  keptLogos?: Buffer[];
  /** La phrase de refus du client pour le dessinateur du logo, déjà écrite par le Studio (clientRefusal) ; à défaut, tirée de `gouts`. */
  refusLogo?: string | null;
  /** Ce que le client a dit de l'image qu'il veut (ses mots, refus compris) : donné au RELECTEUR des images, jamais au
   * dessinateur du logo (propriétaire, 21 novembre 2026 : « enlève la 7 »). */
  gouts?: string | null;
  /**
   * L'idée en mots simples à donner au dessinateur du logo, quand elle ne vient pas de la planche ; contrôlée comme elle
   * (aucune comparaison, aucun mot concret). Jamais la consigne de SINA (21 novembre 2026 : « pas de consigne autre que
   * les 50 logos en exemple »).
   */
  logoLine?: string | null;
  /** Direction artistique déjà écrite pour cette planche (premier temps) : reprise telle quelle, jamais repayée. */
  imagery?: Imagery;
  /** Logo GARDÉ par le client : jamais redessiné ; il est la marque de la planche et se pose sur ce qui le porte. */
  clientLogo?: ClientLogo | null;
}): Promise<BoardImagesResult> {
  const { ctx, ai, route: x, round } = o, key = x.key, notes: string[] = [], issues: string[] = [];
  // Règle des personnes : autorisées seulement avec une photo d'une personne fournie par le client ou son accord écrit.
  const personnes = peopleAllowed(o.who.projectId);
  const wanted = new Set<ImageSlot>(o.slots?.length ? o.slots : CREATED_SLOTS);
  if (o.clientLogo) wanted.delete("logo");
  // Un nouvel essai d'une partie des images a sa propre étape (jamais la réponse en cache du premier essai).
  const pass = o.slots?.length ? `:${[...wanted].join("+")}` : "";
  const tag = (line: string) => L(`Identité ${key} : ${line}`, `Identity ${key}: ${line}`);
  // La direction artistique ne reçoit rien des autres logos, ni en image ni en mots (16 novembre 2026 : « ça doit repartir
  // de 0 pour les logos, le seul truc qu'il a c'est le nom et l'identité de marque, et c'est tout »). Seul le dessinateur
  // reçoit les logos déjà faits de CETTE série, pour en faire un complètement différent (20 novembre 2026, plus bas).
  // Le logo seul, refait sans direction d'origine retrouvée : rien n'est réécrit ni payé, la ligne « La marque » est écrite
  // par le code depuis la planche (la direction artistique n'apportait que cette ligne au dessinateur, audit 2.3).
  const logoSeul = !o.imagery && wanted.size === 1 && wanted.has("logo");
  const imagery = o.imagery ?? (logoSeul ? { look: "", logo: "", hero: "", object: "", site: "", signs: "", posts: ["", "", ""] } : undefined) ?? await ctx.step(`brand:imagery:${round}:${key}${pass}`, () => ai.ask(`imagery-${round}-${key}${pass}`, { kind: "imagery", system: P.imagerySystem(o.kind, personnes), schema: ImagerySchema, prompt: `${o.brief}\n\n# La route à mettre en images\n${imageryBrief(x)}` }));

  const made = new Map<ImageSlot, Made>();
  const bufferOf = (slot: ImageSlot): Buffer | null => { const m = made.get(slot), a = m ? getAsset(m.id) : undefined; return a ? assetData(a) : null; };
  let capped = false;
  type Refs = { logo?: Buffer | null; scene?: Buffer | null; avoid?: Buffer | null; product?: Buffer | null };
  // Le vrai produit d'une boutique (ses photos envoyées), joint à la grande scène et au haut du site, et au relecteur.
  const produit = o.kind === "produits" ? await planchePhotosDuProduit(o.who.projectId).catch(() => null) : null;
  // Ce que le relecteur a dit de chaque image gardée (sa note, ses mots) : c'est ce que SINA en dira, rien d'autre.
  const verdicts = new Map<ImageSlot, { score?: number; words: string }>();
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
  // Une image refaite parce qu'elle était ratée est une reprise du Studio : jamais débitée au client (règle du propriétaire).
  const make = async (slot: ImageSlot, refs: Refs, prompt: string, retry = ""): Promise<void> => (retry ? aLaChargeDuStudio(() => fabrique(slot, refs, prompt, retry)) : fabrique(slot, refs, prompt, retry));
  const fabrique = async (slot: ImageSlot, refs: Refs, prompt: string, retry = "") => {
    if (capped) return;
    if (!retry) calls.set(slot, { refs, prompt });
    try {
      made.set(slot, await ctx.step(`brand:image:${round}:${key}:${slot}${pass}${retry}`, async (): Promise<Made> => {
        // Le logo passe par l'usage « logo » : le modèle imposé par le propriétaire (logo-policy.ts), sans secours.
        const data = await ai.draw(`image-${round}-${key}-${slot}${pass}${retry}`, { prompt, aspect: SLOT_ASPECT[slot], logo: refs.logo ? await onWhite(refs.logo) : null, scene: refs.scene ?? null, avoid: refs.avoid ?? null, ...(refs.product ? { product: refs.product } : {}), examples: slot === "logo" ? await planchedesLogosAimes() : null, ...(slot === "logo" ? { usage: "logo" as const } : {}) });
        // Gardée telle quelle si elle est déjà en PNG : sa signature « fait par l'IA » d'OpenAI reste (règlement européen).
        const png = await pngSansPerte(data), meta = await sharp(png).metadata();
        const asset = await saveAsset({ projectId: o.who.projectId, userId: o.who.userId, data: png, name: `planche-${key}-${slot}.png`, mime: "image/png", role: "brand-board", origin: "generated", status: "review", meta: { synaBoard: { key, slot, round, name: x.name } } });
        return { id: asset.id, w: meta.width ?? 1024, h: meta.height ?? 1024 };
      }));
    } catch (e) {
      if (e instanceof CostCapReached) { capped = true; notes.push(`plafond de dépense atteint pendant les images de ${key}`); return; }
      // Une demande qui échoue chez le fournisseur n'est jamais renvoyée seule : l'image manque, et c'est dit au client.
      notes.push(`${SLOT_LABEL[slot].fr} de ${key} non créé(e) : ${String((e as Error)?.message ?? e).slice(0, 140)}`);
      issues.push(tag(L(`je n'ai pas pu créer ${SLOT_LABEL[slot].fr} ; ${instead(x, slot)}.`, `I could not create ${SLOT_LABEL[slot].en}; ${slot === "signs" ? "the signs stay described in words" : slot === "logo" ? "you see your drawn name instead" : "I am not showing it"}.`)));
    }
  };

  // Dans la bibliothèque du client : une image attend sa relecture (« review »), puis elle est gardée (« ready ») ou
  // refusée (« rejected », avec la raison) : une image ratée n'y est jamais rangée comme une bonne image.
  const mark = (id: string, status: "ready" | "rejected", why = "", v?: { score?: number; words: string }) => {
    run("UPDATE assets SET status=?, meta=json_set(meta,'$.synaBoard.review',json(?)) WHERE id=? AND project_id=?", status, JSON.stringify({ status, why: why.slice(0, 240), ...(v?.score != null ? { score: v.score } : {}), ...(v?.words ? { words: v.words.slice(0, 400) } : {}) }), id, o.who.projectId);
    // Le carnet des juges : chaque verdict du relecteur, pour que le propriétaire dise oui ou non à son tour (mesure d'accord).
    const slot = [...made.entries()].find(([, m]) => m.id === id)?.[0];
    if (slot && why !== "non relue") { try { noterRelecture({ assetId: id, userId: o.who.userId, projectId: o.who.projectId, travail: travailDeLImage(slot), garde: status === "ready", raison: why }); } catch { /* le carnet ne bloque jamais une planche */ } }
  };
  let rejected = 0;

  // Le logo déjà gardé sur la planche (reprise d'une partie des images) ; le logo du client passe avant tout.
  const kept = x.board.images?.logo, keptBuffer = () => { const a = kept ? getAsset(kept.id) : undefined; return a ? assetData(a) : null; };
  const currentLogo = () => o.clientLogo?.data ?? bufferOf("logo") ?? (wanted.has("logo") ? null : keptBuffer());
  // La relecture : aucune image n'est montrée sans avoir été regardée.
  let blind = false;
  // Une image à la fois, avec toute l'attention du relecteur (21 novembre 2026 : six images jugées d'un coup, en une
  // réponse courte, laissaient passer taches, textes flous et écrans à moitié vides).
  const review = async (slots: ImageSlot[], rt = "") => { const go = async () => { for (const s of slots) await reviewOne([s], slots.length > 1 ? `${rt}:${s}` : rt); }; return /:r\d/.test(rt) ? aLaChargeDuStudio(go) : go(); };
  const reviewOne = async (slots: ImageSlot[], rt = "") => {
    // Contrôle sans IA avant de payer la relecture : une photo en partie transparente est refusée et refaite.
    for (const s of slots) {
      if (s === "logo") continue;
      const png = bufferOf(s), t = png ? await photoTransparente(png) : null;
      if (t?.transparente) {
        const why = L("une partie de l'image est transparente (brume ou taches) : la photo doit être pleine, d'un bord à l'autre", "part of the image is transparent: the photo must be solid from edge to edge");
        mark(made.get(s)!.id, "rejected", why); made.delete(s); dropped.set(s, why); saidWhy.set(s, SAID.abime);
        notes.push(`${SLOT_LABEL[s].fr} de ${key} refusé(e) sans relecture payée : ${Math.round(t.part * 1000) / 10} % de l'image transparente (contrôle sans IA)`);
        continue;
      }
      const vide = png ? await photoVideOuMalFormee(png, SLOT_ASPECT[s]) : null;
      if (vide) {
        mark(made.get(s)!.id, "rejected", vide); made.delete(s); dropped.set(s, vide); saidWhy.set(s, SAID.abime);
        notes.push(`${SLOT_LABEL[s].fr} de ${key} refusé(e) sans relecture payée : ${vide} (contrôle sans IA)`);
      }
    }
    slots = slots.filter((s) => made.has(s));
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
    // Le vrai produit du client, joint en dernier pour la grande scène et le haut du site : le relecteur compare.
    const compare = !!produit && slots.some((s) => s === "hero" || s === "site");
    if (compare) seen.push({ data: produit!, label: "produit" });
    // Un logo à juger : la planche des logos que le propriétaire aime, comme niveau à atteindre. Jointe à part, en tête
    // de la relecture et gardée en mémoire chez le fournisseur (la même pour tous les clients, 22 novembre 2026).
    const aimes = slots.includes("logo") ? await planchedesLogosAimes() : null;
    if (capped) unreviewed();
    else try {
      const review = await ctx.step(`brand:imagecheck:${round}:${key}${pass}${rt}`, () => ai.look(`imagecheck-${round}-${key}${pass}${rt}`, {
        system: P.imageReviewSystem(personnes), schema: ImageReviewSchema,
        prompt: [`Marque : « ${x.name} ».${x.board.descriptor ? ` Métier : ${x.board.descriptor}.` : ""} Voici ${slots.length} image(s), dans l'ordre.${reference ? ` ${compare ? "L'image jointe n°" : "La dernière image jointe"} ${compare ? slots.length + 1 : `(${slots.length + 1})`} est seulement le logo de la marque, pour comparer : ne la juge pas.` : ""}`,
          ...(compare ? [PRODUIT_A_COMPARER] : []),
          ...(aimes ? [`L'image jointe à part, en tête (hors numérotation), est la planche des logos que le propriétaire du Studio aime : elle donne le NIVEAU attendu pour le logo, ne la juge pas et ne la recopie pas.`] : []),
          // Ce que le client refuse (essai réel du 20 novembre 2026 : une goutte d'eau refusée par le client, passée au contrôle).
          ...(o.gouts?.trim() ? [`Ce que le client a dit de l'image qu'il veut, avec ses mots : « ${o.gouts.trim()} ». Une image, et surtout le logo, qui montre ce qu'il refuse est un défaut (defect « autre »).`] : []), ...slots.map((s, i) => `Image ${i + 1} — slot "${s}" : ${(s === "object" || s === "signs") && !logo ? "l'objet ou les signes de la marque SANS logo fourni : le nom seul en lettres simples ; un logo, une patte, une silhouette ou un symbole inventés sont un défaut (defect « autre »)" : ROLE_FOR_REVIEW[s]}. Textes attendus : ${texts[s].length ? texts[s].map((t) => `« ${t} »`).join(" ; ") : "aucun"}.${s === "site" ? ` Seules entrées permises sur des tuiles, des pastilles ou un menu : ${x.board.site.menu.length ? x.board.site.menu.map((t) => `« ${t} »`).join(", ") : "aucune"} ; une autre prestation, catégorie ou offre affichée (que le client ne propose pas) est un défaut (defect « texte »).` : ""}`)].join("\n"),
        images: seen, ...(aimes ? { fixes: [{ data: aimes, label: "logos aimés" }] } : {}),
      }));
      // Le Studio compare la lecture du relecteur aux textes attendus. Quand son jugement et sa propre lecture se
      // contredisent (refus « texte » alors qu'il a tout recopié sans faute, ou accord alors qu'il a lu un texte en
      // trop), l'image est RELUE une seconde fois, seulement recopiée, et c'est la comparaison du Studio qui tranche.
      const doubt: ImageSlot[] = [], complete = new Set<ImageSlot>();
      for (const s of slots) {
        const v = review.images.find((r) => r.slot === s);
        if (!v) { drop(s, L("elle n'a pas pu être relue", "it could not be reviewed")); continue; }
        // Note du relecteur face à une campagne haut de gamme : seule une image notée 8 sur 10 ou plus est montrée
        // (décision du propriétaire du 21 novembre 2026, devant quatre images ratées laissées passer).
        // Toujours, même quand le relecteur répond ok = faux ou ne dit rien de ok (essai réel de Nadia, 23 novembre 2026 :
        // le haut du site de « Pénombre », noté 5, refusé pour un texte, a été gardé après une seconde lecture des textes).
        // Aucune seconde lecture, aucun « doute » ne repêche une image notée sous 8.
        if (v.score != null && v.score < NOTE_MIN) { drop(s, v.why || L(`elle n'est pas au niveau d'une campagne haut de gamme (${v.score}/10)`, `it is not at premium campaign level (${v.score}/10)`), v.ok === false ? SAID[v.defect] ?? SAID.autre : SAID.autre); continue; }
        const ok = v.ok ?? (v.score != null && v.score >= NOTE_MIN);
        verdicts.set(s, { ...(v.score != null ? { score: v.score } : {}), words: (ok ? v.why || v.seen : v.seen).trim() });
        const c = textCheck(texts[s], v.read, x.name), exact = !c.missing.length && (s === "site" || !c.extra.length);
        if (s === "site" && !c.missing.length) complete.add(s);
        if (!ok) {
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
  // Toutes les raisons des refus d'une image, pas seulement la dernière (essai réel du 21 novembre 2026 : le 3e logo
  // d'Aplomb, corrigé seulement de « trop sage », a remis la goutte retirée au 2e).
  const whyHistory = new Map<ImageSlot, string[]>();
  const fix = (slot: ImageSlot, why: string, attempt: number) => { const h = [...(whyHistory.get(slot) ?? []), why]; whyHistory.set(slot, h); return fixLine(h, attempt, slot); };

  // 1. Le logo : conçu par OpenAI à partir de la marque, sans modèle. Contrôle gratuit du fond blanc avant toute
  // relecture : un logo sur fond noir ou coloré n'est ni gardé ni posé sur l'objet.
  // Tous les logos dessinés ici, gardés ou refusés, dans l'ordre : chaque dessin suivant les reçoit (reprises comprises).
  const dessines: Buffer[] = [];
  if (wanted.has("logo")) {
    ctx.progress(0.96, L(`Je dessine le logo de la planche ${key}`, `Drawing the logo of board ${key}`));
    // Le premier logo d'une série est créé avec les seules consignes de base ; chacun des suivants reçoit en plus TOUS
    // ceux déjà dessinés dans la série, gardés ou refusés, avec « je veux un logo complètement différent » (mots du
    // propriétaire, redits le 20 novembre 2026). Une reprise reçoit aussi ses propres essais refusés (essai réel de Nadia,
    // 23 novembre 2026 : B et C ne recevaient rien, les logos de A ayant été refusés). Seulement les logos de CETTE série,
    // dans l'ordre ; jamais ceux d'une série précédente ni d'un autre projet.
    const already = o.madeLogos ?? [];
    // Parcimonie du trait : un seul logo GARDÉ par série le porte (contrôle sans IA des logos déjà montrés).
    const traitPris = (await Promise.all((o.keptLogos ?? already).map((b) => traitHorizontal(b).then((r) => r.trouve).catch(() => false)))).some(Boolean);
    const idee = ideeDuDessinateur(x, o.logoLine);
    if (idee.refus) notes.push(`ligne « La marque » du logo de ${key} réduite au ton : ${idee.refus} (contrôle sans IA)`);
    const base = imagePrompt("logo", x, imagery, { logo: true, refusal: o.gouts, refusLogo: o.refusLogo, idee: o.logoLine }) + (traitPris ? `\n${LOGO_TRAIT_DEJA_PRIS}` : "");
    /** Un dessin du logo : la consigne de base, la planche de TOUS les logos déjà dessinés de la série, puis la correction. */
    const dessine = async (correction: string, retry = "") => {
      const serie = [...already, ...dessines], shown = await logoSheet(serie), n = serie.length;
      const prompt = base + (shown ? `\nL'image jointe montre ${n > 1 ? `les ${n} logos déjà faits` : "le logo déjà fait"} pour ce client. Je veux un logo complètement différent de ${n > 1 ? "ceux-là" : "celui-là"}, dans un autre style que ${n > 1 ? "chacun d'eux" : "lui"} : une autre façon de faire (je ne t'impose aucun style), y compris dans la disposition, la place du signe et la façon de poser le nom.` : "") + correction;
      await make("logo", shown ? { avoid: shown } : {}, prompt, retry);
      const b = bufferOf("logo");
      if (b) dessines.push(b);
      return b;
    };
    let drawn = await dessine("");
    // Contrôle sans IA de la parcimonie : un trait alors qu'un logo de la série en a déjà un, le logo est redessiné UNE
    // fois ; s'il le garde encore, il est montré et c'est dit au client. Le premier trait d'une série est gardé.
    if (drawn && traitPris && (await traitHorizontal(drawn)).trouve) {
      mark(made.get("logo")!.id, "rejected", "un trait près du nom, déjà pris par un autre logo de la série"); made.delete("logo");
      notes.push(`logo de ${key} redessiné : un trait près du nom, déjà pris dans la série (contrôle sans IA)`);
      drawn = await dessine("\nLe logo précédent avait lui aussi un trait ou un filet près du nom : refais-le sans trait, sans filet ni ligne.", ":sans-trait");
      if (drawn && (await traitHorizontal(drawn)).trouve) issues.push(tag(L("son logo garde un trait sous le nom, malgré un second dessin.", "its logo still has a line under the name.")));
    }
    if (drawn && !(await logoOnWhite(drawn))) {
      const why = L("il n'est pas sur un fond blanc net : il ne se lirait pas sur tes supports", "it is not on a clean white background");
      mark(made.get("logo")!.id, "rejected", why); made.delete("logo"); dropped.set("logo", why);
      notes.push(`logo de ${key} refusé par le contrôle du fond (sans IA)`);
    }
    // Le logo est relu, et refait s'il est refusé, AVANT de dessiner ce qui le porte (21 novembre 2026 : les images
    // portant un logo dessinées avant sa relecture étaient jetées et repayées quand il était refusé).
    if (made.has("logo")) await review(["logo"], ":logo");
    for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES && dropped.has("logo") && calls.has("logo") && !capped && !blind; attempt++) {
      ctx.progress(0.96, L(`Je reprends le logo de la planche ${key}`, `Redoing the logo of board ${key}`));
      const why = dropped.get("logo")!; dropped.delete("logo");
      // Toutes les raisons de ses refus, et la planche de tous les logos déjà dessinés, ses essais refusés compris.
      const again = await dessine(fix("logo", why, attempt), `:r${attempt}`);
      if (!again) { dropped.set("logo", why); continue; }
      if (!(await logoOnWhite(again))) { const w = L("il n'est pas sur un fond blanc net : il ne se lirait pas sur tes supports", "it is not on a clean white background"); mark(made.get("logo")!.id, "rejected", w); made.delete("logo"); dropped.set("logo", w); continue; }
      await review(["logo"], `:logo:r${attempt}`);
    }
  }
  // Le logo à poser sur l'objet : celui qui vient d'être créé, relu et gardé, sinon celui déjà gardé sur la planche.
  const logo = currentLogo();
  // 2. La grande scène, puis ce qui porte le logo, puis les publications.
  ctx.progress(0.965, L(`Je crée les images de la planche ${key}`, `Creating the images of board ${key}`));
  // Rien n'est dessiné sur une image pas encore relue (audit du 22 novembre 2026, 2.11) : la grande scène, que le haut
  // du site reprend, est relue (et refaite s'il le faut) AVANT lui.
  const relusTot = new Set<ImageSlot>(["logo"]);
  if (wanted.has("hero")) {
    await make("hero", produit ? { product: produit } : {}, imagePrompt("hero", x, imagery, { logo: false, personnes, produit: !!produit }));
    if (made.has("hero") && wanted.has("site") && imagery.site.trim()) {
      relusTot.add("hero");
      await review(["hero"], ":hero");
      for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES && dropped.has("hero") && calls.has("hero") && !capped && !blind; attempt++) {
        const c = calls.get("hero")!, why = dropped.get("hero")!; dropped.delete("hero");
        await make("hero", c.refs, c.prompt + fix("hero", why, attempt), `:r${attempt}`);
        if (made.has("hero")) await review(["hero"], `:hero:r${attempt}`); else dropped.set("hero", why);
      }
    }
  }
  // Jamais une planche incomplète (règle du propriétaire : « Jamais une planche incomplète : une image refusée est refaite
  // avant d'être montrée ») : le haut du site est dessiné après la grande scène relue et le logo relu (refaits avant lui
  // s'ils étaient refusés). Un logo ou une grande scène encore refusés après leurs reprises : le haut du site n'est pas
  // dessiné (il serait faux d'avance), et la planche entière n'est pas montrée au client (brand-chain.ts, `manque`).
  // La maquette du haut de l'accueil : le logo, la grande scène et le vrai produit lui sont fournis.
  const heroKept = x.board.images?.hero, heroBuffer = bufferOf("hero") ?? (() => { const a = heroKept ? getAsset(heroKept.id) : undefined; return a ? assetData(a) : null; })();
  const siteSansBase = wanted.has("site") && ((wanted.has("logo") && !logo) || (wanted.has("hero") && !heroBuffer));
  if (siteSansBase) notes.push(`haut du site de ${key} non dessiné : ${!logo && wanted.has("logo") ? "le logo" : "la grande scène"} n'a pas passé la relecture (rien n'est payé pour une image fausse d'avance)`);
  if (wanted.has("site") && imagery.site.trim() && !siteSansBase) {
    await make("site", { logo: await logoForGround(logo, x), scene: heroBuffer, ...(produit ? { product: produit } : {}) }, imagePrompt("site", x, imagery, { logo: !!logo, personnes, produit: !!produit }));
  } else if (wanted.has("site") && !siteSansBase) {
    // Sans consigne de maquette, rien n'est créé ni payé, et c'est dit (SINA ne parle jamais d'une maquette absente).
    notes.push(`maquette du site de ${key} non créée : la direction artistique n'a pas rendu sa consigne`);
    issues.push(tag(L("je n'ai pas pu préparer le haut de ton site ; je peux le refaire si tu me le demandes.", "I could not prepare your site mock-up; I can redo it if you ask.")));
  }
  // Reprise d'une partie des images : l'objet et les signes portent le logo de la planche ; sans logo gardé, ils ne
  // sont pas refaits (retour du propriétaire du 14 novembre 2026 : « les logos ne sont pas les mêmes entre le logo et
  // sur le camion » : sans logo fourni, OpenAI en inventait un autre). Rien n'est payé pour une image fausse d'avance.
  const skipCarriers = !!o.slots?.length && !logo;
  if (skipCarriers) for (const slot of ["object", "signs"] as const) if (wanted.has(slot)) {
    notes.push(`${SLOT_LABEL[slot].fr} de ${key} non refait(e) : aucun logo gardé à poser dessus`);
    issues.push(tag(L(`je n'ai pas refait ${SLOT_LABEL[slot].fr} : sans logo gardé, il porterait un autre logo que le tien.`, `I did not redo ${SLOT_LABEL[slot].en}: without a kept logo it would carry a different one.`)));
  }
  if (wanted.has("object") && !skipCarriers) await make("object", { logo }, imagePrompt("object", x, imagery, { logo: !!logo, personnes }));
  if (wanted.has("signs") && !skipCarriers && imagery.signs.trim()) await make("signs", { logo }, imagePrompt("signs", x, imagery, { logo: !!logo, personnes }));
  for (const slot of ["post0", "post1", "post2"] as const) if (wanted.has(slot)) await make(slot, { logo }, imagePrompt(slot, x, imagery, { logo: !!logo, personnes }));

  const aRelire = IMAGE_SLOTS.filter((s) => !relusTot.has(s) && made.has(s));
  await review(aRelire, aRelire.length === 1 && relusTot.size > 1 ? `:${aRelire[0]}` : "");

  // Une image refusée est refaite avant d'être montrée : deux reprises au plus, avec toutes les raisons de ses refus
  // données au modèle ; à la seconde, la consigne est simplifiée. Les reprises restent dans le plafond déjà accepté par
  // le client. Le logo, lui, est déjà relu et gardé : ce qui le porte n'est jamais refait à cause de lui.
  for (let attempt = 1; attempt <= MAX_IMAGE_RETRIES && dropped.size && !capped && !blind; attempt++) {
    const again = IMAGE_SLOTS.filter((s) => !relusTot.has(s) && dropped.has(s) && calls.has(s));
    if (!again.length) break;
    ctx.progress(0.97, L(`Je reprends ${again.length > 1 ? "des images" : "une image"} de la planche ${key}`, `Redoing images of board ${key}`));
    const redone: ImageSlot[] = [];
    for (const s of again) {
      const c = calls.get(s)!, why = dropped.get(s)!; dropped.delete(s);
      const now = currentLogo(), refs = c.refs.logo ? { ...c.refs, logo: s === "site" ? await logoForGround(now, x) : now } : c.refs;
      await make(s, refs, c.prompt + fix(s, why, attempt), `:r${attempt}`);
      if (made.has(s)) redone.push(s); else dropped.set(s, why);
    }
    await review(redone, `:r${attempt}`);
  }
  // Ce qui reste refusé après les reprises est dit au client, sans image fausse à la place.
  for (const [slot, raw] of dropped) { const why = slot === "site" ? (saidWhy.get(slot) ?? raw).replace(/^elle /, "il ") : saidWhy.get(slot) ?? raw; rejected++; issues.push(tag(L(`je n'ai pas gardé ${SLOT_LABEL[slot].fr} (${why.replace(/\.+$/, "")}) ; ${instead(x, slot)}.`, `I did not keep ${SLOT_LABEL[slot].en} (${why}); ${slot === "logo" ? (x.board.images?.logo ? "I keep the previous one" : "you see your drawn name instead") : "I am not showing it"}.`))); }

  for (const [slot, m] of made) mark(m.id, "ready", "", verdicts.get(slot));

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
  // Un logo refait et refusé après ses reprises laisse celui d'avant (et sa marque de planche) : jamais une planche qui
  // perd son logo (règle du propriétaire : « Jamais une planche incomplète »). C'est dit au client.
  const logoGarde = wanted.has("logo") && !made.get("logo") && !o.clientLogo && !!before.logo;
  const logoNow = logoGarde ? before.logo : keep("logo");
  const own = o.clientLogo ? { id: o.clientLogo.id, w: o.clientLogo.w, h: o.clientLogo.h } : null;
  const markNow = own ? { mark: own, markDark: own } : wanted.has("logo") && !skipCarriers && !logoGarde ? marks : { mark: before.mark, markDark: lightKept ?? before.markDark };
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
  // Les images sans lesquelles la planche n'est pas montrée (le logo, sauf celui du client ; la grande scène ; le haut du site).
  const manque = manqueDeLaPlanche(next.success ? next.data : x, !!own);
  return { route: next.success ? next.data : x, made: next.success ? made.size : 0, rejected, notes, issues, siteGarde, manque, logos: dessines };
}
