/**
 * SINA EN DIRECT DANS L'ATELIER (rapport 10, point 7 et partie 7) : les trois façons de faire, le conseil d'outil en une
 * phrase, « Améliorer ma demande avec SINA » avec ses ajouts montrés à part, et l'avertissement avant un risque.
 *
 *  - « SINA s'en occupe » : elle choisit le modèle prêt et l'outil (OpenAI pour toutes ses images), le client valide ;
 *  - « On le fait ensemble » : elle remplit la demande, le client la voit et la change ;
 *  - « Je fais moi-même » : le client choisit l'outil et écrit sa demande ; le contrôle du produit s'applique quand même
 *    (une création qui change le produit est marquée « produit modifié » et ne part pas vers la boutique).
 *
 * Tout est fait par le code, sans appel payant : l'amélioration de la demande ajoute ce que le Studio sait déjà de la
 * marque (couleurs, ton, format), jamais un fait inventé ; les mots du client restent tels quels, en tête. Module pur.
 */
import { GESTES } from "./gestes";
import type { GesteId, OutilMontre, T2 } from "./outils";

export type Mode = "sina" | "ensemble" | "moi";

export const MODES: { id: Mode; nom: T2; aide: T2 }[] = [
  { id: "sina", nom: ["SINA s'en occupe", "SINA handles it"], aide: ["Je choisis le modèle et l'outil, tu valides.", "I choose the template and the tool, you approve."] },
  { id: "ensemble", nom: ["On le fait ensemble", "Let's do it together"], aide: ["Je remplis la demande, tu la vois et tu la changes.", "I fill in the request, you see it and change it."] },
  { id: "moi", nom: ["Je fais moi-même", "I'll do it myself"], aide: ["Tu choisis l'outil et tu écris ta demande ; je vérifie ton produit quand même.", "You choose the tool and write your request; I still check your product."] },
];

const t = (x: T2, lang: "fr" | "en") => (lang === "fr" ? x[0] : x[1]);

/** Le conseil d'outil, en une phrase : pourquoi celui-là, et qu'il est le moins cher qui suffit quand c'est le cas. */
export function conseilOutil(geste: GesteId, outils: OutilMontre[], lang: "fr" | "en"): string | null {
  const c = outils.find((o) => o.conseille);
  if (!c) return lang === "fr" ? "Aucun outil n'est encore ouvert pour ce geste." : "No tool is open yet for this action.";
  const nom = t(c.nom, lang);
  const pourquoi = t(c.mieux, lang).replace(/\s*[.;].*$/, "").toLowerCase();
  return lang === "fr" ? `Je prends ${nom} pour « ${t(GESTES[geste].nom, "fr").toLowerCase()} » : ${pourquoi}.` : `I'm using ${nom} for "${t(GESTES[geste].nom, "en").toLowerCase()}": ${pourquoi}.`;
}

/** L'avertissement avant un risque : un outil qui redessine un produit qui porte du texte. */
export function avertissement(o: { outil: OutilMontre | null; produitATexte: boolean; vraisPixels: boolean }, lang: "fr" | "en"): string | null {
  if (!o.outil?.redessine || !o.produitATexte) return null;
  return lang === "fr"
    ? `Avec ${t(o.outil.nom, "fr")}, ton étiquette risque de changer. Je compare l'image à ta vraie photo avant de te la montrer${o.vraisPixels ? " et je repose ta vraie photo par-dessus" : ""} ; si elle a changé, je te le dis.`
    : `With ${t(o.outil.nom, "en")}, your label may change. I compare the image with your real photo before showing it${o.vraisPixels ? " and put your real photo back on top" : ""}; if it changed, I'll tell you.`;
}

export type Amelioration = { texte: string; ajouts: string[] };

/**
 * « Améliorer ma demande avec SINA » : les mots du client d'abord, puis ce que SINA ajoute (montré à part, que le client
 * peut enlever). Rien d'inventé : seulement la marque connue (couleurs, ton) et ce qui fait une belle image.
 */
export function ameliorerDemande(mots: string, o: { couleurs: string[]; ton?: string | null; aspect?: string | null; geste: GesteId }, lang: "fr" | "en"): Amelioration {
  const base = mots.replace(/\s+/g, " ").trim();
  const ajouts: string[] = [];
  if (o.geste === "scene" || o.geste === "fond" || o.geste === "lot") {
    if (o.couleurs.length) ajouts.push(lang === "fr" ? `les couleurs de ta marque dans la lumière (${o.couleurs.slice(0, 3).join(", ")})` : `your brand colours in the light (${o.couleurs.slice(0, 3).join(", ")})`);
    if (o.ton) ajouts.push(lang === "fr" ? `une ambiance ${o.ton}` : `a ${o.ton} mood`);
    ajouts.push(lang === "fr" ? "une seule lumière douce venue du côté, une vraie ombre sous ton produit" : "one soft side light, a real shadow under your product");
    ajouts.push(lang === "fr" ? "ton produit entier, rien de coupé, une place calme pour un texte" : "your whole product, nothing cut off, a calm area for text");
  }
  if (o.geste === "retirer") ajouts.push(lang === "fr" ? "le reste de la photo exactement pareil" : "the rest of the photo exactly the same");
  if (o.aspect) ajouts.push(lang === "fr" ? `au format ${o.aspect}` : `in ${o.aspect} format`);
  const texte = [base, ...ajouts].filter(Boolean).join(lang === "fr" ? " ; " : "; ");
  return { texte, ajouts };
}

/** Ce que SINA propose après une création (la suite, en une phrase). */
export function suiteProposee(kind: "image" | "video", lang: "fr" | "en"): string {
  return kind === "video"
    ? lang === "fr" ? "Je la mets dans ton calendrier, ou je la garde pour une publicité ?" : "Shall I put it in your calendar, or keep it for an ad?"
    : lang === "fr" ? "Je la mets dans ta prochaine publication, sur ton site, ou je la garde pour une publicité ?" : "Shall I put it in your next post, on your site, or keep it for an ad?";
}
