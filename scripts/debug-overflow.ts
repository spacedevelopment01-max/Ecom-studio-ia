import { chromium, devices } from "playwright";
const [email, project] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await b.newContext({ ...devices["iPhone 13"] });
const p = await ctx.newPage();
await p.goto("http://localhost:3000/connexion");
await p.fill("#email", email); await p.fill("#password", "motdepasse-solide");
await Promise.all([p.waitForURL(/studio/), p.click("button[type=submit]")]);
for (const t of ["pilote","produit","marque","boutique","images","videos","prompts","publications","calendrier","publicites","fichiers","connexions"]) {
  await p.goto(`http://localhost:3000/studio/${project}/${t}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const W = window.innerWidth; const out: string[] = [];
    document.querySelectorAll("body *").forEach((e) => { const rc = e.getBoundingClientRect(); if (rc.right > W + 1 && rc.width > 0) { let anc = e.parentElement, clipped = false; while (anc) { const s = getComputedStyle(anc); if (s.overflowX !== "visible") { clipped = true; break; } anc = anc.parentElement; } if (!clipped) out.push(`${e.tagName}.${String((e as HTMLElement).className).slice(0,80)} r=${Math.round(rc.right)}`); } });
    return { sw: document.documentElement.scrollWidth, W, out: out.slice(0, 5) };
  });
  console.log(t, r.sw - r.W, r.out.join(" | "));
}
await b.close();
