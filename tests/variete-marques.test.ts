/**
 * Une identité vraiment différente pour chaque marque (demande du propriétaire du 17 novembre 2026 : « les thèmes entre
 * les deux marques sont très identiques ») : police de titres jamais reprise d'une marque récente ni d'une autre identité
 * de la série, fond clair nettement différent. Le contrôle du Studio corrige sans IA. Aucun appel d'IA ici.
 */
import { describe, expect, it } from "vitest";
import { route, series } from "./sina-routes-fixtures";
import { FONT_FILES, FONT_HANDLES } from "@/lib/theme/render";
import { bodyFontOk, fontKeyOf, paletteIssues } from "@/lib/syna-agent/identities";
import { emptyJourney } from "@/lib/syna-agent/journey";
import { ALLURES, FOND_ECART_MIN, accordPolices, allureDe, deltaE2000, fondDeRemplacement, fondsTropProches, ligneeDe, marquesRecentes, policeDeRemplacement, varierIdentites, varieteMarquesBrief, type MarqueRecente } from "@/lib/syna-agent/variete-marques";

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
/** Une identité de l'essai : fond clair coloré (« uni »), titres en Archivo Black, comme les deux marques de l'essai. */
const uni = () => {
  const x = clone(route("D"));
  x.fonts = { heading: "archivo_black_n4", body: "dm_sans_n4" };
  x.palette = { ...x.palette, light: "#FFFCF7" };
  return x;
};

describe("variété entre les marques — catalogue des polices", () => {
  it("chaque police du catalogue a une allure ; chaque police citée existe à cette graisse", () => {
    const cited = new Set(ALLURES.flatMap((a) => a.polices.map(fontKeyOf)));
    for (const k of Object.keys(FONT_FILES)) expect(cited.has(k), k).toBe(true);
    for (const a of ALLURES) for (const h of a.polices) expect(FONT_HANDLES.includes(h), h).toBe(true);
    for (const a of ALLURES) for (const v of a.voisines) expect(ALLURES.some((b) => b.id === v)).toBe(true);
  });
  it("lignées : Archivo et Archivo Black sont une seule police pour l'œil", () => {
    expect(ligneeDe("archivo_black_n4")).toBe(ligneeDe("archivo_n8"));
    expect(ligneeDe("cormorant_garamond_n6")).toBe(ligneeDe("cormorant_n5"));
    expect(ligneeDe("chivo_n7")).not.toBe(ligneeDe("archivo_n8"));
  });
  it("allure selon la graisse : très grasse, demi-grasse, empattements, manuscrite", () => {
    expect(allureDe("archivo_black_n4")).toBe("tres_grasse");
    expect(allureDe("montserrat_n8")).toBe("tres_grasse");
    expect(allureDe("montserrat_n6")).toBe("sans_demi");
    expect(allureDe("abril_fatface_n4")).toBe("serif_grasse");
    expect(allureDe("caveat_n7")).toBe("manuscrite");
    expect(allureDe("anton_n4")).toBe("condensee");
  });
});

describe("variété entre les marques — la police de titres", () => {
  it("une identité qui reprend Archivo Black d'une marque récente : remplacée par une très grasse libre, en accord avec ses textes", () => {
    const recent: MarqueRecente[] = [{ heading: "archivo_black_n4", light: null }];
    const r = varierIdentites([uni()], recent, { modifiables: ["D"] });
    const y = r.list[0];
    expect(ligneeDe(y.fonts.heading)).not.toBe("archivo");
    expect(allureDe(y.fonts.heading)).toBe("tres_grasse");
    expect(y.fonts.body).toBe("dm_sans_n4");
    expect(bodyFontOk(y.fonts.body)).toBe(true);
    expect(accordPolices(y.fonts.heading, y.fonts.body)).toBe(true);
    expect(r.changes.join(" ")).toMatch(/Archivo Black \(déjà prise par une marque récente\) remplacée/);
  });
  it("une autre graisse de la même police (Archivo 800) compte comme la même police", () => {
    const r = varierIdentites([uni()], [{ heading: "archivo_n8", light: null }], { modifiables: ["D"] });
    expect(ligneeDe(r.list[0].fonts.heading)).not.toBe("archivo");
  });
  it("jamais une police déjà donnée à l'une des marques récentes : le remplaçant saute celles qui sont prises", () => {
    const recent: MarqueRecente[] = ["archivo_black_n4", "chivo_n7", "montserrat_n8", "plus_jakarta_sans_n8"].map((heading) => ({ heading, light: null }));
    const y = varierIdentites([uni()], recent, { modifiables: ["D"] }).list[0];
    expect(["archivo", "chivo", "montserrat", "plus_jakarta_sans"]).not.toContain(ligneeDe(y.fonts.heading));
    expect(allureDe(y.fonts.heading)).toBe("tres_grasse");
  });
  it("le nom de la police écrit dans la planche suit le changement", () => {
    const x = uni();
    x.fontStyle = "Archivo Black, très grasse";
    x.board.signs[0] = { ...x.board.signs[0], text: "Le nom en Archivo Black, en capitales." };
    const y = varierIdentites([x], [{ heading: "archivo_black_n4", light: null }], { modifiables: ["D"] }).list[0];
    expect(JSON.stringify(y)).not.toMatch(/Archivo Black/);
    expect(y.board.signs[0].text).toMatch(new RegExp(`Le nom en ${FONT_FILES[fontKeyOf(y.fonts.heading)].family}, en capitales`));
  });
  it("dans une même série : jamais deux fois la même police de titres (la gardée par le client reste)", () => {
    const [a, b] = [clone(route("A")), clone(route("B"))];
    b.fonts = { heading: a.fonts.heading, body: b.fonts.body };
    const r = varierIdentites([a, b], [], { modifiables: ["B"] });
    expect(r.list[0].fonts.heading).toBe(a.fonts.heading);
    expect(ligneeDe(r.list[1].fonts.heading)).not.toBe(ligneeDe(a.fonts.heading));
    expect(allureDe(r.list[1].fonts.heading)).toBe(allureDe(a.fonts.heading));
  });
  it("titres et textes de la même police : les textes suivent la nouvelle police quand elle s'y prête", () => {
    const next = policeDeRemplacement({ heading: "montserrat_n8", body: "montserrat_n4" }, new Set(["montserrat", "archivo"]));
    expect(next).not.toBeNull();
    expect(ligneeDe(next!.heading)).toBe(ligneeDe(next!.body));
    expect(bodyFontOk(next!.body)).toBe(true);
  });
  it("le client garde ses polices : rien ne change", () => {
    const j = { ...emptyJourney(), keep: ["polices" as const] };
    const r = varierIdentites([uni()], [{ heading: "archivo_black_n4", light: null }], { modifiables: ["D"], j });
    expect(r.list[0].fonts.heading).toBe("archivo_black_n4");
  });
});

describe("variété entre les marques — le fond clair", () => {
  it("écart perceptif : les deux fonds de l'essai (#FFF6E0 et #FFFCF7) sont jugés trop proches", () => {
    expect(deltaE2000("#FFF6E0", "#FFFCF7")).toBeCloseTo(6.9, 1);
    expect(fondsTropProches("#FFF6E0", "#FFFCF7")).toBe(true);
    expect(fondsTropProches("#FFF6E0", "#FFFFFF")).toBe(true);
    // Un fond pâle qui a une couleur à lui : assez loin.
    expect(fondsTropProches("#FFF6E0", "#F4F1FF")).toBe(false);
    expect(fondsTropProches("#FFF6E0", "#FFE9E3")).toBe(false);
    expect(deltaE2000("#123456", "#123456")).toBe(0);
  });
  it("fond trop proche d'une marque récente : remplacé par un fond tiré des couleurs de la marque, sans défaut de plus, bouton inchangé", () => {
    const x = uni();
    const r = varierIdentites([x], [{ heading: null, light: "#FFF6E0" }], { modifiables: ["D"] });
    const y = r.list[0];
    expect(y.palette.light).not.toBe("#FFFCF7");
    expect(deltaE2000(y.palette.light, "#FFF6E0")).toBeGreaterThanOrEqual(FOND_ECART_MIN);
    expect({ ...y.palette, light: "" }).toEqual({ ...x.palette, light: "" });
    expect(paletteIssues(y.palette, y.ground, y.gradient)).toEqual(paletteIssues(x.palette, x.ground, x.gradient));
    expect(y.fonts).toEqual(x.fonts); // aucune marque récente n'a sa police
    expect(r.changes.join(" ")).toMatch(/fond clair #FFFCF7 trop proche d'une marque récente, remplacé par #/);
  });
  it("le fond choisi par SINA reste le point de départ : le remplaçant est le plus proche qui s'écarte assez", () => {
    const x = uni();
    const f = fondDeRemplacement(x, ["#FFF6E0"])!;
    expect(f.assez).toBe(true);
    // Il reste un fond de page calme et clair.
    expect(deltaE2000(f.light, x.palette.light)).toBeLessThan(25);
  });
  it("beaucoup de marques récentes aux fonds pâles : un fond qui s'écarte de toutes est encore trouvé", () => {
    const lights = ["#FFFFFF", "#FFF6E0", "#FFFCF7", "#FAF7F2", "#F5EFE6", "#FFF1E0", "#F2F0FF", "#FFFDF5", "#F3EFE6", "#FDEBD3", "#FFF0C8", "#E8F0FF", "#EAF4EC"];
    const f = fondDeRemplacement(uni(), lights)!;
    expect(f).not.toBeNull();
    expect(f.assez).toBe(true);
    for (const l of lights) expect(deltaE2000(f.light, l)).toBeGreaterThanOrEqual(FOND_ECART_MIN);
  });
  it("un fond « blanc » reste blanc ; les couleurs gardées ou données par le client ne changent jamais", () => {
    const c = clone(route("C"));
    expect(varierIdentites([c], [{ heading: null, light: "#FFFFFF" }], { modifiables: ["C"] }).list[0].palette.light).toBe("#FFFFFF");
    const keep = { ...emptyJourney(), keep: ["couleurs" as const] };
    expect(varierIdentites([uni()], [{ heading: null, light: "#FFF6E0" }], { modifiables: ["D"], j: keep }).list[0].palette.light).toBe("#FFFCF7");
    const said = emptyJourney();
    said.start.image = { value: "Je veux mon crème #FFFCF7 en fond.", status: "answered", source: "client", at: 1 };
    expect(varierIdentites([uni()], [{ heading: null, light: "#FFF6E0" }], { modifiables: ["D"], j: said }).list[0].palette.light).toBe("#FFFCF7");
  });
});

describe("variété entre les marques — sans marque récente, rien ne change", () => {
  it("aucune marque récente : la série reste identique, aucun changement noté, aucune consigne", () => {
    const list = series(4).map(clone);
    const r = varierIdentites(list, [], { modifiables: list.map((x) => x.key) });
    expect(r.list).toEqual(list);
    expect(r.changes).toEqual([]);
    expect(varieteMarquesBrief([])).toBe("");
  });
  it("une identité déjà différente des marques récentes ne change pas", () => {
    const x = uni();
    const r = varierIdentites([x], [{ heading: "fraunces_n8", light: "#D6CFF6" }], { modifiables: ["D"] });
    expect(r.list[0]).toEqual(x);
    expect(r.changes).toEqual([]);
  });
});

describe("variété entre les marques — les marques récentes du Studio", async () => {
  const { run, id, now } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  it("lues dans les autres projets, les plus récentes d'abord, sans le projet en cours ni les projets archivés", async () => {
    const u = await account();
    const add = (brand: unknown, at: number, archived = 0) => { const pid = id(); run("INSERT INTO projects(id,user_id,name,brand_json,archived,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", pid, u.id, "Essai variété", JSON.stringify(brand), archived, at, at); return pid; };
    const t = now() + 10_000_000;
    add({ fonts: { heading: "chivo_n7" }, palette: { light: "#f4f1ff" } }, t + 1);
    add({ fonts: { heading: "Archivo Black" }, palette: { light: "#FFF6E0" } }, t + 3);
    add({ fonts: { heading: "anton_n4" }, palette: { light: "#000000" } }, t + 4, 1);
    const mine = add({ fonts: { heading: "prata_n4" }, palette: { light: "#FFFFFF" } }, t + 5);
    const got = marquesRecentes(mine, 2);
    expect(got).toEqual([{ heading: "archivo_black_n4", light: "#FFF6E0" }, { heading: "chivo_n7", light: "#F4F1FF" }]);
    const brief = varieteMarquesBrief(got);
    expect(brief).toMatch(/Polices de titres déjà prises[^\n]*Archivo Black \(archivo_black\), Chivo \(chivo\)/);
    expect(brief).toMatch(/Fonds clairs déjà pris \(light\) : #FFF6E0, #F4F1FF/);
    // Jamais le nom d'une autre marque dans la consigne.
    expect(brief).not.toMatch(/Essai variété/);
  });
});
