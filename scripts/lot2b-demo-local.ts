/** Installe les deux démonstrations ORBE / Atelier Rive dans la base d'un studio local, pour les manipuler soi-même.
 *
 *   npx tsx scripts/lot2b-demo-local.ts <dossier-du-pack-extrait>/images [adresse-e-mail]
 *
 * - Utilise la même base que le studio (DATA_DIR ou ./data) et le même secret (.env.local, sinon data/.app-secret) :
 *   lancer ensuite « npm run dev » et ouvrir les adresses affichées.
 * - Le compte indiqué est réutilisé s'il existe ; sinon il est créé avec un mot de passe aléatoire affiché une seule fois.
 * - Les 24 photographies du pack restent dans la base locale (jamais dans le dépôt). Aucun appel IA, aucune dépense.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
process.env.STOCK_OFFLINE ??= "1";
const mediaDir = process.argv[2];
if (!mediaDir || !fs.existsSync(mediaDir)) { console.error("Dossier des images du pack introuvable. Usage : npx tsx scripts/lot2b-demo-local.ts <pack>/images [e-mail]"); process.exit(1); }
const email = (process.argv[3] ?? "demo-lot2b@example.invalid").toLowerCase();
const { editorialProject } = await import("../tests/lot2b-fixtures");
const { createUser } = await import("../src/lib/auth");
const { one, DATA_DIR } = await import("../src/lib/db");
const { saveThemeVersion } = await import("../src/lib/projects");
const { previewSegment } = await import("../src/lib/theme/preview-access");
const { runWithLang } = await import("../src/lib/i18n-server");
let user = one<{ id: string; email: string }>("SELECT id, email FROM users WHERE email = ?", email), password: string | null = null;
if (!user) { password = crypto.randomBytes(12).toString("base64url"); user = await createUser(email, password, "Démonstration lot 2B"); }
const lines: string[] = [`Base : ${DATA_DIR}`, `Compte : ${user.email}${password ? ` — mot de passe créé maintenant (à noter, il ne sera plus affiché) : ${password}` : " (compte existant, mot de passe inchangé)"}`, ""];
for (const kind of ["products", "services"] as const) await runWithLang({ content: "fr", ui: "fr" }, async () => {
  const f = await editorialProject(user!.id, kind, mediaDir);
  const version = saveThemeVersion(f.pid, f.spec, "Démonstration ORBE / Atelier Rive — installation locale", "user");
  const base = `/preview/${f.pid}/v/${previewSegment(version.id, user!.id, f.pid)}`;
  lines.push(`${kind === "products" ? "ORBE (boutique)" : "Atelier Rive (services)"} — projet ${f.pid}`, `  Studio      : http://localhost:3000/studio/${f.pid}`, `  Accueil     : http://localhost:3000${base}/`, `  ${kind === "products" ? "Fiche produit" : "Prestation   "}: http://localhost:3000${base}${f.detail}`, `  Médias      : ${f.media.length}/12 trouvés${f.missing.length ? ` — manquants : ${f.missing.join(", ")}` : ""}`, "");
});
lines.push("Les liens d'aperçu signés expirent après 12 heures ; le studio en régénère depuis l'onglet Boutique.", "Panier d'aperçu en mémoire du serveur : il se vide au redémarrage du studio.");
console.log(lines.join("\n"));
