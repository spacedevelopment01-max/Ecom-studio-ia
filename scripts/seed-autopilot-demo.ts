/**
 * Démo « Ma communication automatique » (Autopilot V2), SANS aucun appel d'IA ni publication réelle : crée dans la
 * base désignée par DATA_DIR un compte de démonstration et deux projets de TEST clairement nommés :
 *   - Projet A « [TEST] Cosmétique » (forfait Développer, 3 publications par jour) ;
 *   - Projet B « [TEST] Plâtrier-peintre » (forfait Dominer, 5 publications par jour) ;
 * avec des comptes Instagram, Facebook et Pinterest SIMULÉS (aucun jeton : aucune publication réelle possible).
 *   DATA_DIR=/tmp/demo EMAIL=demo@exemple.fr PASSWORD=motdepasse-demo npx tsx scripts/seed-autopilot-demo.ts
 * Ne jamais lancer sur la base de production.
 */
import { createUser } from "@/lib/auth";
import { id, now, one, run } from "@/lib/db";
import { getSubscription } from "@/lib/billing";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { seedImageFixture } from "../tests/image-v2-fixtures";

if (!process.env.DATA_DIR) throw new Error("DATA_DIR obligatoire (base de démonstration séparée).");
const email = process.env.EMAIL ?? "demo@exemple.fr";
const password = process.env.PASSWORD ?? "motdepasse-demo";
const userId = one<{ id: string }>("SELECT id FROM users WHERE email = ?", email)?.id ?? (await createUser(email, password, "Démo")).id;
getSubscription(userId);
const a = seedImageFixture(userId, "cosmetic");
const b = seedImageFixture(userId, "artisan");
run("UPDATE projects SET name = ? WHERE id = ?", "[TEST] Cosmétique", a);
run("UPDATE projects SET name = ? WHERE id = ?", "[TEST] Plâtrier-peintre", b);
grantProjectPlan(a, "vendre");
grantProjectPlan(b, "dominer");
const scopes: Record<string, string> = { instagram: "instagram_basic,instagram_content_publish,pages_show_list", facebook: "pages_manage_posts,pages_read_engagement,pages_show_list", pinterest: "pins:write,boards:read" };
for (const [provider, sc] of Object.entries(scopes)) {
  const cid = id();
  run("INSERT INTO connections (id, user_id, provider, external_id, name, access_token, scopes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", cid, userId, provider, `demo-${cid}`, `Compte ${provider} (simulé)`, null, sc, "active", now(), now());
  for (const p of [a, b]) run("INSERT OR IGNORE INTO project_connections (project_id, connection_id) VALUES (?, ?)", p, cid);
}
console.log(JSON.stringify({ userId, projectA: a, projectB: b }));
