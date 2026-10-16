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

describe("Onglet Boutique — photos libres de droits signalées", async () => {
  const { stockPhotosInTheme, replaceThemeFile, stockPhotoLabel } = await import("@/lib/theme/stock-notice");
  const { stockBadgeTool } = await import("@/lib/theme/preview-tools");
  const asset = (id: string, meta: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ id, kind: "image", meta: JSON.stringify(meta), thumb_key: null, deleted_at: null, status: "review", ...extra }) as never;
  const assets: Record<string, any> = {
    s1: asset("s1", { stock: { source: "pixabay", id: 1, author: "Ana" }, slot: "hero" }),
    s2: asset("s2", { stock: { source: "pixabay", id: 2 }, slot: "service:0", service: "Taille de haies" }),
    own: asset("own", { recipe: "photo du client" }),
    vid: asset("vid", { stock: { source: "pixabay" } }, { kind: "video" }),
  };
  const spec = () => ({ files: { "es-photo-1-s1.jpg": "s1", "es-prestation-s2.jpg": "s2", "es-photo-2-own.jpg": "own", "es-video-1.mp4": "vid" } }) as never;

  it("liste chaque photo libre de droits du site avec son emplacement, jamais les photos du client", () => {
    const fr = stockPhotosInTheme(spec(), (id) => assets[id], "fr");
    expect(fr.map((p) => [p.file, p.where, p.source])).toEqual([
      ["es-photo-1-s1.jpg", "Ouverture du site", "Pixabay"],
      ["es-prestation-s2.jpg", "Prestation « Taille de haies »", "Pixabay"],
    ]);
    expect(stockPhotosInTheme(spec(), (id) => assets[id], "en")[1].where).toBe('Service "Taille de haies"');
    expect(stockPhotosInTheme({ ...(spec() as object), imported: {} } as never, (id) => assets[id], "fr")).toEqual([]);
  });

  it("libellé demandé par le propriétaire, en français et en anglais", () => {
    expect(stockPhotoLabel("pixabay", "fr")).toBe("Photo libre de droits (Pixabay), pas une image de votre activité");
    expect(stockPhotoLabel("pixabay", "en")).toBe("Royalty-free photo (Pixabay), not an image of your business");
  });

  it("remplacer une photo : même fichier, nouvelle image partout ; refus si ce n'est pas une image du projet", () => {
    const r = replaceThemeFile(spec(), "es-photo-1-s1.jpg", assets.own, "fr");
    expect("spec" in r && (r.spec as any).files["es-photo-1-s1.jpg"]).toBe("own");
    expect((spec() as any).files["es-photo-1-s1.jpg"]).toBe("s1");
    expect(replaceThemeFile(spec(), "inconnu.jpg", assets.own, "fr")).toHaveProperty("error");
    expect(replaceThemeFile(spec(), "es-video-1.mp4", assets.own, "fr")).toHaveProperty("error");
    expect(replaceThemeFile(spec(), "es-photo-1-s1.jpg", assets.vid, "fr")).toHaveProperty("error");
    expect(replaceThemeFile(spec(), "es-photo-1-s1.jpg", null, "en")).toEqual({ error: "Choose an image from the project library." });
  });

  it("aperçu du studio : libellé posé sur les photos concernées, rien quand il n'y en a pas", () => {
    expect(stockBadgeTool([])).toBe("");
    const tool = stockBadgeTool([{ file: "es-photo-1-s1.jpg", label: stockPhotoLabel("pixabay", "fr") }]);
    expect(tool).toContain('"k":"es-photo-1-s1"');
    expect(tool).toContain("Photo libre de droits (Pixabay), pas une image de votre activité");
    expect(stockBadgeTool([{ file: "x.jpg", label: "</script><b>" }])).not.toContain("</script><b>");
  });
});

describe("Onglet Boutique — le libellé des photos libres n'est jamais exporté", async () => {
  const { compileTheme } = await import("@/lib/theme/compile");
  const { sampleSpec } = await import("./fixtures");
  it("le thème compilé (export Shopify) ne contient ni le libellé ni son script", () => {
    const files = compileTheme(sampleSpec());
    const all = [...files.values()].join("\n");
    expect(all).not.toContain("es-stock-badge");
    expect(all).not.toContain("pas une image de votre activité");
  });
});
