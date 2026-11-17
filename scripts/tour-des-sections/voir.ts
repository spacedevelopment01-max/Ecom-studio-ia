/**
 * Tour des sections : la vue rapide d'une pièce (ou d'une page en situation), pour vérifier une correction sans refaire
 * un tour. Rend la page comme le tour, écrit une capture par cas et dit les défauts mesurés.
 *
 *   npx tsx scripts/tour-des-sections/voir.ts <pièce> <façon|*> <états> <tenues> <largeurs> <sortie.png> [sélecteur] [--ouvert] [--html]
 *   npx tsx scripts/tour-des-sections/voir.ts tn-rdv photo vrai,difficile calme,gras 320,1280 /tmp/rdv.png
 *   npx tsx scripts/tour-des-sections/voir.ts boutique-accueil "" vrai gras 390 /tmp/accueil.png .tn-histoire
 *
 * Le sélecteur limite la capture à un élément ; « --ouvert » ouvre ce qui est replié avant de mesurer ; « --html »
 * garde la page à côté de la capture. MES="<sélecteur>" écrit la place et la taille des éléments trouvés ;
 * JS="<expression>" écrit ce que rend cette expression, évaluée dans la page.
 * Gratuit : aucun appel à l'IA, aucun réseau. La base d'essai est jetable, hors du dépôt.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const donnees = fs.mkdtempSync(path.join(os.tmpdir(), "tour-des-sections-voir-"));
process.env.DATA_DIR = donnees;
process.env.STUDIO_SYNA_AGENT = "1";

const libres = process.argv.slice(2).filter((x) => !x.startsWith("--"));
const [piece, cons = "*", etats = "vrai", tenues = "calme", largeurs = "390", sortie = path.join(os.tmpdir(), "voir.png"), sel] = libres;
const a = (nom: string) => process.argv.includes(`--${nom}`);
let code = 0;
try {
  if (!piece) throw new Error("Il faut au moins une pièce (voir l'en-tête de ce fichier).");
  const R = await import("./rendu");
  const { TOUTES_TENUES: TENUES, HAUTEUR } = await import("./donnees");
  const { mesurer, onglet, ouvrir, ouvrirNavigateur, servir } = await import("./banc");
  const { tenueSection, exampleProductNames } = await import("../../src/lib/syna-agent/custom-theme/tenue");
  const banc = await R.monter();
  const browser = await ouvrirNavigateur(), service = await servir(R.fichier);
  try {
    const og = await onglet(browser, service);
    const sit = R.SITUATIONS.find((s) => s.cle === piece), s = tenueSection(piece);
    if (!sit && !s) throw new Error(`Pièce inconnue : ${piece}`);
    const facons = sit ? [""] : cons === "*" || cons === "" ? R.constructionsDe(s!) : cons.split(",");
    const exemples = ["Brindi", ...exampleProductNames()].filter((x) => x.length >= 5);
    for (const c of facons) for (const etat of etats.split(",") as import("./donnees").Etat[]) for (const tk of tenues.split(",")) for (const l of largeurs.split(",").map(Number)) {
      const tenue = TENUES.find((t) => t.cle === tk);
      if (!tenue) throw new Error(`Tenue inconnue : ${tk}`);
      const x = R.page(banc, sit ? R.suiteValable(sit.suite) : [{ piece, construction: c }], etat, tenue, { cleReglages: sit?.page, ...(process.env.FOND ? { reglages: [{ fond: process.env.FOND as never }] } : {}) });
      const f = sortie.replace(/\.png$/, `--${c}--${etat}--${tk}--${l}.png`);
      if (!x.rendues.length) { console.log(`${f}\n    (le Studio ne rend rien pour cette pièce avec ces données)`); continue; }
      await og.montrer(x.html, l, HAUTEUR(l));
      if (a("ouvert")) await ouvrir(og.page);
      const m = await mesurer(og.page, { monte: etat !== "exemple", titreLourd: tenue.titreLourd, exemples }, {});
      if (process.env.MES) console.log(JSON.stringify(await og.page.evaluate((q) => Array.from(document.querySelectorAll(q)).slice(0, 14).map((e) => { const r = e.getBoundingClientRect(), k = getComputedStyle(e); return [e.tagName + "." + e.className, Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height), k.marginTop, k.paddingTop, k.paddingBottom, k.display]; }), process.env.MES)));
      if (process.env.JS) console.log(JSON.stringify(await og.page.evaluate(process.env.JS)));
      if (sel) await og.page.locator(sel).first().screenshot({ path: f }).catch(async () => { await og.page.screenshot({ path: f, fullPage: true }); });
      else await og.page.screenshot({ path: f, fullPage: true });
      if (a("html")) fs.writeFileSync(f.replace(/\.png$/, ".html"), x.html);
      console.log(f);
      for (const d of m.defauts) console.log(`    ${d.gravite} ${d.type} ${d.selecteur} :: ${d.detail} « ${d.texte.slice(0, 40)} »`.slice(0, 300));
    }
  } finally { await browser.close(); await service.fermer(); }
} catch (e) { console.error((e as Error).message); code = 1; }
finally { try { fs.rmSync(donnees, { recursive: true, force: true }); } catch { /* le dossier jetable part au prochain ménage */ } }
process.exit(code);
