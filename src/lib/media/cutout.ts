/**
 * Détourage local du produit (modèle ONNX embarqué, sans service externe),
 * extraction de la palette et des zones de détail. Les pixels du produit ne
 * sont jamais régénérés : toutes les compositions réutilisent ce détourage.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import sharp from "sharp";
import { colorName, rgbToHex } from "../color";
import { contentLang, L } from "../i18n-server";

export type Cutout = { png: Buffer; width: number; height: number; bbox: { x: number; y: number; w: number; h: number }; sourceW: number; sourceH: number; method: "model" | "flood" };

/** Délai maximal du détourage par le modèle avant de passer au détourage de secours. */
const MODEL_TIMEOUT_MS = Number(process.env.CUTOUT_TIMEOUT_MS) || 180_000;

/** Lance le modèle dans un processus séparé (un plantage ou un manque de mémoire n'arrête pas le studio). */
function runModel(png: Buffer, model: "medium" | "small"): Promise<Buffer> {
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

async function modelCutout(input: Buffer): Promise<Buffer> {
  const png = await sharp(input, { failOn: "none" }).rotate().resize(2048, 2048, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  let out: Buffer;
  try {
    out = await runModel(png, "medium");
  } catch (e) {
    // Machine juste en mémoire : nouvel essai avec le petit modèle sur une image réduite.
    console.warn("[cutout] modèle moyen indisponible, essai du petit modèle :", (e as Error).message);
    const small = await sharp(png).resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
    out = await sharp(await runModel(small, "small")).resize(await sharp(png).metadata().then((m) => m.width!), undefined).png().toBuffer();
  }
  return fillInteriorHoles(out, png);
}

/**
 * Rebouche les « trous » que le modèle découpe à tort à l'intérieur du produit (languette colorée,
 * étiquette, reflet…) : une zone transparente qui ne touche pas le bord de l'image et dont la couleur
 * d'origine diffère du fond est rendue opaque avec ses vrais pixels. Les vrais jours (anse d'une tasse,
 * fond visible à travers) gardent la couleur du fond et restent transparents.
 */
export async function fillInteriorHoles(cut: Buffer, original: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(cut).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const src = await sharp(original).resize(w, h, { fit: "fill" }).removeAlpha().raw().toBuffer();
  const N = w * h;
  const transparent = (p: number) => data[p * 4 + 3] < 128;
  // Fond relié au bord.
  const outside = new Uint8Array(N);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  const bg = [0, 0, 0];
  let bgN = 0;
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || !transparent(p)) continue;
    outside[p] = 1;
    if (bgN < 200000) { bg[0] += src[p * 3]; bg[1] += src[p * 3 + 1]; bg[2] += src[p * 3 + 2]; bgN++; }
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < N - w) stack.push(p + w);
  }
  if (!bgN) return cut;
  const bgc = bg.map((v) => v / bgN);
  // Composantes transparentes intérieures.
  const seen = new Uint8Array(N);
  let changed = false;
  for (let start = 0; start < N; start++) {
    if (seen[start] || outside[start] || !transparent(start)) continue;
    const comp: number[] = [];
    const st = [start];
    let sr = 0, sg = 0, sb = 0;
    while (st.length) {
      const p = st.pop()!;
      if (seen[p] || outside[p] || !transparent(p)) continue;
      seen[p] = 1;
      comp.push(p);
      sr += src[p * 3]; sg += src[p * 3 + 1]; sb += src[p * 3 + 2];
      const x = p % w;
      if (x > 0) st.push(p - 1);
      if (x < w - 1) st.push(p + 1);
      if (p >= w) st.push(p - w);
      if (p < N - w) st.push(p + w);
    }
    const n = comp.length;
    const dist = Math.abs(sr / n - bgc[0]) + Math.abs(sg / n - bgc[1]) + Math.abs(sb / n - bgc[2]);
    if (dist < 75) continue; // couleur du fond : vrai jour, on le garde
    // Le trou et son liseré semi-transparent (2 px) reprennent les vrais pixels, opaques.
    for (const p of comp) {
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
  const tol = 38;
  while (stack.length) {
    const p = stack.pop()!;
    if (seen[p]) continue;
    const i = p * 4;
    const d = Math.abs(data[i] - avg[0]) + Math.abs(data[i + 1] - avg[1]) + Math.abs(data[i + 2] - avg[2]);
    if (d > tol * 3) continue;
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

export async function cutoutProduct(input: Buffer): Promise<Cutout> {
  const meta = await sharp(input, { failOn: "none" }).rotate().metadata();
  let png: Buffer;
  let method: Cutout["method"] = "model";
  try {
    png = await modelCutout(input);
  } catch (e) {
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
  if (maxX <= minX || maxY <= minY) throw new Error(L("Aucun produit détecté sur la photo : essayez une photo où le produit est net et bien visible.", "No product detected in the photo: try a photo where the product is sharp and clearly visible."));
  // Marge sur les côtés et en haut seulement : la base du produit touche le bas
  // de l'image pour que les compositions le posent réellement sur le sol.
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
  const x0 = Math.max(0, minX - pad), y0 = Math.max(0, minY - pad);
  const bbox = { x: x0, y: y0, w: Math.min(info.width, maxX + pad + 1) - x0, h: Math.min(info.height, maxY + 1) - y0 };
  const cropped = await sharp(png).extract({ left: bbox.x, top: bbox.y, width: bbox.w, height: bbox.h }).png().toBuffer();
  return { png: cropped, width: bbox.w, height: bbox.h, bbox, sourceW: info.width, sourceH: info.height, method };
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
  for (const b of boxes) {
    // Recadrage au format 4:5 autour de la zone, borné à l'image.
    const cw = Math.max(b.w, b.h * 0.8);
    const ch = cw * 1.25;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const left = Math.max(0, Math.round(cx - cw / 2));
    const top = Math.max(0, Math.round(cy - ch / 2));
    const width = Math.min(W - left, Math.round(cw));
    const height = Math.min(H - top, Math.round(ch));
    if (width < 120 || height < 120) continue;
    out.push(await sharp(original, { failOn: "none" }).rotate().extract({ left, top, width, height }).resize(1600, 2000, { fit: "cover" }).modulate({ brightness: 1.02 }).sharpen({ sigma: 0.8 }).jpeg({ quality: 90 }).toBuffer());
  }
  return out;
}
