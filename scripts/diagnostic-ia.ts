/**
 * Diagnostic de l'IA sur un projet (lecture seule, aucune clé affichée) : ce que l'IA a fait ou pourquoi ses
 * propositions ont été écartées (pistes de logo), appels et coûts par tâche, état des tâches de fond.
 *
 *   npx tsx scripts/diagnostic-ia.ts              dernier projet modifié
 *   npx tsx scripts/diagnostic-ia.ts <projectId>  projet précis (identifiant dans l'adresse /studio/<id>/…)
 */
import path from "node:path";
import Database from "better-sqlite3";

const file = process.env.DATABASE_FILE || path.join(process.env.DATA_DIR || "data", "studio.db");
const db = new Database(file, { readonly: true, fileMustExist: true });
const arg = process.argv[2];
const p = db.prepare(arg ? "SELECT id, name, store_type AS business FROM projects WHERE id = ?" : "SELECT id, name, store_type AS business FROM projects ORDER BY updated_at DESC LIMIT 1").get(...(arg ? [arg] : [])) as { id: string; name: string; business: string } | undefined;
if (!p) { console.log("Aucun projet trouvé."); process.exit(1); }
const time = (ms: number) => new Date(ms).toLocaleString("fr-FR");
console.log(`\n=== Projet « ${p.name} » (${p.id}) ===`);

console.log("\n--- Pistes de logo (dernière série) ---");
const routes = db.prepare("SELECT name, meta, created_at FROM assets WHERE project_id = ? AND role = 'logo-proposal' ORDER BY created_at DESC LIMIT 6").all(p.id) as { name: string; meta: string; created_at: number }[];
if (!routes.length) console.log("Aucune piste.");
const last = routes[0] ? JSON.parse(routes[0].meta).batch : null;
for (const r of routes) {
  const m = JSON.parse(r.meta);
  if (m.batch !== last) continue;
  console.log(`• ${m.label ?? r.name} — source : ${m.route?.source ?? "?"} — IA : ${m.ai ?? "?"}${m.route?.review ? ` — note DA : ${JSON.stringify(m.route.review.scores ?? {})}` : ""}`);
}
const notes = routes[0] ? (JSON.parse(routes[0].meta).notes as string[] | undefined) ?? [] : [];
if (notes.length) { console.log("Raisons notées :"); for (const n of notes) console.log(`  - ${n}`); }

console.log("\n--- Appels IA de ce projet (par tâche) ---");
const usage = db.prepare("SELECT task, provider, model, unit, COUNT(*) n, SUM(quantity) q, SUM(cost) c FROM usage_events WHERE project_id = ? GROUP BY task, provider, model ORDER BY MIN(created_at)").all(p.id) as { task: string; provider: string; model: string; n: number; q: number; c: number }[];
if (!usage.length) console.log("Aucun appel IA enregistré pour ce projet.");
let total = 0;
for (const u of usage) { total += u.c; console.log(`• ${u.task} — ${u.provider}/${u.model} — ${u.n} appel(s) — ${(u.c / 1e6).toFixed(3)} €`); }
if (usage.length) console.log(`Total : ${(total / 1e6).toFixed(2)} €`);

console.log("\n--- Tâches de fond récentes ---");
const jobs = db.prepare("SELECT type, status, progress, message, error, updated_at FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 12").all(p.id) as { type: string; status: string; progress: number; message: string; error: string | null; updated_at: number }[];
for (const j of jobs) console.log(`• ${j.type} — ${j.status} ${Math.round(j.progress * 100)} % — ${time(j.updated_at)} — ${j.error ?? j.message ?? ""}`.slice(0, 300));

console.log("\n--- Fournisseurs (sans les clés) ---");
const settings = db.prepare("SELECT key, value FROM settings WHERE key LIKE 'provider.%' AND key NOT LIKE '%apiKey%'").all() as { key: string; value: string }[];
for (const s of settings) console.log(`• ${s.key} = ${String(s.value).slice(0, 80)}`);
const keys = db.prepare("SELECT key FROM settings WHERE key LIKE 'provider.%.apiKey' AND value IS NOT NULL AND value != ''").all() as { key: string }[];
console.log(`Clés enregistrées : ${keys.map((k) => k.key.split(".")[1]).join(", ") || "aucune"}`);
