/** Installe les deux démonstrations FRAISE GUMMIES / ONDE AUDIO (issue #137) dans la base d'un studio local, pour les manipuler soi-même.
 *
 *   npx tsx scripts/lot2c-demo-local.ts <dossier-du-kit-extrait>/Pack_Claude_Fraise_Onde [adresse-e-mail]
 *
 * - Même base que le studio (DATA_DIR ou ./data) et même secret (.env.local, sinon data/.app-secret) : lancer ensuite « npm run dev ».
 * - Le compte indiqué est réutilisé s'il existe ; sinon il est créé avec un mot de passe aléatoire affiché une seule fois.
 * - Les 18 images IA et les logos du kit restent dans la base locale (jamais dans le dépôt). Aucun appel IA, aucune dépense.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
process.env.STOCK_OFFLINE ??= "1";
const pack = process.argv[2];
if (!pack || !fs.existsSync(path.join(pack, "FRAISE_GUMMIES"))) { console.error("Dossier du kit introuvable (il doit contenir FRAISE_GUMMIES/ et ONDE_AUDIO/). Usage : npx tsx scripts/lot2c-demo-local.ts <kit>/Pack_Claude_Fraise_Onde [e-mail]"); process.exit(1); }
const email = (process.argv[3] ?? "demo-lot2c@example.invalid").toLowerCase();
const { conversionProject } = await import("../tests/lot2c-fixtures");
const { createUser } = await import("../src/lib/auth");
const { one, DATA_DIR } = await import("../src/lib/db");
const { saveThemeVersion } = await import("../src/lib/projects");
const { previewSegment } = await import("../src/lib/theme/preview-access");
const { runWithLang } = await import("../src/lib/i18n-server");
let user = one<{ id: string; email: string }>("SELECT id, email FROM users WHERE email = ?", email), password: string | null = null;
if (!user) { password = crypto.randomBytes(12).toString("base64url"); user = await createUser(email, password, "Démonstration lot 2C"); }
const lines: string[] = [`Base : ${DATA_DIR}`, `Compte : ${user.email}${password ? ` — mot de passe créé maintenant (à noter, il ne sera plus affiché) : ${password}` : " (compte existant, mot de passe inchangé)"}`, ""];
for (const kind of ["fraise", "onde"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
  const f = await conversionProject(user!.id, kind, pack);
  const version = saveThemeVersion(f.pid, f.spec, "Thème référence FRAISE / ONDE — installation locale", "user");
  const base = `/preview/${f.pid}/v/${previewSegment(version.id, user!.id, f.pid)}`;
  lines.push(`${kind === "fraise" ? "FRAISE GUMMIES (référence Lumora)" : "ONDE AUDIO (référence Pawish)"} — projet ${f.pid}`, `  Studio        : http://localhost:3000/studio/${f.pid}`, `  Accueil       : http://localhost:3000${base}/`, `  Fiche produit : http://localhost:3000${base}${f.detail}`, `  Boutique      : http://localhost:3000${base}/collections/all`, `  Panier        : http://localhost:3000${base}/cart`, `  Pages         : /pages/a-propos · /pages/contact · /pages/faq · /pages/livraison-retours · /pages/mentions-legales · /pages/confidentialite · /pages/conditions-generales · /search`, `  Images        : ${f.media.length}/9 trouvées${f.missing.length ? ` — manquantes ou vides : ${f.missing.join(", ")}` : ""}`, `  Logo          : ${f.logo ? "vectorisé (couleur, inverse, monochrome, favicon)" : "absent"}`, "");
});
lines.push("Les liens d'aperçu signés expirent après 12 heures ; le studio en régénère depuis l'onglet Boutique.", "Panier d'aperçu en mémoire du serveur : il se vide au redémarrage du studio.");
console.log(lines.join("\n"));
