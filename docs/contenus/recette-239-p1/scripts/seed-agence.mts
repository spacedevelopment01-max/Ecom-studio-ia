// Recette #239 phase 1 : agence immobilière FICTIVE (Maison & Horizon composé pour un client), 6 biens aux statuts
// variés (vente, location, vendu, brouillon, retiré), photos générées (aucune photo réelle), forfait attribué.
const W = process.cwd();
const fs = await import("node:fs");
process.env.STOCK_OFFLINE = "1";
globalThis.fetch = async () => { throw new Error("réseau interdit"); };
const { createRequire } = await import("node:module");
const sharp = createRequire(W + "/package.json")("sharp");
const { servicesSite } = await import(W + "/tests/sites-fixtures.ts");
const { saveAsset } = await import(W + "/src/lib/library.ts");
const { createBien, setBienStatus } = await import(W + "/src/lib/biens.ts");
const { run } = await import(W + "/src/lib/db.ts");
const { runWithLang } = await import(W + "/src/lib/i18n-server.ts");
const { grantProjectPlan } = await import(W + "/src/lib/project-subscriptions.ts");
const file = process.argv[2];
const ids = JSON.parse(fs.readFileSync(file, "utf8"));
await runWithLang({ content: "fr", ui: "fr" }, async () => {
  const name = "Agence Horizon Lumière";
  const { pid } = await servicesSite(ids.owner, "maison-horizon", name);
  run("UPDATE projects SET name = ? WHERE id = ?", name, pid);
  const photo = async (label: string, hue: number) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},40%,70%)"/><stop offset="1" stop-color="hsl(${hue + 40},35%,35%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="52%" font-family="sans-serif" font-size="90" fill="#fff" text-anchor="middle">${label}</text></svg>`;
    return (await saveAsset({ projectId: pid, userId: ids.owner, data: await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer(), name: `${label}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  };
  const seeds = [
    { tr: "vente", title: "Maison familiale avec jardin", price: 485000, surface: 132, rooms: 6, type: "maison", st: "published", dpe: "C", ges: "B" },
    { tr: "vente", title: "Appartement haussmannien", price: 398000, surface: 88, rooms: 4, type: "appartement", st: "published", dpe: "D", ges: "D" },
    { tr: "location", title: "Studio lumineux proche gare", rent: 640, charges: 60, surface: 28, rooms: 1, type: "appartement", st: "published", dpe: "E", ges: "C" },
    { tr: "vente", title: "Loft sous les toits", price: 320000, surface: 74, rooms: 3, type: "loft", st: "sold", dpe: "B", ges: "A" },
    { tr: "location", title: "Villa avec piscine (brouillon)", rent: 2100, surface: 160, rooms: 6, type: "villa", st: "draft", dpe: "C", ges: "C" },
    { tr: "vente", title: "Terrain à bâtir (retiré)", price: 95000, surface: 600, type: "terrain", st: "withdrawn", dpe: null, ges: null },
  ];
  const out: Record<string, string> = {};
  let hue = 10;
  for (const s of seeds) {
    const ph = [await photo(`${s.title.split(" ")[0]} fictive 1`, hue), await photo(`${s.title.split(" ")[0]} fictive 2`, hue + 20)];
    hue += 50;
    const b = createBien(ids.owner, pid, { transaction: s.tr as "vente" | "location", data: { title: s.title, city: "Lyon", sector: "Croix-Rousse", surface: s.surface, rooms: s.rooms ?? null, type: s.type, price: s.price ?? null, rent: s.rent ?? null, charges: s.charges ?? null, dpe: s.dpe, ges: s.ges, summary: "Bien FICTIF de recette.", description: "Description fictive pour la recette du studio : aucun bien réel.", photos: ph.map((assetId, i) => ({ assetId, alt: `${s.title}, vue ${i + 1}` })) } });
    if (s.st !== "draft") { setBienStatus(pid, b.id, "published"); if (s.st !== "published") setBienStatus(pid, b.id, s.st as "sold" | "withdrawn"); }
    out[s.title] = b.id;
  }
  grantProjectPlan(pid, "vendre");
  ids.agence2 = pid;
  ids.biens = out;
  console.log(JSON.stringify({ pid, biens: Object.keys(out).length }));
});
fs.writeFileSync(file, JSON.stringify(ids, null, 1));
