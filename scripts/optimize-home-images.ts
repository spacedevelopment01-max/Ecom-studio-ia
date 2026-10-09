/**
 * Copies WebP allégées des images de la page d'accueil (démonstrations, directions, site de services), à côté des
 * originaux JPG, qui restent inchangés (le studio et les autres pages continuent de les utiliser).
 * La page d'accueil choisit la copie .webp quand elle existe (src/app/page.tsx).
 *   npx tsx scripts/optimize-home-images.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(process.cwd(), "public", "demo");
const files: string[] = [];
const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.jpe?g$/i.test(e.name) && files.push(path.join(d, e.name))));
walk(ROOT);
let before = 0;
let after = 0;
for (const f of files) {
  const out = f.replace(/\.jpe?g$/i, ".webp");
  const meta = await sharp(f).metadata();
  await sharp(f).resize({ width: Math.min(meta.width ?? 1400, 1400), withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toFile(out);
  before += fs.statSync(f).size;
  after += fs.statSync(out).size;
}
console.log(`${files.length} images : ${(before / 1e6).toFixed(1)} Mo en JPG → ${(after / 1e6).toFixed(1)} Mo en WebP (-${Math.round((1 - after / before) * 100)} %)`);
