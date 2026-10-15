// Correction GRATUITE (sans IA) d'un mot fautif dans un bouton d'une image générée : l'intérieur du bouton est repeint
// de sa couleur, puis le texte exact est réécrit lettre par lettre (police du studio).
// Usage : node scripts/pub-correction-bouton.cjs <image> <sortie> <x> <y> <largeur> <hauteur> "<texte>" <taille> <r,g,b fond> <r,g,b texte>
const sharp = require("sharp"), opentype = require("opentype.js"), fs = require("fs"), path = require("path");
const [img, out, X, Y, W, H, text, SIZE, BG, FG] = process.argv.slice(2);
const [x, y, w, h, size] = [X, Y, W, H, SIZE].map(Number);
const bg = BG.split(",").map(Number), fg = FG.split(",").map(Number);
const fb = fs.readFileSync(path.join(__dirname, "../assets/fonts/Jost-400.ttf"));
const font = opentype.parse(fb.buffer.slice(fb.byteOffset, fb.byteOffset + fb.byteLength));
(async () => {
  const inset = 7;
  const fill = { input: { create: { width: w - 2 * inset, height: h - 2 * inset, channels: 3, background: { r: bg[0], g: bg[1], b: bg[2] } } }, left: x + inset, top: y + inset };
  let adv = 0; const gl = [];
  for (const ch of text) { const g = font.charToGlyph(ch); gl.push([g, adv]); adv += (g.advanceWidth * size) / font.unitsPerEm + size * 0.02; }
  const x0 = x + (w - adv) / 2, base = Math.round(y + h / 2 + size * 0.35);
  const letters = gl.filter(([g]) => g.getPath(0, 0, size).commands.length).map(([g, gx]) => {
    const left = Math.round(x0 + gx) - 2, top = base - size - 6;
    const d = g.getPath(2, base - top, size).toPathData(1);
    return { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size + 12}" height="${size + 16}"><path fill="rgb(${fg})" d="${d}"/></svg>`), left, top };
  });
  await sharp(img).composite([fill, ...letters]).png().toFile(out);
})();
