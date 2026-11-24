/**
 * LA PLANCHE DE MARQUE PAR OPENAI (accord écrit du propriétaire du 24 novembre 2026, mot pour mot : « Oui, garde
 * vrai-produit-du-client-joint et publication-incomprehensible pour la marque finie, le site et les vraies publications,
 * ajoute et scelle planche-de-marque-openai (une planche par logo choisi, 2.5 Sunburst xhigh 1536x2304, le logo puis la
 * disposition, le texte de base mot pour mot sauf les six parties du métier et la phrase des données vérifiées),
 * planche-donnees-verifiees (l'année en cours et le domaine vérifié, « disponible » ou « à vérifier », comparés lettre pour
 * lettre) et planche-refusee-deux-fois-jamais-montree (une reprise à la charge du Studio avec les raisons ; refusée deux
 * fois, elle n'est pas montrée et SINA propose de la finir à sa charge), et mets à jour les parties Identité et Maquette du
 * site sur la planche de CLAUDE.md. » ; sa demande de départ : « chaque logo choisi à sa planche comme tu viens de le faire
 * et je veux exactement les même planche dans sina »).
 *
 * Preuves (branche du chef d'orchestre, docs/studio/essais-logos-api/) : planche-tenon-xhigh/ et planche-racine-xhigh/
 * (requêtes, réponses, prompt.txt), le prompt-disposition.txt des variantes de planches (le texte de base) et
 * variante-p-tete-de-chien.png (la disposition). Les deux fichiers fixes sont rangés mot pour mot dans
 * assets/planche-de-marque/ ; leurs empreintes sont vérifiées ici et par les tests.
 *
 * Ce module est pur (aucune base, aucun appel payant) : le texte envoyé, le contrôle gratuit des valeurs du métier, la
 * phrase des données vérifiées, la découpe de la planche en bandes, la relecture et la reprise unique. La tâche de fond
 * est dans planche-de-marque-tache.ts ; l'appel d'image dans media-providers.ts (`aiPlancheDeMarque`).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { L } from "../i18n-server";
import { parleDePersonnes } from "./fiche";
import { nomExact } from "./esquisses";
import { NOTE_DU_PROPRIETAIRE } from "./note-du-proprietaire";
import type { NameDomains } from "./brand-domains";

// ---------------------------------------------------------------- 1. les fichiers fixes

export const DOSSIER_DE_LA_PLANCHE = path.join("assets", "planche-de-marque");
/** La disposition des preuves (variante-p-tete-de-chien.png = disposition-variante-2.png de Tenon et de Racine). */
export const DISPOSITION = { fichier: "disposition.png", sha256: "b4e2e0438d9467ffecfef30d450617299b5d547ff35b01d8e7b049f537e152f5", largeur: 1536, hauteur: 2304 } as const;
/** Le texte de base des preuves (prompt-disposition.txt), mot pour mot. */
export const TEXTE_DE_BASE = { fichier: "texte-de-base.txt", sha256: "c513497fb4a90e0d99e066c819c89f2891d8202f85619421f3d4a8532d50d543" } as const;
/**
 * LA DISPOSITION DES MÉTIERS DES ANIMAUX : un EMPLACEMENT VIDE. La disposition standard montre une marque d'accessoires pour
 * chiens : pour un métier proche des animaux, le risque de copie est réel. Aucune image n'est rangée ici sans la validation
 * du propriétaire. Tant que l'emplacement est vide, ce métier prend la disposition standard, et le relecteur reçoit en plus
 * la consigne de refuser toute copie (`metierDesAnimaux`).
 */
export const DISPOSITION_DES_ANIMAUX: { fichier: string; sha256: string } | null = null;

const sha = (b: Buffer | string) => crypto.createHash("sha256").update(b).digest("hex");
const lireFixe = (f: { fichier: string; sha256: string }): Buffer => {
  const data = fs.readFileSync(path.join(process.cwd(), DOSSIER_DE_LA_PLANCHE, f.fichier));
  // Un fichier fixe changé n'est jamais envoyé : la planche serait autre que celle des preuves.
  if (sha(data) !== f.sha256) throw new Error(`Fichier fixe de la planche changé : ${f.fichier} (empreinte attendue ${f.sha256.slice(0, 12)}…). Rien n'est envoyé.`);
  return data;
};
let texteEnMemoire: string | null = null;
export const texteDeBase = (): string => (texteEnMemoire ??= lireFixe(TEXTE_DE_BASE).toString("utf8"));

/** Un métier proche des animaux (animalerie, toilettage, éducation canine, pension, élevage, soins vétérinaires…). */
export const metierDesAnimaux = (t: string): boolean => /(?<![\p{L}])(chiens?|chiots?|chats?|chatons?|canins?|canine|félins?|animaux|animal|animalerie|toilett\p{L}*|vétérinaires?|pensions? pour|éleveurs?|élevages?|chevaux|cheval|équestres?|équitation|oiseaux|rongeurs|croquettes|litières?|aquariums?|niche|laisses?|colliers? pour)(?![\p{L}])/iu.test(t);

/** La disposition jointe en deuxième image : la standard, ou celle des métiers des animaux quand elle sera validée. */
export function laDisposition(metier: string): { png: Buffer; laquelle: "standard" | "animaux"; animaux: boolean } {
  const animaux = metierDesAnimaux(metier);
  if (animaux && DISPOSITION_DES_ANIMAUX) return { png: lireFixe(DISPOSITION_DES_ANIMAUX), laquelle: "animaux", animaux };
  return { png: lireFixe(DISPOSITION), laquelle: "standard", animaux };
}

// ---------------------------------------------------------------- 2. les six parties qui changent

export type SiteDeLaPlanche = "boutique" | "marque";
export const APPELS = ["devis", "rendez-vous", "réservation"] as const;
export type Appel = (typeof APPELS)[number];
const APPEL_ECRIT: Record<Appel, string> = { devis: "demande de devis", "rendez-vous": "prise de rendez-vous", réservation: "réservation" };

/** Les valeurs du métier d'un client : tout ce qui change dans le texte de base (le reste est mot pour mot). */
export type ValeursDuMetier = {
  /** « une entreprise de menuiserie qui réalise des cuisines et des dressings sur mesure » (sans le nom, sans point). */
  metier: string;
  /** 3 ou 4 traits : « artisanale », « chaleureuse », « précise », « haut de gamme ». */
  traits: string[];
  /** L'exemple d'émotion du 1:1 : « la vie dans une cuisine sur mesure ». */
  emotion: string;
  /** Choisi par le code : produits → la boutique ; services → le site de marque. */
  site: SiteDeLaPlanche;
  /** Site de marque seulement : l'appel à l'action, pris dans une liste fermée. */
  appel?: Appel;
  /** Les 4 à 6 images de référence, en quelques mots chacune. */
  images: string[];
  /** 1 à 3 produits ou prestations, tous retrouvés dans la fiche du client (jamais inventés). */
  produits: string[];
};

/** « a, b, c et d ». */
const enumerer = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} et ${l[l.length - 1]}` : l[0] ?? "");

/** Remplace UNE occurrence exacte, sinon une erreur (le texte de base ne bouge jamais ailleurs). */
function remplacer(texte: string, avant: string, apres: string): string {
  const i = texte.indexOf(avant);
  if (i < 0 || texte.indexOf(avant, i + 1) >= 0) throw new Error(`Texte de base inattendu : « ${avant.slice(0, 60)} » doit y être une seule fois.`);
  return texte.slice(0, i) + apres + texte.slice(i + avant.length);
}
/**
 * Les parties du texte de base qui changent, lues dans le fichier fixe lui-même (jamais recopiées dans le code : aucun mot
 * de la marque d'essai de la disposition n'y est écrit). Une forme inattendue arrête tout avant l'envoi.
 */
function partiesDeBase(t: string) {
  const lignes = t.split("\n");
  const nom = /^La première image est le logo (.+?) : /.exec(lignes[0])?.[1];
  const iImportant = lignes.indexOf("Important :");
  const marque = iImportant >= 0 ? lignes[iImportant + 1] : undefined;
  const emotion = lignes.find((l) => l.startsWith("- 1:1 = émotion / "));
  const bloc = (debut: string, fin: (l: string) => boolean) => {
    const i = lignes.findIndex((l) => l.endsWith(debut));
    if (i < 0) return [];
    const out: string[] = [];
    for (let k = i + 1; k < lignes.length && !fin(lignes[k]); k++) out.push(lignes[k]);
    return out;
  };
  const images = bloc("4 à 6 petites images de référence cohérentes, par exemple :", (l) => l === "But :");
  const produits = bloc("Montrer clairement :", (l) => l.startsWith("Les visuels doivent"));
  if (!nom || !marque?.startsWith("- ") || !emotion || images.length !== 6 || produits.length !== 3) throw new Error("Texte de base inattendu : rien n'est envoyé.");
  return { nom, marque, emotion, images, produits };
}

/**
 * LE TEXTE DES PREUVES, refabriqué à partir des valeurs : le texte de base mot pour mot, sauf ses six parties (le nom à
 * cinq endroits, la ligne de la marque, l'exemple d'émotion du 1:1, le type de site en quatre lignes liées, les images de
 * référence, les produits). Refait exactement les prompt.txt de Tenon et de Racine (tests/planche-de-marque.test.ts).
 */
export function texteDesPreuves(nom: string, v: ValeursDuMetier): string {
  const n = nom.trim();
  let t = texteDeBase();
  const b = partiesDeBase(t);
  // 1. Le nom, aux quatre endroits du texte de base (le cinquième est la ligne de la marque).
  if (t.split(b.nom).length - 1 !== 4) throw new Error("Texte de base inattendu : le nom doit y être quatre fois.");
  t = t.split(b.nom).join(n);
  // 2. La ligne de la marque.
  t = remplacer(t, `\n${b.marque}\n`, `\n- ${n}, ${v.metier.trim()} : marque ${enumerer(v.traits.map((x) => x.trim()))}.\n`);
  // 3. L'exemple d'émotion du 1:1.
  t = remplacer(t, b.emotion, `- 1:1 = émotion / ${v.emotion.trim()}`);
  // 4. Le type de site, en quatre lignes liées.
  if (v.site === "marque") {
    t = remplacer(t, "Le site doit sembler être une vraie boutique e-commerce :", "Le site doit sembler être un vrai site de marque :");
    t = remplacer(t, "- CTA\n- produits / collections\n", `- CTA (${APPEL_ECRIT[v.appel ?? "devis"]})\n- réalisations / collections\n`);
    t = remplacer(t, "Les visuels doivent être propres, désirables, e-commerce, avec", "Les visuels doivent être propres, désirables, avec");
  }
  // 5. Les images de référence.
  t = remplacer(t, `par exemple :\n${b.images.map((x) => `${x}\n`).join("")}`, `par exemple :\n${v.images.map((x) => `- ${x.trim()}\n`).join("")}`);
  // 6. Les produits ou les prestations.
  t = remplacer(t, `Montrer clairement :\n${b.produits.map((x) => `${x}\n`).join("")}`, `Montrer clairement :\n${v.produits.map((x) => `- ${x.trim()}\n`).join("")}`);
  return t;
}

// ---------------------------------------------------------------- 3. la phrase des données vérifiées

export type StatutDuDomaine = "disponible" | "a_verifier" | "adresse_a_choisir";
export type DomaineDeLaPlanche = { domaine: string | null; statut: StatutDuDomaine };
export const ADRESSE_A_CHOISIR = "Adresse à choisir";

/**
 * Le domaine de la planche, vérifié AVANT le dessin (findDomains, RDAP, gratuit) : le premier libre (l'exact d'abord) est
 * « disponible » ; sinon un domaine que le registre n'a pas pu dire est « à vérifier » ; tout est pris : « Adresse à choisir ».
 */
export function domaineDeLaPlanche(d: NameDomains | null | undefined, nom: string): DomaineDeLaPlanche {
  if (d?.free.length) return { domaine: d.free[0], statut: "disponible" };
  if (d?.unknown.length) return { domaine: d.unknown[0], statut: "a_verifier" };
  if (d?.taken.length) return { domaine: null, statut: "adresse_a_choisir" };
  // Aucun contrôle possible (nom sans adresse possible) : rien n'est affirmé.
  const s = nom.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return s.length >= 2 ? { domaine: `${s}.fr`, statut: "a_verifier" } : { domaine: null, statut: "adresse_a_choisir" };
}
/** Ce qui doit être écrit dans le bloc 10, mot pour mot (comparé lettre pour lettre par le code après la relecture). */
export const mentionDuDomaine = (d: DomaineDeLaPlanche): string =>
  d.statut === "adresse_a_choisir" || !d.domaine ? ADRESSE_A_CHOISIR : `${d.domaine} — ${d.statut === "disponible" ? "disponible" : "à vérifier"}`;
export const copyright = (annee: number, nom: string) => `© ${annee} ${nom.trim()}`;

/**
 * LA PHRASE DES DONNÉES VÉRIFIÉES, à la fin du texte. L'année vient de l'horloge ; le domaine de la vérification faite
 * avant le dessin. Sans photo de personne ni accord écrit du client, la même phrase ajoute « aucune personne visible »
 * (règle du propriétaire, CLAUDE.md : « Jamais de personne dans une image sans photo fournie par le client ou accord écrit »).
 */
export function phraseDesDonneesVerifiees(o: { nom: string; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean }): string {
  const fin = `n'ajoute aucune promesse, aucun chiffre ni aucun avis${o.personnes ? "" : " ; aucune personne visible"}.`;
  const c = copyright(o.annee, o.nom);
  if (o.domaine.statut === "adresse_a_choisir" || !o.domaine.domaine) return `Dans le bloc 10, à la place du nom de domaine suggéré et de la mention « disponibilité à vérifier », écris exactement « ${ADRESSE_A_CHOISIR} » et « ${c} » ; ${fin}`;
  return `Dans le bloc 10, à la place de la mention « disponibilité à vérifier », écris exactement « ${mentionDuDomaine(o.domaine)} » et « ${c} » ; ${fin}`;
}

/** LE TEXTE ENVOYÉ : celui des preuves, puis la phrase des données vérifiées, puis (reprise) les raisons du refus. */
export function texteDeLaPlanche(o: { nom: string; valeurs: ValeursDuMetier; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean; raisons?: readonly string[] }): string {
  const base = `${texteDesPreuves(o.nom, o.valeurs)}\n${phraseDesDonneesVerifiees(o)}`;
  return o.raisons?.length ? `${base}\n\n${finDeReprise(o.raisons)}` : base;
}
/** Les raisons du refus, ajoutées à la toute fin du texte pour la reprise unique. */
export const finDeReprise = (raisons: readonly string[]) => `À corriger : ${raisons.join(" ; ")}.`;

// ---------------------------------------------------------------- 4. les valeurs du métier (un appel, contrôlé)

export const ValeursEcritesSchema = z.object({
  /** Le nom de la marque, recopié lettre pour lettre (comparé par le code). */
  nom: z.string().max(80),
  traits: z.array(z.string().min(2).max(40)).min(1).max(6),
  emotion: z.string().min(3).max(120),
  images: z.array(z.string().min(3).max(90)).min(1).max(8),
  produits: z.array(z.string().min(2).max(70)).min(1).max(6),
  /** Pour un site de marque seulement (prestations) ; ignoré pour une boutique. */
  appel: z.enum(APPELS).catch("devis"),
});
export type ValeursEcrites = z.infer<typeof ValeursEcritesSchema>;

export const VALEURS_SYSTEM = `Tu prépares, en français simple, les mots d'une planche d'identité visuelle pour une marque. Réponds en JSON :
- nom : le nom de la marque, recopié lettre pour lettre ;
- traits : trois ou quatre adjectifs qui disent la marque (par exemple « artisanale », « chaleureuse », « précise », « haut de gamme ») ;
- emotion : en quelques mots, le moment ou la sensation que vit son client (par exemple « le plaisir de recevoir chez soi »), sans verbe à l'impératif ;
- images : six images de référence de l'univers photo de la marque, quelques mots chacune (lieux, matières, gestes, lumière) ;
- produits : les trois produits ou prestations principaux du client, pris dans ses mots, au pluriel s'il en vend plusieurs ; jamais un produit qu'il n'a pas cité ;
- appel : « devis », « rendez-vous » ou « réservation » : ce que son client demande d'abord.
Chaque valeur en minuscules, sans point final, sans guillemets. Aucun chiffre, aucune promesse (prix, délai, garantie, « le meilleur »), aucun avis.`;

export const demandeDesValeurs = (o: { nom: string; metier: string; fiche: string; personnes: boolean; kind: "produits" | "services" }) => [
  `Le nom de la marque : « ${o.nom} ».`,
  `Son métier, déjà écrit : ${o.metier}.`,
  `Elle vend surtout ${o.kind === "produits" ? "des produits (boutique en ligne)" : "des prestations (site de marque)"}.`,
  o.personnes ? "Le client a donné une photo de personne ou son accord : une personne peut apparaître." : "Aucune personne n'apparaît : ni dans l'émotion, ni dans les images (pas de famille, de client, de main, de visage).",
  "Ce que le client a dit de son entreprise et de ses produits, avec ses mots :",
  o.fiche.trim().slice(0, 4000),
].join("\n");

const plat = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’']/g, " ");
/** Un mot ramené à sa racine simple (pluriel retiré) pour retrouver un produit dans la fiche. */
const racine = (w: string) => w.replace(/(aux|eaux|s|x)$/u, (m) => (m === "aux" ? "al" : m === "eaux" ? "eau" : ""));
const MOTS_VIDES = new Set(["les", "des", "une", "pour", "avec", "sans", "sur", "dans", "par", "aux", "leur", "leurs", "mesure", "tout", "tous", "toute", "toutes"]);
/** Un produit est-il retrouvé dans la fiche du client ? Chacun de ses vrais mots y figure (pluriel mis à part). */
export function produitDansLaFiche(produit: string, fiche: string): boolean {
  const mots = plat(produit).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !MOTS_VIDES.has(w)).map(racine);
  if (!mots.length) return false;
  const dansFiche = new Set(plat(fiche).split(/[^a-z0-9]+/).filter(Boolean).map(racine));
  return mots.every((m) => dansFiche.has(m));
}
/** Les personnes que la règle des personnes interdit sans accord (en plus des mots du corps : mains, visages…). */
const PERSONNES = /(?<![\p{L}])(familles?|couples?|clients?|clientes?|amis?|amies?|équipes?|artisans?|artisanes?|parents?|papas?|mamans?|grands-parents|invités?|propriétaires?|maîtres?|hôtes?|hôtesses?)(?![\p{L}])/iu;
const PROMESSE = /(?<![\p{L}])(garanti\p{L}*|meilleur\p{L}*|n°\s*1|numéro un|le plus|la plus|les plus|gratuit\p{L}*|offert\p{L}*|promo\p{L}*|soldes?|satisfait\p{L}*|rembours\p{L}*|certifi\p{L}*|imbattables?|parfait\p{L}*|incomparables?|unique au monde|pas cher|moins cher|avis|étoiles?|livraison)(?![\p{L}])/iu;

/**
 * LE CONTRÔLE GRATUIT des valeurs écrites : le nom exact, 3 ou 4 traits, chaque produit retrouvé dans la fiche (sinon il
 * est retiré : moins de 3, jamais inventé ; aucun : une faute), aucune personne sans accord, aucun chiffre ni promesse.
 * Rend les valeurs gardées (le métier et le type de site sont posés par le code) et les fautes (pour la réécriture).
 */
export function controleDesValeurs(v: ValeursEcrites, o: { nom: string; metier: string; fiche: string; personnes: boolean; kind: "produits" | "services" }): { valeurs: ValeursDuMetier; fautes: string[]; retires: string[] } {
  const fautes: string[] = [];
  const propre = (t: string) => t.trim().replace(/[.;:!?]+$/, "").replace(/[«»"“”]/g, "").replace(/\s+/g, " ");
  if (v.nom.trim() !== o.nom.trim()) fautes.push(`le nom recopié (« ${v.nom.trim()} ») n'est pas exactement « ${o.nom.trim()} »`);
  const traits = v.traits.map(propre).filter(Boolean);
  if (traits.length < 3 || traits.length > 4) fautes.push(`il faut trois ou quatre traits, pas ${traits.length}`);
  const images = v.images.map(propre).filter(Boolean).slice(0, 6);
  if (images.length < 4) fautes.push("il faut au moins quatre images de référence (six de préférence)");
  const retires: string[] = [];
  const produits = v.produits.map(propre).filter(Boolean).filter((p) => (produitDansLaFiche(p, o.fiche) ? true : (retires.push(p), false))).slice(0, 3);
  if (!produits.length) fautes.push(`aucun produit n'est pris dans les mots du client (${retires.map((p) => `« ${p} »`).join(", ") || "aucun"} n'y figure pas) : reprends ses produits ou ses prestations tels qu'il les cite`);
  const textes = [...traits, propre(v.emotion), ...images, ...produits];
  if (!o.personnes) { const p = textes.filter((t) => parleDePersonnes(t) || PERSONNES.test(t)); if (p.length) fautes.push(`aucune personne sans l'accord du client : retire ${p.map((t) => `« ${t} »`).join(", ")}`); }
  const chiffres = textes.filter((t) => /\p{N}/u.test(t));
  if (chiffres.length) fautes.push(`aucun chiffre : ${chiffres.map((t) => `« ${t} »`).join(", ")}`);
  const promesses = textes.filter((t) => PROMESSE.test(t));
  if (promesses.length) fautes.push(`aucune promesse ni avis : ${promesses.map((t) => `« ${t} »`).join(", ")}`);
  const site: SiteDeLaPlanche = o.kind === "produits" ? "boutique" : "marque";
  return { valeurs: { metier: o.metier.trim().replace(/[.]+$/, ""), traits: traits.slice(0, 4), emotion: propre(v.emotion), site, ...(site === "marque" ? { appel: v.appel } : {}), images, produits }, fautes, retires };
}

/**
 * Les valeurs du métier : UN appel par client (le modèle de texte le plus fort, effort moyen), contrôlé gratuitement ;
 * une seule réécriture, à la charge du Studio. Encore fautive : la planche n'est pas faite (rien n'est inventé).
 */
export async function ecrireLesValeurs(deps: { ecrire: (demande: string, tour: number) => Promise<ValeursEcrites>; aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T> }, o: Parameters<typeof controleDesValeurs>[1]): Promise<{ ok: true; valeurs: ValeursDuMetier; notes: string[] } | { ok: false; raison: string; notes: string[] }> {
  const notes: string[] = [], demande = demandeDesValeurs(o);
  const c1 = controleDesValeurs(await deps.ecrire(demande, 1), o);
  if (c1.retires.length) notes.push(`produits retirés (absents de la fiche du client) : ${c1.retires.join(", ")}`);
  if (!c1.fautes.length) return { ok: true, valeurs: c1.valeurs, notes };
  notes.push(`valeurs de la planche réécrites à la charge du Studio : ${c1.fautes.join(" ; ")}`);
  const c2 = controleDesValeurs(await deps.aLaChargeDuStudio(() => deps.ecrire(`${demande}\n\nTa première réponse ne convenait pas : ${c1.fautes.join(" ; ")}. Réécris-la.`, 2)), o);
  if (c2.retires.length) notes.push(`produits retirés (absents de la fiche du client) : ${c2.retires.join(", ")}`);
  return c2.fautes.length ? { ok: false, raison: c2.fautes.join(" ; "), notes } : { ok: true, valeurs: c2.valeurs, notes };
}

// ---------------------------------------------------------------- 5. la relecture

/** La planche découpée gratuitement en bandes lisibles (pleine largeur, qui se chevauchent un peu). */
export async function bandesDeLaPlanche(png: Buffer, n = 4, chevauchement = 48): Promise<Buffer[]> {
  const m = await sharp(png).metadata();
  const w = m.width ?? 0, h = m.height ?? 0;
  if (!w || !h) return [png];
  const pas = Math.ceil(h / n), out: Buffer[] = [];
  for (let i = 0; i < n; i++) {
    const top = Math.max(0, i * pas - chevauchement), bas = Math.min(h, (i + 1) * pas + chevauchement);
    out.push(await sharp(png).extract({ left: 0, top, width: w, height: bas - top }).png().toBuffer());
  }
  return out;
}

export const RelectureDeLaPlancheSchema = z.object({
  nomLu: z.string().max(80).default(""),
  /** Le logo de la planche est exactement celui de l'image « logo » (ni redessiné, ni changé). */
  logoFidele: z.boolean().catch(false),
  /** La ligne du copyright du bloc 10, recopiée lettre pour lettre (« © 2026 Nom »). */
  copyrightLu: z.string().max(120).default(""),
  /** Ce qui est écrit à la place de la disponibilité du domaine, recopié lettre pour lettre. */
  domaineLu: z.string().max(160).default(""),
  fautes: z.array(z.string().max(200)).max(20).catch([]),
  promesses: z.array(z.string().max(200)).max(20).catch([]),
  personnes: z.boolean().catch(true),
  logoFonceSurFondSombre: z.boolean().catch(true),
  motMaquette: z.boolean().catch(true),
  /** Ce qui est recopié de la disposition : ses produits, ses photos, son emballage, son nom ou son logo. */
  copies: z.array(z.string().max(200)).max(20).catch([]),
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(600).default(""),
});
export type RelectureDeLaPlanche = z.infer<typeof RelectureDeLaPlancheSchema>;

export const RELECTEUR_DE_LA_PLANCHE = `Tu es le relecteur le plus exigeant d'un studio de création de marques. On te montre une planche d'identité visuelle découpée en bandes, de haut en bas (« bande 1 » à « bande 4 », elles se chevauchent un peu), le logo de la marque (« logo ») et la disposition imposée (« disposition », celle d'une AUTRE marque, qui ne donne que l'emplacement des blocs). Réponds en JSON :
- nomLu : le nom de la marque tel qu'il est écrit en grand sur la planche, lettre pour lettre ;
- logoFidele : le logo de la planche est exactement celui de l'image « logo » (même dessin, mêmes lettres), jamais redessiné ;
- copyrightLu : la ligne du copyright du bloc 10, recopiée lettre pour lettre (« © … ») ;
- domaineLu : ce qui est écrit dans le bloc 10 pour le nom de domaine et sa disponibilité, recopié lettre pour lettre ;
- fautes : chaque faute d'orthographe ou mot mal écrit, recopié ;
- promesses : chaque promesse, chiffre ou avis inventé (prix, délai, garantie, note, « livraison offerte »…), recopié ;
- personnes : une personne, un visage ou une main est visible ;
- logoFonceSurFondSombre : un logo foncé posé sur un fond sombre (il doit y être clair) ;
- motMaquette : le mot « maquette » ou « mockup » est écrit sur la planche ;
- copies : chaque élément recopié de la disposition (ses produits, ses photos, son emballage, son nom ou son logo) ;
- note : ta note de 0 à 10 face aux planches des meilleures agences ;
- pourquoi : une ou deux phrases simples.
Ne juge que ce que tu vois.`;

export type AttenduDeLaPlanche = { nom: string; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean; animaux: boolean };
export function demandeAuRelecteurDeLaPlanche(o: AttenduDeLaPlanche & { texte: string }): string {
  return [
    `Marque : « ${o.nom} ».`,
    o.personnes ? "Le client a donné son accord pour des personnes." : "Le client n'a donné ni photo de personne ni accord : aucune personne ne doit être visible.",
    ...(o.animaux ? ["La marque travaille, comme celle de la disposition, autour des animaux : sois particulièrement attentif à toute copie de la disposition (ses produits, ses photos, son emballage, son nom, son logo)."] : []),
    `Le texte envoyé au dessinateur : « ${o.texte} »`,
  ].join("\n");
}
const lettreALettre = (t: string) => t.normalize("NFC").replace(/\s+/g, " ").replace(/\s*[—–-]\s*(?=disponible|à vérifier)/u, " — ").trim();
/**
 * Les raisons du refus d'une planche : le code compare le nom, le copyright (l'année) et le domaine lettre pour lettre ; le
 * relecteur dit le logo redessiné, les fautes, les promesses, les personnes sans accord, le logo foncé sur fond sombre, le
 * mot « maquette », les copies de la disposition, et sa note (8 au moins). Vide : gardée.
 */
export function raisonsDuRefusDeLaPlanche(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): string[] {
  const r: string[] = [];
  if (!nomExact(v.nomLu, o.nom)) r.push(v.nomLu ? `le nom est mal écrit (« ${v.nomLu} » au lieu de « ${o.nom} »)` : `le nom « ${o.nom} » n'y est pas écrit`);
  if (!v.logoFidele) r.push("le logo est faux ou redessiné : il doit être exactement celui de la première image");
  const c = copyright(o.annee, o.nom);
  if (lettreALettre(v.copyrightLu) !== lettreALettre(c)) r.push(`le copyright doit être exactement « ${c} »${v.copyrightLu ? ` (lu : « ${v.copyrightLu} »)` : ""}`);
  const m = mentionDuDomaine(o.domaine);
  if (lettreALettre(v.domaineLu) !== lettreALettre(m)) r.push(`le bloc 10 doit dire exactement « ${m} »${v.domaineLu ? ` (lu : « ${v.domaineLu} »)` : ""}`);
  if (v.fautes.length) r.push(`fautes : ${v.fautes.map((f) => `« ${f} »`).join(", ")}`);
  if (v.promesses.length) r.push(`promesses ou chiffres inventés : ${v.promesses.map((f) => `« ${f} »`).join(", ")}`);
  if (v.personnes && !o.personnes) r.push("une personne est visible sans l'accord du client");
  if (v.logoFonceSurFondSombre) r.push("un logo foncé est posé sur un fond sombre : il doit y être clair");
  if (v.motMaquette) r.push("le mot « maquette » ou « mockup » est écrit");
  if (v.copies.length) r.push(`éléments recopiés de la disposition : ${v.copies.join(", ")}`);
  if (v.note < NOTE_DU_PROPRIETAIRE) r.push(`elle n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
  return r;
}

// ---------------------------------------------------------------- 6. la planche entière : dessin, relecture, reprise unique

export type PlancheDeps = {
  /** POST /v1/images/edits : image[] = le logo, puis la disposition ; le texte tel quel. */
  dessiner: (logo: Buffer, disposition: Buffer, texte: string, tour: number) => Promise<Buffer>;
  /** Le relecteur le plus fort, effort élevé : les bandes, le logo, la disposition. */
  relire: (bandes: Buffer[], logo: Buffer, disposition: Buffer, demande: string, tour: number) => Promise<RelectureDeLaPlanche>;
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
};
export type EssaiDePlanche = { tour: number; texte: string; png: Buffer; verdict: RelectureDeLaPlanche; raisons: string[] };
export type ResultatDeLaPlanche = { ok: true; png: Buffer; texte: string; essais: EssaiDePlanche[] } | { ok: false; raison: string; essais: EssaiDePlanche[] };

/**
 * Une planche de marque : dessinée, relue ; refusée une fois, refaite UNE fois à la charge du Studio avec ses raisons à
 * la fin du texte ; refusée deux fois, elle n'est pas gardée (jamais montrée). Une panne du fournisseur n'est jamais
 * relancée toute seule : l'erreur remonte.
 */
export async function dessinerLaPlanche(deps: PlancheDeps, o: AttenduDeLaPlanche & { valeurs: ValeursDuMetier; logo: Buffer; disposition: Buffer }): Promise<ResultatDeLaPlanche> {
  const essais: EssaiDePlanche[] = [];
  const essai = async (tour: number, raisons?: readonly string[]): Promise<EssaiDePlanche> => {
    const texte = texteDeLaPlanche({ ...o, raisons });
    const png = await deps.dessiner(o.logo, o.disposition, texte, tour);
    const verdict = await deps.relire(await bandesDeLaPlanche(png), o.logo, o.disposition, demandeAuRelecteurDeLaPlanche({ ...o, texte }), tour);
    return { tour, texte, png, verdict, raisons: raisonsDuRefusDeLaPlanche(verdict, o) };
  };
  const premier = await essai(1);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, png: premier.png, texte: premier.texte, essais };
  const second = await deps.aLaChargeDuStudio(() => essai(2, premier.raisons));
  essais.push(second);
  if (!second.raisons.length) return { ok: true, png: second.png, texte: second.texte, essais };
  return { ok: false, raison: `refusée deux fois (${second.raisons.join(" ; ")})`, essais };
}

// ---------------------------------------------------------------- 7. ce que SINA dit

/** La planche refusée deux fois : elle n'est pas montrée ; SINA propose de la finir à sa charge. */
export const phraseDeLaPlancheNonMontree = (nom: string, key: string) => L(
  `Identité ${key} « ${nom} » : je ne te montre pas cette planche, elle n'a pas passé ma relecture, même refaite. Je peux la refaire à ma charge : rien n'est compté sur ton budget.`,
  `Identity ${key} “${nom}”: I am not showing you this board, it did not pass my review, even redone. I can redo it at my expense: nothing is charged to your budget.`);
/** La case du domaine, sous la planche. */
export const caseDuDomaine = (d: DomaineDeLaPlanche) => d.statut === "disponible" && d.domaine
  ? L(`${d.domaine} : libre aujourd'hui, seule la réservation le garantit.`, `${d.domaine}: free today, only booking guarantees it.`)
  : d.statut === "a_verifier" && d.domaine ? L(`${d.domaine} : pas pu vérifier aujourd'hui.`, `${d.domaine}: could not be checked today.`)
    : L("Adresse à choisir : les adresses simples avec ce nom sont déjà prises.", "Address to choose: the simple addresses with this name are taken.");
