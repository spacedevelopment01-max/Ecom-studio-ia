/**
 * Panne de transparence (21 novembre 2026) : des photos créées avec des images jointes revenaient d'OpenAI en partie
 * transparentes (brume blanche ou taches sombres). Toute photo est demandée en fond plein ; un contrôle sans IA refuse
 * une photo transparente avant de payer sa relecture. Aucun appel payant.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { openaiBackground } from "../src/lib/ai/openai-images";
import { photoTransparente, PART_TRANSPARENTE_MAX } from "../src/lib/syna-agent/brand-images";

const plein = () => sharp({ create: { width: 200, height: 100, channels: 3, background: "#336699" } }).png().toBuffer();
/** Une photo dont une bande (part donnée) est à moitié transparente, comme la brume rendue par OpenAI. */
async function brume(part: number) {
  const w = 200, h = 100, data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = 51; data[i * 4 + 1] = 102; data[i * 4 + 2] = 153; data[i * 4 + 3] = i < w * h * part ? 120 : 255; }
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

describe("photos pleines", () => {
  it("le fond plein est demandé à OpenAI pour toute photo ; seul le logo garde un fond retirable", () => {
    expect(openaiBackground({ transparentCap: true })).toEqual({ background: "opaque" });
    expect(openaiBackground({ transparentCap: false })).toEqual({ background: "opaque" });
    expect(openaiBackground({ transparentCap: true, logo: true })).toEqual({});
    expect(openaiBackground({ transparent: true, transparentCap: true })).toEqual({ background: "transparent", output_format: "png" });
    expect(openaiBackground({ transparent: true, transparentCap: false })).toEqual({});
    // Chaque demande de photo du moteur passe par ce réglage, y compris la retouche avec images jointes.
    const src = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    const edits = src.match(/openaiImage\(client, "edit"[\s\S]*?\}, sent\)/g) ?? [];
    expect(edits.length).toBeGreaterThanOrEqual(4);
    for (const e of edits) expect(e).toMatch(/openaiBackground|\.\.\.background/);
  });

  it("contrôle sans IA : une photo pleine passe, une photo en partie transparente est refusée", async () => {
    expect(await photoTransparente(await plein())).toEqual({ transparente: false, part: 0 });
    expect((await photoTransparente(await brume(1))).transparente).toBe(true);
    const r = await photoTransparente(await brume(0.2));
    expect(r.transparente).toBe(true);
    expect(r.part).toBeCloseTo(0.2, 2);
    // Une couche de transparence toute pleine (fréquent dans un PNG) n'est pas un défaut ; un pixel isolé non plus.
    expect((await photoTransparente(await brume(0))).transparente).toBe(false);
    expect((await photoTransparente(await brume(PART_TRANSPARENTE_MAX / 2))).transparente).toBe(false);
  });

  it("la planche : seul le logo déjà relu (méthode des graphistes) est posé sur ce qui le porte, et une photo transparente est refusée sans relecture payée", () => {
    const src = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    const pose = src.indexOf("const logo = currentLogo();"), porteurs = src.indexOf('await make("object", { logo }');
    expect(src).toContain('wanted.delete("logo");');
    expect(pose).toBeGreaterThan(0);
    expect(porteurs).toBeGreaterThan(pose);
    const controle = src.indexOf("await photoTransparente(png)"), relecture = src.indexOf("ai.look(`imagecheck-");
    expect(controle).toBeGreaterThan(0);
    expect(relecture).toBeGreaterThan(controle);
  });
});
