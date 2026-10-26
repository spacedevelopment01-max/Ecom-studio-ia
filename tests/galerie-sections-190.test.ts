/**
 * Mission #190, point 4 — galerie « Sections » par thème, sans famille : pour chacun des thèmes refaits d'après
 * maquette, toutes ses sections propres sont proposées (avec au moins leur disposition d'origine), s'ajoutent, se
 * modifient, se déplacent, se dupliquent, se suppriment et se sauvegardent ; elles ne vont jamais dans un autre thème ;
 * changer de disposition garde le contenu et ne touche pas à la disposition d'origine des autres sections.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { sampleSpec, serviceSpec } from "./fixtures";
import { MAQUETTE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { isStructuralType } from "@/lib/theme/section-families";
import { themeGallery } from "@/lib/theme/family-gallery";
import { OWN_SECTION_PREFIX, ownDispositions, parseOwnId } from "@/lib/theme/theme-own-sections";
import { sectionIncompatibility, compatibleSectionTypes } from "@/lib/theme/section-compat";
import { addable } from "@/lib/theme/section-library";
import { baseSectionTypes, sectionSchema } from "@/lib/theme/spec";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { dispositionOps, familyPanel } from "@/lib/theme/family-ops";
import { resolveLibraryType } from "@/lib/theme/family-gallery";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { runWithLang } from "@/lib/i18n-server";
import type { DirectionId } from "@/lib/theme/directions";

const fr = <T,>(f: () => T) => runWithLang({ ui: "fr", content: "fr" }, f);
const specFor = (id: string) => fr(() => (themeKinds(id).includes("services") ? serviceSpec(id as DirectionId) : sampleSpec(id as DirectionId)));
const kindFor = (id: string) => (themeKinds(id).includes("services") ? "services" : themeKinds(id)[0] ?? "catalog");

describe("galerie de sections par thème (mission #190)", () => {
  for (const id of MAQUETTE_THEMES) {
    it(`${id} : sections propres proposées, éditables et sauvegardées ; bibliothèque commune sans famille`, async () => {
      const spec = specFor(id);
      const kind = kindFor(id);
      const gallery = fr(() => themeGallery(id, "fr", { types: baseSectionTypes(), available: (t) => addable(t) && !sectionIncompatibility(spec, t, kind), allowed: () => true, schemaOf: (t) => sectionSchema(spec, t, "fr") as never }));
      expect(gallery.length, id).toBeGreaterThan(5);
      expect(gallery.every((g) => g.dispositions.length >= 1), id).toBe(true);
      const prefix = OWN_SECTION_PREFIX[id];
      const ownItems = gallery.filter((g) => g.type.startsWith("own:"));
      if (prefix) {
        // Toutes les sections propres ajoutables (hors en-tête / pied posés dans les groupes) sont dans la galerie.
        const expected = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith(prefix)).map((f) => f.replace(".liquid", "")).filter((t) => {
          const s = sectionSchema(spec, t, "fr") as { enabled_on?: { groups?: string[] } } | null;
          // Pages entières (fiche d'un bien, article, mentions…) : composants structurels, posés par leurs modèles de page.
          return addable(t) && !isStructuralType(t) && !s?.enabled_on?.groups?.length && !sectionIncompatibility(spec, t, kind);
        });
        expect(ownItems.map((g) => parseOwnId(g.type)!.type).sort(), id).toEqual(expected.sort());
        expect(ownItems.length, id).toBeGreaterThan(0);
      } else expect(ownItems, id).toEqual([]);
      // Aucune section propre à un autre thème n'est proposée ni acceptée.
      const others = Object.entries(OWN_SECTION_PREFIX).filter(([t]) => t !== id).map(([, p]) => p);
      expect(compatibleSectionTypes(spec, kind).some((t) => others.some((p) => t.startsWith(p))), id).toBe(false);

      // Ajout depuis la galerie (première section propre, ou une fonction commune), puis déplacement, duplication,
      // modification, suppression ; chaque état reste valide et se rend.
      const pick = ownItems[0] ?? gallery[0];
      const lib = resolveLibraryType(pick.dispositions[0].id, (t) => sectionSchema(spec, t, "fr"), "fr");
      let r = applyOps(spec, [{ op: "add_section", template: "index", type: lib.type, settings: lib.settings as never, blocks: lib.blocks as never, position: { index: 0 } } as never], { targeted: new Set(), storeKind: kind });
      expect(r.rejected, id).toEqual([]);
      let s = r.spec;
      const added = s.templates.index.order[0];
      expect(s.templates.index.sections[added].type).toBe(lib.type);
      r = applyOps(s, [{ op: "move_section", template: "index", section: added, position: { index: 1 } }, { op: "duplicate_section", template: "index", section: added }] as never);
      expect(r.rejected, id).toEqual([]);
      s = r.spec;
      expect(s.templates.index.order.filter((k) => s.templates.index.sections[k].type === lib.type).length).toBeGreaterThanOrEqual(2);
      const textKey = (sectionSchema(s, lib.type, "fr")?.settings ?? []).find((x) => x.id && ["text", "textarea"].includes(x.type))?.id;
      if (textKey) {
        r = applyOps(s, [{ op: "set_setting", template: "index", section: added, key: textKey, value: "Texte modifié dans le studio" }] as never);
        expect(r.rejected, id).toEqual([]);
        s = r.spec;
        expect(s.templates.index.sections[added].settings[textKey]).toBe("Texte modifié dans le studio");
      }
      r = applyOps(s, [{ op: "remove_section", template: "index", section: added }] as never);
      expect(r.rejected, id).toEqual([]);
      s = r.spec;
      expect(s.templates.index.sections[added]).toBeUndefined();
      expect(validateSpec(s), id).toEqual([]);
      const html = (await renderPage({ spec: s, base: "", files: compileTheme(s), cart: [] }, "/", new URLSearchParams())).html;
      expect(html).not.toMatch(/Liquid error/);

      // Changement de disposition d'une section propre qui en déclare plusieurs : réglages seulement, contenu gardé.
      const multi = ownItems.find((g) => g.dispositions.length > 1);
      if (multi) {
        const type = parseOwnId(multi.type)!.type;
        const base = resolveLibraryType(multi.dispositions[0].id, (t) => sectionSchema(spec, t, "fr"), "fr");
        const s2 = applyOps(spec, [{ op: "add_section", template: "index", type, settings: base.settings as never, blocks: base.blocks as never } as never], { targeted: new Set(), storeKind: kind }).spec;
        const sid = s2.templates.index.order.find((k) => s2.templates.index.sections[k].type === type && !spec.templates.index.sections[k])!;
        const panel = familyPanel(s2, kind as never, s2.templates.index.sections[sid], "fr");
        expect(panel?.dispositions?.length, id).toBeGreaterThan(1);
        expect(panel?.dispositions?.[0].current || panel?.dispositions?.some((d) => d.current), id).toBe(true);
        const target = ownDispositions(sectionSchema(s2, type, "fr") as never, "fr")[1];
        const res = dispositionOps(s2, kind as never, "index", sid, target.id);
        expect("error" in res ? res.error.fr : "", id).toBe("");
        if (!("error" in res)) {
          const after = applyOps(s2, res.ops, { targeted: new Set([`index:${sid}`]) }).spec;
          for (const [k, v] of Object.entries(target.settings)) expect(after.templates.index.sections[sid].settings[k], `${id} ${k}`).toEqual(v);
          // Les autres sections du thème gardent leur disposition validée.
          for (const k of spec.templates.index.order) expect(after.templates.index.sections[k], k).toEqual(spec.templates.index.sections[k]);
        }
      }
    }, 120_000);
  }

  it("une section propre ne va que dans son thème", () => {
    const fraise = fr(() => sampleSpec("fraise"));
    const phase = fr(() => serviceSpec("phase"));
    expect(sectionIncompatibility(fraise, "ph-hero", "specialty")).toMatch(/propre au thème phase/);
    expect(sectionIncompatibility(phase, "ph-hero", "services")).toBe("");
    expect(sectionIncompatibility(phase, "fg-hero", "services")).toMatch(/propre au thème fraise/);
  });
});
