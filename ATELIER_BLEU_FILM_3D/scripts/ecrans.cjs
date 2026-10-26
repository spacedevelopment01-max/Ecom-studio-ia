// Photographie les écrans HTML (ui/*.html) en PNG haute définition (×2) pour habiller la scène 3D, et note la position
// de chaque zone marquée data-zone (en pixels de l'image) dans ui/png/zones.json : la caméra s'en sert pour cadrer.
//   node scripts/ecrans.cjs           (après scripts/photos.cjs, qui crée les photos du salon)
const fs = require("fs"), path = require("path");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
const P = path.resolve(__dirname, "..");
const ECRANS = {
  formulaire: ["vide", "plein"],
  site: ["base"],
  publication: ["base"],
  story: ["base"],
  publicite: ["base", "nouveau"],
  editeur: ["base", "nouveau", "valide"],
  carte: ["base"],
  entete: ["base"],
};
const ECHELLE = 2;
(async () => {
  const { server, url } = await serve();
  const b = await chromium.launch();
  const zones = {};
  for (const [nom, etats] of Object.entries(ECRANS)) {
    for (const etat of etats) {
      const p = await b.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: ECHELLE });
      await p.goto(`${url}/ui/${nom}.html?etat=${etat}`);
      await p.evaluate(() => document.fonts.ready);
      await p.waitForFunction(() => [...document.images].every((i) => i.complete));
      const taille = await p.evaluate(() => ({ w: document.body.offsetWidth, h: Math.max(document.body.offsetHeight, document.body.scrollHeight) }));
      await p.setViewportSize({ width: taille.w, height: taille.h });
      const z = await p.evaluate((k) => Object.fromEntries([...document.querySelectorAll("[data-zone]")].map((e) => { const r = e.getBoundingClientRect(); return [e.dataset.zone, [r.x * k, r.y * k, r.width * k, r.height * k].map(Math.round)]; })), ECHELLE);
      await p.screenshot({ path: path.join(P, "ui/png", `${nom}-${etat}.png`), fullPage: true });
      // une zone peut être cachée dans un état (titre avant / après correction) : on garde son plus grand rectangle
      const avant = zones[nom]?.zones || {};
      for (const [k, r] of Object.entries(avant)) if (!z[k] || r[2] * r[3] > z[k][2] * z[k][3]) z[k] = r;
      zones[nom] = { w: taille.w * ECHELLE, h: taille.h * ECHELLE, zones: z };
      console.log(nom, etat, taille.w * ECHELLE, "×", taille.h * ECHELLE);
      await p.close();
    }
  }
  fs.writeFileSync(path.join(P, "ui/png/zones.json"), JSON.stringify(zones, null, 1));
  await b.close(); server.close();
})();
