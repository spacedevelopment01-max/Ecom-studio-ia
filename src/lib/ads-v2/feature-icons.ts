/**
 * Pictogramme au trait d'un atout de publicité (« Réduction de bruit », « Fait main », « Livraison 48 h ») : icônes
 * Tabler (licence MIT, déjà installées), toutes du même style au trait, comme les rangées d'atouts des publicités de
 * référence. Le pictogramme illustre un atout CONFIRMÉ du projet ; il n'en invente aucun.
 */
import { iconOutlinePath } from "../media/icon-library";

/** Mots de l'atout (français ou anglais) → pictogrammes candidats, du plus précis au plus général. */
const MAP: [RegExp, string[]][] = [
  [/casque|écoute|ecoute|audio|son\b|sonore|musique|headphone|sound|music/i, ["headphones", "music"]],
  [/auriculaire|oreille|ear/i, ["ear", "headphones"]],
  [/batterie|autonomie|battery/i, ["battery-4", "battery"]],
  [/bruit|noise|silence/i, ["volume-off", "ear"]],
  [/sans fil|bluetooth|wireless/i, ["bluetooth"]],
  [/léger|leger|plume|light\b|lightweight/i, ["feather"]],
  [/confort|rembourr|doux|douce|soft|comfort|cushion/i, ["cloud", "feather"]],
  [/coque|métal|metal|argent|alumin|acier|steel|silver/i, ["diamond", "circle-dot"]],
  [/design|élégan|elegan|style|premium/i, ["diamond", "sparkles"]],
  [/naturel|nature|bio\b|organic|végétal|vegetal|plante|leaf/i, ["leaf", "plant"]],
  [/artisan|fait main|handmade|atelier|craft/i, ["hand-stop", "brush"]],
  [/saponifi|savon|soap|mousse|lather/i, ["bubble", "droplet"]],
  [/peau|skin|soin|care|hydrat/i, ["droplet", "heart"]],
  [/pot|terre cuite|céramique|ceramique|vase|pot\b/i, ["plant-2", "plant"]],
  [/air|purif|respir/i, ["wind", "leaf"]],
  [/café|cafe|coffee|grain|torréf|torref|roast/i, ["coffee", "seeding"]],
  [/couleur|coloris|teinte|colou?r/i, ["palette", "color-swatch"]],
  [/taille|format|dimension|size|cm\b|mm\b/i, ["ruler-2", "dimensions"]],
  [/poids|weight|\bg\b|kg\b/i, ["scale", "feather"]],
  [/livraison|expédi|expedi|shipping|delivery/i, ["truck", "package"]],
  [/garantie|warranty|sécur|secur|protection|protect/i, ["shield-check", "shield"]],
  [/résistant|resistant|durable|robuste|solide|sturdy|resistan/i, ["shield", "hammer"]],
  [/eau|étanche|etanche|water/i, ["droplet"]],
  [/rapide|vite|express|fast|quick/i, ["bolt"]],
  [/local|france|français|francais|région|region|made in/i, ["map-pin", "home"]],
  [/voyage|travel|trajet/i, ["plane", "map"]],
  [/travail|bureau|work|office/i, ["briefcase"]],
  [/maison|intérieur|interieur|home|déco|deco/i, ["home", "armchair"]],
  [/cadeau|gift|offrir/i, ["gift"]],
  [/heure|horaire|\bh\b|temps|time|durée|duree/i, ["clock"]],
  [/rendez-vous|réservation|reservation|booking|appointment/i, ["calendar-event", "calendar"]],
  [/coupe|coiff|barb|ciseau|hair/i, ["scissors", "comb"]],
  [/fleur|bouquet|flower/i, ["flower", "plant"]],
  [/peint|enduit|plâtre|platre|chantier|travaux|renov/i, ["paint", "brush", "tool"]],
];
/** Pictogrammes neutres, en rotation, quand aucun mot n'est reconnu. */
const NEUTRAL = ["sparkles", "circle-check", "heart", "point"];

/** Tracé (grille 24 × 24) du pictogramme d'un atout ; `k` fait tourner les pictogrammes neutres. */
export function featureIcon(text: string, k = 0): { name: string; path: string } | null {
  for (const [re, names] of MAP) {
    if (!re.test(text)) continue;
    for (const n of names) {
      const path = iconOutlinePath(n);
      if (path) return { name: n, path };
    }
  }
  for (let i = 0; i < NEUTRAL.length; i++) {
    const n = NEUTRAL[(k + i) % NEUTRAL.length];
    const path = iconOutlinePath(n);
    if (path) return { name: n, path };
  }
  return null;
}
