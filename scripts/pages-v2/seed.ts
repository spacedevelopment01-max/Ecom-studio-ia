/**
 * Projets de test des modèles de pages, dans une base SÉPARÉE (jamais la base réelle) :
 *   DATA_DIR=/tmp/base-test npx tsx scripts/pages-v2/seed.ts
 * dominer@test.fr (boutique drone, Dominer), creer@test.fr (même boutique, Créer), services@test.fr (artisan, Développer).
 */
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { composeThemeV2 } from "@/lib/theme-v2/engine";
import { saveThemeVersion, currentTheme } from "@/lib/projects";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { seedThemeScenario } from "../../tests/theme-v2-fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
for (const [email, scenario, plan] of [["dominer@test.fr", "hightech", "dominer"], ["creer@test.fr", "hightech", "creer"], ["services@test.fr", "artisan", "vendre"]] as const) {
  const u = await createUser(email, "motdepasse-test", email.split("@")[0]);
  const pid = await seedThemeScenario(u.id, scenario);
  const spec = (await fr(() => composeThemeV2(pid))).spec;
  if (scenario === "hightech") spec.store.products = [...(spec.store.products ?? []), { ...JSON.parse(JSON.stringify(spec.store.product)), handle: "drone-mini", title: "Drone mini" }];
  fr(() => saveThemeVersion(pid, spec, "Création", "system"));
  grantProjectPlan(pid, plan);
  console.log(email, pid, currentTheme(pid)!.spec.store.pages.length, "pages");
}
