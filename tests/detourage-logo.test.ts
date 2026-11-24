/**
 * Le fond du logo retiré par le Studio, sans IA (décision du propriétaire du 23 novembre 2026 : plus aucune consigne de
 * fond au dessinateur). Fond uni de n'importe quelle couleur, creux des lettres compris ; fond texturé : repli honnête.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

const D = await import("@/lib/media/detourage-logo");
const I = await import("@/lib/syna-agent/brand-images");

/** Un « o » : un anneau d'encre sur un fond donné. */
const anneau = (fond: string, encre: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="${fond}"/><circle cx="200" cy="150" r="80" fill="none" stroke="${encre}" stroke-width="36"/></svg>`)).png().toBuffer();
const px = async (png: Buffer, x: number, y: number) => { const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const i = (y * info.width + x) * 4; return [...data.subarray(i, i + 4)]; };
const centre = async (png: Buffer) => { const m = await sharp(png).metadata(); return px(png, Math.floor(m.width! / 2), Math.floor(m.height! / 2)); };

describe("détourage du logo par le Studio", () => {
  it("fond blanc, crème ou coloré uni : retiré, creux de la lettre compris ; l'encre reste", async () => {
    for (const fond of ["#FFFFFF", "#F3E9DA", "#2B4C8C"]) {
      const d = await D.detourerLeLogo(await anneau(fond, fond === "#2B4C8C" ? "#F5C542" : "#1E2A44"));
      expect(d.ok, fond).toBe(true);
      if (!d.ok) continue;
      expect((await px(d.png, 0, 0))[3], `${fond} : coin`).toBe(0);
      expect((await centre(d.png))[3], `${fond} : creux du « o »`).toBe(0);
      expect(d.fond).toBe("uni");
    }
  });

  it("lettres claires sur un fond foncé : le fond est retiré et le dessin prend l'encre de la marque, pour une page claire", async () => {
    const d = await D.detourerLeLogo(await anneau("#141414", "#FFFFFF"), { encre: "#3A1F2B" });
    expect(d.ok && d.fonce).toBe(true);
    if (d.ok) {
      const m = await sharp(d.png).metadata();
      // Un point de l'anneau (en haut, au milieu du trait).
      const top = await sharp(d.png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      let encre = 0;
      for (let i = 0; i < top.data.length; i += 4) if (top.data[i + 3] > 200 && top.data[i] === 0x3a && top.data[i + 1] === 0x1f && top.data[i + 2] === 0x2b) encre++;
      expect(encre).toBeGreaterThan(m.width! * 2);
    }
  });

  it("fond texturé, dégradé ou décor : le Studio ne sait pas le retirer proprement, il le dit (repli honnête)", async () => {
    const w = 300, h = 200, bruit = Buffer.alloc(w * h * 3);
    for (let i = 0; i < bruit.length; i++) bruit[i] = (i * 7919) % 256;
    const texture = await sharp(bruit, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer();
    const d = await D.detourerLeLogo(texture);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.raison).toMatch(/pas uni/);
    const r = await I.logoDetoure(texture);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/^son fond ne peut pas être retiré proprement \(son fond n'est pas uni/);
  });

  it("fond déjà transparent : gardé ; le blanc enfermé dans le dessin est retiré", async () => {
    const opaque = await anneau("#FFFFFF", "#1E2A44");
    const { data, info } = await sharp(opaque).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // Seul le fond relié au bord est transparent (comme un logo nettoyé depuis ses bords) ; le creux reste blanc.
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) { const r = Math.hypot(x - 200, y - 150), i = (y * info.width + x) * 4; if (r > 100) data[i + 3] = 0; }
    const d = await D.detourerLeLogo(await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer());
    expect(d.ok && d.fond).toBe("transparent");
    if (d.ok) expect((await centre(d.png))[3]).toBe(0);
  });

  it("un logo fini rendu sur un fond coloré : son fond est retiré, il est relu sur blanc, et sa version claire n'a pas de carré autour", async () => {
    // Méthode des graphistes : le logo fini est détouré (logoDetoure), relu posé sur blanc, et posé sur la planche avec
    // sa version claire (poserSurLaPlanche).
    const d = await I.logoDetoure(await anneau("#E8D9C4", "#1E2A44"));
    expect(d.ok).toBe(true);
    const net = (d as { ok: true; png: Buffer }).png;
    expect(await px(await I.onWhite(net), 0, 0)).toEqual([255, 255, 255, 255]);
    for (const m of [net, await I.lightLogo(net)]) { expect((await px(m, 0, 0))[3]).toBe(0); expect((await centre(m))[3]).toBe(0); }
  });
});
