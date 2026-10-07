/**
 * SEO de la fiche produit (phase 1B) : le titre et la description SEO rédigés avec les textes de la boutique ne sont
 * plus perdus : ils suivent dans les données de la boutique et partent vers Shopify après le produit, par les
 * métachamps « global.title_tag / global.description_tag » (même mécanisme que les articles de blog). Un refus
 * de la boutique ne bloque jamais l'envoi du produit. Limites uniques : titre 60, description 155.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSpec } from "@/lib/theme/directions";
import { runWithLang } from "@/lib/i18n-server";
import { localCopy } from "@/lib/engine/local-copy";
import { emptyProduct } from "@/lib/project-types";
import { pushProduct } from "@/lib/integrations/shopify";
import { encrypt } from "@/lib/secrets";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX } from "@/lib/seo-limits";
import { META_DESCRIPTION_MAX, META_TITLE_MAX } from "@/lib/engine/blog";
import { tidyCopy } from "@/lib/ai/tasks";

afterEach(() => vi.unstubAllGlobals());

const spec = () =>
  runWithLang({ content: "fr" }, () => {
    const copy = localCopy({ ...emptyProduct(), name: "Veilleuse Lune", category: "Veilleuse" } as any, { name: "Lune", tagline: "", story: "", values: [] });
    copy.seo = { title: "Veilleuse Lune pour chambre d'enfant | Lune", description: "Une veilleuse douce pour les nuits des tout-petits." };
    return buildSpec({ direction: "atelier", shopName: "Lune", palette: { primary: "#2F5D62", secondary: "#DCE8E4", accent: "#E0A458", light: "#F4F7F5", dark: "#14201F" }, copy, images: {}, files: {}, product: { title: "Veilleuse Lune", handle: "veilleuse-lune", vendor: "Lune", description_html: "", price: 3900, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] }, language: "fr" } as any);
  });

describe("SEO produit réellement utilisé", () => {
  it("le SEO des textes de la boutique suit dans les données du produit", () => {
    expect(spec().store.product.seo).toEqual({ title: "Veilleuse Lune pour chambre d'enfant | Lune", description: "Une veilleuse douce pour les nuits des tout-petits." });
  });

  it("envoi Shopify : le produit puis son SEO (métachamps global.title_tag / description_tag)", async () => {
    const bodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      bodies.push(b);
      if (b.query.includes("products(first")) return new Response(JSON.stringify({ data: { products: { nodes: [] } } }));
      if (b.query.includes("productSet")) return new Response(JSON.stringify({ data: { productSet: { product: { id: "gid://shopify/Product/1", handle: "veilleuse-lune" }, userErrors: [] } } }));
      return new Response(JSON.stringify({ data: { metafieldsSet: { metafields: [{ key: "title_tag" }], userErrors: [] } } }));
    }));
    const c: any = { external_id: "lune.myshopify.com", access_token: encrypt("jeton-test") };
    const r = await runWithLang({ ui: "fr" }, () => pushProduct(c, spec()));
    // Les deux champs ne sont pas tous confirmés dans la réponse (title_tag seul) : « envoyé », pas « accepté ».
    expect(r.seo).toMatchObject({ status: "sent", verified: false });
    expect(r.seo.mechanism).toMatch(/UNVERIFIED/);
    const mf = bodies.find((b) => b.query.includes("metafieldsSet"));
    expect(mf.variables.metafields).toEqual([
      { ownerId: "gid://shopify/Product/1", namespace: "global", key: "title_tag", type: "single_line_text_field", value: "Veilleuse Lune pour chambre d'enfant | Lune" },
      { ownerId: "gid://shopify/Product/1", namespace: "global", key: "description_tag", type: "single_line_text_field", value: "Une veilleuse douce pour les nuits des tout-petits." },
    ]);
  });

  it("SEO refusé par la boutique : le produit est envoyé quand même, le refus est rendu", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_u: string, init: any) => {
      const b = JSON.parse(init.body);
      if (b.query.includes("products(first")) return new Response(JSON.stringify({ data: { products: { nodes: [] } } }));
      if (b.query.includes("productSet")) return new Response(JSON.stringify({ data: { productSet: { product: { id: "gid://shopify/Product/2", handle: "veilleuse-lune" }, userErrors: [] } } }));
      return new Response(JSON.stringify({ data: { metafieldsSet: { metafields: [], userErrors: [{ field: ["metafields"], message: "Access denied" }] } } }));
    }));
    const c: any = { external_id: "lune.myshopify.com", access_token: encrypt("jeton-test") };
    const r = await runWithLang({ ui: "fr" }, () => pushProduct(c, spec()));
    expect(r.productId).toBe("gid://shopify/Product/2");
    expect(r.seo).toMatchObject({ status: "refused", detail: expect.stringMatching(/Access denied/), verified: false });
  });

  it("limites SEO uniques (60 / 155) pour la boutique et le blog", () => {
    expect([SEO_TITLE_MAX, SEO_DESCRIPTION_MAX]).toEqual([60, 155]);
    expect([META_TITLE_MAX, META_DESCRIPTION_MAX]).toEqual([60, 155]);
    const c = tidyCopy({ seo: { title: "x ".repeat(50), description: "mot ".repeat(60) } } as any) as any;
    expect(c.seo.title.length).toBeLessThanOrEqual(60);
    expect(c.seo.description.length).toBeLessThanOrEqual(155);
  });
});
