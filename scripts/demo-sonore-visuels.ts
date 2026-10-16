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
/**
 * Efface une grande zone de texte sur un fond en dégradé, sans trace :
 *  1. fond flouté autour de la zone (texte blanc exclu) ;
 *  2. intérieur reconstitué en raccordant ce fond flou de bord à bord (équation de Laplace, sur une grille réduite) :
 *     dégradé continu, aucun contour ni traînée ;
 *  3. grain d'origine recopié depuis une zone propre de même taille (`grainFrom` : décalage vertical), pas inventé.
 */
function fillSmooth(img: Px, mask: Uint8Array, grainDy: number) {
  const { data, width: W, height: H } = img;
  const src = new Float32Array(data);
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const R = 8; // flou du fond (rayon)
  const valid = (i: number) => !mask[i] && Math.min(src[i * 4], src[i * 4 + 1], src[i * 4 + 2]) <= 150;
  const blurAt = (x: number, y: number, c: number) => {
    let t = 0, n = 0;
    for (let yy = Math.max(0, y - R); yy <= Math.min(H - 1, y + R); yy += 2) for (let xx = Math.max(0, x - R); xx <= Math.min(W - 1, x + R); xx += 2) { const j = yy * W + xx; if (valid(j)) { t += src[j * 4 + c]; n++; } }
    return n ? t / n : NaN;
  };
  // Grille réduite (pas de 4 px) sur la zone élargie de 2 cases ; les cases hors zone sont fixées au fond flou.
  const S = 4, gx0 = x0 - 2 * S, gy0 = y0 - 2 * S, GW = Math.ceil((x1 - gx0) / S) + 3, GH = Math.ceil((y1 - gy0) / S) + 3;
  const inside = (gx: number, gy: number) => { const x = gx0 + gx * S, y = gy0 + gy * S; return x >= x0 && x <= x1 && y >= y0 && y <= y1 && mask[y * W + x] === 1; };
  const grid = [0, 1, 2].map((c) => {
    const g = new Float32Array(GW * GH);
    let mean = 0, nm = 0;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (!inside(gx, gy)) { const v = blurAt(Math.min(W - 1, gx0 + gx * S), Math.min(H - 1, gy0 + gy * S), c); g[gy * GW + gx] = v; if (!isNaN(v)) { mean += v; nm++; } }
    mean /= Math.max(1, nm);
    for (let k = 0; k < g.length; k++) if (isNaN(g[k]) || inside(k % GW, (k / GW) | 0)) g[k] = isNaN(g[k]) ? mean : g[k];
    for (let it = 0; it < 4000; it++)
      for (let gy = 1; gy < GH - 1; gy++) for (let gx = 1; gx < GW - 1; gx++) if (inside(gx, gy)) { const k = gy * GW + gx; g[k] = (g[k - 1] + g[k + 1] + g[k - GW] + g[k + GW]) / 4; }
    return g;
  });
  const sample = (g: Float32Array, x: number, y: number) => {
    const fx = (x - gx0) / S, fy = (y - gy0) / S, ix = Math.min(GW - 2, Math.max(0, Math.floor(fx))), iy = Math.min(GH - 2, Math.max(0, Math.floor(fy))), ax = fx - ix, ay = fy - iy;
    return g[iy * GW + ix] * (1 - ax) * (1 - ay) + g[iy * GW + ix + 1] * ax * (1 - ay) + g[(iy + 1) * GW + ix] * (1 - ax) * ay + g[(iy + 1) * GW + ix + 1] * ax * ay;
  };
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      // Grain d'origine : écart du pixel source (zone propre décalée) à la moyenne de ses voisins.
      const sy = Math.min(H - 2, Math.max(1, y + grainDy)), j = sy * W + x;
      for (let c = 0; c < 3; c++) {
        let m = 0;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) m += src[((sy + dy) * W + Math.min(W - 1, Math.max(0, x + dx))) * 4 + c];
        data[i * 4 + c] = sample(grid[c], x, y) + (src[j * 4 + c] - m / 25);
      }
    }
}

/**
 * Retire un texte posé sur une photo : seuls les pixels des lettres (blancs ou verts, avec leurs accents pâles et leur ombre douce : 9 px au-dessus et en dessous, 6 px sur les côtés
 * douce) sont effacés,
 * puis reconstitués par diffusion depuis la photo voisine (traits fins : pas de flou visible) et reçoivent le grain
 * d'origine recopié `grainDy` px plus bas. Les zones vides restent propres, sans traînée.
 */
/** Pixel de texte du gabarit : blanc (peu saturé, clair) ou vert de la marque. */
const isGlyph = (src: Float32Array, i: number) => {
  const r = src[i], g = src[i + 1], b = src[i + 2];
  // Blanc pur des lettres seulement (un reflet du t-shirt rose ou des cheveux n'en est pas un) ; bords adoucis : dilatation.
  return (Math.min(r, g, b) > 210 && Math.max(r, g, b) - Math.min(r, g, b) < 35) || (g > 100 && g - r > 35 && g - b > 5);
};

function eraseGlyphs(img: Px, x0: number, y0: number, w: number, h: number, grainDy: number, photo: Uint8Array | null = null) {
  const { data, width: W, height: H } = img;
  const src = new Float32Array(data);
  const m = new Uint8Array(W * H);
  for (let y = y0; y < Math.min(H, y0 + h); y++)
    for (let x = x0; x < Math.min(W, x0 + w); x++) {
      const i = (y * W + x) * 4, r = src[i], g = src[i + 1], b = src[i + 2];
      if (isGlyph(src, i)) for (let dy = -9; dy <= 9; dy++) for (let dx = -6; dx <= 6; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W) m[yy * W + xx] = 1; }
    }
  if (photo) {
    // Avec la photo d'origine : sont aussi effacés les pixels qui s'écartent nettement de ce que la photo prévoit
    // (traits fins et adoucis, bas d'un cercle, accents pâles, ombres), sans toucher au reste.
    const pre = [0, 1, 2].map((c) => {
      let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let y = Math.max(0, y0 - 20); y < Math.min(H, y0 + h + 20); y++)
        for (let x = Math.max(0, x0 - 40); x < Math.min(W, x0 + w + 40); x++) {
          const k = y * W + x;
          if (m[k]) continue;
          const pv = photo[k * 3 + c], v = src[k * 4 + c];
          n++; sx += pv; sy += v; sxx += pv * pv; sxy += pv * v;
        }
      const a = (n * sxy - sx * sy) / Math.max(1e-6, n * sxx - sx * sx);
      return [a, (sy - a * sx) / Math.max(1, n)];
    });
    const extra: number[] = [];
    for (let y = Math.max(0, y0 - 8); y < Math.min(H, y0 + h + 8); y++)
      for (let x = Math.max(0, x0 - 8); x < Math.min(W, x0 + w + 8); x++) {
        const k = y * W + x;
        let d = 0;
        for (let c = 0; c < 3; c++) d += Math.abs(src[k * 4 + c] - (pre[c][0] * photo[k * 3 + c] + pre[c][1]));
        if (d > 36) extra.push(k);
      }
    for (const k of extra) { const x = k % W, y = (k / W) | 0; for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < H && xx < W) m[yy * W + xx] = 1; } }
    // Vraie photo d'origine (recalée sur le visuel) : sous chaque lettre, son pixel, ramené à la teinte locale du
    // visuel (voile sombre, dégradé) par un ajustement linéaire sur les pixels voisins sans texte.
    // Ajustement ligne par ligne sur une fenêtre glissante de 33 lignes : transition continue, sans marche.
    for (let y = Math.max(0, y0 - 10); y < Math.min(H, y0 + h + 10); y++) {
      const coef = [0, 1, 2].map((c) => {
        let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (let yy = Math.max(0, y - 16); yy <= Math.min(H - 1, y + 16); yy++)
          for (let x = Math.max(0, x0 - 60); x < Math.min(W, x0 + w + 60); x++) {
            const k = yy * W + x;
            if (m[k]) continue;
            const pv = photo[k * 3 + c], v = src[k * 4 + c];
            n++; sx += pv; sy += v; sxx += pv * pv; sxy += pv * v;
          }
        const a = n > 50 ? (n * sxy - sx * sy) / Math.max(1e-6, n * sxx - sx * sx) : 1;
        return [a, n > 50 ? (sy - a * sx) / n : 0];
      });
      for (let x = Math.max(0, x0 - 7); x < Math.min(W, x0 + w + 7); x++) {
        const k = y * W + x;
        if (!m[k]) continue;
        for (let c = 0; c < 3; c++) data[k * 4 + c] = coef[c][0] * photo[k * 3 + c] + coef[c][1];
      }
    }
    return;
  }
  fill(img, m);
  // Lissage (Laplace) des pixels reconstitués : supprime les traînées de l'interpolation ligne/colonne.
  for (let it = 0; it < 2500; it++)
    for (let y = Math.max(1, y0 - 10); y < Math.min(H - 1, y0 + h + 10); y++)
      for (let x = Math.max(1, x0 - 7); x < Math.min(W - 1, x0 + w + 7); x++) {
        const k = y * W + x;
        if (!m[k]) continue;
        for (let c = 0; c < 3; c++) data[k * 4 + c] = (data[(k - 1) * 4 + c] + data[(k + 1) * 4 + c] + data[(k - W) * 4 + c] + data[(k + W) * 4 + c]) / 4;
      }
  // Grain d'origine.
  for (let y = y0 - 10; y < y0 + h + 10; y++)
    for (let x = x0 - 7; x < x0 + w + 7; x++) {
      const k = y * W + x;
      if (y < 2 || x < 2 || y >= H - 2 || x >= W - 2 || !m[k]) continue;
      const sy = Math.min(H - 3, Math.max(2, y + grainDy));
      // Jamais de grain pris sur un autre texte (il réapparaîtrait en fantôme).
      let near = false;
      for (let dy = -10; dy <= 10 && !near; dy++) for (let dx = -10; dx <= 10 && !near; dx++) { const yy = sy + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W && isGlyph(src, (yy * W + xx) * 4)) near = true; }
      if (near) continue;
      for (let c = 0; c < 3; c++) {
        // Texture de la bande voisine (mèches, plis, grain) : écart à sa moyenne locale 9 x 9.
        let mm = 0, nn = 0;
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const yy = Math.min(H - 1, Math.max(0, sy + dy)), xx = Math.min(W - 1, Math.max(0, x + dx)); mm += src[(yy * W + xx) * 4 + c]; nn++; }
        data[k * 4 + c] += src[(sy * W + x) * 4 + c] - mm / nn;
      }
    }
}

/** Doublons retirés (choix du propriétaire) : [x, y, largeur, hauteur, décalage du grain] sur 1080 px de large. */
const DOUBLONS: Record<string, [number, number, number, number, number][]> = {
  "post-3": [[284, 78, 508, 28, 40]], // « CASQUE AUDIO SUPRA-AURICULAIRE » au-dessus de « Supra-auriculaire »
  "post-4": [
    [72, 878, 498, 48, 60], // « Casque audio supra-auriculaire » sous le même titre
    [186, 970, 90, 90, 100], // puce 1 (cercle) : son texte est réécrit sous la puce du milieu, centrée
    [128, 1064, 204, 60, 70], // texte de la puce 1
    [448, 1064, 186, 64, 70], // « Dimensions supra-auriculaire »
    [804, 970, 90, 90, 100], // puce 3 (cercle)
    [796, 1064, 106, 32, 40], // « Prix 79 € »
  ],
  "post-5": [[70, 764, 572, 288, 300]], // puces « Dimensions », « Prix 79 € » et « Format Supra-auriculaire »
  "post-6": [
    [70, 218, 676, 30, 40], // surtitre « CASQUE AUDIO SUPRA-AURICULAIRE » (le titre dit la même chose)
    [72, 553, 468, 48, 60], // « Casque audio supra-auriculaire » sous le même titre
  ],
  "post-7": [[262, 198, 550, 28, 36]], // « CASQUE AUDIO SUPRA-AURICULAIRE » sous « Supra-auriculaire »
};

const rect = (W: number, H: number, x: number, y: number, w: number, h: number, pad = 0) => {
  const m = new Uint8Array(W * H);
  for (let yy = Math.max(0, y - pad); yy < Math.min(H, y + h + pad); yy++) for (let xx = Math.max(0, x - pad); xx < Math.min(W, x + w + pad); xx++) m[yy * W + xx] = 1;
  return m;
};

/** Photos Pixabay d'origine recalées sur chaque visuel (échelle, décalage : scripts/demo-sonore-photos.json). */
const PHOTOS = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts", "demo-sonore-photos.json"), "utf8")) as Record<string, { photo: string; s: number; ox: number; oy: number }>;
async function alignedPhoto(name: string, W: number, H: number): Promise<Uint8Array | null> {
  const r = PHOTOS[name];
  if (!r) return null;
  const file = path.join(process.cwd(), "scripts", "demo-products", "inputs", "pixabay", `${r.photo}.jpg`);
  const meta = await sharp(file).metadata();
  const k = W / (name === "banner-1" ? 1200 : 1080);
  const sw = Math.round(meta.width! * r.s * k), sh = Math.round(meta.height! * r.s * k);
  const { data } = await sharp(file).resize(sw, sh).extract({ left: Math.round(r.ox * k), top: Math.round(r.oy * k), width: W, height: H }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

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
      // Les deux zones (2e ligne du titre et petite ligne) d'un seul tenant : un dégradé continu, sans ligne.
      // Grain recopié de la bande propre juste en dessous (fond uni sous le titre).
      fillSmooth(px, rect(W, H, Math.round(60 * k), Math.round(374 * k), Math.round(690 * k), Math.round(170 * k)), Math.round(240 * k));
    }
    // 3. Doublons retirés (post-3 à post-7).
    const photo = DOUBLONS[name] ? await alignedPhoto(name, W, H) : null;
    for (const [x, y, w, h, gdy] of DOUBLONS[name] ?? []) {
      const k = W / 1080;
      eraseGlyphs(px, Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), Math.round(gdy * k), photo);
    }
    ctx.putImageData(img, 0, 0);
    if (name === "post-4") {
      // La seule puce gardée, « coques argentées, arceau rembourré », recentrée sous le cercle du milieu (même police :
      // Jost 600, 23 px, mêmes lignes de base).
      const k = W / 1080;
      ctx.font = font("Jost", 600, Math.round(23 * k));
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("coques argentées,", Math.round(540 * k), Math.round(1088 * k));
      ctx.fillText("arceau rembourré", Math.round(540 * k), Math.round(1116 * k));
    }
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
    // 4. Nouveau logo, blanc, lisible, dans son coin dégagé.
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
