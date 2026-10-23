/**
 * Lot 1 — exporte une base SQLite synthétique en SQL texte (schéma + lignes), pour la figer comme jeu d'essai
 * relisible dans `tests/fixtures/lot1/`. Réservé aux bases fabriquées par `base-historique.ts` (aucune donnée réelle).
 *
 *   npx tsx scripts/lot1/exporter-sql.ts <dossier fabriqué> <fichier.sql>
 */
import fs from "node:fs";
import path from "node:path";
import { openReadonly, userTables } from "./outils";

const [dir, outFile] = process.argv.slice(2);
if (!dir || !outFile) throw new Error("usage : exporter-sql.ts <dossier fabriqué> <fichier.sql>");
if (!fs.existsSync(path.join(dir, "fabrication.json"))) throw new Error("Seules les bases synthétiques fabriquées (fabrication.json) sont exportées.");
const d = openReadonly(path.join(dir, "studio.db"));
const lit = (v: unknown) => (v === null ? "NULL" : typeof v === "number" || typeof v === "bigint" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const lines = [`-- Base historique SYNTHÉTIQUE, ${JSON.parse(fs.readFileSync(path.join(dir, "fabrication.json"), "utf8")).commit ?? "?"}`, "PRAGMA foreign_keys=OFF;", "BEGIN;"];
const objects = d.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid").all() as { type: string; name: string; sql: string }[];
for (const o of objects.filter((o) => o.type === "table")) lines.push(`${o.sql};`);
for (const t of userTables(d)) for (const row of d.prepare(`SELECT * FROM "${t}"`).raw().iterate() as Iterable<unknown[]>) lines.push(`INSERT INTO "${t}" VALUES (${row.map(lit).join(",")});`);
for (const o of objects.filter((o) => o.type !== "table")) lines.push(`${o.sql};`);
lines.push("COMMIT;");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, lines.join("\n") + "\n");
console.log(`${outFile} : ${lines.length} lignes`);
