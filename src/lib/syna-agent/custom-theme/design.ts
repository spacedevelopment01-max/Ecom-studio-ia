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
import { z } from "zod";
import { FEATURED_ROLE, familySections, isCardSection, libSection, onlyFor, sectionTraits } from "./library";
import { TENUE_CHOICES, TenuePickSchema, constructionsOf, isTenueSection, tenueSection } from "./tenue";
import { sectionGroup } from "./section-groups";
import { requiredPages, platformOwnedPages, MIN_SECTIONS, type SiteKind } from "./theme";
import type { FamilyId } from "../section-families";

/** construction : pour une section à tenue seulement (une des constructions données dans la bibliothèque). */
const SectionPick = z.object({ section: z.string().max(80), construction: z.string().max(40).nullable().optional(), why: z.string().min(10).max(600), says: z.string().min(10).max(900), photos: z.string().max(600) });
export const DesignSchema = z.object({
  visitor: z.string().min(20).max(900),
  levers: z.array(z.string().min(3).max(240)).min(2).max(10),
  objections: z.array(z.object({ objection: z.string().min(3).max(300), answer: z.string().min(3).max(500), page: z.string().max(40), section: z.string().max(80) })).max(12),
  concept: z.string().min(20).max(800),
  header: z.string().max(80),
  /** Construction de l'en-tête, s'il est à tenue. */
  headerConstruction: z.string().max(40).nullable().optional(),
  footer: z.string().max(80),
  search: z.string().max(80).nullable(),
  /** La tenue de la marque (sections à tenue) : titres, boutons, cadre des photos, fond, petits textes, signe. */
  tenue: TenuePickSchema.nullable().optional(),
  pages: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/),
    label: z.string().min(1).max(40),
    journey: z.string().min(20).max(1200),
    sections: z.array(SectionPick).min(1).max(18),
  })).min(1).max(16),
  /** Relecture : ce que le directeur commercial a corrigé (vide au premier passage). */
  corrections: z.array(z.string().max(400)).max(20),
});
export type Design = z.infer<typeof DesignSchema>;

/**
 * Plafond d'un appel de conception (entrée : toute la bibliothèque de la famille ; sortie : tout le site). Essai réel du
 * 10 novembre 2026 (Éclat de thé) : la réflexion du modèle compte dans la sortie ; à 14 000 jetons, la réponse d'un site
 * complet a été coupée (0,34 € payés pour rien). Sortie portée à 32 000 jetons, plafond et coût probable relevés.
 */
export const DESIGN_OUTPUT_TOKENS = 32_000;
export const DESIGN_CAP_MICRO = 1_000_000;
/** Conception + relecture (deux appels) ; une troisième seulement si le contrôle refuse quelque chose. */
export const DESIGN_CALLS_MAX = 3;
export const DESIGN_TYPICAL_MICRO = 800_000;

/**
 * Exemple de niveau attendu (une autre marque, à ne jamais recopier). Refait le 11 novembre 2026 avec les seules sections
 * actuelles de la banque : l'ancien citait des sections retirées et posait deux fois la même section dans une page,
 * et SINA recopiait ce niveau-là.
 */
const EXAMPLE = `EXEMPLE DU NIVEAU ATTENDU (une autre marque, à ne jamais recopier : des bougies coulées à la main, cible « personnes qui veulent une maison qui sent bon sans produits chimiques », objections « ça coûte cher pour une bougie », « elles fument et noircissent les murs », « l'odeur ne tient pas » ; pas d'avis clients).
ACCUEIL (10 moments) :
1. ouverture en grande photo · why : il arrive d'une publicité ; il doit ressentir le soir chez lui avant de lire quoi que ce soit · says : « La maison qui sent l'été dans un jardin, même en janvier », bouton « Allumer l'été » vers la boutique · photos : un salon au crépuscule, la bougie allumée au premier plan à droite, la partie gauche calme pour le titre.
2. orientation · why : juste sous l'ouverture, on l'oriente (16 thèmes vendus sur 27 le font) : il choisit son univers · says : « Les bougies du soir », « Les parfums d'été », « Les coffrets à offrir ».
3. produits · why : il veut voir les bougies tout de suite (dans les thèmes vendus, les produits arrivent en 2e à 4e position) ; SEULE section de cartes de la page · says : les parfums avec leur prix.
4. fabrication racontée · why : après le choix, il veut comprendre ce qu'il achète · says : de la cire de colza à la flamme, en trois phrases vraies.
5. respiration en grande image · why : entre deux moments d'information, il se projette chez lui · says : « Le soir où la maison ralentit ».
6. objection levée · why : « ça coûte cher » et « elles fument », au moment où il hésite · says : cire de colza contre paraffine, mèche en coton contre métal, 50 h contre 20 h.
7. voix de la marque · why : après les faits, l'émotion revient par la fondatrice · says : sa phrase vraie sur pourquoi elle coule ses bougies elle-même.
8. confiance · why : sans avis clients, elle vient des garanties et du savoir-faire, en fin de page · says : fabriquée à Lyon, retours 30 jours, livraison 48 h.
9. raison de revenir · why : il n'est pas prêt à acheter · says : deux articles utiles.
10. appel final · why : la page finit par un appel à agir, jamais par des produits · says : la lettre des nouveaux parfums.
FICHE PRODUIT (8 moments) : bloc d'achat (produit vedette) → description racontée en onglets ou accordéon → points forts (objection « l'odeur ne tient pas ») → première combustion en étapes → grande image d'émotion → garanties → vraies questions → les autres produits (seule section de cartes).
COLLECTION : la grille et ses filtres, au plus une section courte. PANIER : le panier et la livraison offerte. À PROPOS : la personne, son histoire, les chiffres vrais, des images.
L'EXEMPLE MONTRE UNE LOGIQUE, PAS DES SECTIONS : il ne donne volontairement aucun identifiant. Pour CHAQUE moment, compare TOUTES les sections de la bibliothèque qui peuvent le servir (même rôle, ou autre rôle qui fait le même travail) et prends celle qui sert le mieux CETTE marque (son produit, son émotion, ses photos, son ambiance) ; dis dans why pourquoi celle-là plutôt que ses voisines. Deux marques différentes n'ont presque jamais les mêmes sections : une conception qui reprend les sections des derniers thèmes du Studio par habitude est refusée.
POUR UN SITE DE SERVICES (un électricien, cible « propriétaires qui rénovent », objections « il ne viendra pas pour un petit chantier », « le devis va exploser ») : accueil = ouverture avec la promesse et le délai réel d'intervention → prestations en cartes → déroulé d'une intervention → estimation de devis → réalisations réelles (seulement si le client en a) → zone d'intervention → garanties et assurances réelles → « on vous rappelle ».`;

/**
 * Ordre des pages appris de 65 thèmes Shopify vendus sur ThemeForest (étude du 11 novembre 2026, demandée par le
 * propriétaire : « prends exemple des thèmes Shopify qu'il y a sur ThemeForest », docs/etude-themes-themeforest.md).
 * Ce sont des constats chiffrés, pas des goûts : la consigne dit le pourquoi, le Studio contrôle le reste (designGaps).
 */
export const PAGE_PATTERNS = `F. CE QUE FONT LES THÈMES QUI SE VENDENT (65 thèmes Shopify étudiés page par page) : suis cet ordre, adapte-le à la marque, ne le casse que pour une vraie raison écrite dans why.
ACCUEIL (9 à 12 sections ; en dessous de 8 la page est pauvre, au-dessus de 13 elle se répète) :
 1. ouverture : TOUJOURS en premier, grande photo (ou diaporama) pleine largeur, un seul bouton qui donne envie.
 2. orienter tout de suite (2e ou 3e position) : bande de réassurance courte, bandeau défilant, ou familles / gammes.
 3. les produits arrivent TÔT : la section de cartes de produits en 2e, 3e ou 4e position, jamais plus bas.
 4. le milieu ALTERNE « information / image » : histoire ou fabrication, puis une grande photo pleine largeur (respiration, scène achetable), puis une explication, jamais deux sections de même rôle ni de même disposition à la suite ; une bande sombre ou sur photo au milieu de la page pour le moment fort (rituel, culture, savoir-faire).
 5. les preuves (avis, chiffres, presse, engagements, comparatif) viennent APRÈS les produits, dans le dernier tiers ; jamais une preuve avant la section de produits.
 6. la fin : le journal ou une raison de revenir, puis l'inscription ou les garanties ; la page ne finit JAMAIS sur des produits.
FICHE PRODUIT (7 à 10 sections) : 1. le bloc d'achat (produit vedette), toujours en premier ; 2. la description racontée en onglets ou accordéon, juste après ; 3. ce qui raconte et rassure le produit (préparation ou mode d'emploi en étapes, ingrédients et origine, points forts, une grande photo d'émotion, avis s'il y en a, questions) ; 4. les autres produits en DERNIER (la seule section de cartes de la page).
COLLECTION (2 à 4 sections) : la grille avec ses filtres d'abord ; au plus une section courte après ; jamais d'histoire ni de long texte au-dessus de la grille.
PANIER (1 à 3 sections) : le panier, la barre de livraison offerte ; jamais d'avis, de promotion ni d'histoire.
À PROPOS (4 à 6) : l'histoire et la personne d'abord, puis image et texte en alternance, les valeurs ou engagements, les chiffres vrais ; CONTACT (1 à 3) : formulaire et coordonnées, une aide courte.
RYTHME : fonds clairs pour les produits ; une ou deux bandes de couleur pâle et UNE bande sombre ou sur photo par page ; l'ouverture et les grandes photos en pleine largeur, les produits cadrés.
CE QUE LES BONS THÈMES NE FONT JAMAIS : un minuteur ou une « offre du jour » sur une marque soignée, une fenêtre d'inscription à l'arrivée, des compteurs de visiteurs, deux fois la même section, deux sections de cartes à la suite, une section « espace » pour aérer.
THÉ, INFUSIONS, CAFÉ : sous le bloc d'achat, la préparation (quantité, température, temps) ; les familles expliquées une par une ; le rituel ou la culture sur fond sombre ; jamais de minuteur. MONO-PRODUIT : le produit en ouverture, puis il est expliqué (points forts, détails, vidéo, résultats) avant tout catalogue, les questions tôt.`;

/**
 * Sections à tenue (13 novembre 2026, retour du propriétaire : « juste changer les images et les textes ferais déjà des
 * thèmes trop basique ») : le concepteur choisit la section, SA CONSTRUCTION et la tenue de la marque ; il n'écrit pas
 * de code, le Studio fabrique.
 */
export const TENUE_RULES = `SECTIONS « À TENUE » (marquées dans la liste) : elles n'ont pas d'allure à elles, elles prennent celle de la marque. Préfère-les : avec elles, deux marques n'ont jamais le même site. Un site monté avec des sections à tenue l'est EN ENTIER (en-tête, toutes les pages, pied de page) : ne mélange pas, dans un même site, des sections à tenue et des sections qui ont déjà leur allure.
- Pour chaque section à tenue qui en a, choisis sa CONSTRUCTION (champ « construction », une des clés données) d'après la photo prévue et le tempérament de la marque ; dis pourquoi dans why. Deux concepts montrés au client n'ont pas la même construction d'ouverture ni le même en-tête (champ « headerConstruction »).
- Une section à tenue peut servir sur plusieurs pages : elle y aura d'autres textes et d'autres photos.
- TENUE (champ « tenue », une seule pour tout le site, tirée de la planche de marque et du produit) : ${TENUE_CHOICES}
- Le SIGNE : un détail vrai du produit ou du métier (une forme, une matière, une couture) que la tenue reprend à plusieurs endroits ; jamais un décor plaqué.`;

export const DESIGN_SYSTEM = `Tu es le directeur de création d'une agence qui conçoit des sites de vente haut de gamme. Tu CONÇOIS le site d'une marque avec une bibliothèque de sections (la liste complète, avec les caractéristiques de chaque section, t'est donnée), en français.
MÉTHODE, dans cet ordre :
A. STRATÉGIE (avant tout choix de section) :
 - visitor : le visiteur réel de CETTE marque : qui il est (la cible de l'angle), ce qu'il a déjà essayé, ce qui le déçoit, ce qu'il ressent en arrivant, ce qui le fera acheter (motivation, émotion de l'angle).
 - objections : TOUTES les objections de la recherche (et celles, évidentes, du métier), chacune avec sa réponse VRAIE (faits de la marque) et la section précise (page, identifiant) où elle trouve sa réponse : comparatif, avant / après, preuve, démonstration, question, garantie.
 - levers : les leviers qui décident CE visiteur (ex. la promesse visible dès l'arrivée, l'émotion du moment de consommation, la transparence de la recette, l'inversion du risque par les retours, la preuve par le savoir-faire quand il n'y a pas d'avis, le prix rapporté à l'usage, le cadeau…).
B. PARCOURS de chaque page (journey) : la suite des questions et des émotions du visiteur, du premier regard à l'action. Une page de vente alterne : promesse → compréhension → émotion → preuve / objection levée → émotion → décision.
C. SECTIONS : pour CHAQUE moment du parcours, LA section de la bibliothèque qui y répond le mieux ; why = le moment, la question ou l'objection du visiteur, et pourquoi cette section plutôt qu'une autre ; says = ce qu'elle dira concrètement avec les vrais faits, sans en inventer aucun (le message, les éléments précis : questions, lignes de comparatif, étapes, avant et après, et pour chaque bouton son intention et la page où il mène) ; photos = les scènes à photographier pour cette section (lieu, moment, lumière, ce qu'on voit, le vrai produit quand il apparaît), ou « aucune ». Les photos du site forment une histoire visuelle : les scènes « à montrer » de l'angle, jamais deux fois la même scène, le texte posé sur la partie calme de chaque photo.
D. RYTHME : chaque section garde son fond d'origine (dans la liste) : choisis des sections dont le fond convient à l'ambiance ; une section à fond « photo » (la photo fait le fond) va avec les deux ambiances. L'AMBIANCE voulue par le client (claire, sombre ou alternée, donnée plus bas) décide des fonds : site clair = surtout des sections à fond clair, une bande sombre ou de couleur pour les moments forts ; site sombre = surtout des sections à fond sombre, une section claire seulement pour respirer ; alterné = les fonds changent d'une section à l'autre. Dans tous les cas, varie les densités (une section dense est suivie d'une section qui respire) et les dispositions, avec un moment fort d'émotion toutes les deux ou trois sections ; sur une longue page, une raison et un moyen d'agir reviennent régulièrement (bouton vers l'achat, barre d'achat collée sur téléphone si la bibliothèque l'a), et la page finit par un appel à agir.
E. COHÉRENCE DU SITE : l'accueil donne envie et oriente, la fiche produit décide, « à propos » fait confiance à la personne et au savoir-faire, l'aide rassure ; un même fait ou une même scène ne se répète pas d'une page à l'autre, chaque page apporte du neuf.
${PAGE_PATTERNS}
EXIGENCES :
- Des pages RICHES : une vraie page de vente utilise beaucoup de sections, autant que le parcours en demande, jamais le minimum. L'accueil et la fiche produit sont les plus riches (plancher : accueil ${MIN_SECTIONS.home}, fiche produit ${MIN_SECTIONS.product} ; une bonne fiche produit en a souvent 9 à 12). Les pages pratiques (panier, compte, aide, légal, 404) restent simples et claires.
- La description racontée vient tout de suite après le bloc d'achat sur la fiche produit, jamais en bas.
- Jamais une section pour remplir, jamais une section dont CE visiteur n'a pas besoin, jamais une section qui demande un contenu que la marque n'a pas (avis, note, presse, photos de clients, vidéo, offres, abonnement, dates : la liste de ce qu'elle a et n'a pas t'est donnée ; sans avis, la preuve vient du savoir-faire, de la transparence et des garanties). Une section « seulement pour » un genre de produit ne va jamais ailleurs.
- Une seule section de cartes (produits ou familles) par page. « Produit vedette » ouvre la fiche produit (une seule) ou apparaît au plus une fois sur l'accueil ; les offres (lots, quantités, coffret) sont des fonctions de ce bloc, jamais une section à part. Jamais la même section deux fois dans le site (une section = une page). Jamais deux sections de même rôle à la suite. L'accueil s'ouvre par une grande photo avec le titre dessus.
- Toutes les pages obligatoires, avec leurs clés exactes ; aucune page de paiement que la plateforme tient elle-même.
- Utilise UNIQUEMENT les identifiants de la liste (champ « section »). corrections : [] au premier passage.
${TENUE_RULES}
${EXAMPLE}
Réponse : uniquement le JSON demandé.`;

export const DESIGN_REVIEW_SYSTEM = `Tu es le directeur commercial de l'agence, exigeant et sans complaisance. Tu relis la conception d'un site (stratégie, parcours, sections) écrite par le directeur de création, avec les mêmes informations que lui et la même bibliothèque.
Cherche, page par page : où le visiteur décroche ; chaque objection sans réponse convaincante ; chaque section décorative, faible, mal placée ou sans contenu réel ; la description qui n'arrive pas juste après l'achat ; le rythme cassé (deux fonds sombres ou deux sections denses à la suite, pas d'émotion pendant trop longtemps) ; une page trop courte pour ce qu'elle doit vendre ; l'absence d'appel à agir ; un bouton sans page de destination logique ; un fait annoncé qui n'est pas dans les faits de la marque ; un texte prévu (says) creux, vague ou qui décrit au lieu de faire ressentir.
Puis rends la conception CORRIGÉE et complète (même format, toutes les pages), en gardant ce qui est bon, et liste dans corrections ce que tu as changé et pourquoi (une ligne par changement).
Vérifie aussi l'ordre des pages des thèmes qui se vendent (ci-dessous) : produits tôt sur l'accueil, preuves après les produits, fin jamais sur des produits, fiche qui commence par l'achat et finit par les autres produits, collection et panier courts.
${PAGE_PATTERNS}
Mêmes exigences que le concepteur (pages riches, aucune section sans contenu réel, une section de cartes par page, « Produit vedette » en haut de la fiche, jamais la même section deux fois, jamais deux sections de même rôle à la suite, pages obligatoires, identifiants de la liste uniquement).
Réponse : uniquement le JSON demandé.`;

/** Catalogue de la famille donné au concepteur : identifiant, rôle, caractéristiques, titre, ce qu'elle fait. */
export function designCatalogue(family: FamilyId, seed?: string): string {
  const tr = sectionTraits();
  return shuffled(familySections(family), seed).map((s) => {
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

export function designPrompt(o: { brief: string; family: FamilyId; site: SiteKind; has: string[]; lacks: string[]; consigne?: string | null; ambiance?: Ambiance | null; products?: string[]; seed?: string; overused?: string[]; /** Dossier de la documentaliste (references.ts), vide si rien à donner. */ references?: string }): string {
  const req = requiredPages(o.site).map((r) => `${r.keys[0]} (${r.label})`).join(", ");
  const owned = platformOwnedPages(o.site).map((r) => r.label).join(", ");
  return [
    o.brief,
    o.consigne ? `DEMANDE DU CLIENT (prioritaire, ses mots) : « ${o.consigne} »` : "",
    `Site : ${o.site.business === "services" ? "entreprise de services" : `boutique de ${o.site.products} produit(s)`}${o.site.platform ? `, plateforme ${o.site.platform}` : ""}.`,
    o.ambiance ? `AMBIANCE VOULUE PAR LE CLIENT : ${AMBIANCE_LABEL[o.ambiance]}.` : "AMBIANCE : non précisée par le client ; suis la personnalité de la marque.",
    o.products?.length ? `FICHES PRODUITS (vraies) :\n${o.products.join("\n")}` : "",
    `Ce que la marque a réellement : ${o.has.length ? o.has.join(" ; ") : "rien de plus que les faits ci-dessus"}.`,
    `Ce qu'elle n'a PAS (aucune section qui en dépend) : ${o.lacks.join(" ; ")}.`,
    `Pages obligatoires (clés) : ${req}.${owned ? ` Jamais de page : ${owned} (la plateforme les tient).` : ""}`,
    "",
    o.references ?? "",
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
 * Ordre des pages des thèmes qui se vendent (étude de 65 thèmes ThemeForest, 11 novembre 2026), contrôlé sans IA : ce
 * qui est refusé revient une fois au concepteur avec la raison. Seules les pages présentes sont contrôlées (un concept
 * n'a que l'accueil et la fiche).
 */
export function pageOrderGaps(d: Pick<Design, "pages">): string[] {
  const out: string[] = [];
  const grp = (id: string) => { const l = libSection(id); return l ? sectionGroup(l) : null; };
  const cards = (id: string) => { const l = libSection(id); return !!l && isCardSection(l) && sectionGroup(l) === "produits"; };
  for (const pg of d.pages) {
    const ids = pg.sections.map((x) => x.section), n = ids.length, name = `« ${pg.label} »`;
    const practical = /^(aide|compte|legal|contact|404|cart)$/.test(pg.key);
    for (let i = 1; i < n; i++) if (!practical && grp(ids[i]) && grp(ids[i]) === grp(ids[i - 1])) out.push(`${name} : deux sections de la même famille à la suite (${ids[i - 1]}, ${ids[i]}) ; les thèmes qui se vendent alternent information et image`);
    if (pg.key === "home") {
      if (n && grp(ids[0]) !== "ouverture") out.push(`${name} : la page s'ouvre par une ouverture en grande photo (ici ${ids[0]})`);
      const p0 = ids.findIndex(cards);
      if (p0 < 0 && d.pages.some((x) => /^product/.test(x.key))) out.push(`${name} : l'accueil ne montre aucun produit ; dans les thèmes qui se vendent, une section de produits arrive en 2e, 3e ou 4e position`);
      if (p0 > 3) out.push(`${name} : les produits arrivent trop tard (${p0 + 1}e section) ; dans les thèmes qui se vendent, ils sont en 2e, 3e ou 4e position`);
      const proof = ids.findIndex((x) => grp(x) === "preuves");
      if (proof >= 0 && p0 >= 0 && proof < p0) out.push(`${name} : une preuve (${ids[proof]}) passe avant les produits ; les preuves viennent après, dans le dernier tiers`);
      if (n && cards(ids[n - 1])) out.push(`${name} : la page finit sur des produits ; elle finit par le journal, l'inscription ou les garanties`);
      if (n > 13) out.push(`${name} : ${n} sections, la page se répète (9 à 12 dans les thèmes qui se vendent)`);
    }
    if (/^product/.test(pg.key)) {
      if (n && libSection(ids[0])?.role !== FEATURED_ROLE) out.push(`${name} : la fiche commence par le bloc d'achat (une section « produit vedette »), ici ${ids[0]}`);
      const c = ids.findIndex(cards);
      if (c >= 0 && c < n - 1 && ids.slice(c + 1).some((x) => !["inscription", "questions"].includes(grp(x) ?? ""))) out.push(`${name} : les autres produits (${ids[c]}) viennent en dernier sur la fiche`);
    }
    if (pg.key === "shop" && n > 4) out.push(`${name} : ${n} sections ; une collection reste courte (la grille et ses filtres, au plus une section après)`);
    if (pg.key === "shop" && n && grp(ids[0]) !== "categorie" && !cards(ids[0])) out.push(`${name} : la grille avec ses filtres vient d'abord (ici ${ids[0]}) ; jamais d'histoire au-dessus de la grille`);
    if (pg.key === "cart" && n > 3) out.push(`${name} : ${n} sections ; le panier reste court (le panier, la livraison offerte)`);
  }
  return out;
}

/** Texte d'intention gardé dans la section (relu par le plan des textes et le rédacteur). */
export const intentText = (why: string, says: string, photos?: string) => `Pourquoi ici : ${why.trim()} Ce qu'elle dit : ${says.trim()}${photos && !/^aucune\.?$/i.test(photos.trim()) ? ` Photos : ${photos.trim()}` : ""}`;
