// Titres du 2e film ARVEN (Wan 2.6) : mêmes polices et couleurs que le premier film (Jost ivoire) ; logo, slogan et
// bouton repris du premier film (ARVEN_PUBLICITE_VIDEO/titres) pour garder la même signature de marque.
const sharp = require("sharp"), path = require("path");
const W = 1080, H = 1920, IVORY = "#F3EFE7";
const svg = (b) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${b}</svg>`);
const t = (txt, y) => `<text x="${W / 2}" y="${y}" text-anchor="middle" font-family="Jost" font-weight="500" font-size="64" letter-spacing="18" fill="${IVORY}">${txt}</text>`;
(async () => {
  await sharp(svg(t("LA PRÉCISION.", 300))).png().toFile(path.join(__dirname, "titre-precision.png"));
  await sharp(svg(t("LE CARACTÈRE.", 300))).png().toFile(path.join(__dirname, "titre-caractere.png"));
  console.log("titres ok");
})();
