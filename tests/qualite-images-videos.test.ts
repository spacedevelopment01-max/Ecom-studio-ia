/**
 * Qualité des images et des vidéos : contrôles de fidélité des images et plans générés par IA (réponses
 * réalistes et défaillantes), cadrage (produit jamais coupé ni sous le texte), netteté (pas d'agrandissement
 * flou), détails sans logo du vendeur, textes sans répétition, photos plein cadre sans recadrage abusif.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { createCanvas, loadImage } from "@napi-rs/canvas";

async function block(w: number, h: number, color: string) {
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  return loadImage(await c.encode("png"));
}

const PAL = { primary: "#6E5644", secondary: "#E6DACB", accent: "#B98B5E", light: "#F6F2EC", dark: "#1C1713" };

describe("contrôle de fidélité des images IA (réponses simulées)", () => {
  it("réponse réaliste acceptée ; produit différent, note faible, note sur 100 ou réponse hors format refusées", async () => {
    const { qcPassed, qcScore, QC_MIN_SCORE } = await import("@/lib/ai/tasks");
    expect(QC_MIN_SCORE).toBe(7);
    expect(qcPassed({ sameProduct: true, score: 8 })).toBe(true);
    expect(qcPassed({ sameProduct: true, score: 9.5 })).toBe(true);
    // Défaillances : un autre objet, même « joli », est un échec.
    expect(qcPassed({ sameProduct: false, score: 10 })).toBe(false);
    expect(qcPassed({ sameProduct: true, score: 6 })).toBe(false);
    // Le modèle répond sur 100 : 65 → 6,5 (refusé) et pas 65 « au-dessus du seuil ».
    expect(qcScore(65)).toBe(6.5);
    expect(qcPassed({ sameProduct: true, score: 65 })).toBe(false);
    expect(qcPassed({ sameProduct: true, score: 85 })).toBe(true);
    // Hors format : texte, absent, négatif, absurde, « true » en chaîne.
    expect(qcPassed({ sameProduct: true, score: Number.NaN })).toBe(false);
    expect(qcPassed({ sameProduct: true })).toBe(false);
    expect(qcPassed({ sameProduct: "true", score: 9 })).toBe(false);
    expect(qcPassed({ sameProduct: true, score: -3 })).toBe(false);
    expect(qcPassed({ sameProduct: true, score: 1000 })).toBe(false);
    expect(qcPassed(null)).toBe(false);
  });

  it("sans IA de contrôle, une image IA n'est jamais utilisée (raison honnête)", async () => {
    const { llmConfigured } = await import("@/lib/ai/llm");
    expect(llmConfigured()).toBe(false);
    const { verifyAiImage } = await import("@/lib/engine/images");
    const img = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
    const r = await verifyAiImage({ userId: "u", projectId: "p", usageKey: "k" }, img, img);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/contrôle|check/);
  });

  it("consignes : contrôle exigeant (produit en double, flottant, texte ajouté, note sur 10) ; décor Gemini sans image du produit", async () => {
    const fs = await import("node:fs");
    const prompts = fs.readFileSync("src/lib/ai/prompts.ts", "utf8");
    expect(prompts).toMatch(/produit en double/);
    expect(prompts).toMatch(/flotte/);
    expect(prompts).toMatch(/Note sur 10/);
    expect(prompts).toMatch(/qcScene/);
    const providers = fs.readFileSync("src/lib/ai/media-providers.ts", "utf8");
    const plate = providers.slice(providers.indexOf("export async function geminiPlate"), providers.indexOf("export async function ambianceImage"));
    expect(plate).not.toMatch(/mime_type/); // aucune image du produit envoyée
  });
});

describe("cadrage et netteté des compositions", () => {
  it("produit large décalé (bannière, visuel texte à gauche) : jamais coupé par le bord ni sous le texte", async () => {
    const { renderScene, FORMATS } = await import("@/lib/media/compose");
    const drone = await block(2400, 1000, "#556677");
    // Bannière de boutique (recette de renderBanner).
    const b = await renderScene({ product: drone, palette: PAL, style: "studio", format: FORMATS.banner, productScale: 0.66, offsetX: 0.18 });
    expect(b.productBox.x).toBeGreaterThanOrEqual(0);
    expect(b.productBox.x + b.productBox.w).toBeLessThanOrEqual(FORMATS.banner.w);
    // Visuel texte à gauche (recette de renderCreative) : le produit reste à droite de la colonne de texte (53 %).
    const f = FORMATS.square;
    const s = await renderScene({ product: drone, palette: PAL, style: "arch", format: f, productScale: 0.6, offsetX: 0.255, maxProductWidth: f.w * 0.39 });
    expect(s.productBox.x).toBeGreaterThanOrEqual(f.w * 0.53);
    expect(s.productBox.x + s.productBox.w).toBeLessThanOrEqual(f.w);
  });

  it("petit détourage : jamais agrandi plus de 1,6 fois (pas de produit flou ou pixelisé)", async () => {
    const { renderScene, FORMATS, MAX_PRODUCT_UPSCALE } = await import("@/lib/media/compose");
    const small = await block(200, 300, "#AA3355");
    const r = await renderScene({ product: small, palette: PAL, style: "studio", format: FORMATS.product });
    expect(r.productBox.h).toBeLessThanOrEqual(300 * MAX_PRODUCT_UPSCALE + 0.5);
    const packshot = await sharp(await (await import("@/lib/media/compose")).renderPackshot(small)).raw().toBuffer({ resolveWithObject: true });
    // Hauteur de la zone colorée du produit dans le packshot 2000 × 2000.
    let rows = 0;
    for (let y = 0; y < packshot.info.height; y++) {
      const i = (y * packshot.info.width + 1000) * 3;
      if (packshot.data[i] > 140 && packshot.data[i + 1] < 90) rows++;
    }
    expect(rows).toBeLessThanOrEqual(300 * MAX_PRODUCT_UPSCALE + 4);
  });

  it("décor généré : aucun reflet miroir sous le produit (un lit ou une table en bois ne reflètent pas)", async () => {
    const { renderScene, FORMATS } = await import("@/lib/media/compose");
    const red = await block(800, 800, "#FF0000");
    const plate = await block(1600, 2000, "#808080");
    const f = FORMATS.product;
    const redness = async (png: Buffer, y: number) => {
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      const i = (y * info.width + info.width / 2) * info.channels;
      return data[i] - data[i + 1];
    };
    const withPlate = await renderScene({ product: red, palette: PAL, style: "spotlight", format: f, background: plate });
    const baseY = Math.round(withPlate.productBox.y + withPlate.productBox.h);
    const studio = await renderScene({ product: red, palette: PAL, style: "spotlight", format: f });
    const studioBase = Math.round(studio.productBox.y + studio.productBox.h);
    expect(await redness(studio.png, studioBase + 40)).toBeGreaterThan(15); // reflet en studio sombre (voulu)
    expect(await redness(withPlate.png, baseY + 40)).toBeLessThan(8); // aucun reflet sur un décor généré
  });
});

describe("détails produit (recadrages de la photo réelle)", () => {
  it("jamais le logo du vendeur hors du produit, jamais agrandis au point d'être flous, pas de doublon", async () => {
    const { detailCrops } = await import("@/lib/media/cutout");
    const W = 1600, H = 1200;
    const original = await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
      .composite([
        { input: await sharp({ create: { width: 1000, height: 400, channels: 3, background: "#777777" } }).png().toBuffer(), left: 300, top: 500 },
        // Logo du fournisseur, rouge, en haut à droite (comme « VLGSKY » sur la photo de SOVA).
        { input: await sharp({ create: { width: 250, height: 100, channels: 3, background: "#E00000" } }).png().toBuffer(), left: 1300, top: 60 },
      ])
      .jpeg()
      .toBuffer();
    const crops = await detailCrops(original, { png: Buffer.alloc(0), width: 1000, height: 400, bbox: { x: 300, y: 500, w: 1000, h: 400 }, sourceW: W, sourceH: H, method: "model" });
    expect(crops.length).toBe(1); // les deux zones par défaut se recouvrent sur un produit large
    for (const c of crops) {
      const { data, info } = await sharp(c).raw().toBuffer({ resolveWithObject: true });
      let red = 0;
      for (let i = 0; i < data.length; i += info.channels) if (data[i] > 180 && data[i + 1] < 80 && data[i + 2] < 80) red++;
      expect(red).toBe(0);
      // Fenêtre du produit : 1100 × 440 px au plus → sortie 4:5 de 440 × 550 environ (agrandissement ≤ 1,25).
      expect(info.width).toBeLessThanOrEqual(Math.round(440 * 1.25) + 8);
      expect(info.height / info.width).toBeCloseTo(1.25, 1);
    }
  });
});

describe("vidéos", () => {
  it("photo 4:5 dans un cadre 16:9 : montrée entière sur fond flouté, jamais recadrée à 40 % ni agrandie", async () => {
    const { photoFit } = await import("@/lib/media/video");
    expect(photoFit({ width: 1600, height: 2000 }, 1920, 1080, 1.16).mode).toBe("contain");
    expect(photoFit({ width: 600, height: 400 }, 1920, 1080).mode).toBe("contain"); // il faudrait l'agrandir 3,2 fois
    const ok = photoFit({ width: 2400, height: 1350 }, 1920, 1080, 1.04);
    expect(ok.mode).toBe("cover");
    const tall = photoFit({ width: 1600, height: 2000 }, 1080, 1920);
    expect(tall.mode).toBe("cover"); // 4:5 en 9:16 : 70 % de l'image gardée, agrandissement modéré
  });

  it("plan IA : jamais utilisé sans contrôle ; refusé, il est remboursé (vidéos IA du forfait)", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/engine/videos.ts", "utf8");
    expect(src).toMatch(/req\.useAiClip && llmConfigured\(\) \? videoProviderAvailable\(\)/);
    expect(src).toMatch(/refundMediaQuota\(project\.userId, clipKey, "aiVideos"\)/);
    expect(src).toMatch(/exactly identical to the first frame/);
    const { createUser } = await import("@/lib/auth");
    const { run } = await import("@/lib/db");
    const { getSubscription, syncAllowance } = await import("@/lib/billing");
    const { consumeQuota, quotaView } = await import("@/lib/quotas");
    const { refundMediaQuota } = await import("@/lib/ai/media-providers");
    const u = await createUser(`qiv${Date.now()}@test.fr`, "motdepasse-test", "Q");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    const before = quotaView(u.id, "aiVideos").used;
    consumeQuota(u.id, "aiVideos", 1, "aiVideos:job1:clip:9:16:ads");
    expect(quotaView(u.id, "aiVideos").used).toBe(before + 1);
    expect(refundMediaQuota(u.id, "job1:clip:9:16:ads", "aiVideos")).toBe(1);
    expect(quotaView(u.id, "aiVideos").used).toBe(before);
  });

  it("UGC : sans contrôle possible, rien n'est généré ; image ou plan refusé deux fois : vidéo non créée", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync("src/lib/engine/ugc.ts", "utf8");
    expect(src).toMatch(/if \(!llmConfigured\(\)\) throw new UserFacingError/);
    expect(src).not.toMatch(/best = \{ buf, score: 10 \}/); // plus de « 10/10 » attribué sans contrôle
    expect(src).toMatch(/clipStills/);
  });
});

describe("textes des visuels", () => {
  it("ni la marque ni le titre répétés dans la ligne secondaire ou les pastilles (SOVA · SOVA · SOVA)", async () => {
    const { dedupeCreativeText } = await import("@/lib/media/creative-html");
    const base = { product: Buffer.alloc(0), palette: PAL, typo: { heading: "Jost", body: "Jost" }, cta: "Découvrir" };
    const sova = dedupeCreativeText({ ...base, brand: "SOVA", headline: "Grandir en douceur.", subline: "SOVA", facts: ["SOVA", "Rose"] });
    expect(sova.subline).toBeUndefined();
    expect(sova.facts).toEqual(["Rose"]);
    const drone = dedupeCreativeText({ ...base, brand: "Altivo", headline: "La technologie, sans détour.", subline: "Drone pliable 4K", facts: ["Drone pliable 4K", "249 g", "249 g"] });
    expect(drone.subline).toBe("Drone pliable 4K");
    expect(drone.facts).toEqual(["249 g"]);
  });
});

describe("finitions (ombre, durée, contraste)", () => {
  it("packshot d'un produit large et bas : ombre de contact douce, sans bord net ni grande tache", async () => {
    const { renderPackshot } = await import("@/lib/media/compose");
    const drone = await block(2000, 800, "#556677");
    const { data, info } = await sharp(await renderPackshot(drone)).raw().toBuffer({ resolveWithObject: true });
    const lum = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    // Colonne au bord de l'ombre (hors produit) : la luminosité varie sans saut brutal d'une ligne à l'autre.
    const x = Math.round(info.width * 0.5 + 2000 * 0.82 * 0.52);
    let maxJump = 0, darkRows = 0;
    for (let y = Math.round(info.height * 0.7); y < info.height - 1; y++) {
      maxJump = Math.max(maxJump, Math.abs(lum(x, y + 1) - lum(x, y)));
      if (lum(Math.round(info.width / 2), y) < 235 && y > info.height * 0.86) darkRows++;
    }
    expect(maxJump).toBeLessThan(6);
    // Sous le produit, l'ombre ne descend pas en grande tache (≤ 6 % de la hauteur de l'image).
    expect(darkRows).toBeLessThan(info.height * 0.06);
  });

  it("vidéo sans IA : 12 à 15 s, sans plan répété, quel que soit le secteur", async () => {
    const { localVideoPlan } = await import("@/lib/engine/local");
    const { emptyProduct } = await import("@/lib/project-types");
    const brand: any = { name: "SOVA", tagline: "Grandir en douceur.", palette: PAL };
    for (const sector of ["enfants", "hightech", "mode", "alimentation", "", "maison"]) {
      for (const roles of [["detail", "scene", "scene", "scene"], ["lifestyle", "detail", "scene"], []]) {
        for (const facts of [[], [{ key: "a", label: "Poids", value: "249 g", status: "confirmed" }, { key: "b", label: "Autonomie", value: "30 minutes", status: "confirmed" }]]) {
          const p: any = { ...emptyProduct(), name: "SOVA", sector, facts };
          const plan = localVideoPlan(p, brand, "9:16", roles);
          const total = plan.scenes.reduce((t, s) => t + s.duration, 0);
          expect(total, `${sector} ${roles.join(",")}`).toBeGreaterThanOrEqual(11.9);
          expect(total).toBeLessThanOrEqual(15.05);
          const kinds = plan.scenes.map((s) => s.kind);
          expect(new Set(kinds).size, kinds.join(",")).toBe(kinds.length);
          const imgs = plan.scenes.flatMap((s) => ("image" in s ? [s.image] : []));
          expect(new Set(imgs).size).toBe(imgs.length);
          expect(plan.scenes.every((s) => s.duration <= 6)).toBe(true);
        }
      }
    }
  });

  it("titres des vidéos lisibles sur tous les fonds (contraste ≥ 4,5:1)", async () => {
    const { textColorFor } = await import("@/lib/media/video");
    const { contrast } = await import("@/lib/color");
    for (const bg of ["#000000", "#1C1713", "#7A1F3D", "#808080", "#8A8A8A", "#B98B5E", "#F2D04B", "#E8B4C0", "#6E5644", "#3366FF", "#FFFFFF", "#2F5D62", "#C2185B"]) {
      expect(contrast(textColorFor(bg), bg), bg).toBeGreaterThanOrEqual(4.5);
    }
  });
});
