/**
 * Déclinaison d'une photo portrait en carré ou en paysage : quand le sujet (bouquet, produit) occupe le centre et
 * tomberait sous le texte, la photo passe en panneau d'un côté, entière autour du sujet, et le texte, le bouton et la
 * signature s'installent sur l'aplat de l'autre côté. Un sujet bas (casque posé) garde la photo en plein cadre.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

/** Photo portrait 9:16 : fond flou, objet net à damier centré à la hauteur `top` (en part de la hauteur). */
async function photo(top: number, size = 520): Promise<Buffer> {
  const W = 720, H = 1280;
  const bg = await sharp({ create: { width: W, height: H, channels: 3, background: "#6b5a48" } }).blur(8).png().toBuffer();
  const cells: string[] = [];
  const c = size / 8;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) cells.push(`<rect x="${x * c}" y="${y * c}" width="${c}" height="${c}" fill="#b01a2a"/>`);
  const obj = Buffer.from(`<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#f2e6c8"/>${cells.join("")}</svg>`);
  return sharp(bg).composite([{ input: obj, left: Math.round((W - size) / 2), top: Math.round(H * top) }]).jpeg({ quality: 92 }).toBuffer();
}

const overlap = (a: any, b: any) => {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? (w * h) / (a.w * a.h) : 0;
};

describe("panneau photo des déclinaisons", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { composePoster } = await import("@/lib/ads-v2/poster");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const u = await createUser(`panneau-${Date.now()}@test.fr`, "motdepasse-test", "P");
  const p = loadProject(seedImageFixture(u.id, "hightech"));
  const compose = async (img: Buffer, aspect: string) => {
    const bg = await saveAsset({ projectId: p.id, userId: u.id, data: img, name: "scene.jpg", mime: "image/jpeg", role: "scene", origin: "generated", meta: {} });
    return (await runWithLang({ ui: "fr", content: "fr" }, () => composePoster(p, { aspect: aspect as never, headline: "Le bouquet prend forme.", subline: "Fleurs de saison • Bouquet du jour", eyebrow: null, cta: "Nous contacter", background: bg, features: [], layout: "tpl:editorial-corner", seed: "panneau", variant: { treatment: "natural" } }))).doc;
  };

  it("sujet au centre : photo en panneau, texte et bouton sur l'aplat", async () => {
    const img = await photo(0.3);
    for (const aspect of ["1:1", "16:9", "1.91:1"]) {
      const doc = await compose(img, aspect);
      const ph = doc.layers.find((l: any) => l.kind === "image" && l.role !== "logo")!;
      expect(ph.w, aspect).toBeLessThan(doc.width * 0.6);
      expect(ph.h).toBe(doc.height);
      for (const l of doc.layers.filter((l: any) => l.kind === "text" || l.kind === "button" || l.role === "logo")) expect(overlap(l, ph), `${aspect} : ${l.name}`).toBe(0);
      // Le bouton et la signature ne se chevauchent pas.
      const btn = doc.layers.find((l: any) => l.kind === "button")!;
      const sig = doc.layers.find((l: any) => l.role === "logo" || l.name === "Marque");
      if (sig) expect(overlap(btn, sig), aspect).toBe(0);
      // Aucun voile ne ternit la photo du panneau.
      for (const v of doc.layers.filter((l: any) => l.role === "scrim")) expect(v.w * v.h).toBe(0);
    }
  }, 120_000);

  it("sujet bas (produit posé) : la photo reste en plein cadre", async () => {
    const doc = await compose(await photo(0.78, 260), "1:1");
    const ph = doc.layers.find((l: any) => l.kind === "image" && l.role !== "logo")!;
    expect(ph.w).toBe(doc.width);
  }, 60_000);

  it("ligne en capitales : le séparateur ne commence jamais une ligne", async () => {
    const doc = await compose(await photo(0.3), "1:1");
    const sub = doc.layers.find((l: any) => l.id === "subline") as any;
    expect(sub.text).toMatch(/ • /);
    expect(sub.text).not.toMatch(/ • /);
  }, 60_000);
});
