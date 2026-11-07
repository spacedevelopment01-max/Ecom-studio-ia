/**
 * SINA lot 1 bis (#282) — commandes d'affichage en langage naturel, reconnues sur place, sans IA et sans coût.
 *
 * Frontière avec la future SINA multi-actions (B3, Codex) : ce module ne reconnaît QUE des réglages d'affichage du
 * Studio (mode, apparence, largeur de l'aperçu, panneau, densité, taille du texte). Il ne répond jamais à la place de
 * SINA, ne touche à aucune donnée du projet et ne lance rien. Une phrase qui n'est pas clairement une commande
 * d'affichage renvoie `null` : elle reste pour la conversation. Une commande d'affichage incomplète (« change le
 * mode ») demande une précision au lieu de deviner.
 */
import { SYNA_CONVO_WIDTH, type SynaUiPrefs } from "./preferences";

export type SynaUiCommand =
  | { kind: "set"; patch: Partial<SynaUiPrefs>; say: [fr: string, en: string] }
  | { kind: "width"; delta: number; say: [fr: string, en: string] }
  | { kind: "reset"; say: [fr: string, en: string] }
  | { kind: "ask"; question: [fr: string, en: string]; options: { label: [fr: string, en: string]; command: string }[] };

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

const WIDTH_STEP = 80;

/** Une phrase courte et sans autre demande : au-delà de 12 mots, ce n'est plus une simple commande d'affichage. */
export function parseSynaUiCommand(input: string): SynaUiCommand | null {
  const s = fold(input);
  if (!s || s.split(" ").length > 12) return null;
  const has = (re: RegExp) => re.test(s);
  // Une phrase qui parle du contenu (site, produit, image, texte publié…) n'est jamais une commande d'affichage.
  if (has(/\b(ajoute\w*|cree\w*|ecris|ecrire|redige\w*|supprime\w*|modifie\w*|publie\w*|genere\w*|section|sections|bouton|titre|image|images|photo|photos|produit|produits|article|articles|publication|publications|logo|couleur|couleurs|fond|prix|banniere|video|videos|page d accueil|add|create|write|delete|generate|section|button|title|product|post|logo|colour|color|background|price|banner)\b/)) return null;

  // Mode
  if (has(/\bplein (cadre|ecran)\b|\bfull (frame|screen)\b/)) {
    if (has(/\b(quitte|quitter|sors|sortir|sans|leave|exit)\b/)) return { kind: "set", patch: { mode: "encre" }, say: ["Mode Encre", "Ink mode"] };
    return { kind: "set", patch: { mode: "plein" }, say: ["Mode Plein cadre", "Full-frame mode"] };
  }
  if (has(/\bencre\b|\bink\b/)) return { kind: "set", patch: { mode: "encre" }, say: ["Mode Encre", "Ink mode"] };
  if (has(/^(change|changer|bascule|basculer|switch|toggle)( de| le| the)? (mode|affichage|presentation|layout|interface)$/) || has(/^(autre|other) (mode|affichage)$/)) {
    return { kind: "ask", question: ["Quel mode voulez-vous ?", "Which mode do you want?"], options: [{ label: ["Encre", "Ink"], command: "Mode Encre" }, { label: ["Plein cadre", "Full frame"], command: "Passe en Plein cadre" }] };
  }

  // Apparence
  if (has(/\b(mode|theme|apparence|interface|affichage|studio) (sombre|nuit)\b|\b(passe|mets|bascule)( le studio| l interface)? en (sombre|mode sombre|nuit)\b|^(sombre|nuit)$|\bdark (mode|theme)\b|^dark$/)) return { kind: "set", patch: { appearance: "dark" }, say: ["Apparence sombre", "Dark appearance"] };
  if (has(/\b(mode|theme|apparence)\s(clair|jour)\b|\b(passe|mets) en (clair|jour)\b|\blight (mode|theme)\b|^(clair|light)$/)) return { kind: "set", patch: { appearance: "light" }, say: ["Apparence claire", "Light appearance"] };
  if (has(/\b(comme|suivre|suis) (l )?(appareil|systeme|ordinateur|telephone)\b|\b(system|device) (theme|appearance)\b/)) return { kind: "set", patch: { appearance: "auto" }, say: ["Apparence de l'appareil", "Device appearance"] };

  // Largeur de l'aperçu (la conversation prend l'inverse)
  const preview = /\b(apercu|preview|site|espace de travail|workspace|resultat)\b/;
  const convo = /\b(conversation|s[iy]na|volet|panneau|colonne|panel|column)\b/;
  const grow = /\b(agrandi\w*|elargi\w*|plus (grand|large)|bigger|wider|enlarge|grow)\b/;
  const shrink = /\b(redui\w*|retreci\w*|plus (petit|etroit)|smaller|narrower|shrink)\b/;
  if (has(preview) && has(grow)) return { kind: "width", delta: -WIDTH_STEP, say: ["Aperçu agrandi", "Preview enlarged"] };
  if (has(preview) && has(shrink)) return { kind: "width", delta: WIDTH_STEP, say: ["Aperçu réduit", "Preview reduced"] };
  if (has(convo) && has(grow)) return { kind: "width", delta: WIDTH_STEP, say: ["Conversation élargie", "Conversation widened"] };
  if (has(convo) && has(shrink)) return { kind: "width", delta: -WIDTH_STEP, say: ["Conversation réduite", "Conversation narrowed"] };
  if (has(/^(agrandis|agrandir|elargis|reduis|reduire|enlarge|shrink)$/)) {
    return { kind: "ask", question: ["Agrandir quoi ?", "Enlarge what?"], options: [{ label: ["L'aperçu", "The preview"], command: "Agrandis l'aperçu" }, { label: ["La conversation", "The conversation"], command: "Agrandis la conversation" }] };
  }

  // Panneau SINA épinglé / replié
  if (has(/\b(replie|replier|cache|masque|ferme)\b.*\b(s[iy]na|conversation|panneau|volet|colonne)\b|\b(collapse|hide)\b.*\b(s[iy]na|conversation|panel)\b/)) return { kind: "set", patch: { panel: "collapsed" }, say: ["SINA repliée par défaut", "SINA collapsed by default"] };
  if (has(/\b(epingle|epingler|garde|ouvre|affiche)\b.*\b(s[iy]na|conversation|panneau|volet|colonne)\b|\bpin\b.*\b(s[iy]na|conversation|panel)\b/)) return { kind: "set", patch: { panel: "pinned" }, say: ["SINA épinglée", "SINA pinned"] };

  // Densité et taille du texte
  if (has(/\b(plus )?(compact|dense|serre)\w*\b/) && !has(/\btexte\b/)) return { kind: "set", patch: { density: "compact" }, say: ["Densité compacte", "Compact density"] };
  if (has(/\b(confortable|aere|spacieux|comfortable|roomy)\b/)) return { kind: "set", patch: { density: "comfortable" }, say: ["Densité confortable", "Comfortable density"] };
  if (has(/\b(texte|police|caracteres|text|font)\b/) && has(grow)) return { kind: "set", patch: { textSize: "large" }, say: ["Texte agrandi", "Larger text"] };
  if (has(/\b(texte|police|caracteres|text|font)\b/) && (has(shrink) || has(/\bnormal\b/))) return { kind: "set", patch: { textSize: "normal" }, say: ["Texte normal", "Normal text"] };

  // Réinitialisation
  if (has(/\b(reinitialise\w*|reset|retablis|retablir|par defaut|default)\b/) && has(/\b(affichage|interface|reglages|apparence|display|settings|layout)\b/)) return { kind: "reset", say: ["Réglages par défaut rétablis", "Default settings restored"] };

  return null;
}

/** Applique une commande de largeur dans les bornes sûres (360 à 560 px). */
export function nextConvoWidth(current: number, delta: number): number {
  const { min, max, step } = SYNA_CONVO_WIDTH;
  return Math.min(max, Math.max(min, Math.round((current + delta) / step) * step));
}
