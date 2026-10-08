/**
 * Démo de l'éditeur visuel des publicités, SANS aucun appel d'IA ni dépense : crée (dans la base désignée par
 * DATA_DIR) un compte, un projet « sérum » avec détourage et logo, puis des publicités du moteur V2 avec des
 * outils simulés (textes et photos de test). Sert aux tests navigateur (scripts/e2e-ad-editor.ts).
 *   DATA_DIR=/tmp/demo STOCK_OFFLINE=1 EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-ad-editor-demo.ts
 * Affiche l'identifiant du projet. Ne jamais lancer sur la base de production.
 */
import sharp from "sharp";
import { createUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { loadProject } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { assetData, getAsset, saveAsset } from "@/lib/library";
import { runAdEngineV2 } from "@/lib/ads-v2/engine";
import { seedCutout, seedImageFixture } from "../tests/image-v2-fixtures";
import { mockAdDeps } from "../tests/ads-v2-mock";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const email = process.env.EMAIL ?? "demo@exemple.fr";
const password = process.env.PASSWORD ?? "motdepasse-demo";
const existing = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email);
const userId = existing?.id ?? (await createUser(email, password, "Démo")).id;
const p = loadProject(seedImageFixture(userId, "cosmetic"));
const cutId = await seedCutout(userId, p.id);
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><text x="200" y="82" font-family="sans-serif" font-size="64" font-weight="700" text-anchor="middle" fill="#1a1a1a">ÉCLAT</text></svg>`;
const logoPng = await sharp(Buffer.from(logoSvg)).png().toBuffer();
const logo = await saveAsset({ projectId: p.id, userId, data: logoPng, name: "logo.png", mime: "image/png", role: "logo", origin: "generated" });
// Une photo de remplacement dans la bibliothèque (pour le test « remplacer la photo »).
const alt = await sharp({ create: { width: 1200, height: 1200, channels: 3, background: { r: 46, g: 110, b: 90 } } }).jpeg().toBuffer();
await saveAsset({ projectId: p.id, userId, data: alt, name: "photo-verte.jpg", mime: "image/jpeg", role: "ambiance", origin: "upload", status: "approved" });
const { deps } = mockAdDeps({ userId, projectId: p.id, cutout: { id: cutId, data: assetData(getAsset(cutId)!) }, logo: { id: logo.id, data: logoPng } });
const r = await runWithLang({ ui: "fr", content: "fr" }, () => runAdEngineV2(null, p.id, { count: 2, platforms: ["meta_feed", "meta_story"] }, deps));
console.log(JSON.stringify({ projectId: p.id, creatives: r.outcomes.filter((o) => o.assetId).length }));
