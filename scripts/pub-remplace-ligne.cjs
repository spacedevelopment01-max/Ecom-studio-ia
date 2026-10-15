// Remplacement GRATUIT (sans IA) d'une ligne de texte d'une image générée : la zone est effacée avec le fond voisin
// (bande étirée), puis le nouveau texte exact est écrit lettre par lettre avec une police du studio.
// Usage : node scripts/pub-remplace-ligne.cjs <spec.json>
// spec : { image, out, erase:{x,y,w,h}, from:{y,h} (bande de fond source), text, font, size, x (gauche) | cx (centre),
//          baseline, color:[r,g,b], track?, fill?:[r,g,b] (fond uni au lieu de la bande) }
const sharp = require("sharp"), opentype = require("opentype.js"), fs = require("fs"), path = require("path");
const s = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const fb = fs.readFileSync(path.join(__dirname, "../assets/fonts", s.font));
const font = opentype.parse(fb.buffer.slice(fb.byteOffset, fb.byteOffset + fb.byteLength));
(async () => {
  const e = s.erase;
  const cover = s.fill
    ? { input: { create: { width: e.w, height: e.h, channels: 3, background: { r: s.fill[0], g: s.fill[1], b: s.fill[2] } } }, left: e.x, top: e.y }
    : { input: await sharp(s.image).extract({ left: e.x, top: s.from.y, width: e.w, height: s.from.h }).resize(e.w, e.h, { fit: "fill" }).blur(1.2).png().toBuffer(), left: e.x, top: e.y };
  const track = s.track ?? 0;
  let adv = 0; const gl = [];
  for (const ch of s.text) { const g = font.charToGlyph(ch); gl.push([g, adv]); adv += (g.advanceWidth * s.size) / font.unitsPerEm + track; }
  adv -= track;
  const x0 = s.cx != null ? s.cx - adv / 2 : s.x;
  const box = Math.ceil(s.size * 1.6);
  const letters = gl.filter(([g]) => g.getPath(0, 0, s.size).commands.length).map(([g, gx]) => {
    const left = Math.round(x0 + gx) - 4, top = s.baseline - Math.ceil(s.size * 1.1);
    const d = g.getPath(4, s.baseline - top, s.size).toPathData(1);
    return { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${box}" height="${box}"><path fill="rgb(${s.color})" d="${d}"/></svg>`), left, top };
  });
  await sharp(s.image).composite([cover, ...letters]).png().toFile(s.out);
  console.log("ok", s.out, "largeur", Math.round(adv));
})();
