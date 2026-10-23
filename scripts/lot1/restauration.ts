/**
 * Lot 1 — restauration d'une sauvegarde dans un NOUVEAU dossier de données (issue #163, action 03).
 *
 *   npx tsx scripts/lot1/restauration.ts --depuis /sauvegarde --vers /nouveau/dossier [--recette]
 *
 * La sauvegarde est vérifiée avant (empreintes du manifeste), la copie après. Le dossier cible doit être vide ;
 * le dossier de données en service (DATA_DIR, ./data) est refusé. Aucune migration n'est lancée ici.
 * --recette : copie destinée à être ouverte pour un essai ; tâches en pause, calendriers en pause, secrets et jetons
 * des réseaux sociaux retirés de la copie. Ne jamais l'employer pour une vraie reprise.
 */
import path from "node:path";
import { neutralize, restore } from "./outils";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
globalThis.fetch = (async () => {
  throw new Error("Réseau interdit pendant la restauration.");
}) as typeof fetch;
const from = arg("depuis");
const to = arg("vers");
if (!from || !to) throw new Error("--depuis <sauvegarde> et --vers <dossier vide> obligatoires.");
const forbid = [process.env.DATA_DIR ?? "", path.join(process.cwd(), "data")];
const checks = restore(from, to, { forbid });
for (const c of checks) console.log(`${c.ok ? "OK " : "ÉCHEC"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
if (!checks.every((c) => c.ok || c.name === "références médias de l'instantané")) process.exit(1);
if (process.argv.includes("--recette")) console.log("Copie de recette neutralisée :", JSON.stringify(neutralize(to, { forbid })));
console.log(`Restauré dans ${path.resolve(to)}.`);
console.log("Reprise réelle : démarrer le studio avec DATA_DIR sur ce dossier et le MÊME APP_SECRET que la sauvegarde.");
console.log("Essai : `env -i PATH=$PATH DATA_DIR=<copie> SOCIAL_PUBLISH_DISABLED=1 APP_SECRET=<autre> …`, worker arrêté.");
