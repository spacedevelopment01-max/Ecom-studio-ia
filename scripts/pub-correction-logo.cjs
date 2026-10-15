// Correction GRATUITE (sans IA) de la publicité Qwen ARVEN : ligne « ACER » réécrite en « ACIER » (police Jost),
// mot « ARVEN » de l'IA remplacé par le vrai logo (emblème + ARVEN + HORLOGERIE, encre passée en ivoire).
// Usage : node scripts/pub-correction-logo.cjs <racine du dépôt>
const sharp = require("sharp"), opentype = require("opentype.js"), path = require("path");
const R = process.argv[2], D = path.join(R, "reports/alibaba-qwen-essai/");
const IVORY = [243, 239, 231];
async function strip(img, x, y0, w, h, y, H) { // bande de fond étirée pour effacer un texte
  return { input: await sharp(img).extract({ left: x, top: y0, width: w, height: h }).resize(w, H, { fit: "fill" }).blur(1.2).png().toBuffer(), left: x, top: y };
}
async function logoPart(box, h) { // morceau du vrai logo, fond ivoire retiré, encre passée en ivoire, cognac gardé
  const { data, info } = await sharp(D + "logo-qwen.png").extract(box).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.max(0, Math.min(1, (238 - b) / (238 - 45)));
    const cognac = r - b > 45;
    const c = cognac ? [176, 112, 56] : IVORY;
    out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; out[j + 3] = Math.round(a * 255);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 5 }).resize({ height: h }).png().toBuffer();
}
(async () => {
  const ad = D + "pub-qwen.png";
  const W = 1104;
  // Couleur des textes d'origine
  const fb = require("fs").readFileSync(path.join(R, "assets/fonts/Jost-400.ttf")); const font = opentype.parse(fb.buffer.slice(fb.byteOffset, fb.byteOffset + fb.byteLength));
  const text = "CHRONOGRAPHE · ACIER & CUIR", size = 30, track = 7.2;
  let x = 0; const glyphs = [];
  for (const ch of text) { const g = font.charToGlyph(ch); glyphs.push([g, x]); x += g.advanceWidth * size / font.unitsPerEm + track; }
  const tw = x - track, x0 = (W - tw) / 2, base = 491;
  const letters = glyphs.filter(([g]) => g.getPath(0, 0, size).commands.length).map(([g, gx]) => {
    const left = Math.round(x0 + gx) - 2, top = base - 40;
    const d = g.getPath(2, base - top, size).toPathData(1);
    return { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="44" height="52"><path fill-rule="nonzero" fill="rgb(228,220,207)" d="${d}"/></svg>`), left, top };
  });
  const emblem = await logoPart({ left: 420, top: 185, width: 505, height: 510 }, 112);
  const word = await logoPart({ left: 280, top: 745, width: 780, height: 220 }, 74);
  const em = await sharp(emblem).metadata(), wd = await sharp(word).metadata();
  const gap = 26, total = em.width + gap + wd.width, lx = Math.round((W - total) / 2), top = 22;
  await sharp(ad).composite([
    await strip(ad, 300, 8, 520, 22, 36, 100),     // efface l'ancien « ARVEN » écrit par l'IA
    await strip(ad, 220, 508, 680, 10, 450, 56),   // efface la ligne fautive « ACER »
    ...letters,
    { input: emblem, left: lx, top },
    { input: word, left: lx + em.width + gap, top: top + Math.round((em.height - wd.height) / 2) },
  ]).png().toFile(D + "pub-qwen-corrigee.png");
  console.log("ok", tw.toFixed(0), em.width, wd.width);
})();
