/**
 * Studio Découverte : seuls les visuels sans défaut de la montre ARVEN sont montrés (liste fixée par le
 * propriétaire) ; les autres démonstrations restent entières ; aucune rubrique n'affiche d'image vide ou cassée.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { demoList } from "@/lib/demo-content";
import { discoveryAllows, discoveryDemo, fullDemo } from "@/lib/discovery-demos";

const RETIRES = ["post-1", "post-8", "ad-1", "banner-1", "social-1", "detail-1", "video", "video-poster", "boutique-bureau", "boutique-mobile", "fiche-produit", "planche", "lifestyle-2"];
const exists = (src: string) => fs.existsSync(path.join(process.cwd(), "public", src));

describe("studio Découverte : visuels de la montre ARVEN", () => {
  it("fichiers retirés jamais montrés (JPEG, WebP ou version anglaise) ; fichiers gardés montrés", () => {
    for (const f of RETIRES) for (const ext of [".jpg", ".webp", ".en.jpg", ".mp4"]) expect(discoveryAllows("montre", `/demo/montre/${f}${ext}`), f + ext).toBe(false);
    for (const f of ["logo.png", "cutout-1.webp", "packshot-1.jpg", "packshot-1.webp", "lifestyle-1.jpg", "publicite-ia-1.jpg", "photo.webp"]) expect(discoveryAllows("montre", `/demo/montre/${f}`), f).toBe(true);
    expect(discoveryAllows("montre", "")).toBe(false);
  });

  for (const lang of ["fr", "en"] as const) {
    it(`${lang} : la montre ne garde que des visuels autorisés et existants ; les autres démonstrations sont inchangées`, () => {
      const raw = demoList(lang);
      const list = raw.map(discoveryDemo);
      const m = list.find((d) => d.id === "montre");
      expect(m).toBeTruthy();
      const shown = [m!.photo, m!.logo, m!.shopDesktop, m!.shopMobile, m!.video, m!.videoPoster, m!.board ?? "", ...m!.images.map((i) => i.src), ...(m!.posts ?? [])].filter(Boolean);
      expect(shown.length).toBeGreaterThan(0);
      for (const s of shown) {
        expect(discoveryAllows("montre", s), s).toBe(true);
        expect(exists(s), s).toBe(true);
      }
      expect(m!.shopDesktop).toBe("");
      expect(m!.video).toBe("");
      expect(m!.posts ?? []).toHaveLength(0);
      expect(m!.board).toBeUndefined();
      // Onglet « Images et vidéos » : une démonstration incomplète n'y est pas (aucune image vide affichée).
      expect(fullDemo(m!)).toBe(false);
      // Les autres démonstrations restent toutes là, entières.
      for (const d of raw.filter((x) => x.id !== "montre")) expect(list.find((x) => x.id === d.id)).toEqual(d);
      expect(list.filter(fullDemo).length).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("studio Découverte : aperçus des 30 thèmes", () => {
  it("en anglais, chaque aperçu pointe vers un fichier qui existe (pas d'image cassée)", async () => {
    const { directionCards } = await import("@/lib/theme/directions");
    const { localMedia, webpOf } = await import("@/lib/demo-content");
    expect(fs.readFileSync(path.join(process.cwd(), "src/app/studio/decouverte/page.tsx"), "utf8")).toContain('c.preview.replace(/\\.en(\\.\\w+)$/, "$1")');
    for (const c of directionCards("en")) {
      const src = webpOf(localMedia(c.preview.replace(/\.en(\.\w+)$/, "$1"), "en"));
      expect(exists(src), src).toBe(true);
    }
  });
});
