/**
 * Planches de comparaison AVANT (moteur V1) / APRÈS (Theme Engine V2), à partir des VRAIES captures du banc
 * (scripts/theme-v2-bench.ts) : mêmes données de projet, mêmes médias, mêmes conditions de capture. Aucun montage
 * ni retouche : les captures sont seulement réduites et posées côte à côte, avec un titre.
 *   npx tsx scripts/theme-v2-compare.ts [--out reports/screenshots/theme-v2]
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { THEME_SCENARIOS, THEME_SCENARIO_LABEL } from "../tests/theme-v2-fixtures";

const args = process.argv.slice(2);
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : "reports/screenshots/theme-v2";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function panel(file: string, width: number, maxH: number) {
  const img = sharp(file).resize({ width });
  const { data, info } = await img.png().toBuffer({ resolveWithObject: true });
  return info.height > maxH ? sharp(data).extract({ left: 0, top: 0, width, height: maxH }).png().toBuffer() : data;
}

async function board(s: string, kind: string, width: number, maxH: number) {
  const dir = path.join(OUT, s);
  const a = path.join(dir, `avant-${kind}.png`);
  const b = path.join(dir, `apres-${kind}.png`);
  if (!fs.existsSync(a) || !fs.existsSync(b)) return null;
  const [pa, pb] = await Promise.all([panel(a, width, maxH), panel(b, width, maxH)]);
  const [ha, hb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
  const H = Math.max(ha.height!, hb.height!);
  const gap = 24;
  const top = 92;
  const W = width * 2 + gap * 3;
  const title = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${top}"><text x="${gap}" y="36" font-family="Helvetica, Arial" font-size="${width < 600 ? 15 : 22}" font-weight="700" fill="#111">${esc(THEME_SCENARIO_LABEL[s as keyof typeof THEME_SCENARIO_LABEL])} — ${kind}</text><text x="${gap}" y="78" font-family="Helvetica, Arial" font-size="17" fill="#555">AVANT (moteur V1)</text><text x="${gap * 2 + width}" y="78" font-family="Helvetica, Arial" font-size="17" fill="#555">APRÈS (Theme Engine V2)</text></svg>`;
  const file = path.join(dir, `comparaison-${kind}.png`);
  await sharp({ create: { width: W, height: H + top + gap, channels: 3, background: "#ECECEC" } })
    .composite([{ input: Buffer.from(title), top: 0, left: 0 }, { input: pa, top, left: gap }, { input: pb, top, left: gap * 2 + width }])
    .png()
    .toFile(file);
  return file;
}

for (const s of THEME_SCENARIOS) {
  for (const [kind, w, h] of [["accueil-desktop", 900, 563], ["accueil-mobile-complet", 390, 2600], ["secondaire-desktop", 900, 563]] as const) {
    const f = await board(s, kind, w, h);
    if (f) console.log(`✓ ${f}`);
  }
}
