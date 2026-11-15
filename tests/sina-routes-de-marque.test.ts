/**
 * SINA — routes de marque (décisions du propriétaire du 12 novembre 2026) : nombre d'identités selon le forfait,
 * fonds de la série, noms sans formule (ses 50 noms comme mesure), rien d'inventé sur une planche, lignes d'honnêteté
 * écrites par le Studio. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";
import { BoardSchema, type Board } from "@/lib/syna-agent/brand-board";
import { NAME_EXAMPLES } from "@/lib/syna-agent/brand-references";
import { ROUTES_BY_PLAN, groundsFor, isReferenceName, isRoute, nameIssues, nameMould, nameSeriesIssues, routeCountFor, routeIssues, routeKeys, safeWordmark, unprovenClaims, withHonestProofs, type Route } from "@/lib/syna-agent/brand-routes";
import { EXPRESSION_NAME } from "@/lib/syna-agent/identities";
import { emptyJourney, type Journey } from "@/lib/syna-agent/journey";
import { board, journey, route, series } from "./sina-routes-fixtures";

describe("SINA — routes de marque", () => {
  it("nombre d'identités selon le forfait : 2 à 49 €, 3 à 89 €, 4 à 129 €", () => {
    expect(ROUTES_BY_PLAN).toEqual({ creer: 2, vendre: 3, dominer: 4 });
    expect([routeCountFor("creer"), routeCountFor("vendre"), routeCountFor("dominer"), routeCountFor(null)]).toEqual([2, 3, 4, 2]);
    expect(routeKeys(2)).toEqual(["A", "B"]);
    expect(routeKeys(4)).toEqual(["A", "B", "C", "D"]);
    expect(routeKeys(9)).toEqual(["A", "B", "C", "D"]);
  });

  it("fonds de la série : deux différents à deux, la règle des trois fonds à trois, un fond clair coloré en plus à quatre", () => {
    expect(groundsFor(3).exact).toEqual(["blanc", "degrade", "sombre"]);
    expect(groundsFor(4).exact).toEqual(["blanc", "degrade", "sombre", "uni"]);
    expect(groundsFor(2)).toEqual({ exact: null, among: ["blanc", "degrade", "sombre"] });
    const j = journey();
    expect(routeIssues(series(3), j, 3)).toEqual([]);
    expect(routeIssues(series(2), j, 2)).toEqual([]);
    expect(routeIssues(series(4), j, 4)).toEqual([]);
    // Deux fonds blancs dans la série : la règle des trois fonds n'est plus tenue.
    const twice = series(3).map((x, i) => (i === 1 ? { ...x, ground: "blanc" as const, gradient: undefined, palette: series(3)[2].palette } : x));
    expect(routeIssues(twice, j, 3).join(" ")).toMatch(/Fonds de page/);
  });

  it("les 50 noms de référence du propriétaire passent tous le contrôle d'un nom (aucune formule)", () => {
    const refused = NAME_EXAMPLES.filter((e) => nameIssues(e.name).length).map((e) => e.name);
    expect(refused).toEqual([]);
    // L'ancienne formule « un mot + de + le produit » refusait la plupart de ses noms pour des produits.
    const products = NAME_EXAMPLES.filter((e) => e.kind === "produits");
    expect(products.filter((e) => !EXPRESSION_NAME.test(e.name)).length).toBeGreaterThan(products.length / 2);
  });

  it("un nom : 4 mots au plus, ni chiffre ni ponctuation, jamais un nom d'exemple recopié", () => {
    expect(nameIssues("Bain de Minuit")).toEqual([]);
    expect(nameIssues("L'Eau Est Bonne")).toEqual([]);
    expect(nameIssues("Lâche le Morceau")).toEqual([]);
    expect(nameIssues("Solstice")).toEqual([]);
    expect(nameIssues("Un nom beaucoup trop long ici").join(" ")).toMatch(/trop long/);
    expect(nameIssues("Anticonstitutionnellement Extraordinairement Vôtre").join(" ")).toMatch(/trop long/);
    expect(nameIssues("Thé 2000").join(" ")).toMatch(/chiffre/);
    expect(nameIssues("Ça roule !").join(" ")).toMatch(/phrase/);
    expect(nameIssues("de la").join(" ")).toMatch(/aucun mot fort/);
    expect(isReferenceName("la mèche courte")).toBe(true);
    expect(isReferenceName("Bain de Minuit")).toBe(false);
    const copied = series(3).map((x, i) => (i === 0 ? { ...x, name: "La Mèche Courte" } : x));
    expect(routeIssues(copied, journey(), 3).join(" ")).toMatch(/noms d'exemple du propriétaire/);
  });

  it("une série de noms : jamais deux noms du même moule, du même premier ou du même dernier mot", () => {
    expect(nameMould("Éclat de thé")).toBe("X de X");
    expect(nameMould("Lueur d'ambre")).toBe("X de X");
    expect(nameMould("L'Eau Est Bonne")).toBe("le X est X");
    expect(nameMould("Solstice")).toBe("X");
    // Les six noms du premier essai, jugés « nuls » : fabriqués sur une seule formule.
    expect(nameSeriesIssues(["Poignée de fruits", "Tombée de fruits", "Carafe de verger"]).length).toBeGreaterThan(0);
    expect(nameSeriesIssues(["Éclat de cire", "Souffle de mèche"]).join(" ")).toMatch(/même moule/);
    expect(nameSeriesIssues(["Bain de Minuit", "Bain de Soleil"]).join(" ")).toMatch(/commencent par le même mot/);
    expect(nameSeriesIssues(["Haute en Couleur", "Haute en couleur"]).join(" ")).toMatch(/même nom/);
    // Les trois routes du troisième essai : trois moules différents.
    expect(nameSeriesIssues(["Bain de Minuit", "Lâche le Morceau", "L'Eau Est Bonne"])).toEqual([]);
    // Deux mots forts d'un seul mot ne sont pas « le même moule ».
    expect(nameSeriesIssues(["Solstice", "Rupture"])).toEqual([]);
  });

  it("rien d'inventé sur une planche : un chiffre ou une garantie absents de la fiche du client sont relevés", () => {
    const facts = "Offre : des infusions de fruits en vrac, sachet de 100 g à 12 €, sans sucres ajoutés.";
    const ok = route("A");
    expect(unprovenClaims(ok, facts)).toEqual([]);
    const invented: Route = { ...ok, board: { ...ok.board, lines: ["Prête en 4 h au frais.", "Élue produit de l'année."], object: { ...ok.board.object, front: ["100 g", "Garanti sans arôme"] } } };
    const found = unprovenClaims(invented, facts).join(" | ");
    expect(found).toMatch(/4 h/);
    expect(found).toMatch(/Garanti/);
    expect(found).not.toMatch(/100 g/); // donné par le client
    // Un numéro d'ordre (« Morceau n° 1 ») n'est pas une garantie ; un classement (« n° 1 des infusions ») en est une.
    expect(unprovenClaims({ ...ok, board: { ...ok.board, object: { ...ok.board.object, front: ["Recette n° 1 : pêche"] }, toProve: ["La recette 1 reste à nommer."] } }, facts)).toEqual([]);
    expect(unprovenClaims({ ...ok, board: { ...ok.board, lines: ["N° 1 des infusions froides.", "La nuit porte fruit."] } }, facts).join(" ")).toMatch(/N° 1/);
    // Annoncé dans « ce qui reste à prouver » : le chiffre est permis.
    const owned: Route = { ...invented, board: { ...invented.board, lines: ["Prête en 4 h au frais.", "Rien à ajouter. Sauf de l'eau."], object: ok.board.object, toProve: ["Le temps d'infusion (4 h au frais) est à confirmer avec ta recette."] } };
    expect(unprovenClaims(owned, facts)).toEqual([]);
    const list = series(3).map((x, i) => (i === 1 ? { ...x, board: { ...x.board, lines: ["Prête en 4 h au frais.", x.board.lines[1]] } } : x));
    expect(routeIssues(list, journey(), 3).join(" ")).toMatch(/Identité B : « 4 h » ne vient pas de la fiche du client/);
  });

  it("lignes d'honnêteté écrites par le Studio : le nom n'est jamais vérifié à l'INPI ; un aveu sans parole réelle est une hypothèse", () => {
    const b = board({ toProve: ["Le goût à froid reste à faire goûter."] });
    const found = withHonestProofs({ ...b, nameCheck: "rien_trouve", idea: { ...b.idea, confessionSupport: 7 } });
    expect(found.toProve[0]).toMatch(/INPI/);
    expect(found.toProve.join(" ")).not.toMatch(/hypothèse/);
    expect(found.toProve).toContain("Le goût à froid reste à faire goûter.");
    const guess = withHonestProofs({ ...b, nameCheck: "non_verifie", idea: { ...b.idea, confessionSupport: 0 } });
    expect(guess.toProve[0]).toMatch(/pas pu le vérifier/);
    expect(guess.toProve[1]).toMatch(/hypothèse/);
    // Nom gardé par le client (refonte) : SINA n'écrit rien sur la vérification du nom.
    expect(withHonestProofs(guess, { ownName: true }).toProve.join(" ")).not.toMatch(/Le nom :/);
    expect(withHonestProofs({ ...found, toProve: ["Le nom : à vérifier à l'INPI."] }, { ownName: true }).toProve).toEqual(["Rien de plus à prouver à ce stade : tout ce qui est écrit vient de ta fiche."]);
    // Une seconde passe n'empile pas les mêmes lignes.
    expect(withHonestProofs(guess).toProve).toEqual(guess.toProve);
    expect(withHonestProofs(found).toProve.length).toBeLessThanOrEqual(8);
  });

  it("le nom dessiné garde ses lignes seulement si elles reprennent les lettres exactes du nom", () => {
    const w = board().wordmark;
    expect(safeWordmark({ ...w, lines: ["LÂCHE LE", "MOR", "CEAU"] }, "Lâche le Morceau").lines).toEqual(["LÂCHE LE", "MOR", "CEAU"]);
    expect(safeWordmark({ ...w, lines: ["LACHE LE", "MORCEAU"] }, "Lâche le Morceau").lines).toBeUndefined(); // accent perdu
    expect(safeWordmark({ ...w, lines: ["LÂCHE", "LE MORCEAUX"] }, "Lâche le Morceau").lines).toBeUndefined(); // lettre en trop
    const bad = series(3).map((x, i) => (i === 0 ? { ...x, board: { ...x.board, wordmark: { ...x.board.wordmark, lines: ["BAIN", "DE MINUI"] } } } : x));
    expect(routeIssues(bad, journey(), 3).join(" ")).toMatch(/ne reprend pas les lettres exactes/);
  });

  it("série : idées, signatures et polices de titres différentes ; refonte respectée ; services sans emballage", () => {
    const j = journey();
    const same = series(3).map((x, i) => (i === 2 ? { ...x, slogan: series(3)[0].slogan, board: { ...x.board, idea: { ...x.board.idea, belief: series(3)[0].board.idea.belief } } } : x));
    const out = routeIssues(same, j, 3).join(" ");
    expect(out).toMatch(/même signature/);
    expect(out).toMatch(/même idée de marque/);
    expect(routeIssues(series(3).map((x) => ({ ...x, fonts: series(3)[0].fonts })), j, 3).join(" ")).toMatch(/même police de titres/);
    expect(routeIssues(series(3).slice(0, 2), j, 3).join(" ")).toMatch(/clés A, B, C/);
    const kept: Journey = { ...journey(), keep: ["nom"], keptValues: { name: "Maison Lune" } };
    expect(routeIssues(series(3), kept, 3).join(" ")).toMatch(/nom gardé « Maison Lune »/);
    expect(routeIssues(series(3).map((x) => ({ ...x, name: "Maison Lune" })), kept, 3).join(" ")).not.toMatch(/même nom|nom gardé/);
    const services: Journey = { ...emptyJourney(), start: { ...j.start, business: { value: "services", status: "answered", source: "client", at: 1 } } };
    expect(routeIssues(series(3), services, 3).join(" ")).toMatch(/entreprise de services ne se montre pas sur un emballage/);
  });

  it("une planche n'accepte que des contenus sûrs : aucun dessin libre, tracés nettoyés seulement", () => {
    const b = board();
    expect(BoardSchema.safeParse(b).success).toBe(true);
    const script = { ...b, signs: [{ ...b.signs[0], symbol: { source: "ai", viewBox: [0, 0, 100], shapes: [{ d: "M0 0<script>alert(1)</script>", paint: "fill", tone: "main" }] } }, ...b.signs.slice(1)] };
    expect(BoardSchema.safeParse(script).success).toBe(false);
    expect(BoardSchema.safeParse({ ...b, object: { ...b.object, kind: "canette" } }).success).toBe(false);
    expect(BoardSchema.safeParse({ ...b, toProve: [] }).success).toBe(false);
    const withHtml = { ...b, html: "<div onclick=x>" } as unknown as Board;
    expect(Object.keys(BoardSchema.parse(withHtml))).not.toContain("html");
    expect(isRoute(route("A"))).toBe(true);
    const { board: _b, ...old } = route("A");
    expect(isRoute(old as never)).toBe(false);
  });
});
