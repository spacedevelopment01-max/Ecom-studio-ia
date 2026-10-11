/**
 * Comptes de test des forfaits V2, dans une base SÉPARÉE (jamais la base réelle) :
 *   DATA_DIR=/tmp/base-test npx tsx scripts/forfaits-v2/seed-comptes-test.ts
 * decouverte@test.fr (compte gratuit) et multi@test.fr (2 projets, 1 abonnement en attente, 1 ancien essai masqué).
 */
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { createSubscription, grantProjectPlan } from "@/lib/project-subscriptions";
const free = await createUser("decouverte@test.fr", "motdepasse-test", "Camille");
const multi = await createUser("multi@test.fr", "motdepasse-test", "Alex");
const mk = (name: string, plan: "creer" | "vendre" | "dominer" | null, hidden = 0, sector = "Cosmétiques") => {
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, sector, hidden, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", pid, multi.id, name, sector, hidden, "ready", now(), now());
  if (plan) grantProjectPlan(pid, plan);
  return pid;
};
mk("Boutique de cosmétiques", "creer");
mk("Boutique de vêtements", "vendre", 0, "Mode");
mk("Ancien essai gratuit", null, 1);
createSubscription(multi.id, { plan: "dominer", source: "admin", status: "manual" });
console.log("ok", free.id, multi.id);
