/** Capture d'une page entière, ordinateur et téléphone. Usage : node photo-page.mjs <url> <fichier sans extension> */
import { chromium } from "./session.mjs";
const [url, out] = process.argv.slice(2);
const b = await chromium.launch();
for (const [d, w, h, s] of [["ordinateur", 1440, 900, 1], ["telephone", 390, 844, 2]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: s, isMobile: d === "telephone", hasTouch: d === "telephone" });
  const p = await ctx.newPage(); await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}--${d}.jpg`, type: "jpeg", quality: 78, fullPage: true }); await ctx.close();
}
await b.close(); console.log("ok", out);
