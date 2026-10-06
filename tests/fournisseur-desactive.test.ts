/** « Désactiver » un fournisseur dans l'administration coupe vraiment ses appels, même avec une clé venant de l'environnement. */
import { afterEach, describe, expect, it } from "vitest";
import { setSetting } from "@/lib/settings";
import { activeProviderKey } from "@/lib/ai/config";
import { llmConfigured } from "@/lib/ai/llm";
import { imageProviderAvailable } from "@/lib/ai/media-providers";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
  for (const p of ["anthropic", "openai", "google"]) setSetting(`provider.${p}.disabled`, null);
});

describe("fournisseur d'IA désactivé", () => {
  it("clé dans l'environnement (secret Codespaces) + « Désactiver » : plus aucun appel", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.OPENAI_API_KEY = "sk-test";
    expect(activeProviderKey("anthropic")).toBe("sk-ant-test");
    expect(llmConfigured()).toBe(true);
    setSetting("provider.anthropic.disabled", "1");
    setSetting("provider.openai.disabled", "1");
    expect(activeProviderKey("anthropic")).toBeNull();
    expect(llmConfigured()).toBe(false);
    expect(imageProviderAvailable()).toBeNull();
  });
});
