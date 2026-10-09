/**
 * opentype.js chargé comme dans le worker et les scripts (Node ESM via tsx → version CommonJS) : seul l'export par
 * défaut existe. Le contrôle des glyphes doit fonctionner aussi (voir opentype-esm.test.ts pour la forme Next.js).
 */
import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

vi.mock("opentype.js", () => ({ default: createRequire(import.meta.url)("opentype.js") }));

describe("opentype.js en CommonJS (worker, scripts)", async () => {
  const { missingGlyphs } = await import("@/lib/logo-v2/construct");
  it("contrôle des glyphes réellement exécuté avec l'export par défaut seul", () => {
    expect(missingGlyphs("Sébastien Blanc", "Inter", 700)).toEqual([]);
    expect(missingGlyphs("Thé 漢", "Inter", 700)).toEqual(["漢"]);
  });
});
