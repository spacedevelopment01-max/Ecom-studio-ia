/**
 * Lot 4 (16 novembre 2026) : les six familles du thème unique, en coulisses. SINA en choisit une d'après la planche de
 * marque ; le Studio contrôle sans IA que le site reste dans ses choix (allure, en-tête, pied de page, ouverture), et y
 * ramène ce qui en sort après la seule reprise du concepteur. Les photos suivent la façon de photographier de la
 * famille. Aucun appel réel.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as M from "@/lib/syna-agent/custom-theme/familles";
import { DESIGN_REVIEW_SYSTEM, DESIGN_SYSTEM, DesignSchema, designPrompt } from "@/lib/syna-agent/custom-theme/design";
import { TENUE_SECTIONS, TenueSchema, constructionsOf } from "@/lib/syna-agent/custom-theme/tenue";

const tenue = (o: Record<string, string>) => TenueSchema.parse({ signe: "le rayon de la roue", ...o });
const page = (first: { section: string; construction?: string }) => [{ key: "home", label: "Accueil", journey: "x".repeat(30), sections: [{ ...first, why: "y".repeat(12), says: "z".repeat(12), photos: "aucune" }] }];

describe("les six familles du Studio (en coulisses)", () => {
  it("six familles, chacune avec son allure, sa façon de photographier, ses en-têtes, ses pieds de page et ses ouvertures", () => {
    expect(M.FAMILLES.map((f) => f.id)).toEqual(["maison-chaleureuse", "epure-editorial", "naturel-sincere", "gourmand-joyeux", "confiance-savoir-faire", "spectaculaire"]);
    const ids = new Set(TENUE_SECTIONS.map((s) => s.id));
    const valid = (ref: string) => { const [id, c] = ref.split(":"); return ids.has(id) && (!c || constructionsOf(id).some((x) => x.key === c)); };
    for (const f of M.FAMILLES) {
      for (const k of ["titres", "bouton", "cadre", "fond", "petits"] as const) { expect(f.tenue[k].length, `${f.id} ${k}`).toBeGreaterThan(0); for (const v of f.tenue[k]) expect(TenueSchema.shape[k].safeParse(v).success, `${f.id} ${k} ${v}`).toBe(true); }
      expect(f.photos.length).toBeGreaterThan(40);
      // Chaque choix existe vraiment dans le thème : une pièce, et sa façon de se bâtir.
      for (const r of [...f.entete, ...f.pied, ...f.ouvertures]) expect(valid(r), `${f.id} ${r}`).toBe(true);
      // Règle du propriétaire : l'accueil s'ouvre par une grande photo pleine, le titre dessus.
      for (const r of f.ouvertures) expect(M.OUVERTURES_PHOTO_PLEINE as readonly string[], `${f.id} ${r}`).toContain(r);
      expect(f.ouvertures.length).toBeGreaterThanOrEqual(2);
    }
    // Deux familles n'ont jamais la même allure typique ni la même ouverture typique que toutes les autres.
    const typical = M.FAMILLES.map((f) => [f.tenue.titres[0], f.tenue.bouton[0], f.tenue.cadre[0], f.tenue.fond[0], f.tenue.petits[0], f.entete[0], f.pied[0], f.ouvertures[0]].join("|"));
    expect(new Set(typical).size).toBe(6);
    expect(new Set(M.FAMILLES.map((f) => f.ouvertures[0])).size).toBeGreaterThanOrEqual(5);
  });

  it("le concepteur reçoit les six familles, choisit d'après la planche, et ne reçoit que les pièces du thème ; aucun exemple tiré d'un projet d'essai ni d'un site réel", () => {
    const brief = M.famillesBrief();
    for (const f of M.FAMILLES) expect(brief).toContain(`- ${f.id} (${f.nom})`);
    expect(brief).toMatch(/en coulisses : le client ne les voit jamais/);
    expect(brief).toMatch(/en partant de la PLANCHE DE MARQUE/);
    expect(brief).toMatch(/Le métier n'est qu'un indice/);
    expect(brief).toMatch(/grande photo pleine avec le titre posé dessus/);
    const prompt = designPrompt({ brief: "FICHE", family: "classique", site: { business: "services", products: 1 }, has: [], lacks: [] });
    expect(prompt).toContain(brief);
    // Le thème unique : seulement ses pièces (les anciennes sections ne sont plus données au concepteur).
    const lines = prompt.split("\n").filter((l) => /^- [a-z0-9-]+ · /.test(l));
    expect(lines.length).toBe(TENUE_SECTIONS.length);
    expect(lines.every((l) => l.startsWith("- tn-") && l.includes("À TENUE"))).toBe(true);
    expect(DESIGN_SYSTEM).toMatch(/FAMILLE : avant tout choix de pièce/);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/FAMILLE : vérifie que la famille choisie[^]*PLANCHE DE MARQUE/);
    // Aucun exemple de projet d'essai, aucun site ni marque cités (le concepteur ne copie personne).
    for (const text of [brief, DESIGN_SYSTEM, DESIGN_REVIEW_SYSTEM]) {
      expect(text).not.toMatch(/bougie|\bthés?\b|infusion|tisane|toilett|yoga|fauteuil|électricien/i);
      expect(text).not.toMatch(/\b(Caravane|Bonsoirs|Tediber|A\.P\.C|Kerzon|Joya|Michel et Augustin|Oatly|hemea|Effy|DJI|Gymshark|Asphalte)\b/);
    }
  });

  it("le choix du concepteur est lu avec indulgence, jamais un appel payé perdu", () => {
    expect(M.readFamille("confiance-savoir-faire")).toBe("confiance-savoir-faire");
    expect(M.readFamille("Confiance et savoir-faire")).toBe("confiance-savoir-faire");
    expect(M.readFamille(" Épuré et éditorial ")).toBe("epure-editorial");
    expect(M.readFamille("SPECTACULAIRE")).toBe("spectaculaire");
    expect(M.readFamille("baroque")).toBeNull();
    expect(M.readFamille(undefined)).toBeNull();
    const d = DesignSchema.parse({ visitor: "v".repeat(30), levers: ["aaa", "bbb"], objections: [], concept: "c".repeat(30), header: "tn-entete", footer: "tn-pied", search: null, corrections: [], famille: "Naturel et sincère", familleWhy: "Les tons d'argile et la police à empattements de la planche.", pages: page({ section: "tn-ouverture" }) });
    expect(d.famille).toBe("naturel-sincere");
    expect(DesignSchema.parse({ ...d, famille: "inconnue" }).famille).toBeNull();
  });

  it("contrôle sans IA : hors des choix de la famille, chaque écart est dit ; puis ramené dans la famille en dernier recours", () => {
    // Sans famille : un écart, et rien n'est ramené.
    const none = { famille: null, header: "tn-entete", headerConstruction: "centre", footer: "tn-pied", tenue: tenue({}), pages: page({ section: "tn-ouverture", construction: "dans-la-photo" }) };
    expect(M.familleGaps(none)).toEqual([expect.stringMatching(/famille manquante ou inconnue/)]);
    expect(M.fitFamille(none).changed).toEqual([]);
    // Dans les choix : aucun écart.
    const ok = { famille: "confiance-savoir-faire", header: "tn-entete-liens", headerConstruction: "classique", footer: "tn-pied", tenue: tenue({ titres: "gras", bouton: "droit", cadre: "droit", fond: "uni", petits: "machine" }), pages: page({ section: "tn-ouverture", construction: "bandeau" }) };
    expect(M.familleGaps(ok)).toEqual([]);
    expect(M.fitFamille(ok).changed).toEqual([]);
    // Hors des choix : titres fins, bouton en étiquette, en-tête centré, pied en grand nom, ouverture sans photo pleine.
    const off = { ...ok, header: "tn-entete", headerConstruction: "centre", footer: "tn-pied-complet", footerConstruction: "grand-nom", tenue: tenue({ titres: "fins", bouton: "etiquette", cadre: "droit", fond: "uni", petits: "machine" }), pages: page({ section: "tn-ouverture-formes" }) };
    const gaps = M.familleGaps(off);
    expect(gaps).toHaveLength(5);
    expect(gaps.join("\n")).toMatch(/titres « fins »[^]*bouton « etiquette »[^]*en-tête « tn-entete:centre »[^]*pied de page « tn-pied-complet:grand-nom »[^]*s'ouvre par « tn-ouverture-formes »[^]*grande photo pleine/);
    const fit = M.fitFamille(off);
    expect(fit.changed).toHaveLength(5);
    expect(M.familleGaps(fit.d)).toEqual([]);
    expect(fit.d.tenue).toMatchObject({ titres: "gras", bouton: "droit", signe: "le rayon de la roue" }); // le signe de la marque est gardé
    expect(fit.d).toMatchObject({ header: "tn-entete-liens", headerConstruction: "classique", footer: "tn-pied-reassurance", footerConstruction: null });
    expect(fit.d.pages[0].sections[0]).toMatchObject({ section: "tn-ouverture", construction: "bandeau" });
    expect(off.pages[0].sections[0].section).toBe("tn-ouverture-formes"); // la conception d'origine n'est pas modifiée
  });

  it("les huit en-têtes et les six pieds de page : un site de services garde le téléphone et le rendez-vous visibles ; les grands menus demandent un vrai catalogue", () => {
    // Les huit en-têtes et les six pieds de page de la référence sont tous permis dans une famille au moins.
    const heads = new Set(M.FAMILLES.flatMap((f) => f.entete)), feet = new Set(M.FAMILLES.flatMap((f) => f.pied));
    for (const r of ["tn-entete-liens:classique", "tn-entete-liens:logo-centre", "tn-entete-liens:sur-photo", "tn-entete-annonce", "tn-entete-liens:mega-colonnes", "tn-entete-liens:mega-produits", "tn-entete-liens:plein-ecran"]) expect(heads.has(r), r).toBe(true);
    for (const r of ["tn-pied-complet:colonnes", "tn-pied-complet:centre-minimal", "tn-pied-lettre", "tn-pied-complet:grand-nom", "tn-pied-reassurance"]) expect(feet.has(r), r).toBe(true);
    expect(M.famillesBrief()).toMatch(/POUR UN SITE DE SERVICES[^]*tn-entete-services[^]*jamais de panier[^]*tn-pied-services/);
    // Services : dans toute famille, l'en-tête de services ; le pied de services est permis, le pied « réassurance » ne l'est pas.
    const svc = { famille: "epure-editorial", header: "tn-entete-liens", headerConstruction: "plein-ecran", footer: "tn-pied-reassurance", tenue: tenue({ titres: "fins", bouton: "droit", cadre: "droit", fond: "uni", petits: "normal" }), pages: page({ section: "tn-ouverture", construction: "titre-en-bas" }) };
    expect(M.familleGaps(svc, { business: "products" })).toEqual([expect.stringMatching(/pied de page « tn-pied-reassurance »/)]);
    const g = M.familleGaps(svc, { business: "services" });
    expect(g.join("\n")).toMatch(/site de services : l'en-tête « tn-entete-liens:plein-ecran » n'est pas dans ses choix \(tn-entete-services\)[^]*pied de page « tn-pied-reassurance »/);
    const fit = M.fitFamille(svc, { business: "services" });
    expect(fit.d).toMatchObject({ header: "tn-entete-services", headerConstruction: null, footer: "tn-pied-services" });
    expect(M.familleGaps(fit.d, { business: "services" })).toEqual([]);
    // Grands menus : seulement pour une boutique qui a au moins trois familles de produits.
    const mega = { famille: "maison-chaleureuse", header: "tn-entete-liens", headerConstruction: "mega-colonnes", footer: "tn-pied-lettre", tenue: tenue({ titres: "fins", bouton: "pilule", cadre: "droit", fond: "uni", petits: "normal" }), pages: page({ section: "tn-ouverture", construction: "titre-centre" }) };
    expect(M.familleGaps(mega, { business: "products", families: 4 })).toEqual([]);
    expect(M.familleGaps(mega, { business: "products", families: 1 })).toEqual([expect.stringMatching(/l'en-tête « tn-entete-liens:mega-colonnes »/)]);
    expect(M.fitFamille(mega, { business: "products", families: 1 }).d).toMatchObject({ header: "tn-entete-liens", headerConstruction: "logo-centre" });
  });

  it("les photos suivent la façon de photographier de la famille", () => {
    expect(M.famillePhotoLine("spectaculaire")).toMatch(/FAÇON DE PHOTOGRAPHIER DE CE SITE[^]*l'action, une lumière rasante/);
    expect(M.famillePhotoLine("confiance-savoir-faire")).toMatch(/jamais une équipe inventée, jamais une personne reconnaissable/);
    expect(M.famillePhotoLine(null)).toBe("");
    // Le montage prend cette direction, et non plus un univers commun à tous les sites.
    const brand = fs.readFileSync(path.join(process.cwd(), "src/lib/syna-agent/custom-theme/brand.ts"), "utf8");
    expect(brand).toContain("familleArtDirection(p, t.famille, j) ?? siteArtDirection(p, fu, j)");
  });
});
