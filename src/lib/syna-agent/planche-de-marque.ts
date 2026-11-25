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
 *
 * LA PHRASE SOUS LE LOGO (25 novembre 2026 ; constat de l'essai réel d'Écume, présenté par le chef d'orchestre : « la
 * planche de marque ne connaît pas la phrase choisie sous le logo. Sa « ligne de la marque » est écrite par les valeurs du
 * métier, sans lien avec la phrase du logo. Or le choix du client se reprend mot pour mot. »). Quand le client a choisi
 * une phrase pour ce logo (toutes ses lignes, dans l'ordre), le code la pose dans la ligne de la marque, mot pour mot,
 * APRÈS l'appel des valeurs, qui ne la voit ni ne l'écrit jamais (`ligneDeLaMarque`) ; le contrôle gratuit vérifie
 * qu'elle figure mot pour mot dans le texte envoyé (`controleDeLaPhrase`) ; le relecteur recopie chaque endroit où elle
 * est écrite sur la planche et le code compare lettre pour lettre (`lectureDeLaPlanche`) : mal écrite, elle fait refuser
 * la planche comme un nom mal écrit, et ce n'est jamais un micro-texte décoratif. Sans phrase (« aucune », ou rien de
 * choisi), rien ne change : le texte, la demande au relecteur et sa réponse sont ceux d'avant.
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
import { comparerLesLignes, lignesDe, lignesDuTexte, phraseVoulue, type PhraseChoisie } from "./phrase-sous-le-nom";
import type { NameDomains } from "./brand-domains";

// ---------------------------------------------------------------- 1. les fichiers fixes

export const DOSSIER_DE_LA_PLANCHE = path.join("assets", "planche-de-marque");
/** La disposition des preuves (variante-p-tete-de-chien.png = disposition-variante-2.png de Tenon et de Racine). */
export const DISPOSITION = { fichier: "disposition.png", sha256: "b4e2e0438d9467ffecfef30d450617299b5d547ff35b01d8e7b049f537e152f5", largeur: 1536, hauteur: 2304 } as const;
/** Le texte de base des preuves (prompt-disposition.txt), mot pour mot. */
export const TEXTE_DE_BASE = { fichier: "texte-de-base.txt", sha256: "c513497fb4a90e0d99e066c819c89f2891d8202f85619421f3d4a8532d50d543" } as const;
/**
 * LA DISPOSITION DES MÉTIERS DES ANIMAUX. La disposition standard montre une marque d'accessoires pour chiens : pour un
 * métier proche des animaux, OpenAI en recopiait les produits, les photos et l'emballage (essai réel). Ces métiers prennent
 * donc la planche de Racine (mêmes blocs aux mêmes places, une boutique, aucun animal), validée par le propriétaire le
 * 25 novembre 2026 : « Oui », à « Tu valides la planche de Racine comme modèle pour les marques d'animaux ? » (relayé mot
 * pour mot par le chef d'orchestre ; fichier : docs/studio/essais-logos-api/planche-racine-xhigh/planche-racine-xhigh.png,
 * branche du chef d'orchestre). Le relecteur refuse toujours toute copie de la disposition.
 */
export const DISPOSITION_DES_ANIMAUX: { fichier: string; sha256: string } | null = { fichier: "disposition-animaux.png", sha256: "d183d5f879c4946c8c169c67fc10f52219e70c90c6c01c3421fe1a77c44926ff" };

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

// ---------------------------------------------------------------- 2 bis. la phrase sous le logo

/**
 * Les lignes de la phrase choisie pour un logo, dans l'ordre, nettoyées (une ligne par entrée, jamais de retour à la
 * ligne dedans) ; `undefined` sans phrase (« aucune », vide, ou rien de choisi).
 */
export function lignesDeLaPhrase(p: readonly string[] | string | null | undefined): string[] | undefined {
  if (p == null) return undefined;
  const l = (typeof p === "string" ? [p] : [...p]).flatMap((x) => lignesDuTexte(String(x)));
  return l.length ? l : undefined;
}
/**
 * La phrase choisie par le client pour le logo fini `assetId` (méthode des graphistes : `graphistes.phrases`, par numéro
 * d'esquisse ; le logo est retrouvé par son image sur fond blanc ou sa version sans fond). Ses lignes, dans l'ordre ;
 * `undefined` s'il n'a rien choisi ou s'il ne veut aucune phrase.
 */
export function phraseDuLogoFini(g: { logos?: { numero: number; assetId?: string; detoureAssetId?: string }[]; phrases?: Record<string, PhraseChoisie> } | null | undefined, assetId: string | null | undefined): string[] | undefined {
  if (!g || !assetId) return undefined;
  const fini = g.logos?.find((l) => l.assetId === assetId || l.detoureAssetId === assetId);
  const v = fini ? phraseVoulue(g.phrases?.[String(fini.numero)]) : undefined;
  return v && "texte" in v ? lignesDeLaPhrase(lignesDe(v)) : undefined;
}
/** Les lignes dites dans un texte : « A » ou « A » puis « B ». */
const lignesDites = (l: readonly string[]) => l.map((x) => `« ${x} »`).join(" puis ");
/**
 * LA LIGNE DE LA MARQUE (l'une des six parties) : le nom, le métier et les traits, puis, quand le client a choisi une
 * phrase pour ce logo, cette phrase, posée par le code mot pour mot, toutes ses lignes dans l'ordre. Sans phrase : la
 * ligne d'avant, à l'identique.
 */
export function ligneDeLaMarque(nom: string, v: Pick<ValeursDuMetier, "metier" | "traits">, phrase?: readonly string[]): string {
  const base = `- ${nom.trim()}, ${v.metier.trim()} : marque ${enumerer(v.traits.map((x) => x.trim()))}.`;
  if (!phrase?.length) return base;
  return phrase.length > 1
    ? `${base} Sa phrase, choisie par le client et écrite sous le logo, en ${phrase.length} lignes, dans cet ordre : ${lignesDites(phrase)} ; c'est aussi son slogan : partout où la planche l'écrit, écris-la exactement, toutes ses lignes dans cet ordre, sans en changer une lettre ni un accent.`
    : `${base} Sa phrase, choisie par le client et écrite sous le logo : ${lignesDites(phrase)} ; c'est aussi son slogan : partout où la planche l'écrit, écris-la exactement, sans en changer une lettre ni un accent.`;
}
/**
 * LE CONTRÔLE GRATUIT de la phrase dans le texte envoyé : chaque ligne y figure mot pour mot, entre guillemets. Une liste
 * vide : bon. Le code la pose lui-même ; ce contrôle garantit qu'aucune réécriture ne l'a changée avant l'envoi.
 */
export function controleDeLaPhrase(texte: string, phrase: readonly string[] | undefined): string[] {
  if (!phrase?.length) return [];
  return phrase.filter((l) => !texte.includes(`« ${l} »`)).map((l) => `la phrase choisie par le client n'est pas reprise mot pour mot dans le texte de la planche : il manque « ${l} »`);
}

/**
 * LE TEXTE DES PREUVES, refabriqué à partir des valeurs : le texte de base mot pour mot, sauf ses six parties (le nom à
 * cinq endroits, la ligne de la marque, l'exemple d'émotion du 1:1, le type de site en quatre lignes liées, les images de
 * référence, les produits). Refait exactement les prompt.txt de Tenon et de Racine (tests/planche-de-marque.test.ts).
 * `phrase` : les lignes de la phrase choisie sous le logo, posées par le code dans la ligne de la marque (`ligneDeLaMarque`).
 */
export function texteDesPreuves(nom: string, v: ValeursDuMetier, phrase?: readonly string[]): string {
  const n = nom.trim();
  let t = texteDeBase();
  const b = partiesDeBase(t);
  // 1. Le nom, aux quatre endroits du texte de base (le cinquième est la ligne de la marque).
  if (t.split(b.nom).length - 1 !== 4) throw new Error("Texte de base inattendu : le nom doit y être quatre fois.");
  t = t.split(b.nom).join(n);
  // 2. La ligne de la marque.
  t = remplacer(t, `\n${b.marque}\n`, `\n${ligneDeLaMarque(n, v, phrase)}\n`);
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

/**
 * LE TEXTE ENVOYÉ : celui des preuves (avec la phrase sous le logo, s'il y en a une), puis la phrase des données
 * vérifiées, puis (reprise) les raisons du refus. La phrase est contrôlée mot pour mot avant l'envoi : absente, rien
 * n'est envoyé.
 */
export function texteDeLaPlanche(o: { nom: string; valeurs: ValeursDuMetier; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean; raisons?: readonly string[]; phrase?: readonly string[] }): string {
  const base = `${texteDesPreuves(o.nom, o.valeurs, o.phrase)}\n${phraseDesDonneesVerifiees(o)}`;
  const t = o.raisons?.length ? `${base}\n\n${finDeReprise(o.raisons)}` : base;
  const fautes = controleDeLaPhrase(t, o.phrase);
  if (fautes.length) throw new Error(`${fautes.join(" ; ")}. Rien n'est envoyé.`);
  return t;
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
  /** Les fautes dans les textes lisibles à taille normale (le nom, les accroches, les titres des blocs, les mentions…). */
  fautes: z.array(z.string().max(200)).max(20).catch([]),
  /** Les micro-textes décoratifs déformés, illisibles à taille normale (25 novembre 2026) : notés, jamais un refus. */
  microTextes: z.array(z.string().max(200)).max(20).catch([]),
  promesses: z.array(z.string().max(200)).max(20).catch([]),
  personnes: z.boolean().catch(true),
  logoFonceSurFondSombre: z.boolean().catch(true),
  motMaquette: z.boolean().catch(true),
  /** Ce qui est recopié de la disposition : ses produits, ses photos, son emballage, son nom ou son logo. */
  copies: z.array(z.string().max(200)).max(20).catch([]),
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(600).default(""),
});
/**
 * La réponse du relecteur quand le client a choisi une phrase sous le logo (25 novembre 2026) : en plus, chaque endroit
 * de la planche où elle est écrite, recopié lettre pour lettre, ses lignes séparées par « / ». Sans phrase, la réponse
 * demandée reste celle d'avant (`RelectureDeLaPlancheSchema`).
 */
export const RelectureAvecPhraseSchema = RelectureDeLaPlancheSchema.extend({
  phrasesLues: z.array(z.string().max(400)).max(20).catch([]),
});
/**
 * Un verdict du relecteur ; `microTextes` est absent d'un verdict d'avant le 25 novembre 2026 ; `phrasesLues` n'existe
 * que quand le client a choisi une phrase sous le logo.
 */
export type RelectureDeLaPlanche = Omit<z.infer<typeof RelectureDeLaPlancheSchema>, "microTextes"> & { microTextes?: string[]; phrasesLues?: string[] };

/**
 * Le repère du propriétaire, mot pour mot (25 novembre 2026) : devant les planches A-2 et B-2 de l'essai réel de Racine
 * (planches-execution), refusées à 7 et 7,5 pour les alphabets des spécimens, le petit texte circulaire du badge et des
 * mots de réassurance pris pour des promesses. Aucune image d'essai n'est montrée au relecteur : seulement ces mots.
 */
export const QUESTION_DU_REPERE_DE_PLANCHE = "Ces deux planches te paraissent montrables à un client telles quelles ?";
export const REPONSE_DU_PROPRIETAIRE_PLANCHE = "C'est très bien";

/**
 * Un micro-texte décoratif, illisible à taille normale (25 novembre 2026) : une ligne d'alphabet d'un spécimen de police,
 * le petit texte circulaire d'un badge, l'heure de la barre d'état d'un téléphone. Le code l'écarte des fautes, même dans
 * un verdict d'avant ce partage : il le reconnaît à ces mots, ou à une ligne qui commence par « abc » sans espace.
 */
const MICRO_TEXTE = /alphabet|bas de casse|sp[ée]cimen|texte circulaire|badge|sceau|barre d'[ée]tat/iu;
export const microTexteDecoratif = (f: string): boolean => {
  const t = f.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’ʼ]/g, "'").toLowerCase();
  if (MICRO_TEXTE.test(t)) return true;
  const mot = t.replace(/\(.*\)/g, "").trim();
  return /^abc\S{12,}$/u.test(mot);
};
/**
 * Une promesse qui fait refuser (25 novembre 2026) : mesurable ou garantie (un chiffre, gratuit, offert, un délai, un
 * montant, un prix, un remboursement, une garantie, une note, un avis, un nombre de clients, une sécurité promise…). Le
 * code écarte, de façon sûre, ce qui n'est qu'un mot qualitatif : jamais une phrase qui porte un chiffre ou un de ces
 * mots, jamais une phrase de plus de six mots.
 */
const MESURABLE = /\p{N}|[%€$£]|gratuit|offert|delai|express|rapide|24 ?h|48 ?h|heure|jour|semaine|minute|rembours|garanti|satisfait|securis|certifi|label|note|avis|etoile|client|meilleur|n ?° ?1|numero (un|1)|leader|premier|prix|cher|promo|reduction|remise|solde|retour|echange|sans frais|frais de port|illimit|a vie|toujours|jamais|100|unique/u;
export const promesseMesurable = (p: string): boolean => {
  const t = p.normalize("NFD").replace(/\p{M}/gu, "").replace(/[’ʼ]/g, "'").toLowerCase().trim();
  return MESURABLE.test(t) || t.split(/\s+/).filter(Boolean).length > 6;
};

export const RELECTEUR_DE_LA_PLANCHE = `Tu es le relecteur le plus exigeant d'un studio de création de marques. On te montre une planche d'identité visuelle découpée en bandes, de haut en bas (« bande 1 » à « bande 4 », elles se chevauchent un peu), le logo de la marque (« logo ») et la disposition imposée (« disposition », celle d'une AUTRE marque, qui ne donne que l'emplacement des blocs). Réponds en JSON :
- nomLu : le nom de la marque tel qu'il est écrit en grand sur la planche, lettre pour lettre ;
- logoFidele : le logo de la planche est exactement celui de l'image « logo » (même dessin, mêmes lettres), jamais redessiné ;
- copyrightLu : la ligne du copyright du bloc 10, recopiée lettre pour lettre (« © … ») ;
- domaineLu : ce qui est écrit dans le bloc 10 pour le nom de domaine et sa disponibilité, recopié lettre pour lettre ;
- fautes : chaque faute d'orthographe ou mot mal écrit dans un texte lisible à taille normale (le nom, les accroches, les titres des blocs, les mentions, le domaine, l'année), recopié ;
- microTextes : les micro-textes décoratifs, illisibles à taille normale, que tu ne juges pas : les lignes d'alphabet des spécimens de polices, le petit texte circulaire d'un badge, l'heure de la barre d'état d'un téléphone ; recopiés s'ils sont déformés, jamais mis dans fautes ;
- promesses : chaque promesse mesurable ou garantie inventée (gratuit, offert, délai, montant, prix, remboursement, garantie, chiffre, note, avis, nombre de clients…), recopiée ; un mot qualitatif ordinaire (soigné, sélectionné, conseils, qualité) n'est pas une promesse ;
- personnes : une personne, un visage ou une main est visible ;
- logoFonceSurFondSombre : un logo foncé posé sur un fond sombre (il doit y être clair) ;
- motMaquette : le mot « maquette » ou « mockup » est écrit sur la planche ;
- copies : chaque élément recopié de la disposition (ses produits, ses photos, son emballage, son nom ou son logo) ;
- note : ta note de 0 à 10. Une planche complète, juste dans ses textes lisibles et soignée vaut 8 ou plus ; un micro-texte décoratif ou un mot qualitatif ne fait jamais descendre la note sous 8. Ton repère : à la question « ${QUESTION_DU_REPERE_DE_PLANCHE} », posée devant deux planches dont seuls les alphabets des spécimens, le petit texte circulaire du badge et des mots qualitatifs de réassurance étaient reprochés, le propriétaire du Studio a répondu : « ${REPONSE_DU_PROPRIETAIRE_PLANCHE} » ;
- pourquoi : une ou deux phrases simples.
Ne juge que ce que tu vois.`;

/** `phrase` : les lignes de la phrase choisie sous le logo, dans l'ordre (absente : aucune phrase choisie). */
export type AttenduDeLaPlanche = { nom: string; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean; animaux: boolean; phrase?: readonly string[] };
/** Ce que la demande au relecteur dit de la phrase choisie sous le logo (vide sans phrase). */
export const demandeDeLaPhrase = (phrase: readonly string[] | undefined): string[] => !phrase?.length ? [] : [
  `Le client a choisi la phrase écrite sous son logo${phrase.length > 1 ? `, en ${phrase.length} lignes, dans cet ordre` : ""} : ${lignesDites(phrase)}. Elle n'est pas inventée, et ce n'est jamais un micro-texte décoratif : vérifie qu'elle est écrite exactement, lettre pour lettre, partout où elle apparaît sur la planche (sous le logo et ses variantes, comme slogan, ailleurs), et recopie dans « phrasesLues » chaque endroit où elle apparaît, ce que tu lis vraiment, ${phrase.length > 1 ? "toutes ses lignes dans l'ordre, séparées par « / »" : "sans rien corriger"} ; une faute dans cette phrase va aussi dans fautes.`,
];
export function demandeAuRelecteurDeLaPlanche(o: AttenduDeLaPlanche & { texte: string }): string {
  return [
    `Marque : « ${o.nom} ».`,
    o.personnes ? "Le client a donné son accord pour des personnes." : "Le client n'a donné ni photo de personne ni accord : aucune personne ne doit être visible.",
    ...demandeDeLaPhrase(o.phrase),
    ...(o.animaux ? ["La marque travaille, comme celle de la disposition, autour des animaux : sois particulièrement attentif à toute copie de la disposition (ses produits, ses photos, son emballage, son nom, son logo)."] : []),
    `Le texte envoyé au dessinateur : « ${o.texte} »`,
  ].join("\n");
}
/** Les mots d'un texte, sans accents ni casse, d'au moins trois lettres. */
const motsDe = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/[^a-z0-9]+/u).filter((w) => w.length >= 3);
/** La distance d'édition entre deux mots (lettres ajoutées, retirées ou changées). */
function distance(a: string, b: string): number {
  let prec = Array.from({ length: b.length + 1 }, (_x, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prec = cur;
  }
  return prec[b.length];
}
/** Un mot relevé ressemble-t-il à un mot de la phrase ? Le même, ou mal écrit d'une lettre (deux pour un mot long). */
const ressemble = (lu: string, voulu: string) => lu === voulu || (voulu.length >= 5 && Math.abs(lu.length - voulu.length) <= 2 && distance(lu, voulu) <= (voulu.length >= 8 ? 2 : 1));
/**
 * Un texte relevé par le relecteur touche-t-il la phrase choisie ? Au moins la moitié des mots d'une de ses lignes s'y
 * retrouvent, même mal écrits. Ce qui la touche n'est jamais écarté comme micro-texte décoratif.
 */
export function touchePhrase(f: string, phrase: readonly string[] | undefined): boolean {
  if (!phrase?.length) return false;
  const dans = motsDe(f);
  return phrase.some((l) => { const m = motsDe(l); return m.length > 0 && m.filter((w) => dans.some((d) => ressemble(d, w))).length * 2 >= m.length; });
}
const lettreALettre = (t: string) => t.normalize("NFC").replace(/\s+/g, " ").replace(/\s*[—–-]\s*(?=disponible|à vérifier)/u, " — ").trim();
/**
 * Les raisons du refus d'une planche : le code compare le nom, le copyright (l'année) et le domaine lettre pour lettre ; le
 * relecteur dit le logo redessiné, les fautes, les promesses, les personnes sans accord, le logo foncé sur fond sombre, le
 * mot « maquette », les copies de la disposition, et sa note (8 au moins). Vide : gardée.
 */
export function raisonsDuRefusDeLaPlanche(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): string[] {
  return lectureDeLaPlanche(v, o).raisons;
}

/**
 * Ce que le code retient du verdict (25 novembre 2026) : les raisons du refus, et ce qu'il écarte (les micro-textes
 * décoratifs et les mots qualitatifs pris pour des promesses), pour le compte rendu. Une note sous 8 ne compte pas quand
 * elle ne tenait qu'à ce qui est écarté (rien d'autre n'est reproché) ; sans rien d'écrit, elle reste un refus, par
 * prudence. Le nom, l'année et le domaine sont toujours comparés lettre pour lettre.
 */
export function lectureDeLaPlanche(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): { raisons: string[]; ecartes: string[] } {
  const r: string[] = [];
  const phrase = o.phrase?.length ? [...o.phrase] : undefined;
  // Ce qui touche la phrase choisie n'est jamais un micro-texte décoratif à ignorer.
  const decoratif = (f: string) => microTexteDecoratif(f) && !touchePhrase(f, phrase);
  if (!nomExact(v.nomLu, o.nom)) r.push(v.nomLu ? `le nom est mal écrit (« ${v.nomLu} » au lieu de « ${o.nom} »)` : `le nom « ${o.nom} » n'y est pas écrit`);
  if (!v.logoFidele) r.push("le logo est faux ou redessiné : il doit être exactement celui de la première image");
  const c = copyright(o.annee, o.nom);
  if (lettreALettre(v.copyrightLu) !== lettreALettre(c)) r.push(`le copyright doit être exactement « ${c} »${v.copyrightLu ? ` (lu : « ${v.copyrightLu} »)` : ""}`);
  const m = mentionDuDomaine(o.domaine);
  if (lettreALettre(v.domaineLu) !== lettreALettre(m)) r.push(`le bloc 10 doit dire exactement « ${m} »${v.domaineLu ? ` (lu : « ${v.domaineLu} »)` : ""}`);
  if (phrase) {
    // La phrase choisie par le client, comparée lettre pour lettre par le code à chaque endroit où le relecteur la lit.
    const dite = phrase.map((l) => `« ${l} »`).join(" / ");
    const lues = (v.phrasesLues ?? []).map((x) => x.trim()).filter((x) => x && !/^(aucune|aucun|none|rien)\.?$/iu.test(x));
    if (!lues.length) r.push(`la phrase choisie par le client (${dite}) n'est lue nulle part sur la planche`);
    for (const lue of [...new Set(lues)]) {
      const c = comparerLesLignes(lue, phrase);
      if (c.manquantes.length || c.malEcrites.length || c.enTrop.length || c.desordre) r.push(`la phrase choisie par le client est mal écrite (« ${lue} » au lieu de ${dite})`);
    }
    const microSurLaPhrase = (v.microTextes ?? []).filter((f) => touchePhrase(f, phrase));
    if (microSurLaPhrase.length) r.push(`la phrase choisie par le client est mal écrite : ${microSurLaPhrase.map((f) => `« ${f} »`).join(", ")}`);
  }
  const fautes = v.fautes.filter((f) => !decoratif(f)), promesses = v.promesses.filter(promesseMesurable);
  const ecartes = [...(v.microTextes ?? []).filter((f) => !touchePhrase(f, phrase)), ...v.fautes.filter(decoratif)].map((f) => `micro-texte décoratif, non jugé : « ${f} »`)
    .concat(v.promesses.filter((p) => !promesseMesurable(p)).map((p) => `mot qualitatif, pas une promesse : « ${p} »`));
  if (fautes.length) r.push(`fautes : ${fautes.map((f) => `« ${f} »`).join(", ")}`);
  if (promesses.length) r.push(`promesses ou chiffres inventés : ${promesses.map((f) => `« ${f} »`).join(", ")}`);
  if (v.personnes && !o.personnes) r.push("une personne est visible sans l'accord du client");
  if (v.logoFonceSurFondSombre) r.push("un logo foncé est posé sur un fond sombre : il doit y être clair");
  if (v.motMaquette) r.push("le mot « maquette » ou « mockup » est écrit");
  if (v.copies.length) r.push(`éléments recopiés de la disposition : ${v.copies.join(", ")}`);
  if (v.note < NOTE_DU_PROPRIETAIRE) {
    if (r.length || !ecartes.length) r.push(`elle n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
    else ecartes.push(`note de ${v.note}/10 non comptée : elle ne tenait qu'à des micro-textes décoratifs ou à des mots qualitatifs`);
  }
  return { raisons: r, ecartes };
}

// ---------------------------------------------------------------- 6. la planche entière : dessin, relecture, reprise unique

export type PlancheDeps = {
  /** POST /v1/images/edits : image[] = le logo, puis la disposition ; le texte tel quel. */
  dessiner: (logo: Buffer, disposition: Buffer, texte: string, tour: number) => Promise<Buffer>;
  /**
   * Le relecteur le plus fort, effort élevé : les bandes, le logo, la disposition. `avecPhrase` : le client a choisi une
   * phrase sous le logo, la réponse demandée porte en plus `phrasesLues` (`RelectureAvecPhraseSchema`).
   */
  relire: (bandes: Buffer[], logo: Buffer, disposition: Buffer, demande: string, tour: number, avecPhrase?: boolean) => Promise<RelectureDeLaPlanche>;
  aLaChargeDuStudio: <T>(fn: () => Promise<T>) => Promise<T>;
};
/** `ecartes` : ce que le code n'a pas compté (micro-textes décoratifs, mots qualitatifs, note qui n'y tenait), pour le compte rendu. */
export type EssaiDePlanche = { tour: number; texte: string; png: Buffer; verdict: RelectureDeLaPlanche; raisons: string[]; ecartes?: string[] };
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
    const bandes = await bandesDeLaPlanche(png), demande = demandeAuRelecteurDeLaPlanche({ ...o, texte });
    // Sans phrase, l'appel est exactement celui d'avant (cinq paramètres).
    const verdict = o.phrase?.length ? await deps.relire(bandes, o.logo, o.disposition, demande, tour, true) : await deps.relire(bandes, o.logo, o.disposition, demande, tour);
    const lu = lectureDeLaPlanche(verdict, o);
    return { tour, texte, png, verdict, raisons: lu.raisons, ...(lu.ecartes.length ? { ecartes: lu.ecartes } : {}) };
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
