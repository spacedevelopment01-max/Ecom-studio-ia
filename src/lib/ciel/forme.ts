/**
 * La forme d'une constellation : le projet au milieu, une branche par étape (les neuf), jamais symétrique, et aucune
 * ne ressemble à une autre. La forme est tirée du projet (sa graine), comparée à toutes les autres — y compris quand
 * on fait pivoter le ciel ou qu'on le regarde en miroir — et refaite si elle ressemble trop à l'une d'elles.
 * Tout est calculé par le Studio : aucun appel à l'IA.
 */

/**
 * Une branche : d'où elle part (-1 : du cœur ; sinon de l'étoile d'une étape d'avant), où elle mène (par rapport à son
 * départ, en rayons de constellation), la taille de son étoile, les petites étoiles autour (0 à 3).
 */
export type Branche = { parent: number; dx: number; dy: number; s: number; tw: number };
export type Forme = Branche[];
export type Point = { x: number; y: number };

export const NB_ETOILES = 9;
/** En dessous de cet écart, deux constellations se ressemblent trop. */
export const ECART_MIN = 0.16;
/** Aucune étoile plus loin du cœur que cela (en rayons) : la constellation tient dans son cadre. */
export const PORTEE = 1.2;
const ESSAIS_MAX = 80;

/** Tirage reproductible à partir d'un texte. */
export function graine(texte: string): () => number {
  let h = 2166136261 >>> 0;
  for (const c of texte) { h ^= c.codePointAt(0)!; h = Math.imul(h, 16777619) >>> 0; }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}

const DEG = Math.PI / 180;

/**
 * Une forme tirée d'une graine et d'un numéro d'essai : éventail, éclat, chaîne, deux grappes, spirale… Les étapes se
 * suivent autour du cœur, dans un sens ou l'autre ; certaines branches repartent de l'étoile d'une étape d'avant. Deux
 * étoiles ne sont jamais collées : chaque nom a la place de s'écrire.
 */
export function formeDe(nom: string, essai = 0): Forme {
  const r = graine(`${nom}#${essai}`);
  const sens = r() < 0.5 ? 1 : -1, depart = r() * 2 * Math.PI;
  const ouverture = (150 + r() * 190) * DEG, chaine = [0, 0.18, 0.32, 0.48][Math.floor(r() * 4)], torsion = (r() - 0.5) * 0.3, allonge = 0.78 + r() * 0.5, grappes = r() < 0.3;
  const forme: Forme = [], pts: Point[] = [];
  for (let i = 0; i < NB_ETOILES; i++) {
    let b: Branche = { parent: -1, dx: 0, dy: 0, s: 1, tw: 0 }, p: Point = { x: 0, y: 0 }, libre = -1;
    // On retire la branche tant qu'elle pose son étoile trop près d'une autre ou du cœur, ou hors du cadre ; à défaut,
    // on garde le tirage qui laisse le plus de place.
    for (let k = 0; k < 40; k++) {
      let parent = -1, a: number, l: number;
      if (i > 0 && r() < chaine) { parent = r() < 0.7 ? i - 1 : Math.floor(r() * i); const o = pts[parent]; a = Math.atan2(o.y, o.x) + (r() - 0.5) * 2.2; l = 0.3 + r() * 0.3; }
      else { const u = grappes ? (i < 5 ? (i / 4) * 0.36 : 0.64 + ((i - 5) / 3) * 0.36) : i / 8; a = depart + sens * (ouverture * u + torsion * i) + (r() - 0.5) * 0.4; l = 0.46 + r() * 0.7; }
      const dx = Math.cos(a) * l * allonge, dy = (Math.sin(a) * l) / allonge, o = parent < 0 ? { x: 0, y: 0 } : pts[parent], q = { x: o.x + dx, y: o.y + dy };
      const marge = Math.min(Math.hypot(q.x, q.y) - 0.12, PORTEE - Math.hypot(q.x, q.y) + 0.3, ...pts.map((z) => Math.hypot(z.x - q.x, z.y - q.y)));
      if (marge > libre) { libre = marge; b = { parent, dx, dy, s: 0.7 + r() * 0.8, tw: Math.floor(r() * 4) }; p = q; }
      if (marge >= 0.3) break;
    }
    forme.push(b); pts.push(p);
  }
  return forme;
}

/** Les neuf étoiles, le cœur étant en (0, 0) ; au besoin tournées autour du cœur ou vues en miroir. */
export function silhouette(f: Forme, tour = 0, miroir = false): Point[] {
  const pts: Point[] = [];
  f.forEach((b) => { const o = b.parent < 0 ? { x: 0, y: 0 } : pts[b.parent]; pts.push({ x: o.x + b.dx, y: o.y + b.dy }); });
  if (!tour && !miroir) return pts;
  const c = Math.cos(tour), s = Math.sin(tour);
  return pts.map((p) => { const y = miroir ? -p.y : p.y; return { x: p.x * c - y * s, y: p.x * s + y * c }; });
}

/** Écart moyen entre deux nuages de points : pour chaque étoile de l'un, la plus proche de l'autre, dans les deux sens. */
function distance(A: Point[], B: Point[]): number {
  let total = 0;
  for (let sensAB = 0; sensAB < 2; sensAB++) {
    const P = sensAB ? B : A, Q = sensAB ? A : B;
    let somme = 0;
    for (let i = 0; i < P.length; i++) {
      let mini = Infinity;
      for (let j = 0; j < Q.length; j++) { const dx = P[i].x - Q[j].x, dy = P[i].y - Q[j].y, d2 = dx * dx + dy * dy; if (d2 < mini) mini = d2; }
      somme += Math.sqrt(mini);
    }
    total += somme / P.length;
  }
  return total / 2;
}

/** Une forme sous tous ses angles : tournée de dix degrés en dix degrés, à l'endroit et en miroir. */
function angles(f: Forme): Point[][] {
  const vues: Point[][] = [];
  for (const miroir of [false, true]) for (let k = 0; k < 36; k++) vues.push(silhouette(f, k * 10 * DEG, miroir));
  return vues;
}

function ecartVues(vues: Point[][], B: Point[], stop = 0): number {
  let mini = Infinity;
  for (const A of vues) { const e = distance(A, B); if (e < mini) { mini = e; if (mini < stop) break; } }
  return mini;
}

/** L'écart entre deux formes : le plus petit trouvé en faisant pivoter l'une d'elles, à l'endroit et en miroir. */
export function ecart(a: Forme, b: Forme): number {
  return ecartVues(angles(a), silhouette(b));
}

/** Jamais symétrique : la forme ne se superpose ni à son miroir, ni à elle-même tournée d'une fraction de tour. */
export function asymetrique(f: Forme): boolean {
  const A = silhouette(f);
  for (let k = 0; k < 36; k++) if (distance(A, silhouette(f, k * 10 * DEG, true)) < 0.07) return false;
  for (let k = 2; k <= NB_ETOILES; k++) if (distance(A, silhouette(f, (2 * Math.PI) / k)) < 0.07) return false;
  return true;
}

/**
 * La forme d'un projet : la première tirée de sa graine qui ne ressemble à aucune des autres. Si le ciel est si plein
 * qu'aucun essai ne passe, on garde l'essai le plus éloigné de toutes les autres.
 */
export function formeUnique(nom: string, autres: Forme[]): { forme: Forme; essai: number } {
  const nuages = autres.map((o) => silhouette(o));
  let meilleur = { forme: formeDe(nom, 0), essai: 0, ecart: -1 };
  for (let essai = 0; essai < ESSAIS_MAX; essai++) {
    const forme = formeDe(nom, essai);
    if (!asymetrique(forme)) continue;
    const vues = angles(forme);
    let mini = Infinity;
    // Dès qu'une autre est trop proche (ou plus proche que le meilleur essai gardé), inutile d'aller plus loin.
    for (const B of nuages) { mini = Math.min(mini, ecartVues(vues, B, Math.min(ECART_MIN, Math.max(meilleur.ecart, 0)))); if (mini < ECART_MIN && mini <= meilleur.ecart) break; }
    if (mini >= ECART_MIN) return { forme, essai };
    if (mini > meilleur.ecart) meilleur = { forme, essai, ecart: mini };
  }
  return { forme: meilleur.forme, essai: meilleur.essai };
}

/** Une forme lue dans la base est-elle bien une forme ? */
export function estForme(v: unknown): v is Forme {
  return Array.isArray(v) && v.length === NB_ETOILES && v.every((b, i) => b && [b.parent, b.dx, b.dy, b.s, b.tw].every((n) => typeof n === "number" && Number.isFinite(n)) && Number.isInteger(b.parent) && b.parent >= -1 && b.parent < i);
}
