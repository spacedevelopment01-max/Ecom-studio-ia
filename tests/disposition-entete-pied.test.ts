/**
 * Panneau « Disposition » du studio : l'en-tête et le pied de page exposent leurs choix (libellés du thème,
 * valeur actuelle) et un choix s'applique sans IA par set_setting, en ne changeant que ce réglage.
 */
import { describe, expect, it } from "vitest";
import { layoutChoices } from "@/lib/theme/layout-choices";
import { applyOps } from "@/lib/theme/ops";
import { runWithLang } from "@/lib/i18n-server";
import { sampleSpec } from "./fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

describe("disposition de l'en-tête et du pied de page", () => {
  const spec = sampleSpec("atelier", "multi");
  const g = (k: "header" | "footer") => {
    const grp = spec.groups[k];
    const id = grp.order.find((x) => grp.sections[x].type === k)!;
    return { id, s: grp.sections[id] };
  };

  it("en-tête : dispositions, méga menu, menu téléphone… avec la valeur actuelle", () => {
    const c = layoutChoices(spec, g("header").s, "fr")!;
    expect(c.map((x) => x.key)).toEqual(expect.arrayContaining(["layout", "mega_menu", "mobile_menu", "mobile_submenu", "mobile_promo", "desktop_icons"]));
    const mega = c.find((x) => x.key === "mega_menu")!;
    expect(mega.value).toBe("none");
    expect(mega.options!.map((o) => o.value)).toEqual(["none", "columns", "columns-promo", "cards", "featured"]);
    expect(mega.options![0].label).toBe("Aucun (liste déroulante simple)");
    expect(c.find((x) => x.key === "desktop_icons")!.options).toBeUndefined();
  });

  it("libellés en anglais pour l'interface anglaise", () => {
    const mega = layoutChoices(spec, g("header").s, "en")!.find((x) => x.key === "mega_menu")!;
    expect(mega.label).toBe("Mega menu");
    expect(mega.options!.find((o) => o.value === "cards")!.label).toBe("Image cards + promos");
  });

  it("pied de page : les 9 styles", () => {
    const style = layoutChoices(spec, g("footer").s, "fr")!.find((x) => x.key === "style")!;
    expect(style.options!.map((o) => o.value)).toEqual(["columns", "wordmark", "card", "centered", "minimal", "brand-left", "split", "stacked", "boxed"]);
  });

  it("autres sections et thème importé : aucun choix proposé", () => {
    const first = spec.templates.index.sections[spec.templates.index.order[0]];
    expect(layoutChoices(spec, first, "fr")).toBeUndefined();
    expect(layoutChoices({ ...spec, imported: {} as any }, g("header").s, "fr")).toBeUndefined();
  });

  it("un choix s'applique sans IA et ne touche que ce réglage", () => {
    const h = g("header");
    const out = fr(() => applyOps(spec, [{ op: "set_setting", template: "group:header", section: h.id, key: "mega_menu", value: "cards" }]));
    expect(out.rejected).toEqual([]);
    const after = out.spec.groups.header.sections[h.id].settings;
    expect(after.mega_menu).toBe("cards");
    expect({ ...after, mega_menu: undefined }).toEqual({ ...h.s.settings, mega_menu: undefined });
    const bad = fr(() => applyOps(spec, [{ op: "set_setting", template: "group:header", section: h.id, key: "mega_menu", value: "inexistant" }]));
    expect(bad.rejected.length).toBe(1);
  });
});
