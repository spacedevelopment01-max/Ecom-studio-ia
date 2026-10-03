/** Captures de la page d'accueil (bureau, mobile, sombre) : OUT=dossier tsx scripts/shot-landing.ts */
import { chromium, devices } from "playwright";
const OUT = process.env.OUT ?? "captures";
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const errors: string[] = [];
for (const [name, opts] of [["bureau", { viewport: { width: 1440, height: 900 } }], ["mobile", devices["iPhone 13"]], ["sombre", { viewport: { width: 1440, height: 900 }, colorScheme: "dark" as const }]] as const) {
  const ctx = await b.newContext(opts as any);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  p.on("response", (r) => r.status() >= 400 && errors.push(`${name}: ${r.status()} ${r.url()}`));
  await p.goto(process.env.BASE ?? "http://localhost:3000", { waitUntil: "networkidle" });
  if (name === "sombre") await p.evaluate(() => { localStorage.setItem("ecs-theme", "dark"); document.documentElement.dataset.theme = "dark"; });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/landing-${name}-haut.png` });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/landing-${name}-complet.png`, fullPage: true });
  const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  console.log(name, "débordement", ov);
  await ctx.close();
}
console.log(errors.length ? errors.join("\n") : "aucune erreur");
await b.close();
