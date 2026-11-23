/**
 * Rend au client les dépenses d'une tâche « À ma charge » (à la charge du Studio) qui lui ont été comptées, et les inscrit
 * à la charge du Studio, avec une trace (essai réel de Nadia, 23 novembre 2026 : 17,04 % → 17,97 % de budget engagé).
 * Aucun appel à l'IA, aucune dépense. Idempotent : relancé, il ne change rien.
 *
 *   DATA_DIR=<dossier du Studio> npx tsx scripts/rendre-charge-du-studio.ts --projet <projectId>   un projet
 *   DATA_DIR=<dossier du Studio> npx tsx scripts/rendre-charge-du-studio.ts --tout                 toute la base
 *   … --voir     montre ce qui serait rendu, sans rien changer (tout est annulé à la fin)
 */
import "../worker/env";
import { tx } from "../src/lib/db";
import { rendreLaChargeDuStudio, type RattrapageDuStudio } from "../src/lib/ai/rattrapage-charge-du-studio";

const args = process.argv.slice(2);
const projet = args.includes("--projet") ? args[args.indexOf("--projet") + 1] : undefined;
if (!projet && !args.includes("--tout")) {
  console.error("Préciser --projet <identifiant du projet> ou --tout.");
  process.exit(2);
}
const voir = args.includes("--voir");
class Annule extends Error {}
let r!: RattrapageDuStudio;
try {
  tx(() => { r = rendreLaChargeDuStudio({ projectId: projet ?? null }); if (voir) throw new Annule(); });
} catch (e) { if (!(e instanceof Annule)) throw e; }
if (voir) console.log("Essai à blanc (--voir) : rien n'a été changé.");
const eur = (m: number) => `${(m / 1e6).toFixed(4)} €`;
console.log(`Tâches « À ma charge » examinées : ${r.taches}`);
console.log(`Dépenses passées à la charge du Studio : ${r.depenses}`);
console.log(`Rendu au budget du client : ${eur(r.renduMicro)}`);
for (const l of r.lignes) console.log(`  - tâche ${l.tache} (projet ${l.projet ?? "?"}) : ${l.quoi}, rendu ${eur(l.renduMicro)}`);
if (!r.depenses) console.log("Rien à rendre : tout est déjà à la charge du Studio.");
