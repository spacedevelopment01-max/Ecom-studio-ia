/**
 * Mise en valeur du produit détouré :
 *  - les morceaux isolés du détourage (bout de câble, reste de fond) sont effacés ;
 *  - une photo libre sur laquelle le produit a été collé n'est jamais reprise comme fond de publication ;
 *  - aucun « [À compléter : …] » n'apparaît sur un visuel.
 */
import sharp from "sharp";
import { describe, expect, it } from "vitest";

describe("Produit détouré propre", () => {
  it("dropIslands efface les petits fragments séparés et garde le produit", async () => {
    const { dropIslands } = await import("@/lib/media/cutout");
    const w = 200, h = 200, raw = Buffer.alloc(w * h * 4);
    const set = (x: number, y: number) => { const i = (y * w + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 40; raw[i + 3] = 255; };
    for (let y = 40; y < 160; y++) for (let x = 40; x < 140; x++) set(x, y); // produit
    for (let y = 10; y < 14; y++) for (let x = 170; x < 174; x++) set(x, y); // fragment
    const png = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const out = await sharp(await dropIslands(png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => out.data[(y * out.info.width + x) * 4 + 3];
    expect(a(90, 100)).toBe(255);
    expect(a(171, 11)).toBe(0);
  });

  it("une photo libre avec le produit collé n'est pas un fond de publication", async () => {
    const { isPastedOnStock } = await import("@/lib/social-v2/deps");
    expect(isPastedOnStock({ meta: JSON.stringify({ stock: { source: "pixabay" } }) })).toBe(true);
    expect(isPastedOnStock({ meta: JSON.stringify({ recipe: "Mise en scène studio" }) })).toBe(false);
    expect(isPastedOnStock({ meta: null })).toBe(false);
  });

  it("aucun texte « À compléter » sur un visuel publicitaire", async () => {
    const { noPlaceholders } = await import("@/lib/ads-v2/compose");
    const out = noPlaceholders({ brand: "Sève", headline: "[À compléter : titre]", subline: "Savon doux [À compléter : poids]", eyebrow: "[To complete: tag]", features: ["Fait main", "[À compléter : origine]"] } as any);
    expect(out.headline).toBe("Sève");
    expect(out.subline).toBe("Savon doux");
    expect(out.eyebrow).toBeNull();
    expect(out.features).toEqual(["Fait main"]);
    // Un texte sans espace réservé reste intact (signe d'une remise compris).
    expect(noPlaceholders({ brand: "X", headline: "-20 % le jeudi", subline: "- Livraison", features: null } as any).headline).toBe("-20 % le jeudi");
  });
});

describe("Modèles de publication sur une photo de produit", () => {
  it("jamais un modèle qui voile ou rogne le produit (disque qui se lève, demi-teinte)", async () => {
    const { pickPosterLook } = await import("@/lib/ads-v2/poster");
    const { templateById } = await import("@/lib/ads-v2/library");
    expect(templateById("rising-disc")?.coversSubject).toBe(true);
    expect(templateById("half-tint")?.coversSubject).toBe(true);
    const art = { style: "warm", heading: "Inter", headingWeight: 700, body: "Inter", display: "Inter", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial"] } as any;
    const seen = new Set<string>();
    for (let n = 0; n < 400; n++) seen.add(pickPosterLook(art, n * 7919, [], true, false, true).layout);
    for (const id of ["rising-disc", "half-tint", "frame-center", "floating-card", "frosted-strip", "centered-rules", "golden-ring"]) {
      expect(templateById(id)?.coversSubject, id).toBe(true);
      expect(seen.has(`tpl:${id}`), id).toBe(false);
    }
    const free = new Set<string>();
    for (let n = 0; n < 400; n++) free.add(pickPosterLook(art, n * 7919, [], true, false, false).layout);
    expect([...free].some((l) => l === "tpl:rising-disc" || l === "tpl:half-tint")).toBe(true);
  });
});

describe("Publicités : jamais une question sans réponse", () => {
  it("une réponse « [À compléter] » ne devient ni un fait ni une objection", async () => {
    const { adInsight } = await import("@/lib/ads-v2/insight");
    const p: any = {
      business: "products", name: "Cap Sud", brand: { name: "Cap Sud", personality: [] },
      product: { name: "Lunettes", category: "Lunettes", facts: [{ label: "Verres", value: "[À compléter : catégorie]", status: "confirmed" }], questions: [{ question: "En quelle matière ?", answer: "[À compléter : matière]" }, { question: "Livraison ?", answer: "48 h" }], claimsToAvoid: [] },
      strategy: { platform: { objections: [{ objection: "Trop cher", answer: "[À compléter]" }], proofs: [] } },
    };
    const i = adInsight(p);
    expect(i.facts.map((f) => f.label)).toEqual(["Livraison"]);
    expect(i.objections).toEqual([]);
  });
});

describe("Titres des publications tirés d'une question", () => {
  it("gardent leur point d'interrogation", () => {
    const src = require("node:fs").readFileSync("src/lib/social-v2/copy.ts", "utf8");
    const q = src.slice(src.indexOf("const QBANK"), src.indexOf("/** Lieu"));
    expect(q).not.toMatch(/headline: short\(x\.a\) \}/);
    expect(q).toMatch(/qmark\(short\(x\.a\)\)/);
  });
});

describe("Fragments du détourage", () => {
  it("beaucoup de taches : laissées telles quelles (le contrôle de qualité refuse ce détourage)", async () => {
    const { dropIslands } = await import("@/lib/media/cutout");
    const w = 200, h = 200, raw = Buffer.alloc(w * h * 4);
    const set = (x: number, y: number) => { const i = (y * w + x) * 4; raw[i] = raw[i + 1] = raw[i + 2] = 40; raw[i + 3] = 255; };
    for (let y = 40; y < 160; y++) for (let x = 40; x < 140; x++) set(x, y);
    for (const [cx, cy] of [[10, 10], [180, 10], [10, 180], [180, 180], [100, 185], [185, 100]]) for (let y = cy; y < cy + 4; y++) for (let x = cx; x < cx + 4; x++) set(x, y);
    const png = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    expect(await dropIslands(png)).toBe(png);
  });
});
