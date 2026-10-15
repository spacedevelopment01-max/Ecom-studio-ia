/**
 * Logo fourni par le client : le studio en tire son vrai symbole (jamais une simple initiale), un fond transparent et
 * les couleurs mesurées dans le logo (jamais celles d'une direction étrangère au logo).
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("logo fourni par le client", async () => {
  const { createUser } = await import("@/lib/auth");
  const { saveAsset, assetData, getAsset } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { deriveClientLogo } = await import("@/lib/engine/client-logo");
  const { knockoutBackground } = await import("@/lib/logo-v2/identity");

  // Logo d'essai : cadran rond (symbole) au-dessus du nom et d'une signature, sur un fond crème opaque.
  const logo = () =>
    sharp({ create: { width: 800, height: 800, channels: 3, background: "#FDFBF6" } })
      .composite([
        { input: Buffer.from(`<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg"><circle cx="400" cy="230" r="150" fill="none" stroke="#1E2125" stroke-width="10"/><text x="400" y="290" font-size="200" text-anchor="middle" font-family="serif" fill="#1E2125">A</text><line x1="400" y1="230" x2="510" y2="170" stroke="#9E5E25" stroke-width="12"/><rect x="200" y="470" width="400" height="60" fill="#1E2125"/><rect x="290" y="570" width="220" height="22" fill="#1E2125"/><rect x="310" y="630" width="180" height="16" fill="#9E5E25"/></svg>`) },
      ])
      .png()
      .toBuffer();

  it("fond crème rendu transparent ; un logo déjà détouré reste tel quel", async () => {
    const out = await knockoutBackground(await logo());
    const { data } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0); // coin : transparent
    const already = await sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    expect(await knockoutBackground(already)).toBe(already);
  });

  it("symbole découpé dans le logo du client, couleurs tirées du logo", async () => {
    const u = await createUser(`cl-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    const upload = await saveAsset({ projectId: pid, userId: u.id, data: await logo(), name: "logo.png", mime: "image/png", kind: "image", role: "logo", folderKey: "brand.logos", origin: "upload", meta: { provided: true } });
    const set = await deriveClientLogo(pid, u.id, upload);
    expect(set.symbolFromLogo).toBe(true);
    // Le symbole est le cadran (carré, plus haut que les lignes de texte), pas le logo entier ni une lettre.
    const mark = await sharp(assetData(getAsset(set.markId)!)).metadata();
    expect(mark.width).toBe(mark.height);
    // Couleurs mesurées (à quelques nuances près, bords lissés) : noir du logo et cognac de l'aiguille.
    const near = (a: string | undefined, b: string) => { const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16)); const [p, q] = [h(a ?? "#000000"), h(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 12; };
    expect(near(set.palette?.dark, "#1E2125")).toBe(true);
    expect(near(set.palette?.primary, "#9E5E25")).toBe(true);
    // Le fichier du client est gardé tel quel ; les déclinaisons pointent vers lui ; refait une seule fois.
    expect(getAsset(upload.id)!.origin).toBe("upload");
    const again = await deriveClientLogo(pid, u.id, upload);
    expect(again.mainId).toBe(set.mainId);
    expect(again.markId).toBe(set.markId);
  });
});
