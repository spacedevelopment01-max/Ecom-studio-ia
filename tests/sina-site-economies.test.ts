/** Le site, audit du 22 novembre 2026 : règles du propriétaire et petites économies, vérifiées sans aucun appel. */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import fs from "node:fs";
import { PHOTO_REVIEW_MODEL } from "@/lib/syna-agent/custom-theme/gallery";
import { SitePlanSchema } from "@/lib/syna-agent/custom-theme/brand";
import { bandesDeLaCapture } from "@/lib/syna-agent/custom-theme/shots";

describe("le site : relecture des photos, plan, regard en image", () => {
  it("chaque photo du site est relue par le modèle le plus fort, au niveau élevé (règle du propriétaire)", () => {
    expect(PHOTO_REVIEW_MODEL).toEqual({ provider: "anthropic", model: "claude-opus-5-5", effort: "high" });
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/gallery.ts", "utf8");
    expect(src).not.toMatch(/prefer: CHECK_MODEL/);
  });

  it("le plan des textes garde jusqu'à 90 sections (un site en a 43 à 70)", () => {
    const section = (n: number) => ({ uid: `s${n}`, message: "Un message clair.", titre: null, bouton: null, faits: [] });
    const r = SitePlanSchema.safeParse({ promesse: "Une promesse.", voix: "Une voix.", menu: [], sections: Array.from({ length: 70 }, (_, i) => section(i)) });
    expect(r.success).toBe(true);
  });

  it("le regard sur une page reçoit des bandes lisibles, de haut en bas, quatre au plus", async () => {
    const page = await sharp({ create: { width: 390, height: 3600, channels: 3, background: "#ffffff" } }).png().toBuffer();
    const bandes = await bandesDeLaCapture(page);
    expect(bandes).toHaveLength(3);
    for (const b of bandes) expect((await sharp(b).metadata()).width).toBe(390);
    const courte = await sharp({ create: { width: 390, height: 800, channels: 3, background: "#ffffff" } }).png().toBuffer();
    expect(await bandesDeLaCapture(courte)).toEqual([courte]);
  });

  it("les relectures servies une seule fois n'écrivent pas de mémoire d'une heure", () => {
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    for (const n of ["SITE_PLAN_SYSTEM", "COPY_REVIEW_SYSTEM", "PHOTO_REVIEW_SYSTEM"]) expect(brand).toContain(`teteUnique: true, system: educated(${n}`);
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/tools.ts", "utf8")).toMatch(/role === DESIGN_SYSTEM \? \{\} : \{ teteUnique: true \}/);
  });
});

describe("le site : photos créées trois à la fois", () => {
  it("chaque photo est lancée dans l'ordre, trois au plus en même temps, et toutes sont attendues", async () => {
    const { enMemeTemps, PHOTOS_EN_MEME_TEMPS } = await import("@/lib/syna-agent/custom-theme/brand");
    expect(PHOTOS_EN_MEME_TEMPS).toBe(3);
    const debut: number[] = [], fin: number[] = [];
    let actives = 0, max = 0;
    await enMemeTemps([0, 1, 2, 3, 4, 5, 6], 3, async (i) => {
      debut.push(i); actives++; max = Math.max(max, actives);
      await new Promise((r) => setTimeout(r, 5 + (i % 3) * 5));
      actives--; fin.push(i);
    });
    expect(debut).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(max).toBe(3);
    expect([...fin].sort()).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});
