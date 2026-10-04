import { describe, expect, it } from "vitest";
import { runWithLang, withContentLang } from "@/lib/i18n-server";
import { localCopy, factMarquee } from "@/lib/engine/local-copy";
import { localAnalysis, localBrand, localThemeCommand, localVideoPlan, factsFromDescription, guessSector } from "@/lib/engine/local";
import { localPlan } from "@/lib/engine/calendar";
import { proposeTaglines, logoProposals } from "@/lib/engine/identity";
import { colorName } from "@/lib/color";
import { emptyProduct, sectorLabel, SECTOR_IDS } from "@/lib/project-types";
import { sampleSpec } from "./fixtures";

const FRENCH = /\b(le|la|les|des|du|une|votre|vos|pour|avec|et)\b|[«»]|À compléter/i;

/** Toutes les chaînes d'une valeur (objets et tableaux parcourus). */
function strings(v: unknown, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => strings(x, out));
  return out;
}
const frenchIn = (v: unknown) => strings(v).filter((s) => FRENCH.test(s));

const product = {
  ...emptyProduct(),
  name: "Glow Serum",
  sector: "beaute" as const,
  facts: [
    { key: "capacity", label: "Capacity", value: "30 ml", status: "confirmed" as const, source: "photo" as const },
    { key: "shipping", label: "Shipping", value: "", status: "unknown" as const, source: "ai" as const },
  ],
};

describe("contenus en anglais (moteur local)", () => {
  it("les textes de la boutique ne contiennent aucun mot français", () => {
    withContentLang("en", () => {
      for (const sector of SECTOR_IDS) {
        const copy = localCopy({ ...product, sector }, { name: "Dawn & Co", tagline: "", story: "", values: [] });
        expect(frenchIn(copy), sector).toEqual([]);
        expect(strings(copy).join(" ")).toContain("[To complete: ");
      }
      const marquee = factMarquee({ ...product, variants: [{ name: "Scent", values: ["Rose", "Citrus"] }] }, { name: "Dawn", tagline: "" });
      expect(marquee).toContain("2 scents to choose from");
      expect(marquee).toContain("Capacity: 30 ml");
    });
  });

  it("marque, analyse, vidéo, calendrier et signatures en anglais", () => {
    withContentLang("en", () => {
      for (const sector of SECTOR_IDS) {
        const b = localBrand({ ...product, sector });
        expect(frenchIn(b.brand), sector).toEqual([]);
        expect(frenchIn(b.strategy), sector).toEqual([]);
        expect(frenchIn(localVideoPlan({ ...product, sector }, b.brand, "9:16", ["lifestyle", "detail"])), sector).toEqual([]);
      }
      const analysis = localAnalysis({ description: "Capacity: 50 ml\nShipping: 3 to 5 days", colors: [{ hex: "#1D4ED8", name: colorName("#1D4ED8", "en"), share: 1 }], photos: 1 });
      expect(frenchIn({ ...analysis, questions: [] })).toEqual([]);
      expect(analysis.facts.find((f) => f.key === "capacity")?.label).toBe("Capacity");
      const brand = localBrand(product).brand;
      const project = { product, brand, catalog: [], name: "Glow" } as any;
      const posts = localPlan(project, { startDate: "2026-01-01", days: 6, perDay: 1, slots: ["10:00"], timezone: "Europe/London", networks: [{ network: "instagram" }], goals: "", tone: "", mix: { photo: 100, video: 0, text: 0 }, link: "https://example.com", approval: "manual" });
      expect(frenchIn(posts)).toEqual([]);
      expect(frenchIn(proposeTaglines({ ...project, product: { ...product, variants: [{ name: "Scent", values: ["Rose", "Citrus"] }] } }))).toEqual([]);
      expect(frenchIn(logoProposals(project).map((x) => x.concept))).toEqual([]);
    });
  });

  it("le chat local comprend l'anglais et répond dans la langue de l'interface", () => {
    runWithLang({ ui: "en", content: "en" }, () => {
      for (const msg of ["add estimated delivery 2 to 4 days", 'add badges "Vegan" "No added sugar"', "add bundles", "put the price in the button", "add a subscription", "make the button blue"]) {
        const r = localThemeCommand(sampleSpec(), msg, null);
        expect(r.ops.length, msg).toBeGreaterThan(0);
        expect(frenchIn([r.reply, r.ops]), msg).toEqual([]);
      }
      expect(localThemeCommand(sampleSpec(), "undo", null).revert).toBe(true);
      expect(frenchIn(localThemeCommand(sampleSpec(), "add estimated delivery", null).reply)).toEqual([]);
      // Une demande en français est comprise même avec une interface en anglais.
      const fr = localThemeCommand(sampleSpec(), "ajoute la livraison estimée 2 à 4 jours", null);
      expect(fr.ops).toHaveLength(1);
      expect(frenchIn(fr.reply)).toEqual([]);
    });
  });

  it("libellés, couleurs et détection en anglais", () => {
    expect(sectorLabel("animaux", "en")).toBe("Pets");
    expect(sectorLabel("animaux")).toBe("Animaux");
    expect(colorName("#1D4ED8", "en")).toBe("blue");
    expect(colorName("#1D4ED8")).toBe("bleu");
    expect(guessSector("Scented soy candle")).toBe("maison");
    expect(guessSector("Leather dog leash")).toBe("animaux");
    withContentLang("en", () => expect(factsFromDescription("Weight: 200 g")[0]).toMatchObject({ key: "weight", label: "Weight" }));
  });
});
