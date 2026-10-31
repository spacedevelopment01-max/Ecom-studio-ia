/**
 * Sauvegarde et vérification des sites publiés (#232, lot B), à lancer sur le serveur avec le même DATA_DIR :
 *   npx tsx scripts/sites-backup.ts sauvegarder <dossier>   copie en ligne de la base + publications figées, puis rapport
 *   npx tsx scripts/sites-backup.ts verifier <dossier>      vérifie une sauvegarde (base, empreintes, sites en ligne)
 *   npx tsx scripts/sites-backup.ts controler               vérifie les publications en service (sans sauvegarder)
 * Restauration (studio arrêté) : voir docs/hebergement/232-LOT-B-FIABILITE.md.
 */
import { backupSites, cleanupInterrupted, verifyBackup, verifyPublication } from "../src/lib/sites/maintenance";
import { all } from "../src/lib/db";

const [cmd, dir] = process.argv.slice(2);
if (cmd === "sauvegarder" && dir) {
  console.log(JSON.stringify(await backupSites(dir), null, 1));
  const v = verifyBackup(dir);
  console.log(v.ok ? `Sauvegarde vérifiée : ${v.checked} publication(s) intacte(s).` : `PROBLÈMES :\n- ${v.problems.join("\n- ")}`);
  process.exit(v.ok ? 0 : 1);
} else if (cmd === "verifier" && dir) {
  const v = verifyBackup(dir);
  console.log(v.ok ? `Sauvegarde intacte : ${v.checked} publication(s).` : `PROBLÈMES :\n- ${v.problems.join("\n- ")}`);
  process.exit(v.ok ? 0 : 1);
} else if (cmd === "controler") {
  const removed = cleanupInterrupted();
  const pubs = all<{ id: string; project_id: string; number: number }>("SELECT id, project_id, number FROM site_publications WHERE purged_at IS NULL");
  const bad = pubs.map((p) => ({ p, v: verifyPublication(p.project_id, p.id) })).filter((x) => !x.v.ok);
  console.log(`${pubs.length} publication(s) contrôlée(s), ${bad.length} en défaut, ${removed} publication(s) interrompue(s) nettoyée(s).`);
  for (const { p, v } of bad) console.log(`- ${p.project_id} n°${p.number} : ${v.manifest ? `${v.missing.length} manquant(s), ${v.corrupt.length} altéré(s)` : "manifeste absent"}`);
  process.exit(bad.length ? 1 : 0);
} else {
  console.log("Usage : sites-backup.ts sauvegarder <dossier> | verifier <dossier> | controler");
  process.exit(2);
}
