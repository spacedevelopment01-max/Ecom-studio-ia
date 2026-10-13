/**
 * Logo bien visible sur les publicités et publications : il signe la création (au moins ~8 % de la largeur en
 * hauteur sur les formats carré et portrait quand la place le permet), sans jamais chevaucher le texte ni le bouton.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("logo agrandi sur les images", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeAd } = await import("@/lib/ads-v2/compose");
  const { adArt } = await import("@/lib/ads-v2/art");
  const { TEMPLATES } = await import("@/lib/ads-v2/library");
  const { brandTypo, palette } = await import("@/lib/engine/images");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockImage } = await import("./image-v2-mock");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`logo-${Date.now()}@test.fr`, "motdepasse-test", "L");
  const p = loadProject(seedImageFixture(u.id, "cosmetic"));
  const F = { platform: "meta_feed", aspect: "4:5", width: 1080, height: 1350, label: "4:5", safe: { top: 0.06, bottom: 0.08, side: 0.06 } };

  it("composition classique et modèle de la bibliothèque : logo grand, rien ne se chevauche", async () => {
    const photo = await mockImage(3, 1600, 1600);
    // Logo large (4:1) comme la plupart des logos de marque.
    const logo = await sharp({ create: { width: 800, height: 200, channels: 4, background: { r: 30, g: 30, b: 30, alpha: 1 } } }).png().toBuffer();
    const art = adArt(p, brandTypo(p));
    const T = { brand: "Sérum Éclat", headline: "Le rituel qui change tout.", subline: "Sérum visage • Texture légère", cta: "Découvrir" };
    for (const layout of ["editorial" as const, "panel" as const, `tpl:${TEMPLATES.find((t) => t.id === "centered-rules")?.id ?? TEMPLATES[0].id}` as const]) {
      const r = await fr(() => composeAd({ format: F as never, layout, palette: palette(p), typo: brandTypo(p), art, ...T, background: photo, product: null, logo, variant: { logo: "column" } }));
      const l = r.doc.layers.find((x) => x.role === "logo");
      expect(l, layout).toBeTruthy();
      expect(l!.h, layout).toBeGreaterThanOrEqual(F.width * 0.08);
      expect(r.metrics.textOverlap, layout).toBe(false);
      expect(r.metrics.safeOverflow, layout).toBe(false);
    }
  }, 60_000);
});
