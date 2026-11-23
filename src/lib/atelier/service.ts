/**
 * L'ATELIER DE CRÉATION, CÔTÉ SERVEUR : ce que l'écran affiche (outils ouverts, prix de chaque geste en pourcentage du
 * budget du mois, plafond des vidéos, conditions, modèles prêts, « Mes créations »), et les garde-fous d'entrée
 * appliqués avant tout devis. Aucun appel payant ici : la modération d'OpenAI est gratuite, tout le reste est local.
 */
import { HttpError } from "../auth";
import { all, now, one, run } from "../db";
import { L } from "../i18n-server";
import { currentPeriod } from "../billing";
import { accountKeyFor } from "../project-billing";
import { userPlan } from "../quotas";
import { assetData, assetMeta, getAsset } from "../library";
import { moderation } from "./moderation";
import { marquerVerifiee, PhotoDeCoteError, verificationDe } from "./verification-photos";
import { mediaModel } from "../ai/media-models";
import { mediaStatus, typicalCostMicro } from "../ai/media-routing";
import { pctBaseFor } from "../ai/budget-pct";
import { palette } from "../engine/images";
import type { Project } from "../projects";
import { GESTES, LOT_MAX } from "./gestes";
import { OUTILS, outil, outilsPour, type GesteId } from "./outils";
import { auPlusTexte, chaineGeste, plafondTexte, plafondVideos, prixTexte, SOUS_LE_PRIX, type PlafondVideos } from "./prix";
import { devisVideoGuidee } from "../video-v2/guided-quote";
import { accordValide, CONDITIONS, CONDITIONS_VERSION, controlePersonnes, modererEntree, PHRASE_ACCORD, type AccordPersonne } from "./garde-fous";
import { MODES, conseilOutil } from "./conseil";
import { modelesPour } from "./modeles-images";
import { GESTES_CAMERA, MODELES_VIDEOS, reglagesDuModele, type ModeleVideo } from "./modeles-videos";
import { mesCreations, nonServies, phraseNonServies, videosDuMois } from "./journal";
import { vraisPixelsActifs } from "./scene";
import { getSetting } from "../settings";
import { ELEVENLABS_BRANCHE, ELEVENLABS_RAISON, musiqueAtelier, nomMusique } from "./musique";

const lang = (): "fr" | "en" => L("fr", "en") as "fr" | "en";

/** Un outil de l'atelier est-il ouvert (clé du fournisseur et accord de l'administration) ? */
export function outilOuvert(id: string): boolean {
  const o = outil(id), m = o ? mediaModel(o.provider, o.model) : null;
  if (!m) return false;
  try {
    const st = mediaStatus(m);
    return st.usable && st.enabled;
  } catch {
    return false;
  }
}

/** Coût typique d'UNE création par cet outil (une image, ou une vidéo de `secondes`), en micro-euros. */
export function coutUnitaire(id: string, secondes?: number): number | null {
  const o = outil(id), m = o ? mediaModel(o.provider, o.model) : null;
  if (!m) return null;
  return typicalCostMicro(secondes && m.kind === "video" ? { ...m, typical: { ...m.typical, seconds: secondes } } : m);
}

/** Le juge relit-il ce geste ? La scène et la vidéo oui ; les retouches simples ont le contrôle local gratuit. */
export const gesteRelu = (g: GesteId) => g === "scene" || g === "video";

/** Le prix d'un geste par un outil, chaîne entière comptée, en micro-euros et en phrase (null : prix inconnu). */
export function prixDuGeste(userId: string, projectId: string, geste: GesteId, outilId: string, o: { nombre?: number; secondes?: number } = {}) {
  const unit = coutUnitaire(outilId, o.secondes);
  if (unit == null) return null;
  const chaine = chaineGeste({ kind: GESTES[geste].kind, unitMicro: unit, nombre: o.nombre, relu: gesteRelu(geste) });
  return { ...chaine, texte: prixTexte(chaine.totalMicro, pctBaseFor(userId, projectId), lang()) };
}

/**
 * Le prix d'un modèle de vidéo : le devis de la vidéo guidée qu'il ouvre (une seule façon de calculer, la même que la
 * page de réglage et que SINA). `prix` : le coût probable ; `auPlus` : la borne haute de l'accord ; `raison` : pourquoi
 * il n'est pas ouvert. Le modèle gratuit (avant-après) n'a pas de devis.
 */
export function prixModeleVideo(userId: string, p: Project, m: ModeleVideo): { estimateMicro: number; capMicro: number; prix: string | null; auPlus: string | null; outil: string | null; raison: string | null; planSur: string | null } {
  const lg = lang();
  if (m.sansIa) return { estimateMicro: 0, capMicro: 0, prix: lg === "fr" ? "Gratuit" : "Free", auPlus: null, outil: null, raison: null, planSur: null };
  const q = devisVideoGuidee(p, { ...reglagesDuModele(m), subject: null, request: m.scene });
  if (!q.allowed) return { estimateMicro: 0, capMicro: 0, prix: null, auPlus: null, outil: null, raison: q.reason ?? null, planSur: null };
  const base = pctBaseFor(userId, p.id), route = q.routes?.clip;
  // Sans modèle vidéo utilisable : le plan sûr (vrai produit détouré, caméra au montage), dit au client en clair.
  return { estimateMicro: q.estimateMicro, capMicro: q.capMicro, prix: q.estimateMicro > 0 ? prixTexte(q.estimateMicro, base, lg) : lg === "fr" ? "Gratuit" : "Free", auPlus: q.capMicro > q.estimateMicro ? auPlusTexte(q.capMicro, base, lg) : null, outil: route ? `${route.provider}:${route.model}` : null, raison: null, planSur: q.planSur ?? null };
}

/** Le plafond des vidéos de l'atelier ce mois-ci, pour ce projet. */
export function plafondDuProjet(userId: string, projectId: string): PlafondVideos {
  const plan = userPlan(userId, projectId);
  let depuis = 0;
  try { depuis = currentPeriod(accountKeyFor(userId, projectId)).start; } catch { depuis = now() - 31 * 86400_000; }
  return plafondVideos(plan, videosDuMois(projectId, depuis));
}

/** Refuse une vidéo de l'atelier au-delà du plafond du forfait (rien n'est lancé, rien n'est compté). */
export function assertVideoAtelier(userId: string, projectId: string) {
  const p = plafondDuProjet(userId, projectId);
  const raison = plafondTexte(p, lang());
  if (raison) throw new HttpError(402, raison, "atelier_video_cap");
}

export const conditionsAcceptees = (userId: string) => !!one("SELECT 1 FROM atelier_conditions WHERE user_id = ? AND version = ?", userId, CONDITIONS_VERSION);
export function accepterConditions(userId: string) {
  run("INSERT OR IGNORE INTO atelier_conditions (user_id, version, accepted_at) VALUES (?,?,?)", userId, CONDITIONS_VERSION, now());
}

/** Accord écrit de la personne montrée sur une photo du client, gardé avec la photo (preuve datée). */
export function accordPersonne(projectId: string, assetId: string, a: Omit<AccordPersonne, "at">): AccordPersonne {
  const asset = getAsset(assetId);
  if (!asset || asset.project_id !== projectId || asset.deleted_at || !["upload", "site"].includes(asset.origin)) throw new HttpError(404, L("Photo introuvable : l'accord se donne sur une photo que tu as fournie.", "Photo not found: consent is given on a photo you provided."));
  const accord = { ...a, nom: a.nom.trim().slice(0, 120), phrase: a.phrase.trim().slice(0, 300), at: now() };
  if (!accordValide(accord)) throw new HttpError(400, L(`L'accord doit porter le nom de la personne et la phrase recopiée : « ${PHRASE_ACCORD[0]} »`, `The consent must carry the person's name and the copied sentence: "${PHRASE_ACCORD[1]}"`));
  const meta = { ...assetMeta(asset), hasPerson: true, peopleConsent: true, peopleConsentProof: accord };
  run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify(meta), assetId);
  return accord;
}

/** La photo porte-t-elle l'accord écrit de la personne montrée ? */
export function photoAvecAccord(projectId: string, assetId?: string | null): boolean {
  if (!assetId) return false;
  const a = getAsset(assetId);
  if (!a || a.project_id !== projectId) return false;
  return accordValide(assetMeta<{ peopleConsentProof?: AccordPersonne }>(a).peopleConsentProof);
}

/** La vérification gratuite d'OpenAI, remplaçable dans les essais (jamais d'appel réel dans les tests). */
export { appelModeration, remplacerModeration } from "./moderation";

/**
 * Les garde-fous d'entrée, avant tout devis de l'atelier : conditions acceptées, demande et photo vérifiées par la
 * modération, personnes seulement avec la photo et l'accord écrit. Lève une erreur claire quand c'est refusé.
 */
export async function gardeFousAtelier(userId: string, projectId: string, o: { texte?: string | null; assetId?: string | null; personneAssetId?: string | null }) {
  if (!conditionsAcceptees(userId)) throw new HttpError(409, L("Lis et accepte d'abord les conditions de l'atelier (une seule fois).", "First read and accept the workshop terms (just once)."), "atelier_conditions");
  const personnes = controlePersonnes(o.texte ?? "", photoAvecAccord(projectId, o.personneAssetId ?? null), lang());
  if (personnes) throw new HttpError(400, personnes, "atelier_personne");
  const images: { mime: string; base64: string }[] = [];
  const a = o.assetId ? getAsset(o.assetId) : null;
  // Une photo refusée à son dépôt ne sert jamais ; une photo gardée de côté est revérifiée ici avec la demande.
  if (a) { const v = verificationDe(assetMeta(a)); if (v?.etat === "refusee") throw new PhotoDeCoteError(v); }
  // Seules les photos déposées par le client passent par la modération (les images créées l'ont déjà été).
  if (a && ["upload", "site", "link"].includes(a.origin) && /^image\//.test(a.mime)) {
    const sharp = (await import("sharp")).default;
    const small = await sharp(assetData(a)).rotate().resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    images.push({ mime: "image/jpeg", base64: small.toString("base64") });
  }
  const v = await modererEntree({ texte: o.texte ?? null, images }, moderation, lang());
  if (!v.ok) throw new HttpError(400, v.raison, "atelier_moderation");
  // La photo vient d'être vérifiée avec la demande : si elle était gardée de côté faute de vérification, elle sert.
  if (a && images.length) marquerVerifiee(a.id);
}

/** Ce que l'écran de l'atelier affiche (aucun appel payant). */
export function etatAtelier(userId: string, p: Project) {
  const lg = lang();
  const base = pctBaseFor(userId, p.id);
  const gestes = (Object.keys(GESTES) as GesteId[]).map((g) => {
    const outils = outilsPour(g, outilOuvert).map((o) => {
      const prix = o.disponible ? prixDuGeste(userId, p.id, g, o.id, { nombre: g === "lot" ? 1 : undefined, secondes: g === "video" ? 8 : undefined }) : null;
      return { id: o.id, nom: o.nom, mieux: o.mieux, disponible: o.disponible, conseille: o.conseille, redessine: o.redessine, secours: !!o.secours, prixMicro: prix?.totalMicro ?? null, prix: prix?.texte ?? null };
    });
    return { id: g, nom: GESTES[g].nom, aide: GESTES[g].aide, kind: GESTES[g].kind, demande: GESTES[g].demande ?? null, outils, conseil: conseilOutil(g, outilsPour(g, outilOuvert), lg) };
  });
  const creations = mesCreations(p.id);
  const dorment = nonServies(creations);
  const plafond = plafondDuProjet(userId, p.id);
  const pal = palette(p);
  const musique = musiqueAtelier(p as never);
  return {
    modes: MODES,
    conditions: { acceptees: conditionsAcceptees(userId), version: CONDITIONS_VERSION, texte: CONDITIONS },
    phraseAccord: PHRASE_ACCORD,
    sousLePrix: SOUS_LE_PRIX,
    baseConnue: !!base,
    gestes,
    lotMax: LOT_MAX,
    plafondVideos: { ...plafond, phrase: plafondTexte(plafond, lg) },
    modelesImages: modelesPour(new Date(), { offreSaisie: false }).map(({ date: _d, mois: _m, ...m }) => m),
    modelesVideos: MODELES_VIDEOS.map((m) => {
      const d = prixModeleVideo(userId, p, m);
      return { ...m, outil: d.outil, gratuit: !!m.sansIa, prix: d.prix, auPlus: d.auPlus, raison: d.raison, planSur: d.planSur, estimateMicro: d.estimateMicro, capMicro: d.capMicro };
    }),
    gestesCamera: GESTES_CAMERA.map(({ id, nom }) => ({ id, nom })),
    musique: { style: musique.style, nom: nomMusique(musique.style, lg), elevenlabs: ELEVENLABS_BRANCHE, raison: ELEVENLABS_RAISON },
    couleurs: [pal.primary, pal.accent, pal.dark],
    vraisPixels: vraisPixelsActifs(getSetting),
    creations: creations.map((c) => ({ ...c, outil: nomOutil(c.outil, lg), cout: c.costMicro > 0 ? prixTexte(c.costMicro, base, lg) : lg === "fr" ? "gratuit" : "free" })),
    nonServies: { n: dorment.length, phrase: phraseNonServies(dorment.length, lg) },
    outilsAccordes: OUTILS.length,
  };
}

/** Le nom de l'outil montré au client (jamais l'identifiant technique). */
export function nomOutil(id: string, lg: "fr" | "en"): string {
  const o = outil(id);
  if (o) return o.nom[lg === "fr" ? 0 : 1];
  const provider = id.split(":")[0];
  const noms: Record<string, [string, string]> = { studio: ["Le Studio (montage gratuit)", "The Studio (free edit)"], "studio-video": ["Vidéo guidée du Studio", "Studio guided video"], openai: ["OpenAI", "OpenAI"], google: ["Google", "Google"], alibaba: ["Alibaba", "Alibaba"], bfl: ["Black Forest Labs", "Black Forest Labs"] };
  return (noms[provider] ?? [provider, provider])[lg === "fr" ? 0 : 1];
}

/** Les photos du client pour le lot « tout mon catalogue » (photos de produit fournies, au plus `LOT_MAX`). */
export function photosDuCatalogue(projectId: string): string[] {
  return all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND deleted_at IS NULL AND kind = 'image' AND origin IN ('upload','site') AND role IN ('original','packshot','product') ORDER BY created_at LIMIT ?", projectId, LOT_MAX).map((r) => r.id);
}
