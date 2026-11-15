import { describe, expect, it } from "vitest";
import { siteFlags } from "../src/lib/syna-agent/custom-theme/render";
import { applyStructure, BUY_OPTIONS, type CustomTheme } from "../src/lib/syna-agent/custom-theme/theme";

// Revue du propriétaire du 10 novembre 2026, points 30, 37 et 38 : le client coche les options du « Produit vedette »,
// les boutons de l'en-tête et le panier sur le côté ou en page.
const base = { poInit: "1", poCouleur: "1", poTaille: "1", poPromo: "1", poAbo: "1", poOffre: "lots", poPaliers: "1", poRituel: "1", poGamme: "1", poLivraison: "1", poFidelite: "1", poShip: "2-3-" };
const theme = (): CustomTheme => ({ version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [{ key: "home", label: "Accueil", sections: [] }], rev: 1, at: 0 }) as unknown as CustomTheme;

describe("réglages du site cochés par le client", () => {
  it("la liste des options du Produit vedette suit la revue (point 30)", () => {
    for (const k of ["quantite", "abonnement", "gamme", "ajouts", "barre", "livraison", "livraisonOfferte", "fidelite", "cadeaux", "promotion"]) expect(Object.keys(BUY_OPTIONS)).toContain(k);
  });
  it("une option décochée ne s'affiche jamais ; cochée, seulement si le produit l'a (les données réelles décident)", () => {
    const f = siteFlags(base, { buy: { abonnement: false, quantite: false, fidelite: true } }, null);
    expect(f.poAbo).toBe("0");
    expect(f.poOffre).toBe("none");
    expect(f.poFidelite).toBe("1");
    // Produit sans fidélité : cocher ne l'invente pas.
    expect(siteFlags({ ...base, poFidelite: "0" }, { buy: { fidelite: true } }, null).poFidelite).toBe("0");
  });
  it("barre d'achat fixe seulement si cochée ; livraison offerte seulement avec le vrai seuil du client", () => {
    expect(siteFlags(base, undefined, 35).poBarre).toBe("0");
    expect(siteFlags(base, { buy: { barre: true } }, 35).poBarre).toBe("1");
    expect(siteFlags(base, undefined, 35).poFree).toBe("35");
    expect(siteFlags(base, undefined, null).poFree).toBe("");
    expect(siteFlags(base, { buy: { livraisonOfferte: false } }, 35).poFree).toBe("");
  });
  it("en-tête : Rechercher, Mon compte et Panier à activer ou non ; panier sur le côté ou page panier", () => {
    const f = siteFlags(base, { header: { search: false, account: true }, cart: "drawer" }, null);
    expect([f.hdSearch, f.hdAccount, f.hdCart, f.ctCart]).toEqual(["0", "1", "1", "drawer"]);
    expect(siteFlags(base, undefined, null).ctCart).toBe("page");
  });
  it("SINA enregistre les réglages par custom.structure (op « settings »), sans effacer les précédents", () => {
    let t = applyStructure(theme(), [{ op: "settings", buy: { barre: true } }]);
    t = applyStructure(t, [{ op: "settings", header: { search: false }, cart: "drawer" }]);
    expect(t.settings).toEqual({ buy: { barre: true }, header: { search: false }, cart: "drawer" });
  });
});

describe("disposition d'une section (point 27) et section retirée (point 25)", () => {
  it("SINA enregistre la disposition choisie par le client ; la section porte ses repères de disposition", async () => {
    const { sectionMarkup } = await import("../src/lib/syna-agent/custom-theme/render");
    const t = { ...theme(), pages: [{ key: "home", label: "Accueil", sections: [{ uid: "s00000001", id: "inscription-avec-photo" }] }] } as unknown as CustomTheme;
    const next = applyStructure(t, [{ op: "layout", uid: "s00000001", flip: true, bg: "dark" }, { op: "layout", uid: "s00000001", align: "center" }]);
    const sec = next.pages[0].sections[0];
    expect(sec.layout).toEqual({ flip: true, bg: "dark", align: "center" });
    const html = sectionMarkup(sec, "Éclat de thé", "page");
    expect(html).toContain('data-lay-flip="1"');
    expect(html).toContain('data-lay-bg="dark"');
    expect(html).toContain('data-lay-align="center"');
  });
  it("le bouton « Disposition » est dans l'outil de construction ; « photos qui défilent » est retirée de la banque", async () => {
    const { builderAssets } = await import("../src/lib/syna-agent/custom-theme/builder");
    const { RETIRED_SECTIONS } = await import("../src/lib/syna-agent/custom-theme/library");
    expect(builderAssets([]).js).toContain("Disposition");
    expect(RETIRED_SECTIONS["fiche-produit-photos-qui-defilent"]).toBeTruthy();
  });
});
