/**
 * Lot 4 : les six styles de page produit et les six styles de page de services (référence, partie 15), en coulisses.
 * SINA choisit le style d'après ce que le client vend ; le Studio contrôle sans IA ce qui se contrôle (la façon du bloc
 * d'achat, la pièce de métier), et ramène le bloc d'achat dans le style en dernier recours. Aucun appel réel.
 */
import { describe, expect, it } from "vitest";
import * as S from "@/lib/syna-agent/custom-theme/styles-de-page";
import { designPrompt, DesignSchema, DESIGN_REVIEW_SYSTEM } from "@/lib/syna-agent/custom-theme/design";
import { TENUE_SECTIONS, constructionsOf } from "@/lib/syna-agent/custom-theme/tenue";

const sec = (section: string, construction?: string) => ({ section, ...(construction ? { construction } : {}) });

describe("les styles de la page qui vend", () => {
  it("six styles de page produit, six styles de page de services ; chaque pièce citée existe, chaque façon du bloc d'achat aussi", () => {
    expect(S.STYLES_PRODUIT.map((x) => x.id)).toEqual(["simple", "vente-directe", "haut-de-gamme", "technique", "alimentaire-soin", "mode"]);
    expect(S.STYLES_SERVICES.map((x) => x.id)).toEqual(["prestation-simple", "rendez-vous-complet", "devis-artisan", "bien-immobilier", "restaurant", "atelier-cours"]);
    const ids = new Set(TENUE_SECTIONS.map((s) => s.id)), buy = constructionsOf("tn-achat").map((c) => c.key);
    for (const st of [...S.STYLES_PRODUIT, ...S.STYLES_SERVICES]) for (const id of [...st.pieces, ...(st.metier ?? [])]) expect(ids.has(id), `${st.id} : ${id}`).toBe(true);
    // Une façon du bloc d'achat par style de page produit, toutes différentes.
    expect(S.STYLES_PRODUIT.map((x) => x.achat)).toEqual(buy);
    for (const st of S.STYLES_SERVICES) { expect(st.achat).toBeUndefined(); expect(st.metier!.length).toBeGreaterThan(0); }
    // La vente directe ne ment jamais.
    expect(S.styleOf("vente-directe", "products")!.jamais).toMatch(/fausse urgence[^]*faux avis/);
  });

  it("le concepteur reçoit les styles de SA sorte de site, les choisit en coulisses, et le relecteur les vérifie", () => {
    const boutique = designPrompt({ brief: "FICHE", family: "classique", site: { business: "products", products: 3 }, has: [], lacks: [] });
    const services = designPrompt({ brief: "FICHE", family: "classique", site: { business: "services", products: 1 }, has: [], lacks: [] });
    expect(boutique).toMatch(/LES STYLES DE LA PAGE PRODUIT \(en coulisses, jamais dits au client\)[^]*- vente-directe \(Vente directe\)[^]*construction « vente-directe »/);
    expect(boutique).not.toMatch(/- devis-artisan \(/);
    expect(services).toMatch(/LES STYLES DE LA PAGE DE SERVICES[^]*- bien-immobilier \(Fiche de bien immobilier\)[^]*- restaurant \(Restaurant\)/);
    expect(services).not.toMatch(/- vente-directe \(/);
    expect(DESIGN_REVIEW_SYSTEM).toMatch(/« pageStyle »[^]*ce que le client vend vraiment/);
    // Lecture indulgente : la clé ou le nom ; un style inconnu ne fait jamais échouer un appel payé.
    expect(S.readStyle("Haut de gamme")).toBe("haut-de-gamme");
    expect(S.readStyle(" Devis d'artisan ")).toBe("devis-artisan");
    expect(S.readStyle("baroque")).toBeNull();
    const d = DesignSchema.parse({ visitor: "v".repeat(30), levers: ["aaa", "bbb"], objections: [], concept: "c".repeat(30), header: "tn-entete", footer: "tn-pied", search: null, corrections: [], pageStyle: "Mode", pages: [{ key: "home", label: "Accueil", journey: "x".repeat(30), sections: [{ section: "tn-ouverture", why: "y".repeat(12), says: "z".repeat(12), photos: "aucune" }] }] });
    expect(d.pageStyle).toBe("mode");
  });

  it("contrôle sans IA : style manquant, bloc d'achat hors du style, pièce de métier absente ; le bloc d'achat est ramené dans le style", () => {
    const pages = [{ key: "home", sections: [sec("tn-ouverture")] }, { key: "product", sections: [sec("tn-achat", "simple"), sec("tn-description")] }, { key: "product-robe", sections: [sec("tn-achat"), sec("tn-description")] }];
    expect(S.styleGaps({ pageStyle: null, pages }, "products")).toEqual([expect.stringMatching(/style de la page produit manquant ou inconnu/)]);
    expect(S.styleGaps({ pageStyle: "simple", pages: pages.slice(0, 2) }, "products")).toEqual([]);
    const gaps = S.styleGaps({ pageStyle: "mode", pages }, "products");
    expect(gaps).toHaveLength(2); // la fiche commune et la fiche de la robe
    expect(gaps[0]).toMatch(/style mode : sur la page « product », le bloc d'achat se bâtit en « portrait » \(et non « simple »\)/);
    const fit = S.fitStyle({ pageStyle: "mode", pages }, "products");
    expect(fit.changed).toHaveLength(2);
    expect(S.styleGaps(fit.d, "products")).toEqual([]);
    expect(pages[1].sections[0].construction).toBe("simple"); // la conception d'origine n'est pas modifiée
    // Services : la pièce de métier du style doit être posée.
    const svc = [{ key: "home", sections: [sec("tn-ouverture")] }, { key: "prestations", sections: [sec("tn-prestations")] }, { key: "devis", sections: [sec("tn-contact")] }];
    expect(S.styleGaps({ pageStyle: "prestation-simple", pages: svc }, "services")).toEqual([]);
    expect(S.styleGaps({ pageStyle: "devis-artisan", pages: svc }, "services")).toEqual([expect.stringMatching(/style devis-artisan : aucune de ses pièces de métier n'est posée \(tn-devis\)/)]);
    expect(S.styleGaps({ pageStyle: "restaurant", pages: [...svc, { key: "carte", sections: [sec("tn-carte", "conduite")] }] }, "services")).toEqual([]);
    // Un style de services ne touche jamais à un bloc d'achat.
    expect(S.fitStyle({ pageStyle: "restaurant", pages: svc }, "services").changed).toEqual([]);
  });
});
