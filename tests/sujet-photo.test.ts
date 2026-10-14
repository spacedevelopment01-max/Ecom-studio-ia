/**
 * Sujet de la photo publicitaire (le produit) repéré pour la mise en page : le texte, le bouton et la carte d'atouts
 * se posent à côté du produit, jamais dessus. Fond flou ou uni, produit net : le sujet est la zone la plus détaillée.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

/** Photo de test : fond dégradé flou, objet net à damier (le « produit ») en bas à droite. */
async function photo(): Promise<Buffer> {
  const W = 800, H = 1200;
  const bg = await sharp({ create: { width: W, height: H, channels: 3, background: "#cfc6b8" } })
    .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8e4dc"/><stop offset="1" stop-color="#b8a890"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`) }])
    .blur(8)
    .png()
    .toBuffer();
  const cells: string[] = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if ((x + y) % 2) cells.push(`<rect x="${x * 40}" y="${y * 40}" width="40" height="40" fill="#111"/>`);
  const obj = Buffer.from(`<svg width="320" height="320"><rect width="320" height="320" fill="#c0c0c0"/>${cells.join("")}</svg>`);
  return sharp(bg).composite([{ input: obj, left: 420, top: 760 }]).jpeg({ quality: 92 }).toBuffer();
}

describe("sujet de la photo et mise en page", async () => {
  const { subjectBox } = await import("@/lib/ads-v2/library/kit");

  it("repère le produit net sur un fond flou", async () => {
    const b = (await subjectBox(await photo()))!;
    expect(b).toBeTruthy();
    // Objet : u 0.525–0.925, v 0.633–0.9 (à une cellule près).
    expect(b.u0).toBeGreaterThan(0.4);
    expect(b.v0).toBeGreaterThan(0.5);
    expect(b.u1).toBeGreaterThan(0.85);
    expect(b.v1).toBeGreaterThan(0.85);
  });

  it("photo unie : aucun sujet inventé", async () => {
    const plain = await sharp({ create: { width: 400, height: 400, channels: 3, background: "#808080" } }).jpeg().toBuffer();
    expect(await subjectBox(plain)).toBeNull();
  });

  it("bouton, titre et carte d'atouts ne recouvrent pas le produit", async () => {
    const { createUser } = await import("@/lib/auth");
    const { loadProject } = await import("@/lib/projects");
    const { saveAsset } = await import("@/lib/library");
    const { composePoster } = await import("@/lib/ads-v2/poster");
    const { runWithLang } = await import("@/lib/i18n-server");
    const { seedImageFixture } = await import("./image-v2-fixtures");
    const u = await createUser(`sujet-${Date.now()}@test.fr`, "motdepasse-test", "S");
    const p = loadProject(seedImageFixture(u.id, "hightech"));
    const bg = await saveAsset({ projectId: p.id, userId: u.id, data: await photo(), name: "scene.jpg", mime: "image/jpeg", role: "scene", origin: "generated", meta: {} });
    const box = (await subjectBox(await photo()))!;
    for (const layout of ["editorial-corner", "feature-card"]) {
      const r = await runWithLang({ ui: "fr", content: "fr" }, () => composePoster(p, { aspect: "4:5", headline: "Le son, sans détour.", subline: "Casque audio", eyebrow: null, cta: "Découvrir", background: bg, features: ["Supra-auriculaire", "Coques argentées", "Arceau rembourré"], layout: `tpl:${layout}`, seed: "sujet", variant: { treatment: "natural" } }));
      const doc = r.doc;
      // Produit sur l'affiche (photo « cover » centrée, 1080 × 1350).
      const s = Math.max(doc.width / 800, doc.height / 1200);
      const ox = (doc.width - 800 * s) / 2, oy = (doc.height - 1200 * s) / 2;
      const z = { x: ox + box.u0 * 800 * s, y: oy + box.v0 * 1200 * s, w: (box.u1 - box.u0) * 800 * s, h: (box.v1 - box.v0) * 1200 * s };
      for (const l of doc.layers.filter((l: any) => l.kind === "button" || l.name === "Carte" || l.role === "headline")) {
        const w = Math.min(l.x + l.w, z.x + z.w) - Math.max(l.x, z.x);
        const h = Math.min(l.y + l.h, z.y + z.h) - Math.max(l.y, z.y);
        const part = w > 0 && h > 0 ? (w * h) / (l.w * l.h) : 0;
        expect(part, `${layout} : ${l.name ?? l.kind}`).toBeLessThan(0.2);
      }
    }
  }, 120_000);
});
