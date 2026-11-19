/**
 * Signatures des familles, réglages des sections, signe de la marque (17 novembre 2026). Le propriétaire, devant deux
 * sites de deux familles : « les thèmes entre les deux marques sont très identiques ». Contrôles sans IA, rendu sans
 * navigateur ; le rendu en image est fait par le banc du tour (scripts/tour-des-sections/familles.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as G from "@/lib/syna-agent/custom-theme/signatures";
import { FAMILLE_IDS } from "@/lib/syna-agent/custom-theme/familles";
import { TENUE_FILES, TENUE_SECTIONS, TenuePickSchema, contraste, fondsCss, tenueAttrs, withTextesLongs } from "@/lib/syna-agent/custom-theme/tenue";
import { DESIGN_SYSTEM, DesignSchema } from "@/lib/syna-agent/custom-theme/design";

const ACCUEIL = ["tn-ouverture", "tn-produits", "tn-atouts", "tn-emotion", "tn-appel-produit", "tn-histoire", "tn-questions", "tn-garantie", "tn-final"];
const page = (key: string, ids: string[], reglages: (G.Reglages | null)[] = []) => ({ key, label: key, sections: ids.map((section, i) => ({ section, reglages: reglages[i] ?? null })) });
/** Des pages composées au hasard (graine fixe) parmi les pièces de contenu : la signature doit tenir sur toutes. */
function pagesAuHasard(n: number): string[][] {
  let h = 12345;
  const rnd = () => ((h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0) % 10_000) / 10_000;
  const contenu = TENUE_SECTIONS.filter((s) => !["en-tête", "pied de page", "recherche"].includes(s.role) && s.group !== "bandeau" && s.group !== "partout").map((s) => s.id);
  return Array.from({ length: n }, () => ["tn-ouverture", ...Array.from({ length: 4 + Math.floor(rnd() * 9) }, () => contenu[Math.floor(rnd() * contenu.length)])]);
}

describe("les réglages d'une section (point 3)", () => {
  it("se lisent avec indulgence : une valeur inconnue est oubliée, jamais un appel payé perdu", () => {
    expect(G.ReglagesPick.parse({ fond: "Sombre", alignement: "centré", titre: "grand" })).toEqual({ fond: "sombre", alignement: "centre", titre: "grand" });
    expect(G.ReglagesPick.parse({ fond: "couleur de la marque" })).toEqual({ fond: "marque" });
    expect(G.ReglagesPick.parse({ fond: "violet", alignement: 3 })).toEqual({});
    expect(G.ReglagesPick.parse("n'importe quoi")).toEqual({});
    const d = DesignSchema.shape.pages.element.shape.sections.element.parse({ section: "tn-produits", reglages: { fond: "doux" }, why: "Le moment des produits.", says: "Les vrais produits du client.", photos: "aucune" });
    expect(d.reglages).toEqual({ fond: "doux" });
  });

  it("seules les pièces de contenu à fond clair prennent un fond ; la coque, l'ouverture, l'achat et une disposition déjà sombre gardent le leur", () => {
    expect(G.reglagesPermis("tn-produits", "grille")).toEqual({ fond: true, alignement: true, titre: true });
    expect(G.reglagesPermis("tn-ouverture", "titre-en-bas").fond).toBe(false);
    expect(G.reglagesPermis("tn-achat", "simple").fond).toBe(false);
    expect(G.reglagesPermis("tn-entete-liens", "classique").fond).toBe(false);
    expect(G.reglagesPermis("tn-final", "encadre").fond).toBe(false); // une pièce dessinée sombre
    expect(G.reglagesPermis("tn-cout", "panneau-sombre").fond).toBe(false);
    expect(G.reglagesPermis("tn-cout", "cases").fond).toBe(true);
    // Mesuré par le banc (3 216 rendus) : ce qui ne se lit pas dans un fond réglé garde le sien, et compte avec son dessin.
    expect(G.reglagesPermis("tn-bien-energie", "echelles").fond).toBe(false);
    expect(G.reglagesPermis("tn-devis", "bande").fond).toBe(false);
    expect(G.reglagesPermis("tn-devis", "courte").fond).toBe(true);
    expect(G.fondDessine("tn-devis", "bande")).toBe("sombre");
    expect(G.fondDessine("tn-presentation", "bande")).toBe("couleur");
    // Une large part des pièces a des réglages : la variété se multiplie sur tout le thème, pas sur une pièce.
    const avecFond = TENUE_SECTIONS.filter((s) => G.reglagesPermis(s.id, s.constructions[0]?.key).fond).length;
    expect(avecFond).toBeGreaterThan(90);
  });

  it("se rendent par attributs, et seulement là où la pièce les accepte", () => {
    expect(G.reglagesAttrs("tn-produits", "grille", { fond: "sombre", alignement: "centre", titre: "grand" })).toBe(' data-tn-fd="sombre" data-tn-al="centre" data-tn-ti="grand"');
    expect(G.reglagesAttrs("tn-ouverture", "titre-en-bas", { fond: "sombre", alignement: "centre" })).toBe("");
    expect(G.reglagesAttrs("tn-produits", "grille", { titre: "normal" })).toBe("");
  });

  it("chaque fond calcule des couleurs lisibles (contraste de 4,5 au moins entre le texte et le fond), quelle que soit la palette", () => {
    const palettes = [
      { light: "#F6F1E7", dark: "#1F2A24", primary: "#2F4A3C", secondary: "#E9D8B8" },
      { light: "#FFF6E0", dark: "#1A1F3A", primary: "#FFD23F", secondary: "#2A3157" }, // jaune vif, bleu nuit : la palette difficile du banc
      { light: "#F4F4F1", dark: "#0E0E10", primary: "#D8FF3C", secondary: "#2A2A2E" },
      { light: "#FFFFFF", dark: "#444444", primary: "#999999" }, // une encre trop peu sombre, une couleur de marque grise
    ];
    for (const pal of palettes) for (const famille of [null, ...FAMILLE_IDS]) {
      const css = fondsCss(pal, famille);
      for (const f of ["doux", "sombre", "marque"]) {
        const bloc = new RegExp(`\\[data-tn-fd="${f}"\\]\\{([^}]*)\\}`).exec(css)![1];
        const v = (k: string) => new RegExp(`${k}:(#[0-9a-fA-F]{6})`).exec(bloc)?.[1];
        expect(contraste(v("--tn-fond")!, v("--tn-encre")!), `${JSON.stringify(pal)} ${famille} ${f}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("la feuille des signatures est chargée avec les autres, après elles", () => {
    expect(TENUE_FILES.css[TENUE_FILES.css.length - 1]).toBe("tenue-familles.css");
    const css = fs.readFileSync(path.join(process.cwd(), "public/sections/tenue-familles.css"), "utf8");
    for (const f of FAMILLE_IDS) expect(css, f).toContain(`[data-tn-famille="${f}"]`);
    for (const f of G.SIGNE_FORMES) expect(css, f).toContain(`.tn-signe-m[data-f="${f}"]`);
    // Jamais une photo dans une arche ni une demi-lune ; aucun dessin.
    expect(css).not.toMatch(/999px 999px 0 0|<svg|url\("data:image\/svg/);
    expect(tenueAttrs(null, null, "spectaculaire")).toContain('data-tn-famille="spectaculaire"');
    expect(tenueAttrs(null, null, null)).not.toContain("data-tn-famille");
  });
});

describe("la signature de chaque famille (point 2), sans porte de sortie", () => {
  it("chaque famille a une signature dite au concepteur, et deux familles n'ont jamais le même rythme de fonds", () => {
    const rythmes = new Set(FAMILLE_IDS.map((f) => JSON.stringify([G.SIGNATURES[f].cycle, G.SIGNATURES[f].min, G.SIGNATURES[f].max])));
    expect(rythmes.size).toBe(FAMILLE_IDS.length);
    for (const f of FAMILLE_IDS) expect(DESIGN_SYSTEM).toContain(`- ${f} : ${G.SIGNATURES[f].dessin}`);
    expect(DESIGN_SYSTEM).toContain("RÉGLAGES DE CHAQUE SECTION");
  });

  it("l'accueil de chaque famille montre son rythme : maison et naturel alternent le doux, confiance le sombre, gourmand la couleur de la marque, épuré reste clair", () => {
    const fonds = (f: string) => G.fondsDePage(f, ACCUEIL.map((id) => ({ id })), { accueil: true });
    expect(fonds("maison-chaleureuse").filter((x) => x === "doux").length).toBeGreaterThanOrEqual(2);
    expect(fonds("naturel-sincere").filter((x) => x === "doux").length).toBeGreaterThanOrEqual(2);
    expect(fonds("confiance-savoir-faire").filter((x) => x === "sombre").length).toBeGreaterThanOrEqual(2);
    expect(fonds("gourmand-joyeux")).toContain("marque");
    expect(fonds("spectaculaire").filter((x) => x === "sombre").length).toBeGreaterThanOrEqual(2);
    expect(fonds("epure-editorial").filter((x) => x && x !== "clair")).toEqual([]);
    // Six familles, six accueils différents.
    expect(new Set(FAMILLE_IDS.map((f) => JSON.stringify(fonds(f)))).size).toBe(FAMILLE_IDS.length);
  });

  it("le contrôle refuse ce qui sort de la signature : un fond interdit, deux fonds teintés pareils à la suite, un accueil sans le rythme de sa famille", () => {
    const epure = G.signatureGaps({ famille: "epure-editorial", pages: [page("home", ACCUEIL, [null, { fond: "sombre" }])] });
    expect(epure.join("\n")).toMatch(/fond « sombre », la famille epure-editorial en permet 0/);
    const collés = G.signatureGaps({ famille: "maison-chaleureuse", pages: [page("about", ["tn-histoire", "tn-atouts"], [{ fond: "doux" }, { fond: "doux" }])] });
    expect(collés.join("\n")).toMatch(/deux sections au même fond « doux » à la suite/);
    const sansRythme = G.signatureGaps({ famille: "confiance-savoir-faire", pages: [page("home", ACCUEIL, ACCUEIL.map(() => ({ fond: "clair" })))] });
    expect(sansRythme.join("\n")).toMatch(/au moins 2 section\(s\) au fond « sombre » sur l'accueil \(ici 0\)/);
    // Sans famille : rien à contrôler ici (la famille manquante est refusée par familleGaps).
    expect(G.signatureGaps({ famille: null, pages: [page("home", ACCUEIL)] })).toEqual([]);
  });

  it("le Studio corrige seul ce que le concepteur laisse : après lui, plus aucun écart, sur cent pages composées au hasard et dans les six familles", () => {
    const pages = pagesAuHasard(100);
    for (const f of FAMILLE_IDS) for (const [i, ids] of pages.entries()) {
      // Le concepteur a mis des fonds au hasard, même interdits.
      const d = { famille: f, pages: [page(i % 2 ? "home" : "about", ids, ids.map((_x, k) => ({ fond: G.FONDS[(k * 7 + i) % 4] })))] };
      const fit = G.fitSignature(d);
      expect(G.signatureGaps(fit.d), `${f} · ${ids.join(",")}`).toEqual([]);
      // Ce qui tenait déjà dans la famille est gardé.
      expect(G.signatureGaps(G.fitSignature(fit.d).d)).toEqual([]);
    }
  });

  it("garde les choix du concepteur qui tiennent dans la famille", () => {
    const voulu: (G.Reglages | null)[] = [null, { fond: "clair", alignement: "gauche", titre: "grand" }, { fond: "marque" }, null, null, { fond: "doux" }];
    const d = { famille: "gourmand-joyeux", pages: [page("home", ACCUEIL, voulu)] };
    expect(G.signatureGaps(d)).toEqual([]);
    const r = G.fitSignature(d).d.pages[0].sections;
    expect(r[1].reglages).toEqual({ fond: "clair", alignement: "gauche", titre: "grand" });
    expect(r[2].reglages).toMatchObject({ fond: "marque" });
    expect(r[5].reglages).toMatchObject({ fond: "doux" });
    // L'ouverture ne prend aucun réglage.
    expect(r[0].reglages).toBeNull();
  });

  it("un site d'une famille rendu sans réglage enregistré prend quand même la signature de sa famille", () => {
    const sections = ACCUEIL.map((id, i) => ({ uid: `u${i}`, id, reglages: null as G.Reglages | null }));
    const r = G.reglagesDePage("confiance-savoir-faire", "home", sections);
    expect(r.filter((x) => x.reglages?.fond === "sombre").length).toBeGreaterThanOrEqual(2);
    expect(G.reglagesDePage(null, "home", sections)).toBe(sections);
  });
});

describe("le signe de la marque (point 4)", () => {
  const signe: G.Signe = { forme: "etiquette", texte: "Fait maison" };

  it("la tenue porte sa forme et son texte, lus avec indulgence", () => {
    const t = TenuePickSchema.parse({ titres: "gras", bouton: "ombre", cadre: "droit", fond: "uni", petits: "normal", signe: "l'étiquette ronde du bocal", signeForme: "Étiquette", signeTexte: "  Fait   maison " });
    expect(t).toMatchObject({ signeForme: "etiquette", signeTexte: "Fait maison" });
    expect(TenuePickSchema.parse({ signeForme: "pictogramme" }).signeForme).toBeUndefined();
    expect(G.signeDe(t)).toEqual(signe);
  });

  it("un signe incomplet est rendu au concepteur, puis complété sans IA (forme de la famille, nom de la marque)", () => {
    expect(G.signeGaps({}).join("\n")).toMatch(/n'a pas de forme[\s\S]*n'a pas de texte/);
    expect(G.signeGaps({ signeForme: "tampon", signeTexte: "x".repeat(30) }).join("\n")).toMatch(/30 signes/);
    expect(G.signeGaps({ signeForme: "ligne", signeTexte: "N° 0427" })).toEqual([]);
    const fit = G.fitSigne({ signeForme: null, signeTexte: "" }, "epure-editorial", "Atelier Nord");
    expect(fit.t).toEqual({ signeForme: "ligne", signeTexte: "Atelier Nord" });
    expect(G.signeGaps(fit.t)).toEqual([]);
  });

  it("jamais un blanc à remplir : refusé au concepteur, retiré sans IA, et retiré au rendu d'un site déjà monté (essai Bécane)", () => {
    expect(G.signeGaps({ signeForme: "etiquette", signeTexte: "Prix annoncé : __ €" }).join("\n")).toMatch(/blanc à remplir/);
    expect(G.signeGaps({ signeForme: "ligne", signeTexte: "__ / __ / ____" }).join("\n")).toMatch(/blanc à remplir/);
    expect(G.signeSansBlanc("Prix annoncé : __ €")).toBe("Prix annoncé");
    expect(G.signeSansBlanc("Révisé le __ / __ / ____")).toBe("Révisé le");
    expect(G.signeSansBlanc("N° __")).toBe("N°");
    expect(G.fitSigne({ signeForme: "etiquette", signeTexte: "Prix annoncé : __ €" }, "epure-editorial", "Bécane").t.signeTexte).toBe("Prix annoncé");
    expect(G.fitSigne({ signeForme: "ligne", signeTexte: "__ / __ / ____" }, "epure-editorial", "Bécane").t.signeTexte).toBe("Bécane");
    expect(G.signeDe({ signeForme: "etiquette", signeTexte: "Prix annoncé : __ €" })).toEqual({ forme: "etiquette", texte: "Prix annoncé" });
    expect(G.signeDe({ signeForme: "ligne", signeTexte: "__ / __ / ____" })).toBeNull();
    expect(G.signaturesBrief()).not.toMatch(/une ligne à remplir/);
  });

  it("revient sur l'ouverture, un moment du milieu et l'appel final de l'accueil ; à la fin des autres pages importantes ; jamais sur une page pratique", () => {
    const h = (titre: boolean, n: number) => `<section class="tn tn-x${n}">${titre ? `<h2>Titre ${n}</h2>` : "<p>texte</p>"}</section>`;
    const accueil = [`<section class="tn tn-ouverture"><div class="tn-in"><small>Petit</small><h1>Le grand titre</h1></div></section>`, h(true, 1), h(false, 2), h(true, 3), h(true, 4), h(false, 5), h(true, 6), h(true, 7)];
    expect(G.placesDuSigne("home", accueil)).toEqual([0, 4, 7]);
    const pose = G.signeSurPage("home", accueil, signe);
    expect(pose.filter((x) => x.includes("tn-signe-m")).length).toBe(3);
    expect(pose[0]).toContain('<h1><span class="tn-signe-m" data-f="etiquette" aria-hidden="true"><span>Fait maison</span></span>Le grand titre</h1>');
    expect(G.placesDuSigne("product", accueil.slice(1))).toEqual([6]);
    expect(G.placesDuSigne("cart", accueil)).toEqual([]);
    expect(G.signeSurPage("home", accueil, null)).toBe(accueil);
    // Une seule fois par section, même posé deux fois.
    expect(G.avecSigne(pose[0], signe)).toBe(pose[0]);
  });

  it("le texte du signe ne compte pas dans la longueur du titre (un titre court reste à sa taille)", () => {
    const html = `<section class="tn"><h2>${G.signeHtml({ forme: "ligne", texte: "Une ligne assez longue ici" })}Un titre court de vingt signes, pas plus</h2></section>`;
    expect(withTextesLongs(html)).not.toContain("data-tn-long");
  });

  it("les formes du signe sont des formes simples et du texte, dites au concepteur", () => {
    expect(G.SIGNE_FORMES).toEqual(["etiquette", "tampon", "ligne", "couture", "ruban"]);
    expect(DESIGN_SYSTEM).toContain("LE SIGNE DE LA MARQUE");
    expect(DESIGN_SYSTEM).toMatch(/jamais un dessin/);
  });
});

describe("le rendu du Studio et la mise en boutique (sans navigateur)", () => {
  it("l'aperçu porte la famille, les fonds de section de sa signature et le signe à trois endroits de l'accueil", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { loadProject } = await import("@/lib/projects");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const user = await account(), pid = await project(user);
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now(), famille: "confiance-savoir-faire" };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, ...ACCUEIL.map((section) => ({ op: "add", page: "home", section }) as const), { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" },
      { op: "tenue", tenue: { titres: "gras", bouton: "droit", cadre: "droit", fond: "uni", petits: "machine", signe: "le tampon de l'atelier", signeForme: "tampon", signeTexte: "Travail soigné" } }] as any);
    const out = renderCustomTheme(loadProject(pid), t, { embed: true });
    expect(out).toContain('data-tn-famille="confiance-savoir-faire"');
    expect(out).toContain('href="/sections/tenue-familles.css"');
    expect((out.match(/data-tn-fd="sombre"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(out).toMatch(/\.ctw \.tn\[data-tn-fd="sombre"\]\{--tn-fond:#/);
    const home = out.slice(out.indexOf('data-pg="home"'), out.indexOf("</main>", out.indexOf('data-pg="home"')));
    expect((home.match(/class="tn-signe-m" data-f="tampon"/g) ?? []).length).toBe(3);
    expect(home).toMatch(/<h1[^>]*><span class="tn-signe-m" data-f="tampon" aria-hidden="true"><span>Travail soigné<\/span><\/span>/);
    // Un site sans famille ni signe ne change pas.
    const nu = renderCustomTheme(loadProject(pid), { ...t, famille: null, tenue: { ...t.tenue, signeForme: undefined } }, { embed: true });
    expect(nu).not.toMatch(/ data-tn-fd="|<span class="tn-signe-m"| data-tn-famille="/);
  });
});
