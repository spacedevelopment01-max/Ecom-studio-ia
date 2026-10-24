/** Couverture de la bibliothèque « Ajouter une section » : CHAQUE section du thème de base (actuelle ou future) doit y être
 * retrouvable, en français et en anglais, dans une catégorie connue ; les composants structurels (en-tête, pied de page,
 * bandeau, panier, corps de gabarit) y figurent dans « Structure » sans être ajoutables ni duplicables. Un fichier de
 * section ajouté sans son entrée fait échouer ce test : c'est le contrôle de couverture demandé. */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SECTION_CATEGORIES, SECTION_LIBRARY, addable, libraryCoverage, libraryEntry, structural } from "@/lib/theme/section-library";
import { LAYOUT_CHOICES } from "@/lib/theme/layout-choices";
import { baseSectionTypes, sectionSchema } from "@/lib/theme/spec";

const types = baseSectionTypes();

describe("Bibliothèque de sections : couverture exhaustive", () => {
  it("chaque fichier de theme-base/sections a une entrée FR et EN, et aucune entrée n'est orpheline", () => {
    const c = libraryCoverage(types);
    expect(c.missingFr, "sections sans entrée française").toEqual([]);
    expect(c.missingEn, "sections sans entrée anglaise").toEqual([]);
    expect(c.orphans, "entrées sans fichier de section").toEqual([]);
    expect(c.covered.length).toBe(types.length);
    expect(types.length).toBeGreaterThanOrEqual(135);
  });

  it("chaque entrée a un nom, une description, des mots-clés et une catégorie connue, en français comme en anglais", () => {
    for (const t of types) {
      const fr = libraryEntry(t, "fr")!, en = libraryEntry(t, "en")!;
      expect(fr.name.length, t).toBeGreaterThan(2); expect(fr.description.length, t).toBeGreaterThan(10); expect((fr.keywords ?? "").length, t).toBeGreaterThan(3);
      expect(SECTION_CATEGORIES, `${t} : catégorie`).toContain(fr.category);
      expect(en.name, `${t} : nom anglais`).not.toMatch(/[éèàçùâêîôû]/); expect(en.name, t).not.toBe(fr.name === en.name ? "" : fr.name);
      expect(en.description, `${t} : description anglaise`).not.toMatch(/[éèàçù]/);
    }
  });

  it("les composants structurels sont dans « Structure », non ajoutables, et aucune section ajoutable n'y est rangée", () => {
    for (const t of types) {
      const e = libraryEntry(t, "fr")!;
      if (structural(t)) { expect(e.category, t).toBe("Structure"); expect(addable(t), t).toBe(false); expect(e.description, `${t} : contrainte explicite`).toMatch(/unique|une fois|ne se duplique|jamais dupliqué|ne s'ajoute/i); }
      else expect(e.category, t).not.toBe("Structure");
    }
    expect(types.filter(structural).sort()).toEqual(["announcement-bar", "cart-drawer", "footer", "header", "main-404", "main-article", "main-blog", "main-cart", "main-collection", "main-list-collections", "main-page", "main-password", "main-product", "main-search", "on-cart", "on-footer", "on-header", "re-bien"]);
  });

  it("les sections ajoutables ont un préréglage et un schéma lisible ; les choix de disposition déclarés existent dans le schéma", () => {
    for (const t of types) {
      const schema = sectionSchema(null, t, "fr"); expect(schema, t).toBeTruthy();
      if (addable(t)) expect(schema!.presets?.length ?? 0, `${t} : préréglage pour l'ajout`).toBeGreaterThan(0);
      for (const key of LAYOUT_CHOICES[t] ?? []) expect(schema!.settings.some((s) => s.id === key), `${t} : réglage de disposition « ${key} »`).toBe(true);
    }
  });

  it("l'inventaire publié (docs/coordination/BIBLIOTHEQUE_SECTIONS_COUVERTURE.md) cite chaque section", () => {
    const doc = fs.readFileSync(path.join(process.cwd(), "docs", "coordination", "BIBLIOTHEQUE_SECTIONS_COUVERTURE.md"), "utf8");
    for (const t of types) expect(doc, `inventaire : ${t}`).toContain(`\`${t}\``);
    expect(SECTION_LIBRARY.length).toBe(types.length);
  });
});
