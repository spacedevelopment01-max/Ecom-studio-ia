/**
 * Sécurité de l'IA (phase 1C) :
 *  - aucun appel payant sans droits, même hors tâche de fond (runForUser) ;
 *  - kit réseaux sociaux / ligne éditoriale d'un compte sans forfait : aucun appel ;
 *  - jamais de clé, jeton, en-tête Authorization ni secret de l'application dans les journaux ;
 *  - secret maître unique : obligatoire en production, aléatoire (jamais une constante) en développement ;
 *  - données chiffrées avec l'ancienne constante de développement toujours lisibles, puis rechiffrées ;
 *  - prompts lancés avec l'IA : limite par heure (réglable en un seul endroit) et affirmations signalées.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Faux secrets fabriqués à l'exécution (aucun n'apparaît en clair dans le dépôt : l'analyse de secrets de GitHub
// les prendrait pour de vrais), avec la même forme que les vraies clés.
const fake = (...parts: string[]) => parts.join("");
const sent: any[] = [];
let reply = "Bonjour";
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = Promise.resolve({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: reply }], usage: { input_tokens: 10, output_tokens: 10 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
// Fournisseurs « configurés » : seule la vérification des droits du compte peut empêcher l'appel.
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "sk-ant-test-1234567890abcdef" }));
const routeUser: { user: any; projectId: string } = { user: null, projectId: "" };
vi.mock("@/lib/route-helpers", async (orig) => ({
  ...(await orig<object>()),
  projectFromCtx: async () => {
    const { loadProject } = await import("@/lib/projects");
    return { user: routeUser.user, project: loadProject(routeUser.projectId) };
  },
}));

beforeEach(() => {
  sent.length = 0;
  reply = "Bonjour";
  // Aucun appel réseau réel (fournisseurs d'images, photos libres…).
  vi.stubGlobal("fetch", async () => {
    throw new Error("réseau coupé pendant les tests");
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("sécurité de l'IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, id, now, one, run, logError } = await import("@/lib/db");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { localBrand } = await import("@/lib/engine/local");
  const { serviceProduct, serviceProfile } = await import("./fixtures");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  async function account(plan: "creer" | null) {
    const u = await createUser(`secu${Date.now()}${Math.random()}@test.fr`, "motdepasse-test", "S");
    if (plan) {
      // Compte de test avec forfait actif et son budget IA (comme un client payant).
      const { getSubscription, syncAllowance } = await import("@/lib/billing");
      getSubscription(u.id);
      run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
      syncAllowance(u.id);
    }
    return u;
  }
  function project(userId: string) {
    const product = { ...serviceProduct, name: "Sébastien Blanc", summary: "Plâtrier peintre à Mâcon." };
    const services = { ...serviceProfile, contactMode: "call" as const, bookingUrl: "" };
    const { brand, strategy } = localBrand(product, "Sébastien Blanc", { business: "services", services } as any);
    const pid = id();
    run(
      "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, business_type, business_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      pid, userId, "Sébastien Blanc", "ready", "shopify", JSON.stringify(product), JSON.stringify(brand), JSON.stringify(strategy), JSON.stringify({ language: "fr" }), "[]", "services", JSON.stringify(services), now(), now(),
    );
    return pid;
  }

  describe("droits d'accès", () => {
    it("appel hors runForUser par un compte sans forfait : refusé, aucune requête envoyée", async () => {
      const { llmText } = await import("@/lib/ai/llm");
      const u = await account(null);
      await fr(async () => {
        await expect(llmText({ task: "copywriting", userId: u.id, system: "s", prompt: "p" })).rejects.toThrow(/découverte gratuite/);
        await expect(llmText({ task: "copywriting", userId: "", system: "s", prompt: "p" })).rejects.toThrow(/aucun compte/);
        await expect(llmText({ task: "copywriting", userId: "compte-inexistant", system: "s", prompt: "p" })).rejects.toThrow(/refusé/);
      });
      expect(sent).toHaveLength(0);
      expect(all("SELECT id FROM ai_calls WHERE user_id = ?", u.id)).toHaveLength(0);
    });

    it("image hors runForUser sans forfait : refusée avant tout envoi au fournisseur", async () => {
      const { geminiPlate } = await import("@/lib/ai/media-providers");
      const u = await account(null);
      const calls: unknown[] = [];
      vi.stubGlobal("fetch", async (...a: unknown[]) => (calls.push(a), new Response("{}")));
      await fr(async () => {
        await expect(geminiPlate({ userId: u.id, projectId: null as any }, { prompt: "set", aspect: "1:1" })).rejects.toThrow();
      });
      expect(calls).toHaveLength(0);
    });

    it("compte avec forfait et budget : l'appel passe (pas de passe-droit, mais pas de blocage non plus)", async () => {
      const { llmText } = await import("@/lib/ai/llm");
      const u = await account("creer");
      const { balance } = await import("@/lib/billing");
      expect(balance(u.id).available).toBeGreaterThan(0);
      const r = await fr(() => llmText({ task: "copywriting", userId: u.id, system: "s", prompt: "p" }));
      expect(r).toBe("Bonjour");
      expect(sent).toHaveLength(1);
    });

    it("kit réseaux sociaux d'un compte sans forfait : ligne éditoriale locale, aucun appel à l'IA", async () => {
      const u = await account(null);
      const pid = project(u.id);
      routeUser.user = u;
      routeUser.projectId = pid;
      const { POST } = await import("@/app/api/projects/[id]/brand/social/route");
      const res = await fr(() => POST(new Request("http://studio.test/api/projects/x/brand/social", { method: "POST", body: JSON.stringify({ voice: true }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: pid }) }));
      // Sans piste de logo choisie, le kit lui-même est refusé (409) ; la ligne éditoriale, elle, est refaite localement.
      expect([200, 409]).toContain(res.status);
      const { loadProject } = await import("@/lib/projects");
      expect(loadProject(pid).brand?.social?.generatedBy).toBe("local");
      expect(sent).toHaveLength(0);
      expect(all("SELECT id FROM ai_calls WHERE user_id = ?", u.id)).toHaveLength(0);
    }, 120_000);
  });

  describe("journaux sans secret", () => {
    const SECRETS = [
      fake("sk-", "proj-", "AbCdEfGhIjKlMnOpQrStUvWx123456"),
      fake("sk-", "ant-api03-", "AbCdEfGhIjKlMnOp_qrstuv-123456"),
      fake("AI", "za", "SyAbCdEfGhIjKlMnOpQrStUvWxYz012345"),
      fake("12345678", "-", "0123456789abcdef", "0123456789abcdef"),
      fake("shp", "at_", "fa", "ke".repeat(15)),
      fake("ya", "29.", "a0AfH6SMBxYzAbCdEfGhIjKlMn"),
      fake("EA", "AG", "m0PX4ZCpsBAAbCdEfGhIjKlMnOpQrSt"),
      fake("eyJhbGciOiJIUzI1NiJ9", ".", "eyJzdWIiOiIxIn0", ".abcdefghijk"),
    ];

    it("logError : clés OpenAI / Anthropic / Gemini / Pixabay, jetons OAuth, Authorization, Bearer et APP_SECRET masqués", async () => {
      const appSecret = process.env.APP_SECRET ?? (await import("@/lib/secrets")).masterSecret();
      const msg = [
        `OpenAI 401 for ${SECRETS[0]}`,
        `anthropic key ${SECRETS[1]}`,
        `GET https://generativelanguage.googleapis.com/v1beta/models?key=${SECRETS[2]}`,
        `https://pixabay.com/api/?key=${SECRETS[3]}&q=peintre`,
        `X-Shopify-Access-Token: ${SECRETS[4]}`,
        `Authorization: Bearer ${SECRETS[5]}`,
        `{"access_token":"${SECRETS[6]}","refresh_token":"r-123456789"}`,
        `Authorization: Bearer ${SECRETS[7]}`,
        `secret de l'application : ${appSecret}`,
      ].join("\n");
      const scope = `test:secrets:${Date.now()}`;
      logError(scope, new Error(msg), { details: { headers: { Authorization: `Bearer ${SECRETS[5]}` }, apiKey: SECRETS[0], note: `x-goog-api-key: ${SECRETS[2]}` } });
      const row = one<{ message: string; details: string }>("SELECT message, details FROM error_log WHERE scope = ?", scope)!;
      const all_ = row.message + row.details;
      for (const s of [...SECRETS, appSecret, "r-123456789"]) expect(all_).not.toContain(s);
      expect(row.message).toContain("OpenAI 401");
      expect(row.message).toContain("pixabay.com/api/?key=***");
    });

    it("console du serveur et du worker : masquée elle aussi", async () => {
      const { installConsoleRedaction } = await import("@/lib/redact");
      const out: string[] = [];
      const spy = vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => void out.push(a.map(String).join(" ")));
      try {
        // Installée par-dessus l'espion : c'est l'espion qui reçoit la version masquée.
        installConsoleRedaction();
        console.warn("[ia] échec :", `Bearer ${SECRETS[5]}`, new Error(`clé ${SECRETS[0]}`));
      } finally {
        spy.mockRestore();
      }
      expect(out.join("\n")).not.toContain(SECRETS[5]);
      expect(out.join("\n")).not.toContain(SECRETS[0]);
    });

    it("trace des appels en erreur : message masqué", async () => {
      const { redact } = await import("@/lib/ai/trace");
      expect(redact(`401 invalid x-api-key ${SECRETS[1]}`)).not.toContain(SECRETS[1]);
    });
  });

  describe("secret maître", () => {
    const env = process.env as Record<string, string | undefined>;
    const saved = { node: env.NODE_ENV, secret: env.APP_SECRET, dir: env.DATA_DIR };
    afterEach(() => {
      env.NODE_ENV = saved.node;
      if (saved.secret === undefined) delete env.APP_SECRET;
      else env.APP_SECRET = saved.secret;
      env.DATA_DIR = saved.dir;
    });

    it("production sans APP_SECRET : refus net (aucun secret de secours)", async () => {
      const { masterSecret, encrypt } = await import("@/lib/secrets");
      env.NODE_ENV = "production";
      delete env.APP_SECRET;
      expect(() => masterSecret()).toThrow(/APP_SECRET/);
      expect(() => encrypt("x")).toThrow(/APP_SECRET/);
    });

    it("développement sans APP_SECRET : secret aléatoire gardé dans data/.app-secret, stable, jamais l'ancienne constante", async () => {
      const { masterSecret } = await import("@/lib/secrets");
      env.NODE_ENV = "development";
      delete env.APP_SECRET;
      env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "secret-"));
      const s1 = masterSecret();
      expect(s1.length).toBeGreaterThanOrEqual(32);
      expect(s1).not.toBe("dev-only-secret-ecom-studio-ia");
      expect(fs.readFileSync(path.join(env.DATA_DIR, ".app-secret"), "utf8").trim()).toBe(s1);
      expect(masterSecret()).toBe(s1);
      // Une autre installation a un autre secret.
      env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "secret-"));
      expect(masterSecret()).not.toBe(s1);
    });

    it("data/ (et donc .app-secret) est exclu de Git", () => {
      expect(fs.readFileSync(".gitignore", "utf8").split(/\r?\n/)).toContain("data/");
    });

    // Chiffrement tel que le faisait l'ancien code de développement (constante connue).
    const legacyBox = (plain: string) => {
      const key = crypto.createHash("sha256").update("dev-only-secret-ecom-studio-ia").digest();
      const iv = crypto.randomBytes(12);
      const c = crypto.createCipheriv("aes-256-gcm", key, iv);
      const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
      return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
    };

    it("clé chiffrée avec l'ancien secret de développement : toujours lisible avec le nouveau secret", async () => {
      const { decrypt, encrypt } = await import("@/lib/secrets");
      env.APP_SECRET = crypto.randomBytes(32).toString("base64url");
      const old = legacyBox("sk-ant-cle-du-proprietaire");
      expect(decrypt(old)).toBe("sk-ant-cle-du-proprietaire");
      // Le nouveau chiffrement n'utilise plus jamais l'ancienne constante.
      const fresh = encrypt("sk-ant-nouvelle")!;
      expect(decrypt(fresh)).toBe("sk-ant-nouvelle");
      const key = crypto.createHash("sha256").update("dev-only-secret-ecom-studio-ia").digest();
      const [, iv, tag, data] = fresh.split(".");
      const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
      d.setAuthTag(Buffer.from(tag, "base64"));
      expect(() => Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()])).toThrow();
    });

    it("migration : clés d'API et jetons rechiffrés avec le nouveau secret, aucune clé perdue, l'illisible laissé intact", async () => {
      const { decrypt, reencryptLegacy } = await import("@/lib/secrets");
      const { migrateLegacySecrets } = await import("@/lib/secrets-migration");
      const { getSetting } = await import("@/lib/settings");
      env.APP_SECRET = crypto.randomBytes(32).toString("base64url");
      const u = await account(null);
      const k = `provider.test${Date.now()}.apiKey`;
      run("INSERT INTO settings (key, value, secret, updated_at) VALUES (?,?,1,?)", k, legacyBox("sk-proj-cle-openai-du-proprietaire"), now());
      const broken = `provider.casse${Date.now()}.apiKey`;
      run("INSERT INTO settings (key, value, secret, updated_at) VALUES (?,?,1,?)", broken, "v1.AAAA.BBBB.CCCC", now());
      const cid = id();
      run(
        "INSERT INTO connections (id, user_id, provider, external_id, name, access_token, refresh_token, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        cid, u.id, "shopify", "lune.myshopify.com", "Lune", legacyBox(fake("shp", "at_", "jeton_acces")), legacyBox("jeton-rafraichissement"), "active", now(), now(),
      );
      expect(migrateLegacySecrets()).toBeGreaterThanOrEqual(3);
      // Valeurs lisibles, désormais au nouveau secret (plus rien à migrer).
      expect(getSetting(k)).toBe("sk-proj-cle-openai-du-proprietaire");
      const row = one<{ value: string }>("SELECT value FROM settings WHERE key = ?", k)!;
      expect(reencryptLegacy(row.value)).toBeNull();
      const c = one<{ access_token: string; refresh_token: string }>("SELECT access_token, refresh_token FROM connections WHERE id = ?", cid)!;
      expect(decrypt(c.access_token)).toBe(fake("shp", "at_", "jeton_acces"));
      expect(decrypt(c.refresh_token)).toBe("jeton-rafraichissement");
      expect(reencryptLegacy(c.access_token)).toBeNull();
      // Valeur illisible : jamais effacée.
      expect(one<{ value: string }>("SELECT value FROM settings WHERE key = ?", broken)!.value).toBe("v1.AAAA.BBBB.CCCC");
      // Deuxième passage : rien à refaire.
      expect(migrateLegacySecrets()).toBe(0);
    });
  });

  describe("prompts lancés avec l'IA", () => {
    const call = async (pid: string) => {
      const { POST } = await import("@/app/api/projects/[id]/prompt-run/route");
      return fr(() => POST(new Request("http://studio.test/api/projects/x/prompt-run", { method: "POST", body: JSON.stringify({ body: "Rédige trois accroches pour la page d'accueil." }), headers: { "content-type": "application/json" } }), { params: Promise.resolve({ id: pid }) }));
    };

    it("limite par compte et par heure : définie en un seul endroit (20 par défaut), réglable", async () => {
      const { LIMITS, promptRunLimit, rateHit } = await import("@/lib/rate-limit");
      const { setSetting } = await import("@/lib/settings");
      expect(LIMITS.promptRunPerUser).toEqual({ max: 20, windowMs: 3600_000 });
      expect(promptRunLimit().max).toBe(20);
      const u = await account("creer");
      const pid = project(u.id);
      routeUser.user = u;
      routeUser.projectId = pid;
      for (let i = 0; i < LIMITS.promptRunPerUser.max - 1; i++) rateHit(`prompt-run:${u.id}`);
      expect((await call(pid)).status).toBe(200);
      const res = await call(pid);
      expect(res.status).toBe(429);
      expect(sent).toHaveLength(1);
      // Réglage d'administration : la limite change sans toucher au code.
      setSetting("limits.promptRunPerHour", "50");
      try {
        expect(promptRunLimit().max).toBe(50);
        expect((await call(pid)).status).toBe(200);
      } finally {
        setSetting("limits.promptRunPerHour", null);
      }
    });

    it("compte sans forfait : aucun appel, et le compteur n'est pas consommé", async () => {
      const { rateCount } = await import("@/lib/rate-limit");
      const u = await account(null);
      const pid = project(u.id);
      routeUser.user = u;
      routeUser.projectId = pid;
      expect((await call(pid)).status).toBe(402);
      expect(sent).toHaveLength(0);
      expect(rateCount(`prompt-run:${u.id}`, 3600_000)).toBe(0);
    });

    it("affirmations non confirmées de la réponse (certification, garantie, avis…) : signalées par lintClaims", async () => {
      const u = await account("creer");
      const pid = project(u.id);
      routeUser.user = u;
      routeUser.projectId = pid;
      reply = "Artisan certifié, travail garanti 10 ans, 500 avis 5 étoiles.";
      const res = await call(pid);
      expect(res.status).toBe(200);
      const j = await res.json();
      expect(j.answer).toBe(reply);
      const labels = j.claims.map((c: { label: string }) => c.label);
      expect(labels).toEqual(expect.arrayContaining(["certification", "garantie", "avis ou notes"]));
    });
  });
});
