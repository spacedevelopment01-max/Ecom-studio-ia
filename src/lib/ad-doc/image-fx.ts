/**
 * Traitements de photo des documents publicitaires (étalonnage, noir et blanc, bichromie de la marque, flou du verre
 * dépoli) calculés PIXEL PAR PIXEL par ce module, identique dans le navigateur (éditeur du client) et sur le serveur
 * (export) : le rendu ne dépend pas des filtres du navigateur (Safari, anciens navigateurs). Isomorphe : aucune
 * dépendance Node ; la fabrique de canevas est fournie par l'environnement (OffscreenCanvas, document, ou serveur).
 */
type Canvas = { width: number; height: number; getContext(t: "2d"): any };

let factory: ((w: number, h: number) => Canvas) | null = null;
/** Fabrique de canevas du serveur (@napi-rs/canvas) ; le navigateur utilise OffscreenCanvas ou un <canvas>. */
export function setCanvasFactory(f: (w: number, h: number) => Canvas) {
  factory = f;
}
function makeCanvas(w: number, h: number): Canvas | null {
  if (factory) return factory(w, h);
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h) as unknown as Canvas;
  if (typeof document !== "undefined") {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c as unknown as Canvas;
  }
  return null;
}

type Op = { fn: string; v: number };
export function parseFilter(f: string | null | undefined): Op[] {
  if (!f || f === "none") return [];
  const out: Op[] = [];
  for (const m of f.matchAll(/(brightness|contrast|saturate|grayscale|sepia|blur|hue-rotate)\((-?\d+(?:\.\d+)?)(?:px|deg)?\)/g)) out.push({ fn: m[1], v: Number(m[2]) });
  return out;
}

/** Matrice affine 3×4 (r,g,b → r,g,b) des fonctions de couleur, dans l'ordre (même formules que les filtres CSS). */
type M = number[]; // 12 valeurs : [a00 a01 a02 b0, a10 a11 a12 b1, a20 a21 a22 b2]
const ID: M = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];
function mul(a: M, b: M): M {
  // a ∘ b (b appliquée d'abord)
  const o: M = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
    o[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
  }
  return o;
}
const lin = (m3: number[], off = 0): M => [m3[0], m3[1], m3[2], off, m3[3], m3[4], m3[5], off, m3[6], m3[7], m3[8], off];
function opMatrix(o: Op): M {
  const v = o.v;
  switch (o.fn) {
    case "brightness":
      return lin([v, 0, 0, 0, v, 0, 0, 0, v]);
    case "contrast":
      return lin([v, 0, 0, 0, v, 0, 0, 0, v], 0.5 - 0.5 * v);
    case "saturate":
      return lin([0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v]);
    case "grayscale": {
      const k = 1 - Math.min(1, v);
      return lin([0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k]);
    }
    case "sepia": {
      const k = 1 - Math.min(1, v);
      return lin([0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k]);
    }
    case "hue-rotate": {
      const a = (v * Math.PI) / 180;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return lin([0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072]);
    }
    default:
      return ID;
  }
}

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  if (m) return [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16) / 255) as [number, number, number];
  const r = /rgba?\(([^)]+)\)/.exec(c);
  if (r) return r[1].split(",").slice(0, 3).map((x) => Number(x) / 255) as [number, number, number];
  return [0, 0, 0];
};

/** Flou gaussien approché (3 passes de flou en boîte, bords prolongés : jamais de liseré sombre). */
function blur(d: Uint8ClampedArray, w: number, h: number, sigma: number) {
  const r = Math.max(1, Math.round(sigma * 0.95));
  const tmp = new Float32Array(w * h * 3);
  const src = new Float32Array(w * h * 3);
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) ((src[j] = d[i]), (src[j + 1] = d[i + 1]), (src[j + 2] = d[i + 2]));
  const pass = (a: Float32Array, b: Float32Array, horiz: boolean) => {
    const n = horiz ? w : h;
    const lines = horiz ? h : w;
    const span = 2 * r + 1;
    for (let L = 0; L < lines; L++) {
      const at = (k: number) => (horiz ? (L * w + Math.max(0, Math.min(n - 1, k))) : (Math.max(0, Math.min(n - 1, k)) * w + L)) * 3;
      for (let ch = 0; ch < 3; ch++) {
        let acc = 0;
        for (let k = -r; k <= r; k++) acc += a[at(k) + ch];
        for (let k = 0; k < n; k++) {
          b[at(k) + ch] = acc / span;
          acc += a[at(k + r + 1) + ch] - a[at(k - r) + ch];
        }
      }
    }
  };
  for (let p = 0; p < 3; p++) {
    pass(src, tmp, true);
    pass(tmp, src, false);
  }
  for (let i = 0, j = 0; i < d.length; i += 4, j += 3) ((d[i] = src[j]), (d[i + 1] = src[j + 1]), (d[i + 2] = src[j + 2]));
}

/** Applique filtre et bichromie aux pixels (RGBA). Exportée pour les tests. */
export function applyFx(d: Uint8ClampedArray, w: number, h: number, filter: string | null | undefined, duotone: { dark: string; light: string } | null | undefined) {
  const ops = parseFilter(filter);
  const color = ops.filter((o) => o.fn !== "blur");
  if (duotone) color.unshift({ fn: "grayscale", v: 1 }, { fn: "contrast", v: 1.08 });
  if (color.length || duotone) {
    // Matrice composée (les fonctions s'appliquent dans l'ordre écrit).
    const m = color.reduce<M>((acc, o) => mul(opMatrix(o), acc), ID);
    const dk = duotone ? hex(duotone.dark) : null;
    const lt = duotone ? hex(duotone.light) : null;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i] / 255;
      const g = d[i + 1] / 255;
      const b = d[i + 2] / 255;
      let R = Math.min(1, Math.max(0, m[0] * r + m[1] * g + m[2] * b + m[3]));
      let G = Math.min(1, Math.max(0, m[4] * r + m[5] * g + m[6] * b + m[7]));
      let B = Math.min(1, Math.max(0, m[8] * r + m[9] * g + m[10] * b + m[11]));
      if (dk && lt) {
        const y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        R = dk[0] + (lt[0] - dk[0]) * y;
        G = dk[1] + (lt[1] - dk[1]) * y;
        B = dk[2] + (lt[2] - dk[2]) * y;
      }
      d[i] = R * 255;
      d[i + 1] = G * 255;
      d[i + 2] = B * 255;
    }
  }
  const bl = ops.filter((o) => o.fn === "blur").reduce((a, o) => a + o.v, 0);
  if (bl > 0) blur(d, w, h, bl);
}

// Cache par image source : déplacer un calque dans l'éditeur ne recalcule rien.
const cache = new WeakMap<object, Map<string, Canvas>>();

/**
 * Photo traitée à la taille d'affichage : la partie `src` de l'image, dessinée en `dw`×`dh`, avec ses traitements.
 * null si aucun canevas n'est disponible (le dessin se fait alors sans traitement).
 */
export function processedImage(img: object & { width: number; height: number }, src: { sx: number; sy: number; sw: number; sh: number }, dw: number, dh: number, filter: string | null | undefined, duotone: { dark: string; light: string } | null | undefined): Canvas | null {
  const W = Math.max(1, Math.round(dw));
  const H = Math.max(1, Math.round(dh));
  const key = [src.sx, src.sy, src.sw, src.sh].map((x) => x.toFixed(1)).join(",") + `|${W}x${H}|${filter ?? ""}|${duotone ? `${duotone.dark}/${duotone.light}` : ""}`;
  let m = cache.get(img);
  const hit = m?.get(key);
  if (hit) return hit;
  const c = makeCanvas(W, H);
  if (!c) return null;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, 0, W, H);
  const data = ctx.getImageData(0, 0, W, H);
  applyFx(data.data, W, H, filter, duotone);
  ctx.putImageData(data, 0, 0);
  if (!m) cache.set(img, (m = new Map()));
  if (m.size > 16) m.delete(m.keys().next().value!);
  m.set(key, c);
  return c;
}

const reflections = new WeakMap<object, Map<string, Canvas>>();
/**
 * Reflet d'un produit détouré : le bas de l'image renversé (hauteur `rh`), effacé progressivement vers le bas.
 * Calculé une fois par image et par taille (identique dans l'éditeur et à l'export).
 */
export function reflectionOf(img: object & { width: number; height: number }, src: { sx: number; sy: number; sw: number; sh: number }, w: number, h: number, rh: number): Canvas | null {
  const key = `${[src.sx, src.sy, src.sw, src.sh].map((x) => x.toFixed(1)).join(",")}|${w}x${h}|${rh}`;
  let m = reflections.get(img);
  const hit = m?.get(key);
  if (hit) return hit;
  const W = Math.max(1, w);
  const RH = Math.max(1, rh);
  const c = makeCanvas(W, RH);
  if (!c) return null;
  const ctx = c.getContext("2d") as any;
  ctx.save();
  ctx.translate(0, RH);
  ctx.scale(1, -1);
  // Image renversée : son bas (au contact du sol) se retrouve en haut du reflet.
  ctx.drawImage(img, src.sx, src.sy, src.sw, src.sh, 0, RH - Math.max(1, h), W, Math.max(1, h));
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, RH);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.55, "rgba(0,0,0,0.12)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, RH);
  ctx.globalCompositeOperation = "source-over";
  if (!m) reflections.set(img, (m = new Map()));
  m.set(key, c);
  return c;
}
