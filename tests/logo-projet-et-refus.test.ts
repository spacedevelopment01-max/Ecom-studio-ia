/**
 * Le dessinateur du logo voit seulement les logos de la série en cours (règle du propriétaire), et reçoit ce que le client a dit de
 * l'image qu'il veut (essai réel du 20 novembre 2026 : un plombier refusait « la goutte d'eau et la clé à molette »,
 * ses trois logos portaient une goutte d'eau et étaient construits pareil). Sans IA.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("logos : seulement ceux de la série en cours montrés, les refus du client transmis", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const { saveAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  const imagery = { look: "calme", logo: "Ce qu'il faut savoir de la marque.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;

  it("les mots du client sur l'image voulue vont au dessinateur du logo, et le dessin reste libre", () => {
    const p = I.imagePrompt("logo", route("A") as never, imagery, { logo: true, gouts: "Il ne veut surtout pas : une goutte d'eau, une clé à molette." });
    expect(p).toMatch(/Ce que le client a dit de l'image qu'il veut, avec ses mots, à respecter \(surtout ce qu'il refuse\) : « Il ne veut surtout pas : une goutte d'eau, une clé à molette\. »/);
    expect(p).toMatch(/Tu es totalement libre du dessin/);
    expect(I.imagePrompt("logo", route("A") as never, imagery)).not.toMatch(/Ce que le client a dit/);
  });

  it("la consigne « complètement différent » vise aussi la disposition, et la chaîne transmet les goûts du client", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("const already = o.madeLogos ?? [], shown = await logoSheet(already);");
    expect(img).not.toContain("logosDuProjet");
    expect(img).toMatch(/y compris dans sa disposition : la place du signe, un trait ou un motif sous le nom, la façon de poser le nom changent aussi/);
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain.match(/gouts: j\.start\.image\?\.value \?\? null/g)).toHaveLength(2);
  });
});
