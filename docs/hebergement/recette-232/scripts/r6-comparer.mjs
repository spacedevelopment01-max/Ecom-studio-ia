// Recette #232 : rendu dans le studio (aperçu de la version courante, sans les outils d'aperçu) comparé au site publié,
// même page et même taille d'écran, ordinateur et téléphone. Écart mesuré pixel par pixel (sharp).
// node r6-comparer.mjs <clé du site> <hôte> <prefixe> [chemins séparés par des virgules]
import fs from "node:fs";
import { createRequire } from "node:module";
import { browser, context, ids, login, open, OUT, save, STUDIO } from "./lib.mjs";
const sharp = createRequire(import.meta.url)("../wt-integ/node_modules/sharp");
const [, , key, host, pre, list] = process.argv;
const paths = (list ?? "/").split(",");
const b = await browser();
const result = {};
for (const kind of ["ordinateur", "telephone"]) {
  const ownerCtx = await context(b, kind);
  const owner = await ownerCtx.newPage();
  await login(owner, "proprio@recette.invalid");
  const visitor = await (await context(b, kind)).newPage();
  for (const p of paths) {
    const name = `${pre}-${kind}-${p === "/" ? "accueil" : p.replace(/\W+/g, "-").replace(/^-|-$/g, "")}`;
    await open(owner, `${STUDIO}/preview/${ids[key]}/v/current${p}?es_raw=1`);
    await owner.waitForTimeout(2500);
    await visitor.goto(`https://${host}:3943${p}`, { waitUntil: "networkidle" });
    await visitor.waitForTimeout(2500);
    for (const pg of [owner, visitor]) { const r = pg.getByRole("button", { name: "Tout refuser" }); if (await r.count()) await r.first().click().catch(() => {}); }
    await owner.waitForTimeout(800); await visitor.waitForTimeout(800);
    const a = `${OUT}${name}-studio.png`, z = `${OUT}${name}-publie.png`;
    await owner.screenshot({ path: a }); await visitor.screenshot({ path: z });
    const [ra, rz] = await Promise.all([a, z].map((f) => sharp(f).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
    let diff = 0;
    const n = Math.min(ra.data.length, rz.data.length);
    for (let i = 0; i < n; i += 3) if (Math.abs(ra.data[i] - rz.data[i]) + Math.abs(ra.data[i + 1] - rz.data[i + 1]) + Math.abs(ra.data[i + 2] - rz.data[i + 2]) > 30) diff++;
    result[name] = { taille: `${ra.info.width}x${ra.info.height}`, pixelsDifferents: `${((diff / (n / 3)) * 100).toFixed(2)} %` };
    // Image de différences : pixels différents en rouge sur l'aperçu atténué.
    const out = Buffer.from(ra.data);
    for (let i = 0; i < n; i += 3) { const d = Math.abs(ra.data[i] - rz.data[i]) + Math.abs(ra.data[i + 1] - rz.data[i + 1]) + Math.abs(ra.data[i + 2] - rz.data[i + 2]) > 30; out[i] = d ? 255 : 255 - (255 - ra.data[i]) / 4; out[i + 1] = d ? 0 : 255 - (255 - ra.data[i + 1]) / 4; out[i + 2] = d ? 0 : 255 - (255 - ra.data[i + 2]) / 4; }
    await sharp(out, { raw: ra.info }).png().toFile(`${OUT}${name}-differences.png`);
  }
  await ownerCtx.close();
}
save(`${pre}-comparaison`, result);
console.log(JSON.stringify(result, null, 1));
await b.close();
