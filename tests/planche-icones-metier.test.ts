/**
 * Icônes de la planche : celles du vrai métier (la planche Sonore montrait un moteur, une voiture et un volant pour un
 * casque audio ; « montre automatique » était lu « auto »), une seule par famille.
 */
import { describe, expect, it } from "vitest";
import { boardIcons } from "@/lib/engine/identity-board";

describe("icônes de la planche", () => {
  it("casque audio : casque et musique, jamais de voiture", () => {
    const icons = boardIcons("Audio Casque audio supra-auriculaire noir, coques argentées", "products");
    expect(icons.slice(0, 2)).toEqual(["headphones", "music"]);
    expect(icons).not.toEqual(expect.arrayContaining(["car"]));
    expect(icons.some((n) => /car|engine|steering/.test(n))).toBe(false);
  });

  it("montre automatique : une montre et une horloge, une seule par famille, jamais de voiture", () => {
    const icons = boardIcons("Montre automatique acier et cuir", "products");
    expect(icons.slice(0, 2)).toEqual(["device-watch", "clock"]);
    expect(icons.filter((n) => n.startsWith("clock"))).toHaveLength(1);
    expect(icons.some((n) => /car|engine|steering/.test(n))).toBe(false);
  });

  it("mots entiers : un vrai garage garde ses icônes, « transport » et « achat » ne deviennent ni sport ni chat", () => {
    expect(boardIcons("Garage auto, réparation automobile", "services")).toEqual(expect.arrayContaining(["car"]));
    const t = boardIcons("Service de transport, achat en ligne", "services");
    expect(t.some((n) => /barbell|paw|cat/.test(n))).toBe(false);
    expect(new Set(t).size).toBe(t.length);
  });
});
