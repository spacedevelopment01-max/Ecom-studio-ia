const { chromium } = require("playwright");
(async () => {
  const times = process.argv[3].split(",").map(Number); const out = process.argv[2];
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
  await p.goto("http://127.0.0.1:8769/index.html");
  try { await p.waitForFunction(() => !!(window.__w && window.__w.render && window.__timelines && window.__timelines.main), null, { timeout: 300000, polling: 500 }); }
  catch (e) { console.log("TIMEOUT", errs.join("\n")); await b.close(); return; }
  await p.evaluate(() => window.__hf.buildReady["monde"]);
  for (const t of times) {
    const t0 = Date.now();
    await p.evaluate((t) => { window.__timelines.main.seek(t, false); window.__w.render(t); }, t);
    await p.screenshot({ path: `${out}/s-${t.toFixed(2)}.png`, scale: "css" });
    console.log("t", t, Date.now() - t0, "ms");
  }
  console.log(errs.slice(0, 15).join("\n"));
  await b.close();
})();
