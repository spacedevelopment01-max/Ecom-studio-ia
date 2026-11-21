/**
 * Les six familles du thème unique du Studio (référence, partie 15 ; lot 4, 16 novembre 2026). Elles restent EN
 * COULISSES : jamais montrées ni nommées au client. Une famille est un ensemble de choix accordés entre eux (en-tête,
 * pied de page, ouverture, rythme, boutons, titres, traitement des photos). SINA la déduit de la planche de marque, puis
 * l'adapte au métier et au client : la famille donne des choix possibles, jamais un site tout fait.
 *
 * Source : les six styles relevés sur de vrais sites le 15 novembre 2026 (page du propriétaire « Six styles d'après les
 * meilleurs sites »). Leçon retenue : un style se définit d'abord par sa façon de photographier, puis par sa police et
 * ses sections. Aucun nom de site ni de marque n'est donné au concepteur : seulement ce que ces sites font.
 *
 * Règle du propriétaire, valable pour toutes les familles : l'accueil s'ouvre par une grande photo pleine avec le titre
 * dessus. Chaque famille a donc ses façons de poser le titre sur la photo, jamais une ouverture sans photo pleine.
 * Gratuit, sans IA.
 */
import { z } from "zod";
import type { Design } from "./design";
import type { Tenue } from "./tenue";
import { OUVERTURES_SERVICES } from "./tenue-partitions";

export const FAMILLE_IDS = ["maison-chaleureuse", "epure-editorial", "naturel-sincere", "gourmand-joyeux", "confiance-savoir-faire", "spectaculaire"] as const;
export type FamilleId = (typeof FAMILLE_IDS)[number];

type TenueChoix = { [K in "titres" | "bouton" | "cadre" | "fond" | "petits"]: Tenue[K][] };
export type Famille = {
  id: FamilleId;
  /** Nom de travail, jamais dit au client. */
  nom: string;
  /** Les métiers où on la rencontre le plus (un repère, pas une règle : la planche décide). */
  metiers: string;
  /** À quoi on la reconnaît sur une planche de marque. */
  planche: string;
  /** Ce que font les meilleurs sites de cette allure. */
  esprit: string;
  /** La façon de photographier : elle fait l'essentiel de l'allure. */
  photos: string;
  police: string;
  couleurs: string;
  rythme: string;
  /** Les réglages de l'allure permis dans la famille (le premier de chaque liste est le plus typique). */
  tenue: TenueChoix;
  /** En-têtes permis (« section » ou « section:construction »), parmi les huit du thème et l'en-tête d'origine. */
  entete: string[];
  /** Pieds de page permis (« section » ou « section:construction »). */
  pied: string[];
  /** Ouvertures de l'accueil permises (« section:construction » ou « section »), toutes en photo pleine, titre dessus. */
  ouvertures: string[];
  /** Les moments qui font cette allure, à poser quand la marque a de quoi les remplir (rôles ou pièces de la bibliothèque). */
  cles: string;
};

/** Ouvertures qui respectent la règle du propriétaire : grande photo pleine, le titre posé dessus. */
export const OUVERTURES_PHOTO_PLEINE = ["tn-ouverture:dans-la-photo", "tn-ouverture:titre-centre", "tn-ouverture:titre-en-bas", "tn-ouverture:titre-massif", "tn-ouverture:bandeau", "tn-ouverture-carte", ...OUVERTURES_SERVICES] as const;

export const FAMILLES: Famille[] = [
  {
    id: "maison-chaleureuse", nom: "Maison chaleureuse", metiers: "literie, linge de maison, décoration, mobilier, art de vivre",
    planche: "des tons chauds et profonds tirés des matières (bois, lin, ocre, terre), une police de titre à empattements fine et douce, une voix posée qui parle du soir et de chez soi",
    esprit: "on se voit chez soi : une pièce habitée en grande photo, les gammes en grandes tuiles avec un seul mot, puis sous chaque produit ses points clés et son prix, et la bande des promesses",
    photos: "le produit dans une vraie pièce habitée, lumière chaude de fin de journée ou de lampe, matières en gros plan ; jamais un fond de studio froid",
    police: "titres fins à empattements, serrés ; texte simple et très lisible",
    couleurs: "celles de la photo (bois, lin, ocre) ; une couleur profonde réservée aux boutons",
    rythme: "ample et calme : grandes photos pleine largeur, sections aérées, une bande de couleur douce pour les promesses, un moment sombre au plus par page",
    tenue: { titres: ["fins"], bouton: ["pilule", "droit"], cadre: ["droit"], fond: ["uni", "toile"], petits: ["normal"] },
    entete: ["tn-entete-liens:logo-centre", "tn-entete-liens:mega-colonnes", "tn-entete-annonce", "tn-entete:centre"], pied: ["tn-pied-complet:colonnes", "tn-pied-lettre", "tn-pied-reassurance", "tn-pied-complet:grand-nom"],
    ouvertures: ["tn-ouverture:titre-centre", "tn-ouverture:dans-la-photo", "tn-ouverture-carte"],
    cles: "les gammes en tuiles photo juste sous l'ouverture, les produits avec leurs points clés, la bande des promesses vraies, les avis s'il y en a, l'histoire de l'atelier",
  },
  {
    id: "epure-editorial", nom: "Épuré et éditorial", metiers: "mode, maroquinerie, bijoux, beauté haut de gamme, créateurs",
    planche: "très peu de couleurs (blanc, pierre, noir, une teinte discrète), une police de titre très contrastée ou une seule famille sans empattement, une voix brève, sûre d'elle, presque silencieuse",
    esprit: "le vide est le luxe : beaucoup de blanc, une photo, très peu de mots ; un menu discret, des boutons petits et nets ; les produits alignés comme en vitrine, tous photographiés pareil",
    photos: "l'objet seul sur un fond uni, ou une silhouette en extérieur ; un sujet par image, jamais d'accumulation ; tous les produits cadrés de la même façon",
    police: "une capitale très contrastée, ou une seule famille sans empattement, forte en titre ; petits textes discrets",
    couleurs: "blanc, gris pierre, noir ; une seule couleur discrète tirée de la marque",
    rythme: "beaucoup d'air et peu de sections denses : deux photos côte à côte, une grille vitrine, une phrase seule sur toute la largeur ; aucun fond de couleur vive",
    tenue: { titres: ["fins", "capitales"], bouton: ["droit"], cadre: ["droit"], fond: ["uni"], petits: ["normal"] },
    entete: ["tn-entete-liens:plein-ecran", "tn-entete-liens:sur-photo", "tn-entete-liens:logo-centre", "tn-entete:gauche"], pied: ["tn-pied-complet:centre-minimal", "tn-pied-complet:grand-nom", "tn-pied"],
    ouvertures: ["tn-ouverture:titre-en-bas", "tn-ouverture:dans-la-photo"],
    cles: "deux photos côte à côte, les produits en grille vitrine, une phrase de la personne qui crée, le savoir-faire montré de près",
  },
  {
    id: "naturel-sincere", nom: "Naturel et sincère", metiers: "soins naturels, savonnerie, épicerie fine, produits locaux, petits ateliers",
    planche: "deux ou trois tons tirés des ingrédients ou de la matière (végétal, argile, miel), une police de titre à empattements chaleureuse, une voix simple qui dit d'où viennent les choses et qui les fait",
    esprit: "chaque produit est raconté (d'où il vient, comment il est fait) ; des fonds de couleur douce ou franche derrière le produit, jamais un blanc froid ; les engagements vrais juste sous l'ouverture",
    photos: "le produit avec ses ingrédients, des mains au travail, l'atelier ; lumière du jour ; fonds colorés unis ; rien de trop lissé",
    police: "titres à empattements chaleureux ; texte simple ; une touche manuscrite seulement si la marque en a une",
    couleurs: "deux ou trois tons tirés des ingrédients ; des fonds colorés doux qui alternent",
    rythme: "généreux et régulier : les fonds de couleur douce alternent avec le clair, chaque section raconte une chose, les preuves viennent du geste et de la matière",
    tenue: { titres: ["fins"], bouton: ["pilule", "etiquette"], cadre: ["droit"], fond: ["toile", "uni"], petits: ["normal"] },
    entete: ["tn-entete-liens:classique", "tn-entete-annonce", "tn-entete-liens:logo-centre", "tn-entete:centre"], pied: ["tn-pied-lettre", "tn-pied-complet:colonnes", "tn-pied-complet:centre"],
    ouvertures: ["tn-ouverture-carte", "tn-ouverture:dans-la-photo", "tn-ouverture:titre-centre"],
    cles: "les engagements vrais juste sous l'ouverture, le produit raconté, ce qu'il contient, l'atelier et la fabrication, les avis s'il y en a",
  },
  {
    id: "gourmand-joyeux", nom: "Gourmand et joyeux", metiers: "gâteaux et biscuits, boissons, enfants, animaux, loisirs",
    planche: "une couleur vedette très franche et deux couleurs d'appoint, une police de titre grasse et serrée, une voix qui fait sourire et donne faim ou envie de jouer",
    esprit: "une personnalité avant tout : des cadres épais, des étiquettes, chaque bloc ressemble à un objet ; des titres en capitales serrées ; des boutons comme des autocollants",
    photos: "le produit en gros plan appétissant ou en plein jeu, couleurs saturées, fonds colorés ; de la vie, du mouvement",
    police: "capitales serrées très grasses en titre ; texte rond et lisible",
    couleurs: "une couleur vedette très franche, deux couleurs d'appoint ; des aplats pleins",
    rythme: "vif : les fonds changent souvent, les blocs sont encadrés, un moment qui fait sourire toutes les deux ou trois sections",
    tenue: { titres: ["capitales", "gras"], bouton: ["ombre", "pilule"], cadre: ["penche", "droit"], fond: ["uni"], petits: ["normal"] },
    entete: ["tn-entete-annonce", "tn-entete-liens:mega-produits", "tn-entete-liens:classique", "tn-entete:gauche"], pied: ["tn-pied-complet:grand-nom", "tn-pied-lettre", "tn-pied-reassurance"],
    ouvertures: ["tn-ouverture:titre-massif", "tn-ouverture-carte", "tn-ouverture:bandeau"],
    cles: "les produits en cartes encadrées, la mission de la marque dite en grand, les coulisses de la fabrication",
  },
  {
    id: "confiance-savoir-faire", nom: "Confiance et savoir-faire", metiers: "artisans du bâtiment, rénovation, réparation, garage, services à domicile",
    planche: "un fond sombre et sérieux, une couleur chaude réservée à l'action, une police de titre nette et solide, une voix directe qui parle de délais tenus, de prix clairs et de travail bien fait",
    esprit: "ils montrent le résultat, jamais les outils ; un seul bouton fort (devis, rendez-vous) ; les peurs du client traitées une à une : le prix, les délais, la qualité, la tranquillité",
    photos: "le travail fini, en grand, dans un lieu où l'on a envie de vivre ou de rouler ; l'avant et l'après quand le client les a ; jamais une équipe inventée, jamais de personne sans photo fournie par le client ou son accord écrit",
    police: "titres nets et solides, très lisibles au téléphone ; texte direct",
    couleurs: "un fond sombre et sérieux, du clair pour lire, une couleur chaude réservée au bouton",
    rythme: "net et ordonné : une promesse, puis une réponse par peur du client, des étapes numérotées, le moyen d'agir (téléphone, devis) qui revient souvent",
    tenue: { titres: ["gras"], bouton: ["droit", "pilule"], cadre: ["droit"], fond: ["uni"], petits: ["machine", "normal"] },
    entete: ["tn-entete-liens:classique", "tn-entete:sangle", "tn-entete-annonce"], pied: ["tn-pied-reassurance", "tn-pied-complet:colonnes", "tn-pied"],
    ouvertures: ["tn-ouverture:bandeau", "tn-ouverture:dans-la-photo"],
    cles: "les engagements vrais, comment ça se passe en étapes, les prestations et leurs prix, les réalisations, les avis s'il y en a, la zone d'intervention, la demande de devis ou de rendez-vous",
  },
  {
    id: "spectaculaire", nom: "Spectaculaire", metiers: "sport, matériel technique, vêtements d'action, coachs",
    planche: "noir, blanc et une couleur vive, une police de titre étroite et très grasse (ou très fine et large), une voix courte, à l'impératif du geste, tournée vers la performance",
    esprit: "une image de cinéma en pleine page, le produit ou le geste en mouvement ; le site se coupe en grandes entrées (par public ou par usage) ; très peu de mots, mais énormes",
    photos: "l'action, une lumière rasante, de grands espaces, des contrastes forts ; le produit en mouvement ou sous tous les angles",
    police: "capitales étroites et très grasses, ou très fines et larges ; jamais entre les deux",
    couleurs: "noir et blanc, une couleur vive réservée à l'action",
    rythme: "en grands plans : des photos pleine largeur qui s'enchaînent, peu de texte, des chiffres vrais montrés en grand",
    tenue: { titres: ["capitales", "gras"], bouton: ["droit", "pilule"], cadre: ["droit"], fond: ["uni"], petits: ["machine", "normal"] },
    entete: ["tn-entete-liens:sur-photo", "tn-entete-liens:mega-produits", "tn-entete-liens:plein-ecran", "tn-entete:sangle"], pied: ["tn-pied-complet:grand-nom", "tn-pied-reassurance", "tn-pied"],
    ouvertures: ["tn-ouverture:titre-massif", "tn-ouverture:titre-en-bas"],
    cles: "les grandes entrées par public ou par usage, le produit vu de près sous tous les angles, ses caractéristiques vraies en chiffres, une galerie",
  },
];

/** Site de services : son en-tête (téléphone et rendez-vous toujours visibles) et son pied de page, permis dans toutes les familles. */
export const ENTETE_SERVICES = "tn-entete-services";
export const PIED_SERVICES = "tn-pied-services";
const MEGA = ["mega-colonnes", "mega-produits"];
/** Ce que le site est, pour les choix qui en dépendent : boutique ou services, nombre de familles de produits. */
export type FamilleFacts = { business?: "products" | "services"; families?: number };
const headersOf = (f: Famille, o: FamilleFacts) => {
  if (o.business === "services") return [ENTETE_SERVICES];
  return f.entete.filter((r) => !MEGA.includes(r.split(":")[1] ?? "") || o.families == null || o.families >= 3);
};
const footersOf = (f: Famille, o: FamilleFacts) => (o.business === "services" ? [PIED_SERVICES, ...f.pied.filter((r) => r !== "tn-pied-reassurance")] : f.pied);
/**
 * Les ouvertures de l'accueil pour CE site. Un site de services (17 novembre 2026, règle d'or 1 du cahier « ordre et
 * variété » : « pour un service : la ville et le téléphone cliquable en plus ») ouvre, dans TOUTES les familles, par
 * l'ouverture d'un métier de services en grande photo pleine, le titre dessus : elle porte le métier et la ville, la
 * zone et le téléphone cliquable du profil. Les ouvertures de la famille restent permises ensuite : le contrôle de
 * l'ordre (ordre.ts) les refuse quand le profil connaît la zone ou le téléphone, qu'elles ne portent pas.
 */
const ouverturesOf = (f: Famille, o: FamilleFacts): string[] => (o.business === "services" ? [...OUVERTURES_SERVICES, ...f.ouvertures] : [...f.ouvertures]);

/** Les choix d'en-tête, de pied de page et d'ouverture d'une famille pour CE site (services ou boutique) : sert à la règle « ils tournent ». */
export const choixDeLaFamille = (id: string | null | undefined, o: FamilleFacts = {}): { entete: string[]; pied: string[]; ouvertures: string[] } | null => { const f = familleOf(id); return f ? { entete: headersOf(f, o), pied: footersOf(f, o), ouvertures: ouverturesOf(f, o) } : null; };
const BY_ID = new Map(FAMILLES.map((f) => [f.id, f]));
export const familleOf = (id: string | null | undefined): Famille | null => (id ? BY_ID.get(id as FamilleId) ?? null : null);

/** Lecture indulgente du choix du concepteur (un accent, une majuscule, le nom au lieu de la clé) : jamais un appel payé perdu. */
const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "-").replace(/^-+|-+$/g, "") : "");
export function readFamille(v: unknown): FamilleId | null {
  const s = plain(v);
  if (!s) return null;
  const hit = FAMILLES.find((f) => f.id === s || plain(f.nom) === s || s.startsWith(f.id.split("-")[0]) && s.includes(f.id.split("-")[1] ?? ""));
  return hit?.id ?? null;
}
export const FamillePick = z.preprocess(readFamille, z.enum(FAMILLE_IDS).nullable()).catch(null);

/** Les six familles, dites au concepteur : il en choisit UNE d'après la planche, puis conçoit dans ses choix. */
export function famillesBrief(): string {
  const tenue = (t: TenueChoix) => `titres ${t.titres.join(" ou ")} ; bouton ${t.bouton.join(" ou ")} ; cadre ${t.cadre.join(" ou ")} ; fond ${t.fond.join(" ou ")} ; petits textes ${t.petits.join(" ou ")}`;
  return [
    "LES SIX FAMILLES DU STUDIO (en coulisses : le client ne les voit jamais et n'en entend jamais le nom). Une famille est un ensemble de choix accordés entre eux. Choisis-en UNE (champ « famille », sa clé) en partant de la PLANCHE DE MARQUE : ses couleurs, ses polices, sa direction artistique, sa voix. Le métier n'est qu'un indice : une marque de sport posée et artisanale n'est pas « spectaculaire », un artisan à la planche claire et douce n'est pas forcément « confiance ». Dis dans « familleWhy », en une ou deux phrases, ce que tu as vu sur la planche qui décide. Puis conçois TOUT le site dans les choix de cette famille (allure, en-tête, pied de page, ouverture, rythme, photos), en les adaptant à CE métier et à CE client : la famille donne une allure, jamais un plan de page. Deux marques de la même famille n'ont pas le même site.",
    ...FAMILLES.map((f) => [
      `- ${f.id} (${f.nom}). On la rencontre souvent pour : ${f.metiers}.`,
      `  Sur la planche : ${f.planche}.`,
      `  Ce que font les meilleurs sites de cette allure : ${f.esprit}.`,
      `  Photos (champ « photos » de chaque section) : ${f.photos}.`,
      `  Rythme : ${f.rythme}.`,
      `  Allure permise (champ « tenue ») : ${tenue(f.tenue)}.`,
      `  En-tête (header et headerConstruction, écrits « pièce:construction ») : ${f.entete.join(" ou ")}. Pied de page (footer et footerConstruction) : ${f.pied.join(" ou ")}. Ouverture de l'accueil : ${f.ouvertures.join(" ou ")}.`,
      `  Ses moments forts, quand la marque a de quoi les remplir : ${f.cles}.`,
    ].join("\n")),
    "L'accueil s'ouvre TOUJOURS par une grande photo pleine avec le titre posé dessus : seules les ouvertures données pour la famille sont permises.",
    `POUR UN SITE DE SERVICES, quelle que soit la famille : l'en-tête est « ${ENTETE_SERVICES} » (le téléphone et le bouton de rendez-vous ou de devis toujours visibles ; jamais de panier) et le pied de page « ${PIED_SERVICES} » (téléphone, adresse, horaires, zone) est permis en plus de ceux de la famille ; le pied « tn-pied-reassurance » (livraison, retours, paiement) est réservé aux boutiques. L'OUVERTURE de l'accueil d'un site de services est « tn-ouverture-metier », dans une de ses trois façons en grande photo pleine (${OUVERTURES_SERVICES.join(" ou ")}) : le premier écran d'un service dit le métier et la ville et porte le téléphone cliquable ; le Studio y pose tout seul la zone, les horaires et le téléphone du profil.`,
    "LES GRANDS MENUS (« tn-entete-liens:mega-colonnes », « tn-entete-liens:mega-produits ») ne se prennent que pour une boutique dont le catalogue a au moins trois familles de produits ; sinon, un autre en-tête de la famille.",
  ].join("\n");
}

const built = (id: string, construction?: string | null) => (construction ? `${id}:${construction}` : id);
const allows = (list: readonly string[], id: string, construction?: string | null) => list.includes(built(id, construction)) || list.includes(id);

/**
 * Contrôle du Studio, sans IA : la conception tient-elle dans les choix de la famille qu'elle annonce ? Chaque écart est
 * rendu au concepteur pour sa seule reprise. Une famille absente ou inconnue est un écart.
 */
export function familleGaps(d: Pick<Design, "pages" | "header" | "headerConstruction" | "footer" | "tenue"> & { famille?: string | null; footerConstruction?: string | null }, o: FamilleFacts = {}): string[] {
  const f = familleOf(d.famille);
  if (!f) return [`famille manquante ou inconnue : choisis une des six familles d'après la planche de marque (${FAMILLE_IDS.join(", ")})`];
  const out: string[] = [];
  const t = d.tenue;
  if (!t) out.push(`famille ${f.id} : l'allure (champ « tenue ») manque`);
  else for (const k of ["titres", "bouton", "cadre", "fond", "petits"] as const) {
    if (!(f.tenue[k] as string[]).includes(t[k])) out.push(`famille ${f.id} : ${k} « ${t[k]} » n'est pas dans ses choix (${f.tenue[k].join(" ou ")})`);
  }
  const heads = headersOf(f, o), feet = footersOf(f, o);
  if (!allows(heads, d.header, d.headerConstruction)) out.push(`famille ${f.id}${o.business === "services" ? ", site de services" : ""} : l'en-tête « ${built(d.header, d.headerConstruction)} » n'est pas dans ses choix (${heads.join(" ou ")})`);
  if (!allows(feet, d.footer, d.footerConstruction)) out.push(`famille ${f.id} : le pied de page « ${built(d.footer, d.footerConstruction)} » n'est pas dans ses choix (${feet.join(" ou ")})`);
  const first = d.pages.find((p) => p.key === "home")?.sections[0];
  const opens = ouverturesOf(f, o);
  if (first && !allows(opens, first.section, first.construction)) out.push(`famille ${f.id}${o.business === "services" ? ", site de services" : ""} : l'accueil s'ouvre par « ${built(first.section, first.construction)} », qui n'est pas dans ses ouvertures (${opens.join(" ou ")}) : grande photo pleine, le titre posé dessus`);
  return out;
}

/** La façon de photographier de la famille, pour la directrice artistique et les photos créées. */
export const famillePhotoLine = (id: string | null | undefined): string => { const f = familleOf(id); return f ? `FAÇON DE PHOTOGRAPHIER DE CE SITE (à suivre dans toutes ses photos) : ${f.photos}. Couleurs : ${f.couleurs}.` : ""; };

/**
 * Dernier recours, sans IA : après la seule reprise du concepteur, ce qui sort encore des choix de la famille y est
 * ramené (le réglage le plus typique de la famille). Le site est ainsi toujours fait dans son style, sans appel de plus.
 * Rend la conception ajustée et ce qui a été changé.
 */
export function fitFamille<D extends Pick<Design, "pages" | "header" | "headerConstruction" | "footer" | "tenue"> & { famille?: string | null; footerConstruction?: string | null }>(d: D, o: FamilleFacts = {}): { d: D; changed: string[] } {
  const f = familleOf(d.famille);
  if (!f) return { d, changed: [] };
  const out: D = JSON.parse(JSON.stringify(d));
  const changed: string[] = [];
  if (out.tenue) for (const k of ["titres", "bouton", "cadre", "fond", "petits"] as const) {
    if (!(f.tenue[k] as string[]).includes(out.tenue[k])) { changed.push(`${k} : ${out.tenue[k]} → ${f.tenue[k][0]}`); (out.tenue as Record<string, string>)[k] = f.tenue[k][0]; }
  }
  const heads = headersOf(f, o), feet = footersOf(f, o);
  if (!allows(heads, out.header, out.headerConstruction)) { const [id, c] = heads[0].split(":"); changed.push(`en-tête : ${built(out.header, out.headerConstruction)} → ${heads[0]}`); out.header = id; out.headerConstruction = c ?? null; }
  if (!allows(feet, out.footer, out.footerConstruction)) { const [id, c] = feet[0].split(":"); changed.push(`pied de page : ${built(out.footer, out.footerConstruction)} → ${feet[0]}`); out.footer = id; out.footerConstruction = c ?? null; }
  const home = out.pages.find((p) => p.key === "home"), first = home?.sections[0];
  const opens = ouverturesOf(f, o);
  if (first && !allows(opens, first.section, first.construction)) { const [id, c] = opens[0].split(":"); changed.push(`ouverture : ${built(first.section, first.construction)} → ${opens[0]}`); first.section = id; first.construction = c ?? null; }
  return { d: out, changed };
}
