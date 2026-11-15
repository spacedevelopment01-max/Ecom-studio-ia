/** Session réutilisable d'un compte fictif (une seule connexion par compte, puis le témoin est relu). */
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/"); export const { chromium } = require("playwright");
export function auditOf(auditDir) { const a = JSON.parse(fs.readFileSync(path.join(auditDir, "audit.json"), "utf8")); return { ...a, origin: `http://localhost:${a.port}` }; }
export async function contextFor(browser, auditDir, who, opts = {}) {
  const audit = auditOf(auditDir); const file = path.join(auditDir, `session-${who}.json`);
  if (who && fs.existsSync(file)) return browser.newContext({ ...opts, storageState: file });
  const ctx = await browser.newContext(opts);
  if (who) {
    const r = await ctx.request.post(`${audit.origin}/api/auth/login`, { data: { email: audit[who], password: audit.password }, headers: { origin: audit.origin } });
    if (r.status() >= 400) throw new Error(`connexion ${who} : ${r.status()} ${(await r.text()).slice(0, 120)}`);
    await ctx.storageState({ path: file });
  }
  return ctx;
}
