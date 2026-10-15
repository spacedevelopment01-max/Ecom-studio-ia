// Calques de titres du film ARVEN (1080 × 1920, fond transparent) : polices du studio (Jost, Cormorant), logo réel
// recoloré pour fond noir (encre → ivoire, aiguille → or). Modifier un texte ici puis relancer le montage.
const sharp = require("sharp"), path = require("path");
const D = path.join(__dirname);
const IVORY = "#F3EFE7", GOLD = "#C9A46A", W = 1080, H = 1920;
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
const spaced = (t, y, size, color, ls, family = "Jost", weight = 500) =>
  `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="${family}" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${color}">${t}</text>`;
(async () => {
  await sharp(svg(spaced("LE DÉTAIL.", 420, 64, IVORY, 18))).png().toFile(path.join(D, "titre-detail.png"));
  await sharp(svg(spaced("L’ALLURE.", 420, 64, IVORY, 18))).png().toFile(path.join(D, "titre-allure.png"));
  await sharp(svg(`<text x="${W / 2}" y="1395" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="92" fill="${IVORY}">Le temps vous va <tspan fill="${GOLD}">bien.</tspan></text>`)).png().toFile(path.join(D, "slogan.png"));
  const bw = 400, bh = 96, bx = (W - bw) / 2, by = 1500;
  await sharp(svg(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="48" fill="rgba(17,18,20,0.35)" stroke="${GOLD}" stroke-width="2.5"/>` + spaced("DÉCOUVRIR", by + 60, 34, IVORY, 10))).png().toFile(path.join(D, "bouton.png"));
  // Logo réel : fond ivoire retiré, encre en ivoire, aiguille cognac → or (lisible sur noir).
  const { data, info } = await sharp(path.join(D, "../references/logo-qwen.png")).extract({ left: 260, top: 170, width: 810, height: 800 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const [r, , b] = [data[i], data[i + 1], data[i + 2]];
    const a = Math.max(0, Math.min(1, (238 - b) / (238 - 45)));
    const c = r - b > 45 ? [201, 164, 106] : [243, 239, 231];
    out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2]; out[j + 3] = Math.round(a * 255);
  }
  const logo = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 5 }).resize({ width: 380 }).png().toBuffer();
  const m = await sharp(logo).metadata();
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: logo, left: Math.round((W - m.width) / 2), top: 190 }]).png().toFile(path.join(D, "logo.png"));
  console.log("titres ok", m.width, m.height);
})();
