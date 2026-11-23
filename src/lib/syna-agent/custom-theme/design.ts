/**
 * Conception du thème sur mesure (retour du propriétaire du 9 novembre 2026 sur l'essai Heure Dorée : « il y a plus de
 * 200 sections et elle fait la flemmarde à prendre des sections sans logique et en prendre le moins possible » ; « ce
 * n'est pas à noter dans les règles simplement, ça dépend de quoi est le projet du client, c'est là où il doit y avoir
 * une logique de conception » ; « c'est le mieux que tu peux faire en consigne ? »).
 *
 * Deux passages du modèle des textes du site, comme une agence :
 *  1) le directeur de création écrit d'abord la STRATÉGIE (le visiteur, ses objections et où chacune trouve sa réponse,
 *     les leviers qui le décident), puis le parcours de chaque page et la section qui répond à chaque moment, en voyant
 *     les caractéristiques réelles de chaque section (fond, densité, photos : `section-traits.json`) ;
 *  2) le directeur commercial relit sans complaisance (où le visiteur décroche, objection sans réponse, section
 *     décorative, rythme cassé, page trop courte, pas d'appel à agir) et rend la conception corrigée.
 * Le Studio contrôle ensuite sans IA les règles du propriétaire (`checkCustomTheme`), la réponse à CHAQUE objection
 * de la recherche et le rythme ; ce qui est refusé revient une fois au concepteur. La conception est gardée dans le
 * thème (`concept`, `journey` de chaque page, `intent` de chaque section) et sert au plan des textes et au rédacteur.
 */
import { FamillePick, famillesBrief } from "./familles";
import { ReglagesPick, signaturesBrief } from "./signatures";
import { StylePick, stylesBrief } from "./styles-de-page";
import { z } from "zod";
import { MAX_SECTIONS_UTILITAIRE, MIN_SECTIONS_IMPORTANTE, REGLES_D_OR } from "./partitions";
import { FEATURED_ROLE, familySections, isCardSection, libSection, onlyFor, sectionTraits } from "./library";
import { TENUE_CHOICES, TenuePickSchema, constructionsOf, isTenueSection, tenueSection } from "./tenue";
import { sectionGroup } from "./section-groups";
import { requiredPages, platformOwnedPages, type SiteKind } from "./theme";
import type { FamilyId } from "../section-families";

/** construction : pour une section à tenue seulement (une des constructions données dans la bibliothèque). */
/** reglages : fond, alignement et taille du titre de la pièce (signatures.ts), lus avec indulgence. */
const SectionPick = z.object({ section: z.string().max(80), construction: z.string().max(40).nullable().optional(), reglages: ReglagesPick.optional(), why: z.string().min(10).max(600), says: z.string().min(10).max(900), photos: z.string().max(600) });
export const DesignSchema = z.object({
  visitor: z.string().min(20).max(900),
  levers: z.array(z.string().min(3).max(240)).min(2).max(10),
  objections: z.array(z.object({ objection: z.string().min(3).max(300), answer: z.string().min(3).max(500), page: z.string().max(40), section: z.string().max(80) })).max(12),
  concept: z.string().min(20).max(800),
  header: z.string().max(80),
  /** Construction de l'en-tête, s'il est à tenue. */
  headerConstruction: z.string().max(40).nullable().optional(),
  footer: z.string().max(80),
  /** Construction du pied de page, s'il en a. */
  footerConstruction: z.string().max(40).nullable().optional(),
  /** Lot 4 : la famille du Studio choisie d'après la planche de marque (en coulisses), et ce qui l'a décidée. */
  famille: FamillePick.optional(),
  familleWhy: z.string().max(600).nullable().optional(),
  /** Lot 4 : le style de la page qui vend (page produit ou page de services), en coulisses, et ce qui l'a décidé. */
  pageStyle: StylePick.optional(),
  pageStyleWhy: z.string().max(600).nullable().optional(),
  search: z.string().max(80).nullable(),
  /** La tenue de la marque (sections à tenue) : titres, boutons, cadre des photos, fond, petits textes, signe. */
  tenue: TenuePickSchema.nullable().optional(),
  pages: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/),
    label: z.string().min(1).max(40),
    journey: z.string().min(20).max(1200),
    sections: z.array(SectionPick).min(1).max(18),
  })).min(1).max(16),
  /**
   * La partition choisie pour chaque page importante (partitions.ts), et pourquoi elle va à CE client : son angle, ses
   * preuves, ses clients. Lue avec indulgence (un champ mal formé ne fait jamais perdre un appel payé) ; le contrôle du
   * Studio dit ce qui manque.
   */
  partitions: z.array(z.object({ page: z.string().max(40), partition: z.string().max(80), why: z.string().max(700).nullable().optional() })).max(24).optional().catch(undefined),
  /** Relecture : ce que le directeur commercial a corrigé (vide au premier passage). */
  corrections: z.array(z.string().max(400)).max(20),
});
export type Design = z.infer<typeof DesignSchema>;

/**
 * Ce que rendent le juge de l'ordre et la reprise du concepteur : SEULEMENT ce qu'ils changent (audit du site du
 * 22 novembre 2026, 6.1). Une page changée est rendue entière (son ordre se juge d'un bloc) ; une page non touchée n'est
 * pas recopiée ; un autre champ n'est rendu que s'il change. Avant, ils recopiaient les 50 à 70 sections pour en changer
 * quelques-unes : environ 20 000 jetons écrits par appel, 8 minutes, et le risque de dépasser l'attente du différé.
 */
export const DesignPatchSchema = DesignSchema.partial().extend({
  pages: DesignSchema.shape.pages.element.array().max(16).optional(),
  corrections: z.array(z.string().max(400)).max(20).default([]),
});
export type DesignPatch = z.infer<typeof DesignPatchSchema>;

/** Applique les changements rendus : chaque page rendue remplace celle de même clé (ou s'ajoute) ; les partitions se fondent page par page. */
export function applyDesignPatch(base: Design, patch: DesignPatch): Design {
  const { pages, partitions, corrections, ...champs } = patch;
  const out: Design = { ...base };
  for (const [k, v] of Object.entries(champs)) if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  if (pages?.length) {
    const list = base.pages.map((pg) => pages.find((x) => x.key === pg.key) ?? pg);
    for (const pg of pages) if (!list.some((x) => x.key === pg.key)) list.push(pg);
    out.pages = list;
  }
  if (partitions?.length) out.partitions = [...(base.partitions ?? []).filter((x) => !partitions.some((y) => y.page === x.page)), ...partitions];
  out.corrections = corrections ?? [];
  return out;
}

/**
 * Plafond d'un appel de conception (entrée : toute la bibliothèque de la famille ; sortie : tout le site). Essai réel du
 * 10 novembre 2026 (Éclat de thé) : la réflexion du modèle compte dans la sortie ; à 14 000 jetons, la réponse d'un site
 * complet a été coupée (0,34 € payés pour rien). Sortie portée à 32 000 jetons, plafond et coût probable relevés.
 *
 * Essai réel du 18 novembre 2026 (Atelier Vasco refait) : avec le cahier de l'ordre et de la variété, les sites déjà faits
 * et le site actuel du client, la conception écrit désormais de 30 000 à 46 000 jetons ; coupée à 32 000 (puis sa reprise
 * à 48 000), la réponse était illisible : 2,19 € payés pour rien. Sortie portée à 64 000 jetons (seuls les jetons écrits
 * sont payés : environ 1 € mesuré par conception) ; plafond d'un appel relevé à ce que coûterait une sortie entière.
 */
export const DESIGN_OUTPUT_TOKENS = 64_000;
export const DESIGN_CAP_MICRO = 2_200_000;
/** Conception + relecture du juge de l'ordre (deux appels) ; une troisième (la reprise du concepteur) seulement si un contrôle ou un juge refuse quelque chose. */
export const DESIGN_CALLS_MAX = 3;
/** Coût d'une conception, mesuré sur les essais réels des 17 et 18 novembre 2026 (de 0,90 à 1,16 €). */
export const DESIGN_TYPICAL_MICRO = 1_000_000;

/**
 * Exemple de niveau attendu (une autre marque, à ne jamais recopier). Refait le 11 novembre 2026 avec les seules sections
 * actuelles de la banque : l'ancien citait des sections retirées et posait deux fois la même section dans une page,
 * et SINA recopiait ce niveau-là.
 */
const EXAMPLE = `LE NIVEAU ATTENDU, EN LOGIQUE (aucun exemple de marque : tout vient de CETTE marque).
Chaque page importante part de SA PARTITION (données dans la demande) : une suite de moments, chacun répondant à une question que le visiteur se pose à ce moment-là. Tu l'adaptes au client dans les limites des dix règles d'or : ce que le dossier ne peut pas remplir se saute, l'angle déplace un moment d'un cran, une pièce propre au produit ou au métier s'ajoute.
Le visiteur comprend d'abord (ce qui est vendu, pour qui ou où, l'action), il lève ce qui le bloque (le prix et la livraison, ou « tu viens jusque chez moi ? »), il voit l'offre, il a une raison d'y croire (une vraie preuve du dossier, sinon des faits vrais), PUIS seulement vient l'émotion ou la conviction de la marque ; les doutes se lèvent juste avant la fin, et la page finit par l'action.
CETTE LOGIQUE NE DONNE AUCUN IDENTIFIANT À RECOPIER. Pour CHAQUE moment, compare TOUTES les pièces qui peuvent le tenir (celles données avec le moment, ou une autre pièce de la bibliothèque qui fait le même travail) et prends celle qui sert le mieux CETTE marque (son offre, son émotion, ses photos, sa famille) ; dis dans why pourquoi celle-là plutôt que ses voisines. Deux marques différentes n'ont presque jamais les mêmes pièces : une conception qui reprend les pièces des derniers sites du Studio par habitude est refusée.`;

/**
 * L'ordre des pages. Depuis le 16 novembre 2026, les dix règles d'or et les partitions du cahier « ordre et variété »
 * commandent (boutiques ET services) ; ce qui reste ici vient de l'étude de 65 thèmes Shopify vendus sur ThemeForest
 * (11 novembre 2026, docs/etude-themes-themeforest.md) et ne contredit pas le cahier. Retiré parce que le cahier dit
 * autrement : « les preuves après les produits, dans le dernier tiers », « les produits en 2e, 3e ou 4e position »,
 * les pages courtes (collection 2 à 4, à propos 4 à 6, contact 1 à 3, fiche 7 à 10), « les questions tôt ».
 */
export const PAGE_PATTERNS = `F. L'ORDRE DES PAGES. Les dix règles d'or valent pour toutes les pages importantes et pour tous les sites, boutiques comme services ; la partition de chaque page (dans la demande) est ton ordre de départ.
${REGLES_D_OR}
CE QUE FONT EN PLUS LES THÈMES QUI SE VENDENT (65 thèmes de boutique étudiés page par page), tant que cela ne contredit ni une règle d'or ni la partition :
ACCUEIL (${MIN_SECTIONS_IMPORTANTE} à 13 sections ; au-dessus de 13 la page se répète) : l'ouverture TOUJOURS en premier, grande photo (ou diaporama) pleine largeur, un seul bouton qui donne envie ; le milieu ALTERNE « information / image », avec une bande sombre ou sur photo pour le moment fort ; la page ne finit JAMAIS sur des produits.
FICHE PRODUIT (${MIN_SECTIONS_IMPORTANTE} sections au moins) : le bloc d'achat (produit vedette) toujours en premier ; les autres produits en DERNIER (la seule section de cartes de la page).
BOUTIQUE ET COLLECTIONS : la grille avec ses filtres dans le premier écran ; jamais d'histoire ni de long texte au-dessus de la grille ; la réassurance en bas.
PAGES UTILITAIRES, courtes (${MAX_SECTIONS_UTILITAIRE} sections au plus) : le panier (le panier, la barre de livraison offerte ; jamais d'avis, de promotion ni d'histoire), la page introuvable, les mentions légales, la recherche, le remerciement.
RYTHME : fonds clairs pour les produits ; une ou deux bandes de couleur pâle et UNE bande sombre ou sur photo par page ; l'ouverture et les grandes photos en pleine largeur, les produits cadrés.
CE QUE LES BONS THÈMES NE FONT JAMAIS : un minuteur ou une « offre du jour » sur une marque soignée, une fenêtre d'inscription à l'arrivée, des compteurs de visiteurs, deux fois la même section, deux sections de cartes à la suite, une section « espace » pour aérer.`;

/**
 * Sections à tenue (13 novembre 2026, retour du propriétaire : « juste changer les images et les textes ferais déjà des
 * thèmes trop basique ») : le concepteur choisit la section, SA CONSTRUCTION et la tenue de la marque ; il n'écrit pas
 * de code, le Studio fabrique.
 */
export const TENUE_RULES = `SECTIONS « À TENUE » (marquées dans la liste) : elles n'ont pas d'allure à elles, elles prennent celle de la marque. Préfère-les : avec elles, deux marques n'ont jamais le même site. Un site monté avec des sections à tenue l'est EN ENTIER (en-tête, toutes les pages, pied de page) : ne mélange pas, dans un même site, des sections à tenue et des sections qui ont déjà leur allure.
- Pour chaque section à tenue qui en a, choisis sa CONSTRUCTION (champ « construction », une des clés données) d'après la photo prévue et le tempérament de la marque ; dis pourquoi dans why. Deux concepts montrés au client n'ont pas la même construction d'ouverture ni le même en-tête (champ « headerConstruction »).
- Une section à tenue peut servir sur plusieurs pages : elle y aura d'autres textes et d'autres photos.
- TENUE (champ « tenue », une seule pour tout le site, tirée de la planche de marque et du produit) : ${TENUE_CHOICES}
- Le SIGNE : un détail vrai du produit ou du métier (une forme, une matière, une couture) que la tenue reprend à plusieurs endroits ; jamais un décor plaqué.
${signaturesBrief()}`;

export const DESIGN_SYSTEM = `Tu es le directeur de création d'une agence qui conçoit des sites de vente haut de gamme. Tu CONÇOIS le site d'une marque avec une bibliothèque de sections (la liste complète, avec les caractéristiques de chaque section, t'est donnée), en français.
MÉTHODE, dans cet ordre :
A. STRATÉGIE (avant tout choix de section) :
 - visitor : le visiteur réel de CETTE marque : qui il est (la cible de l'angle), ce qu'il a déjà essayé, ce qui le déçoit, ce qu'il ressent en arrivant, ce qui le fera acheter (motivation, émotion de l'angle).
 - objections : TOUTES les objections de la recherche (et celles, évidentes, du métier), chacune avec sa réponse VRAIE (faits de la marque) et la section précise (page, identifiant) où elle trouve sa réponse : comparatif, avant / après, preuve, démonstration, question, garantie.
 - levers : les leviers qui décident CE visiteur (ex. la promesse visible dès l'arrivée, l'émotion du moment de consommation, la transparence de la recette, l'inversion du risque par les retours, la preuve par le savoir-faire quand il n'y a pas d'avis, le prix rapporté à l'usage, le cadeau…).
B. PARCOURS de chaque page (journey) : la suite des questions et des émotions du visiteur, du premier regard à l'action, dans l'ordre de la PARTITION que tu choisis pour la page (champ « partitions » : la page, l'identifiant de la partition, et pourquoi elle va à CE client). Le concret d'abord (ce qui est vendu, ce qui bloque, l'offre, une raison d'y croire), l'émotion et la conviction ensuite, les doutes juste avant la fin, l'action en dernier.
C. SECTIONS : pour CHAQUE moment du parcours, LA section de la bibliothèque qui y répond le mieux ; why = le moment, la question ou l'objection du visiteur, et pourquoi cette section plutôt qu'une autre ; says = ce qu'elle dira concrètement avec les vrais faits, sans en inventer aucun (le message, les éléments précis : questions, lignes de comparatif, étapes, avant et après, et pour chaque bouton son intention et la page où il mène) ; photos = les scènes à photographier pour cette section (lieu, moment, lumière, ce qu'on voit, le vrai produit quand il apparaît), ou « aucune ». Les photos du site forment une histoire visuelle : les scènes « à montrer » de l'angle, jamais deux fois la même scène, le texte posé sur la partie calme de chaque photo.
D. RYTHME : chaque section garde son fond d'origine (dans la liste) : choisis des sections dont le fond convient à l'ambiance ; une section à fond « photo » (la photo fait le fond) va avec les deux ambiances. L'AMBIANCE voulue par le client (claire, sombre ou alternée, donnée plus bas) décide des fonds : site clair = surtout des sections à fond clair, une bande sombre ou de couleur pour les moments forts ; site sombre = surtout des sections à fond sombre, une section claire seulement pour respirer ; alterné = les fonds changent d'une section à l'autre. Dans tous les cas, varie les densités (une section dense est suivie d'une section qui respire) et les dispositions, avec un moment fort d'émotion toutes les deux ou trois sections ; sur une longue page, une raison et un moyen d'agir reviennent régulièrement (bouton vers l'achat, barre d'achat collée sur téléphone si la bibliothèque l'a), et la page finit par un appel à agir.
E. COHÉRENCE DU SITE : l'accueil donne envie et oriente, la fiche produit décide, « à propos » fait confiance à la personne et au savoir-faire, l'aide rassure ; un même fait ou une même scène ne se répète pas d'une page à l'autre, chaque page apporte du neuf.
${PAGE_PATTERNS}
EXIGENCES :
- Des pages RICHES : au moins ${MIN_SECTIONS_IMPORTANTE} sections sur CHAQUE page importante (accueil, fiches produit, pages de prestation, collections, réalisations, à propos, contact, questions), chacune répondant à une vraie question du visiteur. Si le dossier ne permet pas d'en atteindre ${MIN_SECTIONS_IMPORTANTE} sans remplissage, la page en a moins et tu le dis dans corrections : jamais une section de remplissage, jamais un contenu inventé. Les pages utilitaires (panier, page introuvable, mentions légales, recherche, remerciement) restent courtes.
- La description racontée vient juste après le bloc d'achat sur la fiche produit, sauf si la partition de son style la place ailleurs ; jamais en bas de page.
- Jamais une section pour remplir, jamais une section dont CE visiteur n'a pas besoin, jamais une section qui demande un contenu que la marque n'a pas (avis, note, presse, chiffres, photos de clients, vidéo, offres, abonnement, dates : la liste de ce qu'elle a et n'a pas, et celle de ses preuves réelles, te sont données ; un moment dont la preuve manque est sauté ; sans avis, la confiance vient du savoir-faire, de la transparence et des garanties, jamais de la marque qui se cite elle-même). Une section « seulement pour » un genre de produit ne va jamais ailleurs.
- Une seule section de cartes (produits ou familles) par page. « Produit vedette » ouvre la fiche produit (une seule) ou apparaît au plus une fois sur l'accueil ; les offres (lots, quantités, coffret) sont des fonctions de ce bloc, jamais une section à part. Jamais la même section deux fois dans le site (une section = une page). Jamais deux sections de même rôle à la suite. L'accueil s'ouvre par une grande photo avec le titre dessus.
- Toutes les pages obligatoires, avec leurs clés exactes ; aucune page de paiement que la plateforme tient elle-même.
- PAGE DE COLLECTION PROPRE À UNE FAMILLE : la page « shop » sert à toutes les familles de produits. Si UNE famille mérite une page bâtie autrement (une autre ouverture, un récit, un guide de choix), ajoute une page de clé « shop-<nom de la famille en minuscules, sans accent, avec des tirets> » : elle deviendra le modèle de cette collection dans la boutique, reliée à elle. Seulement quand la différence sert le visiteur, jamais pour remplir.
- Utilise UNIQUEMENT les identifiants de la liste (champ « section »). corrections : [] au premier passage.
${TENUE_RULES}
- FAMILLE : avant tout choix de pièce, choisis la famille du Studio qui correspond à la planche de marque (les six te sont décrites dans la demande) ; champs « famille » et « familleWhy ». L'allure, l'en-tête (headerConstruction), le pied de page (footer et footerConstruction), l'ouverture de l'accueil et les photos restent dans SES choix.
${EXAMPLE}
Réponse : uniquement le JSON demandé.`;

/**
 * Le JUGE DE L'ORDRE (cahier « ordre et variété », partie 6) : le directeur commercial, renforcé. Il vérifie chaque page
 * importante contre les dix règles d'or, la partition de la page et le minimum de sections ; il connaît les services
 * autant que les boutiques. Il relit ET corrige : ce qu'il rend est revérifié par un second regard séparé
 * (second-regard.ts), car celui qui corrige n'est jamais celui qui valide.
 */
export const DESIGN_REVIEW_SYSTEM = `Tu es le directeur commercial de l'agence, exigeant et sans complaisance : tu es LE JUGE DE L'ORDRE. Tu relis la conception d'un site (stratégie, parcours, sections) écrite par le directeur de création, avec les mêmes informations que lui et la même bibliothèque. Tu connais les sites de services (artisans, soins, restaurants, métiers qui se déplacent) autant que les boutiques.
TON CONTRÔLE, page importante par page importante (accueil, fiches produit, pages de prestation, collections, réalisations, à propos, contact, questions) :
1. LES DIX RÈGLES D'OR (ci-dessous), une par une. En particulier : le premier écran dit-il ce qui est vendu, pour qui ou où, et l'action (pour un service, la ville et le téléphone) ? La question qui bloque a-t-elle sa réponse au plus tard en 3e position (service qui se déplace : « tu viens jusque chez moi ? » ; boutique : le prix ET la livraison) ? L'offre est-elle au plus tard en 3e ? Une VRAIE preuve du dossier arrive-t-elle avant la 5e section, et jamais la marque qui se cite elle-même à sa place ? Aucune formule, citation ou conviction avant que le visiteur sache ce qu'on vend et pourquoi y croire ? Les doutes juste avant la fin, l'action en dernier ?
2. LA PARTITION de la page (champ « partitions ») : est-elle une de celles permises pour ce client ? La page la suit-elle, aux adaptations près que les règles d'or permettent ? La raison donnée (« why ») parle-t-elle de CE client (son angle, ses preuves, ses clients) ? Une raison qui irait à n'importe qui est refusée : réécris-la avec les faits du dossier, ou change de partition. La partition du dernier site du même métier est interdite.
3. LE NOMBRE : au moins ${MIN_SECTIONS_IMPORTANTE} sections sur chaque page importante, chacune répondant à une vraie question du visiteur. Jamais une section de remplissage ; jamais une section qui demande un contenu que le dossier n'a pas (avis, presse, chiffres, photos de clients) : un moment dont la preuve manque est SAUTÉ. Si le dossier ne permet pas ${MIN_SECTIONS_IMPORTANTE} sections vraies, la page en a moins et tu le dis dans corrections. Les pages utilitaires restent courtes.
Cherche aussi, page par page : où le visiteur décroche ; chaque objection sans réponse convaincante ; chaque section décorative, faible, mal placée ou sans contenu réel ; le rythme cassé (deux dispositions pareilles, deux fonds sombres ou deux sections denses à la suite) ; l'absence d'appel à agir ; un bouton sans page de destination logique ; un fait annoncé qui n'est pas dans les faits de la marque ; un texte prévu (says) creux, vague ou qui décrit au lieu de faire ressentir.
Puis rends SEULEMENT ce que tu changes, dans le même format : chaque page que tu modifies, ENTIÈRE (key, label, journey et toutes ses sections, dans l'ordre voulu) ; une page que tu ne touches pas n'est pas recopiée. Les autres champs (partitions des pages changées, famille, allure, en-tête, pied de page, tenue, objections…) ne sont rendus que si tu les changes. Liste dans corrections ce que tu as changé et pourquoi (une ligne par changement, avec la règle en cause). Si tout est bon, rends seulement corrections, vide.
${PAGE_PATTERNS}
FAMILLE : vérifie que la famille choisie (champ « famille ») est bien celle que dit la PLANCHE DE MARQUE (couleurs, polices, direction artistique, voix), pas seulement le métier ; si une autre famille lui va mieux, change-la, dis pourquoi dans corrections, et remets l'allure, l'en-tête, le pied de page, l'ouverture et les photos dans les choix de la nouvelle famille. Garde les « reglages » de chaque section (et remets-les dans la signature de la famille si tu la changes), les champs « signeForme » et « signeTexte » de la tenue, les champs « famille », « familleWhy », « pageStyle », « pageStyleWhy », « headerConstruction », « footerConstruction » et « partitions ». Vérifie de même que le style de la page qui vend (« pageStyle ») est celui que demande ce que le client vend vraiment.
Mêmes exigences que le concepteur (pages riches, aucune section sans contenu réel, une section de cartes par page, « Produit vedette » en haut de la fiche, jamais la même section deux fois sur une page, pages obligatoires, identifiants de la liste uniquement).
Réponse : uniquement le JSON demandé.`;

/** Catalogue de la famille donné au concepteur : identifiant, rôle, caractéristiques, titre, ce qu'elle fait. */
export function designCatalogue(family: FamilyId, seed?: string): string {
  const tr = sectionTraits();
  // Lot 4 : le thème unique du Studio. Le concepteur ne reçoit que ses pièces (celles qui prennent l'allure de la marque) ;
  // les anciennes sections, qui avaient leur allure à elles et ne partaient pas en boutique, ne lui sont plus données.
  return shuffled(familySections(family).filter((x) => isTenueSection(x)), seed).map((s) => {
    const t = tr[s.id];
    const traits = t ? ` · fond ${t.fond} · ${t.densite} · ${t.photos} photo(s)` : "";
    const built = constructionsOf(s.id);
    const constructions = built.length ? ` · CONSTRUCTIONS au choix (champ « construction ») : ${built.map((c) => `« ${c.key} » (${c.label})`).join(" ; ")}` : "";
    const tn = tenueSection(s.id);
    const extra = tn ? `${tn.pour ? ` · pour un site de ${tn.pour}` : ""}${tn.only ? ` · seulement pour ${tn.only}` : ""}${tn.authentic ? ` · demande ${tn.authentic} (vraies photos du client, jamais créées)` : ""}${tn.data ? ` · lit ${tn.data}` : ""}` : "";
    return `- ${s.id} · ${s.role}${isCardSection(s) ? " · cartes" : ""}${isTenueSection(s) ? " · À TENUE" : ""}${onlyFor(s.tags) ? ` · seulement pour ${onlyFor(s.tags)}` : ""}${extra}${traits} · ${s.title} : ${s.does.slice(0, 320)}${constructions}`;
  }).join("\n");
}

/**
 * Ordre propre à chaque projet (et à chaque concept) : le modèle prend volontiers les premières sections de la liste, et
 * tous les thèmes se ressemblaient (retour du propriétaire du 11 novembre 2026 : « elle doit savoir mélanger et pas
 * mettre tout le temps les mêmes sections »). Sans graine : l'ordre de la banque.
 */
export function shuffled<T>(list: T[], seed?: string): T[] {
  if (!seed) return list;
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Sections reprises trop souvent : celles des derniers thèmes du Studio (autres projets), hors pages pratiques. */
export function varietyGaps(d: Pick<Design, "pages">, recent: string[][]): string[] {
  const mine = d.pages.filter((pg) => pg.key === "home" || /^product/.test(pg.key)).flatMap((pg) => pg.sections.map((x) => x.section));
  if (mine.length < 6) return [];
  const out: string[] = [];
  for (const other of recent) {
    const o = new Set(other), same = mine.filter((x) => o.has(x));
    if (same.length / mine.length >= 0.7) { out.push(`accueil et fiche presque identiques à un thème déjà monté pour une autre marque (${same.length} sections sur ${mine.length} en commun) : compare les autres sections de la bibliothèque pour chaque moment et garde seulement celles qui servent vraiment CETTE marque`); break; }
  }
  return out;
}

export type Ambiance = "clair" | "sombre" | "alterne";
export const AMBIANCE_LABEL: Record<Ambiance, string> = { clair: "site clair (fonds clairs, quelques bandes sombres ou de couleur pour les moments forts)", sombre: "site sombre (fonds sombres, quelques sections claires pour respirer)", alterne: "fonds qui alternent d'une section à l'autre" };

export function designPrompt(o: { brief: string; family: FamilyId; site: SiteKind; has: string[]; lacks: string[]; consigne?: string | null; ambiance?: Ambiance | null; products?: string[]; seed?: string; overused?: string[]; /** Dossier de la documentaliste (references.ts), vide si rien à donner. */ references?: string; /** Les preuves réelles du dossier (preuves.ts) et les partitions permises pour ce client (partitions.ts), déjà mises en texte. */ preuves?: string; partitions?: string }): string {
  const req = requiredPages(o.site).map((r) => `${r.keys[0]} (${r.label})`).join(", ");
  const owned = platformOwnedPages(o.site).map((r) => r.label).join(", ");
  return [
    o.brief,
    o.consigne ? `DEMANDE DU CLIENT (prioritaire, ses mots) : « ${o.consigne} »` : "",
    `Site : ${o.site.business === "services" ? "entreprise de services" : `boutique de ${o.site.products} produit(s)`}${o.site.platform ? `, plateforme ${o.site.platform}` : ""}.`,
    o.ambiance ? `AMBIANCE VOULUE PAR LE CLIENT : ${AMBIANCE_LABEL[o.ambiance]}.` : "AMBIANCE : celle de la planche de marque et de la famille choisie.",
    o.products?.length ? `FICHES PRODUITS (vraies) :\n${o.products.join("\n")}` : "",
    `Ce que la marque a réellement : ${o.has.length ? o.has.join(" ; ") : "rien de plus que les faits ci-dessus"}.`,
    `Ce qu'elle n'a PAS (aucune section qui en dépend) : ${o.lacks.join(" ; ")}.`,
    o.preuves ?? "",
    `Pages obligatoires (clés) : ${req}.${owned ? ` Jamais de page : ${owned} (la plateforme les tient).` : ""}`,
    "",
    o.references ?? "",
    famillesBrief(),
    "",
    stylesBrief(o.site.business === "services" ? "services" : "products"),
    "",
    o.partitions ?? "",
    "",
    o.overused?.length ? `SECTIONS DÉJÀ PRISES DANS LES DERNIERS THÈMES DU STUDIO (pour d'autres marques) : ${o.overused.join(", ")}. Ne les reprends pas par habitude : seulement si, pour CE moment de CETTE marque, aucune autre section ne fait mieux (dis-le dans why).` : "",
    `BIBLIOTHÈQUE DE LA FAMILLE (dans un ordre propre à ce projet : l'ordre ne dit rien de la qualité ; identifiant · rôle · fond · densité · photos · titre : ce qu'elle fait) :`,
    designCatalogue(o.family, o.seed),
  ].filter((x) => x !== "").join("\n");
}

/** Points que le Studio vérifie lui-même sur une conception (en plus des règles du thème) : réponse à CHAQUE
 *  objection de la recherche dans une section réellement posée, et densités (deux sections denses jamais à la suite).
 *  Les fonds ne sont pas contrôlés : ils suivent l'ambiance voulue par le client (clair, sombre ou alterné). */
export function designGaps(d: Design, researchObjections: string[]): { blocking: string[]; rhythm: string[]; pages: string[] } {
  const placed = new Set(d.pages.flatMap((pg) => pg.sections.map((s) => `${pg.key}:${s.section}`)));
  const blocking: string[] = [];
  const norm = (x: string) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").trim();
  for (const o of researchObjections) {
    const words = norm(o).split(/\s+/).filter((w) => w.length > 4);
    const hit = d.objections.find((x) => { const n = norm(x.objection); return words.filter((w) => n.includes(w)).length >= Math.min(2, words.length); });
    if (!hit) blocking.push(`objection de la recherche sans réponse dans la conception : « ${o} »`);
    else if (!placed.has(`${hit.page}:${hit.section}`)) blocking.push(`l'objection « ${o} » doit trouver sa réponse dans « ${hit.section} » sur la page « ${hit.page} », qui n'y est pas`);
  }
  const tr = sectionTraits(), rhythm: string[] = [];
  for (const pg of d.pages) for (let i = 1; i < pg.sections.length; i++) {
    const a = tr[pg.sections[i - 1].section], b = tr[pg.sections[i].section];
    if (a && b && a.densite === "dense" && b.densite === "dense") rhythm.push(`deux sections denses à la suite sur « ${pg.label} » (${pg.sections[i - 1].section}, ${pg.sections[i].section})`);
  }
  return { blocking, rhythm, pages: pageOrderGaps(d) };
}

/**
 * Ordre des pages des boutiques, contrôlé sans IA : ce qui reste de l'étude de 65 thèmes ThemeForest (11 novembre 2026)
 * une fois aligné sur le cahier « ordre et variété » (16 novembre 2026). Les règles d'or elles-mêmes (offre et question
 * qui bloque en 3e, preuve avant la 5e, concret avant l'abstrait, dispositions, doutes, action, dix sections) sont dans
 * ordre.ts, pour les boutiques comme pour les services. Retiré d'ici parce que le cahier dit autrement : « deux sections
 * de la même famille à la suite » (remplacé par les dispositions : les prestations, la zone et le déroulé d'un service
 * sont de la même famille et se suivent), « une preuve jamais avant les produits », « les produits en 4e position »,
 * « une collection reste courte ». Seules les pages présentes sont contrôlées.
 */
export function pageOrderGaps(d: Pick<Design, "pages">): string[] {
  const out: string[] = [];
  const grp = (id: string) => { const l = libSection(id); return l ? sectionGroup(l) : null; };
  const cards = (id: string) => { const l = libSection(id); return !!l && isCardSection(l) && sectionGroup(l) === "produits"; };
  for (const pg of d.pages) {
    const ids = pg.sections.map((x) => x.section), n = ids.length, name = `« ${pg.label} »`;
    if (pg.key === "home") {
      if (n && grp(ids[0]) !== "ouverture") out.push(`${name} : la page s'ouvre par une ouverture en grande photo (ici ${ids[0]})`);
      if (n && cards(ids[n - 1])) out.push(`${name} : la page finit sur des produits ; elle finit par l'action (l'appel final, l'inscription)`);
      if (n > 13) out.push(`${name} : ${n} sections, la page se répète (${MIN_SECTIONS_IMPORTANTE} à 13)`);
    }
    if (/^product/.test(pg.key)) {
      if (n && libSection(ids[0])?.role !== FEATURED_ROLE) out.push(`${name} : la fiche commence par le bloc d'achat (une section « produit vedette »), ici ${ids[0]}`);
      const c = ids.findIndex(cards);
      if (c >= 0 && c < n - 1 && ids.slice(c + 1).some((x) => !["inscription", "questions"].includes(grp(x) ?? ""))) out.push(`${name} : les autres produits (${ids[c]}) viennent en dernier sur la fiche`);
    }
    if (/^shop/.test(pg.key) && n && grp(ids[0]) !== "categorie" && !cards(ids[0])) out.push(`${name} : les produits sont dans le premier écran (ici ${ids[0]}) ; jamais d'histoire au-dessus de la grille`);
  }
  return out;
}

/** Texte d'intention gardé dans la section (relu par le plan des textes et le rédacteur). */
export const intentText = (why: string, says: string, photos?: string) => `Pourquoi ici : ${why.trim()} Ce qu'elle dit : ${says.trim()}${photos && !/^aucune\.?$/i.test(photos.trim()) ? ` Photos : ${photos.trim()}` : ""}`;
