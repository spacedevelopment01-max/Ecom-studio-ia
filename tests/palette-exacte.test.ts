/** Palette d'une piste réglée case par case : ce que le client voit est exactement ce qui est enregistré. */
import { describe, expect, it } from "vitest";
import { effectivePalette, exactRoles, paletteSources } from "@/lib/route-palette";

const pal = { primary: "#8A2E43", secondary: "#E2CAD0", accent: "#C9775E", light: "#F7F2F3", dark: "#1F1417" };
const ROLES = ["primary", "secondary", "accent", "light", "dark"] as const;

describe("palette exacte", () => {
  for (const [label, roles] of [
    ["logo sur fond clair, accent = principale", { ink: "dark", accent: "primary", ground: "light", tint: "secondary" }],
    ["logo sur fond soutenu", { ink: "dark", accent: "accent", ground: "dark", tint: "secondary" }],
  ] as const) {
    it(`${label} : les cinq cases deviennent indépendantes`, () => {
      const brand: any = { palette: pal, logo: { route: { roles, colors: {} } } };
      const src = paletteSources(brand);
      // Avant : certaines cases partagent la même couleur d'origine.
      if (label.includes("clair")) expect(src.primary).toBe(src.accent);
      const shown = effectivePalette(brand)!;
      const edited = { ...shown, accent: "#123456", primary: "#654321" };
      const after: any = { palette: edited, logo: { route: { roles: exactRoles(brand, roles), colors: {} } } };
      for (const k of ROLES) expect(paletteSources(after)[k]).toBe(k);
      expect(effectivePalette(after)).toEqual(edited);
    });
  }
});
