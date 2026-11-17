/**
 * Tour des sections : la commande. Voir LISEZMOI.md.
 *
 *   npx tsx scripts/tour-des-sections/tour.ts                       tout le tour
 *   npx tsx scripts/tour-des-sections/tour.ts --module achat        un module
 *   npx tsx scripts/tour-des-sections/tour.ts --piece tn-rdv        une pièce
 *   npx tsx scripts/tour-des-sections/tour.ts --sans-planches       seulement les détecteurs
 *
 * Gratuit : aucun appel à l'IA, aucun réseau. La base d'essai est jetable, hors du dépôt.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const val = (nom: string) => { const i = args.indexOf(`--${nom}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : undefined; };
const liste = (nom: string) => val(nom)?.split(",").map((x) => x.trim()).filter(Boolean);
const a = (nom: string) => args.includes(`--${nom}`);

if (a("aide")) { console.log(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), "LISEZMOI.md"), "utf8")); process.exit(0); }

// La base d'essai : un dossier jetable, hors du dépôt, posé AVANT tout import du Studio.
const donnees = fs.mkdtempSync(path.join(os.tmpdir(), "tour-des-sections-"));
process.env.DATA_DIR = donnees;
process.env.STUDIO_SYNA_AGENT = "1";

const SORTIE_PAR_DEFAUT = "/tmp/claude-0/-home-user-Ecom-studio-ia/cdd8e871-2fa8-5553-9230-2342b2efce3a/scratchpad/tour";
const sortie = path.resolve(val("sortie") ?? process.env.TOUR_SORTIE ?? (fs.existsSync(path.dirname(SORTIE_PAR_DEFAUT)) ? SORTIE_PAR_DEFAUT : path.join(os.tmpdir(), "tour-des-sections")));

const T = await import("./tour-lib");
let code = 0;
try {
  if (a("recensement")) {
    const { recenser, totaux } = await import("./recensement");
    const pieces = recenser(), tot = totaux(pieces);
    fs.mkdirSync(sortie, { recursive: true });
    for (const f of [path.join(sortie, "recensement.json"), path.join(path.dirname(new URL(import.meta.url).pathname), "recensement.json")]) fs.writeFileSync(f, JSON.stringify({ totaux: tot, pieces }, null, 2) + "\n");
    console.log(`${tot.pieces} pièces, ${tot.constructions} constructions (pièce × construction).`);
    for (const [m, x] of Object.entries(tot.parModule)) console.log(`  ${m.padEnd(11)} ${String(x.pieces).padStart(3)} pièces, ${String(x.constructions).padStart(3)} constructions`);
  } else {
    const r = await T.tourner({
      sortie, modules: liste("module"), pieces: liste("piece"), etats: liste("etat") as never, tenues: liste("tenue"), largeurs: liste("largeur")?.map(Number),
      planches: !a("sans-planches"), situations: a("situations") ? "seules" : a("sans-situations") ? "non" : undefined, parallele: val("parallele") ? Number(val("parallele")) : undefined, dire: (s) => console.log(s),
    });
    const ici = r.fiches.flatMap((f) => f.defauts), pieces = r.fiches.map((f) => f.piece);
    const complet = !val("etat") && !val("tenue") && !val("largeur");
    console.log(`\nSorties : ${sortie}\n  resume.md, resume.json, defauts.json, recensement.json${a("sans-planches") ? "" : ", planches/<module>/<pièce>--<état>--tel.jpg et --ordi.jpg"}`);
    const parType: Record<string, number> = {};
    for (const d of new Map(ici.map((d) => [T.cleDistincte(d), d])).values()) parType[`${d.gravite} · ${d.type}`] = (parType[`${d.gravite} · ${d.type}`] ?? 0) + 1;
    console.log(`\nDéfauts distincts de ce tour, par type :\n${Object.entries(parType).sort((x, y) => y[1] - x[1]).map(([k, v]) => `  ${String(v).padStart(5)}  ${k}`).join("\n") || "  aucun"}`);
    if (a("ecrire-connus")) {
      if (!complet) throw new Error("--ecrire-connus demande un tour avec tous les états, toutes les tenues et toutes les largeurs.");
      const c = T.ecrireConnus(ici, pieces);
      console.log(`\nconnus.json réécrit pour ${pieces.length} pièce(s) : ${Object.keys(c).length} pièce(s) portent encore un défaut bloquant.`);
    } else if (a("test")) {
      const connus = T.lireConnus(), neufs = complet ? T.nouveaux(ici, connus, pieces) : [], repares = complet ? T.repares(ici, connus, pieces) : [];
      if (repares.length) console.log(`\nRéparés depuis connus.json (relancer avec --ecrire-connus pour les retirer) :\n${repares.map((x) => `  ${x}`).join("\n")}`);
      if (neufs.length) { console.log(`\nDÉFAUTS BLOQUANTS NOUVEAUX (absents de connus.json) :\n${neufs.map((x) => `  ${x}`).join("\n")}`); code = 1; }
      else console.log("\nAucun défaut bloquant nouveau.");
    }
  }
} catch (e) { console.error(`\nLe tour s'est arrêté : ${(e as Error).message}`); code = 1; }
finally { try { fs.rmSync(donnees, { recursive: true, force: true }); } catch { /* le dossier jetable part au prochain ménage */ } }
process.exit(code);
