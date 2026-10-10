/**
 * Diagnostic des dernières créations de logos (Logo V2) d'un projet — LECTURE SEULE, aucun appel d'IA, gratuit.
 *   npx tsx scripts/logo-run-debug.ts "Sébastien Blanc"
 * Affiche, pour les 3 dernières tâches « Logo : directions créatives » / « nouvelle version » :
 *  - l'action déclenchée, l'état de la tâche (terminée, échouée, en file…), son erreur ;
 *  - les étapes réellement passées (points de reprise : directions, images, relectures, enregistrement) ;
 *  - l'avancement direction par direction et la raison de chaque échec ;
 *  - les appels aux fournisseurs (OpenAI, Gemini, Anthropic…) : statut, modèle, coût, réservation ;
 *  - les propositions enregistrées (validées, écartées) et l'image originale ;
 *  - les erreurs journalisées par le worker.
 * Aucune clé n'est lue ni affichée.
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const query = process.argv[2];
if (!query) {
  console.error('Usage : npx tsx scripts/logo-run-debug.ts "Nom du projet"');
  process.exit(1);
}
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_FILE = process.env.DATABASE_FILE || path.join(DATA_DIR, "studio.db");
if (!fs.existsSync(DB_FILE)) {
  console.error(`Base introuvable : ${DB_FILE} (lancez le script depuis le dossier du studio, ou réglez DATA_DIR).`);
  process.exit(1);
}
const db = new Database(DB_FILE, { readonly: true, fileMustExist: true });
const json = <T,>(s: string | null | undefined, d: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : d;
  } catch {
    return d;
  }
};
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const eur = (micro: number) => `${(micro / 1e6).toFixed(3)} €`;
const when = (t: number | null) => (t ? new Date(t).toLocaleString("fr-FR") : "—");
/** Masque tout ce qui ressemble à une clé (sk-…, AIza…, Bearer …). */
const redact = (s: string) => s.replace(/(sk-[A-Za-z0-9_-]{6})[A-Za-z0-9_-]+/g, "$1…").replace(/AIza[0-9A-Za-z_-]{10,}/g, "AIza…").replace(/Bearer\s+\S+/g, "Bearer …");

type P = { id: string; name: string; brand_json: string | null };
const q = slug(query);
const projects = (db.prepare("SELECT id, name, brand_json FROM projects").all() as P[]).filter((p) => p.id === query || slug(p.name).includes(q) || slug(json<{ name?: string }>(p.brand_json, {}).name ?? "").includes(q));
if (!projects.length) {
  console.error(`Aucun projet ne correspond à « ${query} ».`);
  process.exit(1);
}
for (const p of projects) {
  console.log(`\n================ Projet « ${p.name} » (${p.id}) ================`);
  const jobs = db.prepare("SELECT * FROM jobs WHERE project_id = ? AND type IN ('brand.logo.v2','brand.logo.v2.redraw','brand.fulllogo') ORDER BY created_at DESC LIMIT 3").all(p.id) as any[];
  if (!jobs.length) console.log("Aucune tâche de logo enregistrée : le bouton « Créer les directions » n'a lancé aucune tâche.");
  for (const j of jobs) {
    const payload = json<Record<string, unknown>>(j.payload, {});
    const cp = json<Record<string, unknown>>(j.checkpoint, {});
    console.log(`\n--- Tâche ${j.type} ${j.id} — lancée le ${when(j.created_at)}`);
    console.log(`État : ${j.status} · avancement ${Math.round((j.progress ?? 0) * 100)} % · dernier message : ${j.message || "—"} · essais : ${j.attempts}/${j.max_attempts}`);
    console.log(`Demande : style ${payload.style ?? "auto"} · plafond ${typeof payload.costCapMicro === "number" ? eur(payload.costCapMicro) : "aucun"}`);
    if (j.error) console.log(`ERREUR DE LA TÂCHE : ${redact(String(j.error)).slice(0, 1500)}`);
    const keys = Object.keys(cp);
    console.log(`Étapes passées (${keys.length}) : ${keys.map((k) => (typeof cp[k] === "string" && (cp[k] as string).length > 200 ? `${k} [image ${Math.round((cp[k] as string).length * 0.75 / 1024)} Ko]` : k)).join(", ") || "aucune"}`);
    const calls = db.prepare("SELECT created_at, task, step, provider, requested_model, served_model, status, error_kind, cost, estimated FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid").all(j.id) as any[];
    console.log(`Appels aux fournisseurs : ${calls.length}${calls.length ? ` (coût tracé ${eur(calls.reduce((s, c) => s + (c.cost ?? 0), 0))})` : " — aucun appel n'est parti"}`);
    for (const c of calls) console.log(`  · ${when(c.created_at)} ${c.task} ${c.provider}:${c.served_model ?? c.requested_model} → ${c.status}${c.error_kind ? ` (${c.error_kind})` : ""} · ${eur(c.cost ?? 0)}${c.estimated ? " estimé" : ""} · étape ${c.step ?? "—"}`);
    const res = db.prepare("SELECT status, task, provider, model, amount, actual FROM ai_reservations WHERE job_id = ? ORDER BY created_at, rowid").all(j.id) as any[];
    if (res.length) console.log(`Réservations : ${res.map((r) => `${r.task ?? ""} ${r.provider ?? ""}:${r.model ?? ""} ${r.status} (max ${eur(r.amount)}${r.actual != null ? `, réel ${eur(r.actual)}` : ""})`).join(" ; ")}`);
    const assets = db.prepare("SELECT id, role, status, name, meta FROM assets WHERE project_id = ? AND json_extract(meta, '$.run') = ? AND deleted_at IS NULL ORDER BY created_at").all(p.id, j.id) as any[];
    console.log(`Propositions enregistrées : ${assets.length}`);
    for (const a of assets) {
      const m = json<any>(a.meta, {});
      console.log(`  · ${a.role} ${a.id} — ${m.territory?.name ?? ""} [${m.territory?.style ?? ""}] verdict ${m.gate?.verdict ?? "—"} ${m.gate?.score ?? ""} ${m.artwork ? "(image originale de l'IA)" : "(construit)"} — ${m.gate?.reason ?? ""}`);
    }
    const errs = db.prepare("SELECT created_at, scope, message FROM error_log WHERE project_id = ? AND created_at BETWEEN ? AND ? ORDER BY created_at").all(p.id, j.created_at - 1000, (j.updated_at ?? j.created_at) + 60_000) as any[];
    for (const e of errs) console.log(`  ! ${when(e.created_at)} ${e.scope} : ${redact(String(e.message)).slice(0, 600)}`);
  }
  const live = json<any>((db.prepare("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_live'").get(p.id) as any)?.value, null);
  if (live) {
    console.log(`\nAvancement enregistré (tâche ${live.jobId}) : étape ${live.stage}${live.error ? ` — ERREUR : ${redact(live.error)}` : ""} · modèle d'images : ${live.art ?? "aucun (logos construits)"}`);
    for (const d of live.directions ?? []) console.log(`  · ${d.name} [${d.style ?? ""}] → ${d.status}${d.verdict ? ` ${d.verdict} ${d.score ?? ""}` : ""}${d.reason ? ` — ${redact(d.reason)}` : ""}`);
  }
  const run = json<any>((db.prepare("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'").get(p.id) as any)?.value, null);
  if (run) {
    console.log(`\nSérie affichée dans l'onglet Marque : tâche ${run.runId} du ${when(run.at)} · ${run.shown?.length ?? 0} validée(s), ${run.discarded?.length ?? 0} écartée(s), ${run.failures?.length ?? 0} sans image`);
    for (const n of run.notes ?? []) console.log(`  note : ${redact(n)}`);
  } else console.log("\nAucune série Logo V2 enregistrée pour ce projet.");
}
