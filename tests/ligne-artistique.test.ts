/**
 * Direction artistique partagée par les publications et les vidéos : chaque style de marque a sa ligne (familles de
 * modèles, lumière signature des photos ; typographie, élément graphique, mot fort, rythme et étalonnage des vidéos).
 * Variété dans la ligne : composition et lumière changent d'une publication à la suivante, la signature reste.
 */
import { describe, expect, it } from "vitest";
import type { Layer } from "@/lib/ad-doc/types";

describe("Direction artistique (publications et vidéos)", async () => {
  const { artDirection, GRADE_FFMPEG, GRADE_CANVAS } = await import("@/lib/art-direction");
  const { pickPosterLook } = await import("@/lib/ads-v2/poster");
  const { templateById } = await import("@/lib/ads-v2/library");
  const { heroOverlay, statementOverlay, applyLook } = await import("@/lib/video-v2/promo");
  const { VideoDocumentSchema } = await import("@/lib/video-v2/store");
  const art = (style: "premium" | "bold" | "craft" | "warm") => ({ style, heading: "Playfair Display", headingWeight: 700, body: "Jost", display: "Archivo", displayWeight: 800, uppercase: false, cta: "pill", arrow: true, cycle: ["editorial", "poster", "panel", "lower"] }) as any;

  it("chaque style a sa ligne, et chaque étalonnage vidéo existe pour les plans filmés et les photos", () => {
    const styles = ["premium", "bold", "craft", "warm"] as const;
    const looks = styles.map((s) => JSON.stringify(artDirection({ style: s }).video));
    expect(new Set(looks).size).toBe(4);
    for (const s of styles) {
      const d = artDirection({ style: s });
      expect(GRADE_FFMPEG[d.video.grade]).toMatch(/eq=/);
      expect(GRADE_CANVAS[d.video.grade]).toBeTruthy();
      expect(d.families.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("publications : seulement les familles de la ligne, lumière signature qui alterne, jamais deux fois la même composition", () => {
    for (const style of ["premium", "bold", "craft", "warm"] as const) {
      const a = art(style);
      const d = artDirection(a);
      const recent: { layout: string; treatment: string | null; logo: string | null; scheme: string | null }[] = [];
      for (let n = 0; n < 10; n++) {
        const look = pickPosterLook(a, 300 + n * 17, recent, true);
        if (look.layout.startsWith("tpl:")) expect(d.families, `${style} ${look.layout}`).toContain(templateById(look.layout.slice(4))!.family);
        if (recent[0]) {
          expect(look.layout).not.toBe(recent[0].layout);
          expect(look.variant.treatment).not.toBe(recent[0].treatment);
        }
        recent.unshift({ layout: look.layout, treatment: look.variant.treatment ?? null, logo: look.variant.logo ?? null, scheme: look.variant.scheme ?? null });
      }
      // La lumière signature domine le fil.
      const sig = recent.filter((r) => d.grades.includes(r.treatment as never)).length;
      expect(sig, style).toBeGreaterThanOrEqual(6);
    }
  });

  const input = (style: "premium" | "bold" | "craft" | "warm") => ({
    p: { brand: { personality: [] }, business: "services" } as any,
    pal: { primary: "#7A3E48", secondary: "#E3C9C3", accent: "#C79A5B", light: "#FAF4F1", dark: "#231A1C" },
    typo: { heading: "Playfair Display", body: "Montserrat", headingWeight: 700 },
    w: 1080, h: 1920, safe: { top: 240, bottom: 380, side: 64 }, brand: "Atelier Lumière", logoId: null, thumbs: ["a", "b", "c"], cta: "Réserver", message: "",
    look: artDirection({ style }).video,
  });
  const dressed = (style: "premium" | "bold" | "craft" | "warm") => {
    const o = input(style);
    return { o, hero: applyLook(heroOverlay(o, ["Salon de coiffure", "à Lyon"], "Coupe · Couleur", "Coiffure et soins"), o), stmt: applyLook(statementOverlay(o, "Des couleurs qui vous ressemblent", "m1", "stack"), o) };
  };
  const texts = (ls: Layer[]) => ls.filter((l) => l.kind === "text") as Extract<Layer, { kind: "text" }>[];

  it("vidéo raffinée : police de la marque, cadre de filets, mot fort souligné, aucune forme inclinée, animations posées", () => {
    const { hero, stmt } = dressed("premium");
    expect(hero.some((l) => l.name === "Angle")).toBe(false);
    expect(hero.filter((l) => l.name === "Filet").length).toBe(4);
    expect(texts(hero).find((l) => l.id.startsWith("h-title"))!.font.family).toBe("Playfair Display");
    expect(texts(hero).find((l) => l.id.startsWith("h-title"))!.uppercase).toBe(false);
    const hl = stmt.find((l) => l.name === "Surlignage")!;
    expect(hl.h).toBeLessThanOrEqual(10);
    expect([...hero, ...stmt].some((l) => l.anim?.in === "pop" || l.anim?.in === "drop")).toBe(false);
  });

  it("vidéo affiche franche : capitales d'affiche, formes inclinées, mot fort surligné d'un aplat", () => {
    const { hero, stmt } = dressed("bold");
    expect(hero.some((l) => l.name === "Angle")).toBe(true);
    expect(texts(hero).find((l) => l.id.startsWith("h-title"))!.uppercase).toBe(true);
    expect(stmt.find((l) => l.name === "Surlignage")!.h).toBeGreaterThan(40);
  });

  it("vidéos artisan et chaleureuse : formes arrondies, accroche dans une pastille qui ne touche pas le titre", () => {
    for (const style of ["craft", "warm"] as const) {
      const { hero } = dressed(style);
      expect(hero.some((l) => l.name === "Angle"), style).toBe(false);
      const hl = hero.find((l) => l.name === "Surlignage")! as any;
      expect(hl.radius, style).toBeGreaterThanOrEqual(hl.h / 2 - 1);
      const pill = hero.find((l) => l.id === "h-sub-pill")!;
      const titles = texts(hero).filter((l) => l.id.startsWith("h-title"));
      const lastTitle = titles[titles.length - 1];
      expect(pill.y, style).toBeGreaterThanOrEqual(lastTitle.y + lastTitle.h - 4);
    }
    expect(texts(dressed("craft").hero).find((l) => l.id.startsWith("h-title"))!.uppercase).toBe(false);
  });

  it("document vidéo : l'étalonnage est enregistré et accepté à la relecture", () => {
    expect(VideoDocumentSchema.shape.grade.safeParse("cinematic").success).toBe(true);
    expect(VideoDocumentSchema.shape.grade.safeParse("sepia-fou").success).toBe(false);
  });
});
