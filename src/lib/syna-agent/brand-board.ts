/**
 * Planche de marque (décisions du propriétaire du 12 novembre 2026, `docs/sina-savoir/`) : une identité ne se montre
 * plus en simple fiche « nom, couleurs, polices » mais en planche : l'idée, le nom, les signes, le sachet ou l'objet, le
 * site sur téléphone, des publications, la voix, ce qui reste à prouver.
 *
 * Ce fichier ne décrit que le CONTENU d'une planche, tel qu'il est gardé dans le parcours. Rien n'y est du HTML ni un
 * dessin libre : des textes courts, des choix dans des listes fermées et des pictogrammes déjà nettoyés (tracés
 * normalisés de `media/logo-symbol`, jamais le SVG brut du modèle). Le Studio dessine la planche avec ses propres
 * composants : aucun script ni code du modèle n'arrive à l'écran du client.
 */
import { z } from "zod";
import { ArtSchema } from "./brand-art";

/** Pictogramme nettoyé (même forme que `CustomSymbol` de `media/logo-symbol`) : tracés seuls, deux tons au plus. */
export const BoardSymbolSchema = z.object({
  source: z.enum(["ai", "silhouette", "monogram"]),
  viewBox: z.tuple([z.number(), z.number(), z.number().positive()]),
  shapes: z.array(z.object({
    d: z.string().min(1).max(4000).regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]+$/),
    paint: z.enum(["fill", "stroke"]),
    tone: z.enum(["main", "accent"]),
    width: z.number().positive().max(64).optional(),
    rule: z.enum(["nonzero", "evenodd"]).optional(),
  })).min(1).max(6),
});
export type BoardSymbol = z.infer<typeof BoardSymbolSchema>;

/** Genres de signes : ce qu'on reconnaît d'une marque sans lire son nom. */
export const SIGN_KINDS = ["lettrage", "motif", "objet", "couleur", "forme", "geste", "phrase"] as const;
export const SIGN_KIND_LABEL: Record<(typeof SIGN_KINDS)[number], { fr: string; en: string }> = {
  lettrage: { fr: "Le lettrage", en: "The lettering" }, motif: { fr: "Le motif", en: "The pattern" }, objet: { fr: "L'objet", en: "The object" },
  couleur: { fr: "La couleur", en: "The colour" }, forme: { fr: "La forme", en: "The shape" }, geste: { fr: "Le geste", en: "The gesture" },
  phrase: { fr: "La phrase", en: "The line" },
};

/** Objets que le Studio sait dessiner pour montrer la marque « en vrai » (produits) ou sur le terrain (services). */
export const BOARD_OBJECTS = ["sachet", "pot", "flacon", "bouteille", "boite", "tube", "etiquette", "sac", "carte", "enseigne", "vehicule", "tablier"] as const;
export const BOARD_OBJECT_LABEL: Record<(typeof BOARD_OBJECTS)[number], { fr: string; en: string }> = {
  sachet: { fr: "Le sachet", en: "The pouch" }, pot: { fr: "Le pot", en: "The jar" }, flacon: { fr: "Le flacon", en: "The bottle" },
  bouteille: { fr: "La bouteille", en: "The bottle" }, boite: { fr: "La boîte", en: "The box" }, tube: { fr: "Le tube", en: "The tube" },
  etiquette: { fr: "L'étiquette", en: "The label" }, sac: { fr: "Le sac", en: "The bag" }, carte: { fr: "La carte de visite", en: "The business card" },
  enseigne: { fr: "L'enseigne", en: "The shop sign" }, vehicule: { fr: "Le véhicule", en: "The van" }, tablier: { fr: "La tenue", en: "The workwear" },
};
/** Objets des entreprises de services : jamais un emballage pour qui ne vend pas de produit. */
export const SERVICE_OBJECTS: readonly (typeof BOARD_OBJECTS)[number][] = ["carte", "enseigne", "vehicule", "tablier"];

/** Couleur de la palette posée derrière un dessin ou une publication (le Studio choisit le texte lisible dessus). */
export const PALETTE_ROLES = ["dark", "primary", "secondary", "accent", "light"] as const;
export type PaletteRole = (typeof PALETTE_ROLES)[number];

/** Le nom dessiné en code : une recette, jamais un dessin libre (le nom reste exact à la lettre, accents compris). */
export const WordmarkSchema = z.object({
  case: z.enum(["upper", "title", "lower", "asis"]),
  /** Espace entre les lettres, en cadratins (0 à 0,4). */
  tracking: z.number().min(0).max(0.4),
  /** Mise en lignes voulue par la direction artistique (« LÂCHE LE / MOR / CEAU ») : les lettres du nom, rien d'autre. */
  lines: z.array(z.string().min(1).max(30)).min(2).max(4).optional(),
  /** Alignement des lignes. */
  align: z.enum(["gauche", "centre"]).default("gauche"),
  /** Point final dans la couleur d'accent. */
  dot: z.boolean().default(false),
  /** Petit signe placé avec le nom (nettoyé) : à gauche, au-dessus, ou aucun. */
  symbol: BoardSymbolSchema.optional(),
  symbolPlace: z.enum(["gauche", "dessus"]).default("gauche"),
  // Gestes de lettrage (retour du propriétaire du 12 novembre 2026 : « mieux travailler la base des logos »). Le Studio
  // les compose lui-même, lettres exactes : ce sont des réglages, jamais un dessin libre du nom.
  /** Taille de chaque ligne (1 = normale) : une ligne en petit, une autre en grand. */
  scale: z.array(z.number().min(0.4).max(1.8)).max(4).optional(),
  /** Inclinaison de chaque ligne, en degrés : un mot qui tombe, une ligne qui penche. */
  tilt: z.array(z.number().min(-8).max(8)).max(4).optional(),
  /** Mots écrits dans la couleur d'accent (0 = premier mot du nom). */
  accentWords: z.array(z.number().int().min(0).max(7)).max(4).optional(),
  /** Une ligne ondulée coupe le nom à cette hauteur (0 = haut, 1 = bas) ; ce qui est dessous prend la couleur d'accent. */
  cut: z.object({ at: z.number().min(0.2).max(0.8) }).optional(),
  /** Une lettre (0 = première lettre du nom) remplacée par un dessin qui se lit comme elle (une bouée pour un O). */
  swap: z.object({ letter: z.number().int().min(0).max(39), art: ArtSchema }).optional(),
  /** Quelques mots écrits à la main près du nom (« voilà, c'est dit »). */
  note: z.string().min(1).max(32).optional(),
  /** Trait à la main sous le nom. */
  underline: z.boolean().optional(),
});
export type Wordmark = z.infer<typeof WordmarkSchema>;

/** Image créée pour la planche, rangée dans la bibliothèque du projet : une référence, jamais une adresse libre. */
export const BoardImageSchema = z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{4,80}$/), w: z.number().int().positive().max(8192), h: z.number().int().positive().max(8192) });
export type BoardImage = z.infer<typeof BoardImageSchema>;

export const BoardSchema = z.object({
  /** L'idée de marque : ce que la marque croit, ce que le client pense sans le dire, ce qu'elle combat. */
  idea: z.object({
    belief: z.string().min(1).max(240),
    confession: z.string().min(1).max(240),
    /** Nombre de paroles réelles de clients (avec leur source) qui appuient l'aveu ; 0 = hypothèse, dite au client. */
    confessionSupport: z.number().int().min(0).max(500),
    enemy: z.string().min(1).max(240),
    /** La preuve visible dans l'objet (ce qu'on peut montrer du doigt). */
    proof: z.string().min(1).max(240),
    /** Ce que l'idée coûte : ce que la marque s'interdit pour rester elle-même. */
    cost: z.string().min(1).max(240),
  }),
  /** Vérification du nom : seule une recherche sur le web est faite, jamais un dépôt de marque. */
  nameCheck: z.enum(["rien_trouve", "non_verifie"]),
  /** Ligne de métier sous le nom (« Infusions de fruits à boire bien fraîches »). */
  descriptor: z.string().min(1).max(70).optional(),
  /** La grande image de la planche : la scène qui fait comprendre l'idée d'un coup d'œil. */
  hero: ArtSchema.optional(),
  /** Autres phrases de la marque (la signature est le slogan de l'identité). */
  lines: z.array(z.string().min(1).max(120)).min(2).max(5),
  voice: z.object({
    /** Quatre curseurs de ton (0 = tout à gauche, 100 = tout à droite). */
    sliders: z.array(z.object({ left: z.string().min(1).max(28), right: z.string().min(1).max(28), value: z.number().min(0).max(100) })).length(4),
    /** Trois « ceci, pas cela ». */
    thisNotThat: z.array(z.object({ yes: z.string().min(1).max(100), no: z.string().min(1).max(100) })).length(3),
    houseWords: z.array(z.string().min(1).max(32)).min(3).max(8),
    bannedWords: z.array(z.string().min(1).max(32)).min(3).max(8),
    /** « Elle est » : trois ou quatre traits, chacun avec sa limite (« Complice, pas gamine. »). */
    is: z.array(z.string().min(1).max(48)).max(4).optional(),
    /** La voix en situation : un bouton, une fiche produit, un panier vide, un paiement refusé… */
    micro: z.array(z.object({ where: z.string().min(1).max(40), text: z.string().min(1).max(120) })).max(4).optional(),
  }),
  /** Trois à cinq signes que l'on reconnaît sans lire le nom. */
  signs: z.array(z.object({
    kind: z.enum(SIGN_KINDS),
    title: z.string().min(1).max(48),
    text: z.string().min(1).max(180),
    symbol: BoardSymbolSchema.optional(),
    /** Le signe DESSINÉ (prioritaire sur le petit pictogramme), sur fond transparent. */
    art: ArtSchema.optional(),
    /** Couleur de la palette derrière le dessin. */
    ground: z.enum(PALETTE_ROLES).optional(),
    /** Quelques mots montrés à la place d'un dessin, quand le signe EST un texte (« Fraise. Basilic. »). */
    sample: z.string().min(1).max(48).optional(),
    /** Ces mots sont écrits à la main (un aveu, une note). */
    hand: z.boolean().optional(),
  })).min(3).max(5),
  wordmark: WordmarkSchema,
  /** L'objet : ce qui est écrit devant, ce qui est écrit au dos. */
  object: z.object({
    kind: z.enum(BOARD_OBJECTS),
    front: z.array(z.string().min(1).max(70)).min(1).max(4),
    back: z.array(z.string().min(1).max(110)).max(5).default([]),
    /** Dessin posé sur le devant de l'objet (la fenêtre du sachet, la scène de l'étiquette). */
    art: ArtSchema.optional(),
    /** Quelques mots écrits à la main sur le devant (« Ne pétille pas. »). */
    note: z.string().min(1).max(32).optional(),
  }),
  /** Le colis : ce qui est écrit sur son ruban. */
  parcel: z.object({ tape: z.string().min(1).max(50) }).optional(),
  /** Le haut de la page d'accueil, sur téléphone. */
  site: z.object({
    headline: z.string().min(1).max(80),
    text: z.string().min(1).max(180),
    button: z.string().min(1).max(30),
    menu: z.array(z.string().min(1).max(18)).max(4).default([]),
    /** Image du haut de la page. */
    art: ArtSchema.optional(),
  }),
  /** Trois publications. */
  posts: z.array(z.object({
    text: z.string().min(1).max(120), look: z.enum(["fond", "couleur", "motif", "citation"]),
    /** Dessin de la publication, sur fond transparent : le texte se pose en bas, sur la partie calme. */
    art: ArtSchema.optional(),
    /** Couleur de la palette qui sert de fond à la publication (trois publications, trois fonds différents). */
    ground: z.enum(PALETTE_ROLES).optional(),
    /** Quelques mots écrits à la main sous le texte (« Voilà, c'est dit. »). */
    note: z.string().min(1).max(32).optional(),
  })).length(3),
  /** Ce qui reste à prouver : dit clairement au client, jamais inventé. */
  toProve: z.array(z.string().min(1).max(220)).min(1).max(8),
  /**
   * Images créées pour finir la planche (`brand-images.ts`) : seulement celles qui ont passé la relecture. Une image
   * absente laisse la place au dessin de SINA. `look` : la direction artistique globale qui les tient ensemble.
   */
  images: z.object({
    logo: BoardImageSchema.optional(), hero: BoardImageSchema.optional(), object: BoardImageSchema.optional(), site: BoardImageSchema.optional(),
    posts: z.array(BoardImageSchema.nullable()).length(3).optional(), look: z.string().max(700).optional(),
  }).optional(),
});
export type Board = z.infer<typeof BoardSchema>;
