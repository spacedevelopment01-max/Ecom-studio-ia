/** Charge .env.local / .env pour le worker (Next.js le fait déjà pour le site). */
import fs from "node:fs";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);

// Jamais de clé d'API, jeton ni secret dans la sortie du worker (messages d'erreur des fournisseurs compris).
import("../src/lib/redact").then((m) => m.installConsoleRedaction());
