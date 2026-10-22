import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { consumeQuota, quotaView, userPlan } from "@/lib/quotas";
import { PACKS_FOR_SALE, PLANS } from "@/lib/plans";
import { grantProjectPlan } from "@/lib/project-subscriptions";

async function subscriber(plan: "creer" | "vendre" | "dominer") {
  const u = await createUser(`q${plan}${Date.now()}${Math.random()}@test.fr`, "motdepasse-test", "Q");
  getSubscription(u.id);
  run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
  syncAllowance(u.id);
  return u.id;
}
const project = (userId: string) => {
  const pid = id();
  run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, userId, "Q", now(), now());
  return pid;
};

describe("quotas des forfaits V2 : seul le blog IA se compte, par projet", () => {
  it("sans forfait : aucun quota", async () => {
    const u = await createUser(`qfree${Date.now()}@test.fr`, "motdepasse-test", "Q");
    expect(userPlan(u.id)).toBe(null);
    expect(quotaView(u.id, "blog").left).toBe(0);
  });

  it("images, vidéos et UGC : plus de nombre limite (budget IA du projet seulement) ; blog 0 / 5 / 10 par mois", () => {
    for (const p of ["creer", "vendre", "dominer"] as const) {
      expect(PLANS[p].quotas.visuals).toBe(0);
      expect(PLANS[p].quotas.aiVideos).toBe(0);
      expect(PLANS[p].quotas.ugc).toBe(0);
    }
    expect([PLANS.creer.quotas.blog, PLANS.vendre.quotas.blog, PLANS.dominer.quotas.blog]).toEqual([0, 5, 10]);
    // Seuls achats complémentaires : recharge IA et rendez-vous — plus aucun pack en vente.
    expect(PACKS_FOR_SALE).toEqual([]);
  });

  it("deux projets d'un même compte : compteurs d'articles indépendants, sans double décompte", async () => {
    const u = await subscriber("vendre");
    const a = project(u);
    const b = project(u);
    grantProjectPlan(a, "vendre");
    grantProjectPlan(b, "dominer");
    expect(quotaView(u, "blog", a).left).toBe(5);
    expect(quotaView(u, "blog", b).left).toBe(10);
    consumeQuota(u, "blog", 1, "art-1", a);
    consumeQuota(u, "blog", 1, "art-1", a); // même référence : décompté une fois
    expect(quotaView(u, "blog", a)).toMatchObject({ used: 1, left: 4 });
    expect(quotaView(u, "blog", b)).toMatchObject({ used: 0, left: 10 });
  });
});
