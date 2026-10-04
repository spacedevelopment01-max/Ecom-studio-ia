// Captures successives en faisant défiler : npx tsx scripts/shots.ts <url> <prefixe> [mobile|desktop] [nombre]
import { chromium, devices } from "playwright";
const [url, prefix, kind = "mobile", count = "6"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext(kind === "mobile" ? { ...devices["Pixel 7"] } : { viewport: { width: 1366, height: 860 } });
const page = await ctx.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(url, { waitUntil: "networkidle" });
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const vh = page.viewportSize()!.height;
const n = Number(count);
for (let i = 0; i < n; i++) {
  const y = Math.round(((total - vh) * i) / Math.max(1, n - 1));
  await page.evaluate((yy) => scrollTo(0, yy), y);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${prefix}-${i}.png` });
}
// Débordement horizontal ?
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(`hauteur=${total} debordement_horizontal=${overflow}px erreurs=${errors.length ? errors.join(" | ") : "aucune"}`);
await browser.close();
