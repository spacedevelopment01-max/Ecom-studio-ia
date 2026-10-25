/**
 * Le Coven des Charmes — icônes redessinées d'après les planches finales (comparées aux reconstitutions du kit, qui
 * différaient). Même grille 32 × 32 et même trait que le kit (contour or, 1,6 px). Elles remplacent ou complètent
 * les symboles du sprite du kit au moment de ranger le sprite dans le projet (`covenSprite`).
 *
 *  - coven-mysteres-lune : croissant et petite étoile à quatre branches (planches 01, 02 : « Charms tirés au sort »,
 *    « Des symboles inspirants ») ; le kit dessinait deux croix.
 *  - coven-chat, coven-chapeau, coven-botte, coven-crane, coven-os, coven-rameau : boutons des catégories de la page
 *    Tirage sur téléphone (planche 05 : Familiers, Divinations, Accessoires, Charmes Mystères, Rituels, Pierres
 *    Arbres de vie) ; le kit proposait chat de face, cartes, clé, lune, bougie et arbre dans un cercle.
 *  - coven-etoile-8 : étoile à huit branches du parcours du panier (planche 03, « Tirage des charms au scoop »).
 *  - coven-colis : boîte du parcours du panier (planche 03, « Commande du bracelet »).
 */
const S = (id: string, body: string) => `<symbol id="${id}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</symbol>`;

export const ICONES_AJUSTEES: Record<string, string> = {
  "coven-mysteres-lune": S("coven-mysteres-lune", '<path d="M19 4.5a11.5 11.5 0 1 0 8.6 17.8A9.5 9.5 0 0 1 19 4.5z"/><path d="M24 6.5l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" fill="currentColor" stroke-width="1"/>'),
  "coven-chat": S("coven-chat", '<path d="M8 27V8.5l5.2 5h5.6l5.2-5V27"/><path d="M8 27c0-4.5 3.6-7.5 8-7.5s8 3 8 7.5"/><path d="M12.6 17.2h.1M19.3 17.2h.1" stroke-width="2.4"/><path d="M15 20.6l1 .9 1-.9"/>'),
  "coven-chapeau": S("coven-chapeau", '<path d="M3.5 25.5c4 1.6 21 1.6 25 0"/><path d="M8.5 24.6l3.2-9.8c.9-2.8 1.9-6.4 4.6-9.3l2 1.4-.9 3.1c2.3 2.7 4.2 7.9 5.6 14.4"/><path d="M10.4 19.6c3.6.9 7.8.9 11.7 0"/>'),
  "coven-botte": S("coven-botte", '<path d="M11 4h8v13.5c4 1.3 7.5 3 7.5 6.2V27H9.5V7.5z"/><path d="M11 8.5h8M9.5 23.5h17"/>'),
  "coven-crane": S("coven-crane", '<path d="M16 4C10.2 4 6 8 6 13.5c0 3 1.2 5 3 6.3V24h14v-4.2c1.8-1.3 3-3.3 3-6.3C26 8 21.8 4 16 4z"/><circle cx="12" cy="14.5" r="2.4"/><circle cx="20" cy="14.5" r="2.4"/><path d="M15 19.5l1-1.6 1 1.6M13 24v3.5M16 24v3.5M19 24v3.5"/>'),
  "coven-os": S("coven-os", '<path d="M11.2 24.4a2.6 2.6 0 1 1-3.6-3.6 2.6 2.6 0 1 1 3.6-3.6l6-6a2.6 2.6 0 1 1 3.6-3.6 2.6 2.6 0 1 1 3.6 3.6 2.6 2.6 0 1 1-3.6 3.6l-6 6a2.6 2.6 0 1 1-3.6 3.6z"/>'),
  "coven-rameau": S("coven-rameau", '<path d="M5 28C11 21 17 13.5 27 5"/><path d="M9.6 23.3C6.2 23.6 4 21.8 4 19.6c3.2-.2 5.4 1.4 5.6 3.7zM13.5 18.7c-.3-3.3 1.3-5.7 3.7-6.6.4 3.2-1.2 5.6-3.7 6.6zM17.5 14.2c-3.2.4-5.6-.9-6.4-3.2 3.1-.6 5.5.7 6.4 3.2zM21.6 10.2c-.1-3.2 1.6-5.3 3.9-6 .2 3.1-1.5 5.2-3.9 6z"/>'),
  "coven-etoile-8": S("coven-etoile-8", '<path d="M16 3.5l2.2 8.3 7.3-4.5-4.5 7.3 8.3 2.2-8.3 2.2 4.5 7.3-7.3-4.5L16 28.5l-2.2-8.3-7.3 4.5 4.5-7.3-8.3-2.2 8.3-2.2-4.5-7.3 7.3 4.5z"/>'),
  "coven-colis": S("coven-colis", '<path d="M5 11l11-5 11 5v12l-11 5-11-5z"/><path d="M5 11l11 5 11-5M16 16v12M10.5 8.5l11 5"/>'),
};

/** Sprite du projet : celui du kit, dont les symboles redessinés remplacent ou complètent les siens. */
export function covenSprite(kitSprite: string): string {
  let out = kitSprite;
  for (const [id, symbol] of Object.entries(ICONES_AJUSTEES)) {
    const re = new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`);
    out = re.test(out) ? out.replace(re, () => symbol) : out.replace("</svg>", `${symbol}</svg>`);
  }
  return out;
}
