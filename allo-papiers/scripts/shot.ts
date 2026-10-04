// Captures d'écran rapides : npx tsx scripts/shot.ts <url> <fichier> [mobile|desktop] [fullPage]
import { chromium, devices } from "playwright";
const [url, out, kind = "mobile", full = "full"] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext(kind === "mobile" ? { ...devices["Pixel 7"] } : { viewport: { width: 1366, height: 860 } });
const page = await ctx.newPage();
const errors: string[] = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
  scrollTo(0, 0);
});
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: full === "full" });
console.log("erreurs console:", errors.length ? errors.join("\n") : "aucune");
await browser.close();
