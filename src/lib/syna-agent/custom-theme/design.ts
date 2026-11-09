/**
 * Conception du thème sur mesure (retour du propriétaire du 9 novembre 2026 sur l'essai Heure Dorée : « il y a plus de
 * 200 sections et elle fait la flemmarde à prendre des sections sans logique et en prendre le moins possible » ; « ce
 * n'est pas à noter dans les règles simplement, ça dépend de quoi est le projet du client, c'est là où il doit y avoir
 * une logique de conception »).
 *
 * Un appel au modèle des textes du site, comme un directeur de création : il lit le projet (marque, angle et son
 * émotion, cible, motivation, objections de la recherche et leurs réponses, produits, faits, preuves réellement
 * disponibles) et TOUTE la bibliothèque de la famille choisie, puis conçoit chaque page comme un parcours : qui arrive,
 * ce qu'il se demande à chaque instant, et la section qui y répond, avec ce qu'elle dira. Les règles du propriétaire
 * restent contrôlées sans IA (`checkCustomTheme`) ; la conception est gardée dans le thème (`intent` de chaque section,
 * `journey` de chaque page, `concept`) et sert ensuite au plan des textes et au rédacteur.
 */
import { z } from "zod";
import { familySections, isCardSection, onlyFor } from "./library";
import { requiredPages, platformOwnedPages, MIN_SECTIONS, type SiteKind } from "./theme";
import type { FamilyId } from "../section-families";

export const DesignSchema = z.object({
  concept: z.string().min(20).max(800),
  header: z.string().max(80),
  footer: z.string().max(80),
  search: z.string().max(80).nullable(),
  pages: z.array(z.object({
    key: z.string().regex(/^[a-z0-9-]{1,40}$/),
    label: z.string().min(1).max(40),
    journey: z.string().min(20).max(1000),
    sections: z.array(z.object({ section: z.string().max(80), why: z.string().min(10).max(600), says: z.string().min(10).max(900) })).min(1).max(18),
  })).min(1).max(16),
});
export type Design = z.infer<typeof DesignSchema>;

/** Plafond d'un appel de conception (entrée : toute la bibliothèque de la famille ; sortie : tout le site). */
export const DESIGN_CAP_MICRO = 450_000;
export const DESIGN_TYPICAL_MICRO = 180_000;

export const DESIGN_SYSTEM = `Tu es le directeur de création d'une agence qui conçoit des sites de vente haut de gamme. Tu CONÇOIS le site d'une marque avec une bibliothèque de sections (la liste complète t'est donnée), en français.
Ta méthode, page par page :
1. Pars du visiteur réel de CETTE marque : qui il est (la cible de l'angle), ce qu'il ressent en arrivant, ce qu'il cherche, ce qui le retient (les objections données par la recherche) et ce qui le fera acheter (la motivation, l'émotion de l'angle).
2. Écris son parcours sur la page (journey) : la suite des questions et des émotions qu'il traverse, du premier regard à l'action.
3. Pour CHAQUE moment de ce parcours, choisis dans la bibliothèque LA section qui y répond le mieux, et dis pourquoi (why : le moment du parcours, la question ou l'objection du visiteur, et pourquoi cette section plutôt qu'une autre) et ce qu'elle dira concrètement avec les vrais faits de la marque (says : le message, les faits, l'émotion, les éléments précis : questions, lignes d'un comparatif, étapes, avant et après…).
4. Chaque section prolonge la précédente : la page se lit comme un récit qui avance, jamais comme une pile de blocs. Les objections du visiteur trouvent chacune leur réponse quelque part (comparatif, avant / après, preuves, questions, garanties), l'émotion revient régulièrement (scènes, moments, photos), et la page finit par une raison d'agir.
Exigences :
- Des pages RICHES : une vraie page de vente utilise beaucoup de sections, autant que le parcours en demande, jamais le minimum. L'accueil et la fiche produit sont les pages les plus riches (accueil au moins ${MIN_SECTIONS.home}, fiche produit au moins ${MIN_SECTIONS.product} : c'est un plancher, pas un objectif). Les pages pratiques (panier, compte, aide, légal, 404) restent simples.
- Jamais une section pour remplir, jamais une section dont le visiteur de CETTE marque n'a pas besoin.
- Jamais une section qui demande un contenu que la marque n'a pas (avis, note, presse, photos de clients, vidéo, offres, abonnement, dates) : la liste de ce qu'elle a réellement t'est donnée. Une section « seulement pour » un genre de produit ne va jamais ailleurs.
- Une seule section de cartes (produits ou familles) par page. « Produit vedette » ouvre la fiche produit (une seule) ou apparaît au plus une fois sur l'accueil ; les offres (lots, quantités, coffret) sont des fonctions de ce bloc, jamais une section à part. Jamais la même section deux fois dans le site (une section = une page). Jamais deux sections de même rôle à la suite. L'accueil s'ouvre par une grande photo avec le titre dessus.
- Toutes les pages obligatoires, avec leurs clés exactes ; aucune autre page de paiement.
- Utilise UNIQUEMENT les identifiants de la liste (champ « section »).
Réponse : uniquement le JSON demandé.`;

/** Catalogue de la famille donné au concepteur : une ligne par section (identifiant, rôle, titre, ce qu'elle fait). */
export function designCatalogue(family: FamilyId): string {
  return familySections(family)
    .map((s) => `- ${s.id} · ${s.role}${isCardSection(s) ? " · cartes" : ""}${onlyFor(s.tags) ? ` · seulement pour ${onlyFor(s.tags)}` : ""} · ${s.title} : ${s.does.slice(0, 220)}`)
    .join("\n");
}

export function designPrompt(o: { brief: string; family: FamilyId; site: SiteKind; has: string[]; lacks: string[]; consigne?: string | null }): string {
  const req = requiredPages(o.site).map((r) => `${r.keys[0]} (${r.label})`).join(", ");
  const owned = platformOwnedPages(o.site).map((r) => r.label).join(", ");
  return [
    o.brief,
    o.consigne ? `DEMANDE DU CLIENT (prioritaire, ses mots) : « ${o.consigne} »` : "",
    `Site : ${o.site.business === "services" ? "entreprise de services" : `boutique de ${o.site.products} produit(s)`}${o.site.platform ? `, plateforme ${o.site.platform}` : ""}.`,
    `Ce que la marque a réellement : ${o.has.length ? o.has.join(" ; ") : "rien de plus que les faits ci-dessus"}.`,
    `Ce qu'elle n'a PAS (aucune section qui en dépend) : ${o.lacks.join(" ; ")}.`,
    `Pages obligatoires (clés) : ${req}.${owned ? ` Jamais de page : ${owned} (la plateforme les tient).` : ""}`,
    "",
    `BIBLIOTHÈQUE DE LA FAMILLE (identifiant · rôle · titre : ce qu'elle fait) :`,
    designCatalogue(o.family),
  ].filter((x) => x !== "").join("\n");
}

/** Texte d'intention gardé dans la section (relu par le plan des textes et le rédacteur). */
export const intentText = (why: string, says: string) => `Pourquoi ici : ${why.trim()} Ce qu'elle dit : ${says.trim()}`;
