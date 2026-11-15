/**
 * Bloc d'achat « Produit vedette » rempli avec les vraies données du client (essai réel du 10 novembre 2026, Éclat de
 * thé) : le sélecteur de mélanges montrait les six thés de la démonstration et son script forçait le prix à 8,50 €
 * pour n'importe quel client.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { unitOf, withRealBuyBlock, type BuyData } from "@/lib/syna-agent/custom-theme/buy-block";

const lib = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/sections/library.json"), "utf8"));
const sections: { id: string; html: string }[] = Array.isArray(lib) ? lib : lib.sections ?? Object.values(lib);
const vedette = sections.find((s) => s.id === "produit-vedette")!.html;

const data = (gamme: unknown[] | null): BuyData => ({
  base: 12, name: "Bougie Ambre", unit: "bougie", cfg: gamme ? { gamme } : {}, features: {} as BuyData["features"],
  promo: null, subscription: null, bundlePct: null, gifts: [], reassurance: [],
});

describe("bloc d'achat réel du Produit vedette", () => {
  it("le sélecteur de mélanges montre la vraie gamme du client, jamais les thés d'exemple", () => {
    const out = withRealBuyBlock(vedette, data([["/api/files/a1", "Bougie Ambre", 12, "Bougie", ""], ["", "Bougie Figue & cèdre", 14, "Bougie", ""]]));
    expect(out).not.toContain('data-n="Thé vert jasmin"');
    expect(out).not.toContain("Hibiscus-fruits rouges");
    expect(out).toContain('data-n="Bougie Ambre" data-t="|Bougie Ambre" data-p="12" data-img="/api/files/a1"');
    expect(out).toContain('data-n="Bougie Figue &amp; cèdre" data-t="|Bougie Figue &amp; cèdre" data-p="14" data-img=""');
    expect(out).toMatch(/<b data-xflav>Bougie Ambre<\/b>/);
    expect(out).toContain('data-base="12"');
  });

  it("sans gamme, le sélecteur est retiré", () => {
    const out = withRealBuyBlock(vedette, data(null));
    expect(out).not.toContain("data-xflavs");
    expect(out).toContain("data-pvb");
  });

  it("le script part du vrai prix (data-base) et garde la photo si un produit de la gamme n'en a pas", () => {
    const js = fs.readFileSync(path.join(process.cwd(), "public/sections/library.js"), "utf8");
    expect(js).toContain('xb=q("[data-pvb]",p);if(xb&&xb.dataset.cfg&&+xb.dataset.base)price=+xb.dataset.base;');
    expect(js).toContain("if(b.dataset.img&&imgs[1]){imgs[1].src=b.dataset.img;");
  });

  it("le mot d'unité se lit aussi dans la description (« en sachet de 100 g »)", () => {
    expect(unitOf("Jasmin délicat")).toBe("article");
    expect(unitOf("Thé vert parfumé au jasmin, en sachet de 100 g.")).toBe("sachet");
    expect(fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/buy-block.ts"), "utf8")).toContain("unitOf(plain(p.data.description_html))");
  });
});
