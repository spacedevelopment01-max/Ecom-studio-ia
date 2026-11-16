/**
 * Le moteur du ciel : un vrai ciel de nuit, vivant en permanence, où chaque projet est une constellation.
 *
 * Il dessine (voie lactée, nébuleuses, galaxies lointaines, étoiles de vraies couleurs, étoiles filantes, soleils aux
 * couleurs des marques, lumière de SINA) et il place sur les étoiles les boutons et les noms écrits par la page : les
 * noms restent donc toujours du vrai texte, lisible sans le dessin. On s'y promène en glissant, on zoome, on pivote.
 *
 * Sans React ni rien du Studio : le même moteur sert dans le Studio et sur la page d'essai envoyée au propriétaire.
 * Version allégée pour les téléphones modestes : moins d'étoiles, textures plus petites, pas de nébuleuses animées,
 * moins d'images par seconde ; elle se choisit seule (appareil modeste, ou dessin trop lent) et garde tous les noms
 * et tous les clics.
 */
import { graine, silhouette, type Forme } from "@/lib/ciel/forme";
import type { Couleurs, EtatEtoile } from "@/lib/ciel/vue";

export type Astre = {
  id: string;
  /** moi : le projet ouvert · mien : un autre de mes projets · nouveau : la constellation éteinte du prochain projet. */
  type: "moi" | "mien" | "nouveau";
  x: number; y: number;
  couleurs: Couleurs | null;
  forme: Forme;
  etats: EtatEtoile[];
  /** En grand, au centre, avec le nom de ses neuf étoiles (l'accueil du nouveau client : « Nouveau projet » seule). */
  grand?: boolean;
};
export type DonneesCiel = { astres: Astre[]; /** L'étoile où SINA travaille (0 à 8), ou null : elle est au cœur. */ sina: number | null };
export type OptionsCiel = { leger?: boolean | "auto"; calme?: boolean; surLeger?: (leger: boolean) => void; /** On arrive de loin : le ciel s'approche tout seul. */ arrivee?: boolean };
export type Ciel = {
  maj(d: DonneesCiel): void;
  /** Ouvre une étoile (0 à 8) : le ciel s'en approche et lui laisse la place du volet ; null : retour au ciel. */
  ouvrir(etoile: number | null): void;
  zoom(facteur: number): void;
  tourner(radians: number): void;
  /** Revient sur le projet ouvert, ou montre tous les projets du compte. */
  cadrer(quoi: "moi" | "tout"): void;
  detruire(): void;
  readonly leger: boolean;
};

const BLEU: Couleurs = ["#FFFFFF", "#7C9CFF", "#2F5BEA"];
const BRIN: Record<number, number[]> = { 1: [50], 2: [-50, 48], 3: [-62, 40, 100] };
const rad = (d: number) => (d * Math.PI) / 180;
const lisse = (k: number) => k * k * (3 - 2 * k);
const fr = (k: number) => { const v = Math.sin(k * 12.9898) * 43758.5453; return v - Math.floor(v); };
const borne = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

type Toile = HTMLCanvasElement;
type Univers = {
  T: number;
  SP: Record<string, Toile>;
  COUL: string[];
  couches: { c: Toile; f: number }[];
  voie: Toile;
  nebuleuses: { c: Toile; x: number; y: number; t: number; f: number }[];
  galaxies: { c: Toile; x: number; y: number; s: number; inc: number; a: number; f: number }[];
  rayons: Toile;
  soleil(c: Couleurs): Toile;
};

const univers: { plein?: Univers; leger?: Univers } = {};

/** Les textures du ciel, créées une seule fois par qualité, puis seulement recopiées à chaque image. */
function creerUnivers(leger: boolean): Univers {
  const cle = leger ? "leger" : "plein";
  if (univers[cle]) return univers[cle]!;
  const toile = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
  const ctx = (c: Toile) => c.getContext("2d")!;
  function bruit(texte: string) {
    const r = graine(texte), perm = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
    const p = [...perm, ...perm], g = perm.map(() => r()), f = (t: number) => t * t * (3 - 2 * t), l = (a: number, b: number, t: number) => a + (b - a) * t;
    const v = (x: number, y: number) => {
      const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
      return l(l(g[p[xi + p[yi]]], g[p[xi + 1 + p[yi]]], f(xf)), l(g[p[xi + p[yi + 1]]], g[p[xi + 1 + p[yi + 1]]], f(xf)), f(yf));
    };
    return (x: number, y: number, o = 5) => { let s = 0, a = 0.5, q = 1; for (let i = 0; i < o; i++) { s += v(x * q, y * q) * a; q *= 2.03; a *= 0.5; } return s; };
  }
  // Une vraie étoile : cœur blanc, halo de sa couleur, reflets en croix.
  function sprite(col: string, n = 64, pointes = 1) {
    const c = toile(n, n), x = ctx(c), m = n / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.05, `rgba(${col},1)`); g.addColorStop(0.14, `rgba(${col},.42)`); g.addColorStop(0.35, `rgba(${col},.1)`); g.addColorStop(1, `rgba(${col},0)`);
    x.fillStyle = g; x.fillRect(0, 0, n, n);
    if (pointes) {
      x.globalCompositeOperation = "lighter";
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const lg = x.createLinearGradient(m - dx * m, m - dy * m, m + dx * m, m + dy * m);
        lg.addColorStop(0, `rgba(${col},0)`); lg.addColorStop(0.5, `rgba(255,255,255,${0.85 * pointes})`); lg.addColorStop(1, `rgba(${col},0)`);
        x.strokeStyle = lg; x.lineWidth = Math.max(1, n / 70); x.beginPath(); x.moveTo(m - dx * m, m - dy * m); x.lineTo(m + dx * m, m + dy * m); x.stroke();
      }
    }
    return c;
  }
  // Les couleurs des vraies étoiles, des bleues très chaudes aux orangées, dans leurs proportions.
  const COUL = ["155,176,255", "175,195,255", "202,215,255", "236,240,255", "255,248,240", "255,236,214", "255,214,170", "255,190,140"];
  const POIDS = [0.1, 0.14, 0.2, 0.22, 0.14, 0.1, 0.06, 0.04];
  const couleur = (r: () => number) => { let u = r(), i = 0; while (i < POIDS.length - 1 && u > POIDS[i]) { u -= POIDS[i]; i++; } return COUL[i]; };
  const SP: Record<string, Toile> = {};
  for (const c of COUL) { SP[c] = sprite(c, 64, 1); SP[c + "doux"] = sprite(c, 32, 0); }
  SP.blanc = sprite("255,255,255", 64, 0);

  // Trois profondeurs d'étoiles, en tuiles qui se répètent.
  const T = leger ? 900 : 1600, q = leger ? 0.36 : 1;
  const plans: [number, number, number, number, string][] = leger
    ? [[1400 * q, 70 * q, 2, 0.06, "lointaines"], [240, 22, 3, 0.26, "proches"]]
    : [[1400, 70, 2, 0.05, "lointaines"], [520, 40, 5, 0.14, "moyennes"], [130, 16, 4, 0.32, "proches"]];
  const couches = plans.map(([points, petites, brillantes, f, nom]) => {
    const c = toile(T, T), x = ctx(c), r = graine(nom);
    for (let i = 0; i < points; i++) { const col = couleur(r); x.globalAlpha = 0.15 + r() * r() * 0.85; x.fillStyle = `rgb(${col})`; const s = r() < 0.9 ? 1 : 1.6; x.fillRect(r() * T, r() * T, s, s); }
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < petites; i++) { const col = couleur(r), s = 6 + r() * 10; x.globalAlpha = 0.5 + r() * 0.5; x.drawImage(SP[col + "doux"], r() * T - s / 2, r() * T - s / 2, s, s); }
    for (let i = 0; i < brillantes; i++) { const col = couleur(r), s = 26 + r() * 30; x.globalAlpha = 0.8 + r() * 0.2; x.drawImage(SP[col], r() * T - s / 2, r() * T - s / 2, s, s); }
    return { c, f };
  });

  // La voie lactée : nuages de lumière, bandes sombres de poussière, poussière d'étoiles.
  const VW = leger ? 1300 : 2600, VH = leger ? 475 : 950, voie = toile(VW, VH);
  {
    const x = ctx(voie), n1 = bruit("voie"), n2 = bruit("poussiere"), lw = leger ? 200 : 320, lh = leger ? 74 : 118, bas = toile(lw, lh), bx = ctx(bas), img = bx.createImageData(lw, lh);
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const u = i / lw, v = j / lh, bande = Math.exp(-(((v - 0.5) / 0.16) ** 2)), centre = Math.exp(-(((u - 0.55) / 0.2) ** 2));
      const n = n1(u * 7, v * 3.2), dens = bande * Math.max(0, 0.2 + 1.1 * n - 0.25), a = Math.min(1, Math.pow(dens, 1.5) * 1.15), k = (j * lw + i) * 4;
      img.data[k] = 110 + 145 * centre * n; img.data[k + 1] = 120 + 90 * centre; img.data[k + 2] = 220 - 70 * centre; img.data[k + 3] = a * 210;
    }
    bx.putImageData(img, 0, 0); x.imageSmoothingQuality = "high"; x.drawImage(bas, 0, 0, VW, VH);
    const ombre = toile(lw, lh), ox = ctx(ombre), im2 = ox.createImageData(lw, lh);
    for (let j = 0; j < lh; j++) for (let i = 0; i < lw; i++) {
      const u = i / lw, v = j / lh, couloir = Math.exp(-(((v - 0.5 - 0.035 * Math.sin(u * 11)) / 0.055) ** 2)), k = (j * lw + i) * 4;
      im2.data[k + 3] = Math.min(255, couloir * Math.max(0, n2(u * 16, v * 9) - 0.3) * 2.2 * 255);
    }
    ox.putImageData(im2, 0, 0); x.globalCompositeOperation = "destination-out"; x.drawImage(ombre, 0, 0, VW, VH);
    x.globalCompositeOperation = "lighter";
    const r = graine("etoiles de la voie");
    for (let i = 0; i < (leger ? 4200 : 16000); i++) { const u = r(), g = (r() + r() + r() + r() - 2) * 0.22, col = couleur(r); x.globalAlpha = (0.12 + r() * 0.6) * Math.exp(-((g / 0.2) ** 2)); x.fillStyle = `rgb(${col})`; x.fillRect(u * VW, (0.5 + g) * VH, 1, 1); }
    for (let i = 0; i < (leger ? 80 : 260); i++) { const u = r(), g = (r() + r() + r() - 1.5) * 0.16, col = couleur(r), s = (5 + r() * 9) * (leger ? 0.6 : 1); x.globalAlpha = 0.6 + r() * 0.4; x.drawImage(SP[col + "doux"], u * VW - s / 2, (0.5 + g) * VH - s / 2, s, s); }
  }

  // Nébuleuses colorées.
  type RVB = [number, number, number];
  function nebuleuse(nom: string, c1: RVB, c2: RVB, c3: RVB) {
    const n = leger ? 240 : 460, c = toile(n, n), x = ctx(c), b = bruit(nom), lw = leger ? 96 : 150, bas = toile(lw, lw), bx = ctx(bas), img = bx.createImageData(lw, lw);
    for (let j = 0; j < lw; j++) for (let i = 0; i < lw; i++) {
      const u = i / lw - 0.5, v = j / lw - 0.5, rr = Math.hypot(u, v) * 2, chute = Math.max(0, 1 - Math.pow(rr, 1.4)), q1 = b(u * 3.4 + 7, v * 3.4 + 3), q2 = b(u * 8 + 1, v * 8 + 9, 4);
      const a = Math.pow(Math.max(0, q1 - 0.32) * 2.4, 1.6) * chute, m = Math.min(1, q2 * 1.4), k = (j * lw + i) * 4;
      const [de, vers, part] = m < 0.5 ? [c1, c2, m * 2] : [c2, c3, (m - 0.5) * 2];
      for (let z = 0; z < 3; z++) img.data[k + z] = de[z] + (vers[z] - de[z]) * part;
      img.data[k + 3] = Math.min(255, a * 230);
    }
    bx.putImageData(img, 0, 0); x.imageSmoothingQuality = "high"; x.drawImage(bas, 0, 0, n, n);
    x.globalCompositeOperation = "lighter";
    const r = graine(nom + "*");
    for (let i = 0; i < 14; i++) { const s = (6 + r() * 16) * (n / 460), col = couleur(r); x.globalAlpha = 0.7; x.drawImage(SP[col + "doux"], n / 2 + (r() - 0.5) * n * 0.5 - s / 2, n / 2 + (r() - 0.5) * n * 0.5 - s / 2, s, s); }
    return c;
  }
  const nebuleuses = [
    { c: nebuleuse("rose", [120, 30, 90], [230, 90, 150], [255, 200, 220]), x: -1250, y: -380, t: 1500, f: 0.45 },
    { c: nebuleuse("bleue", [20, 60, 130], [60, 160, 220], [190, 240, 255]), x: 1650, y: -950, t: 1700, f: 0.4 },
    ...(leger ? [] : [
      { c: nebuleuse("ambre", [110, 40, 20], [230, 120, 60], [255, 220, 170]), x: 250, y: 1750, t: 1400, f: 0.5 },
      { c: nebuleuse("violette", [50, 20, 110], [140, 90, 230], [220, 200, 255]), x: -2600, y: 1300, t: 1600, f: 0.42 },
    ]),
  ];

  // Galaxies lointaines.
  function galaxie(nom: string, col: string) {
    const w = 220, c = toile(w, w), x = ctx(c), r = graine(nom);
    x.globalCompositeOperation = "lighter";
    const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,245,230,.9)"); g.addColorStop(0.12, `rgba(${col},.35)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, w, w);
    for (let bras = 0; bras < 2; bras++) for (let i = 0; i < 900; i++) { const tt = r() * 3.4, a = tt * 1.9 + bras * Math.PI, rr = 6 + tt * 26 + (r() - 0.5) * 10; x.globalAlpha = 0.25 * (1 - tt / 3.6); x.fillStyle = `rgb(${col})`; x.fillRect(w / 2 + Math.cos(a) * rr, w / 2 + Math.sin(a) * rr, 1.2, 1.2); }
    return c;
  }
  const galaxies = leger ? [{ c: galaxie("g1", "190,200,255"), x: 2300, y: 1500, s: 120, inc: 0.35, a: 0.5, f: 0.06 }] : [
    { c: galaxie("g1", "190,200,255"), x: 2300, y: 1500, s: 120, inc: 0.35, a: 0.5, f: 0.06 },
    { c: galaxie("g2", "255,220,190"), x: -2900, y: -1800, s: 90, inc: 0.5, a: -0.6, f: 0.05 },
    { c: galaxie("g3", "200,190,255"), x: 900, y: -2600, s: 70, inc: 0.25, a: 1.2, f: 0.07 },
  ];

  // Le cœur d'un projet : un soleil aux couleurs de sa marque.
  const soleils: Record<string, Toile> = {};
  const triplet = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(",");
  function soleil(c: Couleurs) {
    const cle2 = c.join();
    if (soleils[cle2]) return soleils[cle2];
    const n = 160, cv = toile(n, n), x = ctx(cv), m = n / 2;
    const g = x.createRadialGradient(m, m, 0, m, m, m);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.04, "rgba(255,255,255,1)"); g.addColorStop(0.09, `rgba(${triplet(c[0])},1)`); g.addColorStop(0.17, `rgba(${triplet(c[1])},.95)`); g.addColorStop(0.32, `rgba(${triplet(c[1])},.45)`); g.addColorStop(0.58, `rgba(${triplet(c[2])},.16)`); g.addColorStop(1, `rgba(${triplet(c[2])},0)`);
    x.fillStyle = g; x.fillRect(0, 0, n, n); x.globalCompositeOperation = "lighter";
    for (const [dx, dy, f] of [[1, 0, 1], [0, 1, 1], [0.707, 0.707, 0.4], [0.707, -0.707, 0.4]]) {
      const lg = x.createLinearGradient(m - dx * m, m - dy * m, m + dx * m, m + dy * m);
      lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(0.5, `rgba(255,255,255,${0.5 * f})`); lg.addColorStop(1, "rgba(255,255,255,0)");
      x.strokeStyle = lg; x.lineWidth = 1.6; x.beginPath(); x.moveTo(m - dx * m, m - dy * m); x.lineTo(m + dx * m, m + dy * m); x.stroke();
    }
    return (soleils[cle2] = cv);
  }
  const rayons = (() => {
    const n = 260, c = toile(n, n), x = ctx(c), m = n / 2, r = graine("rayons");
    x.globalCompositeOperation = "lighter";
    for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, l = m * (0.45 + r() * 0.55), lg = x.createLinearGradient(m, m, m + Math.cos(a) * l, m + Math.sin(a) * l); lg.addColorStop(0, "rgba(255,255,255,.16)"); lg.addColorStop(1, "rgba(255,255,255,0)"); x.strokeStyle = lg; x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(m, m); x.lineTo(m + Math.cos(a) * l, m + Math.sin(a) * l); x.stroke(); }
    return c;
  })();
  return (univers[cle] = { T, SP, COUL, couches, voie, nebuleuses, galaxies, rayons, soleil });
}

/** Un appareil modeste, d'après ce qu'il dit de lui : peu de mémoire, peu de cœurs, ou économie de données demandée. */
export function appareilModeste(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const tactile = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  return !!n.connection?.saveData || (n.deviceMemory !== undefined && n.deviceMemory <= 3) || (tactile && (n.hardwareConcurrency ?? 8) <= 4);
}

type Cam = { x: number; y: number; k: number; r: number };
type P2 = { x: number; y: number };
type Vue = { C: P2; P: P2[]; rc: number };

export function monterCiel(racine: HTMLElement, donnees: DonneesCiel, options: OptionsCiel = {}): Ciel {
  const cv = racine.querySelector("canvas") as HTMLCanvasElement, x = cv.getContext("2d")!;
  const calme = options.calme ?? (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let leger = options.leger === true || (options.leger !== false && appareilModeste());
  let U = creerUnivers(leger);
  let D = donnees;
  const boutons = [...racine.querySelectorAll<HTMLElement>("[data-etoile]")];
  const noms = () => [...racine.querySelectorAll<HTMLElement>("[data-astre]")];
  const volet = () => racine.querySelector<HTMLElement>("[data-volet]");

  let W = 1, H = 1, d = 1, etroit = false, R = 200, rx = 1.4, ry = 1;
  let S0: P2 = { x: 0, y: 0 }, maison: P2 = { x: 0, y: 0 };
  let cam: Cam = { x: 0, y: 0, k: 1, r: 0 }, cible: Cam | null = null, v = { x: 0, y: 0, r: 0 };
  const doigts = new Map<number, P2>();
  let maj = false, ouvert: number | null = null, souris: P2 = { x: 0, y: 0 }, dernierGeste = -99, temps = 0, vivant = true, visible = true, image = 0;
  let sina = { de: -1, vers: D.sina ?? -1, t0: -9 };
  let filante: { t0: number; x: number; y: number; vx: number; vy: number } | null = null, prochaine = 3;
  let scint: { x: number; y: number; col: string; s: number; v: number; p: number }[] = [];
  const tailles = new Map<HTMLElement, { w: number; h: number }>();
  let fondToile: HTMLCanvasElement | null = null, fondCle = "";

  /** La constellation principale : le projet ouvert, ou celle qu'on montre en grand ; aucune dans un ciel sans projet ouvert. */
  const moi = (): Astre | null => D.astres.find((a) => a.type === "moi") ?? D.astres.find((a) => a.grand) ?? null;
  /** La largeur et la hauteur d'une forme, cœur compris (en rayons) : la constellation est agrandie pour remplir l'écran. */
  const etendue = (f: Forme) => { const p = [{ x: 0, y: 0 }, ...silhouette(f)], xs = p.map((q) => q.x), ys = p.map((q) => q.y); return { l: Math.max(0.9, Math.max(...xs) - Math.min(...xs)), h: Math.max(0.9, Math.max(...ys) - Math.min(...ys)) }; };
  const rayonDe = (a: Astre) => (a === moi() ? R : Math.min(R * 0.72, 150));
  /** Les étoiles d'un astre, dans le ciel. Elles respirent un peu : rien n'est jamais tout à fait immobile. */
  function geo(a: Astre, t: number): { cx: number; cy: number; R: number; pts: P2[] } {
    const Ra = rayonDe(a), pr = a === moi(), ex = pr ? rx : 1.25, ey = pr ? ry : 0.95, drift = pr ? 3 : 2;
    return { cx: a.x, cy: a.y, R: Ra, pts: silhouette(a.forme).map((p, i) => ({ x: a.x + p.x * Ra * ex + (calme ? 0 : Math.sin(t * 0.35 + i * 1.7) * drift), y: a.y + p.y * Ra * ey + (calme ? 0 : Math.cos(t * 0.3 + i * 2.3) * drift) })) };
  }

  function mesurer() {
    const b = racine.getBoundingClientRect();
    W = Math.max(1, b.width); H = Math.max(1, b.height); etroit = W < 720;
    racine.toggleAttribute("data-etroit", etroit);
    d = Math.min(leger ? 1.25 : 2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
    // La constellation remplit l'écran : large sur un ordinateur, haute sur un téléphone, avec la place des noms.
    rx = etroit ? 1 : borne(W / H, 1, 1.55); ry = etroit ? borne(H / W / 1.25, 1, 1.45) : 0.95;
    const m = moi();
    // L'accueil du nouveau client garde la place de la visite guidée, en bas.
    const bas = racine.dataset.accueil === "nouveau" ? (etroit ? 110 : 150) : 0;
    if (m) {
      const e = etendue(m.forme), haut = H - bas - (etroit ? 300 : 192);
      R = borne(Math.min((W - (etroit ? 104 : 380)) / (e.l * rx), haut / (e.h * ry)), 80, 320);
      // Très peu de hauteur : la constellation garde sa taille minimale et s'aplatit pour tenir entre le titre et le bas.
      if (R * e.h * ry > haut) ry = Math.max(0.72, haut / (R * e.h));
    }
    else R = borne(Math.min(W, H) * 0.26, 110, 200);
    S0 = { x: W / 2, y: (etroit ? 118 + (H - 258) / 2 : H * 0.48) - bas / 2 };
    // « Mon projet » centre la constellation entière (elle n'est jamais symétrique : son milieu n'est pas son cœur).
    if (m) { const g = geo(m, 0), xs = [g.cx, ...g.pts.map((p) => p.x)], ys = [g.cy, ...g.pts.map((p) => p.y)]; maison = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }; }
    else maison = { x: 0, y: 0 };
    const n = (etroit ? 18 : 34) * (leger ? 0.5 : 1);
    scint = Array.from({ length: Math.round(n) }, (_, k) => ({ x: fr(k + 700) * U.T, y: fr(k + 800) * U.T, col: U.COUL[Math.floor(fr(k + 900) * U.COUL.length)], s: 16 + fr(k + 950) * 22, v: 0.4 + fr(k + 990) * 1.4, p: fr(k + 999) * 6 }));
    tailles.clear();
  }
  mesurer();
  /** Le cadrage de départ : la constellation principale, ou tout le ciel quand il n'y en a pas. */
  function depart(): Cam {
    if (moi() || D.astres.length === 0) return { x: maison.x, y: maison.y, k: 1, r: 0 };
    const xs = D.astres.map((a) => a.x), ys = D.astres.map((a) => a.y), l = Math.max(...xs) - Math.min(...xs) + 3.4 * R, h = Math.max(...ys) - Math.min(...ys) + 3.2 * R;
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 - (etroit ? 0 : 10) / 1, k: borne(Math.min((W - (etroit ? 40 : 160)) / l, (H - (etroit ? 200 : 140)) / h), K_MIN, 1), r: 0 };
  }
  const K_MIN = 0.1, K_MAX = 2.6;
  cam = depart();
  // On arrive de loin : le ciel est d'abord vu de très haut, puis il s'approche.
  if (options.arrivee && !calme) { cible = { ...cam }; cam = { ...cam, k: cam.k * 0.22, r: -0.35 }; }

  const proche = (de: number, vers: number) => de + (((((vers - de + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
  function ecran(wx: number, wy: number): P2 { const dx = (wx - cam.x) * cam.k, dy = (wy - cam.y) * cam.k, c = Math.cos(cam.r), s = Math.sin(cam.r); return { x: S0.x + dx * c - dy * s, y: S0.y + dx * s + dy * c }; }
  function monde(sx: number, sy: number): P2 { const dx = sx - S0.x, dy = sy - S0.y, c = Math.cos(-cam.r), s = Math.sin(-cam.r); return { x: cam.x + (dx * c - dy * s) / cam.k, y: cam.y + (dx * s + dy * c) / cam.k }; }
  function camPour(wx: number, wy: number, k: number, r: number, A: P2): Cam { const dx = (A.x - S0.x) / k, dy = (A.y - S0.y) / k, c = Math.cos(-r), s = Math.sin(-r); return { x: wx - (dx * c - dy * s), y: wy - (dx * s + dy * c), k, r }; }

  // ——— Les gestes : se promener (glisser), zoomer (molette, pincement), pivoter (Maj + glisser, deux doigts) ———
  const local = (ev: PointerEvent | WheelEvent): P2 => { const b = racine.getBoundingClientRect(); return { x: ev.clientX - b.left, y: ev.clientY - b.top }; };
  const touche = () => { dernierGeste = temps; racine.setAttribute("data-vu", ""); };
  const surMaj = (ev: KeyboardEvent) => { if (ev.key === "Shift") maj = ev.type === "keydown"; };
  const surPose = (ev: PointerEvent) => { cv.setPointerCapture(ev.pointerId); doigts.set(ev.pointerId, local(ev)); cible = ouvert === null ? null : cible; v = { x: 0, y: 0, r: 0 }; touche(); };
  const surGlisse = (ev: PointerEvent) => {
    const b = racine.getBoundingClientRect();
    souris = { x: (ev.clientX - b.left) / b.width - 0.5, y: (ev.clientY - b.top) / b.height - 0.5 };
    if (!doigts.has(ev.pointerId)) return;
    const avant = [...doigts.values()].map((p) => ({ ...p }));
    doigts.set(ev.pointerId, local(ev));
    const apres = [...doigts.values()];
    cible = null; touche();
    const tourDe = (a: number) => (a > Math.PI ? a - 2 * Math.PI : a < -Math.PI ? a + 2 * Math.PI : a);
    if (apres.length === 1) {
      if (maj || ev.shiftKey) { const da = tourDe(Math.atan2(apres[0].y - S0.y, apres[0].x - S0.x) - Math.atan2(avant[0].y - S0.y, avant[0].x - S0.x)); cam.r += da; v = { x: 0, y: 0, r: da }; }
      else { const m0 = monde(avant[0].x, avant[0].y), m1 = monde(apres[0].x, apres[0].y); cam.x -= m1.x - m0.x; cam.y -= m1.y - m0.y; v = { x: -(m1.x - m0.x), y: -(m1.y - m0.y), r: 0 }; }
    } else {
      const mid = (q: P2[]) => ({ x: (q[0].x + q[1].x) / 2, y: (q[0].y + q[1].y) / 2 }), dist = (q: P2[]) => Math.hypot(q[0].x - q[1].x, q[0].y - q[1].y), ang = (q: P2[]) => Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x);
      const M0 = mid(avant), M1 = mid(apres), w = monde(M0.x, M0.y);
      cam.k = borne((cam.k * dist(apres)) / Math.max(1, dist(avant)), K_MIN, K_MAX);
      cam.r += tourDe(ang(apres) - ang(avant));
      const w2 = monde(M1.x, M1.y); cam.x += w.x - w2.x; cam.y += w.y - w2.y; v = { x: 0, y: 0, r: 0 };
    }
  };
  const surLache = (ev: PointerEvent) => { doigts.delete(ev.pointerId); };
  const surMolette = (ev: WheelEvent) => {
    ev.preventDefault(); cible = null; touche();
    const p = local(ev), w = monde(p.x, p.y);
    cam.k = borne(cam.k * Math.exp(-ev.deltaY * 0.0013), K_MIN, K_MAX);
    const w2 = monde(p.x, p.y); cam.x += w.x - w2.x; cam.y += w.y - w2.y;
  };
  // Au clavier, sur le ciel : flèches pour se promener, + et − pour zoomer, « , » et « . » pour pivoter, 0 pour revenir.
  const surTouche = (ev: KeyboardEvent) => {
    if ((ev.target as HTMLElement).closest("input,textarea,select,[contenteditable=true],[data-volet]")) return;
    const pas = 60 / cam.k, base = cible ?? cam, c = Math.cos(-cam.r), s = Math.sin(-cam.r), va = (dx: number, dy: number) => ({ ...base, x: base.x + dx * c - dy * s, y: base.y + dx * s + dy * c });
    const k = ev.key;
    const suite = k === "ArrowLeft" ? va(-pas, 0) : k === "ArrowRight" ? va(pas, 0) : k === "ArrowUp" ? va(0, -pas) : k === "ArrowDown" ? va(0, pas)
      : k === "+" || k === "=" ? { ...base, k: Math.min(K_MAX, base.k * 1.3) } : k === "-" ? { ...base, k: Math.max(K_MIN, base.k / 1.3) }
      : k === "," ? { ...base, r: base.r - 0.2 } : k === "." ? { ...base, r: base.r + 0.2 } : null;
    if (k === "0") { ev.preventDefault(); api.cadrer("moi"); return; }
    if (!suite) return;
    ev.preventDefault(); cible = suite; touche();
  };
  window.addEventListener("keydown", surMaj); window.addEventListener("keyup", surMaj);
  cv.addEventListener("pointerdown", surPose); cv.addEventListener("pointermove", surGlisse); cv.addEventListener("pointerup", surLache); cv.addEventListener("pointercancel", surLache);
  cv.addEventListener("wheel", surMolette, { passive: false });
  racine.addEventListener("keydown", surTouche);
  const surTaille = new ResizeObserver(() => { const avant = { ...maison }; mesurer(); cam.x += maison.x - avant.x; cam.y += maison.y - avant.y; if (ouvert !== null) viser(ouvert); if (!boucle) dessiner(temps); });
  surTaille.observe(racine);
  const surVisible = () => { visible = !document.hidden; relancer(); };
  document.addEventListener("visibilitychange", surVisible);
  const surVue = new IntersectionObserver((e) => { vivant = e.some((z) => z.isIntersecting); relancer(); });
  surVue.observe(racine);

  /** La place laissée par le volet : l'étoile ouverte vient se mettre au milieu de ce qui reste visible. */
  function ancre(): P2 {
    const vo = volet(), b = vo?.getBoundingClientRect(), r0 = racine.getBoundingClientRect();
    if (!b || !b.width) return S0;
    return etroit ? { x: W / 2, y: Math.max(90, (b.top - r0.top) / 2) } : { x: Math.max(160, (b.left - r0.left) / 2), y: H / 2 };
  }
  function viser(i: number) { const m = moi(); if (!m) return; const P = geo(m, temps).pts[i]; cible = camPour(P.x, P.y, etroit ? 1.25 : 1.4, cam.r, ancre()); }

  function dessinerAstre(a: Astre, t: number, voyage: number): Vue | null {
    const g = geo(a, t), C = ecran(g.cx, g.cy), Rk = g.R * cam.k, marge = Rk * 2 + 80;
    if (C.x < -marge || C.x > W + marge || C.y < -marge || C.y > H + marge) return null;
    const P = g.pts.map((p) => ecran(p.x, p.y)), est = a.type === "moi", princ = a === moi(), sur = racine.querySelector(`[data-astre="${a.id}"]:hover, [data-astre="${a.id}"]:focus-visible`) !== null;
    if (a.type === "nouveau" && !a.grand) {
      // La constellation encore éteinte du prochain projet : un tracé en pointillé qui attend d'être allumé.
      const pts = P.filter((_, i) => i % 2 === 0), kk = 0.55 + 0.45 * Math.sin(t * 1.2);
      x.setLineDash([2, 6]); x.strokeStyle = `rgba(157,180,255,${sur ? 0.6 : 0.25})`; x.lineWidth = 1;
      for (const p of pts) { x.beginPath(); x.moveTo(C.x, C.y); x.lineTo(p.x, p.y); x.stroke(); }
      x.setLineDash([]);
      pts.forEach((p, j) => { x.strokeStyle = `rgba(200,215,255,${(sur ? 0.8 : 0.4) * (0.6 + 0.4 * Math.sin(t * 1.5 + j))})`; x.beginPath(); x.arc(p.x, p.y, 2.4, 0, 7); x.stroke(); });
      const rr = Math.max(7, 16 * cam.k);
      x.save(); x.globalCompositeOperation = "lighter"; x.globalAlpha = (sur ? 0.5 : 0.22) * (0.7 + 0.3 * kk); x.drawImage(U.SP["175,195,255doux"], C.x - rr * 3, C.y - rr * 3, rr * 6, rr * 6); x.restore();
      x.strokeStyle = `rgba(200,215,255,${sur ? 0.9 : 0.55})`; x.lineWidth = 1.2; x.beginPath(); x.arc(C.x, C.y, rr * (1 + 0.06 * kk), 0, 7); x.stroke();
      x.strokeStyle = `rgba(220,230,255,${sur ? 0.95 : 0.7})`; x.lineWidth = 1.3; x.beginPath(); x.moveTo(C.x - rr * 0.42, C.y); x.lineTo(C.x + rr * 0.42, C.y); x.moveTo(C.x, C.y - rr * 0.42); x.lineTo(C.x, C.y + rr * 0.42); x.stroke();
      return { C, P, rc: rr };
    }
    const etat = (i: number) => a.etats[i] ?? "avenir", ok = (i: number) => etat(i) === "fait", vif = (i: number) => etat(i) === "cours" || etat(i) === "avis";
    const rc = Math.max(3, g.R * 0.17 * cam.k);
    const pere = (i: number) => a.forme[i]?.parent ?? -1;
    // Une étape finie se relie à la suivante (sauf si une branche les relie déjà).
    for (let i = 0; i < 8; i++) if (pere(i + 1) !== i && pere(i) !== i + 1 && ok(i) && (ok(i + 1) || vif(i + 1))) { x.strokeStyle = "rgba(157,180,255,.22)"; x.lineWidth = 1; x.beginPath(); x.moveTo(P[i].x, P[i].y); x.lineTo(P[i + 1].x, P[i + 1].y); x.stroke(); }
    const tzK = borne(Math.sqrt(cam.k), 0.35, 1.25);
    P.forEach((p, i) => {
      const f = a.forme[i], e = etat(i), fait = e === "fait", cours = vif(i), pa = pere(i), Dp = pa < 0 ? C : P[pa], ang = Math.atan2(p.y - Dp.y, p.x - Dp.x), sx = pa < 0 ? C.x + Math.cos(ang) * rc * 1.1 : Dp.x, sy = pa < 0 ? C.y + Math.sin(ang) * rc * 1.1 : Dp.y;
      const ici = princ && sina.vers === i && voyage >= 1, surE = princ && (ouvert === i || boutons[i]?.matches(":hover, :focus-visible"));
      x.setLineDash(fait || cours ? [] : [3, 5]);
      x.strokeStyle = surE ? "rgba(220,230,255,.9)" : fait ? "rgba(190,205,255,.5)" : cours ? "rgba(124,156,255,.9)" : e === "sans" ? "rgba(157,180,255,.08)" : "rgba(157,180,255,.16)";
      x.lineWidth = surE ? 1.6 : fait ? 0.9 : 0.8; x.beginPath(); x.moveTo(sx, sy); x.lineTo(p.x, p.y); x.stroke(); x.setLineDash([]);
      // Une petite lumière remonte chaque branche allumée.
      if (fait && !calme && cam.k > 0.25) { const q = (t * 0.22 + i * 0.37 + a.x * 0.001) % 1; x.globalAlpha = Math.sin(q * Math.PI) * 0.7; x.fillStyle = "#DCE4FF"; x.beginPath(); x.arc(sx + (p.x - sx) * q, sy + (p.y - sy) * q, 1.3, 0, 7); x.fill(); x.globalAlpha = 1; }
      // Les petites étoiles autour des grandes étapes.
      if (cam.k > 0.3) (BRIN[f.tw] ?? []).forEach((da, j) => {
        const b = ang + rad(da), L = g.R * (0.13 + 0.06 * ((i + j) % 3)) * cam.k, qx = p.x + Math.cos(b) * L, qy = p.y + Math.sin(b) * L;
        x.strokeStyle = fait ? "rgba(190,205,255,.38)" : "rgba(157,180,255,.1)"; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(qx, qy); x.stroke();
        if (fait) { x.save(); x.globalCompositeOperation = "lighter"; x.globalAlpha = 0.7 + 0.3 * Math.sin(t * 1.3 + i + j); const s2 = 15 * tzK; x.drawImage(U.SP["202,215,255doux"], qx - s2 / 2, qy - s2 / 2, s2, s2); x.restore(); }
        else { x.fillStyle = "rgba(157,180,255,.3)"; x.beginPath(); x.arc(qx, qy, 1.3, 0, 7); x.fill(); }
      });
      const tz = f.s * (surE ? 1.35 : 1) * tzK * (est ? 1 : 0.85), colE = f.s > 1.2 ? "255,236,214" : est ? "236,240,255" : "202,215,255";
      x.save(); x.globalCompositeOperation = "lighter";
      if (ici) {
        // SINA est là : l'étoile brille plus fort, des ondes en partent.
        const k = (Math.sin(t * 2.6) + 1) / 2, sz = (50 + k * 16) * tz; x.drawImage(U.SP["175,195,255"], p.x - sz / 2, p.y - sz / 2, sz, sz); x.globalCompositeOperation = "source-over";
        for (let r = 0; r < 2; r++) { const kk = (t * 0.7 + r * 0.5) % 1; x.strokeStyle = `rgba(157,180,255,${0.55 * (1 - kk)})`; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, (8 + kk * 22) * tz, 0, 7); x.stroke(); }
      } else if (fait) { const k = 0.85 + 0.15 * Math.sin(t * 1.1 + i * 2 + a.x), sz = 34 * tz * k; x.drawImage(U.SP[colE], p.x - sz / 2, p.y - sz / 2, sz, sz); }
      else if (e === "avis") {
        // Elle attend le client : elle clignote comme un phare.
        const k = calme ? 1 : Math.pow((Math.sin(t * 2.2) + 1) / 2, 2), sz = (30 + 26 * k) * tz; x.globalAlpha = 0.55 + 0.45 * k; x.drawImage(U.SP["255,236,214"], p.x - sz / 2, p.y - sz / 2, sz, sz);
      } else if (e === "cours") { const sz = 42 * tz; x.drawImage(U.SP["175,195,255"], p.x - sz / 2, p.y - sz / 2, sz, sz); }
      else { x.globalCompositeOperation = "source-over"; x.strokeStyle = surE ? "rgba(220,230,255,.8)" : e === "sans" ? "rgba(157,180,255,.2)" : "rgba(157,180,255,.4)"; x.lineWidth = 1; x.beginPath(); x.arc(p.x, p.y, 2.6 * tz, 0, 7); x.stroke(); }
      x.restore();
    });
    // Le soleil du projet : il rayonne, deux ondes lentes s'en éloignent.
    for (let r = 0; r < 2; r++) { const kk = (t * 0.33 + r * 0.5 + a.x * 0.0003) % 1; x.strokeStyle = `rgba(220,225,240,${0.24 * (1 - kk)})`; x.lineWidth = 1; x.beginPath(); x.arc(C.x, C.y, rc * (1.15 + kk * 1.6), 0, 7); x.stroke(); }
    x.save(); x.globalCompositeOperation = "lighter";
    const sz = rc * (sur ? 6.4 : 5.6) * (1 + 0.04 * Math.sin(t * 1.4 + a.y)), sr2 = rc * 8;
    x.translate(C.x, C.y); x.save(); x.rotate(t * 0.05 + a.x); x.globalAlpha = 0.5; x.drawImage(U.rayons, -sr2 / 2, -sr2 / 2, sr2, sr2); x.restore();
    const eteinte = a.type === "nouveau" && !a.etats.some((e) => e !== "avenir");
    if (eteinte) x.globalAlpha = (sur ? 0.6 : 0.34) * (0.8 + 0.2 * Math.sin(t * 1.2));
    x.drawImage(U.soleil(a.couleurs ?? BLEU), -sz / 2, -sz / 2, sz, sz);
    x.restore();
    if (eteinte) { const rr = rc * 0.5; x.strokeStyle = `rgba(230,236,255,${sur ? 1 : 0.85})`; x.lineWidth = 1.6; x.beginPath(); x.arc(C.x, C.y, rc * 0.95, 0, 7); x.moveTo(C.x - rr, C.y); x.lineTo(C.x + rr, C.y); x.moveTo(C.x, C.y - rr); x.lineTo(C.x, C.y + rr); x.stroke(); }
    return { C, P, rc };
  }

  /** Le fond du ciel : la nuit, les galaxies lointaines, la voie lactée, les nébuleuses, les trois profondeurs d'étoiles. */
  function fond(x: CanvasRenderingContext2D, t: number) {
    const cr = Math.cos(cam.r), sr = Math.sin(cam.r), plan = (kz: number) => x.setTransform(d * kz * cr, d * kz * sr, -d * kz * sr, d * kz * cr, d * S0.x, d * S0.y);
    x.setTransform(d, 0, 0, d, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    { const g = x.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.8); g.addColorStop(0, "#0A1230"); g.addColorStop(0.55, "#050919"); g.addColorStop(1, "#020308"); x.fillStyle = g; x.fillRect(0, 0, W, H); }
    x.globalCompositeOperation = "lighter";
    { const kz = borne(Math.pow(cam.k, 0.12), 0.6, 1.3); plan(kz);
      for (const gx of U.galaxies) { x.save(); x.translate(gx.x * 0.45 - cam.x * gx.f * cam.k, gx.y * 0.45 - cam.y * gx.f * cam.k); x.rotate(gx.a); x.scale(1, gx.inc); x.globalAlpha = 0.8; x.drawImage(gx.c, -gx.s / 2, -gx.s / 2, gx.s, gx.s); x.restore(); } }
    { const f = 0.12, kz = borne(Math.pow(cam.k, 0.22), 0.55, 1.4), sv = (etroit ? 1.4 : 2.1) * (2600 / U.voie.width); plan(kz);
      x.save(); x.translate(-cam.x * f * cam.k + 120, -cam.y * f * cam.k - 60); x.rotate(-0.5); x.globalAlpha = 0.95; x.drawImage(U.voie, (-U.voie.width * sv) / 2, (-U.voie.height * sv) / 2, U.voie.width * sv, U.voie.height * sv); x.restore(); }
    { const kz = borne(Math.pow(cam.k, 0.3), 0.5, 1.5); plan(kz);
      for (const n of U.nebuleuses) { const px = n.x * 0.45 - cam.x * n.f * cam.k, py = n.y * 0.45 - cam.y * n.f * cam.k, sz = n.t * (etroit ? 0.6 : 1), hd = Math.hypot(W, H) / 2 / kz; if (Math.abs(px) - sz / 2 > hd || Math.abs(py) - sz / 2 > hd) continue; x.globalAlpha = 0.6 + (leger || calme ? 0 : 0.12 * Math.sin(t * 0.15 + n.x)); x.drawImage(n.c, px - sz / 2, py - sz / 2, sz, sz); } }
    for (const L of U.couches) {
      const kz = borne(1 + Math.log(cam.k) * L.f * 1.2, 0.45, 1.6), T = U.T, hd = Math.hypot(W, H) / 2 / kz + 4; plan(kz);
      const ox = (((-cam.x * L.f * cam.k + (calme || leger ? 0 : souris.x * -40 * L.f)) % T) + T) % T, oy = (((-cam.y * L.f * cam.k + (calme || leger ? 0 : souris.y * -28 * L.f)) % T) + T) % T;
      x.globalAlpha = 1;
      for (let X = ox - T * Math.ceil((hd + ox) / T); X < hd; X += T) for (let Y = oy - T * Math.ceil((hd + oy) / T); Y < hd; Y += T) x.drawImage(L.c, X, Y);
    }
    x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.setTransform(d, 0, 0, d, 0, 0);
  }

  function dessiner(t: number) {
    const dt = borne(t - temps, 0, 0.1); temps = t;
    const a6 = calme ? 1 : 1 - Math.exp(-dt * 3.6);
    if (cible) {
      cam.x += (cible.x - cam.x) * a6; cam.y += (cible.y - cam.y) * a6; cam.k = Math.exp(Math.log(cam.k) + (Math.log(cible.k) - Math.log(cam.k)) * a6); cam.r += (cible.r - cam.r) * a6;
      if (Math.abs(cible.x - cam.x) < 0.5 && Math.abs(cible.y - cam.y) < 0.5 && Math.abs(cible.k - cam.k) < 0.001 && Math.abs(cible.r - cam.r) < 0.001) { cam = { ...cible }; if (ouvert === null) cible = null; }
    } else if (!doigts.size && (v.x || v.y || v.r)) { cam.x += v.x; cam.y += v.y; cam.r += v.r; v.x *= 0.93; v.y *= 0.93; v.r *= 0.93; if (Math.abs(v.x) + Math.abs(v.y) < 0.02 / cam.k && Math.abs(v.r) < 0.0002) v = { x: 0, y: 0, r: 0 }; }
    // Laissé tranquille, le ciel tourne très lentement.
    if (!cible && !doigts.size && !calme && !leger && t - dernierGeste > 6 && ouvert === null) cam.r += 0.00025 * (dt / 0.016);
    const voyage = calme ? 1 : Math.min(1, (t - sina.t0) / 1.5);

    // Version allégée : le fond n'est redessiné que lorsqu'on se déplace ; au repos, il est recopié d'un seul geste.
    if (leger) {
      if (!fondToile) fondToile = document.createElement("canvas");
      const cle = `${cv.width}x${cv.height}:${cam.x.toFixed(1)}:${cam.y.toFixed(1)}:${cam.k.toFixed(4)}:${cam.r.toFixed(4)}`;
      if (cle !== fondCle) { if (fondToile.width !== cv.width || fondToile.height !== cv.height) { fondToile.width = cv.width; fondToile.height = cv.height; } fond(fondToile.getContext("2d")!, t); fondCle = cle; }
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.drawImage(fondToile, 0, 0);
    } else fond(x, t);
    const cr = Math.cos(cam.r), sr = Math.sin(cam.r), plan = (kz: number) => x.setTransform(d * kz * cr, d * kz * sr, -d * kz * sr, d * kz * cr, d * S0.x, d * S0.y);
    x.globalCompositeOperation = "lighter";
    // Quelques étoiles proches scintillent pour de vrai.
    { plan(1); const T = U.T; for (const e of scint) { const u = ((((e.x - cam.x * 0.32 * cam.k) % T) + T) % T) - T / 2, w = ((((e.y - cam.y * 0.32 * cam.k) % T) + T) % T) - T / 2; x.globalAlpha = calme ? 0.7 : 0.3 + 0.7 * Math.pow((Math.sin(t * e.v + e.p) + 1) / 2, 3); x.drawImage(U.SP[e.col], u - e.s / 2, w - e.s / 2, e.s, e.s); } }
    x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.setTransform(d, 0, 0, d, 0, 0);
    if (!calme && t > prochaine && !filante) filante = { t0: t, x: fr(t) * W * 0.7 + W * 0.15, y: fr(t + 1) * H * 0.3, vx: -(260 + fr(t + 2) * 160), vy: 140 + fr(t + 3) * 80 };
    if (filante) {
      const k = (t - filante.t0) / 0.9;
      if (k > 1) { filante = null; prochaine = t + 5 + fr(t) * 7; }
      else { const hx = filante.x + filante.vx * k, hy = filante.y + filante.vy * k, g = x.createLinearGradient(hx, hy, hx - filante.vx * 0.25, hy - filante.vy * 0.25); g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - k)})`); g.addColorStop(1, "rgba(255,255,255,0)"); x.strokeStyle = g; x.lineWidth = 1.4; x.beginPath(); x.moveTo(hx, hy); x.lineTo(hx - filante.vx * 0.25, hy - filante.vy * 0.25); x.stroke(); }
    }

    const vues: Record<string, Vue | null> = {};
    for (const a of D.astres) vues[a.id] = dessinerAstre(a, t, voyage);
    // La lumière de SINA voyage : de l'étoile qu'elle quitte au cœur, puis du cœur à celle où elle va travailler.
    const m = moi(), Vm = m ? vues[m.id] ?? null : null;
    if (Vm && voyage < 1) {
      const C = Vm.C, de = sina.de < 0 ? C : Vm.P[sina.de], vers = sina.vers < 0 ? C : Vm.P[sina.vers], k = lisse(voyage);
      x.save(); x.globalCompositeOperation = "lighter";
      for (let n = 0; n < 5; n++) {
        const kb = Math.max(0, k - n * 0.025), direct = sina.de < 0 || sina.vers < 0;
        const pb = direct ? { x: de.x + (vers.x - de.x) * kb, y: de.y + (vers.y - de.y) * kb } : kb < 0.5 ? { x: de.x + (C.x - de.x) * kb * 2, y: de.y + (C.y - de.y) * kb * 2 } : { x: C.x + (vers.x - C.x) * (kb - 0.5) * 2, y: C.y + (vers.y - C.y) * (kb - 0.5) * 2 };
        const s = (30 - n * 5) * (leger ? 0.8 : 1); x.globalAlpha = 1 - n * 0.19; x.drawImage(U.SP.blanc, pb.x - s / 2, pb.y - s / 2, s, s);
      }
      x.restore();
    }
    placer(vues, Vm);
  }

  /** Les noms : ceux des étapes de près, ceux des constellations de loin. Du vrai texte, posé sur le dessin. */
  function placer(vues: Record<string, Vue | null>, Vm: Vue | null) {
    const etapes = cam.k > 0.55;
    racine.toggleAttribute("data-loin", !etapes);
    const pose = (el: HTMLElement, p: P2, cache: boolean) => {
      if (cache) { if (!el.hidden) el.hidden = true; return; }
      if (el.hidden) el.hidden = false;
      const tr = `translate3d(${Math.round(p.x * 10) / 10}px,${Math.round(p.y * 10) / 10}px,0)`;
      if (el.style.transform !== tr) el.style.transform = tr;
    };
    const taille = (el: HTMLElement) => { let z = tailles.get(el); if (!z || !z.w) { z = { w: el.offsetWidth, h: el.offsetHeight }; tailles.set(el, z); } return z; };
    const boites: { el: HTMLElement; x0: number; x1: number; y: number; h: number }[] = [];
    boutons.forEach((b, i) => {
      if (!Vm || !etapes) { pose(b, { x: 0, y: 0 }, true); return; }
      const p = Vm.P[i], C = Vm.C, a = Math.atan2(p.y - C.y, p.x - C.x), c = Math.cos(a), s = Math.sin(a), lim = etroit ? 0.6 : 0.3;
      pose(b, p, false);
      const sp = b.firstElementChild as HTMLElement, z = taille(sp), ec = etroit ? 30 : 40;
      let cote = Math.abs(c) < lim ? (s < 0 ? "dessus" : "dessous") : c > 0 ? "droite" : "gauche";
      // Pas la place sur le côté : le nom passe au-dessus ou en dessous, jamais par-dessus le soleil.
      if ((cote === "droite" && p.x + ec + z.w > W - 6) || (cote === "gauche" && p.x - ec - z.w < 6)) cote = s < 0 ? "dessus" : "dessous";
      const centre = cote === "dessus" || cote === "dessous";
      const dx = centre ? Math.max(6 - (p.x - z.w / 2), Math.min(0, W - 6 - (p.x + z.w / 2))) : 0;
      if (b.dataset.cote !== cote) b.dataset.cote = cote;
      const x0 = centre ? p.x - z.w / 2 + dx : cote === "droite" ? p.x + ec : p.x - ec - z.w;
      const y = cote === "dessus" ? p.y - ec + 6 - z.h : cote === "dessous" ? p.y + ec - 6 : p.y - z.h / 2;
      boites.push({ el: sp, x0, x1: x0 + z.w, y, h: z.h });
      sp.style.setProperty("--dx", `${Math.round(dx)}px`);
      const op = ouvert !== null && ouvert !== i ? "0.14" : String(borne((cam.k - 0.55) * 5, 0, 1));
      if (b.style.opacity !== op) b.style.opacity = op;
    });
    // Le nom écrit sous le cœur (« Nouveau projet ») compte aussi : les noms des étoiles lui laissent sa place.
    const sousCoeur = Vm && etapes ? noms().find((el) => el.dataset.astre === moi()?.id && el.dataset.type !== "moi") : null;
    if (sousCoeur && Vm) { const z = taille(sousCoeur.firstElementChild as HTMLElement); boites.push({ el: sousCoeur, x0: Vm.C.x - z.w / 2, x1: Vm.C.x + z.w / 2, y: Vm.C.y + Vm.rc + 2, h: z.h + 22 }); }
    // Deux noms ne se recouvrent jamais : celui du dessous descend un peu.
    boites.sort((a, b) => (a.el === sousCoeur ? -1 : b.el === sousCoeur ? 1 : a.y - b.y));
    const dy = new Map<HTMLElement, number>();
    for (let passe = 0; passe < 3; passe++) for (let i = 0; i < boites.length; i++) for (let j = 0; j < i; j++) {
      const A = boites[j], B = boites[i];
      if (A.x0 < B.x1 + 6 && B.x0 < A.x1 + 6 && B.y < A.y + A.h + 3 && B.y + B.h > A.y - 3) { const pousse = A.y + A.h + 3 - B.y; B.y += pousse; dy.set(B.el, (dy.get(B.el) ?? 0) + pousse); }
    }
    for (const B of boites) { if (B.el === sousCoeur) continue; const val = `${Math.round(dy.get(B.el) ?? 0)}px`; if (B.el.style.getPropertyValue("--dy") !== val) B.el.style.setProperty("--dy", val); }
    // Un bouton invisible sur le cœur de chaque constellation qui en demande un : on clique sur le soleil lui-même.
    for (const el of racine.querySelectorAll<HTMLElement>("[data-coeur]")) { const V = vues[el.dataset.coeur!]; pose(el, V ? V.C : { x: 0, y: 0 }, !V); }
    for (const el of noms()) {
      const V = vues[el.dataset.astre!], estMoi = el.dataset.astre === moi()?.id;
      pose(el, V ? { x: V.C.x, y: V.C.y + V.rc + 12 } : { x: 0, y: 0 }, !V || (estMoi && etapes && el.dataset.type === "moi"));
      const op = ouvert !== null ? "0.15" : "1";
      if (el.style.opacity !== op) el.style.opacity = op;
    }
  }

  // ——— La boucle : le ciel vit en permanence, mais ne dessine rien quand on ne le regarde pas ———
  let boucle = 0, lent = 0, mesures = 0, avant = 0;
  function tour(ms: number) {
    boucle = requestAnimationFrame(tour);
    image++;
    // Version allégée : une image sur deux suffit, et repose le téléphone.
    if (leger && image % 2) return;
    const t = ms / 1000;
    // Si le dessin reste trop lent sur cet appareil, le ciel passe seul en version allégée.
    if (!leger && options.leger !== false && avant && t > 1.5) { const pas = ms - avant; mesures++; if (pas > 34) lent++; if (mesures >= 90) { if (lent > 40) alleger(); mesures = 0; lent = 0; } }
    avant = ms;
    dessiner(calme ? t * 0.25 : t);
  }
  function relancer() {
    const doit = vivant && visible;
    if (doit && !boucle) { avant = 0; boucle = requestAnimationFrame(tour); }
    else if (!doit && boucle) { cancelAnimationFrame(boucle); boucle = 0; }
  }
  function alleger() {
    if (leger) return;
    leger = true; U = creerUnivers(true); fondCle = ""; mesurer(); racine.setAttribute("data-leger", ""); options.surLeger?.(true);
  }
  if (leger) { racine.setAttribute("data-leger", ""); options.surLeger?.(true); }
  dessiner(0);
  relancer();
  // Le mode d'emploi s'efface seul au bout de quelques secondes, ou au premier geste.
  const aideVue = window.setTimeout(() => racine.setAttribute("data-vu", ""), 9000);

  const api: Ciel = {
    get leger() { return leger; },
    maj(n) {
      const vers = n.sina ?? -1;
      if (vers !== sina.vers) sina = { de: sina.vers, vers, t0: temps };
      D = n; tailles.clear();
      if (!boucle) dessiner(temps);
    },
    ouvrir(i) {
      ouvert = i; racine.toggleAttribute("data-ouvert", i !== null);
      if (i !== null) { touche(); requestAnimationFrame(() => { if (ouvert === i) viser(i); }); }
      else cible = moi() ? { x: maison.x, y: maison.y, k: 1, r: cam.r } : { ...depart(), r: cam.r };
    },
    zoom(f) { const base = cible ?? cam; cible = { ...base, k: borne(base.k * f, K_MIN, K_MAX) }; touche(); },
    tourner(a) { const base = cible ?? cam; cible = { ...base, r: base.r + a }; touche(); },
    cadrer(quoi) {
      touche();
      if (!moi()) { cible = { ...depart(), r: proche(cam.r, 0) }; return; }
      if (quoi === "moi" || D.astres.length < 2) { cible = { x: maison.x, y: maison.y, k: 1, r: proche(cam.r, 0) }; return; }
      const xs = D.astres.map((a) => a.x), ys = D.astres.map((a) => a.y), l = Math.max(...xs) - Math.min(...xs) + 2.6 * R, h = Math.max(...ys) - Math.min(...ys) + 2.6 * R, noms = etroit ? 150 : 320;
      cible = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, k: borne(Math.min((W - noms) / l, (H - 120) / h), K_MIN, 1), r: cam.r };
    },
    detruire() {
      cancelAnimationFrame(boucle); boucle = 0; window.clearTimeout(aideVue);
      window.removeEventListener("keydown", surMaj); window.removeEventListener("keyup", surMaj);
      cv.removeEventListener("pointerdown", surPose); cv.removeEventListener("pointermove", surGlisse); cv.removeEventListener("pointerup", surLache); cv.removeEventListener("pointercancel", surLache);
      cv.removeEventListener("wheel", surMolette); racine.removeEventListener("keydown", surTouche);
      surTaille.disconnect(); surVue.disconnect(); document.removeEventListener("visibilitychange", surVisible);
    },
  };
  return api;
}
