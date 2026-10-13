/**
 * Compétences publicitaires (skills) : installées dans .claude/skills (Claude Code), lues par le studio et
 * transmises aux modèles connectés pour les demandes publicitaires — vérifié jusqu'à la requête envoyée au
 * fournisseur (SDK simulé : aucun appel réel, aucun coût).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const sent: any[] = [];
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      sent.push(params);
      const p = this.opts.fetch("https://api.anthropic.test/v1/messages", {}).then(() => ({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: "{}" }], usage: { input_tokens: 100, output_tokens: 10 } }));
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: () => "sk-ant-test-1234567890" }));
vi.mock("@/lib/billing", async (orig) => ({
  ...(await orig<object>()),
  assertCanSpend: () => undefined,
  reserve: () => "reservation-test",
  release: () => undefined,
  settleUncertain: () => undefined,
  getSubscription: () => ({ user_id: "u", status: "active", plan: "creer", stores: 1 }),
  planOf: () => "creer",
  balance: () => ({ available: 1e12, used: 0, capacity: 1e12, usedPct: 0 }),
  recordUsage: () => ({ eventId: "ev", dedup: false }),
}));
vi.mock("@/lib/quotas", async (orig) => ({ ...(await orig<object>()), assertQuota: () => undefined, consumeQuota: () => undefined }));

const SKILLS = ["image", "ad-creative", "ads", "canvas-design", "brand-guidelines"];
const textOf = (params: any) => JSON.stringify(params.messages);

describe("Compétences publicitaires installées", () => {
  it("les cinq compétences sont dans .claude/skills, avec un SKILL.md valide et leur licence", () => {
    for (const s of SKILLS) {
      const dir = path.join(process.cwd(), ".claude", "skills", s);
      const md = fs.readFileSync(path.join(dir, "SKILL.md"), "utf8");
      expect(md.match(/^---\nname: ([^\n]+)\ndescription: /)?.[1], s).toBe(s);
      expect(fs.existsSync(path.join(dir, "LICENSE")) || fs.existsSync(path.join(dir, "LICENSE.txt")), s).toBe(true);
    }
    // Charte d'Anthropic : jamais appliquée aux clients (compétence adaptée, modification déclarée).
    const brand = fs.readFileSync(".claude/skills/brand-guidelines/SKILL.md", "utf8");
    expect(brand).toMatch(/CLIENT'S brand/);
    expect(fs.existsSync(".claude/skills/brand-guidelines/NOTICE.md")).toBe(true);
  });

  it("le studio lit chaque compétence et retrouve toutes les sections utiles (aucune renommée ou disparue)", async () => {
    const { skillDigest } = await import("@/lib/ai/skills");
    for (const s of SKILLS) {
      const d = skillDigest(s as any);
      expect(d, s).not.toBeNull();
      expect(d!.missing, s).toEqual([]);
      expect(d!.text.length, s).toBeGreaterThan(400);
    }
  });

  it("sélection automatique selon la demande, sans charger toutes les compétences", async () => {
    const { skillsFor, adIntent, skillReference } = await import("@/lib/ai/skills");
    expect(skillsFor(adIntent({ business: "products" }))).toEqual(["ad-creative", "image", "canvas-design", "brand-guidelines"]);
    expect(skillsFor(adIntent({ business: "services" }))).toEqual(["ads", "ad-creative", "image", "canvas-design", "brand-guidelines"]);
    expect(skillsFor("ad_visual")).toEqual(["image", "canvas-design", "brand-guidelines"]);
    expect(skillsFor(adIntent({ business: "products" }, "social"))).toEqual(["ad-creative", "image", "brand-guidelines"]);
    expect(skillsFor("banner")).toEqual(["image", "canvas-design", "ad-creative", "brand-guidelines"]);
    expect(skillsFor("ad_variation")).toEqual(["ad-creative", "brand-guidelines"]);
    const ref = skillReference("service_ad");
    // Sections choisies seulement (jamais les fichiers entiers), et jamais la palette d'exemple d'Anthropic.
    expect(ref.length).toBeLessThan(26000);
    expect(ref).not.toMatch(/#d97757/i);
    expect(ref).toMatch(/les règles du studio et de cette demande priment/);
  });
});

describe("Les consignes arrivent jusqu'au modèle", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { realAdDeps } = await import("@/lib/ads-v2/deps");
  const u = await createUser(`skills-${Date.now()}@test.fr`, "motdepasse-test", "S");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("publicité produit : ad-creative, image, canvas-design, brand-guidelines dans la requête envoyée", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    sent.length = 0;
    await fr(() => realAdDeps(null, p, true).writeCopy("Tu rédiges des publicités.", "Écris 1 concept.", `skills-prod-${Date.now()}`).catch(() => null));
    expect(sent.length).toBeGreaterThan(0);
    const body = textOf(sent[0]);
    expect(body).toContain('<skills names=\\"ad-creative,image,canvas-design,brand-guidelines\\">');
    expect(body).toContain("Writing Quality Standards");
    expect(body).toContain("Prompting Basics");
    expect(body).not.toContain("Skill « ads »");
  });

  it("publicité d'une entreprise de services : la compétence ads s'ajoute", async () => {
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    sent.length = 0;
    await fr(() => realAdDeps(null, p, true).writeCopy("Tu rédiges des publicités.", "Écris 1 concept.", `skills-svc-${Date.now()}`).catch(() => null));
    const body = textOf(sent[0]);
    expect(body).toContain('<skills names=\\"ads,ad-creative,image,canvas-design,brand-guidelines\\">');
    expect(body).toContain("Ad Copy Frameworks");
  });

  it("visuel publicitaire : le brief d'image reçoit image, canvas-design et brand-guidelines ; une image du site non", async () => {
    const { aiImageBrief } = await import("@/lib/ai/tasks");
    const { brandPhotoLine } = await import("@/lib/engine/images");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    sent.length = 0;
    await fr(() => aiImageBrief({ userId: u.id, projectId: p.id, usageKey: `skills-vis-${Date.now()}` }, p, "visuel publicitaire", { line: brandPhotoLine(p), format: "4:5", skills: "ad_visual" }).catch(() => null));
    expect(textOf(sent[0])).toContain('<skills names=\\"image,canvas-design,brand-guidelines\\">');
    sent.length = 0;
    await fr(() => aiImageBrief({ userId: u.id, projectId: p.id, usageKey: `skills-site-${Date.now()}` }, p, "mise en scène produit", { line: brandPhotoLine(p), format: "4:5 HD" }).catch(() => null));
    expect(textOf(sent[0])).not.toContain("<skills");
  });

  it("une tâche hors publicité (rédaction d'un texte) ne reçoit aucune compétence", async () => {
    const { llmText } = await import("@/lib/ai/llm");
    sent.length = 0;
    await llmText({ task: "copywriting", userId: u.id, system: "Tu es rédacteur.", prompt: "Un mot.", usageKey: `skills-none-${Date.now()}` }).catch(() => null);
    expect(textOf(sent[0])).not.toContain("<skills");
  });
});
