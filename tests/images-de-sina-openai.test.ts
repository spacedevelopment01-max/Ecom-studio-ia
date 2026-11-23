/**
 * TOUTES LES IMAGES DE SINA PAR OPENAI (CLAUDE.md : « Images créées par OpenAI pour tout ce que fait SINA » ; 23 novembre
 * 2026, essai de Nadia : le réglage commun des images désignait Qwen-Image 3.0 Pro, et une alerte « Qwen inutilisable »
 * était levée à chaque image de planche faite par OpenAI). Fournisseurs simulés : aucune clé réelle, aucun appel.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-images-sina-"));
});
let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

describe("images de SINA : OpenAI seulement", async () => {
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const mp = await import("@/lib/ai/media-providers");
  const { avecLOutilDuClient } = await import("@/lib/ai/social-image-policy");
  const { routeDesImagesDeSina } = await import("@/lib/ai/media-routing");
  const { boardImageRoute } = await import("@/lib/syna-agent/brand-images");
  const { mockupImageRoute } = await import("@/lib/syna-agent/mockup-code/tools");
  const { runWithLang } = await import("@/lib/i18n-server");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  beforeEach(() => {
    keys = { openai: "sk-openai-test-123456", alibaba: "sk-alibaba-test-123456", google: "cle-google-test-123456" };
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices", "ai.media.usage"]) setJsonSetting(k, {});
    // Le réglage commun des images désigne Qwen (le cas de l'essai de Nadia), le secours Gemini.
    setJsonSetting("ai.routes", { image_generation: { provider: "alibaba", model: "qwen-image-3.0-pro" } });
    setJsonSetting("ai.media.backup", { image: "google:gemini-2.5-flash-image" });
    setJsonSetting("syna.mockup.image_route", "openai:gpt-image-2.6-flare");
  });

  it("le réglage commun désigne Qwen : les décors, ambiances, publicités et images produit de SINA partent quand même chez OpenAI", () => {
    for (const usage of ["scene", "ad_visual", "product_image", "social_image"] as const) {
      const r = fr(() => mp.mediaRouteFor(usage, {}));
      expect(r?.provider, usage).toBe("openai");
    }
  });

  it("une route confirmée par devis hors d'OpenAI est refusée (jamais remplacée en silence), sauf l'outil choisi par le client lui-même", () => {
    const qwen = { provider: "alibaba", model: "qwen-image-3.0-pro" };
    expect(fr(() => mp.withQuotedImageRoute(qwen, () => mp.routeMedia("image_generation", undefined, { usage: "scene" })))).toBeNull();
    // Atelier, « On le fait ensemble » ou « Je fais moi-même » : le client a choisi son outil.
    const choisi = fr(() => avecLOutilDuClient(() => mp.mediaRouteFor("scene", {})));
    expect(choisi?.provider).toBe("alibaba");
  });

  it("la route des images de SINA reste chez OpenAI même si le réglage en ligne en désigne un autre", () => {
    setJsonSetting("syna.mockup.image_route", "alibaba:qwen-image-3.0-pro");
    for (const r of [routeDesImagesDeSina(), boardImageRoute(), mockupImageRoute()]) expect(r).toEqual({ provider: "openai", model: "gpt-image-2.6-flare" });
    setJsonSetting("syna.mockup.image_route", "openai:gpt-image-2");
    expect(boardImageRoute()).toEqual({ provider: "openai", model: "gpt-image-2" });
  });
});
