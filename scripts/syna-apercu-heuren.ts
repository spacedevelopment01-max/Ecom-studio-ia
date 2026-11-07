/**
 * Aperçu privé HEUREN (#301, convergence vers main) : prépare une base de démonstration (compte fictif, projet HEUREN
 * préparé, quatre publications à valider) puis lance le Studio COMPILÉ (`next start`) avec les fonctions gratuites de
 * SINA ouvertes, sans aucune clé de fournisseur (aucune dépense possible) et sans accès réseau extérieur.
 *
 * Usage : npm run build, puis
 *   SYNA_APERCU_DIR=<dossier persistant> SYNA_APERCU_PORT=3100 npx tsx scripts/syna-apercu-heuren.ts
 * Le dossier est réutilisé s'il existe déjà (les parcours filmés restent visibles d'une relance à l'autre).
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const dir = path.resolve(process.env.SYNA_APERCU_DIR ?? "work/apercu-heuren");
const port = Number(process.env.SYNA_APERCU_PORT ?? 3100);
fs.mkdirSync(dir, { recursive: true });
const secretFile = path.join(dir, "app-secret.txt");
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, randomBytes(32).toString("hex"));
process.env.DATA_DIR = dir;
process.env.APP_SECRET = fs.readFileSync(secretFile, "utf8").trim();
for (const key of ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "DASHSCOPE_API_KEY", "FAL_KEY", "GOOGLE_API_KEY", "PIXABAY_API_KEY"]) process.env[key] = "";
const FLAGS = ["LOT_A", "AI", "UI", "CONTEXT", "SPECIALISTS", "TOOLS", "THEME_TOOLS", "LOCAL_SITE", "FILES", "SERVICE_PROFILE", "PROMPTS", "BOOKING_READ", "BOOKING_EDIT", "CATALOGUE", "SOCIAL", "SITE_REQUESTS", "BUSINESS_CONTENT", "AD_DOCUMENT_LOCAL"];
const env: Record<string, string> = { ...Object.fromEntries(FLAGS.map((k) => ["STUDIO_CONVERSATION_" + k, "1"])), STUDIO_SYNA_SHELL: "1" };
Object.assign(process.env, env);
const EMAIL = "demo-heuren@example.com", PASSWORD = "Heuren-Demo-2026";

const { one, run, now, all } = await import("../src/lib/db");
if (!one("SELECT id FROM users WHERE email = ?", EMAIL)) {
  const { account } = await import("../tests/conversation209-fixtures");
  const { shopKitProject } = await import("../tests/heuren-alcove-fixtures");
  const { saveThemeVersion, loadProject } = await import("../src/lib/projects");
  const { createManualPost } = await import("../src/lib/social-v2/manual");
  const { openProjectConversation } = await import("../src/lib/orchestrator/conversation");
  const { initialize } = await import("../src/lib/preparation/engine");
  const { emptyInput } = await import("../src/lib/orchestrator/conversation/store");
  const bcrypt = (await import("bcryptjs")).default;
  const u = await account();
  run("UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?", "Démo HEUREN", EMAIL, await bcrypt.hash(PASSWORD, 10), u.id);
  const kit = await shopKitProject(u.id, "heuren");
  saveThemeVersion(kit.pid, kit.spec, "Démonstration HEUREN", "user");
  run("UPDATE projects SET name = ? WHERE id = ?", "HEUREN", kit.pid);
  const p = loadProject(kit.pid);
  // Projet préparé, comme un client accompagné : SINA peut retoucher (jamais la lecture seule des anciens projets).
  initialize(kit.pid, { ...emptyInput(), business: p.business, offerName: p.product.name, description: p.product.summary, services: p.services } as never);
  openProjectConversation(u as never, kit.pid);
  const assets = Object.fromEntries(all<{ id: string; name: string }>("SELECT id, name FROM assets WHERE project_id = ?", kit.pid).map((a) => [a.name, a.id]));
  const day = 86400000, base = Math.floor(now() / 3600000) * 3600000 + 2 * day;
  ([
    ["coffret-ouvert.webp", "Le coffret HEUREN", "Cadran bleu nuit soleillé, boîtier argenté, coffret bleu nuit à l'intérieur ivoire.", "#montre #bleunuit"],
    ["bureau-corrige.webp", "Une montre pour le bureau", "Sur un sous-main en cuir, dans la lumière du soir.", "#heuren #montre"],
    ["cadeau-ruban.webp", "Une idée de cadeau", "Noué d'un ruban bleu nuit, prêt à offrir.", "#cadeau #montre"],
    ["cadran-macro.webp", "Le détail du cadran", "Aiguilles et index argentés sur un cadran bleu nuit soleillé.", "#détail #horlogerie"],
  ] as const).forEach(([file, title, caption, hashtags], i) => {
    const media = assets[`heuren-${file}`];
    if (media) createManualPost(loadProject(kit.pid), u.id, { network: i % 2 ? "facebook" : "instagram", format: "image", title, caption, hashtags, media: [media], scheduledAt: base + i * day } as never);
  });
  console.log("Base de démonstration HEUREN créée.");
}
const origin = `http://localhost:${port}`;
const server = spawn(process.execPath, [path.resolve("node_modules/next/dist/bin/next"), "start", "-p", String(port), "-H", "0.0.0.0"], {
  env: { ...process.env, ...env, APP_URL: origin, NEXT_TELEMETRY_DISABLED: "1", NODE_OPTIONS: `--max-old-space-size=4096 --import=${path.resolve("scripts/lot9/network-guard.mjs")}` },
  stdio: "inherit",
});
console.log(`Aperçu HEUREN : ${origin} — compte ${EMAIL} / ${PASSWORD} (fictif, base locale de démonstration)`);
server.on("exit", (code) => process.exit(code ?? 0));
