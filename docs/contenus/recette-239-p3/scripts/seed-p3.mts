// Recette #239 phase 3 : trois artisans FICTIFS composés pour un client (APLAT, PHASE, Atelier Rive), demande de devis,
// photos de chantier GÉNÉRÉES (aplats de couleur légendés, aucune photo réelle), forfaits attribués. Aucune réalisation
// n'est créée ici : elles sont saisies dans l'onglet Réalisations pendant la recette.
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
const { run, one } = await import(W + "/src/lib/db.ts");
const { runWithLang } = await import(W + "/src/lib/i18n-server.ts");
const { grantProjectPlan } = await import(W + "/src/lib/project-subscriptions.ts");
const file = process.argv[2];
const ids = JSON.parse(fs.readFileSync(file, "utf8"));
const ARTISANS = [
  ["platrier", "Plâtrerie Fictive Durand", "aplat", [["Plâtrerie", "Cloisons, doublages et plafonds en plaques de plâtre."], ["Enduits", "Préparation et lissage des supports avant peinture."], ["Peinture intérieure", "Murs et plafonds, finitions mates ou satinées."]], ["Séjour avant", "Séjour après", "Angle repris", "Cloison posée", "Bureau fini", "Plafond jointoyé", "Couloir avant", "Couloir après"]],
  ["electricien", "Volt Fictif Électricité", "phase", [["Tableau électrique", "Remplacement et mise en sécurité du tableau."], ["Éclairage", "Points lumineux, variateurs et éclairage extérieur."]], ["Tableau avant", "Tableau neuf", "Cuisine éclairée", "Jardin la nuit", "Détail variateur"]],
  ["amenagement", "Atelier Fictif Lune", "rive", [["Conseil", "Un rendez-vous pour faire les bons choix."], ["Aménagement", "Plans, matières et mobilier sur mesure."]], ["Salon fictif", "Cuisine fictive", "Chambre fictive", "Détail bois"]],
] as const;
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  for (const [key, name, direction, services, photos] of ARTISANS) {
    const pid = seedHoldout(ids.owner, 2, name);
    run("UPDATE projects SET name = ? WHERE id = ?", name, pid);
    fictiveContact(pid);
    const biz = JSON.parse(one<{ business_json: string }>("SELECT business_json FROM projects WHERE id = ?", pid)!.business_json);
    run("UPDATE projects SET business_json = ? WHERE id = ?", JSON.stringify({ ...biz, contactMode: "quote", area: "Lyon et alentours (30 km)", services: services.map(([n, d]) => ({ name: n, description: d, price: "", duration: "" })) }), pid);
    saveBrand(pid, { ...loadProject(pid).brand!, name, direction });
    const { spec } = await composeShop(pid, direction, null, false);
    saveThemeVersion(pid, completeSite(spec, name), "Site fictif de recette", "user");
    grantProjectPlan(pid, "vendre");
    ids[key] = pid;
    let hue = direction === "aplat" ? 30 : direction === "phase" ? 210 : 330;
    for (const label of photos) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000"><rect width="100%" height="100%" fill="hsl(${hue},38%,52%)"/><rect x="70" y="70" width="1260" height="860" fill="none" stroke="#fff" stroke-width="6" opacity=".5"/><text x="50%" y="50%" font-family="sans-serif" font-size="86" fill="#fff" text-anchor="middle">${label}</text><text x="50%" y="60%" font-family="sans-serif" font-size="40" fill="#fff" text-anchor="middle" opacity=".8">photo de recette générée</text></svg>`;
      await saveAsset({ projectId: pid, userId: ids.owner, data: await sharp(Buffer.from(svg)).jpeg({ quality: 82 }).toBuffer(), name: `${label}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved", meta: { alt: label } });
      hue += 23;
    }
  }
  console.log(JSON.stringify({ platrier: ids.platrier, electricien: ids.electricien, amenagement: ids.amenagement }));
});
fs.writeFileSync(file, JSON.stringify(ids, null, 1));
