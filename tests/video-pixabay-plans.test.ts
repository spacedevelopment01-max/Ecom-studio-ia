/** Vidéos sur plans Pixabay : bons plans retenus, aucune consigne interne à l'écran, lecture des plans fluide. */
import { describe, expect, it } from "vitest";
import { rankStock, tradeStock } from "@/lib/stock/trade-queries";
import { clipFor } from "@/lib/video-v2/engine";
import { safeZone, SIZES } from "@/lib/video-v2/doc";

describe("plans Pixabay d'une vidéo", () => {
  it("un brouillard « fog roller » n'est pas un plan de peintre", () => {
    const must = tradeStock("plâtrier peintre")!.must;
    const found = [
      { alt: "fog, fog roller, foggy, wisps of mist, forest" },
      { alt: "painter, paint, roller, wall, repair, design, renovate, work" },
    ];
    expect(rankStock(found, must, false).map((p) => p.alt)).toEqual([found[1].alt]);
  });

  it("une image ou vidéo générée par IA déposée sur la banque est écartée", () => {
    const found = [{ alt: "ai generated, spa, candles, relaxation" }, { alt: "spa, candles, relaxation, towels" }];
    expect(rankStock(found, ["spa"], false).map((p) => p.alt)).toEqual([found[1].alt]);
    expect(rankStock(found, [], false).map((p) => p.alt)).toEqual([found[1].alt]);
  });

  it("un plan sans texte n'affiche jamais sa consigne de recherche, mais la marque", () => {
    const subject = "le lieu de travail, les outils et les matériaux, plâtrier peintre, sans personne";
    const shot = { id: "s2", part: "development", method: "kinetic_type", subject, onScreen: "", voice: "Un travail propre, étape par étape.", durationS: 3, transition: "cut", camera: "static", reference: { assetId: null }, source: { kind: "compose" } } as any;
    const pal = { primary: "#2F4A33", secondary: "#B5C4A8", accent: "#2F4A33", light: "#F4EEE3", dark: "#1F3323" };
    const clip = clipFor(shot, { kind: "doc", assetId: null }, { pal, typo: { heading: "Archivo", body: "Jost" }, size: SIZES["9:16"], safe: safeZone("9:16", "reels"), insight: { brand: "Sébastien Blanc" }, inv: { photos: [], cutout: null, logo: null }, strategy: { cta: "Prendre rendez-vous", message: "" } } as any, 1);
    const text = JSON.stringify(clip);
    expect(text).not.toContain("sans personne");
    expect(text).toContain("Sébastien Blanc");
  });
});
