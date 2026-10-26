const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
const serve = require("./serveur.cjs");
(async () => {
  const { server, url } = await serve();
  const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on("console", (m) => console.log("page:", m.text())); p.on("pageerror", (e) => console.log("err:", e.message));
  await p.goto(url + "/scene/test.html"); await p.waitForFunction(() => window.ready, null, { timeout: 60000 });
  const t0 = Date.now();
  for (let i = 0; i < 5; i++) { await p.evaluate((t) => window.renderAt(t), i / 30); await p.screenshot({ path: `/tmp/claude-0/-home-user-Ecom-studio-ia/f235b84b-cbbf-5d61-b99a-343925306099/scratchpad/gltest/f${i}.jpg`, type: "jpeg", quality: 92 }); }
  console.log("ms/image", (Date.now() - t0) / 5);
  await b.close(); server.close();
})();
