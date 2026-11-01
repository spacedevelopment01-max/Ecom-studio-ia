const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const bad = []; p.on("response", (r) => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); }); p.on("pageerror", (e) => bad.push("ERR " + e.message));
  await p.goto("http://127.0.0.1:8769/index.html");
  try { await p.waitForFunction(() => !!(window.__w && window.__w.render), null, { timeout: 90000, polling: 500 }); } catch (e) { console.log("PAS PRÊT\n" + bad.join("\n")); await b.close(); return; }
  for (const t of [0.5, 5, 10, 13, 16, 19, 22, 26, 29, 33, 35, 39, 40.5, 44, 47, 51]) await p.evaluate((t) => { window.__timelines.main.seek(t, false); window.__w.render(t); }, t);
  console.log(bad.length ? bad.join("\n") : "aucune ressource manquante");
  await b.close();
})();
