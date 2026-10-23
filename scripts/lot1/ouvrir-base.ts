/**
 * Lot 1 — ouvre une COPIE de données avec le code d'une version donnée (ce qui exécute ses migrations), puis lit
 * quelques vues métier (abonnements et forfait de chaque projet). Lancé par `essai-complet.ts` dans un processus à part,
 * avec un environnement minimal : aucun site, aucun worker, aucun réseau.
 *
 *   DATA_DIR=/copie npx tsx scripts/lot1/ouvrir-base.ts --code /chemin/du/code [--vues]
 */
import path from "node:path";

const i = process.argv.indexOf("--code");
const code = path.resolve(i > 0 ? process.argv[i + 1] : process.cwd());
if (!process.env.DATA_DIR) throw new Error("DATA_DIR (copie isolée) obligatoire.");
globalThis.fetch = (async () => {
  throw new Error("Réseau interdit : copie d'essai.");
}) as typeof fetch;

const { db, all } = (await import(path.join(code, "src/lib/db.ts"))) as { db: () => import("better-sqlite3").Database; all: <T>(sql: string, ...p: unknown[]) => T[] };
const d = db();
const out: Record<string, unknown> = { code, ok: true };
if (process.argv.includes("--vues")) {
  // Lecture comme le ferait le studio : la première lecture rattache un ancien abonnement encore libre (règle du code).
  const billing = (await import(path.join(code, "src/lib/project-billing.ts"))) as {
    projectPlan: (id: string) => string | null;
    subscriptionsOf: (userId: string) => { user_id: string; project_id: string | null; plan: string | null; status: string }[];
  };
  const users = all<{ id: string }>("SELECT id FROM users ORDER BY id");
  out.vues = users.map((u) => ({
    user: u.id,
    projetsVisibles: all<{ id: string }>("SELECT id FROM projects WHERE user_id = ? AND hidden = 0 ORDER BY id", u.id).map((p) => p.id),
    projetsMasques: all<{ id: string }>("SELECT id FROM projects WHERE user_id = ? AND hidden = 1 ORDER BY id", u.id).map((p) => p.id),
    forfaits: Object.fromEntries(all<{ id: string }>("SELECT id FROM projects WHERE user_id = ? ORDER BY id", u.id).map((p) => [p.id, billing.projectPlan(p.id)])),
    abonnements: billing.subscriptionsOf(u.id).map((s) => ({ projet: s.project_id, forfait: s.plan, statut: s.status })),
  }));
  // Budgets : première lecture par le code testé (elle applique la mise en conformité des anciens portefeuilles).
  const { balance } = (await import(path.join(code, "src/lib/billing.ts"))) as { balance: (key: string) => { available: number; topupBalance: number } };
  out.budgets = Object.fromEntries(all<{ user_id: string }>("SELECT user_id FROM wallets ORDER BY user_id").map((w) => [w.user_id, balance(w.user_id)]));
  // Angles marketing : stratégie active relue par le code testé (seulement si cette version les connaît).
  const strategy = path.join(code, "src/lib/marketing-strategy/index.ts");
  const fs = await import("node:fs");
  if (fs.existsSync(strategy)) {
    const m = (await import(strategy)) as { activeStrategy: (id: string) => { version: number; angleId: string } | null };
    out.strategies = Object.fromEntries(all<{ id: string }>("SELECT id FROM projects ORDER BY id").map((p) => {
      const s = m.activeStrategy(p.id);
      return [p.id, s ? { version: s.version, angle: s.angleId } : null];
    }));
  }
}
d.pragma("wal_checkpoint(TRUNCATE)");
d.close();
console.log(JSON.stringify(out));
