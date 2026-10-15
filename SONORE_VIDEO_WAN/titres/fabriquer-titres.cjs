// Calques de titres du film SONORE (1080 × 1920, fond transparent), polices du studio (Jost). Le nom de marque est
// composé en texte (mot-symbole) : le logo de démonstration actuel contient une faute (« AURICUULAIRE »).
const sharp = require("sharp"), path = require("path");
const D = __dirname, W = 1080, H = 1920;
const WHITE = "#F2F2F0", RED = "#E0352B";
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`);
const t = (txt, y, size, color, ls, weight = 500) =>
  `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Jost" font-weight="${weight}" font-size="${size}" letter-spacing="${ls}" fill="${color}">${txt}</text>`;
(async () => {
  await sharp(svg(t("ÉCOUTEZ.", 300, 66, WHITE, 20))).png().toFile(path.join(D, "titre-ecoutez.png"));
  await sharp(svg(t("CHAQUE DÉTAIL.", 300, 66, WHITE, 20))).png().toFile(path.join(D, "titre-detail.png"));
  await sharp(svg(t("SONORE", 860, 150, WHITE, 34) + `<rect x="${W / 2 - 60}" y="905" width="120" height="5" rx="2.5" fill="${RED}"/>`)).png().toFile(path.join(D, "logo.png"));
  await sharp(svg(t(`Le son, <tspan fill="${RED}">sans détour.</tspan>`, 1040, 64, WHITE, 2, 400))).png().toFile(path.join(D, "slogan.png"));
  const bw = 420, bh = 96, bx = (W - bw) / 2, by = 1180;
  await sharp(svg(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="48" fill="${RED}"/>` + t("DÉCOUVRIR", by + 61, 34, WHITE, 10))).png().toFile(path.join(D, "bouton.png"));
  console.log("titres ok");
})();
