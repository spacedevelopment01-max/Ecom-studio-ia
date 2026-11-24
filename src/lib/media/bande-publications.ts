/**
 * LA BANDE DES PUBLICATIONS, sa géométrie seule (méthode des publications du 24 novembre 2026) : les trois publications
 * à MÊME HAUTEUR, chacune à son rapport EXACT (1:1, 4:5, 9:16), sans recadrage ni agrandissement, posées dans un
 * rectangle donné. Sert au fichier de la planche (planche-publications.ts, identity-board.ts), à la planche à l'écran
 * (brand-boards.tsx) et, plus tard, à la case « 07 réseaux sociaux (1:1, 4:5, 9:16) » d'un gabarit fixe de la planche.
 * Module pur : aucun fichier, aucune image, aucune bibliothèque.
 */
export type Taille = { w: number; h: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Placement = Rect;

const pgcd = (a: number, b: number): number => (b ? pgcd(b, a % b) : a);
const ppcm = (a: number, b: number): number => (a / pgcd(a, b)) * b;

/** Le pas de hauteur pour lequel chaque largeur tombe juste (ex. 1:1, 4:5, 9:16 : un multiple de 80). */
export function pasDeHauteur(tailles: readonly Taille[]): number {
  return tailles.reduce((p, t) => ppcm(p, t.h / pgcd(t.w, t.h)), 1);
}

/**
 * Où poser chaque publication dans `rect` : même hauteur, rapports exacts (largeur × h = hauteur × w), la plus grande
 * hauteur qui tient, centrée. `ecart` entre deux publications. `maxHauteur` : jamais plus grand que les fichiers (aucun
 * agrandissement). Rien ne tient : [].
 */
export function bandeDesPublications(tailles: readonly Taille[], rect: Rect, o: { ecart?: number; maxHauteur?: number } = {}): Placement[] {
  if (!tailles.length) return [];
  const ecart = o.ecart ?? 0, pas = pasDeHauteur(tailles);
  const sommeRapports = tailles.reduce((s, t) => s + t.w / t.h, 0);
  const plafond = Math.min(rect.h, (rect.w - ecart * (tailles.length - 1)) / sommeRapports, o.maxHauteur ?? Infinity, ...tailles.map((t) => t.h));
  const H = Math.floor(plafond / pas) * pas;
  if (H <= 0) return [];
  const largeurs = tailles.map((t) => (H * t.w) / t.h);
  const total = largeurs.reduce((s, w) => s + w, 0) + ecart * (tailles.length - 1);
  let x = rect.x + Math.floor((rect.w - total) / 2);
  const y = rect.y + Math.floor((rect.h - H) / 2);
  return largeurs.map((w) => { const p = { x, y, w, h: H }; x += w + ecart; return p; });
}

/** Le rapport d'une taille, réduit (« 4:5 »). */
export const rapportDe = (t: Taille): string => { const g = pgcd(t.w, t.h); return `${t.w / g}:${t.h / g}`; };

/** Les trois formats finaux exacts de la méthode, dans l'ordre de la planche. */
export const TAILLES_DE_LA_METHODE: readonly Taille[] = [{ w: 1080, h: 1080 }, { w: 1080, h: 1350 }, { w: 1080, h: 1920 }];
/** Ces trois images sont-elles les publications de la méthode (les trois formats exacts, dans l'ordre) ? */
export const sontLesPublicationsDeLaMethode = (tailles: readonly (Taille | null | undefined)[]): boolean =>
  tailles.length === 3 && tailles.every((t, i) => !!t && t.w === TAILLES_DE_LA_METHODE[i].w && t.h === TAILLES_DE_LA_METHODE[i].h);
