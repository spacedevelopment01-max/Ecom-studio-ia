/** La piste de logo retenue donne le ton à tout : couleurs (site, visuels, vignettes) et typographies du site. */
import { describe, expect, it } from "vitest";
import { effectivePalette } from "@/lib/route-palette";
import { routeFonts } from "@/lib/engine/shop";

const pal = { primary: "#1F3A5F", secondary: "#E3E6EA", accent: "#C8402A", light: "#F5F4F1", dark: "#14171C" };
const route = (accent: string, ground: string, roles?: any) => ({ key: "concept", name: "Monogramme A", heading: "Bricolage Grotesque", headingWeight: 800, body: "DM Sans", colors: { ink: pal.dark, accent, ground, tint: pal.light }, roles, source: "local" as const });

describe("identité corrélée à la piste choisie", () => {
  it("monogramme bleu nuit sur fond sombre : le site perd l'accent rouge", () => {
    const eff = effectivePalette({ palette: pal, logo: { route: route(pal.primary, pal.dark, { ink: "dark", accent: "primary", ground: "dark", tint: "light" }) } as any })!;
    expect(eff.accent).toBe(pal.primary);
    expect(eff.primary).toBe(pal.dark);
    expect(Object.values({ p: eff.primary, a: eff.accent })).not.toContain(pal.accent);
  });

  it("rôles retrouvés d'après les codes couleur (pistes enregistrées avant)", () => {
    const eff = effectivePalette({ palette: pal, logo: { route: route(pal.accent, pal.accent) } as any })!;
    expect(eff.accent).toBe(pal.accent);
    expect(eff.primary).toBe(pal.accent);
  });

  it("sans piste : palette de la marque inchangée", () => {
    expect(effectivePalette({ palette: pal, logo: {} as any })).toEqual(pal);
  });

  it("typographies du site reprises de la piste quand le thème les connaît", () => {
    expect(routeFonts({ heading: "Playfair Display", headingWeight: 700, body: "Inter" })).toEqual({ heading: "playfair_display_n7", body: "inter_n4" });
    expect(routeFonts({ heading: "Chivo", headingWeight: 800, body: "Karla" })?.heading).toMatch(/^chivo_n/);
    expect(routeFonts({ heading: "Bricolage Grotesque", headingWeight: 800, body: "DM Sans" })).toEqual({ heading: "archivo_n8", body: "dm_sans_n4" });
    expect(routeFonts({ heading: "Police Inconnue", headingWeight: 700, body: "Inter" })).toBeNull();
  });
});
