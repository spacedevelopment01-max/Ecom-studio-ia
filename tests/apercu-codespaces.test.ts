import { afterEach, describe, expect, it } from "vitest";
import { PREVIEW_SANDBOX_CSP, previewCsp, previewIsolated, previewSandbox } from "@/lib/theme/preview-access";

const saved = { cs: process.env.CODESPACES, iso: process.env.PREVIEW_ISOLATION };
afterEach(() => {
  for (const [k, v] of [["CODESPACES", saved.cs], ["PREVIEW_ISOLATION", saved.iso]] as const) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("aperçu de boutique et hébergement", () => {
  it("cloisonnement strict par défaut (origine opaque)", () => {
    delete process.env.CODESPACES;
    delete process.env.PREVIEW_ISOLATION;
    expect(previewIsolated()).toBe(true);
    expect(previewSandbox()).not.toContain("allow-same-origin");
    expect(previewCsp()).toBe(PREVIEW_SANDBOX_CSP);
    expect(previewCsp("allow-scripts")).toBe("sandbox allow-scripts; frame-ancestors 'self'");
  });

  it("Codespaces : origine opaque, ressources embarquées et pont de transport séparé", () => {
    process.env.CODESPACES = "true";
    delete process.env.PREVIEW_ISOLATION;
    expect(previewIsolated()).toBe(true);
    expect(previewSandbox()).not.toContain("allow-same-origin");
    expect(previewCsp()).not.toContain("allow-same-origin");
    expect(previewCsp("allow-scripts")).toBe("sandbox allow-scripts; frame-ancestors 'self'");
  });

  it("un ancien réglage off ne peut plus retirer le cloisonnement", () => {
    process.env.CODESPACES = "true";
    process.env.PREVIEW_ISOLATION = "on";
    expect(previewIsolated()).toBe(true);
    delete process.env.CODESPACES;
    process.env.PREVIEW_ISOLATION = "off";
    expect(previewIsolated()).toBe(true);
  });
});
