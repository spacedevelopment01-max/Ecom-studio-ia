/**
 * Diagnostic de l'IA (lecture seule, aucune clé, aucun prompt complet affiché) : coût et utilité de chaque appel,
 * par projet, tâche de fond, étape, module et modèle ; suivi des candidats (notes par tentative, gain de qualité,
 * coût des reprises) ; appels rejetés, dupliqués, reprises ; coût des candidats FINAL / PROVISIONAL / REJECTED ;
 * statut du SEO envoyé à Shopify (non vérifié).
 *
 *   npx tsx scripts/diagnostic-ia.ts                     dernier projet modifié
 *   npx tsx scripts/diagnostic-ia.ts <projectId>         projet précis (identifiant dans l'adresse /studio/<id>/…)
 *   npx tsx scripts/diagnostic-ia.ts <projectId> --job <jobId>   une tâche de fond précise
 *   npx tsx scripts/diagnostic-ia.ts --all               tous les projets
 *   npx tsx scripts/diagnostic-ia.ts … --json            sortie JSON (même contenu que /api/admin/ai-calls)
 */
import "../worker/env";
import { all, one } from "../src/lib/db";
import { aiDiagnostic } from "../src/lib/ai/diagnostic";
import { redact } from "../src/lib/redact";

const args = process.argv.slice(2);
const flag = (k: string) => args.includes(k);
const opt = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
const positional = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--job")[0];
const eur = (micro: number) => `${(micro / 1e6).toFixed(3)} €`;
const time = (ms: number) => new Date(ms).toLocaleString("fr-FR");

const p = flag("--all")
  ? null
  : one<{ id: string; name: string; business: string }>(
      positional ? "SELECT id, name, business_type AS business FROM projects WHERE id = ?" : "SELECT id, name, business_type AS business FROM projects ORDER BY updated_at DESC LIMIT 1",
      ...(positional ? [positional] : []),
    );
if (!flag("--all") && !p) {
  console.log("Aucun projet trouvé.");
  process.exit(1);
}
const d = aiDiagnostic({ projectId: p?.id, jobId: opt("--job") });
if (flag("--json")) {
  console.log(JSON.stringify(d, null, 2));
  process.exit(0);
}

console.log(p ? `\n=== Projet « ${p.name} » (${p.id}, ${p.business}) ===` : "\n=== Tous les projets ===");
console.log(`Appels : ${d.totals.calls} — coût fournisseur ${eur(d.totals.costMicro)} — facturé ${eur(d.totals.billedCostMicro)} — en erreur ${d.totals.errors}`);

console.log("\n--- Utilité des appels ---");
for (const [k, v] of Object.entries(d.outcomes)) if (v.calls) console.log(`• ${k.padEnd(11)} ${String(v.calls).padStart(4)} appel(s)  ${eur(v.costMicro)}`);

console.log("\n--- Coût des candidats par verdict final ---");
for (const [k, v] of Object.entries(d.costByVerdict)) if (v.candidates) console.log(`• ${k.padEnd(11)} ${String(v.candidates).padStart(4)} candidat(s)  ${eur(v.costMicro)}`);

console.log("\n--- Reprises et doublons ---");
console.log(`• Reprises de candidats : ${d.retries.candidateRetries.calls} appel(s), ${eur(d.retries.candidateRetries.costMicro)} — note améliorée : ${d.retries.improved}, non améliorée : ${d.retries.notImproved}`);
console.log(`• Nouveaux essais techniques (réponse coupée, JSON) : ${d.retries.technicalRetries.calls}, ${eur(d.retries.technicalRetries.costMicro)} — relances HTTP : ${d.retries.httpRetries}`);
console.log(`• Rejeux non refacturés : ${d.duplicates.replaysNotBilled.calls} (${eur(d.duplicates.replaysNotBilled.costMicro)}) — appels identiques : ${d.duplicates.identicalCalls.calls} (${eur(d.duplicates.identicalCalls.costMicro)})`);

const table = (title: string, rows: typeof d.byTask) => {
  if (!rows.length) return;
  console.log(`\n--- ${title} ---`);
  for (const r of rows.slice(0, 25))
    console.log(`• ${r.key.slice(0, 60).padEnd(60)} ${String(r.calls).padStart(4)} appel(s)  ${eur(r.costMicro)}  jetons ${r.inputTokens}+${r.outputTokens} (cache lu ${r.cacheReadTokens}${r.cacheHitRate != null ? `, ${Math.round(r.cacheHitRate * 100)} %` : ""})  ${r.avgLatencyMs ?? "?"} ms  HTTP ${r.httpAttempts}${r.errors ? `  erreurs ${r.errors}` : ""}`);
};
if (!p) table("Par projet", d.byProject);
table("Par tâche de fond", d.byJob);
table("Par module", d.byModule);
table("Par étape", d.byStep);
table("Par tâche IA", d.byTask);
table("Par fournisseur / modèle demandé", d.byProviderModel);
table("Par modèle réellement servi", d.byServedModel);
table("Par portée du Project Brain", d.byBrainScope);
table("Par version du Project Brain", d.byBrainVersion);

if (d.candidates.length) {
  console.log("\n--- Candidats (notes par tentative, gain de qualité, coût) ---");
  for (const c of d.candidates.slice(0, 40)) {
    console.log(`• ${c.candidateId} [${c.deliverable ?? "?"}] → ${c.finalVerdict ?? "non contrôlé"} — total ${eur(c.totalCostMicro)}${c.retryCostMicro ? `, reprises ${eur(c.retryCostMicro)}` : ""}${c.qualityGain != null ? ` — qualité ${c.qualityBefore} → ${c.qualityAfter} (${c.qualityGain >= 0 ? "+" : ""}${c.qualityGain})` : ""}`);
    for (const a of c.attempts) console.log(`    essai ${a.attempt} : note ${a.score ?? "—"} ${a.verdict ?? ""} (${a.checker ?? "?"}) ${eur(a.costMicro)}${a.qualityDelta != null ? ` Δ ${a.qualityDelta}` : ""}${a.feedback ? ` — ${a.feedback.slice(0, 120)}` : ""}`);
  }
}

if (d.shopifySeo.details.length) {
  console.log(`\n--- SEO envoyé à Shopify (mécanisme NON VÉRIFIÉ : ${d.shopifySeo.mechanism}) ---`);
  console.log(`accepté ${d.shopifySeo.counts.accepted} — envoyé sans confirmation ${d.shopifySeo.counts.sent} — refusé ${d.shopifySeo.counts.refused} — inconnu ${d.shopifySeo.counts.unknown}`);
  for (const s of d.shopifySeo.details.slice(0, 20)) console.log(`• ${s.product} : ${s.status}${s.detail ? ` — ${s.detail}` : ""}`);
}

if (p) {
  console.log("\n--- Tâches de fond récentes ---");
  const jobs = all<{ type: string; status: string; progress: number; message: string; error: string | null; updated_at: number }>("SELECT type, status, progress, message, error, updated_at FROM jobs WHERE project_id = ? ORDER BY created_at DESC LIMIT 12", p.id);
  for (const j of jobs) console.log(redact(`• ${j.type} — ${j.status} ${Math.round(j.progress * 100)} % — ${time(j.updated_at)} — ${j.error ?? j.message ?? ""}`).slice(0, 300));
}

console.log("\n--- Fournisseurs (sans les clés) ---");
const settings = all<{ key: string; value: string }>("SELECT key, value FROM settings WHERE key LIKE 'provider.%' AND secret = 0");
for (const s of settings) console.log(`• ${s.key} = ${redact(String(s.value)).slice(0, 80)}`);
const keys = all<{ key: string }>("SELECT key FROM settings WHERE key LIKE 'provider.%' AND secret = 1");
console.log(`Clés enregistrées (chiffrées, jamais affichées) : ${keys.map((k) => k.key).join(", ") || "aucune"}`);
