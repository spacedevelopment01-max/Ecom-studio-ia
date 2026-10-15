// Calques de titres du film Racines & Pierres (1080 × 1920, transparent) : polices du studio (Cormorant, Jost),
// palette de la marque, logo réel du projet (public/demo/paysagiste/logo.png) posé sur la carte finale claire.
const sharp = require("sharp"), path = require("path");
const D = __dirname, W = 1080, H = 1920;
const CREAM = "#F7F8F1", GREEN = "#3F6B4A", DARK = "#1D2E22", ROSE = "#E89BA7";
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
const shadow = `<filter id="s" x="-20%" y="-50%" width="140%" height="200%"><feDropShadow dx="0" dy="3" stdDeviation="8" flood-color="#000" flood-opacity="0.55"/></filter>`;
const big = (txt, y) => `<defs>${shadow}</defs><text x="${W / 2}" y="${y}" filter="url(#s)" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="118" fill="${CREAM}">${txt}</text>`;
const small = (txt, y, color, size = 34, ls = 10) => `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Jost" font-weight="500" font-size="${size}" letter-spacing="${ls}" fill="${color}">${txt}</text>`;
(async () => {
  await sharp(svg(big("On crée.", 1560) + small("CRÉATION DE JARDIN", 1630, CREAM))).png().toFile(path.join(D, "titre-cree.png"));
  await sharp(svg(big("On aménage.", 1560) + small("TERRASSES · ALLÉES · MURETS", 1630, CREAM))).png().toFile(path.join(D, "titre-amenage.png"));
  await sharp(svg(big("On entretient.", 1560) + small("ENTRETIEN À L’ANNÉE", 1630, CREAM))).png().toFile(path.join(D, "titre-entretient.png"));
  // Logo réel : bordure noire retirée, coins arrondis, ombre douce.
  const src = path.join(__dirname, "../../public/demo/paysagiste/logo.png");
  const lw = 640, logo = await sharp(src).extract({ left: 62, top: 62, width: 862, height: 708 }).resize({ width: lw }).toBuffer();
  const lh = Math.round(708 * lw / 862), mask = Buffer.from(`<svg width="${lw}" height="${lh}"><rect width="${lw}" height="${lh}" rx="28"/></svg>`);
  const rounded = await sharp(logo).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: rounded, left: (W - lw) / 2, top: 330 }]).png().toFile(path.join(D, "logo.png"));
  await sharp(svg(`<text x="${W / 2}" y="1050" text-anchor="middle" font-family="Cormorant" font-style="italic" font-weight="500" font-size="82" fill="${DARK}">Votre jardin, <tspan fill="${GREEN}">pensé pour durer.</tspan></text>`)).png().toFile(path.join(D, "slogan.png"));
  const bw = 560, bh = 100, bx = (W - bw) / 2, by = 1170;
  await sharp(svg(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="50" fill="${GREEN}"/>` + small("DEMANDER UN DEVIS", by + 63, CREAM, 34, 8) + `<rect x="${W / 2 - 40}" y="${by + bh + 40}" width="80" height="4" rx="2" fill="${ROSE}"/>`)).png().toFile(path.join(D, "bouton.png"));
  console.log("titres ok");
})();
