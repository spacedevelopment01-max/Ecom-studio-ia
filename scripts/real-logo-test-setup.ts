/**
 * Prépare une base de DÉMONSTRATION séparée pour un test réel des logos dans le vrai studio (site + worker), avec
 * OpenAI seul : compte client avec forfait (plafonds habituels), projet Sébastien Blanc, modèle d'images
 * `gpt-image-2` pour « Logos », modèle de texte OpenAI pour les directions et les relectures (routage automatique).
 * Aucun appel n'est fait ici ; aucune clé n'est écrite (Claude Cloud : ajoutée par le proxy réseau ; ailleurs :
 * clé de l'administration ou OPENAI_API_KEY).
 *   DATA_DIR=<dossier vide> npx tsx scripts/real-logo-test-setup.ts
 * Tarifs saisis (bornes du coût maximal réservé) : gpt-image-2 0,22 $ / image (coût mesuré : 0,2164 $) ;
 * GPT-5.6 Terra 2,5 $ / 15 $ par million de jetons (la plus haute des deux valeurs publiques relevées, page
 * officielle inaccessible depuis l'environnement — à confirmer).
 */
import { createUser } from "@/lib/auth";
import { one, run } from "@/lib/db";
import { getSubscription, syncAllowance, balance } from "@/lib/billing";
import { runWithLang } from "@/lib/i18n-server";
import { getJsonSetting, setJsonSetting, setSetting } from "@/lib/settings";
import { seedLogoFixture } from "../tests/logo-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée, jamais la base de production).");
const EMAIL = "test-logo-reel@demo.fr";
const PASSWORD = process.env.TEST_PASSWORD || "motdepasse-test-logo";
if (one("SELECT 1 FROM users WHERE email = ?", EMAIL)) throw new Error("Base déjà préparée.");
const u = await createUser(EMAIL, PASSWORD, "Test logo réel");
run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
getSubscription(u.id);
run("UPDATE subscriptions SET status = 'active', plan = 'vendre' WHERE user_id = ?", u.id);
syncAllowance(u.id);
const now = Date.now();
setSetting("ai.prices.checkedAt", String(now));
setJsonSetting("ai.prices", {
  ...getJsonSetting<Record<string, unknown>>("ai.prices", {}),
  "openai:gpt-image-2": { unit: "image", perImage: 0.22 },
  "openai:gpt-5.6-terra": { unit: "tokens", inputPerM: 2.5, outputPerM: 15 },
});
setJsonSetting("ai.media.models", { "openai:gpt-image-2": { confirmedAt: now, enabled: true } });
setJsonSetting("ai.media.usage", { logo: { primary: "openai:gpt-image-2" } });
setJsonSetting("ai.textModels", { "openai:gpt-5.6-terra": { confirmedAt: now, enabled: true } });
setSetting("ai.routing.mode", "auto");
const pid = runWithLang({ ui: "fr", content: "fr" }, () => seedLogoFixture(u.id, "artisan"));
console.log(JSON.stringify({ email: EMAIL, projectId: pid, budgetEur: balance(u.id).available / 1e6 }, null, 2));
