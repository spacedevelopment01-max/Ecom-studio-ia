/**
 * Moteur local d'abord : une retouche simple et sûre est faite sans IA (aucun crédit), même si l'IA est active.
 * Demande composée, créative ou ambiguë → l'IA prend le relais.
 */
import { describe, expect, it } from "vitest";
import { isSimpleRequest, localFirst } from "@/lib/engine/local-first";
import { runWithLang } from "@/lib/i18n-server";
import { sampleSpec } from "./fixtures";

const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const noMedia = () => null;

describe("moteur local d'abord", () => {
  const spec = sampleSpec();
  const [first, second] = spec.templates.index.order;
  const section = { template: "index", section: first, kind: "Section" };
  const lf = (msg: string, sel: any = null) => fr(() => localFirst(spec, msg, sel, [], "products", noMedia));

  it("demandes simples reconnues, demandes composées ou créatives écartées", () => {
    expect(isSimpleRequest("mets le titre en rouge")).toBe(true);
    expect(isSimpleRequest("Remplace cette image par celle-ci")).toBe(true);
    expect(isSimpleRequest("mets le titre en rouge et ajoute une FAQ")).toBe(false);
    expect(isSimpleRequest("rends la page plus moderne")).toBe(false);
    expect(isSimpleRequest("change le titre puis descends la section")).toBe(false);
    expect(isSimpleRequest("mets « Ajoute au panier et profite » sur le bouton")).toBe(true);
  });

  it("couleur d'un élément désigné : sans IA", () => {
    const r = lf("mets en rouge", { template: "index", section: first, kind: "Titre", path: "div:nth-child(1) > h1:nth-child(1)", role: "heading", text: "Bonjour" });
    expect(r?.ops[0]).toMatchObject({ op: "element_style", color: "#B42318" });
  });

  it("couleurs d'une section, boutons, retour arrière : sans IA", () => {
    expect(lf("fond noir", section)?.ops[0]).toMatchObject({ op: "section_colors" });
    expect(lf("boutons en vert")?.ops[0]).toMatchObject({ op: "set_scheme_color" });
    expect(lf("annule")?.revert).toBe(true);
  });

  it("masquer / monter : seulement si la section entière est désignée", () => {
    expect(lf("monte cette section", { template: "index", section: second, kind: "Section" })?.ops[0]).toMatchObject({ op: "move_section" });
    expect(lf("supprime ça", { template: "index", section: first, kind: "Bouton", text: "Acheter" })).toBeNull();
  });

  it("texte entre guillemets : seulement s'il remplace exactement le texte désigné", () => {
    const s = spec.templates.index.sections[first];
    const key = ["heading", "title", "text"].find((k) => typeof s.settings[k] === "string" && s.settings[k])!;
    const shown = String(s.settings[key]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    expect(lf("remplace par « Nouveau titre »", { template: "index", section: first, kind: "Titre", text: shown })?.ops[0]).toMatchObject({ op: "set_setting", key, value: "Nouveau titre" });
    // Texte désigné différent du réglage que le moteur local modifierait : l'IA s'en charge.
    expect(lf("remplace par « Nouveau titre »", { template: "index", section: first, kind: "Texte", text: "un autre paragraphe" })).toBeNull();
  });

  it("demande que le moteur local ne sait pas faire : l'IA s'en charge", () => {
    expect(lf("rends la section plus élégante", section)).toBeNull();
    expect(lf("agrandis le logo")).toBeNull();
    expect(lf("ajoute une section vidéo avec ma vidéo de présentation")).toBeNull();
  });

  it("pièce jointe d'inspiration (pas de remplacement d'image) : l'IA la regarde", () => {
    const r = fr(() => localFirst(spec, "fais pareil que sur cette capture", section, [{ assetId: "x", name: "capture.png", kind: "image" }], "products", noMedia));
    expect(r).toBeNull();
    const img = fr(() => localFirst(spec, "fais la même ambiance que cette photo", { template: "index", section: first, kind: "Image", tag: "img" }, [{ assetId: "x", name: "ambiance.jpg", kind: "image" }], "products", noMedia));
    expect(img).toBeNull();
  });
});
