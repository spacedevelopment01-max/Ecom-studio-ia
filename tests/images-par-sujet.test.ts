/**
 * Images choisies d'après leur sujet : la carte d'une prestation montre cette prestation (jamais la photo d'une autre),
 * chaque prestation est cherchée par son nom, et le contrôle visuel refuse une image d'un autre sujet.
 */
import { describe, expect, it } from "vitest";
import { buildSpec } from "@/lib/theme/directions";
import { runWithLang } from "@/lib/i18n-server";
import { localCopy } from "@/lib/engine/local-copy";
import { serviceProfile } from "./fixtures";
import { slotSubject, stockPhotoSlots } from "@/lib/engine/service-media";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";

const services = { ...serviceProfile, services: [{ name: "Peinture", description: "Intérieur et extérieur." }, { name: "Carrelage", description: "Sols et murs." }, { name: "Plâtrerie", description: "Cloisons." }] };
const spec = (images: any) =>
  runWithLang({ content: "fr" }, () =>
    buildSpec({
      direction: "atelier",
      shopName: "Blanc",
      palette: { primary: "#2F5D62", secondary: "#DCE8E4", accent: "#E0A458", light: "#F4F7F5", dark: "#14201F" },
      copy: localCopy({ ...emptyProduct(), name: "Blanc", category: "Plâtrerie peinture" } as any, { name: "Blanc", tagline: "", story: "", values: [] }, { business: "services", services: services as any }),
      images,
      files: {},
      product: { title: "Blanc", handle: "blanc", vendor: "Blanc", description_html: "", price: null, compare_at_price: null, currency: "EUR", options: [], variants: [], images: [], tags: [] },
      language: "fr",
      business: "services",
      services: services as any,
    } as any),
  );
const cards = (s: any) => Object.values(s.templates.index.sections).flatMap((x: any) => Object.values(x.blocks ?? {}).filter((b: any) => b.type === "service")) as any[];

describe("images par sujet", () => {
  it("carte de prestation : sa propre photo ; sans photo propre, une photo générale (jamais celle d'une autre prestation)", () => {
    const s = spec({ hero: "hero.jpg", scene1: "peinture.jpg", scene2: "carrelage.jpg", scene3: "general.jpg", byService: { peinture: "peinture.jpg", carrelage: "carrelage.jpg" } });
    const byTitle = Object.fromEntries(cards(s).map((b) => [b.settings.title, b.settings.image_asset]));
    expect(Object.keys(byTitle).length).toBeGreaterThan(0);
    expect(byTitle["Peinture"]).toBe("peinture.jpg");
    expect(byTitle["Carrelage"]).toBe("carrelage.jpg");
    expect(byTitle["Plâtrerie"]).toBe("general.jpg");
  });
  it("une photo par prestation (jusqu'à 6), chacune avec son sujet", () => {
    const p: any = { product: { ...emptyProduct(), category: "Plâtrerie peinture", name: "Blanc" }, services: { ...emptyServiceProfile(), services: services.services }, business: "services", name: "Blanc" };
    expect(stockPhotoSlots(p)).toEqual(expect.arrayContaining(["service:0", "service:1", "service:2"]));
    expect(slotSubject(p, "service:1")).toMatchObject({ service: "Carrelage" });
    expect(slotSubject(p, "service:1").subject).toMatch(/Carrelage/);
  });
});

import { assignPhotoSlots, coveredSlots, photoSlots } from "@/lib/engine/service-media";
describe("vos photos reconnues", () => {
  const p: any = { product: { ...emptyProduct(), category: "Plâtrerie peinture", name: "Blanc" }, services: { ...emptyServiceProfile(), services: services.services }, business: "services", name: "Blanc" };
  const real = (service?: string) => ({ origin: "upload", meta: JSON.stringify(service ? { service } : {}) }) as any;
  it("une photo de carrelage va sur l'emplacement Carrelage, une photo générale sur l'ouverture", () => {
    const pool = [real(), real("Carrelage")];
    const a = assignPhotoSlots(p, pool);
    expect(a["service:1"]).toBe(1);
    expect(a.hero).toBe(0);
  });
  it("emplacements couverts : la prestation montrée, et les emplacements généraux pour les photos générales (jamais une autre prestation)", () => {
    const c = coveredSlots(p, stockPhotoSlots(p), [real("Carrelage"), real(), real()]);
    expect([...c].sort()).toEqual(["banner", "hero", "service:1"].sort());
    expect(c.has("service:0")).toBe(false);
    expect(photoSlots(p)).toContain("service:1");
  });
});

import { paletteVariant, draftPalette } from "@/lib/engine/creative-direction";
import { hsl } from "@/lib/color";
describe("un code couleur par piste", () => {
  it("variantes d'une autre dominante, structure lisible (fond clair, texte sombre)", () => {
    const pal = { primary: "#8A3B26", secondary: "#E9DDD3", accent: "#B5714A", light: "#F7F3EF", dark: "#1C1714" };
    const hues = [0, 1, 2].map((i) => hsl(paletteVariant(pal, i).accent)[0]);
    const gap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    expect(gap(hues[0], hues[1])).toBeGreaterThan(60);
    expect(gap(hues[1], hues[2])).toBeGreaterThan(40);
    const v = paletteVariant(pal, 1);
    expect(hsl(v.light)[2]).toBeGreaterThan(0.9);
    expect(hsl(v.dark)[2]).toBeLessThan(0.2);
    expect(paletteVariant(pal, 0)).toEqual(pal);
  });
  it("palette proposée par l'IA : gardée si les 5 codes sont valides", () => {
    expect(draftPalette({ primary: "#112233", secondary: "#DDEEFF", accent: "#AA5500", light: "#FAFAFA", dark: "#111111" })).toBeTruthy();
    expect(draftPalette({ primary: "bleu" })).toBeNull();
  });
});
