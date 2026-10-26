// Photos de la réalisation (salon avant / après travaux), rendues en 3D depuis l'appareil de la scène :
// ui/img/salon-apres.jpg et salon-avant.jpg (1200 × 900), reprises par le site, la publication, la story et la publicité.
//   node scripts/photos.cjs
const fs = require("fs"), path = require("path");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
const P = path.resolve(__dirname, "..");
(async () => {
  const { server, url } = await serve();
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  for (const e of ["apres", "avant"]) {
    const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
    p.on("pageerror", (err) => { console.log("ERREUR:", err.message); process.exit(1); });
    await p.goto(`${url}/scene/film.html?mode=photo-${e}`); await p.waitForFunction(() => window.ready, null, { timeout: 240000 });
    const data = await p.evaluate(() => window.photo);
    fs.writeFileSync(path.join(P, "ui/img", `salon-${e}.jpg`), Buffer.from(data.split(",")[1], "base64"));
    console.log("photo", e); await p.close();
  }
  await b.close(); server.close();
})();
