/**
 * Mission #190, point 7 — prise de rendez-vous APRÈS EXPORT : le site ATELIER NUANCE exporté pour WordPress, installé
 * dans une boutique de test, prend un rendez-vous auprès du service du studio ; la rubrique « Rendez-vous » le voit, et
 * le même créneau est ensuite refusé (aucune double réservation).
 *
 *   STUDIO_HTTPS_PORT=8443 npx tsx scripts/rdv-export-190.ts <dossier de sortie> <script d'installation WordPress>
 *
 * Base temporaire à part. Le service du studio est servi en HTTPS local (certificat auto-signé, accepté par le
 * navigateur de test seulement) : le thème n'appelle qu'une adresse https://. L'adresse étant locale, le mode réel est
 * posé directement dans la section de réglages (la rubrique exige une adresse publique, ce qu'un poste de test n'a pas).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import https from "node:https";
import { execFileSync } from "node:child_process";

if (process.env.DATA_DIR || process.env.DATABASE_FILE) throw new Error("Base existante refusée");
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-rdv-"));
process.env.STOCK_OFFLINE = "1";
const [outDir, installer] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const PORT = Number(process.env.STUDIO_HTTPS_PORT || 8443);
const WP = process.env.WP_URL || "http://127.0.0.1:8881";

const { createUser } = await import("../src/lib/auth");
const { saveThemeVersion, currentTheme } = await import("../src/lib/projects");
const { runWithLang } = await import("../src/lib/i18n-server");
const { cmsExport } = await import("../src/lib/cms-v2/export");
const { libraryLoader } = await import("../src/lib/theme/loader");
const { rdvOverview, rdvSection } = await import("../src/lib/rendez-vous");
const route = await import("../src/app/api/public/salon/[projectId]/[[...path]]/route");
const { demoProject } = await import("../tests/demo-fixtures");
const { chromium } = await import("playwright");

const out: Record<string, unknown> = {};
const user = await createUser("rdv-export-190@example.invalid", "isolated-test-only", "Salon");
const f = await runWithLang({ content: "fr", ui: "fr" }, () => demoProject(user.id, "atelier-nuance" as never));
const pid = f.pid;
const service = `https://127.0.0.1:${PORT}/api/public/salon/${pid}`;
// Mode réel posé dans la section de réglages du salon (source unique), comme le fait l'activation de la rubrique.
const spec = structuredClone(f.spec);
const sec = rdvSection(spec)!;
const target = sec.template === "group:header" ? spec.groups.header.sections[sec.id] : spec.templates[sec.template].sections[sec.id];
Object.assign(target.settings, { booking_mode: "live", service_url: service });
saveThemeVersion(pid, spec, "Rendez-vous : service réel (essai local)", "user");
const exp = await runWithLang({ content: "fr", ui: "fr" }, () => cmsExport("woocommerce", currentTheme(pid)!.spec, libraryLoader, { projectId: pid }));
const zip = path.join(outDir, "atelier-nuance-live-woocommerce.zip");
fs.writeFileSync(zip, exp.zip);

// Service du studio en HTTPS local (mêmes fonctions que la route publique du studio).
const certDir = fs.mkdtempSync(path.join(os.tmpdir(), "ecs-cert-"));
execFileSync("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", path.join(certDir, "k.pem"), "-out", path.join(certDir, "c.pem"), "-days", "1", "-subj", "/CN=127.0.0.1"], { stdio: "ignore" });
const calls: string[] = [];
const server = https.createServer({ key: fs.readFileSync(path.join(certDir, "k.pem")), cert: fs.readFileSync(path.join(certDir, "c.pem")) }, async (req, res) => {
  const url = new URL(req.url!, `https://127.0.0.1:${PORT}`);
  const m = url.pathname.match(/^\/api\/public\/salon\/([^/]+)(?:\/(.*))?$/);
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  calls.push(`${req.method} ${url.pathname.replace(pid, "<projet>")}`);
  if (!m) { res.statusCode = 404; return res.end(); }
  const request = new Request(url, { method: req.method, headers: req.headers as Record<string, string>, body: ["GET", "HEAD", "OPTIONS"].includes(req.method!) ? undefined : Buffer.concat(chunks) });
  const ctx = { params: Promise.resolve({ projectId: m[1], path: (m[2] ?? "").split("/").filter(Boolean) }) } as never;
  const r = req.method === "OPTIONS" ? await route.OPTIONS() : req.method === "POST" ? await route.POST(request, ctx) : await route.GET(request, ctx);
  res.statusCode = r.status;
  r.headers.forEach((v, k) => res.setHeader(k, v));
  res.end(Buffer.from(await r.arrayBuffer()));
});
await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

// Installation dans la boutique de test WordPress.
const inst = execFileSync(installer, [zip, "1"], { encoding: "utf8" }).trim().split("\n").pop()!;
out.install = JSON.parse(inst).slug;

const browser = await chromium.launch();
const page = await (await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } })).newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
async function book(first: string, email: string, pick?: { date: string; time: string }) {
  await page.goto(`${WP}/prendre-rendez-vous/#service=coupe-brushing`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const consent = page.getByRole("button", { name: /refuser|accepter/i }).filter({ visible: true }).first();
  if (await consent.count()) await consent.click().catch(() => undefined);
  const next = async () => { await page.locator("[data-an-next]").filter({ visible: true }).first().click(); await page.waitForTimeout(800); };
  await next(); // prestation (choisie par le lien)
  const person = page.locator("input[name=an-staff]").first();
  if (await person.count()) await person.check({ force: true });
  await next(); // intervenant
  let chosen = pick;
  if (pick) {
    for (let i = 0; i < 4 && !(await page.locator(`[data-date="${pick.date}"]`).count()); i++) { await page.locator("[data-cal-next]").first().click(); await page.waitForTimeout(500); }
    await page.locator(`[data-date="${pick.date}"]`).first().click();
    await page.waitForTimeout(1200);
    const slot = page.locator(`[data-time="${pick.time}"]`).first();
    out[`slot_${first}`] = { visible: await slot.count(), disabled: await slot.isDisabled().catch(() => null) };
    if (!(await slot.count()) || (await slot.isDisabled().catch(() => true))) return { refused: "créneau indisponible dans le calendrier" };
    await slot.click();
  } else {
    for (let i = 0; i < 3 && !chosen; i++) {
      const day = page.locator("[data-date]:not([disabled]):not(.is-disabled)").first();
      if (await day.count()) {
        await day.click(); await page.waitForTimeout(1200);
        const time = page.locator("[data-time]:not([disabled])").first();
        if (await time.count()) { chosen = { date: (await day.getAttribute("data-date"))!, time: (await time.getAttribute("data-time"))! }; await time.click(); break; }
      }
      await page.locator("[data-cal-next]").first().click(); await page.waitForTimeout(600);
    }
  }
  await page.waitForTimeout(400);
  await next(); // date et heure
  await page.fill("input[name=firstName]", first);
  await page.fill("input[name=lastName]", "Essai");
  await page.fill("input[name=email]", email);
  await page.fill("input[name=phone]", "06 12 34 56 78");
  await page.locator("input[name=terms]").check({ force: true });
  await next(); // coordonnées → récapitulatif
  await page.locator("[data-an-submit]").filter({ visible: true }).first().click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, `rdv-${first}.png`) });
  return { chosen, text: (await page.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 300) };
}
try {
  const first = await book("Julie", "julie@example.com");
  out.first = first;
  const view = rdvOverview(pid, "2026-01-01", "2027-12-31");
  out.studio = view.kind ? view.bookings.map((b) => ({ number: b.number, date: b.date, start: b.start, client: b.client.email, status: b.status })) : view;
  // Même créneau demandé par une autre cliente depuis le site exporté : refusé (calendrier ou serveur).
  if (first.chosen) {
    const second = await book("Paul", "paul@example.com", first.chosen);
    out.second = second;
    const after = rdvOverview(pid, "2026-01-01", "2027-12-31");
    out.studioAfter = after.kind ? after.bookings.filter((b) => b.status === "confirmed").map((b) => [b.date, b.start, b.client.email]) : after;
  }
} catch (e) { out.error = (e as Error).message.slice(0, 300); }
out.calls = calls.slice(0, 20);
out.jsErrors = errors.slice(0, 5);
fs.writeFileSync(path.join(outDir, "rdv-export.json"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out));
await browser.close();
server.close();
fs.rmSync(process.env.DATA_DIR!, { recursive: true, force: true });
