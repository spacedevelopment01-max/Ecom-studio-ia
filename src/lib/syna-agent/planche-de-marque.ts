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
export function texteDesPreuves(nom: string, v: ValeursDuMetier, phrase?: readonly string[], o?: { nomsDesProduits?: boolean }): string {
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
  //    Pour une boutique, dans le texte envoyé au dessinateur, la ligne des noms des produits s'ajoute dans cette même
  //    partie (`texteAvecLesNomsDesProduits`) ; le texte des preuves, lui, reste celui de Tenon et de Racine.
  return o?.nomsDesProduits ? texteAvecLesNomsDesProduits(t, v) : t;
}
/**
 * La partie « produits » d'un texte de planche, complétée pour une boutique par la ligne des noms des produits, juste après
 * la liste (`ligneDesNomsDesProduits`). Un site de marque (des prestations) ne change pas. Une forme inattendue arrête tout.
 */
export function texteAvecLesNomsDesProduits(t: string, v: Pick<ValeursDuMetier, "site" | "produits">): string {
  if (v.site !== "boutique") return t;
  const liste = `Montrer clairement :\n${v.produits.map((x) => `- ${x.trim()}\n`).join("")}`;
  return remplacer(t, liste, `${liste}${ligneDesNomsDesProduits(v.produits)}\n`);
}

/**
 * LES NOMS DES PRODUITS (26 novembre 2026, essai réel du torréfacteur, étape 4 ; constat du chef d'orchestre : « Plus
 * grave, et pas vu par le relecteur : la planche B invente des produits. »). La règle du propriétaire : « SINA n'invente
 * jamais l'équipe ni les biens à vendre ». Dite en positif, dans la partie « produits » du texte (l'une des six parties du
 * métier) : les étiquettes, les emballages, les fiches produits et le site ne portent que les produits du client, avec ses
 * mots. Le nom d'un produit à l'écran : ses mots, la première lettre en capitale.
 */
export const nomDuProduitALEcran = (p: string): string => { const t = p.trim().replace(/\s+/g, " "); return t ? t[0].toLocaleUpperCase("fr") + t.slice(1) : t; };
export const ligneDesNomsDesProduits = (produits: readonly string[]): string =>
  `Sur les étiquettes, les emballages, les fiches produits et le site, chaque produit porte seulement l'un de ces noms, ceux du client, au singulier pour un seul article : ${produits.map((p) => `« ${nomDuProduitALEcran(p)} »`).join(", ")}.`;

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
  const base = `${texteDesPreuves(o.nom, o.valeurs, o.phrase, { nomsDesProduits: true })}\n${phraseDesDonneesVerifiees(o)}`;
  // La reprise part toujours (essai réel d'Écume, 25 novembre 2026 : 18 raisons, 8 939 octets, rien n'était parti) : ses
  // raisons sont dédoublonnées, rangées des plus graves aux moins graves et bornées à la place qui reste.
  const raisons = o.raisons?.length ? raisonsDeLaReprise(o.raisons, TEXTE_DE_LA_PLANCHE_MAX_OCTETS - octets(`${base}\n\n`)) : [];
  const t = raisons.length ? `${base}\n\n${finDeReprise(raisons)}` : base;
  const fautes = controleDeLaPhrase(t, o.phrase);
  if (fautes.length) throw new Error(`${fautes.join(" ; ")}. Rien n'est envoyé.`);
  return t;
}
/** Les raisons du refus, ajoutées à la toute fin du texte pour la reprise unique. */
export const finDeReprise = (raisons: readonly string[]) => `À corriger : ${raisons.join(" ; ")}.`;

/**
 * La taille permise du texte d'une planche, en octets : la même que celle de l'appel d'image (`PLANCHE_TEXTE_MAX_OCTETS`,
 * media-providers.ts ; un test vérifie qu'elles sont égales). Un texte plus long n'est jamais envoyé.
 */
export const TEXTE_DE_LA_PLANCHE_MAX_OCTETS = 7000;
const octets = (t: string) => Buffer.byteLength(t, "utf8");
/** Une raison est coupée à cette taille (octets), jamais au milieu d'une lettre. */
const RAISON_MAX_OCTETS = 600;
const couper = (t: string, max: number): string => {
  if (octets(t) <= max) return t;
  let out = "";
  for (const c of t) { if (octets(`${out}${c}…`) > max) break; out += c; }
  return `${out.trimEnd()}…`;
};
/**
 * Le rang d'une raison, du plus grave au moins grave (25 novembre 2026) : une personne visible sans accord, le nom, la
 * phrase choisie par le client, l'année (le copyright), le domaine, puis le reste, la note en dernier.
 */
export function gravite(r: string): number {
  if (/^petite finition/iu.test(r)) return 7;
  if (/personne|visage|\bmains?\b/iu.test(r)) return 0;
  if (/^le nom\b/iu.test(r)) return 1;
  if (/phrase choisie par le client/iu.test(r)) return 2;
  if (/copyright/iu.test(r)) return 3;
  if (/bloc 10/iu.test(r)) return 4;
  if (/n'est pas au niveau/iu.test(r)) return 6;
  return 5;
}
/**
 * LES RAISONS DE LA REPRISE, qui part toujours (essai réel d'Écume, 25 novembre 2026 : « Texte de la planche trop long »,
 * la reprise n'était jamais partie) : dédoublonnées (casse et espaces mis à part), rangées des plus graves aux moins graves
 * (`gravite`, l'ordre d'arrivée gardé à rang égal), chacune coupée à 600 octets au plus, et gardées tant qu'elles tiennent
 * dans `place` octets avec « À corriger : … ». Ce qui ne tient pas est compté à la fin, si la place le permet.
 */
export function raisonsDeLaReprise(raisons: readonly string[], place: number): string[] {
  const vues = new Set<string>(), uniques: string[] = [];
  for (const r of raisons) {
    const t = r.normalize("NFC").replace(/\s+/g, " ").trim(), k = t.toLocaleLowerCase("fr");
    if (t && !vues.has(k)) { vues.add(k); uniques.push(t); }
  }
  const rangees = uniques.map((r, i) => ({ r: couper(r, RAISON_MAX_OCTETS), g: gravite(r), i })).sort((a, b) => a.g - b.g || a.i - b.i).map((x) => x.r);
  const gardees: string[] = [];
  for (const r of rangees) if (octets(finDeReprise([...gardees, r])) <= place) gardees.push(r);
  // Jamais une reprise sans raison : la plus grave, coupée à la place qui reste.
  if (!gardees.length && rangees.length && place > octets(finDeReprise([""])) + 8) gardees.push(couper(rangees[0], place - octets(finDeReprise([""]))));
  const restent = rangees.length - gardees.length;
  if (restent && gardees.length) {
    const fin = `et ${restent} autre${restent > 1 ? "s" : ""} défaut${restent > 1 ? "s" : ""} relevé${restent > 1 ? "s" : ""} par la relecture`;
    if (octets(finDeReprise([...gardees, fin])) <= place) gardees.push(fin);
  }
  return gardees;
}

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
- partout : seulement ce que le client a donné ; une origine, une variété, une gamme ou un nom de produit ne s'écrit que s'il est dans ses mots ;
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
/**
 * CE QUI DIT UN BIEN À VENDRE PRÉCIS (26 novembre 2026, essai réel du torréfacteur : la planche B montrait des origines et
 * des variétés que le client n'avait jamais données). Les mots qui annoncent une origine, une variété ou une gamme, et les
 * pays (écrits en français, sans accents) : chacun n'est permis que s'il est dans la fiche du client.
 */
const MOTS_DE_GAMME = /(?<![a-z])(origines?|variete\w*|(?<!(?:haut|bas|milieu|entree) de )gammes?|cepages?|provenances?|grands? crus?|appellations?|editions? limitee\w*|single origin|monovariet\w*|cuvees?)(?![a-z])/u;
const PAYS = "afghanistan afrique allemagne algerie amerique andorre angola antigua arabie argentine armenie australie autriche bali bangladesh belgique belize benin bhoutan bolivie bresil bulgarie burundi cambodge cameroun canada chili chine chypre colombie congo coree costa rica croatie cuba danemark ecosse egypte equateur espagne estonie etats unis ethiopie finlande france gabon georgie ghana grece guadeloupe guatemala guinee haiti hawai honduras hongrie inde indonesie irak iran irlande islande israel italie jamaique japon java jordanie kenya laos liban liberia lituanie luxembourg madagascar malaisie malawi mali maroc martinique mexique monaco mongolie mozambique myanmar namibie nepal nicaragua niger nigeria norvege nouvelle zelande ouganda panama papouasie paraguay pays bas perou philippines pologne portugal roumanie royaume uni russie rwanda salvador senegal serbie sri lanka suede suisse sumatra tanzanie tchad thailande togo tunisie turquie ukraine uruguay venezuela vietnam yemen zambie zimbabwe".split(" ");
const PAYS_COMPOSES = ["costa rica", "etats unis", "nouvelle zelande", "pays bas", "royaume uni", "sri lanka"];
/**
 * Les inventions d'un texte écrit par l'appel des valeurs : un mot d'origine, de variété ou de gamme, un pays, ou un nom
 * propre (une capitale au milieu d'une valeur, qui doit être en minuscules), absents de la fiche du client et du nom de la
 * marque. Rend les mots trouvés, tels qu'ils sont écrits.
 */
export function inventionsDuTexte(texte: string, o: { fiche: string; nom: string }): string[] {
  const enMots = (t: string) => plat(t).replace(/[^a-z0-9]+/g, " ").trim();
  const fiche = ` ${enMots(`${o.fiche} ${o.nom}`)} `, racines = new Set(fiche.trim().split(" ").filter(Boolean).map(racine));
  const absent = (m: string) => !!m && !racines.has(racine(m));
  const mots = ` ${enMots(texte)} `, out: string[] = [];
  for (const g of mots.matchAll(new RegExp(MOTS_DE_GAMME.source, "gu"))) if (g[1].split(" ").some(absent)) out.push(g[1]);
  for (const c of PAYS_COMPOSES) if (mots.includes(` ${c} `) && !fiche.includes(` ${c} `)) out.push(c);
  for (const w of mots.trim().split(" ")) if (PAYS.includes(w) && !PAYS_COMPOSES.some((c) => c.split(" ").includes(w)) && absent(w)) out.push(w);
  for (const m of texte.matchAll(/(?<=\S\s+)(\p{Lu}[\p{L}'’-]*)/gu)) if (enMots(m[1]).split(" ").some(absent)) out.push(m[1]);
  return [...new Set(out)];
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
  // Aucune origine, variété, gamme ou nom de produit absent de la fiche, même dans un produit retiré (26 novembre 2026).
  const inventes = [...traits, propre(v.emotion), ...images, ...v.produits.map(propre)].flatMap((t) => inventionsDuTexte(t, o).map((m) => `« ${m} » (dans « ${t} »)`));
  if (inventes.length) fautes.push(`rien que le client n'a pas donné, ni origine, ni variété, ni gamme, ni nom de produit : retire ${[...new Set(inventes)].join(", ")} ; ses produits, avec ses mots : ${produits.length ? produits.map((p) => `« ${p} »`).join(", ") : "ceux de sa fiche"}`);
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
  /** Où le relecteur voit une personne, un visage ou une main (25 novembre 2026), pour que la reprise sache quoi retirer. */
  personnesVues: z.array(z.string().max(200)).max(10).catch([]),
  logoFonceSurFondSombre: z.boolean().catch(true),
  motMaquette: z.boolean().catch(true),
  /** Ce qui est recopié de la disposition : ses produits, ses photos, son emballage, son nom ou son logo. */
  copies: z.array(z.string().max(200)).max(20).catch([]),
  /**
   * Les signes isolés hors des mots, déclarés par le relecteur lui-même (26 novembre 2026, essai réel du torréfacteur : un
   * crochet égaré qu'il ne pouvait pas recopier entre deux espaces). Le code les range en petites finitions, sauf s'ils
   * touchent une lettre, un mot, le nom, la phrase du logo, l'adresse ou l'année (`lectureDesSignesIsoles`).
   */
  signesIsoles: z.array(z.object({ ou: z.string().max(200).catch(""), description: z.string().max(200).catch("") })).max(10).catch([]),
  /**
   * Les noms de produits lisibles absents de la liste du client : une origine, une variété, une gamme, un nom de produit
   * (26 novembre 2026, essai réel du torréfacteur). Le code les compare aux produits de la fiche (`lectureDesProduits`).
   */
  produitsInventes: z.array(z.object({ ou: z.string().max(200).catch(""), texte: z.string().max(160).catch("") })).max(20).catch([]),
  note: z.number().min(0).max(10).catch(0),
  pourquoi: z.string().max(600).default(""),
});
/**
 * UN ENDROIT OÙ LA PHRASE EST LUE, sous forme structurée (essai réel d'Écume, 25 novembre 2026 : le relecteur écrivait
 * « 01 Logo principal : LIGNE 1 / LIGNE 2 », le code comparait toute la chaîne, emplacement et « / » compris, et refusait
 * quinze fois une phrase juste). `emplacement` : où elle est écrite ; `lignes` : ce qui se lit vraiment, ligne par ligne,
 * dans l'ordre ; `cachee` : une partie est cachée par un objet de la scène (seuls les mots visibles sont comparés).
 */
export const PhraseLueSchema = z.object({
  emplacement: z.string().max(160).catch(""),
  lignes: z.array(z.string().max(200)).max(8).catch([]),
  cachee: z.boolean().catch(false),
});
/** Un endroit lu : la forme structurée, ou la forme d'avant (une chaîne « emplacement : ligne 1 / ligne 2 »). */
export type PhraseLue = string | { emplacement?: string; lignes: string[]; cachee?: boolean };
/**
 * La réponse du relecteur quand le client a choisi une phrase sous le logo (25 novembre 2026) : en plus, chaque endroit
 * de la planche où elle est écrite, sous forme structurée (`PhraseLueSchema`). Sans phrase, la réponse demandée reste
 * celle d'avant (`RelectureDeLaPlancheSchema`).
 */
export const RelectureAvecPhraseSchema = RelectureDeLaPlancheSchema.extend({
  phrasesLues: z.array(PhraseLueSchema).max(20).catch([]),
});
/**
 * Pour relire un verdict déjà rangé (fichier d'un essai, point de reprise) : `phrasesLues` y est sous la forme structurée
 * ou sous la forme d'avant (des chaînes). Jamais envoyé au relecteur.
 */
export const VerdictRangeDeLaPlancheSchema = RelectureDeLaPlancheSchema.extend({
  phrasesLues: z.array(z.union([z.string().max(400), PhraseLueSchema])).max(20).catch([]),
});
/**
 * Un verdict du relecteur ; `microTextes` est absent d'un verdict d'avant le 25 novembre 2026, `personnesVues` d'un
 * verdict d'avant l'essai d'Écume ; `phrasesLues` n'existe que quand le client a choisi une phrase sous le logo.
 */
export type RelectureDeLaPlanche = Omit<z.infer<typeof RelectureDeLaPlancheSchema>, "microTextes" | "personnesVues" | "signesIsoles" | "produitsInventes"> & {
  microTextes?: string[]; personnesVues?: string[]; phrasesLues?: PhraseLue[];
  /** Absents d'un verdict d'avant le 26 novembre 2026 (essai réel du torréfacteur). */
  signesIsoles?: SigneIsole[]; produitsInventes?: ProduitInvente[];
};
export type SigneIsole = { ou: string; description: string };
export type ProduitInvente = { ou: string; texte: string };

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

/**
 * La petite finition, dite au relecteur en termes généraux, sans nom ni exemple d'essai (26 novembre 2026) : un signe
 * parasite isolé hors des mots reste relevé dans les fautes, le texte lu entre « », pour que le code le vérifie
 * (`signeParasiteIsole`) ; il ne fait jamais descendre la note sous 8.
 */
export const PETITE_FINITION_DE_LA_PLANCHE = "Un signe parasite isolé, hors des mots, qui ne change aucun mot (un accent, un trait, une barre ou un point égaré) est une petite finition : il ne fait jamais descendre la note sous 8 ; il en va de même pour tout autre petit signe égaré hors des mots (une virgule, un guillemet, une petite marque). Mets-le dans signesIsoles, jamais dans fautes : « ou », le bloc, l'image et le texte voisin ; « description », le signe que tu vois. Un accent ou une lettre faux dans un mot reste une faute. Un signe collé à un mot, ou posé sur le nom, la phrase sous le logo, le domaine ou l'année, en est une aussi.";
export const RELECTEUR_DE_LA_PLANCHE = `Tu es le relecteur le plus exigeant d'un studio de création de marques. On te montre une planche d'identité visuelle découpée en bandes, de haut en bas (« bande 1 » à « bande 4 », elles se chevauchent un peu), le logo de la marque (« logo ») et la disposition imposée (« disposition », celle d'une AUTRE marque, qui ne donne que l'emplacement des blocs). Réponds en JSON :
- nomLu : le nom de la marque tel qu'il est écrit en grand sur la planche, lettre pour lettre ;
- logoFidele : le logo de la planche est exactement celui de l'image « logo » (même dessin, mêmes lettres), jamais redessiné ;
- copyrightLu : la ligne du copyright du bloc 10, recopiée lettre pour lettre (« © … ») ;
- domaineLu : ce qui est écrit dans le bloc 10 pour le nom de domaine et sa disponibilité, recopié lettre pour lettre ;
- fautes : chaque faute d'orthographe ou mot mal écrit dans un texte lisible à taille normale (le nom, les accroches, les titres des blocs, les mentions, le domaine, l'année), recopié ;
- microTextes : les micro-textes décoratifs, illisibles à taille normale, que tu ne juges pas : les lignes d'alphabet des spécimens de polices, le petit texte circulaire d'un badge, l'heure de la barre d'état d'un téléphone ; recopiés s'ils sont déformés, jamais mis dans fautes ;
- promesses : chaque promesse mesurable ou garantie inventée (gratuit, offert, délai, montant, prix, remboursement, garantie, chiffre, note, avis, nombre de clients…), recopiée ; un mot qualitatif ordinaire (soigné, sélectionné, conseils, qualité) n'est pas une promesse ;
- personnes : une personne, un visage ou une main est visible ;
- personnesVues : pour chaque personne, visage ou main visible, où tu la vois, en quelques mots (le bloc et l'image) ; vide s'il n'y en a pas ;
- logoFonceSurFondSombre : un logo foncé posé sur un fond sombre (il doit y être clair) ;
- motMaquette : le mot « maquette » ou « mockup » est écrit sur la planche ;
- copies : chaque élément recopié de la disposition (ses produits, ses photos, son emballage, son nom ou son logo) ;
- signesIsoles : chaque petit signe égaré hors des mots, qui ne change aucun mot (voir la note) ; vide s'il n'y en a pas ;
- produitsInventes : chaque nom de produit lisible qui n'est pas l'un des produits de la marque donnés dans la demande, où qu'il soit écrit (emballage, carte ou fiche produit, site, publication) : une origine, une variété, une gamme, un nom de produit ou de collection ; pour chacun, « ou » (le bloc et l'image) et « texte » (recopié lettre pour lettre). Le nom d'un produit de la marque, au singulier ou au pluriel, n'en est pas un. Un produit inventé fait refuser la planche, comme une promesse : la marque ne vend que ce que le client a donné ;
- note : ta note de 0 à 10. Une planche complète, juste dans ses textes lisibles et soignée vaut 8 ou plus ; un micro-texte décoratif ou un mot qualitatif ne fait jamais descendre la note sous 8. ${PETITE_FINITION_DE_LA_PLANCHE} Ton repère : à la question « ${QUESTION_DU_REPERE_DE_PLANCHE} », posée devant deux planches dont seuls les alphabets des spécimens, le petit texte circulaire du badge et des mots qualitatifs de réassurance étaient reprochés, le propriétaire du Studio a répondu : « ${REPONSE_DU_PROPRIETAIRE_PLANCHE} » ;
- pourquoi : une ou deux phrases simples.
Ne juge que ce que tu vois.`;

/**
 * `phrase` : les lignes de la phrase choisie sous le logo, dans l'ordre (absente : aucune phrase choisie). `texte` : le texte
 * envoyé au dessinateur, où le code retrouve les mots attendus d'un texte lu (absent : seulement le nom, la phrase et les
 * données vérifiées, par prudence).
 */
export type AttenduDeLaPlanche = {
  nom: string; annee: number; domaine: DomaineDeLaPlanche; personnes: boolean; animaux: boolean; phrase?: readonly string[]; texte?: string;
  /** Les produits ou prestations de la fiche du client (les valeurs du métier, contrôlées) : les seuls noms de produits permis. */
  produits?: readonly string[];
};
/** Ce que la demande au relecteur dit des produits du client (vide sans liste). */
export const demandeDesProduits = (produits: readonly string[] | undefined): string[] => !produits?.length ? [] : [
  `Les produits que la marque vend, donnés par le client : ${produits.map((p) => `« ${p.trim()} »`).join(", ")}. Sur la planche, un nom de produit lisible ne peut être que l'un d'eux, au singulier ou au pluriel ; toute origine, variété, gamme ou autre nom de produit lisible va dans produitsInventes.`,
];
/** Ce que la demande au relecteur dit de la phrase choisie sous le logo (vide sans phrase). */
export const demandeDeLaPhrase = (phrase: readonly string[] | undefined): string[] => !phrase?.length ? [] : [
  `Le client a choisi la phrase écrite sous son logo${phrase.length > 1 ? `, en ${phrase.length} lignes, dans cet ordre` : ""} : ${lignesDites(phrase)}. Elle n'est pas inventée, et ce n'est jamais un micro-texte décoratif : vérifie qu'elle est écrite exactement, lettre pour lettre, partout où elle apparaît sur la planche (sous le logo et ses variantes, comme slogan, ailleurs).`,
  `Dans « phrasesLues », un élément pour chaque endroit où elle apparaît : « emplacement », où elle est écrite, en quelques mots ; « lignes », ce que tu lis vraiment, ${phrase.length > 1 ? "une ligne par élément, toutes dans l'ordre" : "sans rien corriger"}, sans l'emplacement ni aucun séparateur ; « cachee », vrai seulement si un objet de la scène (un autre objet posé devant, un pli, le bord d'une image) recouvre une partie de la phrase. Quand elle est cachée en partie, recopie seulement les mots que tu vois, dans l'ordre, et écris « … » à la place de ce qui est caché : ce n'est pas une faute. Une lettre que tu vois mais qui est fausse, déformée ou illisible en est une : recopie-la telle quelle, ou écris « [illisible] » à sa place, et mets-la aussi dans fautes. Une partie seulement cachée ne va jamais dans fautes.`,
];
export function demandeAuRelecteurDeLaPlanche(o: AttenduDeLaPlanche & { texte: string }): string {
  return [
    `Marque : « ${o.nom} ».`,
    o.personnes ? "Le client a donné son accord pour des personnes." : "Le client n'a donné ni photo de personne ni accord : aucune personne ne doit être visible.",
    ...demandeDeLaPhrase(o.phrase),
    ...demandeDesProduits(o.produits),
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
// ---------------------------------------------------------------- 5 bis. la phrase lue, endroit par endroit

/** Un crochet qui dit une partie cachée par un objet de la scène (forme d'avant : « [1re ligne masquée par …] »). */
const CACHE = /masqu|cach[ée]|recouv|couvert|hors (?:du )?(?:cadre|champ)|invisible|derri[eè]re/iu;
/** Un crochet ou un mot qui dit des lettres visibles mais fausses : déformées, illisibles, floues, effacées. */
const DEFORME = /illisible|d[ée]form|flou|brouill|effac|mal [ée]crit|tordu/iu;
const motPlat = (m: string) => m.normalize("NFC").replace(/[’ʼ]/g, "'").replace(/[«»"“”]/g, "").replace(/\.+$/u, "").toLocaleLowerCase("fr");
const ligneJuste = (lignes: readonly string[], phrase: readonly string[]) => {
  const c = comparerLesLignes(lignes.join("\n"), phrase);
  return !c.manquantes.length && !c.malEcrites.length && !c.enTrop.length && !c.desordre;
};
/**
 * Les mots VISIBLES d'une phrase cachée en partie (25 novembre 2026, point 2 de l'essai d'Écume) : chaque mot visible doit
 * être juste et l'ordre tenu ; « … » (ou un crochet qui dit « masqué », « caché ») marque ce qui est caché ; un mot collé à
 * « … » est un morceau (le début ou la fin d'un mot de la phrase). Un crochet qui dit « illisible », « déformé », ou un
 * crochet inconnu, est une lettre visible fausse : refusée.
 */
function motsVisiblesJustes(lignes: readonly string[], phrase: readonly string[]): { juste: boolean; cache: boolean } {
  let cache = false, deforme = false;
  const texte = lignes.map((l) => l.replace(/\[([^\]]*)\]/gu, (_m, dedans: string) => {
    if (DEFORME.test(dedans) || !CACHE.test(dedans)) deforme = true; else cache = true;
    return " … ";
  })).join(" ");
  if (deforme || /[?\uFFFD]/u.test(texte)) return { juste: false, cache };
  const voulus = phrase.flatMap((l) => l.split(/\s+/u)).map(motPlat).filter(Boolean);
  const vus = texte.replace(/\.\.\./gu, "…").split(/\s+/u).filter(Boolean);
  let j = 0;
  for (const brut of vus) {
    if (/^…+$/u.test(brut)) { cache = true; continue; }
    const debut = brut.endsWith("…"), fin = brut.startsWith("…");
    if (debut || fin) cache = true;
    const m = motPlat(brut.replace(/^…+|…+$/gu, ""));
    if (!m) continue;
    const ok = (v: string) => (debut && fin ? v.includes(m) : debut ? v.startsWith(m) : fin ? v.endsWith(m) : v === m);
    while (j < voulus.length && !ok(voulus[j])) j++;
    if (j >= voulus.length) return { juste: false, cache };
    j++;
  }
  return { juste: true, cache };
}
/**
 * UN ENDROIT OÙ LA PHRASE EST LUE, jugé par le code lettre pour lettre (25 novembre 2026). Forme structurée : seules les
 * lignes sont comparées (jamais l'emplacement) ; `cachee` : seuls les mots visibles. Forme d'avant (une chaîne) : comparée
 * entière, puis sans l'emplacement (ce qui précède le premier « : »), ses lignes coupées sur « / ». `texte` : ce qui est
 * dit dans la raison d'un refus.
 */
export function jugerLaPhraseLue(lue: PhraseLue, phrase: readonly string[]): { juste: boolean; cachee: boolean; texte: string; emplacement: string } {
  const juger = (lignes: string[], cachee: boolean) => {
    const marques = lignes.some((l) => /\[[^\]]*\]|…|\.\.\./u.test(l));
    if (!cachee && !marques) return { juste: ligneJuste(lignes, phrase), cache: false };
    const v = motsVisiblesJustes(lignes, phrase);
    // Des marques sans rien de caché (« [illisible] ») : des lettres visibles fausses.
    return { juste: v.juste && (cachee || v.cache), cache: cachee || v.cache };
  };
  if (typeof lue !== "string") {
    const lignes = lue.lignes.flatMap((l) => l.split(/\r?\n/u)).map((l) => l.trim()).filter(Boolean), emplacement = (lue.emplacement ?? "").trim();
    const r = juger(lignes, !!lue.cachee);
    return { juste: r.juste, cachee: r.cache, texte: `${emplacement ? `${emplacement} : ` : ""}${lignes.join(" / ")}`, emplacement };
  }
  const coupe = (t: string) => t.split(/\s*[\r\n]+\s*|\s+\/\s*|\s*\/\s+/u).map((l) => l.trim()).filter(Boolean);
  const entiere = juger(coupe(lue), false);
  if (entiere.juste) return { juste: true, cachee: entiere.cache, texte: lue, emplacement: "" };
  // L'emplacement peut lui-même porter un « : » (« 07 Format 1:1 : … ») : chaque « : » est essayé, dans l'ordre.
  const deuxPoints = [...lue.matchAll(/:/gu)].map((m) => m.index!);
  if (!deuxPoints.length) return { juste: false, cachee: entiere.cache, texte: lue, emplacement: "" };
  let dernier = { juste: false, cache: entiere.cache }, emplacement = "";
  for (const i of deuxPoints) {
    dernier = juger(coupe(lue.slice(i + 1)), false);
    emplacement = lue.slice(0, i).trim();
    if (dernier.juste) break;
  }
  return { juste: dernier.juste, cachee: dernier.cache, texte: lue, emplacement };
}
// ---------------------------------------------------------------- 5 ter. le signe parasite isolé, une petite finition

/** Un mot entre deux espaces fait seulement de signes (aucune lettre, aucun chiffre) : un accent, un trait, une barre, un point… */
const SIGNES_SEULS = /^[^\p{L}\p{N}]+$/u;
/** Un mot du texte, une fois ôtée la ponctuation ordinaire collée à ses bords : des lettres et des chiffres, un trait d'union ou une apostrophe entre eux. */
const MOT_PROPRE = /^[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*$/u;
const PONCTUATION_DES_BORDS = /^[«»"“”'’(\[]+|[«»"“”'’)\].,;:!?…]+$/gu;
/** Le texte sans ses signes isolés (ceux qui sont seuls entre deux espaces), espaces ramenés à un seul. */
export const sansSignesIsoles = (t: string): string => t.normalize("NFC").split(/\s+/u).filter((m) => m && !SIGNES_SEULS.test(m)).join(" ");
const motsDuTexte = (t: string) => t.normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((m) => m.toLocaleLowerCase("fr"));
/** La faute porte-t-elle sur un signe (et non sur une lettre, un mot, l'orthographe) ? */
const DIT_UN_SIGNE = /accent|trait|tiret|barre|point|signe|virgule|apostrophe|caract[eè]re|symbole|ponctuation|guillemet|ast[ée]risque|slash/iu;
const DIT_PARASITE = /parasite|[ée]gar[ée]|en trop|isol[ée]|tra[iî]n|superflu|orphelin|perdu|inutile|ajout[ée]|parasit/iu;
const DIT_UN_MOT = /lettre|orthograph|mal [ée]crit|illisible|d[ée]form|coup[ée]|manqu|accord|conjug|pluriel|singulier|majuscule|minuscule|faute d/iu;
/** Ce qui touche les données vérifiées ou la phrase du client : jamais une petite finition (le code les compare à part). */
const DIT_UNE_DONNEE = /domaine|copyright|©|ann[ée]e|phrase|slogan|sous le logo|nom de la marque/iu;

/**
 * UN SIGNE PARASITE ISOLÉ, UNE PETITE FINITION (26 novembre 2026, essai réel d'Écume, étape 3 : la planche A, reprise à
 * 8/10 et jugée « montrable », refusée pour un seul accent égaré après une barre de séparation). La règle du propriétaire,
 * déjà scellée pour les logos : « les petites finitions ne font pas refuser ». Une faute du relecteur est une petite
 * finition seulement si TOUT ceci est vrai :
 * - elle recopie le texte lu entre « » et dit qu'il s'agit d'un signe parasite (un accent, un trait, une barre ou un point
 *   égaré), sans parler d'une lettre, d'un mot mal écrit ni de l'orthographe ;
 * - le texte lu porte au moins un signe isolé, seul entre deux espaces, hors de tout mot ; chacun de ses autres mots est
 *   propre (un signe collé à un mot, un accent dans un mot, n'est jamais isolé) ;
 * - après avoir retiré ces signes, le texte lu est exactement le texte attendu : celui que le relecteur donne (« au lieu
 *   de », « il faut »), sinon chacun de ses mots se retrouve, lettre pour lettre et accent pour accent, dans le texte envoyé
 *   au dessinateur, le nom, la phrase choisie, le copyright ou la mention du domaine ;
 * - elle ne touche ni le nom seul, ni la phrase choisie par le client, ni le domaine, ni le copyright, ni l'année.
 * Rend le texte lu sans ses signes, ou null (la faute compte).
 */
export function signeParasiteIsole(f: string, o: AttenduDeLaPlanche): string | null {
  const citations = [...f.matchAll(/«\s*([^«»]*?)\s*»/gu)].map((m) => m[1]);
  if (!citations.length) return null;
  const lu = citations[0].normalize("NFC"), hors = f.replace(/«[^«»]*»/gu, " ");
  if (!DIT_UN_SIGNE.test(hors) || !DIT_PARASITE.test(hors) || DIT_UN_MOT.test(hors) || DIT_UNE_DONNEE.test(hors)) return null;
  const mots = lu.split(/\s+/u).filter(Boolean);
  if (!mots.some((m) => SIGNES_SEULS.test(m))) return null;
  if (!mots.filter((m) => !SIGNES_SEULS.test(m)).every((m) => MOT_PROPRE.test(m.replace(PONCTUATION_DES_BORDS, "")))) return null;
  const propre = sansSignesIsoles(lu);
  if (!propre || /©|\b(19|20)\d\d\b/u.test(propre)) return null;
  const domaine = o.domaine.domaine?.toLocaleLowerCase("fr");
  if (domaine && propre.toLocaleLowerCase("fr").includes(domaine)) return null;
  const plat = (t: string) => motsDuTexte(t).join(" ");
  if (plat(propre) === plat(o.nom)) return null;
  const phrase = o.phrase?.length ? motsDuTexte(o.phrase.join(" ")) : [];
  const motsLus = motsDuTexte(propre);
  if (phrase.length && motsLus.every((m) => phrase.includes(m))) return null;
  // Le texte attendu : celui que le relecteur donne, sinon les mots que le Studio a écrits.
  const attendu = /au lieu|il faut|attendu|devrait/iu.test(f) ? citations.slice(1).find((c) => c.trim()) : undefined;
  if (attendu != null) return plat(attendu) === plat(propre) ? propre : null;
  const connus = new Set(motsDuTexte([o.texte ?? "", o.nom, ...(o.phrase ?? []), copyright(o.annee, o.nom), mentionDuDomaine(o.domaine)].join(" ")));
  return motsLus.length && motsLus.every((m) => connus.has(m)) ? propre : null;
}
/** Les séparateurs ordinaires d'une ligne, permis seuls entre deux espaces (jamais au bout d'une ligne). */
const SEPARATEURS = new Set(["–", "—", "-", "|", "·", "•", "/"]);
/** Un signe sûrement parasite : un accent seul, un signe de modification, un tilde, un soulignement, une barre brisée. */
const SIGNE_SUREMENT_PARASITE = /[\p{Sk}\p{M}~_¦]/u;
/**
 * LA LIGNE NETTOYÉE DE SES SIGNES PARASITES (26 novembre 2026, planche en vrai) : chaque texte que le code écrit dans la
 * planche en vrai passe par ici. Est retiré un signe seul entre deux espaces qui est sûrement parasite (un accent seul, un
 * tilde, un soulignement, une suite de signes qui n'est ni « … » ni une ponctuation double, un point ou une virgule seuls),
 * puis un séparateur resté au bout de la ligne ou doublé. La ponctuation française ordinaire (« ! », « ? », « : », « ; »,
 * les guillemets) et les séparateurs entre deux mots restent. Une ligne sans signe parasite revient telle quelle.
 */
export function nettoyerLesSignesIsoles(ligne: string): string {
  const mots = ligne.normalize("NFC").split(/\s+/u).filter(Boolean);
  const parasite = (m: string) => SIGNES_SEULS.test(m) && !SEPARATEURS.has(m) && (SIGNE_SUREMENT_PARASITE.test(m) || m === "." || m === "," || ([...m].length > 1 && !/^(\.\.\.|…|!!|\?!|!\?|\?\?|«|»|--)$/u.test(m)));
  const gardes = mots.filter((m) => !parasite(m));
  if (gardes.length === mots.length) return ligne;
  const sep = (m: string | undefined) => !!m && SEPARATEURS.has(m);
  const propres = gardes.filter((m, i) => !(sep(m) && sep(gardes[i - 1])));
  while (sep(propres.at(-1))) propres.pop();
  while (sep(propres[0])) propres.shift();
  return propres.join(" ");
}
/** La ligne porte-t-elle un signe parasite que le nettoyage retire ? */
export const porteUnSigneParasite = (ligne: string): boolean => nettoyerLesSignesIsoles(ligne) !== ligne;
/** Le texte lu d'une petite finition (sa première citation « … »), nettoyé de ses signes parasites ; null sans citation. */
export function texteDeLaFinition(f: string): string | null {
  const c = /«\s*([^«»]*?)\s*»/u.exec(f)?.[1];
  return c ? nettoyerLesSignesIsoles(c) : null;
}
/** Le bloc de la planche où une petite finition est notée : le bloc 10 (référencement, mentions), le ton (bloc 04), sinon un autre. */
export function blocDeLaFinition(f: string): "seo" | "ton" | "autre" {
  const hors = f.replace(/«[^«»]*»/gu, " ");
  if (/bloc\s*10\b|\bseo\b|r[ée]f[ée]rencement|m[ée]ta|mentions?|copyright|nom de domaine/iu.test(hors)) return "seo";
  if (/bloc\s*0?4\b|\bton\b|slogan|valeurs/iu.test(hors)) return "ton";
  return "autre";
}

/** La ligne du compte rendu pour une petite finition : notée, jamais une raison de refus. */
export const finitionNotee = (f: string) => `petite finition, notée sans refus : « ${f} »`;
/** La même finition, transmise comme correction quand la planche est reprise pour une autre raison. */
export const finitionACorriger = (f: string) => `petite finition à nettoyer : « ${f} »`;

// ---------------------------------------------------------------- 5 quater. les signes déclarés isolés, les produits inventés

const sansGuillemets = (t: string) => t.replace(/«\s*/gu, "“").replace(/\s*»/gu, "”");
/** Le nom de la marque est-il dit dans ce texte (tous ses mots) ? */
const nomDans = (t: string, nom: string) => { const n = motsDuTexte(nom), m = new Set(motsDuTexte(t)); return n.length > 0 && n.every((w) => m.has(w)); };
const DANS_UN_MOT = /dans (?:le|un|ce|chaque) mot|coll[ée]|sur (?:la|une) lettre|entre deux lettres|à l'intérieur d/iu;
/**
 * UN SIGNE ISOLÉ DÉCLARÉ PAR LE RELECTEUR (26 novembre 2026, essai réel du torréfacteur, étape 4 : « un petit crochet en
 * forme de « ? » égaré, hors des mots », que le code ne reconnaissait pas, faute de pouvoir le recopier entre deux espaces).
 * Rend null quand c'est une petite finition ; sinon la faute à compter : un signe qui touche une lettre ou un mot (dans un
 * mot, collé, sur une lettre), ou qui touche le nom, la phrase du logo, l'adresse ou l'année, fait toujours refuser.
 */
export function signeDeclareQuiCompte(s: SigneIsole, o: AttenduDeLaPlanche): string | null {
  const ou = s.ou.trim(), description = s.description.trim(), t = `${ou} ${description}`, dit = [ou, description].filter(Boolean).join(" : ");
  if (DIT_UN_MOT.test(t) || DANS_UN_MOT.test(t)) return `signe déclaré isolé, mais qui touche une lettre ou un mot : ${dit}`;
  const domaine = o.domaine.domaine?.toLocaleLowerCase("fr");
  if (DIT_UNE_DONNEE.test(t) || /\b(19|20)\d\d\b/u.test(t) || (domaine && t.toLocaleLowerCase("fr").includes(domaine)) || touchePhrase(t, o.phrase) || nomDans(t, o.nom)) return `signe déclaré isolé, mais qui touche le nom, la phrase du logo, l'adresse ou l'année : ${dit}`;
  return null;
}
/** Les signes déclarés isolés : les petites finitions (sans guillemets, pour qu'aucun texte n'en soit repris) et les fautes. */
export function lectureDesSignesIsoles(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): { finitions: string[]; fautes: string[] } {
  const finitions: string[] = [], fautes: string[] = [];
  for (const s of v.signesIsoles ?? []) {
    if (!s.ou.trim() && !s.description.trim()) continue;
    const f = signeDeclareQuiCompte(s, o);
    if (f) fautes.push(f); else finitions.push(`signe isolé hors des mots : ${sansGuillemets([s.ou.trim(), s.description.trim()].filter(Boolean).join(" : "))}`);
  }
  return { finitions, fautes };
}
const motsDuProduit = (t: string) => plat(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !MOTS_VIDES.has(w)).map(racine);
/**
 * Un nom lu sur la planche est-il celui d'un produit de la fiche ? Chacun de ses vrais mots est un mot des produits du client
 * (singulier ou pluriel, accents et capitales mis à part) : « Café en grains », « Coffrets » sont permis pour « cafés en
 * grains » et « coffrets » ; une origine, une variété ou une gamme ne l'est jamais.
 */
export function nomDeProduitPermis(texte: string, produits: readonly string[] | undefined): boolean {
  const m = motsDuProduit(texte);
  if (!m.length || !produits?.length) return false;
  const permis = new Set(produits.flatMap(motsDuProduit));
  return m.every((w) => permis.has(w));
}
/**
 * LES PRODUITS INVENTÉS (26 novembre 2026, essai réel du torréfacteur, étape 4 : des origines et des variétés que le client
 * n'avait jamais données, sur les sachets et le site). Le relecteur relève chaque nom de produit lisible ; le code le compare
 * aux produits de la fiche : un nom permis est écarté (écrit au compte rendu), tout autre fait refuser, comme une promesse.
 */
export function lectureDesProduits(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): { raison: string | null; permis: string[] } {
  const releves = (v.produitsInventes ?? []).filter((p) => p.texte.trim());
  const inventes = releves.filter((p) => !nomDeProduitPermis(p.texte, o.produits));
  const permis = releves.filter((p) => nomDeProduitPermis(p.texte, o.produits)).map((p) => `nom d'un produit de la fiche, permis : « ${p.texte.trim()} »`);
  if (!inventes.length) return { raison: null, permis };
  const ses = o.produits?.length ? `, avec ses noms : ${o.produits.map((p) => `« ${nomDuProduitALEcran(p)} »`).join(", ")}` : "";
  return { raison: `produits inventés, absents de la fiche du client : ${inventes.map((p) => `« ${p.texte.trim()} »${p.ou.trim() ? ` (${p.ou.trim()})` : ""}`).join(", ")} ; sur les étiquettes, les emballages, les fiches produits et le site, seulement ses produits${ses}`, permis };
}

/** Une faute relevée qui dit seulement que la phrase est cachée en partie par un objet (aucune lettre fausse) : pas une faute. */
const seulementCachee = (f: string, phrase: readonly string[] | undefined) => touchePhrase(f, phrase) && CACHE.test(f) && !DEFORME.test(f) && !/au lieu|faute|il faut|manque|en trop/iu.test(f);
/** Où le relecteur a vu une personne : `personnesVues`, sinon le passage de `pourquoi` qui le dit (verdicts d'avant). */
function ouSontLesPersonnes(v: RelectureDeLaPlanche): string[] {
  if (v.personnesVues?.length) return v.personnesVues.map((x) => x.trim()).filter(Boolean);
  const PERSONNE = /(?<![\p{L}])(mains?|visages?|personnes?|silhouettes?|bras|doigts?|corps|enfants?|femmes?|hommes?)(?![\p{L}])/iu;
  const passage = v.pourquoi.split(/(?<=[.!?])\s+|,\s*mais\s+|;\s*/u).map((x) => x.trim().replace(/[.]+$/u, "")).find((x) => PERSONNE.test(x) && /visible|appara|se voit|on voit|montre/iu.test(x));
  return passage ? [passage] : [];
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
 * décoratifs, les mots qualitatifs pris pour des promesses et, depuis le 26 novembre 2026, les petites finitions : un
 * signe parasite isolé hors des mots, `signeParasiteIsole`), pour le compte rendu. Une note sous 8 ne compte pas quand
 * elle ne tenait qu'à ce qui est écarté (rien d'autre n'est reproché) ; sans rien d'écrit, elle reste un refus, par
 * prudence. Le nom, l'année et le domaine sont toujours comparés lettre pour lettre. `finitions` : les fautes rangées en
 * petites finitions, telles que le relecteur les a écrites ; elles ne deviennent des corrections que si la planche est
 * reprise pour une autre raison.
 */
export function lectureDeLaPlanche(v: RelectureDeLaPlanche, o: AttenduDeLaPlanche): { raisons: string[]; ecartes: string[]; finitions: string[] } {
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
  const cachees: string[] = [];
  if (phrase) {
    // La phrase choisie par le client, comparée lettre pour lettre par le code à chaque endroit où le relecteur la lit :
    // ses lignes seulement, jamais l'emplacement ; cachée en partie par un objet, ses seuls mots visibles.
    const dite = phrase.map((l) => `« ${l} »`).join(" / ");
    const lues = (v.phrasesLues ?? []).filter((x) => (typeof x === "string" ? x.trim() && !/^(aucune|aucun|none|rien)\.?$/iu.test(x.trim()) : x.lignes.some((l) => l.trim()) || x.cachee));
    if (!lues.length) r.push(`la phrase choisie par le client (${dite}) n'est lue nulle part sur la planche`);
    const vus = new Set<string>();
    for (const lue of lues) {
      const j = jugerLaPhraseLue(typeof lue === "string" ? lue.trim() : lue, phrase);
      if (vus.has(j.texte)) continue;
      vus.add(j.texte);
      if (!j.juste) r.push(`la phrase choisie par le client est mal écrite (« ${j.texte} » au lieu de ${dite})`);
      else if (j.cachee) cachees.push(`phrase cachée en partie par un objet de la scène, mots visibles justes : « ${j.texte} »`);
    }
    const microSurLaPhrase = (v.microTextes ?? []).filter((f) => touchePhrase(f, phrase));
    if (microSurLaPhrase.length) r.push(`la phrase choisie par le client est mal écrite : ${microSurLaPhrase.map((f) => `« ${f} »`).join(", ")}`);
  }
  const cacheeSeulement = (f: string) => !!phrase && seulementCachee(f, phrase);
  // Un signe parasite isolé hors des mots : une petite finition, notée, jamais une raison de refus.
  const finition = (f: string) => !decoratif(f) && !cacheeSeulement(f) && signeParasiteIsole(f, o) != null;
  // Les signes que le relecteur déclare lui-même isolés hors des mots (26 novembre 2026) : petites finitions, sauf ceux qui
  // touchent une lettre, un mot, le nom, la phrase du logo, l'adresse ou l'année, comptés comme des fautes.
  const declares = lectureDesSignesIsoles(v, o);
  const finitions = [...v.fautes.filter(finition), ...declares.finitions];
  const fautes = [...v.fautes.filter((f) => !decoratif(f) && !cacheeSeulement(f) && !finition(f)), ...declares.fautes], promesses = v.promesses.filter(promesseMesurable);
  const produits = lectureDesProduits(v, o);
  const ecartes = [...(v.microTextes ?? []).filter((f) => !touchePhrase(f, phrase)), ...v.fautes.filter(decoratif)].map((f) => `micro-texte décoratif, non jugé : « ${f} »`)
    .concat(v.promesses.filter((p) => !promesseMesurable(p)).map((p) => `mot qualitatif, pas une promesse : « ${p} »`))
    .concat(cachees, v.fautes.filter((f) => !decoratif(f) && cacheeSeulement(f)).map((f) => `phrase seulement cachée en partie par un objet, pas une faute : « ${f} »`))
    .concat(finitions.map(finitionNotee));
  if (fautes.length) r.push(`fautes : ${fautes.map((f) => `« ${f} »`).join(", ")}`);
  if (promesses.length) r.push(`promesses ou chiffres inventés : ${promesses.map((f) => `« ${f} »`).join(", ")}`);
  // Les produits inventés (26 novembre 2026) : comparés aux produits de la fiche par le code ; un seul fait refuser.
  if (produits.raison) r.push(produits.raison);
  if (v.personnes && !o.personnes) {
    r.push("une personne est visible sans l'accord du client");
    // Où elle est vue, pour que la reprise sache quoi retirer (essai réel d'Écume : une main dans une image de référence).
    const ou = ouSontLesPersonnes(v);
    if (ou.length) r.push(`à retirer, aucune personne ni partie du corps : ${ou.join(" ; ")}`);
  }
  if (v.logoFonceSurFondSombre) r.push("un logo foncé est posé sur un fond sombre : il doit y être clair");
  if (v.motMaquette) r.push("le mot « maquette » ou « mockup » est écrit");
  if (v.copies.length) r.push(`éléments recopiés de la disposition : ${v.copies.join(", ")}`);
  if (v.note < NOTE_DU_PROPRIETAIRE) {
    if (r.length || !ecartes.length) r.push(`elle n'est pas au niveau (${v.note}/10, il faut ${NOTE_DU_PROPRIETAIRE})`);
    else ecartes.push(`note de ${v.note}/10 non comptée : elle ne tenait qu'à des micro-textes décoratifs, à des mots qualitatifs ou à de petites finitions`);
  }
  // Les noms de produits de la fiche relevés à tort : écrits au compte rendu, jamais une excuse pour une note sous 8.
  ecartes.push(...produits.permis);
  return { raisons: r, ecartes, finitions };
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
export type EssaiDePlanche = { tour: number; texte: string; png: Buffer; verdict: RelectureDeLaPlanche; raisons: string[]; ecartes?: string[]; finitions?: string[] };
export type ResultatDeLaPlanche = { ok: true; png: Buffer; texte: string; essais: EssaiDePlanche[] } | { ok: false; raison: string; essais: EssaiDePlanche[] };

/**
 * Une planche de marque : dessinée, relue ; refusée une fois, refaite UNE fois à la charge du Studio avec ses raisons à
 * la fin du texte ; refusée deux fois, elle n'est pas gardée (jamais montrée). Une panne du fournisseur n'est jamais
 * relancée toute seule : l'erreur remonte.
 */
export async function dessinerLaPlanche(deps: PlancheDeps, o: AttenduDeLaPlanche & { valeurs: ValeursDuMetier; logo: Buffer; disposition: Buffer }): Promise<ResultatDeLaPlanche> {
  const essais: EssaiDePlanche[] = [];
  // Les seuls noms de produits permis sur la planche : ceux des valeurs du métier, retrouvés dans la fiche du client.
  o = { ...o, produits: o.produits ?? o.valeurs.produits };
  const essai = async (tour: number, raisons?: readonly string[]): Promise<EssaiDePlanche> => {
    const texte = texteDeLaPlanche({ ...o, raisons });
    const png = await deps.dessiner(o.logo, o.disposition, texte, tour);
    const bandes = await bandesDeLaPlanche(png), demande = demandeAuRelecteurDeLaPlanche({ ...o, texte });
    // Sans phrase, l'appel est exactement celui d'avant (cinq paramètres).
    const verdict = o.phrase?.length ? await deps.relire(bandes, o.logo, o.disposition, demande, tour, true) : await deps.relire(bandes, o.logo, o.disposition, demande, tour);
    const lu = lectureDeLaPlanche(verdict, { ...o, texte });
    return { tour, texte, png, verdict, raisons: lu.raisons, ...(lu.ecartes.length ? { ecartes: lu.ecartes } : {}), ...(lu.finitions.length ? { finitions: lu.finitions } : {}) };
  };
  const premier = await essai(1);
  essais.push(premier);
  if (!premier.raisons.length) return { ok: true, png: premier.png, texte: premier.texte, essais };
  // Reprise pour une autre raison : les petites finitions du premier essai s'ajoutent aux corrections, en dernier.
  const second = await deps.aLaChargeDuStudio(() => essai(2, [...premier.raisons, ...(premier.finitions ?? []).map(finitionACorriger)]));
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
