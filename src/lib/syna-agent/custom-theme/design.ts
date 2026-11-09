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
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { familySections, isCardSection, LIBRARY_DIR, onlyFor } from "./library";
import { requiredPages, platformOwnedPages, MIN_SECTIONS, type SiteKind } from "./theme";
import type { FamilyId } from "../section-families";

const SectionPick = z.object({ section: z.string().max(80), why: z.string().min(10).max(600), says: z.string().min(10).max(900), photos: z.string().max(600) });
export const DesignSchema = z.object({
  visitor: z.string().min(20).max(900),
  levers: z.array(z.string().min(3).max(240)).min(2).max(10),
  objections: z.array(z.object({ objection: z.string().min(3).max(300), answer: z.string().min(3).max(500), page: z.string().max(40), section: z.string().max(80) })).max(12),
  concept: z.string().min(20).max(800),
  header: z.string().max(80),
  footer: z.string().max(80),
  search: z.string().max(80).nullable(),
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

/** Plafond d'un appel de conception (entrée : toute la bibliothèque de la famille ; sortie : tout le site). */
export const DESIGN_CAP_MICRO = 500_000;
/** Conception + relecture (deux appels) ; une troisième seulement si le contrôle refuse quelque chose. */
export const DESIGN_CALLS_MAX = 3;
export const DESIGN_TYPICAL_MICRO = 360_000;

/** Exemple de niveau attendu (une autre marque, à ne jamais recopier). */
const EXAMPLE = `EXEMPLE DU NIVEAU ATTENDU (les « photos » de chaque section sont à écrire de la même façon : la scène précise) (une autre marque : des bougies coulées à la main, cible « personnes qui veulent une maison qui sent bon sans produits chimiques », objections « ça coûte cher pour une bougie », « elles fument et noircissent les murs », « l'odeur ne tient pas »). Fiche produit :
- produit-vedette · why : le visiteur arrive d'une publicité ; il veut voir la bougie, son prix et l'acheter sans chercher · says : « Figuier & bois blond », 32 €, 50 heures de combustion, cire de colza ; la promesse en une phrase (« La maison qui sent l'été dans un jardin, même en janvier ») ; bouton d'achat.
- fiche-produit-a-onglets · why : juste après le prix, il veut comprendre ce qu'il achète ; la description racontée le fait entrer dans l'odeur · says : description en scène (le premier soir où on l'allume), composition exacte, conseils de première combustion.
- comparatif-nous-les-autres · why : objection « ça coûte cher » : il compare avec la bougie de supermarché · says : cire de colza contre paraffine, mèche en coton contre mèche métallique, 50 h contre 20 h, prix à l'heure de combustion · photos : aucune.
- avant-apres · why : objection « elles fument » : on le montre au lieu de le promettre · says : le pot après 10 h, verre propre, contre une bougie de paraffine au verre noirci.
- photo-a-points-cliquables · why : après les preuves, l'émotion revient : il se projette chez lui · says : un salon le soir, la bougie allumée, les points sur la bougie, le plaid, le livre.
- points-forts-du-produit · why : objection « l'odeur ne tient pas » et récapitulatif avant la décision · says : parfum dosé à 10 %, diffusion à froid et à chaud, fabriquée à Lyon, recyclable.
- questions-sur-le-produit · why : derniers doutes juste avant l'achat · says : 5 questions vraies (première combustion, durée, entretien de la mèche, livraison, retours).
- badges-de-confiance · why : inverser le risque au moment de payer · says : retours 30 jours, livraison 48 h, paiement sécurisé.
- complete-ta-commande · why : il est décidé ; on propose ce qui va avec · says : le coupe-mèche et la recharge, cochés ou non.
- bouton-d-achat-toujours-visible · why : la page est longue ; sur téléphone, l'achat reste à portée de pouce · says : nom, prix, « Ajouter ».
EXEMPLE POUR UN SITE DE SERVICES (un électricien, cible « propriétaires qui rénovent », objections « il ne viendra pas pour un petit chantier », « le devis va exploser ») : accueil = ouverture avec la promesse et le délai réel d'intervention → prestations en cartes → déroulé d'une intervention (pour l'objection « je ne sais pas comment ça se passe ») → estimation de devis (pour « le devis va exploser ») → réalisations réelles (seulement si le client en a) → zone d'intervention → garanties et assurances réelles → « on vous rappelle ».`;

export const DESIGN_SYSTEM = `Tu es le directeur de création d'une agence qui conçoit des sites de vente haut de gamme. Tu CONÇOIS le site d'une marque avec une bibliothèque de sections (la liste complète, avec les caractéristiques de chaque section, t'est donnée), en français.
MÉTHODE, dans cet ordre :
A. STRATÉGIE (avant tout choix de section) :
 - visitor : le visiteur réel de CETTE marque : qui il est (la cible de l'angle), ce qu'il a déjà essayé, ce qui le déçoit, ce qu'il ressent en arrivant, ce qui le fera acheter (motivation, émotion de l'angle).
 - objections : TOUTES les objections de la recherche (et celles, évidentes, du métier), chacune avec sa réponse VRAIE (faits de la marque) et la section précise (page, identifiant) où elle trouve sa réponse : comparatif, avant / après, preuve, démonstration, question, garantie.
 - levers : les leviers qui décident CE visiteur (ex. la promesse visible dès l'arrivée, l'émotion du moment de consommation, la transparence de la recette, l'inversion du risque par les retours, la preuve par le savoir-faire quand il n'y a pas d'avis, le prix rapporté à l'usage, le cadeau…).
B. PARCOURS de chaque page (journey) : la suite des questions et des émotions du visiteur, du premier regard à l'action. Une page de vente alterne : promesse → compréhension → émotion → preuve / objection levée → émotion → décision.
C. SECTIONS : pour CHAQUE moment du parcours, LA section de la bibliothèque qui y répond le mieux ; why = le moment, la question ou l'objection du visiteur, et pourquoi cette section plutôt qu'une autre ; says = ce qu'elle dira concrètement avec les vrais faits, sans en inventer aucun (le message, les éléments précis : questions, lignes de comparatif, étapes, avant et après, et pour chaque bouton son intention et la page où il mène) ; photos = les scènes à photographier pour cette section (lieu, moment, lumière, ce qu'on voit, le vrai produit quand il apparaît), ou « aucune ». Les photos du site forment une histoire visuelle : les scènes « à montrer » de l'angle, jamais deux fois la même scène, le texte posé sur la partie calme de chaque photo.
D. RYTHME : l'AMBIANCE voulue par le client (claire, sombre ou alternée, donnée plus bas) décide des fonds : site clair = surtout des sections à fond clair, une bande sombre ou de couleur pour les moments forts ; site sombre = surtout des sections à fond sombre, une section claire seulement pour respirer ; alterné = les fonds changent d'une section à l'autre. Dans tous les cas, varie les densités (une section dense est suivie d'une section qui respire) et les dispositions, avec un moment fort d'émotion toutes les deux ou trois sections ; sur une longue page, une raison et un moyen d'agir reviennent régulièrement (bouton vers l'achat, barre d'achat collée sur téléphone si la bibliothèque l'a), et la page finit par un appel à agir.
E. COHÉRENCE DU SITE : l'accueil donne envie et oriente, la fiche produit décide, « à propos » fait confiance à la personne et au savoir-faire, l'aide rassure ; un même fait ou une même scène ne se répète pas d'une page à l'autre, chaque page apporte du neuf.
EXIGENCES :
- Des pages RICHES : une vraie page de vente utilise beaucoup de sections, autant que le parcours en demande, jamais le minimum. L'accueil et la fiche produit sont les plus riches (plancher : accueil ${MIN_SECTIONS.home}, fiche produit ${MIN_SECTIONS.product} ; une bonne fiche produit en a souvent 9 à 12). Les pages pratiques (panier, compte, aide, légal, 404) restent simples et claires.
- La description racontée vient tout de suite après le bloc d'achat sur la fiche produit, jamais en bas.
- Jamais une section pour remplir, jamais une section dont CE visiteur n'a pas besoin, jamais une section qui demande un contenu que la marque n'a pas (avis, note, presse, photos de clients, vidéo, offres, abonnement, dates : la liste de ce qu'elle a et n'a pas t'est donnée ; sans avis, la preuve vient du savoir-faire, de la transparence et des garanties). Une section « seulement pour » un genre de produit ne va jamais ailleurs.
- Une seule section de cartes (produits ou familles) par page. « Produit vedette » ouvre la fiche produit (une seule) ou apparaît au plus une fois sur l'accueil ; les offres (lots, quantités, coffret) sont des fonctions de ce bloc, jamais une section à part. Jamais la même section deux fois dans le site (une section = une page). Jamais deux sections de même rôle à la suite. L'accueil s'ouvre par une grande photo avec le titre dessus.
- Toutes les pages obligatoires, avec leurs clés exactes ; aucune page de paiement que la plateforme tient elle-même.
- Utilise UNIQUEMENT les identifiants de la liste (champ « section »). corrections : [] au premier passage.
${EXAMPLE}
Réponse : uniquement le JSON demandé.`;

export const DESIGN_REVIEW_SYSTEM = `Tu es le directeur commercial de l'agence, exigeant et sans complaisance. Tu relis la conception d'un site (stratégie, parcours, sections) écrite par le directeur de création, avec les mêmes informations que lui et la même bibliothèque.
Cherche, page par page : où le visiteur décroche ; chaque objection sans réponse convaincante ; chaque section décorative, faible, mal placée ou sans contenu réel ; la description qui n'arrive pas juste après l'achat ; le rythme cassé (deux fonds sombres ou deux sections denses à la suite, pas d'émotion pendant trop longtemps) ; une page trop courte pour ce qu'elle doit vendre ; l'absence d'appel à agir ; un bouton sans page de destination logique ; un fait annoncé qui n'est pas dans les faits de la marque ; un texte prévu (says) creux, vague ou qui décrit au lieu de faire ressentir.
Puis rends la conception CORRIGÉE et complète (même format, toutes les pages), en gardant ce qui est bon, et liste dans corrections ce que tu as changé et pourquoi (une ligne par changement).
Mêmes exigences que le concepteur (pages riches, aucune section sans contenu réel, une section de cartes par page, « Produit vedette » en haut de la fiche, jamais la même section deux fois, jamais deux sections de même rôle à la suite, pages obligatoires, identifiants de la liste uniquement).
Réponse : uniquement le JSON demandé.`;

/** Caractéristiques mesurées des sections (scripts/section-traits.cjs). */
type Trait = { fond: "clair" | "sombre" | "couleur" | "photo"; densite: "dense" | "moyenne" | "aérée"; photos: number; hauteur: number };
let traitsCache: Record<string, Trait | null> | null = null;
export function sectionTraits(): Record<string, Trait | null> {
  if (!traitsCache) { try { traitsCache = JSON.parse(fs.readFileSync(path.join(LIBRARY_DIR(), "section-traits.json"), "utf8")); } catch { traitsCache = {}; } }
  return traitsCache!;
}

/** Catalogue de la famille donné au concepteur : identifiant, rôle, caractéristiques, titre, ce qu'elle fait. */
export function designCatalogue(family: FamilyId): string {
  const tr = sectionTraits();
  return familySections(family).map((s) => {
    const t = tr[s.id];
    const traits = t ? ` · fond ${t.fond} · ${t.densite} · ${t.photos} photo(s)` : "";
    return `- ${s.id} · ${s.role}${isCardSection(s) ? " · cartes" : ""}${onlyFor(s.tags) ? ` · seulement pour ${onlyFor(s.tags)}` : ""}${traits} · ${s.title} : ${s.does.slice(0, 260)}`;
  }).join("\n");
}

export type Ambiance = "clair" | "sombre" | "alterne";
export const AMBIANCE_LABEL: Record<Ambiance, string> = { clair: "site clair (fonds clairs, quelques bandes sombres ou de couleur pour les moments forts)", sombre: "site sombre (fonds sombres, quelques sections claires pour respirer)", alterne: "fonds qui alternent d'une section à l'autre" };

export function designPrompt(o: { brief: string; family: FamilyId; site: SiteKind; has: string[]; lacks: string[]; consigne?: string | null; ambiance?: Ambiance | null; products?: string[] }): string {
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
    `BIBLIOTHÈQUE DE LA FAMILLE (identifiant · rôle · fond · densité · photos · titre : ce qu'elle fait) :`,
    designCatalogue(o.family),
  ].filter((x) => x !== "").join("\n");
}

/** Points que le Studio vérifie lui-même sur une conception (en plus des règles du thème) : réponse à CHAQUE
 *  objection de la recherche dans une section réellement posée, et densités (deux sections denses jamais à la suite).
 *  Les fonds ne sont pas contrôlés : ils suivent l'ambiance voulue par le client (clair, sombre ou alterné). */
export function designGaps(d: Design, researchObjections: string[]): { blocking: string[]; rhythm: string[] } {
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
  return { blocking, rhythm };
}

/** Texte d'intention gardé dans la section (relu par le plan des textes et le rédacteur). */
export const intentText = (why: string, says: string, photos?: string) => `Pourquoi ici : ${why.trim()} Ce qu'elle dit : ${says.trim()}${photos && !/^aucune\.?$/i.test(photos.trim()) ? ` Photos : ${photos.trim()}` : ""}`;
