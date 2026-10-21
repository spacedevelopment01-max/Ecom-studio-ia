import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { DIRECTIONS, DARK_DIRECTIONS, colorSchemes, directionCards, type DirectionId } from "@/lib/theme/directions";
import { CATALOG_IDS, CATALOG_THEMES } from "@/lib/theme/theme-catalog";
import { SECTION_LIBRARY } from "@/lib/theme/section-library";
import { validateSpec } from "@/lib/theme/ops";
import { sampleSpec, serviceProfile, serviceSpec } from "./fixtures";
import { localThemeCommand } from "@/lib/engine/local";

type Spec = ReturnType<typeof sampleSpec>;
const NEW = new Set<string>(CATALOG_IDS);
const sections = (spec: Spec) => spec.templates.index.order.map((id) => spec.templates.index.sections[id]);
const visible = (spec: Spec) => sections(spec).filter((s) => !s.disabled);
const typesOf = (spec: Spec) => new Set(visible(spec).map((s) => s.type));
const jaccard = (a: Set<string>, b: Set<string>) => [...a].filter((x) => b.has(x)).length / new Set([...a, ...b]).size;
/** Ouverture : type de section et sa disposition principale. */
const opening = (spec: Spec) => {
  const s = visible(spec)[0];
  return `${s.type}:${s.settings.layout ?? s.settings.media_layout ?? s.settings.style ?? ""}`;
};
/** Caractère graphique : polices, en-tête, pied, boutons, cartes, arrondis, casse, fond clair ou sombre. */
const signature = (spec: Spec) => {
  const st = spec.settings as Record<string, unknown>;
  const header = spec.groups.header.order.map((id) => spec.groups.header.sections[id]).find((s) => s.type === "header")!.settings;
  const footer = spec.groups.footer.order.map((id) => spec.groups.footer.sections[id]).find((s) => s.type === "footer")!.settings;
  const bg = (st.color_schemes as Record<string, { settings: { background: string } }>)["scheme-1"].settings.background;
  return [st.type_heading_font, st.type_body_font, header.layout, header.shape, header.mobile_menu, footer.style, st.button_style, st.card_style, Number(st.button_radius) >= 20 ? "round" : Number(st.button_radius) >= 6 ? "soft" : "square", st.heading_case, bg];
};
const diff = (a: unknown[], b: unknown[]) => a.filter((x, i) => x !== b[i]).length;

const products = Object.fromEntries(DIRECTIONS.map((d) => [d.id, sampleSpec(d.id, "mono", { rich: true })])) as Record<DirectionId, Spec>;
const services = Object.fromEntries(DIRECTIONS.map((d) => [d.id, serviceSpec(d.id, "fr", undefined, { rich: true })])) as Record<DirectionId, Spec>;

describe("Catalogue de thèmes : trente choix réellement différents", () => {
  it("définit 40 thèmes (30 anciens, lisibles seulement, + 10 de référence dont SILLON #148, NOCTIL et TRAVERSE #152, HEUREN et ALCÔVE #155, MUSEAU CLUB #158) et n'en propose que 10 (catalogue actif), présentés en français et en anglais", () => {
    expect(DIRECTIONS).toHaveLength(40);
    expect(new Set(DIRECTIONS.map((d) => d.id)).size).toBe(40);
    expect(new Set(DIRECTIONS.map((d) => d.name)).size).toBe(40);
    expect(directionCards("fr").map((c) => c.id)).toEqual(["fraise", "onde", "orbe", "rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club"]);
    // Le thème installé d'un projet existant, s'il est retiré, reste listé pour ce projet seulement, signalé « retiré ».
    expect(directionCards("fr", ["vitrine"]).map((c) => [c.id, c.retired])).toEqual([["vitrine", true], ["fraise", false], ["onde", false], ["orbe", false], ["rive", false], ["sillon", false], ["noctil", false], ["traverse", false], ["heuren", false], ["alcove", false], ["museau-club", false]]);
    for (const lang of ["fr", "en"] as const) for (const c of directionCards(lang, DIRECTIONS.map((d) => d.id))) {
      expect(c.tagline, c.id).toBeTruthy();
      expect(c.description.length, c.id).toBeGreaterThan(80);
      expect(c.chrome.every(Boolean), c.id).toBe(true);
    }
    for (const t of CATALOG_THEMES) expect(DARK_DIRECTIONS.includes(t.id)).toBe(t.look.dark);
  });

  it("chaque thème du catalogue a une composition valide et assez fournie (boutique et services)", () => {
    for (const id of CATALOG_IDS) {
      for (const [kind, spec] of [["boutique", products[id]], ["services", services[id]]] as const) {
        expect(validateSpec(spec), `${id} ${kind}`).toEqual([]);
        expect(visible(spec).length, `${id} ${kind} : sections visibles`).toBeGreaterThanOrEqual(5);
      }
    }
  });

  it("deux thèmes n'ont jamais la même ouverture parmi les nouveaux, ni avec les thèmes d'origine", () => {
    const clashes: string[] = [];
    for (const [kind, set] of [["boutique", products], ["services", services]] as const) {
      const seen = new Map<string, string>();
      for (const d of DIRECTIONS) {
        const o = opening(set[d.id]);
        if (NEW.has(d.id) && seen.has(o)) clashes.push(`${kind} : ${d.id} ouvre comme ${seen.get(o)} (${o})`);
        if (!seen.has(o)) seen.set(o, d.id);
      }
    }
    expect(clashes).toEqual([]);
  });

  it("chaque nouveau thème a son propre enchaînement de sections (moins de la moitié en commun avec n'importe quel autre)", () => {
    const close: string[] = [];
    for (const [kind, set] of [["boutique", products], ["services", services]] as const) {
      for (const a of CATALOG_IDS) for (const d of DIRECTIONS) {
        if (a === d.id || (NEW.has(d.id) && d.id < a)) continue;
        const j = jaccard(typesOf(set[a]), typesOf(set[d.id]));
        if (j >= 0.5) close.push(`${kind} : ${a} ~ ${d.id} (${(j * 100).toFixed(0)} %) — ${[...typesOf(set[a])].join(", ")} | ${[...typesOf(set[d.id])].join(", ")}`);
      }
    }
    expect(close).toEqual([]);
  });

  it("chaque nouveau thème a son caractère graphique (au moins 4 différences sur polices, en-tête, pied, boutons, cartes, arrondis, casse, fond)", () => {
    const alike: string[] = [];
    for (const a of CATALOG_IDS) for (const d of DIRECTIONS) {
      if (a === d.id || (NEW.has(d.id) && d.id < a)) continue;
      const n = diff(signature(products[a]), signature(products[d.id]));
      if (n < 4) alike.push(`${a} ~ ${d.id} (${n} différences)`);
    }
    expect(alike).toEqual([]);
    // Typographies : aucune paire titre / texte identique entre deux des 34 thèmes.
    const pairs = DIRECTIONS.map((d) => `${d.fonts.heading}/${d.fonts.body}`);
    expect(new Set(pairs).size).toBe(DIRECTIONS.length);
  });

  it("les couleurs de chaque thème du catalogue restent lisibles (texte et boutons contrastés)", async () => {
    const { contrast } = await import("@/lib/color");
    const palette = { primary: "#8A4B2A", secondary: "#E9D8C4", accent: "#C9A27E", light: "#F6F1EA", dark: "#1E1612" };
    for (const id of CATALOG_IDS) for (const [k, s] of Object.entries(colorSchemes(id, palette))) {
      expect(contrast(s.settings.text, s.settings.background), `${id} ${k} texte`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.settings.accent_text, s.settings.accent), `${id} ${k} bouton`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("toutes les sections de la bibliothèque servent dans un thème ou une composition de référence (sauf les deux conteneurs techniques)", async () => {
    const used = new Set<string>();
    // Gabarits ET groupes (en-tête, pied de page) : les composants structurels de la bibliothèque (catégorie « Structure »)
    // vivent dans les groupes ou dans le gabarit général (panier latéral).
    const add = (spec: Spec) => { for (const t of [...Object.values(spec.templates), ...Object.values((spec as { groups?: Record<string, { order: string[]; sections: Record<string, { type: string }> }> }).groups ?? {})]) for (const id of t.order) if (t.sections[id]) used.add(t.sections[id].type); };
    for (const d of DIRECTIONS) {
      add(products[d.id]);
      add(services[d.id]);
      add(sampleSpec(d.id));
      for (const kind of ["multi", "niche"] as const) add(sampleSpec(d.id, kind, { rich: true }));
    }
    // Calendrier de réservation : posé par l'activité (salle de jeu sans service de réservation en ligne).
    add(serviceSpec("atelier", "fr", { ...serviceProfile, bookingUrl: "", hours: "Tous les jours, 10 h – 23 h" }, { activity: "Escape game" }));
    // Le composant d'offres autonome est aussi réutilisé dans le bloc d'achat natif.
    // Pas d'offre commerciale automatique : le marchand fournit ses quantités et ses règles.
    if (used.has("main-product")) {
      expect(fs.readFileSync(path.join(process.cwd(), "theme-base/sections/main-product.liquid"), "utf8")).toContain("render 'purchase-offers'");
      used.add("purchase-offers");
    }
    // Les deux compositions de référence sont examinées avant toute déclinaison du catalogue.
    // On vérifie leur usage réel des composants, sans les dispenser de couverture par une liste d'exceptions.
    const { createUser } = await import("@/lib/auth");
    const { editorialProject } = await import("./lot2b-fixtures");
    const user = await createUser(`catalogue-references-${Date.now()}@example.invalid`, "isolated-test-only", "Références de test");
    for (const kind of ["products", "services"] as const) add((await editorialProject(user.id, kind)).spec);
    // Les deux thèmes fidèles aux références Lumora / Pawish (issue #137) composent les sections « conversion ».
    const { conversionProject } = await import("./lot2c-fixtures");
    for (const kind of ["fraise", "onde"] as const) add((await conversionProject(user.id, kind)).spec);
    // Conteneurs vides par nature : code Liquid du marchand et blocs d'applications (rien à composer sans lui).
    const outside = new Set(["custom-liquid", "apps"]);
    // Panier latéral : rendu par le gabarit général (layout/theme.liquid) sur toutes les pages, pas une instance de gabarit.
    expect(fs.readFileSync(path.join(process.cwd(), "theme-base/layout/theme.liquid"), "utf8")).toMatch(/section ['"]cart-drawer['"]/); outside.add("cart-drawer");
    // Sections créées pour les bibliothèques par famille (issue #141) : elles servent par la galerie de leur famille.
    const { ALL_ENTRIES } = await import("@/lib/theme/section-families");
    for (const e of ALL_ENTRIES) for (const d of e.dispositions) if (d.type.startsWith("fs-")) used.add(d.type);
    const missing = SECTION_LIBRARY.map((e) => e.type).filter((t) => !outside.has(t) && !used.has(t));
    expect(missing).toEqual([]);
  });

  it("une section qui attend une information du marchand est posée masquée, jamais affichée avec « [À compléter »", () => {
    for (const id of CATALOG_IDS) for (const spec of [products[id], services[id]]) {
      for (const s of sections(spec)) {
        if (s.disabled) continue;
        // Réalisations et infos pratiques : vraies photos et coordonnées, seuls un titre ou un horaire peuvent rester à préciser.
        if (["portfolio", "practical-info"].includes(s.type)) continue;
        expect(JSON.stringify([s.settings, s.blocks ?? {}]), `${id} ${s.type}`).not.toMatch(/\[(À compléter|To complete)/);
      }
    }
  });

  it("chaque thème du catalogue a sa signature dans la feuille de style et son option dans les réglages du thème", () => {
    const css = fs.readFileSync(path.join("theme-base", "assets", "theme.css"), "utf8");
    const schema = JSON.parse(fs.readFileSync(path.join("theme-base", "config", "settings_schema.json"), "utf8")) as { settings?: { id?: string; options?: { value: string; label: string }[] }[] }[];
    const options = schema.flatMap((g) => g.settings ?? []).find((s) => s.id === "style_preset")!.options!.map((o) => o.value);
    const en = JSON.parse(fs.readFileSync(path.join("theme-base", "i18n", "schema.en.json"), "utf8")) as Record<string, string>;
    const labels = schema.flatMap((g) => g.settings ?? []).find((s) => s.id === "style_preset")!.options!;
    for (const id of CATALOG_IDS) {
      expect(css, id).toContain(`.dir-${id} `);
      expect(options, id).toContain(id);
      expect(en[labels.find((o) => o.value === id)!.label], `${id} : libellé anglais`).toBeTruthy();
    }
  });

  it("le chat change de thème quand on le demande, jamais pour un mot courant (« jardin », « signal »…)", () => {
    const spec = sampleSpec("atelier");
    expect(localThemeCommand(spec, "applique la direction Onde", null).direction).toBe("onde");
    expect(localThemeCommand(spec, "passe en style fraise", null).direction).toBe("fraise");
    expect(localThemeCommand(spec, "je veux le thème Orbe", null).direction).toBe("orbe");
    expect(localThemeCommand(spec, "switch to the Rive theme", null).direction).toBe("rive");
    expect(localThemeCommand(spec, "apply the Rive style", null).direction).toBe("rive");
    expect(localThemeCommand(spec, "style rive", null).direction).toBe("rive");
    expect(localThemeCommand(spec, "mets une photo du jardin dans le style de la marque", null).direction).toBeUndefined();
    expect(localThemeCommand(spec, "ajoute un signal de confiance", null).direction).toBeUndefined();
    // Ancien catalogue (retiré) : plus jamais appliqué, même nommé explicitement.
    expect(localThemeCommand(spec, "applique la direction Jardin", null).direction).toBeUndefined();
    expect(localThemeCommand(spec, "switch to the Velours theme", null).direction).toBeUndefined();
  });

  it("un thème qui utilise des sections V2 charge leur feuille de style (langage visuel déclaré)", () => {
    for (const d of DIRECTIONS) for (const spec of [products[d.id], services[d.id]]) {
      const usesV2 = Object.values(spec.templates).some((t) => t.order.some((id) => t.sections[id].type.startsWith("v2-")));
      if (usesV2) expect((spec.settings as Record<string, unknown>).ds_language ?? "none", d.id).not.toBe("none");
    }
  });
});
