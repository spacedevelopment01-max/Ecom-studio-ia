/**
 * Démo du studio Réseaux sociaux V2 (phase 9A), SANS aucun appel d'IA ni publication : crée (dans la base désignée
 * par DATA_DIR) un compte au forfait « Dominer » (attribué à la main, comme dans Administration › Clients), le projet
 * cosmétique de démonstration et un compte Instagram SIMULÉ (aucun jeton : toute publication réelle est impossible).
 * Sert au test navigateur scripts/e2e-social-v2.ts.
 *   DATA_DIR=/tmp/demo EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-social-demo.ts
 * Ne jamais lancer sur la base de production.
 */
import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { seedImageFixture } from "../tests/image-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const email = process.env.EMAIL ?? "demo@exemple.fr";
const password = process.env.PASSWORD ?? "motdepasse-demo";
const userId = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)?.id ?? (await createUser(email, password, "Démo")).id;
getSubscription(userId);
run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", userId);
syncAllowance(userId);
const projectId = seedImageFixture(userId, "cosmetic");
const cid = id();
run(
  "INSERT INTO connections (id, user_id, provider, external_id, name, access_token, scopes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
  cid, userId, "instagram", `demo-${cid}`, "Compte Instagram (simulé)", null, "", "active", now(), now(),
);
run("INSERT OR IGNORE INTO project_connections (project_id, connection_id) VALUES (?, ?)", projectId, cid);
console.log(JSON.stringify({ projectId, connectionId: cid }));
