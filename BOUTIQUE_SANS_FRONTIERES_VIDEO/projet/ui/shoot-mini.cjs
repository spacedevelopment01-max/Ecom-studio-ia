const { chromium } = require("playwright");
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("http://127.0.0.1:8767/ui/miniature.html"); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await (await p.$("#m")).screenshot({ path: process.argv[2] }); await b.close(); console.log("ok"); })();
