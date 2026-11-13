/**
 * Le juge de l'originalité du thème sur mesure (carte des spécialistes de SINA, lot 8, 13 novembre 2026). Jusqu'ici, le
 * directeur de création concevait le site et le directeur commercial le relisait pour la vente : personne ne se
 * demandait si ce site pouvait être celui d'une autre marque.
 *
 * Un juge SÉPARÉ lit chaque concept (accueil et page qui vend) avec le dossier de la marque et les références de la
 * documentaliste. Il ne réécrit rien : il dit « garde » ou « reprendre », et quoi changer. Ses refus rejoignent la
 * seule reprise que le concepteur fait déjà quand le contrôle du Studio refuse quelque chose (aucun appel de
 * conception en plus), puis il relit la reprise. Un doute qui reste est gardé pour être dit au client. Un juge en panne
 * ne bloque jamais la conception : il est noté que le concept n'a pas été jugé.
 */
import { z } from "zod";
import { libSection } from "./library";
import type { Design } from "./design";

export const OriginalitySchema = z.object({
  verdict: z.enum(["garde", "reprendre"]),
  why: z.string().min(4).max(600),
  fixes: z.array(z.string().min(8).max(360)).max(5).default([]),
});
export type Originality = z.infer<typeof OriginalitySchema>;

/** Plafond et coût habituel d'un avis du juge (une lecture, une réponse courte). */
export const ORIGINALITY_CAP_MICRO = 150_000;
export const ORIGINALITY_TYPICAL_MICRO = 40_000;
/** Deux avis au plus par concept : le premier, puis la relecture de la reprise. */
export const ORIGINALITY_CALLS_MAX = 2;

export const ORIGINALITY_SYSTEM = `Tu es le juge de l'originalité d'un studio qui crée le site de petits commerçants. Un directeur de création vient de concevoir un site avec une bibliothèque de sections : sa stratégie, le parcours de l'accueil et de la page qui vend, la section choisie pour chaque moment, ce qu'elle dira et les scènes à photographier. Tu es séparé de lui : tu ne cherches pas à lui faire plaisir. Tu ne réécris rien : tu dis « garde » ou « reprendre », et pour « reprendre » tu dis précisément quoi changer. Tu as le dossier de la marque et, quand elles existent, les références relevées sur de vrais sites du même secteur.

Les épreuves :
1. LE LOGO MASQUÉ. Le nom et le logo cachés, reconnaît-on encore CETTE marque à ce que le site montre et dit : son idée, ses signes, sa voix, son produit ou son métier ?
2. LE CONCURRENT. Ce site irait-il aussi bien à un concurrent du même métier, en changeant seulement le nom ? Si oui, il est à reprendre : dis ce qui, dans le dossier de CETTE marque, peut le rendre sien.
3. LE CLICHÉ. Est-ce l'enchaînement que tout le monde fait dans ce secteur, sans rien qui lui soit propre ? Suivre les usages n'est pas un défaut (les produits tôt, une preuve, un appel à agir) ; n'avoir RIEN de propre en est un.
4. L'IDÉE. L'idée de la marque se voit-elle à trois moments au moins : ce que disent les sections, les scènes à photographier, la section propre au produit ou au métier ? Une idée écrite dans « concept » et absente des pages ne compte pas.
5. LE PREMIER ÉCRAN. L'ouverture dit-elle et montre-t-elle quelque chose que seule cette marque peut dire et montrer ?
6. LES DEUX CONCEPTS (seulement si un premier concept t'est donné). Celui-ci est-il un autre site (autre idée, autre émotion mise en avant, autre parcours), et non le premier avec deux sections changées ?

Sévère mais juste : un concept qui passe les épreuves, tu le gardes, même s'il ne t'aurait pas plu à toi. Tes corrections portent sur l'idée, l'ordre, le choix entre les sections de la bibliothèque, ce que disent les sections et les scènes photographiées. Ne demande jamais un fait absent du dossier, une section absente de la bibliothèque, ni une image d'une personne. Ne cite jamais une autre marque.

Réponse : uniquement le JSON demandé.
- verdict : « garde » ou « reprendre ».
- why : ton avis en deux phrases, dans des mots qu'un commerçant comprend.
- fixes : 1 à 5 corrections précises si « reprendre », vide sinon.`;

const SELL = (key: string) => key === "home" || /^product/.test(key) || key === "prestations";
const pageView = (d: Design) => d.pages.filter((pg) => SELL(pg.key)).map((pg) => ({
  page: pg.label, parcours: pg.journey,
  sections: pg.sections.map((s) => { const l = libSection(s.section); return { section: l?.title ?? s.section, role: l?.role ?? "", pourquoi: s.why, dit: s.says, photos: s.photos }; }),
}));

/** Demande au juge : le dossier, les références, le concept à juger, et le premier concept s'il y en a un. */
export function originalityPrompt(o: { brief: string; design: Design; references?: string; first?: Design | null }): string {
  return JSON.stringify({
    dossierDeLaMarque: o.brief.slice(0, 7000),
    referencesDuSecteur: (o.references ?? "").slice(0, 5000) || "aucune référence pour ce secteur",
    conceptAJuger: { idee: o.design.concept, visiteur: o.design.visitor, leviers: o.design.levers, enTete: libSection(o.design.header)?.title ?? o.design.header, pages: pageView(o.design) },
    premierConcept: o.first ? { idee: o.first.concept, pages: o.first.pages.filter((pg) => SELL(pg.key)).map((pg) => ({ page: pg.label, sections: pg.sections.map((s) => libSection(s.section)?.title ?? s.section) })) } : null,
  });
}

export type OriginalityOutcome = { status: "garde" | "repris" | "doute" | "non_juge"; why: string };
/** Ce que SINA dit au client, en une phrase, selon l'avis du juge. */
export const originalityNote = (o: OriginalityOutcome | null): string | null => !o ? null
  : o.status === "garde" ? `jugé propre à la marque : ${o.why}`
  : o.status === "repris" ? `repris une fois à la demande du juge de l'originalité, puis gardé : ${o.why}`
  : o.status === "doute" ? `doute du juge de l'originalité, à dire au client : ${o.why}`
  : `originalité non jugée (${o.why})`;
