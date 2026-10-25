/**
 * Lot 1 — sauvegarde cohérente des données du studio, SANS l'arrêter (issue #163, action 03).
 *
 *   npx tsx scripts/lot1/sauvegarde.ts --dest /hors/du/studio/sauvegarde-AAAA-MM-JJ [--data ./data]
 *   npx tsx scripts/lot1/sauvegarde.ts --verifier /hors/du/studio/sauvegarde-AAAA-MM-JJ
 *
 * Copie : base SQLite (instantané en ligne), médias (`storage/`), reçus vidéo et tests de contact ; manifeste des
 * comptages et empreintes. Jamais copié : APP_SECRET, `data/.app-secret`, caches, démonstrations régénérables.
 * Les secrets enregistrés dans l'administration restent chiffrés dans la base : sans le même APP_SECRET ils sont
 * illisibles après restauration (à conserver à part, dans un coffre, jamais dans le dépôt ni dans la conversation).
 */
import path from "node:path";
import { backup, verify } from "./outils";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
globalThis.fetch = (async () => {
  throw new Error("Réseau interdit pendant la sauvegarde.");
}) as typeof fetch;

const toCheck = arg("verifier");
if (toCheck) {
  const { checks } = verify(toCheck);
  for (const c of checks) console.log(`${c.ok ? "OK " : "ÉCHEC"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  process.exit(checks.every((c) => c.ok) ? 0 : 1);
}
const dest = arg("dest");
if (!dest) throw new Error("--dest <dossier vide hors du studio> obligatoire.");
const dataDir = path.resolve(arg("data") ?? process.env.DATA_DIR ?? path.join(process.cwd(), "data"));
const m = await backup({ dataDir, dest, databaseFile: process.env.DATABASE_FILE, storageDir: process.env.STORAGE_DIR });
console.log(`Sauvegarde écrite dans ${path.resolve(dest)}`);
console.log(`Base : ${m.database.sha256} (${Object.keys(m.database.fingerprint.tables).length} tables, intégrité ${m.database.integrity})`);
console.log(`Médias : ${m.storage.files.length} fichiers ; références de la base : ${m.storage.referenced} ; manquantes : ${m.storage.missing.length}`);
console.log(`Réglages secrets présents (noms seulement) : ${m.settings.filter((s) => s.secret).map((s) => s.key).join(", ") || "aucun"}`);
console.log(`À garder à part : APP_SECRET${m.env.APP_SECRET ? " (défini dans cet environnement)" : " (absent ici : clé de développement data/.app-secret)"}.`);
if (m.storage.missing.length) console.log("Attention : des médias référencés étaient absents au moment de la sauvegarde (voir le manifeste).");
