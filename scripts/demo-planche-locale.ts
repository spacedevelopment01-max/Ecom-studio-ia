/**
 * Planche d'identité d'une démo refaite EN LOCAL, sans IA et sans frais, à partir des fichiers déjà publiés
 * (public/demo/<id>/ : logo, photos, produit détouré) et de la palette du manifeste. Sert à corriger une planche
 * quand le moteur change (ex. « Anthracite » en double sur ARVEN) sans régénérer d'image payante.
 *   npx tsx scripts/demo-planche-locale.ts montre <fichier de sortie.jpg>
 * Rien n'est écrasé dans public/ : le fichier est écrit où on le demande, pour être regardé avant d'être remplacé.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { renderIdentityBoard } from "@/lib/media/identity-board";
import { runWithLang } from "@/lib/i18n-server";

const DEMOS: Record<string, { name: string; tagline: string; business: "products" | "services"; heading: string; body: string; icons: string[]; photos: string[]; product?: string; mark?: { left: number; top: number; size: number } }> = {
  // Symbole : le cadran et son « A », découpés dans le logo (fractions de l'image).
  montre: { name: "ARVEN", tagline: "Le temps, bien porté", business: "products", heading: "Montserrat", body: "Jost", icons: ["truck", "shield-check", "gift", "heart", "leaf", "sparkles"], photos: ["lifestyle-1.jpg", "lifestyle-2.jpg", "lifestyle-3.jpg", "packshot-1.jpg"], product: "cutout-1.webp", mark: { left: 0.315, top: 0.14, size: 0.38 } },
};

async function main() {
  const [id, out] = process.argv.slice(2);
  const d = DEMOS[id];
  if (!d || !out) throw new Error(`usage : demo-planche-locale.ts <${Object.keys(DEMOS).join("|")}> <sortie.jpg>`);
  const dir = path.join(process.cwd(), "public", "demo", id);
  const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "demo", "manifest.json"), "utf8"));
  const entry = (Array.isArray(manifest) ? manifest : manifest.demos ?? Object.values(manifest)).find((x: { id?: string }) => x?.id === id);
  const [primary, secondary, accent, light, dark] = entry.palette as string[];
  const logo = fs.readFileSync(path.join(dir, "logo.png"));
  let mark: Buffer | null = null;
  if (d.mark) {
    const m = await sharp(logo).metadata();
    const W = m.width ?? 0, H = m.height ?? 0;
    mark = await sharp(logo).extract({ left: Math.round(d.mark.left * W), top: Math.round(d.mark.top * H), width: Math.round(d.mark.size * W), height: Math.round(d.mark.size * W) }).png().toBuffer();
  }
  const product = d.product && fs.existsSync(path.join(dir, d.product)) ? await sharp(path.join(dir, d.product)).png().toBuffer() : null;
  const png = await runWithLang({ ui: "fr", content: "fr" }, () =>
    renderIdentityBoard({
      name: d.name,
      tagline: d.tagline,
      business: d.business,
      logo,
      mark,
      palette: { primary, secondary, accent, light, dark },
      fonts: { heading: d.heading, body: d.body },
      icons: d.icons,
      photos: d.photos.filter((f) => fs.existsSync(path.join(dir, f))).map((f) => fs.readFileSync(path.join(dir, f))),
      product,
      year: 2026,
    }),
  );
  await sharp(png).resize({ width: 2000 }).jpeg({ quality: 88 }).toFile(out);
  console.log(`Planche écrite : ${out}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
