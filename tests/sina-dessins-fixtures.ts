/**
 * Dessins d'essai des planches de marque : les scènes des planches faites à la main le 12 novembre 2026 (celles que le
 * propriétaire a préférées), réécrites comme un modèle les écrirait : du SVG à plat. Chaque dessin passe par le filtre
 * du Studio (`sanitizeArt`) ; un dessin refusé arrête les tests. Aucune image, aucun appel d'IA.
 */
import { sanitizeArt, type Art } from "@/lib/syna-agent/brand-art";

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Suite pseudo-aléatoire stable (mêmes dessins à chaque passage). */
function alea(graine: number) { let s = graine >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

export function art(viewBox: string, inner: string): Art {
  const r = sanitizeArt(`<svg viewBox="${viewBox}">${inner}</svg>`);
  if (!r.ok) throw new Error(`Dessin d'essai refusé : ${r.reason}`);
  return r.art;
}

/** Morceaux de fruits, centrés sur (0,0), taille ≈ 20. */
const M: Record<string, (c?: string) => string> = {
  citron: (c = "#FFE44D") => `<g><circle r="10" fill="${c}" stroke="#F2B800" stroke-width="1.6"/><circle r="6.8" fill="#FFF3A6"/>${[0, 60, 120].map((a) => `<line x1="-6.6" y1="0" x2="6.6" y2="0" stroke="${c}" stroke-width="1.4" transform="rotate(${a})"/>`).join("")}</g>`,
  fraise: (c = "#FF3D6E") => `<g><path d="M0 9 C-9 3 -9 -6 -3 -7 C-1 -7.4 0 -6 0 -6 C0 -6 1 -7.4 3 -7 C9 -6 9 3 0 9Z" fill="${c}"/><path d="M0 6 C-5 2 -5 -3 -2 -4 C0 -4 0 -2 0 -2 C0 -2 0 -4 2 -4 C5 -3 5 2 0 6Z" fill="#FFB3C4"/></g>`,
  feuille: (c = "#1FB37A") => `<g><path d="M-10 0 C-4 -7 5 -7 10 0 C5 7 -4 7 -10 0Z" fill="${c}"/><line x1="-8" y1="0" x2="8" y2="0" stroke="#0E7F55" stroke-width="1"/></g>`,
  peche: (c = "#FF9F6B") => `<g><path d="M-10 0 A10 10 0 0 1 10 0Z" fill="${c}"/><path d="M-7 0 A7 7 0 0 1 7 0Z" fill="#FFD2A8"/><circle cx="0" cy="-1.2" r="2.4" fill="#D9543A"/></g>`,
  mangue: (c = "#FFB01F") => `<g><rect x="-6" y="-6" width="12" height="12" rx="3" fill="${c}"/><rect x="-3.2" y="-3.2" width="6.4" height="6.4" rx="1.6" fill="#FFD36E"/></g>`,
  baie: (c = "#B0124F") => `<g><circle r="5.2" fill="${c}"/><circle cx="-1.6" cy="-1.6" r="1.4" fill="#FF7FA8"/></g>`,
  petale: (c = "#E0245E") => `<g><path d="M0 -10 C7 -6 8 4 0 10 C-8 4 -7 -6 0 -10Z" fill="${c}"/><path d="M0 -6 C3 -3 3 3 0 6" stroke="#FF8FB1" stroke-width="1" fill="none"/></g>`,
  pomme: (c = "#CFE86B") => `<g><path d="M-10 0 A10 10 0 0 1 10 0Z" fill="${c}" stroke="#E0662F" stroke-width="1.6"/><circle cx="-2.2" cy="-3" r=".9" fill="#7A4A1E"/><circle cx="2.2" cy="-3" r=".9" fill="#7A4A1E"/></g>`,
  gingembre: (c = "#FFD98A") => `<g><ellipse rx="7" ry="5" fill="${c}" stroke="#E9A93A" stroke-width="1.2"/><circle r="1.6" fill="#E9A93A"/></g>`,
};
const piece = (nom: string, x: number, y: number, rot = 0, ech = 1) => `<g transform="translate(${r2(x)} ${r2(y)}) rotate(${Math.round(rot)}) scale(${ech})">${M[nom]()}</g>`;

// ---------------------------------------------------------------- Bain de Minuit

const N = { nuit: "#0A0F3D", eau: "#16237A", lune: "#FFE98A" };
/** La lune (une tranche de citron), la ligne de l'eau, les morceaux qui plongent. */
export function sceneNuit(fruits: string[], eau: string, o: { l?: number; h?: number; graine?: number } = {}): Art {
  const l = o.l ?? 320, h = o.h ?? 250, rnd = alea(o.graine ?? 5), flot = h * 0.46;
  const plongeurs = [0, 1, 2, 3, 4, 5].map((i) => { const x = 30 + rnd() * (l - 60), y = flot + 14 + rnd() * (h - flot - 34); return `${piece(fruits[i % fruits.length], x, y, rnd() * 360, 0.9)}<circle cx="${r2(x + 6)}" cy="${r2(y - 16)}" r="2" fill="#FFFFFF" fill-opacity=".5"/><circle cx="${r2(x + 10)}" cy="${r2(y - 26)}" r="1.3" fill="#FFFFFF" fill-opacity=".4"/>`; }).join("");
  const auDessus = [0, 1].map((i) => piece(fruits[i], l * (0.3 + i * 0.32), flot - 22 - i * 16, 20 + i * 70, 0.9)).join("");
  const etoiles = [[30, 26], [78, 60], [150, 22], [210, 70], [260, 34], [296, 84], [120, 88]].map(([x, y]) => `<circle cx="${r2((x / 320) * l)}" cy="${r2((y / 250) * h * 0.9)}" r="1.3" fill="#FFFFFF" fill-opacity=".7"/>`).join("");
  return art(`0 0 ${l} ${h}`, `<defs><linearGradient id="eau" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${eau}" stop-opacity=".95"/><stop offset="1" stop-color="${N.eau}"/></linearGradient><filter id="lueur" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="9"/></filter></defs>
<rect width="${l}" height="${h}" fill="${N.nuit}"/>${etoiles}
<circle cx="${r2(l * 0.78)}" cy="${r2(h * 0.2)}" r="${r2(Math.min(26, h / 6.6))}" fill="${N.lune}" filter="url(#lueur)" opacity=".55"/><g transform="translate(${r2(l * 0.78)} ${r2(h * 0.2)}) scale(${r2(Math.min(2.3, h / 75))})">${M.citron(N.lune)}</g>
${auDessus}<rect x="0" y="${r2(flot)}" width="${l}" height="${r2(h - flot)}" fill="url(#eau)"/>
<path d="M0 ${r2(flot)} Q ${r2(l * 0.125)} ${r2(flot - 5)} ${r2(l * 0.25)} ${r2(flot)} T ${r2(l * 0.5)} ${r2(flot)} T ${r2(l * 0.75)} ${r2(flot)} T ${l} ${r2(flot)}" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="2"/>${plongeurs}`);
}
/** La lune seule : une tranche de citron dans son halo (sur fond transparent). */
export const lune = (): Art => art("-40 -40 80 80", `<defs><filter id="halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="6"/></filter></defs><circle r="24" fill="${N.lune}" opacity=".45" filter="url(#halo)"/><g transform="scale(2.5)">${M.citron(N.lune)}</g>`);
/** La ligne de l'eau qui coupe l'image en deux, deux morceaux dessous. */
export const ligneEau = (eau: string): Art => art("0 0 100 70", `<defs><linearGradient id="bas" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${eau}"/><stop offset="1" stop-color="${N.eau}"/></linearGradient></defs><rect x="0" y="32" width="100" height="38" fill="url(#bas)"/><path d="M0 32 Q 12 27 25 32 T 50 32 T 75 32 T 100 32" fill="none" stroke="#FFFFFF" stroke-width="2"/>${piece("fraise", 34, 50, 20, 0.9)}${piece("feuille", 68, 56, -30, 0.8)}`);
/** La réglette du temps : trois barres de plus en plus pleines. */
export const reglette = (c: string): Art => art("0 0 120 60", [0.35, 0.65, 1].map((o, i) => `<rect x="${6 + i * 38}" y="${30 - i * 9}" width="32" height="${12 + i * 9}" rx="6" fill="${c}" fill-opacity="${o}"/><circle cx="${22 + i * 38}" cy="52" r="2.4" fill="${c}" fill-opacity="${o}"/>`).join(""));
/** Publication : la lune en haut à droite, rien d'autre (le texte se pose en bas). */
export const posteLune = (): Art => art("0 0 100 92", `<defs><filter id="h" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5"/></filter></defs><circle cx="74" cy="26" r="17" fill="${N.lune}" opacity=".4" filter="url(#h)"/><g transform="translate(74 26) scale(1.5)">${M.citron(N.lune)}</g>${[[14, 16], [34, 40], [52, 12], [20, 62]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#FFFFFF" fill-opacity=".7"/>`).join("")}`);
/** Publication : la ligne de l'eau et les morceaux qui viennent de plonger. */
export const postePlouf = (): Art => art("0 0 100 92", `<path d="M0 34 Q 12 29 25 34 T 50 34 T 75 34 T 100 34" fill="none" stroke="#FFFFFF" stroke-width="1.8"/>${piece("peche", 30, 58, 30, 1)}${piece("feuille", 64, 74, -20, 0.9)}${piece("peche", 76, 52, 200, 0.8)}<circle cx="36" cy="42" r="1.6" fill="#FFFFFF" fill-opacity=".6"/><circle cx="80" cy="40" r="1.2" fill="#FFFFFF" fill-opacity=".5"/>`);

// ---------------------------------------------------------------- Lâche le Morceau

const ENCRE = "#15122B";
/** Des morceaux de fruits qui tombent, chacun avec son trait de chute. */
export function chute(liste: string[], o: { l?: number; h?: number; graine?: number; ech?: number; fond?: [string, string] } = {}): Art {
  const l = o.l ?? 300, h = o.h ?? 220, ech = o.ech ?? 1.25, rnd = alea(o.graine ?? 3);
  const fond = o.fond ? `<defs><linearGradient id="ciel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.fond[0]}"/><stop offset="1" stop-color="${o.fond[1]}"/></linearGradient></defs><rect width="${l}" height="${h}" fill="url(#ciel)"/>` : "";
  return art(`0 0 ${l} ${h}`, fond + liste.map((f, i) => { const x = 24 + (i / liste.length) * (l - 48) + rnd() * 16, y = 30 + rnd() * (h - 58); return `<line x1="${r2(x)}" y1="${r2(y - 14 * ech - 12)}" x2="${r2(x)}" y2="${r2(y - 14 * ech)}" stroke="${ENCRE}" stroke-width="2" stroke-linecap="round" opacity=".35"/>${piece(f, x, y, rnd() * 360, ech)}`; }).join(""));
}
const FORME = "M-30 -8 C-28 -30 -4 -36 14 -30 C34 -24 38 -2 30 16 C22 34 -6 36 -22 26 C-34 18 -32 6 -30 -8Z";
/** La fenêtre en forme de morceau : on voit les fruits au travers. */
export function fenetre(fruits: string[], o: { graine?: number; fond?: string } = {}): Art {
  const rnd = alea(o.graine ?? 4);
  const dedans = Array.from({ length: 14 }, (_u, i) => piece(fruits[i % fruits.length], (rnd() - 0.5) * 64, (rnd() - 0.5) * 64, rnd() * 360, 1.05)).join("");
  return art("-44 -44 88 88", `<defs><clipPath id="fen"><path d="${FORME}"/></clipPath></defs>${o.fond ? `<rect x="-44" y="-44" width="88" height="88" fill="${o.fond}"/>` : ""}<path d="${FORME}" fill="#FFF7D6"/><g clip-path="url(#fen)">${dedans}</g><path d="${FORME}" fill="none" stroke="${ENCRE}" stroke-width="2.5"/>`);
}
/** Le devant du sachet : la fenêtre à droite, deux morceaux qui tombent, le bas gauche laissé calme pour l'aveu. */
export function devantFenetre(fruits: string[], o: { graine?: number } = {}): Art {
  const rnd = alea(o.graine ?? 6);
  const dedans = Array.from({ length: 14 }, (_u, i) => piece(fruits[i % fruits.length], (rnd() - 0.5) * 64, (rnd() - 0.5) * 64, rnd() * 360, 1.05)).join("");
  return art("0 0 190 130", `<defs><clipPath id="fen"><path d="${FORME}"/></clipPath></defs><rect width="190" height="130" fill="#FFFDF5"/>
<g transform="translate(128 60) scale(1.3)"><path d="${FORME}" fill="#FFF7D6"/><g clip-path="url(#fen)">${dedans}</g><path d="${FORME}" fill="none" stroke="${ENCRE}" stroke-width="2"/></g>
<line x1="34" y1="14" x2="34" y2="26" stroke="${ENCRE}" stroke-width="2" stroke-linecap="round" opacity=".35"/>${piece(fruits[0], 34, 44, 30, 1.3)}<line x1="62" y1="40" x2="62" y2="52" stroke="${ENCRE}" stroke-width="2" stroke-linecap="round" opacity=".35"/>${piece(fruits[1], 62, 68, -40, 1.1)}`);
}
/** La tranche ronde qui remplace le O du nom. */
export const tranche = (): Art => art("-12 -12 24 24", M.citron());
/** Publication : trois morceaux d'agrumes posés en haut. */
export const posteAgrumes = (): Art => art("0 0 100 92", piece("citron", 30, 28, 0, 1.6) + piece("gingembre", 70, 46, 30, 1.5) + piece("citron", 46, 70, 40, 1.2));

// ---------------------------------------------------------------- L'Eau Est Bonne

/** La piscine vue du dessus : l'eau, les reflets, une bouée, des fruits qui flottent. */
export const piscine = (): Art => art("0 0 320 250", `<defs><linearGradient id="bassin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FE3D0"/><stop offset="1" stop-color="#0B7A5C"/></linearGradient></defs><rect width="320" height="250" fill="url(#bassin)"/>
${[[20, 50, 120], [150, 90, 140], [40, 170, 110], [190, 200, 100]].map(([x, y, w]) => `<path d="M${x} ${y} q ${w / 4} -10 ${w / 2} 0 t ${w / 2} 0" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`).join("")}
<circle cx="226" cy="92" r="44" fill="#FF7A59"/><circle cx="226" cy="92" r="22" fill="#7FE3D0"/>${[0, 90, 180, 270].map((a) => `<rect x="-6" y="-45" width="12" height="23" fill="#FFFFFF" transform="translate(226 92) rotate(${a})"/>`).join("")}
${piece("fraise", 84, 120, 20, 2)}${piece("petale", 130, 196, 60, 1.8)}${piece("baie", 262, 190, 0, 2)}${piece("feuille", 60, 210, -20, 1.6)}`);
