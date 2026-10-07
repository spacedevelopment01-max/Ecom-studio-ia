/**
 * Logo avec l'IA : le symbole dessiné par l'IA d'images est vectorisé (une couleur, trous gardés) puis passe les
 * mêmes contrôles que les autres symboles ; une image vide ou pleine est écartée.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { traceSymbol } from "@/lib/media/trace-symbol";
import { fitSymbol, sanitizeSymbolSvg, symbolLegibility } from "@/lib/media/logo-symbol";

const png = (inner: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#f4f1ea"/>${inner}</svg>`)).png().toBuffer();

describe("symbole de l'IA d'images vectorisé", () => {
  it("forme pleine avec un trou : SVG d'une couleur, accepté et lisible en petit", async () => {
    const r = await traceSymbol(await png(`<circle cx="512" cy="560" r="300" fill="#2a2a2a"/><circle cx="512" cy="560" r="140" fill="#f4f1ea"/><rect x="300" y="100" width="90" height="300" rx="45" fill="#2a2a2a"/><rect x="634" y="100" width="90" height="300" rx="45" fill="#2a2a2a"/>`));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.svg).toMatch(/fill-rule="evenodd"/);
    const clean = sanitizeSymbolSvg(r.svg, { maxShapes: 3 });
    expect(clean.ok).toBe(true);
    if (clean.ok) expect(symbolLegibility(fitSymbol(clean.symbol, 0.04)).ok).toBe(true);
  });
  it("image sans dessin ou entièrement remplie : écartée", async () => {
    expect((await traceSymbol(await png(""))).ok).toBe(false);
    expect((await traceSymbol(await png(`<rect width="1024" height="1024" fill="#111"/>`))).ok).toBe(false);
  });
});
