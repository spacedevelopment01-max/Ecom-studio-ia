/**
 * LES GESTES DE L'ATELIER (rapport 10, points 3 et 5) : ce que le client peut faire sur une image, en un bouton.
 *
 *  - « Mets mon produit dans une scène » : la scène est créée par OpenAI avec la vraie photo en référence, puis
 *    contrôlée (forme, proportions, couleur comparées au détourage ; le juge lit l'étiquette mot à mot) ;
 *  - « Change le fond », « Retire un objet » : une seule chose change, le reste ne bouge pas ;
 *  - « Format vertical » (la story des réseaux ; jamais un mot anglais pour le client), « Version carrée » : le cadre est agrandi autour de la photo intacte ;
 *  - « Tout mon catalogue » : le même geste sur toutes les photos de produit, d'un coup.
 *
 * Les consignes envoyées à l'outil sont écrites ici, une seule fois (la même pour le devis et pour la création). Les
 * mots du client y sont repris mot pour mot entre deux bornes, jamais réécrits. Module pur.
 */
import type { GesteId, T2 } from "./outils";

export type Geste = {
  id: GesteId;
  nom: T2;
  /** Ce que le client lit sous le bouton. */
  aide: T2;
  kind: "image" | "video";
  /** Le geste demande un mot du client (le décor, l'objet à retirer). */
  demande?: { label: T2; exemple: T2; min: number };
  /** Format visé (story, carré). */
  cible?: "9:16" | "1:1";
};

export const GESTES: Record<GesteId, Geste> = {
  scene: {
    id: "scene", kind: "image", nom: ["Mets mon produit dans une scène", "Put my product in a scene"],
    aide: ["Ton vrai produit, étiquette nette, dans un décor à ta marque. Une image ratée t'est dite ratée.", "Your real product, sharp label, in a setting that fits your brand. A failed image is reported as failed."],
    demande: { label: ["Le décor que tu veux", "The setting you want"], exemple: ["sur une table en bois, lumière du matin", "on a wooden table, morning light"], min: 0 },
  },
  fond: {
    id: "fond", kind: "image", nom: ["Change le fond", "Change the background"],
    aide: ["Seul le fond change ; ton produit reste le même.", "Only the background changes; your product stays the same."],
    demande: { label: ["Le nouveau fond", "The new background"], exemple: ["un mur de pierre clair", "a light stone wall"], min: 3 },
  },
  story: {
    id: "story", kind: "image", cible: "9:16", nom: ["Format vertical", "Story version"],
    aide: ["Le cadre s'agrandit en hauteur autour de ta photo, qui ne change pas.", "The frame grows taller around your photo, which doesn't change."],
  },
  carre: {
    id: "carre", kind: "image", cible: "1:1", nom: ["Version carrée", "Square version"],
    aide: ["Le cadre s'agrandit pour faire un carré autour de ta photo, qui ne change pas.", "The frame grows into a square around your photo, which doesn't change."],
  },
  retirer: {
    id: "retirer", kind: "image", nom: ["Retire un objet", "Remove an object"],
    aide: ["Dis ce qui gêne : il disparaît, le reste ne bouge pas.", "Say what's in the way: it disappears, the rest stays put."],
    demande: { label: ["Ce qu'il faut retirer", "What to remove"], exemple: ["le câble à gauche", "the cable on the left"], min: 3 },
  },
  lot: {
    id: "lot", kind: "image", nom: ["Tout mon catalogue", "My whole catalogue"],
    aide: ["Le même fond pour toutes tes photos de produit, d'un coup.", "The same background for all your product photos, in one go."],
    demande: { label: ["Le fond pour toutes tes photos", "The background for all your photos"], exemple: ["un fond blanc doux", "a soft white background"], min: 3 },
  },
  video: {
    id: "video", kind: "video", nom: ["Une vidéo pour vendre", "A video that sells"],
    aide: ["Une image validée d'abord, puis le mouvement ; chaque image de la vidéo est relue.", "An approved still first, then the motion; every frame of the video is reviewed."],
  },
};

/** Le lot traite au plus ce nombre de photos d'un coup (le prix est donné pour toutes, avant). */
export const LOT_MAX = 30;

const borne = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 300);

/**
 * La consigne de retouche d'un geste, en français (même consigne au devis et à la création). Les mots du client sont
 * gardés tels quels. Le produit reste le même : forme, proportions, couleurs, étiquette et inscriptions.
 */
export function consigneGeste(geste: GesteId, mots: string): string {
  const m = borne(mots);
  switch (geste) {
    case "fond":
    case "lot":
      return `Remplacer seulement le fond de la photo par : ${m}. Le produit ne bouge pas et ne change pas : même place, même taille, même angle, mêmes couleurs, même étiquette et mêmes inscriptions, lettre pour lettre. La lumière et l'ombre de contact s'accordent au nouveau fond.`;
    case "retirer":
      return `Retirer seulement ceci de la photo : ${m}. Rien d'autre ne change : le produit, son étiquette, le cadrage, la lumière et le reste du décor restent exactement les mêmes. La place libérée est remplie par la suite naturelle du décor.`;
    case "story":
    case "carre":
      return `Prolonger le décor de la photo au-delà de ses bords, dans la même lumière et la même matière, sans rien ajouter de nouveau : aucun objet, aucun texte, aucune personne. La photo d'origine reste intacte au centre.`;
    case "scene":
      return m ? `Le décor voulu par le client : ${m}.` : "";
    default:
      return m;
  }
}

/** La demande du client est-elle assez claire pour ce geste ? (null : oui ; sinon la phrase à lui dire). */
export function demandeIncomplete(geste: GesteId, mots: string, lang: "fr" | "en"): string | null {
  const g = GESTES[geste];
  if (!g.demande || borne(mots).length >= g.demande.min) return null;
  return lang === "fr" ? `Dis-moi ${g.demande.label[0].toLowerCase()} (par exemple : « ${g.demande.exemple[0]} »).` : `Tell me ${g.demande.label[1].toLowerCase()} (for example: "${g.demande.exemple[1]}").`;
}
