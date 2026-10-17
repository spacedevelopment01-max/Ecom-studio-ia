/**
 * « Rédiger ma description avec l'IA » (création de projet) : jamais d'« erreur inattendue » (500). Chaque cause
 * plausible donne un message clair au client et la cause exacte est inscrite au journal de l'administration :
 *  - fournisseur surchargé, délai dépassé, clé ou modèle refusé ;
 *  - fournisseur désactivé dans l'administration (aucune clé active) ;
 *  - limite de rédactions par compte et par jour atteinte, réponse trop courte ;
 *  - champs du formulaire de services longs (horaires du lundi au dimanche…) ou trop longs.
 * Aucun appel réel : le fournisseur est simulé.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
let providerKey: string | null = "test-key";
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return { ...real, currentUser: async () => sessionUser, requireUser: async () => sessionUser ?? (() => { throw new real.HttpError(401, "Connexion requise."); })() };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/config")>()), activeProviderKey: () => providerKey }));

const PARA = "Nous sommes plombiers chauffagistes à Mâcon et dans les environs. Nous intervenons pour les fuites, les débouchages et l'entretien des chaudières, chez les particuliers comme chez les professionnels.";

describe("description par l'IA : erreurs claires, jamais de 500", async () => {
  const { createUser } = await import("@/lib/auth");
  const { createSubscription } = await import("@/lib/project-subscriptions");
  const { all } = await import("@/lib/db");
  const { setJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { houseDeps, HOUSE_TASK } = await import("@/lib/ai/house-describe");
  const route = await import("@/app/api/describe/route");
  const post = (b: object) => runWithLang({ ui: "fr", content: "fr" }, () => route.POST(new Request("http://localhost:3000/api/describe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) })));
  let n = 0;
  const paidClient = async () => {
    const u = await createUser(`desc-err-${Date.now()}-${n++}@test.fr`, "motdepasse-test", "D");
    sessionUser = { ...u, role: "client" };
    createSubscription(u.id, { plan: "creer", status: "manual", source: "admin" }); // « Offert (manuel) »
    return u;
  };
  const fail = (status?: number, message = "provider error") => {
    houseDeps.send = async () => {
      throw Object.assign(new Error(message), status ? { status } : {});
    };
  };
  const logged = (userId: string) => all<{ scope: string; message: string }>("SELECT scope, message FROM error_log WHERE user_id = ? AND scope = ?", userId, HOUSE_TASK);

  beforeEach(() => {
    providerKey = "test-key";
    setJsonSetting("house.describe.enabled", true);
    setJsonSetting("house.describe.perUserPerDay", 8);
    houseDeps.send = async () => ({ text: PARA, input: 300, output: 120 });
  });

  for (const [label, status, msg] of [
    ["fournisseur surchargé (529)", 529, "overloaded_error"],
    ["erreur du fournisseur (500)", 500, "internal server error"],
    ["trop de demandes (429)", 429, "rate limited"],
    ["délai dépassé (sans code)", undefined, "Request timed out."],
  ] as const) {
    it(`${label} : message clair (réessayez), cause au journal, rien de décompté`, async () => {
      const u = await paidClient();
      fail(status, msg);
      const res = await post({ business: "services", brief: `plombier ${label} ${Date.now()}` });
      expect(res.status).toBe(422);
      expect((await res.json()).error).toMatch(/momentanément indisponible.*réessayez/);
      expect(logged(u.id).length).toBe(1);
      expect(logged(u.id)[0].message).toContain(msg);
      expect(all("SELECT 1 FROM usage_events WHERE user_id = ? AND task = ?", u.id, HOUSE_TASK)).toHaveLength(0);
    });
  }

  it("clé ou modèle refusé (401/404) : « pas disponible ici », jamais la clé dans le journal", async () => {
    const u = await paidClient();
    fail(401, "invalid x-api-key sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
    const res = await post({ business: "services", brief: `plombier clé refusée ${Date.now()}` });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/pas disponible ici/);
    expect(logged(u.id)[0].message).not.toContain("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  });

  it("fournisseur désactivé dans l'administration (aucune clé active) : message clair, aucun appel", async () => {
    await paidClient();
    providerKey = null;
    let called = false;
    houseDeps.send = async () => ((called = true), { text: PARA, input: 1, output: 1 });
    const res = await post({ business: "services", brief: `plombier fournisseur coupé ${Date.now()}` });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/n'est pas disponible ici/);
    expect(called).toBe(false);
  });

  it("limite de rédactions du jour atteinte (compte qui a déjà beaucoup essayé) : message clair, pas d'« erreur inattendue »", async () => {
    await paidClient();
    setJsonSetting("house.describe.perUserPerDay", 1);
    // Textes uniques : un texte déjà rédigé est repris du cache sans compter dans la limite.
    const stamp = Date.now();
    expect((await post({ business: "services", brief: `coiffeuse à domicile ${stamp} a` })).status).toBe(200);
    const res = await post({ business: "services", brief: `coiffeuse à domicile ${stamp} b` });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/plusieurs descriptions aujourd'hui/);
  });

  it("réponse trop courte du modèle : message clair", async () => {
    await paidClient();
    houseDeps.send = async () => ({ text: "Plombier.", input: 10, output: 2 });
    const res = await post({ business: "services", brief: `plombier réponse courte ${Date.now()}` });
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/n'a pas pu rédiger/);
  });

  it("formulaire de services complet (horaires longs du lundi au dimanche, adresse, téléphone, e-mail, langue) : rédigé", async () => {
    await paidClient();
    const hours = "Lundi au vendredi 9h00 - 12h00 et 14h00 - 19h00, samedi 9h00 - 18h00, dimanche 10h00 - 12h00 sur rendez-vous ; urgences 7j/7 de 7h00 à 22h00.";
    const res = await post({ business: "services", brief: `plombier chauffagiste dépannage ${Date.now()}`, name: "Plomberie Martin", area: "Mâcon et 30 km autour", address: "12 rue des Lilas, 71000 Mâcon", hours, phone: "+33 6 11 22 33 44", email: "contact@plomberie-martin.fr", lang: "fr" });
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe(PARA);
  });

  it("champ trop long : refus clair (400) qui nomme le champ, pas d'« erreur inattendue »", async () => {
    await paidClient();
    const res = await post({ business: "services", brief: "plombier", hours: "x".repeat(401) });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/hours/);
  });
});

describe("toutes les routes : un refus clair du studio n'est jamais une « erreur inattendue »", async () => {
  const { handle } = await import("@/lib/http");
  const { UserFacingError } = await import("@/lib/jobs");
  it("UserFacingError → 422 avec son message (au lieu de 500)", async () => {
    const res = await handle(async (_req: Request) => {
      throw new UserFacingError("Limite atteinte : réessayez demain.");
    })(new Request("http://localhost/x"));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toBe("Limite atteinte : réessayez demain.");
  });
});
