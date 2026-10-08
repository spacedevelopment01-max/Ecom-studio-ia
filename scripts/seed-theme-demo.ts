/**
 * Démo de l'éditeur de site Theme Engine V2 (phase 10A), SANS aucun appel d'IA : crée (dans la base désignée par
 * DATA_DIR) un compte en découverte gratuite (moteur local seulement), le projet cosmétique de référence avec ses
 * médias de démonstration et son site V2 composé localement. Sert au test navigateur scripts/e2e-theme-v2.ts.
 *   DATA_DIR=/tmp/demo EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-theme-demo.ts
 * Ne jamais lancer sur la base de production.
 */
import { createUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { getSubscription } from "@/lib/billing";
import { runWithLang } from "@/lib/i18n-server";
import { buildShopV2 } from "@/lib/theme-v2/engine";
import { seedThemeScenario } from "../tests/theme-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const email = process.env.EMAIL ?? "demo@exemple.fr";
const password = process.env.PASSWORD ?? "motdepasse-demo";
const userId = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)?.id ?? (await createUser(email, password, "Démo")).id;
// Découverte gratuite (aucun forfait actif) : moteur local seulement.
getSubscription(userId);
run("UPDATE subscriptions SET status = 'none', plan = NULL WHERE user_id = ?", userId);
const projectId = await seedThemeScenario(userId, "cosmetic");
const v = await runWithLang({ ui: "fr", content: "fr" }, () => buildShopV2(null, projectId));
console.log(JSON.stringify({ projectId, version: v.number, language: v.language }));
