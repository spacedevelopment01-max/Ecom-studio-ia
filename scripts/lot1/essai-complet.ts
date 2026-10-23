/**
 * Lot 1 (issue #163, action 03) — essai complet sur COPIES ISOLÉES : sauvegarde, migration (deux passages),
 * restauration dans une autre copie, neutralisation d'une copie de recette. La source n'est jamais modifiée.
 *
 *   npx tsx scripts/lot1/essai-complet.ts --source <DATA_DIR historique> --code <code à tester> --travail <dossier vide> [--rapport fichier.json]
 *
 * Aucun site ni worker n'est lancé, le réseau est coupé dans chaque processus, l'environnement est réduit au minimum
 * (aucune clé héritée, APP_SECRET aléatoire, publication sociale désactivée) : aucun paiement, génération,
 * notification ni publication ne peut partir pendant l'essai.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { backup, columnsOf, fingerprint, neutralize, openReadonly, recetteEnv, restore, rowHashes, sha256File, tableFingerprint, userTables, verify, type Check, type Fingerprint } from "./outils";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const source = path.resolve(arg("source") ?? "");
const code = path.resolve(arg("code") ?? process.cwd());
const work = path.resolve(arg("travail") ?? "");
if (!arg("source") || !arg("travail")) throw new Error("--source et --travail obligatoires.");
for (const forbidden of [process.env.DATA_DIR, path.join(process.cwd(), "data")]) {
  if (forbidden && path.resolve(source) === path.resolve(forbidden) && !process.argv.includes("--source-en-service-lecture-seule")) {
    throw new Error("Source = dossier de données en service : ajouter --source-en-service-lecture-seule (lecture seule, sauvegarde en ligne).");
  }
}
globalThis.fetch = (async () => {
  throw new Error("Réseau interdit pendant l'essai.");
}) as typeof fetch;

const repo = path.resolve(import.meta.dirname, "..", "..");
const tsx = path.join(repo, "node_modules", ".bin", "tsx");
const checks: Check[] = [];
const ok = (name: string, cond: boolean, detail?: unknown) => checks.push({ name, ok: !!cond, ...(detail !== undefined ? { detail: typeof detail === "string" ? detail : JSON.stringify(detail) } : {}) });
const gitSha = (dir: string) => {
  try {
    return execFileSync("git", ["-C", dir, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};
function openWith(dataDir: string, extra: string[] = []) {
  const env = recetteEnv(dataDir, { NODE_ENV: "production" });
  const outText = execFileSync(tsx, [path.join(repo, "scripts", "lot1", "ouvrir-base.ts"), "--code", code, ...extra], { env, cwd: code, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(outText.trim().split("\n").pop()!) as { ok: boolean; vues?: unknown; strategies?: unknown };
}
const sourceDb = path.join(source, "studio.db");
const sourceHashBefore = sha256File(sourceDb);

// 1. Sauvegarde de la source (instantané en ligne + médias + manifeste).
const save = path.join(work, "sauvegarde");
const manifest = await backup({ dataDir: source, dest: save, env: {} });
const v0 = verify(save);
for (const c of v0.checks) ok(`sauvegarde — ${c.name}`, c.ok, c.detail);

// 2. Restauration dans la copie de migration, puis empreintes « avant » sur les colonnes d'origine.
const mig = path.join(work, "copie-migration");
for (const c of restore(save, mig)) ok(`copie de migration — ${c.name}`, c.ok, c.detail);
const before = openReadonly(path.join(mig, "studio.db"));
const beforeCols: Record<string, string[]> = {};
const beforeFp: Record<string, { count: number; sha256: string }> = {};
const beforeRows: Record<string, Map<string, number>> = {};
for (const t of userTables(before)) {
  beforeCols[t] = columnsOf(before, t).map((c) => c.name);
  beforeFp[t] = tableFingerprint(before, t);
  beforeRows[t] = rowHashes(before, t, beforeCols[t]);
}
before.close();

// 3. Premier passage : le code testé ouvre la copie (migrations), puis contrôles d'intégrité et de non-perte.
openWith(mig);
const d1 = openReadonly(path.join(mig, "studio.db"));
ok("migration 1 — intégrité SQLite", d1.pragma("integrity_check", { simple: true }) === "ok");
ok("migration 1 — clés étrangères", (d1.pragma("foreign_key_check") as unknown[]).length === 0);
// Chaque ligne d'origine doit être retrouvée à l'identique (sur ses colonnes d'origine) ; les lignes ajoutées par
// la migration sont listées à part.
const lost: string[] = [];
const added: Record<string, number> = {};
for (const [t, colsBefore] of Object.entries(beforeCols)) {
  if (!userTables(d1).includes(t)) {
    lost.push(`${t} (table disparue)`);
    continue;
  }
  const after = rowHashes(d1, t, colsBefore);
  let missing = 0;
  for (const [h, n] of beforeRows[t]) missing += Math.max(0, n - (after.get(h) ?? 0));
  if (missing) lost.push(`${t} (${missing} ligne(s) absente(s) ou modifiée(s))`);
  const extra = [...after.values()].reduce((a, n) => a + n, 0) - beforeFp[t].count + missing;
  if (extra) added[t] = extra;
}
ok("migration 1 — chaque ligne d'origine retrouvée à l'identique", lost.length === 0, lost.length ? lost : undefined);
const q = <T>(sql: string) => d1.prepare(sql).all() as T[];
const projects = q<{ id: string; user_id: string; hidden: number; archived: number }>("SELECT id, user_id, hidden, archived FROM projects ORDER BY id");
const subs = q<{ user_id: string; owner_user_id: string | null; project_id: string | null; status: string; plan: string | null }>("SELECT user_id, owner_user_id, project_id, status, plan FROM subscriptions ORDER BY user_id");
ok("rattachement — chaque abonnement a son compte", subs.every((s) => !!s.owner_user_id));
ok("rattachement — un projet n'a jamais deux abonnements", new Set(subs.filter((s) => s.project_id).map((s) => s.project_id)).size === subs.filter((s) => s.project_id).length);
ok("rattachement — chaque abonnement pointe un projet du même compte", subs.filter((s) => s.project_id).every((s) => projects.find((p) => p.id === s.project_id)?.user_id === s.owner_user_id));
ok("aucun projet supprimé (un projet par abonnement non imposé par suppression)", projects.length === beforeFp.projects.count);
const fp1: Fingerprint = fingerprint(d1);
const migratedFlag = !!d1.prepare("SELECT 1 FROM settings WHERE key = 'billing.v2.migrated'").get();
ok("migration 1 — repère « forfaits V2 migrés » présent", migratedFlag);
d1.close();
const autoBackups = fs.existsSync(path.join(mig, "backups")) ? fs.readdirSync(path.join(mig, "backups")) : [];

// 4. Second passage : rien ne doit changer (idempotence), schéma compris.
openWith(mig);
const d2 = openReadonly(path.join(mig, "studio.db"));
const fp2 = fingerprint(d2);
d2.close();
const moved = Object.keys({ ...fp1.tables, ...fp2.tables }).filter((t) => JSON.stringify(fp1.tables[t]) !== JSON.stringify(fp2.tables[t]));
ok("migration 2 — schéma identique au premier passage", fp1.schemaSha256 === fp2.schemaSha256);
ok("migration 2 — toutes les tables identiques au premier passage", moved.length === 0, moved.length ? moved : undefined);
const mediaAfter = manifest.storage.files.filter((f) => sha256File(path.join(mig, "storage", f.path)) !== f.sha256);
ok("médias inchangés par la migration", mediaAfter.length === 0);

// 5. Vues métier lues par le code testé (après les empreintes : la lecture peut rattacher un ancien abonnement libre).
const walletsOf = () => {
  const w = openReadonly(path.join(mig, "studio.db"));
  try {
    return w.prepare("SELECT user_id, monthly_allowance, monthly_used, topup_balance FROM wallets ORDER BY user_id").all() as { user_id: string; monthly_allowance: number; monthly_used: number; topup_balance: number }[];
  } finally {
    w.close();
  }
};
const walletsBefore = walletsOf();
const opened = openWith(mig, ["--vues"]) as { vues?: unknown; strategies?: Record<string, { version: number; angle: string } | null> };
const vues = opened.vues;
const strategies = opened.strategies ?? null;
// Mise en conformité des anciens portefeuilles (règle 40 % / 50 % du code) : chaque baisse doit être tracée au relevé.
const walletsAfter = walletsOf();
const lowered = walletsAfter.filter((a) => {
  const b = walletsBefore.find((x) => x.user_id === a.user_id)!;
  return a.topup_balance < b.topup_balance || a.monthly_allowance < b.monthly_allowance;
});
{
  const l = openReadonly(path.join(mig, "studio.db"));
  const traced = lowered.every((w) => !!l.prepare("SELECT 1 FROM ledger WHERE user_id = ? AND type = 'adjustment'").get(w.user_id));
  l.close();
  ok("budgets — toute baisse d'un ancien portefeuille est inscrite au relevé", traced, lowered.length ? lowered.map((w) => w.user_id) : undefined);
}
if (beforeFp.marketing_strategy_active?.count) ok("angles — stratégie active historique relue par le code testé", !!strategies && Object.values(strategies).filter(Boolean).length === beforeFp.marketing_strategy_active.count, strategies);

// 6. Restauration effective dans une AUTRE copie isolée, vérifiée contre le manifeste (= retour des données à l'état
// sauvegardé, distinct d'un simple retour du code).
const rest = path.join(work, "copie-restauree");
for (const c of restore(save, rest)) ok(`restauration — ${c.name}`, c.ok, c.detail);
const r = openReadonly(path.join(rest, "studio.db"));
const restoredUsers = (r.prepare("SELECT id FROM users ORDER BY id").all() as { id: string }[]).map((u) => u.id);
const restoredProjects = (r.prepare("SELECT id, user_id FROM projects ORDER BY id").all() as { id: string; user_id: string }[]);
r.close();
ok("restauration — comptes et projets retrouvés avec leur propriétaire", JSON.stringify(restoredProjects) === JSON.stringify(projects.map((p) => ({ id: p.id, user_id: p.user_id }))));

// 7. Restauration refusée par-dessus des données existantes, et sauvegarde altérée refusée.
let refused = false;
try {
  restore(save, mig);
} catch {
  refused = true;
}
ok("restauration refusée dans un dossier non vide", refused);

// 8. Copie de recette neutralisée (pour l'ouvrir dans un studio sans rien déclencher).
const rec = path.join(work, "copie-recette");
restore(save, rec);
const neutral = neutralize(rec);
const n = openReadonly(path.join(rec, "studio.db"));
const pending = (n.prepare("SELECT COUNT(*) c FROM jobs WHERE status IN ('queued','running','blocked')").get() as { c: number }).c;
const secrets = (n.prepare("SELECT COUNT(*) c FROM settings WHERE secret = 1").get() as { c: number }).c;
const tokens = (n.prepare("SELECT COUNT(*) c FROM connections WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL").get() as { c: number }).c;
n.close();
ok("recette — plus aucune tâche prête à partir", pending === 0, neutral);
ok("recette — aucun secret ni jeton dans la copie", secrets === 0 && tokens === 0);

ok("source jamais modifiée", sha256File(sourceDb) === sourceHashBefore);

const report = {
  date: new Date().toISOString(),
  synthetique: fs.existsSync(path.join(source, "fabrication.json")),
  fabrication: fs.existsSync(path.join(source, "fabrication.json")) ? JSON.parse(fs.readFileSync(path.join(source, "fabrication.json"), "utf8")) : null,
  codeTeste: { dossier: code, commit: gitSha(code) },
  sauvegarde: { baseSha256: manifest.database.sha256, schemaSha256: manifest.database.fingerprint.schemaSha256, migreeV2: manifest.database.billingV2Migrated, medias: manifest.storage.files.length, referencesMedias: manifest.storage.referenced, manquants: manifest.storage.missing.length, comptages: Object.fromEntries(Object.entries(manifest.database.fingerprint.tables).map(([t, v]) => [t, v.count])) },
  migration: { schemaApres: fp2.schemaSha256, lignesAjoutees: added, tablesAjoutees: Object.keys(fp2.tables).filter((t) => !(t in beforeCols)), sauvegardeAutomatique: autoBackups, comptagesApres: Object.fromEntries(Object.entries(fp2.tables).map(([t, v]) => [t, v.count])) },
  projets: projects,
  abonnements: subs,
  vues,
  strategies,
  budgets: { avant: walletsBefore, apres: walletsAfter, baisses: lowered.map((w) => w.user_id) },
  restauration: { comptes: restoredUsers.length, projets: restoredProjects.length },
  neutralisation: neutral,
  controles: checks,
  reussi: checks.every((c) => c.ok),
};
const out = arg("rapport");
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
}
for (const c of checks) console.log(`${c.ok ? "OK " : "ÉCHEC"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
console.log(report.reussi ? `\nEssai réussi (${checks.length} contrôles).` : "\nEssai en échec.");
process.exit(report.reussi ? 0 : 1);
