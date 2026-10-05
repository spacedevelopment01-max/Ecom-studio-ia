import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { id, run } from "@/lib/db";
import { getSubscription } from "@/lib/billing";
import { dashboard } from "@/lib/admin-stats";

describe("tableau de bord de l'administration", () => {
  it("compte abonnés, essais, paiements, revenu récurrent et utilisation du forfait", async () => {
    const t = Date.now();
    await createUser(`admin${t}@test.fr`, "motdepasse-test", "Admin"); // premier compte : administrateur, exclu des statistiques
    const a = await createUser(`paye${t}@test.fr`, "motdepasse-test", "Payant");
    const b = await createUser(`essai${t}@test.fr`, "motdepasse-test", "Essai");
    const c = await createUser(`offert${t}@test.fr`, "motdepasse-test", "Offert");
    for (const [u, s, plan] of [[a.id, "active", "vendre"], [b.id, "trial", null], [c.id, "manual", "creer"]] as const) {
      getSubscription(u);
      run("UPDATE subscriptions SET status = ?, plan = ? WHERE user_id = ?", s, plan, u);
    }
    run("INSERT INTO payments (id, user_id, kind, amount_cents, status, stripe_id, created_at) VALUES (?,?,?,?,?,?,?)", id(), a.id, "subscription", 7990, "paid", `cs_${t}`, t);
    run("INSERT INTO payments (id, user_id, kind, amount_cents, status, stripe_id, created_at) VALUES (?,?,?,?,?,?,?)", id(), a.id, "topup", 1000, "paid", `cs_${t}b`, t);
    run("INSERT INTO jobs (id, user_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", id(), a.id, "video.render", "v", "{}", "done", t, t, t);
    const d = dashboard();
    expect(d.plans.abonne).toBeGreaterThanOrEqual(1);
    expect(d.plans.essai).toBeGreaterThanOrEqual(1);
    expect(d.plans.offert).toBeGreaterThanOrEqual(1);
    expect(d.mrrEur).toBeGreaterThanOrEqual(79.9); // forfait Vendre mensuel
    expect(d.money30.subscriptionEur).toBeGreaterThanOrEqual(79.9);
    expect(d.money30.topupCount).toBeGreaterThanOrEqual(1);
    expect(d.usage.using).toBeGreaterThanOrEqual(1);
    expect(d.usage.notUsing).toBeGreaterThanOrEqual(1); // l'abonnement offert n'a rien créé
    expect(d.atRisk.some((r) => r.email === c.email)).toBe(true);
  });
});

describe("administration réservée au propriétaire", () => {
  it("avec ADMIN_EMAIL, seul ce compte devient administrateur", async () => {
    const t = Date.now();
    process.env.ADMIN_EMAIL = `proprio${t}@test.fr`;
    try {
      const client = await createUser(`client${t}@test.fr`, "motdepasse-test", "Client");
      const owner = await createUser(`PROPRIO${t}@test.fr`, "motdepasse-test", "Propriétaire");
      expect(client.role).toBe("client");
      expect(owner.role).toBe("admin");
    } finally {
      delete process.env.ADMIN_EMAIL;
    }
  });
});
