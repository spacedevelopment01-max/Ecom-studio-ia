// Recette #239 phase 2 : salon (ATELIER NUANCE) et restaurant (TABLE SAISON) FICTIFS composés pour un client, photos
// générées pour la carte (aucune photo réelle), forfaits attribués.
const W = process.cwd();
const fs = await import("node:fs");
process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("réseau interdit"); };
const { createRequire } = await import("node:module");
const sharp = createRequire(W + "/package.json")("sharp");
const { completeSite, fictiveContact } = await import(W + "/tests/sites-fixtures.ts");
const { seedHoldout } = await import(W + "/tests/lot1-holdout-fixtures.ts");
const { composeShop } = await import(W + "/src/lib/engine/shop.ts");
const { saveThemeVersion, saveBrand, loadProject } = await import(W + "/src/lib/projects.ts");
const { saveAsset } = await import(W + "/src/lib/library.ts");
const { run } = await import(W + "/src/lib/db.ts");
const { runWithLang } = await import(W + "/src/lib/i18n-server.ts");
const { grantProjectPlan } = await import(W + "/src/lib/project-subscriptions.ts");
const file = process.argv[2];
const ids = JSON.parse(fs.readFileSync(file, "utf8"));
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  for (const [key, name, direction] of [["salon", "Salon Fil d'Or", "atelier-nuance"], ["restaurant", "La Treille Fictive", "table-saison"]] as const) {
    const pid = seedHoldout(ids.owner, 2, name);
    run("UPDATE projects SET name = ? WHERE id = ?", name, pid);
    fictiveContact(pid);
    saveBrand(pid, { ...loadProject(pid).brand!, name, direction });
    const { spec } = await composeShop(pid, direction, null, false);
    saveThemeVersion(pid, completeSite(spec, name), "Site fictif de recette", "user");
    grantProjectPlan(pid, "vendre");
    ids[key] = pid;
  }
  let hue = 20;
  for (const label of ["Daube fictive", "Tarte fictive", "Velouté fictif"]) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="hsl(${hue},45%,55%)"/><text x="50%" y="52%" font-family="sans-serif" font-size="80" fill="#fff" text-anchor="middle">${label}</text></svg>`;
    await saveAsset({ projectId: ids.restaurant, userId: ids.owner, data: await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer(), name: `${label}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved", meta: { alt: label } });
    hue += 70;
  }
  console.log(JSON.stringify({ salon: ids.salon, restaurant: ids.restaurant }));
});
fs.writeFileSync(file, JSON.stringify(ids, null, 1));
