/**
 * Ce qui se mesure est corrigé par le code avant le directeur de création (audit de la marque du 22 novembre 2026, 2.8),
 * et les mots corrigés par le client sont contrôlés sur la planche.
 */
import { describe, expect, it } from "vitest";
import { contrast, luminance } from "@/lib/color";
import { MANIERES_D_OUVRIR, annonceLesChiffres, corrigeLOuverture, corrigeLesCouleurs } from "@/lib/syna-agent/brand-corrections";
import { routeIssues, unprovenClaims, clientFacts, wordingSlips } from "@/lib/syna-agent/brand-routes";
import { paletteIssues } from "@/lib/syna-agent/identities";
import { journey, route, series } from "./sina-routes-fixtures";

describe("la marque : corrections gratuites du Studio", () => {
  it("un fond « blanc » pas pur devient blanc pur ; le fond sombre et ses textes sont ajustés jusqu'au contraste", () => {
    const blanc = { ...route("C"), ground: "blanc" as const, palette: { ...route("C").palette, light: "#F4EFE6" } };
    const r = corrigeLesCouleurs(blanc, journey());
    expect(r.route.palette.light).toBe("#FFFFFF");
    expect(r.changes.join(" ")).toMatch(/light #F4EFE6 → #FFFFFF/);
    expect(paletteIssues(r.route.palette, r.route.ground, r.route.gradient)).toEqual([]);

    const sombre = { ...route("A"), ground: "sombre" as const, palette: { ...route("A").palette, dark: "#3A4A5A", light: "#9AA4AE" } };
    const s = corrigeLesCouleurs(sombre, journey());
    expect(luminance(s.route.palette.dark)).toBeLessThanOrEqual(0.05);
    expect(contrast(s.route.palette.light, s.route.palette.dark)).toBeGreaterThanOrEqual(4.5);
    expect(paletteIssues(s.route.palette, s.route.ground, s.route.gradient).filter((i) => /sombre|light|texte\/fond/.test(i))).toEqual([]);
  });

  it("un bouton illisible est ajusté dans sa teinte ; une palette déjà juste ne bouge pas", () => {
    const juste = route("A");
    expect(corrigeLesCouleurs(juste, journey()).changes).toEqual([]);
    const pale = { ...route("C"), ground: "blanc" as const, palette: { ...route("C").palette, light: "#FFFFFF", primary: "#9FB8C8" } };
    const r = corrigeLesCouleurs(pale, journey());
    expect(paletteIssues(r.route.palette, "blanc").filter((i) => /bouton/.test(i))).toEqual([]);
  });

  it("le client qui garde ses couleurs : rien n'est touché", () => {
    const x = { ...route("C"), ground: "blanc" as const, palette: { ...route("C").palette, light: "#F4EFE6" } };
    expect(corrigeLesCouleurs(x, journey({ keep: ["couleurs"] })).route.palette.light).toBe("#F4EFE6");
  });

  it("une manière d'ouvrir le site déjà prise, ou oubliée, reçoit la première libre de la liste de la consigne", () => {
    const [a, b] = series(2);
    const copie = { ...b, board: { ...b.board, site: { ...b.board.site, layout: a.board.site.layout } } };
    const r = corrigeLOuverture(copie, [a], "produits");
    expect(r.route.board.site.layout?.opening).not.toBe(a.board.site.layout?.opening);
    expect(MANIERES_D_OUVRIR.produits as readonly string[]).toContain(r.route.board.site.layout?.opening);
    expect(corrigeLOuverture(b, [a], "produits").changes).toEqual([]);
  });

  it("un chiffre absent de la fiche est annoncé à prouver : le contrôle ne le relève plus", () => {
    const x = { ...route("A"), board: { ...route("A").board, lines: ["Prête en 4 h au frais.", ...route("A").board.lines.slice(1)] } };
    const j = journey();
    expect(unprovenClaims(x, clientFacts(j))).toContain("4 h");
    const r = annonceLesChiffres(x, j);
    expect(unprovenClaims(r.route, clientFacts(j))).toEqual([]);
    expect(r.route.board.toProve.length).toBeLessThanOrEqual(8);
  });

  it("un mot corrigé par le client (« X, jamais Y ») retrouvé sur la planche est relevé, en mot entier", () => {
    const x = { ...route("A"), slogan: "La nuit porte conseil." };
    expect(wordingSlips(x, [{ avoid: "nuit", use: "soir" }]).map((w) => w.avoid)).toEqual(["nuit"]);
    expect(wordingSlips(x, [{ avoid: "nui", use: "soir" }])).toEqual([]);
    const issues = routeIssues([x, ...series(3).slice(1)], journey(), 3, [{ avoid: "nuit", use: "soir" }]);
    expect(issues).toContain("Identité A : « nuit » est un mot que le client a corrigé ; écris « soir » à la place, partout.");
  });
});
