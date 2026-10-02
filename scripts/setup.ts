/**
 * Préparation d'une installation : crée .env.local (APP_SECRET aléatoire),
 * le dossier de données et la base. Sans effet sur une installation existante.
 */
import crypto from "node:crypto";
import fs from "node:fs";

const envFile = ".env.local";
if (!fs.existsSync(envFile)) {
  const lines = [
    "# Généré par npm run setup — ne pas partager ni versionner.",
    `APP_SECRET=${crypto.randomBytes(32).toString("base64url")}`,
    "# Adresse publique du studio (HTTPS en production ; modifiable aussi dans l'administration).",
    "APP_URL=http://localhost:3000",
    "# Le premier compte créé devient administrateur ; vous pouvez aussi fixer l'adresse :",
    "# ADMIN_EMAIL=vous@exemple.fr",
    "# DATA_DIR=./data",
  ];
  fs.writeFileSync(envFile, lines.join("\n") + "\n", { mode: 0o600 });
  console.log(`✓ ${envFile} créé avec un APP_SECRET aléatoire.`);
} else console.log(`• ${envFile} existe déjà : conservé.`);

process.loadEnvFile(envFile);
const { db, DATA_DIR } = await import("../src/lib/db");
db();
console.log(`✓ Base de données prête dans ${DATA_DIR}`);
console.log("\nÉtape suivante : npm run dev  →  http://localhost:3000 (créez votre compte : le premier devient administrateur).");
