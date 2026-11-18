/**
 * Le plafond annoncé d'une création de site, resserré le 18 novembre 2026. Le propriétaire, devant une carte à « ≈ 25 %
 * de ton budget IA ; au plus ≈ 80 % » (10,70 € probables, 34,19 € au plus) : « L'écart de prix annoncés par sina est
 * beaucoup trop large et fait même peur le plus au haut ». Mesuré sur les trois premiers sites : 5,30 €, 7,25 € et
 * 11,98 €. Le plafond devient le prix probable et sa moitié ; la création le tient en gardant de quoi créer les photos
 * avant toute relecture. Sans IA, aucun appel réel.
 */
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("le plafond d'une création de site : le prix probable et sa moitié, jamais le pire cas", async () => {
  const T = await import("@/lib/syna-agent/custom-theme/tools");
  const X = await import("@/lib/syna-agent/custom-theme/site-job");
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const { sectionLibrary, authenticSection } = await import("@/lib/syna-agent/custom-theme/library");

  it("le plafond annoncé ne dépasse jamais une fois et demie le prix probable, et ne descend jamais sous lui", () => {
    expect(X.MARGE_PLAFOND_SITE).toBe(1.5);
    T.customPhotoDeps.unit = () => 150_000;
    try {
      for (const o of [{ business: "products" as const, products: 1 }, { business: "products" as const, products: 3 }, { business: "products" as const, products: 4 }, { business: "services" as const, products: 1 }]) {
        const q = X.siteQuote(o);
        expect(q.probableMicro!, JSON.stringify(o)).toBeGreaterThan(0);
        expect(q.maxMicro, JSON.stringify(o)).toBeGreaterThanOrEqual(q.probableMicro!);
        expect(q.maxMicro, JSON.stringify(o)).toBeLessThanOrEqual(Math.round(q.probableMicro! * 1.5) + 1);
      }
      // Une boutique plus grande coûte toujours plus, au probable comme au plafond.
      const one = X.siteQuote({ business: "products", products: 1 }), four = X.siteQuote({ business: "products", products: 4 });
      expect(four.probableMicro!).toBeGreaterThan(one.probableMicro!);
      expect(four.maxMicro).toBeGreaterThan(one.maxMicro);
    } finally { delete T.customPhotoDeps.unit; }
  });

  it("une relecture ne se lance que s'il reste ensuite de quoi créer toutes les photos encore à faire", () => {
    // 2 € restants, 10 photos à 0,17 € au plus : 0,30 € de libres, une relecture à 0,25 € passe, une à 0,40 € non.
    expect(B.relectureTient({ reste: 2_000_000, photos: 10, photoMax: 170_000, etape: 250_000 })).toBe(true);
    expect(B.relectureTient({ reste: 2_000_000, photos: 10, photoMax: 170_000, etape: 400_000 })).toBe(false);
    // Plus aucune photo à créer : tout le reste peut servir aux relectures.
    expect(B.relectureTient({ reste: 300_000, photos: 0, photoMax: 170_000, etape: 250_000 })).toBe(true);
    // Prix d'une photo inconnu : rien n'est gardé de côté (aucune photo ne sera créée).
    expect(B.relectureTient({ reste: 300_000, photos: 5, photoMax: null, etape: 250_000 })).toBe(true);
  });

  it("les photos encore à créer : les emplacements d'exemple des sections à photo créée, sur les pages montées seulement", () => {
    const lib = sectionLibrary().sections;
    const ambiance = lib.find((s) => !authenticSection(s.id, "products") && !B.productSlotSection(s))!;
    const produit = lib.find((s) => B.productSlotSection(s))!;
    expect(ambiance && produit).toBeTruthy();
    const html = '<img src="photos/a.webp"><img src="photos/b.jpg"><img src="photos/a.webp"><img src="photos/carte-ville.png">';
    const list = [
      { id: ambiance.id, html, pageKey: "home" },
      { id: ambiance.id, html: '<img src="photos/c.webp">', pageKey: "about" },
      { id: produit.id, html, pageKey: "home" },
      { id: "section-inconnue", html, pageKey: "home" },
    ];
    // a et b (une fois chacune ; la carte ne se crée pas), plus c ; l'emplacement de produit attend la photo du client.
    expect(B.photosACreer(list, "products")).toBe(3);
    // Montage limité à l'accueil : seules ses photos comptent.
    expect(B.photosACreer(list, "products", ["home"])).toBe(2);
  });

  it("la création donne au montage tout le reste du plafond, et ne le limite à deux pages que si même son prix probable n'y tient pas", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/site-job.ts", "utf8");
    expect(src).toContain("return est.probableMicro ?? est.maxMicro;");
    expect(src).toContain("capMicro: jobSpentMicro(ctx.job.id) + left()");
    const brand = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    expect(brand).toContain("!resteAvantPhotos(COPY_REVIEW_CAP_MICRO)");
    expect(brand).toContain("if (!resteAvantPhotos(SECTION_TEXT_CAP_MICRO)) {");
  });
});
