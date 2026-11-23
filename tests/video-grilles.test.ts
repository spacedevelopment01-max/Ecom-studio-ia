/** Rapport 09, points 8 et 9 : les deux grilles (publication 9-15 s, publicité 21-30 s), carte de fin hors des 35 % du bas, coupes au rythme. */
import { describe, expect, it } from "vitest";
import { gridAnimatedShots, gridDuration, gridDurations, gridFor, gridParts } from "@/lib/video-v2/grilles";
import { endCardDoc, safeZone } from "@/lib/video-v2/doc";
import { snapToBeat } from "@/lib/video-v2/engine";

describe("grilles des vidéos courtes", () => {
  it("publication de 9 à 15 s en 5 temps : accroche 2 s au plus, chaque temps sous 4 s, l'offre à la fin", () => {
    expect(gridFor({ kind: "social_content", platform: "reels", durationS: 12, purpose: "organic" })).toBe("post");
    expect(gridDuration("post", 30)).toBe(15);
    const parts = gridParts("post", { proof: true, cta: true });
    expect(parts).toEqual(["hook", "development", "demonstration", "conclusion", "cta"]);
    const d = gridDurations("post", parts, 15);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(15, 5);
    expect(d[0]).toBeLessThanOrEqual(2);
    expect(d.every((x) => x <= 4.05)).toBe(true);
    expect(gridAnimatedShots("post")).toBe(1);
  });
  it("publicité de 21 à 30 s : une preuve (seulement si elle est vraie) et deux plans animés", () => {
    expect(gridFor({ kind: "video_ad", platform: "tiktok", durationS: 24 })).toBe("ad");
    // Durée demandée hors de la plage (publicité de 15 s) : découpage habituel, sans grille.
    expect(gridFor({ kind: "video_ad", platform: "tiktok", durationS: 15 })).toBeNull();
    expect(gridDuration("ad", 15)).toBe(21);
    expect(gridParts("ad", { proof: true, cta: true })).toContain("proof");
    expect(gridParts("ad", { proof: false, cta: true })).not.toContain("proof");
    const d = gridDurations("ad", gridParts("ad", { proof: true, cta: true }), 24);
    expect(d.reduce((a, b) => a + b, 0)).toBeCloseTo(24, 5);
    expect(d[0]).toBeLessThanOrEqual(2);
    expect(gridAnimatedShots("ad")).toBe(2);
    // Site, fiche produit, YouTube : pas de grille courte.
    expect(gridFor({ kind: "product_demo", platform: "shop_page", durationS: 30 })).toBeNull();
  });
  it("carte de fin : logo et offre dans le tiers du milieu, jamais dans les 35 % du bas", () => {
    for (const [w, h] of [[1080, 1920], [1080, 1350], [1080, 1080], [1920, 1080]]) {
      const doc = endCardDoc({ w, h, safe: safeZone("9:16", "reels"), pal: { primary: "#111111", secondary: "#222222", accent: "#e0662c", dark: "#101010", light: "#fafafa" }, typo: { heading: "Inter", body: "Inter" }, brand: "Éclat", cta: "Découvrir la crème", line: "La peau douce dès le matin", logoId: "logo", big: true });
      for (const l of doc.layers.filter((x) => x.role !== "background")) expect(l.y + l.h).toBeLessThanOrEqual(h * 0.65 + 0.5);
    }
  });
  it("coupes calées sur les temps de la musique, durée totale gardée", () => {
    const clip = (id: string, d: number) => ({ id, shotId: id, label: id, part: null, durationS: d, source: { kind: "color", color: "#000" }, overlays: [], transitionIn: { kind: "cut", durationS: 0 } }) as never;
    const out = snapToBeat([clip("a", 2.3), clip("b", 3.1), clip("c", 4.6)], 0.5) as { durationS: number }[];
    expect(out.reduce((t, c) => t + c.durationS, 0)).toBeCloseTo(10, 5);
    let at = 0;
    for (const c of out.slice(0, -1)) { at += c.durationS; expect(Math.abs(at / 0.5 - Math.round(at / 0.5))).toBeLessThan(1e-6); }
  });
});
