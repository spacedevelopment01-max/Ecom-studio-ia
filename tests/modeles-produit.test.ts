/**
 * Modèles « produit » (lot J, d'après des publicités produit de marques) : le VRAI produit détouré est mis en scène,
 * ses atouts CONFIRMÉS sont listés (jamais d'atout inventé), le choix automatique les préfère dès qu'un détourage
 * existe (les autres modèles oublieraient le produit), et chaque format reste lisible et dans les marges.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Modèles de publications « produit »", async () => {
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeAd } = await import("@/lib/ads-v2/compose");
  const { TEMPLATES, templateById } = await import("@/lib/ads-v2/library");
  const { pickPosterLook, confirmedFeatures } = await import("@/lib/ads-v2/poster");
  const fr = <T,>(fn: () => Promise<T>) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const art = { style: "premium", heading: "Playfair Display", headingWeight: 700, body: "Jost", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: false, cycle: ["editorial"] } as const;
  const pal = { primary: "#B4766A", secondary: "#F1DDD5", accent: "#C08A5B", light: "#FBF5F1", dark: "#2A1E1A" };
  const F = [
    { platform: "meta_feed", aspect: "1.91:1", width: 1200, height: 628, label: "1.91:1", safe: { top: 0.05, bottom: 0.05, side: 0.05 } },
    { platform: "meta_feed", aspect: "1:1", width: 1080, height: 1080, label: "1:1", safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
    { platform: "meta_feed", aspect: "4:5", width: 1080, height: 1350, label: "4:5", safe: { top: 0.05, bottom: 0.06, side: 0.05 } },
    { platform: "meta_story", aspect: "9:16", width: 1080, height: 1920, label: "9:16", safe: { top: 0.14, bottom: 0.2, side: 0.06 } },
  ] as const;
  // Produit détouré : un pot clair sur fond transparent.
  const product = await sharp({ create: { width: 600, height: 420, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await sharp({ create: { width: 420, height: 300, channels: 4, background: { r: 235, g: 230, b: 220, alpha: 1 } } }).png().toBuffer(), left: 90, top: 100 }])
    .png()
    .toBuffer();
  const features = ["Crème hydratante", "Pot de 50 ml", "Sans parfum ajouté"];
  const T = { brand: "Aurévo", headline: "La douceur au quotidien.", subline: "Soin du visage", eyebrow: "Soin du visage", cta: "Découvrir" };
  const norm = (s: string) => s.replace(/ /g, " ").trim().toLowerCase();
  const allowed = new Set([T.brand, T.headline, T.subline, T.eyebrow, T.cta, ...features, "01", "02", "03"].map(norm));
  const lot = TEMPLATES.filter((t) => t.product);

  it("dix modèles produit, chacun dans chaque format : produit posé, atouts fournis seulement, lisible et dans les marges", async () => {
    expect(lot.length).toBeGreaterThanOrEqual(10);
    const fails: string[] = [];
    for (const t of lot)
      for (const [k, f] of F.entries()) {
        const r = await fr(() => composeAd({ format: f as never, layout: `tpl:${t.id}`, palette: pal, typo: { heading: art.heading, body: art.body }, art: art as never, ...T, features, background: null, product, logo: null, variant: { scheme: t.schemes[k % t.schemes.length] } }));
        const m = r.metrics;
        const tag = `${t.id} ${f.aspect}`;
        if (m.textContrast < 4.5 || m.safeOverflow || m.textOverlap || m.minFontPx < 22) fails.push(`${tag} ${JSON.stringify(m)}`);
        expect(r.doc.layers.some((l) => l.role === "product" && l.kind === "image"), `${tag} produit`).toBe(true);
        for (const l of r.doc.layers) if (l.kind === "text" || l.kind === "button") expect(allowed.has(norm(l.text)), `${tag} texte inventé : « ${l.text} »`).toBe(true);
      }
    expect(fails).toEqual([]);
  }, 600_000);

  it("liste d'atouts : seulement ceux fournis, sinon rien (aucune caractéristique inventée)", async () => {
    const run = (feats: string[]) => fr(() => composeAd({ format: F[2] as never, layout: "tpl:spec-sheet", palette: pal, typo: { heading: art.heading, body: art.body }, art: art as never, ...T, subline: null, features: feats, background: null, product, logo: null, variant: { scheme: "light" } }));
    const withF = await run(features);
    expect(withF.doc.layers.filter((l) => l.id.startsWith("feat-") && !l.id.startsWith("feat-n")).map((l) => (l as any).text)).toEqual(features);
    const none = await run([]);
    expect(none.doc.layers.some((l) => l.id.startsWith("feat-"))).toBe(false);
  }, 60_000);

  it("choix automatique avec un détourage : un modèle produit (ou une composition du moteur qui pose le produit), jamais un modèle qui l'oublierait", () => {
    for (let n = 0; n < 20; n++) {
      const look = pickPosterLook(art as never, 500 + n * 41, [], false, true);
      if (look.layout.startsWith("tpl:")) expect(templateById(look.layout.slice(4))!.product, look.layout).toBe(true);
    }
    for (let n = 0; n < 20; n++) {
      const look = pickPosterLook(art as never, 900 + n * 13, [], true, false);
      if (look.layout.startsWith("tpl:")) expect(templateById(look.layout.slice(4))!.product).toBeFalsy();
    }
  });

  it("atouts confirmés du projet : faits confirmés courts seulement, prestations pour un service", () => {
    const p: any = { business: "products", product: { facts: [
      { key: "a", label: "Contenance", value: "50 ml", status: "confirmed", source: "user" },
      { key: "b", label: "Autonomie", value: "30 h", status: "inferred", source: "ai" },
      { key: "c", label: "Composition", value: "une très longue liste d'ingrédients qui ne tiendrait jamais sur une publication", status: "confirmed", source: "link" },
    ] } };
    expect(confirmedFeatures(p)).toEqual(["Contenance 50 ml"]);
    expect(confirmedFeatures({ business: "services", services: { services: [{ name: "Coupe femme" }, { name: "Coloration" }] } } as any)).toEqual(["Coupe femme", "Coloration"]);
  });
});
