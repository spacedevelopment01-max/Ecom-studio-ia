/**
 * Forfaits V2 — administration (cahier des charges §18) : vue par compte → projets → abonnements, budgets et
 * consommations séparés par projet, total des abonnements, routes réservées à l'équipe.
 */
import { describe, expect, it } from "vitest";
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { createSubscription, grantProjectPlan } from "@/lib/project-subscriptions";
import { billingOverview } from "@/lib/admin-billing";

const uniq = () => `${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

describe("administration des abonnements par projet", () => {
  it("un compte à trois projets : une ligne par projet, budgets distincts, total des abonnements payés", async () => {
    const u = await createUser(`adm-${uniq()}@test.fr`, "motdepasse-test", "A");
    const mk = (name: string) => {
      const pid = id();
      run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, name, now(), now());
      return pid;
    };
    const a = mk("Boutique de cosmétiques");
    const b = mk("Boutique de vêtements");
    const c = mk("Site de services");
    createSubscription(u.id, { plan: "creer", status: "active", source: "stripe", projectId: a, stripeSubscriptionId: `sub_${uniq()}` });
    createSubscription(u.id, { plan: "vendre", status: "active", source: "stripe", projectId: b, stripeSubscriptionId: `sub_${uniq()}` });
    createSubscription(u.id, { plan: "dominer", status: "active", source: "stripe", projectId: c, stripeSubscriptionId: `sub_${uniq()}` });
    const acc = billingOverview().accounts.find((x) => x.id === u.id)!;
    expect(acc.projects.map((p) => p.project).sort()).toEqual(["Boutique de cosmétiques", "Boutique de vêtements", "Site de services"]);
    // Exemple du cahier des charges : 49 + 89 + 129 = 267 € TTC par mois.
    expect(acc.monthlyEur).toBe(267);
    const budgets = acc.projects.map((p) => p.ai?.allowanceEur ?? 0);
    expect(new Set(budgets).size).toBe(3);
    // Un forfait offert par l'équipe n'est pas compté comme revenu.
    const d = mk("Offert");
    grantProjectPlan(d, "dominer");
    expect(billingOverview().accounts.find((x) => x.id === u.id)!.monthlyEur).toBe(267);
  });

  it("routes d'administration des abonnements et des rendez-vous : refusées sans compte administrateur", async () => {
    const overview = await import("@/app/api/admin/billing/overview/route");
    const calls = await import("@/app/api/admin/calls/route");
    expect((await overview.GET(new Request("http://t/api/admin/billing/overview"))).status).toBeGreaterThanOrEqual(401);
    expect((await calls.GET()).status).toBeGreaterThanOrEqual(401);
  });
});
