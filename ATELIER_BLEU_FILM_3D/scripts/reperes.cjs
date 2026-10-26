// Exporte les repères de l'image (instants des transitions, calculés par la scène depuis la voix) : montage/reperes.json
const fs = require("fs"), path = require("path");
const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
(async () => {
  const { server, url } = await serve();
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("pageerror", (e) => { console.log("ERREUR:", e.message); process.exit(1); });
  await p.goto(url + "/scene/film.html"); await p.waitForFunction(() => window.ready, null, { timeout: 240000 });
  const r = await p.evaluate(() => window.REPERES);
  fs.writeFileSync(path.join(__dirname, "../montage/reperes.json"), JSON.stringify(r, null, 1));
  console.log(Object.keys(r).length, "repères"); await b.close(); server.close();
})();
