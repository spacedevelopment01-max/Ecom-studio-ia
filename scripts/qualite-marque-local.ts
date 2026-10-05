/**
 * Essai sans IA : marque, signatures, propositions de logo et charte PDF pour quelques produits réels.
 * Usage : DATA_DIR=/tmp/... npx tsx scripts/qualite-marque-local.ts <dossier-de-sortie>
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { loadImage } from "@napi-rs/canvas";
import { runWithLang } from "../src/lib/i18n-server";
import { emptyProduct, sectorLabel, type ProductProfile, type SectorId } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { logoProposals, proposeTaglines, defaultProposal } from "../src/lib/engine/identity";
import { logoPng, logoSet } from "../src/lib/media/logo";
import { extractPalette } from "../src/lib/media/cutout";
import { renderBrandBook } from "../src/lib/media/brand-book";
import { canvasFamily } from "../src/lib/media/fonts";
import { directionById } from "../src/lib/theme/directions";
import { isDark, withLightness } from "../src/lib/color";
import { brandIssues, finalizeBrand } from "../src/lib/engine/brand-check";
import { logoColors, SYMBOL_LABEL } from "../src/lib/engine/identity";

const OUT = process.argv[2] ?? "/tmp/qualite-marque";
fs.mkdirSync(OUT, { recursive: true });
const CUTS = process.env.CUTS ?? "";

type Case = { key: string; cut: string; name: string; brand?: string; sector: SectorId; category: string; summary: string; lang: "fr" | "en" };
const cases: Case[] = [
  { key: "sova", cut: "sova-rose.png", name: "SOVA", brand: "SOVA", sector: "enfants", category: "Compagnon pour enfant", summary: "Compagnon pour enfant : boîtier rose à oreilles avec un disque central.", lang: "fr" },
  { key: "drone", cut: "drone-pliable.png", name: "Drone pliable", sector: "hightech", category: "Drone", summary: "Drone pliable à quatre hélices.", lang: "fr" },
  { key: "oreiller", cut: "oreiller-bleu.png", name: "Oreiller", sector: "maison", category: "Oreiller", summary: "Oreiller bleu.", lang: "en" },
];

for (const c of cases) {
  await runWithLang({ content: c.lang, ui: "fr" }, async () => {
    const cutBuf = fs.readFileSync(path.join(CUTS, c.cut));
    const colors = await extractPalette(cutBuf);
    const product: ProductProfile = { ...emptyProduct(), name: c.name, sector: c.sector, category: c.category, summary: c.summary, visual: { colors } };
    const out0 = localBrand(product, c.brand, { business: "products" } as any);
    const p: any = { product, brand: out0.brand, catalog: [], business: "products", services: {} };
    const fin = finalizeBrand(out0.brand, out0.strategy, p);
    const out = { ...out0, brand: fin.brand };
    p.brand = out.brand;
    const lines = proposeTaglines(p);
    if (!out.brand.tagline) out.brand.tagline = lines[0] ?? "";
    out.brand.taglineAlternatives = lines.filter((x) => x !== out.brand.tagline).slice(0, 5);
    const pal = out.brand.palette;
    const { color, accent } = logoColors(p);
    const props = logoProposals(p);
    const tiles: Buffer[] = [];
    for (const pr of props) {
      const png = await logoPng({ ...pr.spec, color, accent }, 900);
      fs.writeFileSync(`${OUT}/${c.key}-proposition-${pr.key}.png`, png);
      tiles.push(await sharp(png).resize(560, 320, { fit: "contain", background: "#ffffff" }).flatten({ background: "#ffffff" }).toBuffer());
    }
    const chosen = props.find((x) => x.key === defaultProposal(out.brand.direction)) ?? props[0];
    out.brand.logo.proposal = chosen.key;
    out.brand.logo.concept = chosen.concept;
    const spec = { ...chosen.spec, color, accent };
    const set = await logoSet(spec as any);
    const web = spec.layout === "badge" ? await logoSet({ ...(spec as any), layout: "lockup", tagline: undefined }) : null;
    fs.writeFileSync(`${OUT}/${c.key}-favicon.png`, set.faviconPng);
    const d = directionById(out.brand.direction);
    const { pages, pdf } = renderBrandBook({
      brand: out.brand,
      strategy: out.strategy,
      headingFamily: canvasFamily(out.brand.fonts.heading ?? d.fonts.heading, "Cormorant"),
      bodyFamily: canvasFamily(out.brand.fonts.body ?? d.fonts.body, "Jost"),
      logo: await loadImage(set.mainPng),
      logoLight: await loadImage((web ?? set).lightPng),
      logoWeb: await loadImage((web ?? set).mainPng),
      mark: await loadImage(set.monoPng),
      product: await loadImage(cutBuf),
      sectorLabel: sectorLabel(c.sector, c.lang),
      date: new Date(),
    });
    fs.writeFileSync(`${OUT}/${c.key}-charte.pdf`, pdf);
    pages.forEach((j, i) => fs.writeFileSync(`${OUT}/${c.key}-planche-${i + 1}.jpg`, j));
    const sheet = await sharp({ create: { width: 3 * 570, height: 330, channels: 3, background: "#dddddd" } })
      .composite(tiles.map((input, k) => ({ input, left: k * 570 + 5, top: 5 })))
      .png()
      .toBuffer();
    fs.writeFileSync(`${OUT}/${c.key}-logos.png`, sheet);
    const issues = brandIssues(out.brand, p);
    fs.writeFileSync(`${OUT}/${c.key}-marque.json`, JSON.stringify({ colors, brand: out.brand, strategy: out.strategy, chosen: chosen.key, issues }, null, 1));
    console.log(c.key, out.brand.name, "|", out.brand.tagline, "|", out.brand.direction, JSON.stringify(pal), "| alt:", out.brand.alternatives.join(", "), "| issues:", issues.map((i) => i.code).join(","));
  });
}
