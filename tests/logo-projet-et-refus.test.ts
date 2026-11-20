/**
 * Le dessinateur du logo voit tous les logos déjà construits pour CE projet, et reçoit ce que le client a dit de
 * l'image qu'il veut (essai réel du 20 novembre 2026 : un plombier refusait « la goutte d'eau et la clé à molette »,
 * ses trois logos portaient une goutte d'eau et étaient construits pareil). Sans IA.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("logos : ceux du projet montrés, les refus du client transmis", async () => {
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

  it("tous les logos déjà construits pour ce projet, et seulement lui, sont rendus dans l'ordre", async () => {
    const u = await account();
    const [p1, p2] = [`p-logos-a-${Date.now()}`, `p-logos-b-${Date.now()}`];
    for (const p of [p1, p2]) run("INSERT INTO projects(id,user_id,name,status,created_at,updated_at) VALUES(?,?,?,?,?,?)", p, u.id, "Essai", "active", Date.now(), Date.now());
    const png = (c: string) => sharp({ create: { width: 64, height: 64, channels: 3, background: c } }).png().toBuffer();
    await saveAsset({ projectId: p1, userId: u.id, data: await png("#ff0000"), name: "planche-A-logo.png", mime: "image/png", role: "brand-board", origin: "generated" } as never);
    await saveAsset({ projectId: p1, userId: u.id, data: await png("#00ff00"), name: "planche-B-hero.png", mime: "image/png", role: "brand-board", origin: "generated" } as never);
    await saveAsset({ projectId: p1, userId: u.id, data: await png("#0000ff"), name: "planche-B-logo.png", mime: "image/png", role: "brand-board", origin: "generated" } as never);
    await saveAsset({ projectId: p2, userId: u.id, data: await png("#ffff00"), name: "planche-A-logo.png", mime: "image/png", role: "brand-board", origin: "generated" } as never);
    expect(I.logosDuProjet(p1)).toHaveLength(2);
    expect(I.logosDuProjet(p2)).toHaveLength(1);
  });

  it("la consigne « complètement différent » vise aussi la disposition, et la chaîne transmet les goûts du client", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("const duProjet = logosDuProjet(o.who.projectId)");
    expect(img).toMatch(/y compris dans sa disposition : la place du signe, un trait ou un motif sous le nom, la façon de poser le nom changent aussi/);
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain.match(/gouts: j\.start\.image\?\.value \?\? null/g)).toHaveLength(2);
  });
});
