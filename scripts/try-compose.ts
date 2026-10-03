import fs from "node:fs";
import { cutoutProduct, extractPalette, detailCrops } from "../src/lib/media/cutout";
import { img, renderScene, renderPackshot, renderCreative, FORMATS } from "../src/lib/media/compose";
const S = "/tmp/claude-0/-home-user-Ecom-studio-ia/30a1ccd5-08f9-5162-80f0-38bf5e876ac5/scratchpad";
const id = process.argv[2] || "serum";
const photo = fs.readFileSync(`${S}/renders/${id}-photo.png`);
let t = Date.now();
const cut = await cutoutProduct(photo);
console.log("cutout", cut.method, cut.width, cut.height, Date.now() - t, "ms");
fs.writeFileSync(`${S}/c-${id}-cutout.png`, cut.png);
const pal = await extractPalette(cut.png);
console.log(pal);
const product = await img(cut.png);
const palette = { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#B8875A", light: "#F6F1EA", dark: "#1E1612" };
t = Date.now();
fs.writeFileSync(`${S}/c-${id}-packshot.jpg`, await renderPackshot(product));
for (const style of ["studio", "podium", "arch", "window", "spotlight", "split", "color"] as const) {
  const r = await renderScene({ product, palette, style, format: FORMATS.product, seed: 4 });
  fs.writeFileSync(`${S}/c-${id}-scene-${style}.png`, r.png);
}
console.log("scenes", Date.now() - t, "ms");
const crops = await detailCrops(photo, cut);
crops.forEach((c, i) => fs.writeFileSync(`${S}/c-${id}-detail${i}.jpg`, c));
const typo = { heading: "Cormorant", body: "Jost", headingWeight: 500 };
for (const [fmt, layout] of [["square", "editorial"], ["story", "centered"], ["portrait", "bold"], ["landscape", "split"]] as const) {
  const r = await renderCreative({ product, palette, typo, format: FORMATS[fmt], layout, headline: "L'éclat, sans artifice", subline: "Niacinamide et acide hyaluronique, en flacon de 30 ml.", cta: "Découvrir", brand: "Maison Ondine" });
  fs.writeFileSync(`${S}/c-${id}-creative-${fmt}.jpg`, r.jpg);
  console.log(fmt, r.minFontPx, r.safe);
}
