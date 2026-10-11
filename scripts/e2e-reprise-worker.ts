/**
 * Reprise d'une tâche après l'arrêt brutal du worker (scénario L de l'audit), sur un studio lancé (« npm run studio ») :
 *   BASE=http://localhost:3000 PHOTO=chemin/photo.jpg npx tsx scripts/e2e-reprise-worker.ts
 * Inscription, création d'un projet produit (pilote de ~25 s avec détourage), worker TUÉ (SIGKILL) 5 s après le
 * départ, pendant le pilote. Attendu : le lanceur relance le worker, la tâche est reprise après l'expiration de son
 * bail (90 s) et se termine — ou échoue avec une raison visible — mais ne disparaît jamais.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3000";
const PHOTO = process.env.PHOTO!;
const pids = () => {
  try {
    return execSync(`pgrep -f "worker/index.ts"`, { encoding: "utf8" }).split("\n").map(Number).filter((n) => n && n !== process.pid);
  } catch {
    return [];
  }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext()).newPage();
await page.goto(`${BASE}/inscription`);
await page.fill("#name", "Reprise");
await page.fill("#email", `reprise-${Date.now()}@exemple.fr`);
await page.fill("#password", "motdepasse-solide-123");
await Promise.all([page.waitForURL(/\/studio/, { timeout: 60_000 }), page.click("button[type=submit]")]);
const b64 = fs.readFileSync(PHOTO).toString("base64");
const created = await page.evaluate(async (b64) => {
  const fd = new FormData();
  fd.append("businessType", "products");
  fd.append("productName", "Oreiller test reprise");
  fd.append("description", "Oreiller en coton bio, garnissage fibres recyclées, housse lavable à 40 °C, fabriqué au Portugal.");
  fd.append("mode", "autopilot");
  fd.append("photos", new File([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], "photo.jpg", { type: "image/jpeg" }));
  const r = await fetch("/api/projects", { method: "POST", body: fd });
  return r.json();
}, b64);
const pid = created.id as string;
const t0 = Date.now();
const state = () => page.evaluate(async (u) => (await fetch(`/api/projects/${u}`)).json(), pid);
await page.waitForTimeout(5000);
const before = await state();
const killed = pids();
for (const p of killed) try { process.kill(p, "SIGKILL"); } catch {}
console.log(`worker tué à ${Math.round((Date.now() - t0) / 1000)} s, pilote : ${before.pipeline?.job?.status} « ${before.pipeline?.job?.message} »`);
let last: any = null;
for (;;) {
  await page.waitForTimeout(5000);
  last = await state();
  const job = last.pipeline?.job;
  if (job && ["done", "failed", "blocked", "cancelled"].includes(job.status)) break;
  if (Date.now() - t0 > 6 * 60_000) break;
}
const job = last.pipeline?.job;
const out = { killedAtS: 5, workerRestarted: pids().some((p) => !killed.includes(p)), totalS: Math.round((Date.now() - t0) / 1000), status: job?.status, message: job?.message, error: job?.error, steps: (last.pipeline?.steps ?? []).map((s: any) => `${s.id}:${s.status}`) };
console.log(JSON.stringify(out, null, 2));
fs.mkdirSync("reports/stabilite", { recursive: true });
fs.writeFileSync("reports/stabilite/reprise-worker.json", JSON.stringify(out, null, 2));
await browser.close();
process.exit(job?.status === "done" || (job?.status === "failed" && job?.error) ? 0 : 1);
