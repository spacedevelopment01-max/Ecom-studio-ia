/**
 * Le SECOND REGARD sur l'ordre des pages (cahier « ordre et variété », partie 6 : « Un second regard séparé revérifie
 * la page après la correction : celui qui corrige n'est jamais celui qui valide »).
 *
 * Le juge de l'ordre (le directeur commercial) relit la conception ET la corrige. Un autre appel, avec une autre
 * consigne, relit ensuite ce qu'il a rendu : il ne corrige rien, il répond page par page « conforme » ou « non
 * conforme », avec la règle enfreinte. « Non conforme » rejoint la seule reprise du concepteur ; il relit alors cette
 * reprise, et ce qui reste est dit dans le compte rendu (« à revoir »). Deux appels au plus, jamais de boucle. Un
 * second regard en panne ne bloque pas la conception : il est noté qu'il n'a pas eu lieu.
 */
import { z } from "zod";
import { tenueSection } from "./tenue";
import { FORME_LABEL } from "./tenue-ordre";
import { MIN_SECTIONS_IMPORTANTE, PAGE_KIND_LABEL, REGLES_D_OR, REGLE_DE_PAGE, pageKind, type Partition } from "./partitions";
import type { Design } from "./design";

const plain = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, " ").trim() : v);
/** Lecture indulgente du verdict (« Non conforme », « non-conforme », « non_conforme ») : jamais un appel payé perdu. */
const Verdict = z.preprocess((v) => { const s = plain(v); return typeof s === "string" ? (s.startsWith("non") ? "non conforme" : s.startsWith("conforme") ? "conforme" : s) : s; }, z.enum(["conforme", "non conforme"]));
export const SecondRegardSchema = z.object({
  pages: z.array(z.object({
    page: z.string().min(1).max(40),
    verdict: Verdict,
    /** Pour « non conforme » : chaque règle enfreinte, avec ce qui l'enfreint sur la page. */
    regles: z.array(z.string().min(4).max(400)).max(6).default([]),
  })).max(24),
});
export type SecondRegard = z.infer<typeof SecondRegardSchema>;

/** Plafond et coût habituel d'un second regard (une lecture, une réponse courte). */
export const SECOND_REGARD_CAP_MICRO = 150_000;
export const SECOND_REGARD_TYPICAL_MICRO = 40_000;
/** Deux regards au plus par conception : après la correction du juge de l'ordre, puis après la reprise s'il y en a une pour lui. */
export const SECOND_REGARD_CALLS_MAX = 2;

export const SECOND_REGARD_SYSTEM = `Tu es le second regard d'un studio qui crée le site de petits commerçants et d'artisans. Un directeur de création a conçu un site ; un directeur commercial l'a relu et corrigé. Tu es séparé d'eux : tu ne corriges RIEN, tu ne proposes aucune autre page. Tu VÉRIFIES, page importante par page importante, que ce qui a été rendu respecte les règles, puis tu réponds « conforme » ou « non conforme ».
Pour chaque page importante qui t'est donnée, tu reçois : ses sections dans l'ordre (ce que fait chaque pièce, ce qu'elle dira), la partition choisie avec ses moments, la raison donnée pour ce choix, et les preuves réelles du dossier.
Tu contrôles, dans cet ordre :
A. les dix règles d'or ci-dessous, une par une ;
B. la règle propre à la page, quand elle t'est donnée ;
C. la partition : la page suit-elle l'ordre de la partition annoncée, aux adaptations près que les règles d'or permettent (un moment sauté parce que le dossier n'a pas de quoi le remplir, un moment déplacé d'un cran pour l'angle du client) ? Une page qui annonce une partition et en suit une autre est non conforme ;
D. la raison du choix : parle-t-elle de CE client (son angle, ses preuves, ses clients) ? Une raison qui irait à n'importe quel client est non conforme ;
E. le nombre de sections : au moins ${MIN_SECTIONS_IMPORTANTE} sur une page importante, SAUF si le dossier n'a pas de quoi en remplir davantage sans remplissage ; une section de remplissage, ou une section qui demande un contenu absent du dossier, est non conforme ;
F. ce que seul un lecteur peut voir : le premier écran dit-il vraiment ce qui est vendu, pour qui ou où, et l'action (pour un service : la ville et le téléphone ; pour une boutique : le prix et la livraison au plus tard en 3e position) ? Une section présentée comme une preuve est-elle une VRAIE preuve du dossier, et non la marque qui se cite elle-même ? Chaque section répond-elle à une question que ce visiteur se pose, à ce moment-là ?
Sévère mais juste : tu ne refuses que ce qui enfreint une règle écrite ici, jamais ce qui ne t'aurait pas plu. Pour chaque page non conforme, « regles » dit la règle enfreinte et ce qui l'enfreint (la section, sa position), en une phrase chacune. Pour une page conforme, « regles » est vide. Tu ne demandes jamais un fait absent du dossier ni une pièce absente de la bibliothèque. Tu rends un verdict pour CHAQUE page donnée, avec sa clé exacte.
${REGLES_D_OR}
Réponse : uniquement le JSON demandé.`;

export type RegardPage = { key: string; partition: Partition | null; why: string };
/** Demande au second regard : le dossier en court, les preuves réelles, et chaque page importante avec sa partition. */
export function secondRegardPrompt(o: { brief: string; preuves: string; business: "products" | "services"; angle?: string | null; design: Pick<Design, "pages">; pages: RegardPage[] }): string {
  const view = o.pages.map((rp) => {
    const pg = o.design.pages.find((x) => x.key === rp.key);
    if (!pg) return null;
    const kind = pageKind(rp.key, o.business);
    return {
      page: rp.key, nom: pg.label, genre: kind && kind !== "utilitaire" ? PAGE_KIND_LABEL[kind] : rp.key,
      regleDeLaPage: kind && kind !== "utilitaire" && kind !== "accueil" ? REGLE_DE_PAGE[kind] : null,
      partitionChoisie: rp.partition ? { identifiant: rp.partition.id, nom: rp.partition.nom, moments: rp.partition.moments.map((x) => x.label) } : "aucune partition reconnue",
      raisonDuChoix: rp.why || "aucune raison donnée",
      sections: pg.sections.map((s, i) => { const t = tenueSection(s.section); return { position: i + 1, piece: t?.title ?? s.section, disposition: t?.ordre ? FORME_LABEL[t.ordre.forme] : null, pourquoi: s.why, ceQuElleDit: s.says }; }),
    };
  }).filter(Boolean);
  return JSON.stringify({
    dossierDeLaMarque: o.brief.slice(0, 6000),
    genreDeSite: o.business === "services" ? "entreprise de services" : "boutique de produits",
    angleChoisiParLeClient: o.angle ?? "inconnu",
    preuvesDuDossier: o.preuves,
    pagesAVerifier: view,
  });
}

/** Les refus du second regard, dits au concepteur pour sa seule reprise. */
export const secondRegardRefus = (v: SecondRegard): string[] => v.pages.filter((p) => p.verdict === "non conforme").flatMap((p) => (p.regles.length ? p.regles : ["non conforme (règle non précisée)"]).map((r) => `second regard, page « ${p.page} » : ${r}`));
