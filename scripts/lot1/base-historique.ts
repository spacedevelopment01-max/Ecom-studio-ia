/**
 * Lot 1 (issue #163, action 03) — fabrique une base HISTORIQUE SYNTHÉTIQUE avec le code d'une ancienne version.
 *
 *   git worktree add --detach /chemin/ancienne <commit>
 *   npx tsx scripts/lot1/base-historique.ts --code /chemin/ancienne --out /dossier/vide
 *
 * Le schéma est créé par le `src/lib/db.ts` de l'ancienne version (exactement celui qu'un studio de cette époque
 * aurait créé), puis rempli par des requêtes SQL génériques : seules les colonnes qui existent à cette époque sont
 * remplies. Aucune donnée réelle, aucun réseau, aucun site ni worker lancé. Les adresses sont en `.invalid`.
 *
 * Compte représentatif : plusieurs projets (produit unique, catalogue, services, archivé), ancien abonnement payé,
 * portefeuille, recharges et anciens packs, paiements, médias avec fichiers et miniatures, versions de thème,
 * tâches dans tous les états, calendrier et publications (programmées, publiées), mémoire, et — si l'époque les
 * connaît — angles marketing et historique de stratégie.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const code = path.resolve(arg("code") ?? process.cwd());
const out = path.resolve(arg("out") ?? "");
if (!arg("out")) throw new Error("--out <dossier vide> obligatoire");
if (fs.existsSync(out) && fs.readdirSync(out).length) throw new Error(`${out} n'est pas vide.`);
fs.mkdirSync(out, { recursive: true });
process.env.DATA_DIR = out;
delete process.env.DATABASE_FILE;
delete process.env.STORAGE_DIR;
process.env.VITEST = "1"; // l'ancienne migration ne crée pas sa propre sauvegarde dans ce dossier de fabrication
globalThis.fetch = (async () => {
  throw new Error("Réseau interdit pendant la fabrication de la base historique.");
}) as typeof fetch;

const mod = (await import(path.join(code, "src/lib/db.ts"))) as { db: () => import("better-sqlite3").Database };
const d = mod.db();

const T0 = Date.UTC(2026, 8, 15, 9, 0, 0); // 15 septembre 2026
const day = 86_400_000;
const tables = new Set((d.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]).map((r) => r.name));
type Col = { name: string; type: string; notnull: number; dflt_value: string | null; pk: number };
const cols = (t: string) => d.prepare(`PRAGMA table_info(${t})`).all() as Col[];
const inserted: Record<string, number> = {};

/** Insère une ligne avec les seules colonnes de cette époque ; les colonnes obligatoires sans défaut sont complétées. */
function put(table: string, values: Record<string, unknown>) {
  if (!tables.has(table)) return false;
  const c = cols(table);
  const row: Record<string, unknown> = {};
  for (const col of c) {
    if (col.name in values) row[col.name] = values[col.name];
    else if (col.notnull && col.dflt_value == null && !col.pk) row[col.name] = /INT|REAL/i.test(col.type) ? 0 : /created_at|updated_at/.test(col.name) ? T0 : "";
  }
  const names = Object.keys(row);
  const v = names.map((n) => {
    const x = row[n];
    return x !== null && typeof x === "object" ? JSON.stringify(x) : typeof x === "boolean" ? Number(x) : x;
  });
  d.prepare(`INSERT INTO ${table} (${names.join(",")}) VALUES (${names.map(() => "?").join(",")})`).run(...v);
  inserted[table] = (inserted[table] ?? 0) + 1;
  return true;
}
const storage = path.join(out, "storage");
/** Fichier média déterministe (contenu synthétique), rangé comme le ferait `putFile`. */
function file(key: string, seed: string, size = 2048) {
  const p = path.join(storage, key);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  let buf = Buffer.alloc(0);
  for (let i = 0; buf.length < size; i++) buf = Buffer.concat([buf, crypto.createHash("sha256").update(`${seed}:${i}`).digest()]);
  fs.writeFileSync(p, buf.subarray(0, size));
  return size;
}

const users = [
  { id: "u-historique-a", email: "client-historique-a@exemple.invalid", name: "Client historique A", role: "client" },
  { id: "u-historique-b", email: "client-historique-b@exemple.invalid", name: "Client historique B", role: "client" },
  { id: "u-decouverte-c", email: "decouverte-c@exemple.invalid", name: "Ancienne découverte C", role: "client" },
  { id: "u-admin", email: "admin-synthetique@exemple.invalid", name: "Administrateur synthétique", role: "admin" },
];
const projects = [
  { id: "p-a-mono", user_id: "u-historique-a", name: "Lampe synthétique", store_type: "mono", business_type: "products", archived: 0, at: 0 },
  { id: "p-a-catalogue", user_id: "u-historique-a", name: "Catalogue synthétique", store_type: "multi", business_type: "products", archived: 0, at: 3 },
  { id: "p-a-services", user_id: "u-historique-a", name: "Atelier synthétique", store_type: "mono", business_type: "services", archived: 0, at: 6 },
  { id: "p-a-archive", user_id: "u-historique-a", name: "Ancien essai archivé", store_type: "mono", business_type: "products", archived: 1, at: 1 },
  { id: "p-b-unique", user_id: "u-historique-b", name: "Sac synthétique", store_type: "mono", business_type: "products", archived: 0, at: 2 },
  { id: "p-c-decouverte", user_id: "u-decouverte-c", name: "Essai découverte", store_type: "mono", business_type: "products", archived: 0, at: 4 },
];

d.transaction(() => {
  for (const u of users) put("users", { ...u, password_hash: "$2a$10$synthetiquesynthetiquesynthetiquesynthetiqu", timezone: "Europe/Paris", created_at: T0 - 20 * day });
  for (const p of projects) {
    put("projects", {
      id: p.id, user_id: p.user_id, name: p.name, status: "ready", platform: "shopify", sector: "maison",
      product_json: { title: p.name, price: "[À compléter : prix]" }, brand_json: { name: p.name, palette: ["#14213d", "#fca311"] },
      strategy_json: { angle: "historique" }, settings_json: { lang: "fr" }, sources_json: [],
      store_type: p.store_type, business_type: p.business_type, catalog_json: p.store_type === "multi" ? [{ id: "x1" }, { id: "x2" }] : [],
      business_json: p.business_type === "services" ? { services: [{ name: "Prestation synthétique" }] } : {},
      archived: p.archived, created_at: T0 + p.at * day, updated_at: T0 + (p.at + 1) * day,
    });
    put("memory", { id: `m-${p.id}`, project_id: p.id, kind: "correction", key: "vocabulaire", value: "dire « lampe », jamais « luminaire »", status: "confirmed", source: "user", scope: "all", created_at: T0, updated_at: T0 });
    put("folders", { id: `f-${p.id}`, project_id: p.id, parent_id: null, name: "Médias", system_key: "media", created_at: T0 });
    for (const [i, role] of ["original", "packshot", "logo"].entries()) {
      const key = `${p.id}/${role}-${i}.webp`;
      const thumb = `${p.id}/thumb-${role}-${i}.webp`;
      const size = file(key, key, 4096 + i * 512);
      file(thumb, thumb, 512);
      put("assets", { id: `a-${p.id}-${i}`, project_id: p.id, user_id: p.user_id, folder_id: `f-${p.id}`, name: `${role}.webp`, kind: role === "logo" ? "logo" : "image", role, mime: "image/webp", size, width: 1024, height: 1024, storage_key: key, thumb_key: thumb, origin: i === 0 ? "upload" : "generated", meta: {}, version: 1, status: "approved", created_at: T0 + i * 3600_000 });
    }
    put("asset_usages", { asset_id: `a-${p.id}-1`, target_type: "theme_section", target_id: "hero", label: "Ouverture", created_at: T0 });
    for (const v of [1, 2]) put("theme_versions", { id: `tv-${p.id}-${v}`, project_id: p.id, number: v, spec: { direction: "orbe", sections: v * 4 }, summary: v === 1 ? "Création" : "Retouche du client", author: v === 1 ? "pipeline" : "user", parent_id: v === 2 ? `tv-${p.id}-1` : null, created_at: T0 + v * day });
    if (tables.has("projects")) d.prepare("UPDATE projects SET current_theme_version_id = ?, cover_asset_id = ? WHERE id = ?").run(`tv-${p.id}-2`, `a-${p.id}-1`, p.id);
    put("chat_messages", { id: `c-${p.id}`, project_id: p.id, thread: "shop", role: "user", content: "Mets le bouton en bleu nuit.", attachments: [], theme_version_id: `tv-${p.id}-2`, created_at: T0 + day });
  }
  const v2 = tables.has("subscriptions") && cols("subscriptions").some((c) => c.name === "project_id");
  if (v2) {
    // Époque « un abonnement = un projet » : le compte A a deux abonnements (deux projets financés), son catalogue
    // n'en a pas (projet historique conservé, sans droits payants) ; le compte B en a un.
    const subs = [
      { key: "s-a-mono", owner: "u-historique-a", project: "p-a-mono", plan: "vendre", billing: "month", price: 8900 },
      { key: "s-a-services", owner: "u-historique-a", project: "p-a-services", plan: "creer", billing: "month", price: 4900 },
      { key: "s-b-unique", owner: "u-historique-b", project: "p-b-unique", plan: "dominer", billing: "year", price: 129000 },
    ];
    for (const x of subs) put("subscriptions", { user_id: x.key, owner_user_id: x.owner, project_id: x.project, bound_at: T0, plan: x.plan, billing: x.billing, status: "active", stores: 1, source: "stripe", price_cents: x.price, stripe_customer_id: `cus_${x.key}`, stripe_subscription_id: `sub_${x.key}`, current_period_start: T0, current_period_end: T0 + 30 * day, created_at: T0, updated_at: T0 });
  }
  // Ancien abonnement du compte A (avant « un abonnement = un projet ») : clé = id du client, payé, Développer mensuel.
  if (!v2) put("subscriptions", { user_id: "u-historique-a", plan: "vendre", billing: "month", status: "active", stores: 3, stripe_customer_id: "cus_synthetique_a", stripe_subscription_id: "sub_synthetique_a", current_period_start: T0, current_period_end: T0 + 30 * day, updated_at: T0 });
  if (!v2) put("subscriptions", { user_id: "u-historique-b", plan: "dominer", billing: "year", status: "active", stores: 1, stripe_customer_id: "cus_synthetique_b", stripe_subscription_id: "sub_synthetique_b", current_period_start: T0, current_period_end: T0 + 365 * day, updated_at: T0 });
  for (const u of ["u-historique-a", "u-historique-b"]) {
    put("wallets", { user_id: u, period_start: T0, period_end: T0 + 30 * day, monthly_allowance: 2_000_000, monthly_used: 500_000, topup_balance: u === "u-historique-a" ? 500_000 : 3_000_000, topup_period_added: u === "u-historique-a" ? 500_000 : 3_000_000, topup_period_used: 0, updated_at: T0 });
    put("ledger", { id: `l-${u}-1`, user_id: u, type: "grant", bucket: "monthly", amount: 2_000_000, ref: `sub-${u}`, note: "Budget IA du mois", created_at: T0 });
    put("ledger", { id: `l-${u}-2`, user_id: u, type: "usage", bucket: "monthly", amount: -500_000, ref: `job-${u}`, note: "Image IA", created_at: T0 + day });
    put("quota_usage", { user_id: u, period_start: T0, key: "blog", included: 5, rollover: 0, used: 2 });
  }
  // Compte B : ancien budget hors forfait offert (aucun paiement de recharge ni de pack ne le justifie).
  put("ledger", { id: "l-b-offert", user_id: "u-historique-b", type: "grant", bucket: "topup", amount: 3_000_000, ref: null, note: "Ancien budget de création offert", created_at: T0 });
  put("ledger", { id: "l-a-recharge", user_id: "u-historique-a", type: "topup", bucket: "topup", amount: 500_000, ref: "pi_synthetique_recharge", note: "Recharge IA 10 €", created_at: T0 + 2 * day });
  put("pack_balances", { user_id: "u-historique-a", key: "visuals", balance: 12 });
  put("pack_purchases", { id: "pp-a-visuels", user_id: "u-historique-a", pack: "visuals", ref: "cs_synthetique_pack", created_at: T0 + 2 * day });
  for (const [i, kind] of ["subscription", "topup", "pack"].entries()) put("payments", { id: `pay-a-${i}`, user_id: "u-historique-a", kind, amount_cents: [8900, 1000, 1490][i], status: "paid", stripe_id: `cs_synthetique_${i}`, label: kind, created_at: T0 + i * day });
  put("payments", { id: "pay-b-0", user_id: "u-historique-b", kind: "subscription", amount_cents: 129000, status: "paid", stripe_id: "cs_synthetique_b", label: "subscription", created_at: T0 });
  // Tâches : terminée, en file, en cours (bail), en pause, échouée.
  for (const [i, status] of ["done", "queued", "running", "paused", "failed"].entries()) {
    put("jobs", { id: `j-a-${status}`, user_id: "u-historique-a", project_id: "p-a-mono", type: i === 1 ? "social.publish" : "pipeline.run", label: `Tâche ${status}`, payload: {}, status, progress: status === "done" ? 1 : 0.4, message: "", attempts: i, max_attempts: 3, run_at: T0 + i * 3600_000, locked_by: status === "running" ? "worker-historique" : null, locked_until: status === "running" ? T0 + 3600_000 : null, idempotency_key: `idem-${status}`, depends_on: [], checkpoint: {}, created_at: T0, updated_at: T0 + i * 60_000, finished_at: status === "done" ? T0 + 7200_000 : null });
  }
  // Calendrier : une publication programmée (à ne jamais publier pendant les essais), une publiée, un brouillon.
  put("content_plans", { id: "cp-a", project_id: "p-a-mono", params: { days: 30 }, strategy: "historique", status: "ready", job_id: "j-a-done", created_at: T0 });
  for (const [i, status] of ["scheduled", "published", "draft"].entries()) {
    put("posts", { id: `post-a-${status}`, project_id: "p-a-mono", plan_id: "cp-a", connection_id: "conn-a-instagram", network: "instagram", format: "image", status, scheduled_at: T0 + (40 + i) * day, timezone: "Europe/Paris", title: `Publication ${status}`, caption: `Publication synthétique ${status}`, hashtags: [], media: [`a-p-a-mono-1`], brief: {}, auto_approved: 0, publish_key: `pk-${status}`, attempts: 0, published_at: status === "published" ? T0 + 41 * day : null, created_at: T0, updated_at: T0 });
  }
  put("connections", { id: "conn-a-instagram", user_id: "u-historique-a", provider: "instagram", external_id: "ig-synthetique", name: "Compte synthétique", access_token: "chiffre:synthetique-non-valide", refresh_token: null, scopes: "", meta: {}, status: "active", created_at: T0, updated_at: T0 });
  put("project_connections", { project_id: "p-a-mono", connection_id: "conn-a-instagram" });
  put("blog_articles", { id: "blog-a-1", project_id: "p-a-mono", user_id: "u-historique-a", title: "Article synthétique", slug: "article-synthetique", meta_title: "Article", meta_description: "Synthétique", excerpt: "", body_html: "<p>Texte synthétique.</p>", tags: [], language: "fr", status: "draft", qc_notes: [], created_at: T0, updated_at: T0 });
  put("settings", { key: "public.url", value: "https://studio.exemple.invalid", secret: 0, updated_at: T0 });
  put("settings", { key: "stripe.secretKey", value: "chiffre:synthetique-non-valide", secret: 1, updated_at: T0 });
  put("notifications", { id: "n-a", user_id: "u-historique-a", project_id: "p-a-mono", level: "info", title: "Création terminée", body: "", created_at: T0 });
})();

// Angles marketing et stratégie : seulement si cette époque les connaît (tables créées par leur module).
let angles = false;
const strategyModule = path.join(code, "src/lib/marketing-strategy/index.ts");
if (fs.existsSync(strategyModule)) {
  const m = (await import(strategyModule)) as { activeStrategy?: (id: string) => unknown };
  try {
    m.activeStrategy?.("p-a-mono");
  } catch {
    /* lecture seule : sert à créer les tables de cette époque */
  }
  for (const t of (d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'marketing_%'").all() as { name: string }[]).map((r) => r.name)) tables.add(t);
  d.transaction(() => {
    angles = put("marketing_strategy_sets", { project_id: "p-a-mono", angles_json: [{ id: "angle-cadeau" }, { id: "angle-qualite" }], analysis_json: { sources: [] }, input_digest: "digest-historique", created_at: T0 });
    for (const [v, angle] of ["angle-cadeau", "angle-qualite"].entries()) {
      put("marketing_strategy_versions", { id: `sv-a-${v + 1}`, project_id: "p-a-mono", version: v + 1, angle_id: angle, angle_json: { id: angle }, input_digest: "digest-historique", activated_at: T0 + v * day });
      put("marketing_strategy_used", { project_id: "p-a-mono", angle_id: angle, first_activated_at: T0 + v * day });
    }
    put("marketing_strategy_active", { project_id: "p-a-mono", strategy_id: "sv-a-2" });
  })();
}
d.pragma("wal_checkpoint(TRUNCATE)");
d.close();
const summary = { code, commit: process.env.LOT1_COMMIT ?? null, out, inserted, angles, synthetic: true };
fs.writeFileSync(path.join(out, "fabrication.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
