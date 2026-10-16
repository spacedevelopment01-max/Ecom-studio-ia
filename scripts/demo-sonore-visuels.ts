/**
 * Visuels Sonore rendus par le studio (gabarits : post-3 à post-7, ad-1, social-1, banner-1), refaits SANS IA à partir
 * des fichiers publiés : l'ancien petit logo (illisible) est effacé et remplacé par le nouveau logo, en version BLANCHE
 * du studio (fonds sombres), à une taille lisible (14 à 16 % de la largeur) dans un coin dégagé, sans rien recouvrir.
 * Sur ad-1, la phrase « Pause au cou. » devient « La qualité inégalable. » (choix du propriétaire, mot pour mot) et
 * la petite ligne « ÉCOUTE · PAUSE AUTOUR DU COU » est retirée (zone laissée vide).
 *   npx tsx scripts/demo-sonore-visuels.ts <dossier de sortie>
 * Rien n'est écrit dans public/ : les images sont à regarder avant d'être mises en place.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ensureFonts, font } from "@/lib/media/fonts";
import { oneColourVersion } from "@/lib/logo-v2/artwork";

const OUT = process.argv[2];
if (!OUT) throw new Error("usage : demo-sonore-visuels.ts <dossier de sortie>");
fs.mkdirSync(OUT, { recursive: true });
const SRC = path.join(process.cwd(), "public", "demo", "casque");
/** Ancien petit logo (mesuré par corrélation, scripts/demo-sonore-visuels-places.json) et place du nouveau. */
const PLACES = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts", "demo-sonore-visuels-places.json"), "utf8")).places as Record<string, [number, number, number, number, number]>;
const NEW: Record<string, { x: number; y: number; w: number }> = {
  "post-3": { x: 60, y: 1086, w: 173 }, // bas gauche, sur le sable (texte en haut)
  "post-4": { x: 860, y: 44, w: 170 }, // haut droite, ciel (surtitre à gauche)
  "post-5": { x: 64, y: 106, w: 170 }, // haut gauche, au-dessus du surtitre
  "post-6": { x: 860, y: 44, w: 166 }, // haut droite, ciel
  "post-7": { x: 884, y: 250, w: 156 }, // à droite sous la bande du titre (titre et surtitre sur x 215-866, y 92-219)
  "ad-1": { x: 856, y: 70, w: 170 }, // haut droite, fond sombre (titre à gauche)
  "social-1": { x: 870, y: 40, w: 165 }, // haut droite, mer
  "banner-1": { x: 40, y: 30, w: 168 }, // haut gauche, fond sombre
};

type Px = { data: Uint8ClampedArray; width: number; height: number };
/**
 * Efface une zone (masque) : chaque pixel prend la moyenne des premiers pixels hors zone à gauche, à droite, en haut
 * et en bas, pondérée par la distance (fonds lisses ou flous : dégradés et photos floues reconstitués proprement).
 * `dirs` : seulement gauche et droite sous une ligne de texte gardée (son jambage ne déteint pas vers le bas).
 */
function fill(img: Px, mask: Uint8Array, dirs: number[][] = [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
  const { data, width: W, height: H } = img;
  const src = new Uint8ClampedArray(data);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      const acc = [0, 0, 0];
      let wsum = 0;
      for (const [dx, dy] of dirs) {
        let xx = x, yy = y, d = 0;
        do { xx += dx; yy += dy; d++; } while (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx]);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const j = (yy * W + xx) * 4, w = 1 / (d * d);
        for (let c = 0; c < 3; c++) acc[c] += src[j + c] * w;
        wsum += w;
      }
      if (wsum) for (let c = 0; c < 3; c++) data[i * 4 + c] = acc[c] / wsum;
    }
  // Grain de la photo reproduit : écart mesuré entre chaque pixel du pourtour et son voisin, appliqué à la zone.
  let n = 0, sum = 0;
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (mask[i] || !(mask[i - 1] || mask[i + 1] || mask[i - W] || mask[i + W] || mask[i - 2] || mask[i + 2])) continue;
      const d = src[i * 4 + 1] - src[(i + W) * 4 + 1];
      if (mask[i + W]) continue;
      sum += d * d;
      n++;
    }
  const sigma = n ? Math.min(8, Math.sqrt(sum / n / 2)) : 0;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < mask.length; i++) if (mask[i]) { const g = (rnd() + rnd() + rnd()) * 2 * sigma; for (let c = 0; c < 3; c++) data[i * 4 + c] += g; }
}
const rect = (W: number, H: number, x: number, y: number, w: number, h: number, pad = 0) => {
  const m = new Uint8Array(W * H);
  for (let yy = Math.max(0, y - pad); yy < Math.min(H, y + h + pad); yy++) for (let xx = Math.max(0, x - pad); xx < Math.min(W, x + w + pad); xx++) m[yy * W + xx] = 1;
  return m;
};

ensureFonts();
const logo = await loadImage(await oneColourVersion(await sharp(path.join(SRC, "logo.png")).trim().png().toBuffer(), "#FFFFFF"));
for (const name of Object.keys(NEW)) {
  for (const ext of ["jpg", "webp"] as const) {
    const file = path.join(SRC, `${name}.${ext}`);
    if (!fs.existsSync(file)) continue;
    const src = await loadImage(await sharp(file).png().toBuffer());
    const W = src.width, H = src.height;
    const c = createCanvas(W, H);
    const ctx = c.getContext("2d");
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, W, H);
    const px: Px = { data: img.data, width: W, height: H };
    // 1. Ancien petit logo effacé (avec son liseré).
    const [, ox, oy, ow, oh] = PLACES[name];
    fill(px, rect(W, H, ox, oy, ow, oh, 9));
    // 2. ad-1 : 2e ligne du titre et petite ligne d'activités effacées (la 1re ligne « Casque audio. » reste telle quelle).
    if (name === "ad-1") {
      const k = W / 1080;
      const LR = [[-1, 0], [1, 0]];
      fill(px, rect(W, H, Math.round(60 * k), Math.round(374 * k), Math.round(690 * k), Math.round(104 * k)), LR);
      fill(px, rect(W, H, Math.round(60 * k), Math.round(486 * k), Math.round(566 * k), Math.round(56 * k)), LR);
    }
    ctx.putImageData(img, 0, 0);
    if (name === "ad-1") {
      const k = W / 1080;
      // Même police, même taille et même interligne que la 1re ligne (Archivo 600, 97 px, lignes espacées de 102 px).
      ctx.font = font("Archivo", 600, Math.round(97 * k));
      ctx.fillStyle = "#FFFFFF";
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText("La qualité", Math.round(81 * k), Math.round(453 * k));
      ctx.fillText("inégalable.", Math.round(81 * k), Math.round(555 * k));
    }
    // 3. Nouveau logo, blanc, lisible, dans son coin dégagé.
    const k = W / (name === "banner-1" ? 1200 : 1080);
    const p = NEW[name];
    const lw = Math.round(p.w * k), lh = Math.round((logo.height / logo.width) * lw);
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = Math.round(8 * k);
    ctx.drawImage(logo, Math.round(p.x * k), Math.round(p.y * k), lw, lh);
    ctx.shadowBlur = 0;
    const png = await c.encode("png");
    const out = path.join(OUT, `${name}.${ext}`);
    await (ext === "jpg" ? sharp(png).jpeg({ quality: 84 }) : sharp(png).webp({ quality: 80 })).toFile(out);
  }
  console.log(name, "refait");
}
