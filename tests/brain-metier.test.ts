/**
 * Registre métier canonique (Project Brain 2.0, non branché) : métiers canoniques + alias, combinaisons, repli par
 * secteur, repli générique. Pour « plâtrier peintre » : gestes, scènes pertinentes, concepts hors sujet, et des
 * recherches de photos précises (action + métier + lieu) plutôt qu'un mot générique.
 */
import { describe, expect, it } from "vitest";
import { GLOBAL_NEGATIVES, resolveTrade } from "@/lib/brain";
import { tradeStock } from "@/lib/stock/trade-queries";

const PROFESSION = /\b(plasterer|drywall installer|painter|decorator|house painter)\b/;
const ACTION = /\b(applying|fixing|smoothing|painting|preparing)\b/;
const GENERIC = ["wall", "brick wall", "wall texture", "paint can", "empty room", "texture"];

describe("registre métier", () => {
  it("plâtrier peintre : une identité métier, ses gestes, ses scènes, ses concepts hors sujet", () => {
    const t = resolveTrade("Plâtrier peintre", "batiment");
    expect(t).toMatchObject({ id: "plasterer_painter", source: "combo", labels: { fr: "plâtrier peintre", en: "plasterer / interior painter" }, sector: "batiment", parts: ["plasterer", "painter"] });
    expect(t.actions).toEqual(expect.arrayContaining(["plastering", "skim coating", "drywall installation", "painting", "sanding"]));
    expect(t.visuals.positive.join(" ")).toMatch(/applying plaster|rolling paint|renovation/);
    expect(t.visuals.negative).toEqual(expect.arrayContaining(["brick wall", "art painting", "isolated paint can", "bare wall", "wall texture"]));
    expect(t.icons.keywords).toEqual(expect.arrayContaining(["trowel", "paint", "brush", "roller"]));
    expect(t.icons.avoid).toEqual(expect.arrayContaining(["wall", "bricks"]));
  });

  it("plâtrier peintre : recherches précises (action + métier + lieu), jamais une requête générique", () => {
    const { queries } = resolveTrade("Plâtrier peintre", "batiment").search;
    expect(queries.length).toBeGreaterThanOrEqual(4);
    for (const q of queries) {
      expect(q.split(/\s+/).length).toBeGreaterThanOrEqual(4);
      expect(q).toMatch(PROFESSION);
      expect(q).toMatch(ACTION);
      expect(GENERIC).not.toContain(q.trim().toLowerCase());
    }
    // « wall » reste permis quand il est le lieu d'un geste précis du métier (pas interdit mécaniquement).
    expect(queries).toContain("plasterer applying skim coat to interior wall");
    // Les deux métiers sont représentés dès les premières requêtes, dans l'ordre du texte.
    expect(queries[0]).toMatch(/plasterer/);
    expect(queries[1]).toMatch(/painter/);
  });

  it("alias FR/EN, accents et texte riche (description du client)", () => {
    expect(resolveTrade("Entreprise de plâtrerie, pose de placo et enduits").id).toBe("plasterer");
    expect(resolveTrade("Interior painter and decorator").id).toBe("painter");
    expect(resolveTrade("Plaquiste — peinture intérieure, rénovation").id).toBe("plasterer_painter");
    // Composition non déclarée : identifiant « a+b », données fusionnées dans l'ordre du texte.
    const t = resolveTrade("Électricien et plombier");
    expect(t).toMatchObject({ id: "electrician+plumber", source: "core" });
    expect(t.search.queries[0]).toMatch(/electrician/);
    expect(t.search.queries[1]).toMatch(/plumber|heating/);
  });

  it("métier inconnu : repli par secteur (le libellé du client garde la précision)", () => {
    const t = resolveTrade("Ramoneur", "batiment");
    expect(t).toMatchObject({ id: "sector:batiment", source: "sector", sector: "batiment" });
    expect(t.search.queries[0]).toBe("Ramoneur professional at work");
    expect(t.search.queries).toContain("craftsman working on interior renovation");
    expect(t.visuals.negative).toEqual(GLOBAL_NEGATIVES);
  });

  it("métier inconnu sans secteur : repli générique, jamais vide ni planté", () => {
    const t = resolveTrade("Souffleur de verre", null);
    expect(t).toMatchObject({ id: "generic", source: "generic", labels: { fr: "Souffleur de verre" } });
    expect(t.search.queries).toEqual(["Souffleur de verre professional at work", "Souffleur de verre working with a client"]);
    expect(t.visuals.negative.length).toBeGreaterThan(0);
    expect(resolveTrade("", null)).toMatchObject({ id: "generic", search: { queries: [] } });
  });

  it("2.0 ne change rien en production : les recherches de photos actuelles sont inchangées", () => {
    // Le registre existe et est testé, mais n'est pas encore branché (phase 2.4).
    expect(tradeStock("Plâtrier peintre")?.queries).toEqual(["plasterer plastering wall", "painter paint roller wall", "drywall plasterboard installation", "house painter painting room"]);
  });
});
