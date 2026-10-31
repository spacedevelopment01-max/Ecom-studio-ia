const { chromium } = require("playwright");
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
  p.on("pageerror", (e) => console.log("err:", e.message));
  await p.goto("http://127.0.0.1:8765/ui/boards.html"); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  const only = process.argv[3] ? process.argv[3].split(",") : null;
  const ids = await p.$$eval("[data-board]", (els) => els.map((e) => e.dataset.board));
  for (const id of ids) {
    if (only && !only.includes(id)) continue;
    const el = await p.$(`[data-board="${id}"]`);
    const transparent = ["badge", "badge-chaux"].includes(id);
    await el.screenshot({ path: `${process.argv[2]}/ui-${id}.png`, omitBackground: true });
    console.log("ok", id);
  }
  await b.close();
})();
