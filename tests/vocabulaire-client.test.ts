/** Consigne de vocabulaire donnée une fois (« montre », jamais « chronographe ») : gardée et appliquée à chaque création. */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Vocabulaire du client", async () => {
  const { applyWording, addWordingRule, loadWordingRules } = await import("@/lib/client-wording");
  const { designPostWithAi } = await import("@/lib/social-v2/ai-post");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const rules = [{ avoid: "chronographe", use: "montre" }];

  it("remplace le mot entier en gardant la casse, sans doublon", () => {
    expect(applyWording("Chronographe acier et cuir", rules)).toBe("Montre acier et cuir");
    expect(applyWording("Montre chronographe : cadran noir", rules)).toBe("Montre : cadran noir");
    expect(applyWording("CHRONOGRAPHES", rules)).toBe("MONTRES");
    expect(applyWording("chronographique", rules)).toBe("chronographique");
  });

  it("enregistrée dans la mémoire du projet et appliquée aux textes et à la consigne de l'image", async () => {
    const u = await createUser(`voc-${Date.now()}@test.fr`, "motdepasse-test", "V");
    const pid = seedImageFixture(u.id, "cosmetic");
    addWordingRule(pid, { avoid: "sérum", use: "soin" });
    expect(loadWordingRules(pid)).toEqual([{ avoid: "sérum", use: "soin" }]);
    const png = await sharp({ create: { width: 40, height: 50, channels: 3, background: "#777" } }).png().toBuffer();
    const ref = await saveAsset({ projectId: pid, userId: u.id, data: png, name: "r.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: {} });
    const seen: { prompt: string; texts: string[] } = { prompt: "", texts: [] };
    const deps = {
      generate: async (prompt: string) => ((seen.prompt = prompt), png),
      review: async (_i: Buffer, _r: Buffer | null, texts: string[]) => ((seen.texts = texts), { transcribed: texts, person: false, anatomyOk: true, productFaithful: true, textsExact: true, legible: true, score: 9, issues: [], fix: "" }),
      spentMicro: () => 0,
      maxMicro: () => 10_000,
    };
    const post = { id: "voc", network: "instagram", format: "image", title: "Le sérum du matin", headline: "Le sérum du matin", caption: "", pillar: null, objective: "convert", scheduled_at: null } as any;
    const r = await runWithLang({ ui: "fr", content: "fr" }, () => designPostWithAi(loadProject(pid), post, { aspect: "4:5", maxCostEur: 1, reference: ref.id, as: "ad" }, deps as any));
    expect(r.assetId).toBeTruthy();
    expect(seen.texts.join(" ")).toContain("Le soin du matin");
    // Textes du visuel (le nom de la marque, propre au client, n'est jamais réécrit).
    expect(seen.texts.slice(0, 3).join(" | ")).not.toMatch(/sérum/i);
    expect(seen.prompt).toContain('say "soin", never "sérum"');
  });
});
