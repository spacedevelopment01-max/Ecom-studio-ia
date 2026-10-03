/** Charge .env.local / .env pour le worker (Next.js le fait déjà pour le site). */
import fs from "node:fs";

for (const f of [".env.local", ".env"]) if (fs.existsSync(f)) process.loadEnvFile(f);
