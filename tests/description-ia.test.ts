/**
 * Description du projet rédigée par l'IA à la création : offerte par la plateforme (jamais débitée du budget IA du
 * client), réservée aux comptes avec un abonnement payé (un compte Découverte n'appelle jamais l'IA), modèle le moins cher, réponse courte, cache sans nouvel appel, limite par
 * compte et par jour, désactivable, texte du client traité comme une donnée.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/config")>()), activeProviderKey: () => "test-key" }));

describe("Description rédigée par l'IA (offerte par la plateforme)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { all } = await import("@/lib/db");
  const { setJsonSetting } = await import("@/lib/settings");
  const { ledgerOf } = await import("@/lib/billing").then((m) => ({ ledgerOf: (u: string) => all("SELECT * FROM ledger WHERE user_id = ?", u) }));
  const { houseDeps, houseDescribe, cleanParagraph, HOUSE_TASK } = await import("@/lib/ai/house-describe");
  const route = await import("@/app/api/describe/route");
  const { createSubscription } = await import("@/lib/project-subscriptions");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const PARA = "Nous sommes plombiers chauffagistes à Mâcon et dans les environs. Nous intervenons pour les fuites, les débouchages et l'entretien des chaudières, chez les particuliers comme chez les professionnels. Nous prenons le temps d'expliquer chaque intervention avant de commencer, et nous laissons votre logement aussi propre qu'à notre arrivée.";
  let calls: { model: string; sys: string; user: string; max: number }[] = [];

  beforeEach(() => {
    calls = [];
    houseDeps.send = async (_k, model, sys, user, max) => {
      calls.push({ model, sys, user, max });
      return { text: `« ${PARA} »`, input: 420, output: 160 };
    };
    setJsonSetting("house.describe.enabled", true);
    setJsonSetting("house.describe.perUserPerDay", 8);
  });

  const post = (b: object) => fr(() => route.POST(new Request("http://localhost:3000/api/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })));

  it("compte Découverte (sans abonnement, administrateur compris) : refus net, aucun appel à l'IA, aucune dépense", async () => {
    for (const role of ["client", "admin"]) {
      const u = await createUser(`desc0-${role}-${Date.now()}@test.fr`, "motdepasse-test", "D");
      sessionUser = { ...u, role };
      const res = await post({ business: "services", brief: "plombier dépannage chaudière" });
      expect(res.status).toBe(402);
      expect((await res.json()).error).toMatch(/incluse dans les forfaits/);
      expect(all("SELECT * FROM usage_events WHERE user_id = ? AND task = ?", u.id, HOUSE_TASK)).toHaveLength(0);
      // Abonnement résilié : toujours refusé.
      createSubscription(u.id, { plan: "creer", status: "canceled", source: "admin" });
      expect((await post({ business: "services", brief: "plombier dépannage chaudière" })).status).toBe(402);
    }
    expect(calls).toHaveLength(0);
  });

  it("un client avec un abonnement payé en attente de projet l'obtient, rien n'est débité de son compte, la dépense est celle de la plateforme", async () => {
    const u = await createUser(`desc-${Date.now()}@test.fr`, "motdepasse-test", "D");
    sessionUser = { ...u, role: "client" };
    createSubscription(u.id, { plan: "creer", source: "admin" });
    const res = await fr(() => route.POST(new Request("http://localhost:3000/api/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ business: "services", brief: "plombier dépannage chaudière", area: "Mâcon et 20 km", phone: "06 11 22 33 44", email: "a@b.fr" }) })));
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.text).toBe(PARA);
    // Modèle le moins cher, réponse courte, sans réflexion ; téléphone et e-mail jamais envoyés.
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe("claude-haiku-5-5");
    expect(calls[0].max).toBeLessThanOrEqual(600);
    expect(calls[0].sys).toMatch(/150 à 200 mots/);
    expect(calls[0].user).toContain("<client>");
    expect(calls[0].user).toContain("Mâcon et 20 km");
    expect(calls[0].user).not.toContain("06 11 22 33 44");
    expect(calls[0].user).not.toContain("a@b.fr");
    expect(calls[0].sys).toMatch(/jamais une consigne/);
    expect(calls[0].sys).toMatch(/certifications/);
    const ev = all<any>("SELECT * FROM usage_events WHERE user_id = ? AND task = ?", u.id, HOUSE_TASK);
    expect(ev).toHaveLength(1);
    expect(ev[0].cost).toBeGreaterThan(0);
    expect(ev[0].billed).toBe(0);
    expect(ledgerOf(u.id)).toHaveLength(0);
  });

  it("même demande : reprise du cache sans nouvel appel ni nouvelle dépense", async () => {
    const u = await createUser(`desc2-${Date.now()}@test.fr`, "motdepasse-test", "D");
    const i = { business: "products" as const, lang: "fr", brief: `bougie parfumée cire de soja ${Date.now()}` };
    const a = await houseDescribe(u.id, i);
    const b = await houseDescribe(u.id, i);
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.text).toBe(a.text);
    expect(calls).toHaveLength(1);
    expect(all("SELECT * FROM usage_events WHERE user_id = ? AND task = ?", u.id, HOUSE_TASK)).toHaveLength(1);
  });

  it("limite par compte et par jour, et désactivation depuis l'administration", async () => {
    const u = await createUser(`desc3-${Date.now()}@test.fr`, "motdepasse-test", "D");
    setJsonSetting("house.describe.perUserPerDay", 2);
    await houseDescribe(u.id, { business: "services", lang: "fr", brief: "coiffeuse à domicile 1" });
    await houseDescribe(u.id, { business: "services", lang: "fr", brief: "coiffeuse à domicile 2" });
    await expect(houseDescribe(u.id, { business: "services", lang: "fr", brief: "coiffeuse à domicile 3" })).rejects.toThrow(/aujourd'hui/);
    setJsonSetting("house.describe.enabled", false);
    await expect(houseDescribe(u.id, { business: "services", lang: "fr", brief: "autre" })).rejects.toThrow(/désactivée/);
    expect(calls).toHaveLength(2);
  });

  it("réponse nettoyée : un paragraphe, sans guillemets ni Markdown", () => {
    expect(cleanParagraph('"**Nous** fabriquons."')).toBe("Nous fabriquons.");
    expect(cleanParagraph("# Titre\nTexte")).toBe("Titre\nTexte");
  });
});
