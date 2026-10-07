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
