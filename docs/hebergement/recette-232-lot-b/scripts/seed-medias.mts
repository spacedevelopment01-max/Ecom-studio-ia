// Recette #232 lot B : 4e site FICTIF riche en médias (24 images générées, formats et tailles variés), forfait attribué.
const W = process.cwd();
const fs = await import("node:fs");
process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("réseau interdit"); };
const { completeSite, fictiveContact, withRichMedia } = await import(W + "/tests/sites-fixtures.ts");
const { seedHoldout } = await import(W + "/tests/lot1-holdout-fixtures.ts");
const { composeShop } = await import(W + "/src/lib/engine/shop.ts");
const { saveThemeVersion, saveBrand, loadProject } = await import(W + "/src/lib/projects.ts");
const { run } = await import(W + "/src/lib/db.ts");
const { runWithLang } = await import(W + "/src/lib/i18n-server.ts");
const { grantProjectPlan } = await import(W + "/src/lib/project-subscriptions.ts");
const file = process.argv[2];
const ids = JSON.parse(fs.readFileSync(file, "utf8"));
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  const name = "Studio Lumière Fictif";
  const pid = seedHoldout(ids.owner, 2, name);
  run("UPDATE projects SET name = ? WHERE id = ?", name, pid);
  fictiveContact(pid);
  saveBrand(pid, { ...loadProject(pid).brand!, name, direction: "aplat" });
  const { spec } = await composeShop(pid, "aplat", null, false);
  saveThemeVersion(pid, completeSite(spec, name), "Site fictif de recette (médias)", "user");
  const media = await withRichMedia(pid, ids.owner, 24);
  grantProjectPlan(pid, "vendre");
  ids.medias = pid;
  console.log(JSON.stringify({ pid, cases: media.slots, images: media.names.length }));
});
fs.writeFileSync(file, JSON.stringify(ids, null, 1));
