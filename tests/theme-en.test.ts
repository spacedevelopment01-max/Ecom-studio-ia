import { describe, expect, it } from "vitest";
import { withContentLang, contentLang, runWithLang } from "@/lib/i18n-server";
import { buildSpec, DIRECTIONS, type DirectionId } from "@/lib/theme/directions";
import { compileTheme } from "@/lib/theme/compile";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { sectionSchema } from "@/lib/theme/spec";
import type { ShopCopy } from "@/lib/theme/copy";

/** Textes de boutique anglais, honnêtes (« [To complete: …] » pour l'inconnu). */
const copy: ShopCopy = {
  seo: { title: "Radiance Serum — Ondine House", description: "A face serum by Ondine House." },
  announcement: [],
  hero: { eyebrow: "Ondine House", heading: "Radiance Serum for everyday skincare", line1: "Radiance Serum,", line2: "made simple.", text: "A face serum in a 30 ml bottle.", cta: "Shop now" },
  statement: { eyebrow: "", heading: "Skincare, made simple.", text: "" },
  features: { heading: "Why you'll love it", items: [{ title: "30 ml bottle", text: "Confirmed volume.", icon: "drop" }, { title: "Shipping", text: "[To complete: shipping times]", icon: "truck" }] },
  story: { heading: "How it works", steps: [{ title: "Apply", text: "[To complete: directions for use]" }, { title: "Wait", text: "[To complete: directions for use]" }] },
  detail: { eyebrow: "Details", heading: "A closer look", text: "[To complete: ingredients]" },
  specs: { heading: "Specifications", items: [{ label: "Volume", value: "30 ml" }] },
  faq: { heading: "Frequently asked questions", items: [{ q: "How long does shipping take?", a: "[To complete: shipping times]" }, { q: "Can I return it?", a: "[To complete: return policy]" }] },
  marquee: ["30 ml", "Ondine House"],
  gallery: { heading: "Gallery", captions: [] },
  cta: { heading: "Ready to try it?", text: "Order online.", button: "Shop now" },
  newsletter: { heading: "Get our news", text: "New arrivals, never too often." },
  product: { title: "Radiance Serum", short: "A face serum in a 30 ml bottle.", description_html: "<p>A face serum.</p>", highlights: ["30 ml bottle"], tabs: [{ heading: "Shipping and returns", content_html: "<p>[To complete: shipping and return policy]</p>" }], reassurance: [] },
  about: { heading: "Our story", intro: "[To complete: brand story]", blocks: [{ heading: "Where it started", text: "[To complete: brand story]" }], values: [] },
  shipping: { heading: "Shipping and returns", body_html: "<p>[To complete: shipping and return policy]</p>" },
  contact: { heading: "Contact us", text: "We reply to every message." },
  footer: { about: "Skincare, made simple.", newsletter: "New arrivals, never too often." },
};

const product = { title: "Radiance Serum", handle: "radiance-serum", vendor: "Ondine House", description_html: "<p>A face serum.</p>", price: 3490, compare_at_price: null, currency: "EUR", options: ["Size"], variants: [{ title: "30 ml", options: ["30 ml"], price: 3490, available: true }], images: ["es-packshot.jpg"], tags: [] };

/** Composition sous la langue de contenus anglaise (comme le fait le moteur de boutique : language = contentLang()). */
const englishSpec = (direction: DirectionId = "atelier") =>
  withContentLang("en", () =>
    buildSpec({
      direction,
      shopName: "Ondine House",
      palette: { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" },
      copy,
      images: { hero: "es-hero.jpg", cutout: "es-cutout.webp", packshot: "es-packshot.jpg" },
      files: {},
      product,
      language: contentLang(),
    }),
  );

// Mots français fréquents, guillemets français et lettres accentuées (les noms propres des directions sont tolérés).
const FRENCH = /«|»|\b(le|la|les|des|du|une|et|est|pour|avec|votre|vos|nos|notre|sur|dans|qui|pas|aux|ou|plus|sans|cette|ajoutez|réglage|à|de)\b|[éèêàçùôîœ]/i;
const ALLOWED = /^(Élan( — .*)?|Atelier|Clinique|Brut|Terroir|Nocturne|Pop|Galerie|Flux|Joaillerie|Gourmand)$/;
const french = (s: string) => !ALLOWED.test(s) && FRENCH.test(s.replace(/\bÉlan\b/g, ""));

const TEXT = new Set(["text", "textarea", "richtext", "inline_richtext", "html"]);
function schemaStrings(raw: any): string[] {
  const out: string[] = [];
  const add = (v: unknown) => typeof v === "string" && v && out.push(v);
  const setting = (s: any) => {
    add(s.label);
    add(s.info);
    add(s.content);
    for (const o of s.options ?? []) add(o.label);
    if (TEXT.has(s.type)) add(s.default);
  };
  add(raw.name);
  for (const s of raw.settings ?? []) setting(s);
  for (const b of raw.blocks ?? []) {
    add(b.name);
    for (const s of b.settings ?? []) setting(s);
  }
  for (const p of raw.presets ?? []) {
    add(p.name);
    for (const v of Object.values(p.settings ?? {})) add(v);
    for (const b of p.blocks ?? []) for (const v of Object.values(b.settings ?? {})) add(v);
  }
  return out;
}
function deepStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => deepStrings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => deepStrings(x, out));
  return out;
}
const stripHeader = (s: string) => s.replace(/^\s*\/\*[\s\S]*?\*\/\s*/, "");

describe("boutique en anglais", () => {
  it("compilée sous withContentLang(\"en\") : locale par défaut anglaise, schémas et textes par défaut sans français", () => {
    for (const d of DIRECTIONS) {
      const spec = englishSpec(d.id);
      expect(spec.language).toBe("en");
      expect(validateSpec(spec)).toEqual([]);
      const files = withContentLang("en", () => compileTheme(spec));
      // Locale par défaut = anglais ; le français reste disponible comme langue secondaire.
      expect(files.has("locales/en.default.json")).toBe(true);
      expect(files.has("locales/fr.default.json")).toBe(false);
      expect(files.has("locales/fr.json")).toBe(true);
      expect([...files.keys()].filter((k) => /\.default\.json$/.test(k))).toEqual(["locales/en.default.json"]);
      expect([...files.keys()].some((k) => k.startsWith("i18n/"))).toBe(false);
      const bad: string[] = [];
      for (const [p, content] of files) {
        if (/^sections\/[^/]+\.liquid$/.test(p)) {
          const m = content.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
          if (m) for (const s of schemaStrings(JSON.parse(m[1]))) if (french(s)) bad.push(`${p}: ${s}`);
        }
        if (p === "config/settings_schema.json") for (const g of JSON.parse(content)) if (g.name !== "theme_info") for (const s of [g.name, ...schemaStrings({ settings: g.settings })]) if (french(s)) bad.push(`${p}: ${s}`);
        if (/^(templates\/.+|sections\/.+-group)\.json$/.test(p) || p === "config/settings_data.json") for (const s of deepStrings(JSON.parse(stripHeader(content)))) if (french(s)) bad.push(`${p}: ${s}`);
        if (p === "locales/en.default.json") for (const s of deepStrings(JSON.parse(content))) if (french(s)) bad.push(`${p}: ${s}`);
      }
      for (const s of deepStrings(spec.store)) if (french(s)) bad.push(`store: ${s}`);
      expect(bad, d.id).toEqual([]);
    }
  });

  it("l'aperçu suit la langue du thème (locale, prix, request.locale, Shopify.locale)", async () => {
    const spec = englishSpec();
    const files = compileTheme(spec);
    const r = await renderPage({ spec, base: "/p", files, cart: [] }, "/products/radiance-serum", new URLSearchParams());
    expect(r.html).toContain('lang="en"');
    expect(r.html).toContain('locale:"en"');
    expect(r.html).toContain("€34.90");
    expect(r.html).toContain("Add to cart");
    expect(r.html).not.toContain("Ajouter au panier");
  });

  it("les sections ajoutées reçoivent les textes de préréglage dans la langue du thème ; le studio affiche les libellés dans la langue de l'interface", () => {
    const spec = englishSpec();
    const res = runWithLang({ ui: "fr", content: "fr" }, () => applyOps(spec, [{ op: "add_section", template: "index", type: "faq" }]));
    const id = res.spec.templates.index.order.find((x) => res.spec.templates.index.sections[x].type === "faq" && !spec.templates.index.sections[x])!;
    const blocks = Object.values(res.spec.templates.index.sections[id].blocks ?? {});
    expect(blocks.length).toBeGreaterThan(0);
    for (const s of deepStrings(blocks.map((b) => b.settings))) expect(french(s), s).toBe(false);
    // Interface en français : nom de la section en français ; en anglais : en anglais.
    expect(sectionSchema(spec, "faq", "fr")?.name).toBe("Questions fréquentes");
    expect(sectionSchema(spec, "faq", "en")?.name).toBe("Frequently asked questions");
    expect(sectionSchema(spec, "faq")?.name).toBe("Frequently asked questions");
  });

  it("les thèmes existants sans langue restent en français", () => {
    const spec = englishSpec();
    delete (spec as any).language;
    const files = compileTheme(spec);
    expect(files.has("locales/fr.default.json")).toBe(true);
    expect(files.has("locales/en.json")).toBe(true);
    expect(files.get("sections/faq.liquid")).toContain('"name": "Questions fréquentes"');
    // Le détecteur de français fonctionne bien sur ces mêmes fichiers.
    expect(french("Questions fréquentes")).toBe(true);
    expect(french("Ajoutez ici le bloc")).toBe(true);
    expect(french("Frequently asked questions")).toBe(false);
  });
});
