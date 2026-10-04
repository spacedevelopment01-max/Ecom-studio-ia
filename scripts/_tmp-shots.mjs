import { chromium } from "/home/user/Ecom-studio-ia/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] }).catch(() => chromium.launch({ args: ["--no-sandbox"] }));
const ctx = await b.newContext({ viewport: { width: 1400, height: 1000 } });
const r = await ctx.request.post("http://localhost:3000/api/auth/login", { data: { email: "demo-1791055473967@ecom-studio.local", password: "demo-studio-2026" } });
for (const [tab, w] of [["images", 1400], ["videos", 1400], ["images", 390], ["videos", 390]]) {
  const pg = await ctx.newPage(); await pg.setViewportSize({ width: w, height: w > 500 ? 1000 : 844 });
  await pg.goto("http://localhost:3000/studio/zikabp1yi8cav6j8/" + tab, { waitUntil: "networkidle" }); await pg.waitForTimeout(2500);
  await pg.screenshot({ path: "/tmp/claude-0/-home-user-Ecom-studio-ia/30a1ccd5-08f9-5162-80f0-38bf5e876ac5/scratchpad/medias/ui-" + tab + "-" + w + ".png", fullPage: w < 500 });
  if (tab === "videos" && w > 500) { await pg.getByRole("tab", { name: /Face caméra|On camera/ }).click(); await pg.waitForTimeout(800); await pg.screenshot({ path: "/tmp/claude-0/-home-user-Ecom-studio-ia/30a1ccd5-08f9-5162-80f0-38bf5e876ac5/scratchpad/medias/ui-ugc.png" }); }
  await pg.close();
}
await b.close();
