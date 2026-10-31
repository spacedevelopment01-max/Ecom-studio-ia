const { chromium } = require("playwright"); const fs = require("fs");
(async () => {
  const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  p.on("console", (m) => console.log("console:", m.text())); p.on("pageerror", (e) => console.log("err:", e.message));
  await p.goto("http://127.0.0.1:8767/ui/photos.html"); await p.waitForFunction(() => window.__done, null, { timeout: 120000 });
  const ph = await p.evaluate(() => window.__photos);
  for (const [k, v] of Object.entries(ph)) { fs.writeFileSync(process.argv[2] + "/photo-" + k + ".jpg", Buffer.from(v.split(",")[1], "base64")); console.log("ok", k); }
  await b.close();
})();
