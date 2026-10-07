/**
 * Visuels d'une activité de services : une image différente par visuel (bannière d'ouverture, bannière des
 * prestations, annonce de chaque prestation, publicité). Une même image n'est reprise que pour les formats d'un
 * même visuel (la publicité en 9:16, 1:1, 16:9). Les vraies photos du client passent avant l'IA.
 */
import { describe, expect, it } from "vitest";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { assignPhotoSlots, ambianceSlots, photoSlots, serviceCardPlan } from "@/lib/engine/service-media";

const project = (n = 2): any => ({
  id: "p", userId: "u", name: "Blanc", business: "services",
  product: { ...emptyProduct(), name: "Sébastien Blanc", category: "Plâtrerie peinture", summary: "Plâtrerie, peinture et carrelage à Saint-Didier-sur-Chalaronne." },
  brand: { name: "Sébastien Blanc", tagline: "Réparer, rénover, construire.", story: "", palette: { primary: "#446274", secondary: "#D0D8DD", accent: "#446274", light: "#F2F5F7", dark: "#14181F" } },
  services: { ...emptyServiceProfile(), services: [{ name: "Peinture", description: "Intérieur et extérieur." }, { name: "Carrelage", description: "Sols et murs." }].slice(0, n), area: "Saint-Didier-sur-Chalaronne", phone: "04 74 00 00 00", contactMode: "call" },
});
const gen = (slot: string) => ({ origin: "generated", meta: JSON.stringify({ slot }) }) as any;
const real = () => ({ origin: "upload", meta: "{}" }) as any;
/** Image de chaque visuel portant une photo, par nom de visuel. */
const photosOf = (p: any, pool: any[]) => {
  const plan = serviceCardPlan(p, pool.length, null, assignPhotoSlots(p, pool));
  return plan.filter((x) => x.card.photo !== undefined).map((x) => ({ name: x.name, role: x.role, photo: x.card.photo! }));
};

describe("une image par visuel", () => {
  it("avec l'IA : 5 images (ouverture, prestations, 2 annonces, publicité) et aucune reprise entre visuels", () => {
    const p = project();
    expect(ambianceSlots(p).map((x) => x.slot)).toEqual(["hero", "banner", "service:0", "service:1", "ad"]);
    expect(new Set(ambianceSlots(p).map((x) => x.prompt)).size).toBe(5);
    // Les annonces montrent chacune leur prestation.
    expect(ambianceSlots(p).find((x) => x.slot === "service:1")!.prompt).toMatch(/Carrelage/);
    const pool = photoSlots(p).map(gen);
    const used = photosOf(p, pool);
    const ads = used.filter((x) => x.role === "ad");
    expect(new Set(ads.map((x) => x.photo)).size).toBe(1);
    const visuals = [...used.filter((x) => x.role !== "ad").map((x) => x.photo), ads[0].photo];
    expect(new Set(visuals).size).toBe(visuals.length);
    // Chaque visuel reçoit l'image faite pour lui.
    const slotOf = (name: string) => JSON.parse(pool[used.find((x) => x.name.startsWith(name))!.photo].meta).slot;
    expect(slotOf("banniere-ouverture")).toBe("hero");
    expect(slotOf("banniere-prestations")).toBe("banner");
    expect(slotOf("prestation-peinture")).toBe("service:0");
    expect(slotOf("prestation-carrelage")).toBe("service:1");
  });

  it("vraies photos d'abord, une par visuel ; l'IA ne fait que les images manquantes", () => {
    const p = project();
    const pool = [real(), real(), gen("service:0"), gen("service:1"), gen("ad")];
    const used = photosOf(p, pool);
    const byName = (n: string) => used.find((x) => x.name.startsWith(n))!.photo;
    expect([byName("banniere-ouverture"), byName("banniere-prestations")].sort()).toEqual([0, 1]);
    expect(byName("prestation-peinture")).toBe(2);
    expect(byName("prestation-carrelage")).toBe(3);
    expect(used.filter((x) => x.role === "ad").every((x) => x.photo === 4)).toBe(true);
  });

  it("une seule prestation : 4 images ; sans aucune image : visuels typographiques", () => {
    const p = project(1);
    expect(photoSlots(p)).toEqual(["hero", "banner", "service:0", "ad"]);
    expect(photosOf(p, [])).toEqual([]);
  });
});
