/**
 * TOUTE PHOTO DÉPOSÉE DANS LE STUDIO EST VÉRIFIÉE (22 novembre 2026, limites de l'atelier, point 2), même hors de
 * l'atelier : photos envoyées dans les Fichiers, photos de produit et de variantes, pièces jointes du fil de SINA,
 * logo gardé, photos reprises de son site. Le passage obligé est `saveAsset` (bibliothèque) pour tout ce qui vient du
 * client, et `saveAttachment` pour une pièce jointe avant que le projet existe.
 *
 * La vérification est la modération GRATUITE d'OpenAI, celle de l'atelier (`garde-fous.ts`), jamais au niveau bas.
 *  - vérifiée : la photo sert normalement ;
 *  - à vérifier (clé absente, panne) : la photo est GARDÉE (jamais perdue), mise de côté, et ne sert à rien de payant
 *    tant qu'elle n'est pas vérifiée ; le Studio réessaie de lui-même dès qu'elle doit servir ;
 *  - refusée : la photo est gardée, mais ne sert à rien de payant.
 * Une phrase claire le dit au client, en le tutoyant. Le garde central (`gardePhotosDeCote`) arrête, avant tout appel
 * payant à l'IA (images, vidéos, lecture d'image par SINA), une image qui ressemble à une photo mise de côté (même
 * photo réduite ou recadrée légèrement) : rien n'est envoyé, rien n'est compté.
 */
import crypto from "node:crypto";
import sharp from "sharp";
import { HttpError } from "../auth";
import { all, json, now, one, run } from "../db";
import { L } from "../i18n-server";
import { dHash, hamming } from "../image-v2/quality";
import { modererEntree } from "./garde-fous";
import { moderation } from "./moderation";

export type EtatVerification = "verifiee" | "a_verifier" | "refusee";
export type Verification = { etat: EtatVerification; at: number; familles?: string[]; empreinte?: string | null; sha?: string; essais?: number };

/** Origines des photos du client (déposées, reprises de son site, données par un lien). */
export const ORIGINES_CLIENT = new Set(["upload", "site", "link"]);

/** Phrases dites au client (tutoiement, sans mot technique). */
export const PHRASE_A_VERIFIER: readonly [string, string] = [
  "Ta photo est bien enregistrée. Je n'ai pas pu la vérifier pour l'instant : je la garde de côté, elle ne servira à aucune création tant qu'elle n'est pas vérifiée. Je réessaie toute seule dès que tu t'en sers.",
  "Your photo is saved. I couldn't check it yet: I'm keeping it aside, and it won't be used for any creation until it's checked. I'll try again by myself as soon as you use it.",
];
export const phraseRefusee = (familles: string[] | undefined, lang: "fr" | "en") => lang === "fr"
  ? `Ta photo est bien enregistrée, mais la vérification a trouvé ${familles?.length ? familles.join(", ") : "un contenu refusé"} : je la garde de côté, elle ne servira à aucune création. Envoie-moi une autre photo et je m'y remets.`
  : `Your photo is saved, but the check found ${familles?.length ? familles.join(", ") : "refused content"}: I'm keeping it aside and it won't be used for any creation. Send me another photo and I'll get back to it.`;

/** La phrase à dire au client pour une vérification (null : vérifiée, rien à dire). */
export function phraseVerification(v: Verification | null | undefined, lang: "fr" | "en"): string | null {
  if (!v || v.etat === "verifiee") return null;
  return v.etat === "refusee" ? phraseRefusee(v.familles, lang) : PHRASE_A_VERIFIER[lang === "fr" ? 0 : 1];
}

const lang = (): "fr" | "en" => L("fr", "en") as "fr" | "en";

/** Les phrases à montrer au client après un envoi de photos (une par photo gardée de côté, sans doublon). */
export function avertissementsDe(metas: unknown[]): string[] {
  return [...new Set(metas.map((m) => phraseVerification(verificationDe(typeof m === "string" ? json(m, {}) : m), lang())).filter((x): x is string => !!x))];
}

const sommeDe = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex");
/** Une empreinte trop pauvre (image presque unie) ne distingue rien : seule la même photo à l'octet près compte alors. */
const parlante = (h: string) => { const n = [...BigInt(`0x${h}`).toString(2)].filter((c) => c === "1").length; return n >= 8 && n <= 56; };

/** Une image du client est-elle à vérifier (image raster ou vectorielle, déposée par lui) ? */
export const aVerifier = (o: { origin: string; mime: string }) => ORIGINES_CLIENT.has(o.origin) && /^image\//.test(o.mime);

async function reduite(data: Buffer): Promise<Buffer | null> {
  try { return await sharp(data, { failOn: "none" }).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer(); } catch { return null; }
}

/**
 * Vérifie une image (gratuit). Une image illisible ou une vérification impossible : « à vérifier » (gardée de côté).
 * L'empreinte sert au garde central pour reconnaître la photo avant un appel payant.
 */
export async function verifierImage(data: Buffer): Promise<Verification> {
  const petite = await reduite(data);
  const empreinte = await dHash(data).catch(() => null), sha = sommeDe(data);
  if (!petite) return { etat: "a_verifier", at: now(), empreinte, sha, essais: 1 };
  const v = await modererEntree({ images: [{ mime: "image/jpeg", base64: petite.toString("base64") }] }, moderation, lang());
  if (v.ok) return { etat: "verifiee", at: now(), empreinte, sha };
  return v.familles.length ? { etat: "refusee", at: now(), familles: v.familles, empreinte, sha } : { etat: "a_verifier", at: now(), empreinte, sha, essais: 1 };
}

/** La vérification enregistrée avec une photo (null : photo d'avant la vérification, ou image créée par le Studio). */
export const verificationDe = (meta: unknown): Verification | null => {
  const v = (meta as { verification?: Verification } | null)?.verification;
  return v && typeof v === "object" && typeof v.etat === "string" ? v : null;
};

/** La photo est-elle mise de côté (pas encore vérifiée, ou refusée) ? */
export const deCote = (meta: unknown) => { const v = verificationDe(meta); return !!v && v.etat !== "verifiee"; };

function ecrire(assetId: string, v: Verification) {
  run("UPDATE assets SET meta = json_set(COALESCE(meta,'{}'), '$.verification', json(?)) WHERE id = ?", JSON.stringify(v), assetId);
}

/** Une photo gardée de côté faute de vérification vient d'être vérifiée ailleurs (atelier) : elle sert. */
export function marquerVerifiee(assetId: string) {
  const r = one<{ meta: string }>("SELECT meta FROM assets WHERE id = ?", assetId);
  const v = r ? verificationDe(json(r.meta, {})) : null;
  if (v?.etat === "a_verifier") ecrire(assetId, { ...v, etat: "verifiee", at: now() });
}

/** Lecture des octets d'une photo (évite un import circulaire avec la bibliothèque). */
async function octets(assetId: string): Promise<Buffer | null> {
  const { assetData, getAsset } = await import("../library");
  const a = getAsset(assetId);
  try { return a ? assetData(a) : null; } catch { return null; }
}

/** Réessaie la vérification d'une photo gardée de côté faute de vérification (gratuit). */
export async function reverifier(assetId: string): Promise<Verification | null> {
  const r = one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND deleted_at IS NULL", assetId);
  const v = r ? verificationDe(json(r.meta, {})) : null;
  if (!v || v.etat !== "a_verifier") return v;
  const data = await octets(assetId);
  if (!data) return v;
  const n = await verifierImage(data);
  const next = n.etat === "a_verifier" ? { ...v, at: now(), essais: (v.essais ?? 1) + 1 } : { ...n, empreinte: n.empreinte ?? v.empreinte ?? null, sha: n.sha ?? v.sha };
  ecrire(assetId, next);
  return next;
}

/** L'erreur dite au client quand une photo mise de côté devait servir (rien n'est lancé, rien n'est compté). */
export class PhotoDeCoteError extends HttpError {
  constructor(v: Verification) { super(409, phraseVerification(v, lang()) ?? PHRASE_A_VERIFIER[0], v.etat === "refusee" ? "photo_refusee" : "photo_a_verifier"); this.name = "PhotoDeCoteError"; }
}

/**
 * Garde d'une photo désignée (atelier, retouche, vidéo) : remonte jusqu'à la photo du client d'où elle vient ; si elle
 * est de côté, réessaie la vérification ; toujours de côté : refusée avec la phrase claire.
 */
export async function assurerPhotoVerifiee(assetId: string): Promise<void> {
  let id: string | null = assetId;
  for (let k = 0; id && k < 6; k++) {
    const r: { meta: string; source_asset_id: string | null } | undefined = one<{ meta: string; source_asset_id: string | null }>("SELECT meta, source_asset_id FROM assets WHERE id = ?", id);
    if (!r) return;
    let v = verificationDe(json(r.meta, {}));
    if (v && v.etat === "a_verifier") v = await reverifier(id);
    if (v && v.etat !== "verifiee") throw new PhotoDeCoteError(v);
    id = r.source_asset_id;
  }
}

/** Les octets d'images contenus dans les arguments d'un appel (profondeur bornée, 16 au plus). */
export function imagesDans(x: unknown, out: Buffer[] = [], depth = 0): Buffer[] {
  if (out.length >= 16 || depth > 3 || x == null) return out;
  if (Buffer.isBuffer(x)) { if (x.length > 64) out.push(x); return out; }
  if (Array.isArray(x)) { for (const y of x) imagesDans(y, out, depth + 1); return out; }
  if (typeof x === "object") for (const y of Object.values(x as Record<string, unknown>)) imagesDans(y, out, depth + 1);
  return out;
}

/** Écart d'empreinte au-dessous duquel deux images sont la même photo (réduite, recompressée, légèrement recadrée). */
export const MEME_PHOTO = 6;

/** Les photos du projet encore de côté après une nouvelle tentative de vérification (gratuite). */
async function photosRestantesDeCote(projectId: string): Promise<Verification[]> {
  const rows = all<{ id: string; meta: string }>("SELECT id, meta FROM assets WHERE project_id = ? AND deleted_at IS NULL AND json_extract(meta, '$.verification.etat') IN ('a_verifier','refusee')", projectId);
  const restantes: Verification[] = [];
  for (const r of rows) {
    let v = verificationDe(json(r.meta, {}));
    if (v?.etat === "a_verifier") v = await reverifier(r.id);
    if (v && v.etat !== "verifiee" && (v.empreinte || v.sha)) restantes.push(v);
  }
  return restantes;
}

/** Pour chaque image, la photo mise de côté qu'elle reproduit (null : elle peut partir). */
async function correspondances(projectId: string | null | undefined, images: Buffer[]): Promise<(Verification | null)[]> {
  if (!projectId || !images.length) return images.map(() => null);
  const restantes = await photosRestantesDeCote(projectId);
  if (!restantes.length) return images.map(() => null);
  return Promise.all(images.map(async (img) => {
    const h = await dHash(img).catch(() => null), sha = sommeDe(img);
    return restantes.find((v) => v.sha === sha || (!!h && !!v.empreinte && parlante(v.empreinte) && hamming(h, v.empreinte) <= MEME_PHOTO)) ?? null;
  }));
}

/**
 * LE GARDE CENTRAL, avant tout appel payant à l'IA qui reçoit des images (générations, retouches, vidéos) : aucune
 * photo du projet mise de côté ne part. Sans photo de côté dans le projet : rien à faire (aucun calcul). Une photo en
 * attente est d'abord revérifiée (gratuit) ; celles qui restent de côté sont comparées par empreinte aux images de
 * l'appel. Lève `PhotoDeCoteError` avant que la demande parte.
 */
export async function gardePhotosDeCote(projectId: string | null | undefined, images: Buffer[]): Promise<void> {
  const meme = (await correspondances(projectId, images)).find(Boolean);
  if (meme) throw new PhotoDeCoteError(meme);
}

/**
 * Pour une lecture d'images par l'IA (SINA, juges) : les images qui reproduisent une photo mise de côté sont retirées
 * de la demande (elles ne sont jamais lues), le reste part. Rend, pour chaque image, si elle peut partir.
 */
export async function imagesLisibles(projectId: string | null | undefined, images: Buffer[]): Promise<boolean[]> {
  return (await correspondances(projectId, images)).map((v) => !v);
}
