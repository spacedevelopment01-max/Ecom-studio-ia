/**
 * Détourage local du produit (modèle ONNX embarqué, sans service externe),
 * extraction de la palette et des zones de détail. Les pixels du produit ne
 * sont jamais régénérés : toutes les compositions réutilisent ce détourage.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { colorName, rgbToHex } from "../color";
import { contentLang, L } from "../i18n-server";
import { interiorHoles, isTrueGap, measureBackground } from "./cutout-quality";

export type CutoutModel = "large" | "medium" | "small";
export type Cutout = { png: Buffer; width: number; height: number; bbox: { x: number; y: number; w: number; h: number }; sourceW: number; sourceH: number; method: "model" | "flood" | "existing"; model?: CutoutModel };

/** Détourage impossible proprement (modèle indisponible et fond de la photo non uni) : aucun détourage n'est produit. */
export class CutoutUnavailable extends Error {}

/** Délai maximal du détourage par le modèle avant de passer au détourage de secours. */
const MODEL_TIMEOUT_MS = Number(process.env.CUTOUT_TIMEOUT_MS) || 180_000;

/** Modèles réellement livrés avec le paquet installé (le « large » n'est pas fourni par toutes les versions). */
export function shippedModels(): CutoutModel[] {
  try {
    const res = JSON.parse(fs.readFileSync(path.join(process.cwd(), "node_modules", "@imgly", "background-removal-node", "dist", "resources.json"), "utf8")) as Record<string, unknown>;
    return (["large", "medium", "small"] as const).filter((m) => `/models/${m}` in res);
  } catch {
    return ["medium", "small"];
  }
}

/** Mémoire disponible (Mo) : la plus petite des mesures du système et de la limite du conteneur. */
export function availableMemoryMB(): number {
  const free = os.freemem();
  const proc = typeof (process as { availableMemory?: () => number }).availableMemory === "function" ? (process as unknown as { availableMemory: () => number }).availableMemory() : free;
  return Math.round(Math.min(free, proc > 0 ? proc : free) / 2 ** 20);
}

/**
 * Modèle le plus précis que la machine peut tenir : « large » s'il est livré et qu'il reste au moins 2,6 Go,
 * sinon « medium » (≈ 0,95 Go mesuré). Le « small » (quantifié) ne demande pas moins de mémoire en pratique :
 * il ne sert qu'en second essai, après un plantage du premier.
 */
export function chooseModel(availMB = availableMemoryMB(), shipped = shippedModels()): CutoutModel {
  if (shipped.includes("large") && availMB >= 2600) return "large";
  if (shipped.includes("medium")) return "medium";
  return shipped[0] ?? "medium";
}

/** Lance le modèle dans un processus séparé (un plantage ou un manque de mémoire n'arrête pas le studio). */
function runModel(png: Buffer, model: CutoutModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const script = path.join(process.cwd(), "src", "lib", "media", "cutout-child.mjs");
    const child = spawn(process.execPath, [script], { env: { ...process.env, CUTOUT_MODEL: model }, stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), MODEL_TIMEOUT_MS);
    child.stdout.on("data", (c: Buffer) => out.push(c));
    child.stderr.on("data", (c: Buffer) => (err = (err + c.toString()).slice(-2000)));
    child.on("error", (e) => (clearTimeout(timer), reject(e)));
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      const buf = Buffer.concat(out);
      if (code === 0 && buf.length) return resolve(buf);
      reject(new Error(`détourage interrompu (${signal ?? `code ${code}`}) ${err.trim().split("\n").pop() ?? ""}`));
    });
    child.stdin.on("error", () => {});
    child.stdin.end(png);
  });
}

async function modelCutout(input: Buffer): Promise<{ png: Buffer; model: CutoutModel }> {
  const png = await sharp(input, { failOn: "none" }).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).png().toBuffer();
  const first = chooseModel();
  let out: Buffer;
  let model = first;
  try {
    out = await runModel(png, first);
  } catch (e) {
    if (first === "small" || !shippedModels().includes("small")) throw e;
    // Plantage (mémoire juste) : second essai avec le petit modèle sur une image réduite.
    console.warn(`[cutout] modèle ${first} indisponible (${availableMemoryMB()} Mo libres), essai du petit modèle :`, (e as Error).message);
    const small = await sharp(png).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    out = await sharp(await runModel(small, "small")).resize(await sharp(png).metadata().then((m) => m.width!), undefined).png().toBuffer();
    model = "small";
  }
  return { png: await fillInteriorHoles(out, png), model };
}

/**
 * Rebouche les « trous » que le modèle découpe à tort à l'intérieur du produit (disque d'un boîtier, languette,
 * étiquette, reflet…) avec les vrais pixels. Un trou ne reste transparent que s'il montre le fond à l'identique
 * (vrai jour : anse d'une tasse, centre d'un anneau) — voir `isTrueGap`.
 */
export async function fillInteriorHoles(cut: Buffer, original: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const src = await sharp(original).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const { holes, outside } = interiorHoles(data, 4, src, w, h);
  if (!holes.length) return cut;
  let opaque = 0;
  for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] >= 128) opaque++;
  const silhouette = opaque + holes.reduce((s, x) => s + x.area, 0);
  let changed = false;
  for (const hole of holes) {
    if (isTrueGap(hole, silhouette)) continue;
    // Le trou et son liseré semi-transparent (2 px) reprennent les vrais pixels, opaques.
    for (const p of hole.pixels) {
      const x = p % w, y = (p / w) | 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (outside[q] || data[q * 4 + 3] === 255) continue;
        data[q * 4] = src[q * 3];
        data[q * 4 + 1] = src[q * 3 + 1];
        data[q * 4 + 2] = src[q * 3 + 2];
        data[q * 4 + 3] = 255;
      }
    }
    changed = true;
  }
  return changed ? sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer() : cut;
}

/** Secours : fond uni détecté depuis les bords (photos sur fond neutre). */
async function floodCutout(input: Buffer): Promise<Buffer> {
  const img = sharp(input, { failOn: "none" }).rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const border: number[][] = [];
  for (let x = 0; x < w; x += 8) border.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y += 8) border.push([0, y], [w - 1, y]);
  const avg = [0, 0, 0];
  for (const [x, y] of border) {
    const i = (y * w + x) * 4;
    avg[0] += data[i];
    avg[1] += data[i + 1];
    avg[2] += data[i + 2];
  }
  avg.forEach((_, k) => (avg[k] /= border.length));
  const seen = new Uint8Array(w * h);
  const stack: number[] = [];
  for (const [x, y] of border) stack.push(y * w + x);
  const tol = 16;
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    const i = p * 4;
    // Fond réellement uni (seul cas où ce secours est permis) : tolérance serrée, pour ne pas ronger les bords clairs du produit.
    const d = Math.max(Math.abs(data[i] - avg[0]), Math.abs(data[i + 1] - avg[1]), Math.abs(data[i + 2] - avg[2]));
    if (d > tol) continue;
    seen[p] = 1;
    data[i + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).blur(0.6).png().toBuffer();
}

/**
 * Détoure le produit. Si le modèle ne peut pas tourner (mémoire insuffisante, plantage), le détourage de secours
 * par couleur du fond n'est utilisé que si le fond est réellement uni ; sinon `CutoutUnavailable` est levée et
 * aucun détourage n'est produit (jamais un détourage grossier sur un fond chargé).
 */
export async function cutoutProduct(input: Buffer): Promise<Cutout> {
  let png: Buffer;
  let method: Cutout["method"] = "model";
  let model: CutoutModel | undefined;
  const bg = await measureBackground(input);
  try {
    if (bg.transparent >= 0.9) {
      // Photo déjà détourée (PNG à fond transparent) : sa transparence est gardée telle quelle.
      png = await sharp(input, { failOn: "none" }).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).ensureAlpha().png().toBuffer();
      method = "existing";
    } else ({ png, model } = await modelCutout(input));
  } catch (e) {
    if (!bg.flat) {
      console.warn("[cutout] modèle indisponible et fond non uni : pas de détourage :", (e as Error).message);
      throw new CutoutUnavailable(L("Le détourage n'a pas pu être réalisé sur cette machine et le fond de la photo n'est pas uni : ajoutez une photo nette du produit seul, sur fond uni, dans l'onglet Produit.", "The cutout couldn't be done on this machine and the photo's background isn't plain: add a sharp photo of the product alone, on a plain background, in the Product tab."));
    }
    console.warn("[cutout] modèle indisponible, détourage par fond uni :", (e as Error).message);
    png = await floodCutout(input);
    method = "flood";
  }
  // Recadre sur le produit avec une petite marge.
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 24) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) throw new CutoutUnavailable(L("Aucun produit détecté sur la photo : essayez une photo où le produit est net et bien visible.", "No product detected in the photo: try a photo where the product is sharp and clearly visible."));
  // Marge sur les côtés et en haut seulement : la base du produit touche le bas
  // de l'image pour que les compositions le posent réellement sur le sol.
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const bbox = { x: x0, y: y0, w: Math.min(info.width, maxX + pad + 1) - x0, h: Math.min(info.height, maxY + 1) - y0 };
  const cropped = await sharp(png).extract({ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h }).png().toBuffer();
  return { png: cropped, width: bbox.w, height: bbox.h, bbox, sourceW: info.width, sourceH: info.height, method, model };
}

/** Palette dominante des pixels opaques (k-moyennes simplifiées). */
export async function extractPalette(png: Buffer, k = 5): Promise<{ hex: string; name: string; share: number }[]> {
  const { data, info } = await sharp(png).ensureAlpha().resize(160, 160, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const px: [number, number, number][] = [];
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] > 200) px.push([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  }
  if (!px.length) return [];
  let centers = Array.from({ length: k }, (_, i) => px[Math.floor((i + 0.5) * (px.length / k))]);
  let assign = new Array(px.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    assign = px.map((p) => {
      let best = 0, bd = Infinity;
      centers.forEach((c, j) => {
        const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
        if (d < bd) { bd = d; best = j; }
      });
      return best;
    });
    centers = centers.map((c, j) => {
      const members = px.filter((_, i) => assign[i] === j);
      if (!members.length) return c;
      return [0, 1, 2].map((ch) => members.reduce((s, m) => s + m[ch], 0) / members.length) as [number, number, number];
    });
  }
  const counts = centers.map((_, j) => assign.filter((a) => a === j).length);
  return centers
    .map((c, j) => ({ hex: rgbToHex(c), share: counts[j] / px.length }))
    .filter((c) => c.share > 0.03)
    .sort((a, b) => b.share - a.share)
    .map((c) => ({ ...c, name: colorName(c.hex, contentLang()), share: Math.round(c.share * 100) / 100 }));
}

/**
 * Recadrages de détail tirés de la photo originale (pixels réels, aucune
 * génération) : zone centrale (étiquette) et partie haute (bouchon, fermoir).
 */
export async function detailCrops(original: Buffer, cut: Cutout, regions?: { x: number; y: number; w: number; h: number }[]): Promise<Buffer[]> {
  const base = sharp(original, { failOn: "none" }).rotate();
  const meta = await base.metadata();
  const W = meta.width ?? cut.sourceW;
  const H = meta.height ?? cut.sourceH;
  const scale = W / cut.sourceW;
  const bx = cut.bbox.x * scale, by = cut.bbox.y * scale, bw = cut.bbox.w * scale, bh = cut.bbox.h * scale;
  const boxes = regions?.length
    ? regions.map((r) => ({ x: bx + r.x * bw, y: by + r.y * bh, w: r.w * bw, h: r.h * bh }))
    : [
        { x: bx + bw * 0.05, y: by + bh * 0.42, w: bw * 0.9, h: bh * 0.4 },
        { x: bx + bw * 0.1, y: by, w: bw * 0.8, h: bh * 0.38 },
      ];
  const out: Buffer[] = [];
  // Fenêtre autorisée : le produit et une petite marge. Jamais le reste de la photo (logo du vendeur, texte
  // publicitaire, autre objet), qui se retrouverait sinon dans un « détail du produit ».
  const m = Math.max(bw, bh) * 0.05;
  const win = { l: Math.max(0, bx - m), t: Math.max(0, by - m), r: Math.min(W, bx + bw + m), b: Math.min(H, by + bh + m) };
  const kept: { left: number; top: number; width: number; height: number }[] = [];
  for (const b of boxes) {
    // Recadrage au format 4:5 autour de la zone, borné à la fenêtre du produit.
    const cw = Math.max(b.w, b.h * 0.8);
    const ch = cw * 1.25;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const left = Math.round(Math.max(win.l, cx - cw / 2));
    const top = Math.round(Math.max(win.t, cy - ch / 2));
    const width = Math.round(Math.min(win.r, cx + cw / 2) - left);
    const height = Math.round(Math.min(win.b, cy + ch / 2) - top);
    // Trop petit pour un détail net (il faudrait l'agrandir plus de ~2,5 fois) : pas de détail flou.
    if (width < 320 || height < 320) continue;
    // Deux détails presque identiques (produit large) : un seul suffit.
    if (kept.some((k) => overlapRatio(k, { left, top, width, height }) > 0.7)) continue;
    kept.push({ left, top, width, height });
    // Taille de sortie 4:5, agrandie au plus de 1,25 fois (au-delà, la photo devient floue) et au plus 1600 × 2000.
    const outW = Math.min(1600, Math.round(Math.min(width, height * 0.8) * 1.25 / 8) * 8);
    out.push(await sharp(original, { failOn: "none" }).rotate().extract({ left, top, width, height }).resize(outW, Math.round(outW * 1.25), { fit: "cover" }).modulate({ brightness: 1.02 }).sharpen({ sigma: 0.8 }).jpeg({ quality: 90 }).toBuffer());
  }
  return out;
}

/** Part de la plus petite des deux zones couverte par l'autre (0 à 1). */
function overlapRatio(a: { left: number; top: number; width: number; height: number }, b: { left: number; top: number; width: number; height: number }) {
  const w = Math.max(0, Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left));
  const h = Math.max(0, Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top));
  return (w * h) / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}
