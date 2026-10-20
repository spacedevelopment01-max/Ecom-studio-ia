/**
 * Démonstrations du studio (priorité du 19 octobre 2026, issue #137) : seules FRAISE, ONDE, ORBE et Atelier Rive ;
 * leurs visuels viennent du kit privé (hors dépôt) et un fichier absent est omis : aucune page n'affiche d'image vide
 * ou cassée, ni un gabarit à la place. Les anciennes démonstrations ont disparu du manifeste.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO_IDS, demoList, demos } from "@/lib/demo-content";
import { discoveryDemo, startingPhotoIsClients } from "@/lib/discovery-demos";

const exists = (src: string) => fs.existsSync(path.join(process.cwd(), "public", src));
const OLD = ["montre", "tribunes", "gourde", "casque", "paysagiste", "fleuriste", "drone", "savon", "cafe", "tillandsia", "barbier"];
/** Kit privé installé (public/demo/<id>/) : vérifications supplémentaires sur les fichiers eux-mêmes. */
// Kit privé (public/demo/<id>/, hors dépôt) ; SILLON a ses médias dans le dépôt (public/theme-assets/sillon/, issue #148).
const installed = DEMO_IDS.every((id) => fs.existsSync(path.join(process.cwd(), "public", id === "sillon" ? "theme-assets" : "demo", id)));

describe("démonstrations : les quatre seules, anciennes retirées", () => {
  it("le manifeste (FR et EN) ne contient que fraise, onde, orbe, rive et sillon, avec leur catégorie et leur thème de référence", () => {
    for (const file of ["manifest.json", "manifest.en.json"] as const) {
      const list = demos(file);
      expect(list.map((d) => d.id)).toEqual([...DEMO_IDS]);
      for (const d of list) {
        expect(d.direction, d.id).toBe(d.id);
        expect(d.business).toBe(d.id === "rive" ? "services" : "products");
        expect((d as { category?: string }).category).toBe(d.id === "rive" ? "services" : d.id === "orbe" ? "catalog" : "specialty");
        expect(d.palette).toHaveLength(5);
        expect(d.source?.note ?? "").toMatch(/fictiv|fictional/i);
        expect(startingPhotoIsClients(d), `${d.id} : photo IA, jamais « fournie par le client »`).toBe(false);
      }
    }
    for (const old of OLD) expect(fs.existsSync(path.join(process.cwd(), "public", "demo", old)), old).toBe(false);
    expect(fs.existsSync(path.join(process.cwd(), "scripts", "build-demos.ts"))).toBe(false);
  });

  for (const lang of ["fr", "en"] as const) {
    it(`${lang} : chaque visuel annoncé existe sur le disque, un visuel absent est omis (jamais d'image cassée)`, () => {
      const list = demoList(lang).map(discoveryDemo);
      expect(list.map((d) => d.id)).toEqual([...DEMO_IDS]);
      for (const d of list) {
        const shown = [d.photo, d.logo, d.shopDesktop, d.shopMobile, d.video, d.videoPoster, d.board ?? "", ...d.images.map((i) => i.src), ...(d.posts ?? [])].filter(Boolean);
        for (const s of shown) expect(exists(s), `${d.id} : ${s}`).toBe(true);
        if (installed) {
          expect(d.photo, `${d.id} : photo du kit`).not.toBe("");
          expect(d.images.length, `${d.id} : visuels du kit`).toBeGreaterThanOrEqual(3);
        }
      }
    });
  }
});

describe("aperçus des thèmes (vignettes privées, rendues avec les quatre démonstrations)", () => {
  it("en anglais, chaque aperçu pointe vers un fichier existant quand les vignettes sont installées ; jamais une ancienne démonstration", async () => {
    const { directionCards } = await import("@/lib/theme/directions");
    const { localMedia, webpOf } = await import("@/lib/demo-content");
    expect(fs.readFileSync(path.join(process.cwd(), "src/app/studio/decouverte/page.tsx"), "utf8")).toContain('c.preview.replace(/\\.en(\\.\\w+)$/, "$1")');
    const dir = path.join(process.cwd(), "public", "demo", "directions");
    if (!fs.existsSync(dir)) { console.info("Vignettes des thèmes non installées (kit privé) : contrôle d'existence sauté."); return; }
    for (const c of directionCards("en")) {
      const src = webpOf(localMedia(c.preview.replace(/\.en(\.\w+)$/, "$1"), "en"));
      expect(exists(src), src).toBe(true);
    }
  });
});
