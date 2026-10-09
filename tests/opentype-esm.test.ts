/**
 * opentype.js 2 (version installée) : sa version ESM — celle que charge Next.js — n'a QUE des exports nommés.
 * L'ancien `import opentype from "opentype.js"` y valait undefined (« Attempted import error » au build) et
 * l'erreur était avalée : aucun glyphe manquant n'était jamais détecté. Ici, le module est forcé sur la version ESM.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("opentype.js", async () => await import(path.join(process.cwd(), "node_modules/opentype.js/dist/opentype.mjs")));

describe("opentype.js en ESM (comme dans Next.js)", async () => {
  const esm = await import("opentype.js");
  const { missingGlyphs, buildCandidate } = await import("@/lib/logo-v2/construct");
  const { buildLogoSvg } = await import("@/lib/media/logo");

  it("la version ESM n'a pas d'export par défaut ; `parse` est un export nommé", () => {
    expect(Object.keys(esm)).not.toContain("default");
    expect(typeof esm.parse).toBe("function");
    // Aucun fichier du studio n'utilise plus l'import par défaut.
    const offenders = ["src", "worker", "scripts"].flatMap((d) => (fs.readdirSync(d, { recursive: true }) as string[]).map((f) => path.join(d, f))).filter((f) => /\.(ts|tsx)$/.test(f) && /import\s+\w+\s+from\s+["']opentype\.js["']/.test(fs.readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("contrôle des glyphes réellement exécuté : nom accentué accepté, caractère absent détecté", () => {
    expect(missingGlyphs("Sébastien Blanc", "Inter", 700)).toEqual([]);
    expect(missingGlyphs("Thé 漢", "Inter", 700)).toEqual(["漢"]);
  });

  it("construction typographique et export SVG : nom exact, vectoriel", () => {
    const t = { id: "t1", name: "Signature", concept: "", whyItFits: "", markType: "wordmark", composition: "wordmark_only", typography: { style: "grotesque", weight: "bold", case: "title", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, sobriety: 1, construction: "typographic", symbolIdea: null, distinctive: "", avoid: [], source: "ai" } as any;
    const brief = { name: "Sébastien Blanc", descriptor: null, palette: { primary: "#1F4E79", secondary: "#E0A33A", accent: "#E0A33A", light: "#F6F3EE", dark: "#1A1A1A" }, fontsLocked: null } as any;
    const c = buildCandidate(t, brief, { family: "Inter", attempt: 0, symbol: null });
    const { svg, width, height } = buildLogoSvg(c.spec);
    expect(svg).toMatch(/<svg[\s\S]*<\/svg>\s*$/);
    expect(svg).not.toMatch(/<image/);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(c.spec.name).toBe("Sébastien Blanc");
  });
});
