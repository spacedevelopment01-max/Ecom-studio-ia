// Outil de vue rapide (hors dépôt : fichier caché, jamais ajouté). Usage :
// npx tsx .voir-services.ts <piece> <construction|*> <etats> <tenues> <largeurs> <sortie.png> [selecteur] [--ouvert]
import fs from "node:fs";
import * as R from "./rendu";
import { TENUES, HAUTEUR, type Etat } from "./donnees";
import { mesurer, onglet, ouvrir, ouvrirNavigateur, servir } from "./banc";
import { TENUE_SECTIONS } from "../../src/lib/syna-agent/custom-theme/tenue";
(async () => {
  const [piece, cons, etats, tenues, largeurs, sortie, sel] = process.argv.slice(2);
  const banc = await R.monter();
  const browser = await ouvrirNavigateur(), service = await servir(R.fichier);
  const og = await onglet(browser, service);
  const sit = R.SITUATIONS.find((s) => s.cle === piece);
  const s = TENUE_SECTIONS.find((x) => x.id === piece);
  const cs = sit ? [""] : cons === "*" ? R.constructionsDe(s!) : cons.split(",");
  const out: any[] = [];
  for (const c of cs) for (const etat of etats.split(",") as Etat[]) for (const tk of tenues.split(",")) for (const l of largeurs.split(",").map(Number)) {
    const tenue = TENUES.find((t) => t.cle === tk)!;
    const x = R.page(banc, sit ? R.suiteValable(sit.suite) : [{ piece, construction: c }], etat, tenue);
    await og.montrer(x.html, l, HAUTEUR(l));
    if (process.argv.includes("--ouvert")) await ouvrir(og.page);
    const m = await mesurer(og.page, { monte: etat !== "exemple" }, {});
    if (process.env.MES) console.log(JSON.stringify(await og.page.evaluate((q) => Array.from(document.querySelectorAll(q)).slice(0, 14).map((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return [e.tagName + "." + e.className, Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height), c.marginTop, c.paddingTop, c.paddingBottom, c.display]; }), process.env.MES)));
    const f = sortie.replace(/\.png$/, `--${c}--${etat}--${tk}--${l}.png`);
    if (sel) { const el = og.page.locator(sel).first(); await el.screenshot({ path: f }).catch(async () => { await og.page.screenshot({ path: f, fullPage: true }); }); }
    else await og.page.screenshot({ path: f, fullPage: true });
    out.push({ f, defauts: m.defauts.map((d) => `${d.gravite} ${d.type} ${d.selecteur} :: ${d.detail}`) });
    if (process.argv.includes("--html")) fs.writeFileSync(f.replace(/\.png$/, ".html"), x.html);
  }
  for (const o of out) { console.log(o.f); for (const d of o.defauts) console.log("   ", d.slice(0, 260)); }
  await browser.close(); await service.fermer(); process.exit(0);
})();
