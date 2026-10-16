/**
 * Audit de l'onglet Boutique : aperçus des thèmes en anglais (aucune image « .en.jpg » inexistante) et fiche produit
 * sans astérisques markdown (« **Composition** ») dans les points forts, la description ou la FAQ.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

const fiche = {
  page: { key: "product_page:p1" },
  meta: { seoTitle: "Casque", metaDescription: "Casque audio" },
  blocks: [
    { kind: "h1", text: "Casque **audio**" },
    { kind: "p", text: "Un casque **supra-auriculaire** noir." },
    { kind: "ul", items: ["**Composition** : coques argentées", "**Format** : supra-auriculaire", "[Couleurs](/couleurs) : noir"] },
    { kind: "faq", q: "Est-il **pliable** ?", a: "[À compléter : réponse du fabricant]" },
    { kind: "faq", q: "Garantie ?", a: "**Deux** ans" },
  ],
};

vi.mock("@/lib/seo-v2/store", () => ({
  listContents: () => [{ docKey: "product_page:p1", type: "product_page", lang: "fr", source: "engine", verdict: "APPROVED" }],
  latestContent: () => ({ doc: fiche }),
}));

describe("Onglet Boutique — audit", async () => {
  const { directionCards, directionPreview } = await import("@/lib/theme/directions");
  const { overlayV2Copy, docHtml } = await import("@/lib/seo-v2/theme-copy");

  it("les aperçus des thèmes existent aussi en anglais (pas de « .en.jpg » cassé)", () => {
    for (const lang of ["fr", "en"] as const) {
      for (const c of directionCards(lang)) {
        expect(c.preview).not.toMatch(/\.en\./);
        expect(fs.existsSync(path.join(process.cwd(), "public", c.preview))).toBe(true);
      }
    }
    expect(directionPreview("atelier")).toBe("/demo/directions/atelier.jpg");
  });

  it("la fiche produit n'affiche jamais d'astérisques : gras rendu en HTML, texte simple ailleurs", () => {
    expect(docHtml(fiche.blocks as never)).toContain("<li><strong>Composition</strong> : coques argentées</li>");
    expect(docHtml(fiche.blocks as never)).not.toContain("**");
    expect(docHtml([{ kind: "p", text: "<b>x</b> **y**" }] as never)).toBe("<p>&lt;b&gt;x&lt;/b&gt; <strong>y</strong></p>");
    const base = {
      product: { title: "", short: "", description_html: "", highlights: [], tabs: [], reassurance: [] },
      faq: { heading: "FAQ", items: [] },
      seo: { title: "", description: "" },
      hero: { heading: "", text: "" },
    };
    const { copy } = overlayV2Copy(base as never, "p1", "fr", "products");
    expect(copy.product.highlights).toEqual(["Composition : coques argentées", "Format : supra-auriculaire", "Couleurs : noir"]);
    expect(copy.product.title).toBe("Casque audio");
    expect(copy.product.short).toBe("Un casque supra-auriculaire noir.");
    expect(copy.faq.items.map((f) => f.q + f.a).join(" ")).not.toContain("**");
    expect(copy.product.description_html).not.toContain("**");
  });
});
