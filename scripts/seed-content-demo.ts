/**
 * Démo du panneau « SEO & textes » (phase 8A), SANS aucun appel d'IA : crée (dans la base désignée par DATA_DIR)
 * un compte et le projet Sébastien Blanc (plâtrier-peintre). Sert au test navigateur scripts/e2e-content-v2.ts.
 *   DATA_DIR=/tmp/demo EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-content-demo.ts
 * Ne jamais lancer sur la base de production.
 */
import { createUser } from "@/lib/auth";
import { one } from "@/lib/db";
import { seedImageFixture } from "../tests/image-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const email = process.env.EMAIL ?? "demo@exemple.fr";
const password = process.env.PASSWORD ?? "motdepasse-demo";
const userId = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)?.id ?? (await createUser(email, password, "Démo")).id;
console.log(JSON.stringify({ projectId: seedImageFixture(userId, "artisan"), cosmetic: seedImageFixture(userId, "cosmetic") }));
