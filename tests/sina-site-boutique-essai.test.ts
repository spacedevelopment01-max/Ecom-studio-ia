/**
 * Essai réel du 17 novembre 2026 (site d'une boutique créé en une fois par SINA) : un test par correction. Sans IA.
 * Les clients de ces tests sont inventés pour le test.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

import { lintClaims } from "@/lib/ai/tasks";
import { repeatedPhrases, repeatDrops, planCopyFixes, MAX_COPY_FIXES, REPEAT_SECTIONS_MAX } from "@/lib/syna-agent/custom-theme/brand";
import { withoutMissingPhotos } from "@/lib/syna-agent/custom-theme/library";
import { catalogueGap, fillKnownGaps, type SiteFacts } from "@/lib/syna-agent/custom-theme/site-facts";
import { coupe, exampleProductNames, exampleProductsLeft, listedProducts, repere, tenueSection, withoutExampleProducts, withTenueProducts } from "@/lib/syna-agent/custom-theme/tenue";
import { doublesOption, withAchatOptions } from "@/lib/syna-agent/custom-theme/tenue-data";
import { fichePhotos, textOnPhoto } from "@/lib/syna-agent/custom-theme/render";
import { nameProductPages, type CustomTheme } from "@/lib/syna-agent/custom-theme/theme";
import { OUVERTURES_PHOTO_PLEINE, FAMILLES } from "@/lib/syna-agent/custom-theme/familles";

const OPTIONS = [{ name: "Bois", values: [{ label: "Chêne" }, { label: "Noyer" }, { label: "Frêne" }] }];
const ACHAT = (options: string) => `<section class="tn tn-achat" data-tn-achat><div class="tn-galerie"><div class="tn-grande tn-ph" style="background-image:url(/api/files/abc123)"></div></div><small>Les tabourets</small><h1>Tabouret Rond</h1><div class="tn-prix">180 €</div><p>Un tabouret.</p>${options}<a class="tn-bt" href="#" onclick="return false" data-pogo>Ajouter au panier</a><ul class="tn-reperes"><li>x</li></ul><div class="tn-barre"><b>Tabouret Rond</b><a class="tn-bt" href="#" onclick="return false" data-pogo>Ajouter au panier</a></div></section>`;
const opt = (t: string) => `<div class="tn-option"><i></i><span>${t}</span></div>`;

describe("le vrai choix dans le bloc d'achat", () => {
  it("une ligne d'option qui double une option du catalogue est reconnue ; une autre (gravure, date) ne l'est pas", () => {
    expect(doublesOption("Bois : chêne, noyer ou frêne", OPTIONS)).toBe(true);
    expect(doublesOption("Bois : [À compléter : essences proposées]", OPTIONS)).toBe(true);
    expect(doublesOption("En chêne ou en noyer, au choix", OPTIONS)).toBe(true);
    expect(doublesOption("[À compléter : teintes proposées]", OPTIONS)).toBe(true);
    expect(doublesOption("Ta date (facultatif) : je la grave dessous.", OPTIONS)).toBe(false);
    expect(doublesOption("Assise en chêne massif", OPTIONS)).toBe(false);
  });
  it("les vraies pastilles prennent la place de la phrase ; l'autre option reste ; sans option au catalogue, rien ne bouge", () => {
    const html = ACHAT(opt("Bois : [À compléter : essences]") + opt("Ta date (facultatif)."));
    const out = withAchatOptions(html, OPTIONS, { selecteur: true });
    expect(out).toContain('<div class="tn-versions tn-versions-achat" data-tn-versions>');
    expect(out).toMatch(/<span>Chêne<\/span>[\s\S]*<span>Noyer<\/span>[\s\S]*<span>Frêne<\/span>/);
    expect(out).not.toContain("À compléter");
    expect(out.match(/class="tn-option"/g)).toHaveLength(1);
    expect(out.indexOf("tn-versions-achat")).toBeLessThan(out.indexOf("Ta date"));
    // Sans ligne à remplacer : les pastilles se posent avant le bouton. En boutique (pas de sélecteur) : la phrase part, rien d'autre.
    expect(withAchatOptions(ACHAT(""), OPTIONS, { selecteur: true })).toMatch(/tn-versions-achat[\s\S]*?<a class="tn-bt"/);
    expect(withAchatOptions(html, OPTIONS)).not.toMatch(/tn-versions-achat|À compléter/);
    expect(withAchatOptions(html, [], { selecteur: true })).toBe(html);
  });
  it("chaque option a sa ligne de grille dans les cinq façons à grille (jamais deux sur la même)", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue-achat.css"), "utf8");
    for (const style of ["vente-directe", "grandes-photos", "technique", "fond-doux", "portrait"]) {
      const row = (sel: string) => Number(new RegExp(`\\.tn-achat\\[data-tn-c="${style}"\\]>${sel.replace(/[.~]/g, "\\$&")}\\{grid-row:(\\d+)`).exec(css)?.[1]);
      const rows = [row(".tn-option"), row(".tn-option~.tn-option"), row(".tn-option~.tn-option~.tn-option")];
      expect(rows, style).toEqual([rows[0], rows[0] + 1, rows[0] + 2]);
    }
  });
});

describe("repères de livraison et de retours", () => {
  it("le mot ne se dit pas deux fois, la phrase n'est jamais coupée dans un mot", () => {
    expect(repere("Livraison", "Livraison en France, 9 €.")).toBe("Livraison en France, 9 €.");
    expect(repere("Retours", "30 jours pour changer d'avis")).toBe("Retours : 30 jours pour changer d'avis");
    expect(repere("Retours", null)).toBe("Retours : [À compléter]");
    const long = coupe("Trente jours après réception si le tabouret n'a pas servi, sauf pour une pièce gravée à ton nom", 60);
    expect(long.endsWith("…")).toBe(true);
    expect("Trente jours après réception si le tabouret n'a pas servi, sauf pour une pièce gravée à ton nom".startsWith(long.slice(0, -1))).toBe(true);
    expect(long.slice(0, -1)).toMatch(/[\p{L}\d]$/u);
  });
});

describe("contrôle des promesses : le catalogue et les mots du client sont des faits", () => {
  const p = { business: "products", product: { facts: [], questions: [] }, settings: { company: { shipping: "9 € en France, offerte dès 250 €", returns: "30 jours" } } } as any;
  const known = { facts: ["Tabouret tourné et assemblé à la main dans l'atelier."], prices: [180, 1240] };
  it("les prix du catalogue, dans toutes leurs écritures, ne sont pas « à confirmer »", () => {
    expect(lintClaims(["180 €", "180,00 €", "180 euros", "1 240 €", "1 240,00 €", "1.240 €", "offerte dès 250 €"], p, known)).toEqual([]);
    expect(lintClaims(["199 €"], p, known).map((c) => c.label)).toEqual(["prix non confirmé"]);
    expect(lintClaims(["180 €"], p).map((c) => c.label)).toEqual(["prix non confirmé"]);
  });
  it("« faits à la main » est confirmé quand le dossier le dit avec ses mots ; « changer d'avis » n'est pas un avis de client", () => {
    expect(lintClaims(["Des tabourets faits à la main."], p, known)).toEqual([]);
    expect(lintClaims(["Des tabourets faits à la main."], p).map((c) => c.label)).toEqual(["fabrication artisanale"]);
    expect(lintClaims(["Trente jours pour changer d'avis.", "Donne-moi ton avis."], p, known).filter((c) => c.label === "avis ou notes")).toEqual([]);
    expect(lintClaims(["Plus de 200 avis de clients."], p, known).some((c) => c.label === "avis ou notes")).toBe(true);
    expect(lintClaims(["Certifié bio."], p, known).length).toBeGreaterThan(0);
  });
});

describe("cartes de produits : la photo de la fiche, sinon une carte sans image", () => {
  const theme = { version: 1, pages: [
    { key: "product", label: "Fiche produit", product: "tabouret-rond", sections: [{ uid: "a1", id: "tn-achat", html: ACHAT("") }] },
    { key: "product-banc", label: "Banc", product: "banc", sections: [{ uid: "a2", id: "tn-achat", html: ACHAT("").replace("/api/files/abc123", "photos/sachet.jpg") }] },
  ] } as unknown as CustomTheme;
  it("la photo créée pour le bloc d'achat d'une fiche est retrouvée ; une photo d'exemple n'en est jamais une", () => {
    const f = fichePhotos(theme);
    expect(f.get("tabouret-rond")).toBe("/api/files/abc123");
    expect(f.has("banc")).toBe(false);
  });
  it("un produit sans photo : sa carte montre « Ta photo ici », jamais un cadre vide (décision du 17 novembre 2026)", () => {
    const html = `<section data-ct="s1" class="tn tn-produits" data-tn-produits><h2>Les tabourets</h2><div class="tn-cartes"></div></section>`;
    const filled = withTenueProducts(html.replace('<div class="tn-cartes"></div>', '<div class="tn-cartes"><a class="tn-carte-p" href="#"><div class="tn-ph" style="background-image:url(photos/sachet.jpg)"></div><b>x</b><span>y</span></a></div>'), [{ title: "Tabouret Rond", image: "/api/files/abc123", price: "180 €" }, { title: "Banc", image: null, price: "320 €" }]);
    const out = withoutMissingPhotos(filled, null, () => false);
    expect(out).toContain('<a class="tn-carte-p" href="#" onclick="return false" data-go="product"><div class="tn-ph tn-ta-photo" role="img" aria-label="Ta photo ici"><span>Ta photo ici</span></div><b>Banc</b>');
    expect(out).not.toContain('<div class="tn-ph"></div>');
    expect(out).toContain("background-image:url(/api/files/abc123)");
    const css = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue.css"), "utf8");
    expect(css).toMatch(/\.tn-ta-photo/);
    // La carte sans image reste la façon de la boutique (Shopify) : sa règle part avec la feuille.
    expect(css).toMatch(/\.tn-carte-p\.tn-sans-photo/);
  });
  it("sur la fiche d'un produit, la liste montre les autres produits", () => {
    const list = [{ title: "A", image: null, price: null, go: "product" }, { title: "B", image: null, price: null, go: "product-b" }];
    expect(listedProducts(list, "product").map((x) => x.title)).toEqual(["B"]);
    expect(listedProducts(list, "home")).toHaveLength(2);
    expect(listedProducts(list.slice(0, 1), "product")).toHaveLength(1);
  });
});

describe("aucun produit d'exemple dans un site monté", () => {
  it("les exemples sont relevés à la source, dans les pièces de la bibliothèque", () => {
    const names = exampleProductNames();
    expect(names.size).toBeGreaterThan(3);
    for (const id of ["tn-produits", "tn-catalogue"]) expect(exampleProductsLeft(tenueSection(id)!.html).length, id).toBeGreaterThan(0);
  });
  it("une carte d'exemple s'en va ; une section vidée ne se rend pas ; un vrai produit du même nom reste", () => {
    const lib = tenueSection("tn-produits")!.html, ex = exampleProductsLeft(lib);
    expect(withoutExampleProducts(lib)).toBe("");
    expect(withoutExampleProducts(lib, ex)).toBe(lib);
    const filled = withTenueProducts(lib, [{ title: "Tabouret Rond", image: null, price: "180 €" }]);
    expect(exampleProductsLeft(filled)).toEqual([]);
    expect(withoutExampleProducts(filled)).toBe(filled);
  });
});

describe("l'ouverture de l'accueil : une grande photo pleine, le titre dessus", () => {
  it("« dans la photo » ne passe plus en deux colonnes sur grand écran", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "public", "sections", "tenue.css"), "utf8");
    const rules = css.split("\n").filter((l) => l.includes('.tn-ouverture[data-tn-c="dans-la-photo"]'));
    expect(rules.length).toBeGreaterThan(8);
    for (const r of rules) expect(r, r.slice(0, 90)).not.toMatch(/grid-template-columns|grid-column:2/);
  });
  it("chaque famille garde au moins deux ouvertures permises, toutes en photo pleine", () => {
    for (const f of FAMILLES) {
      expect(f.ouvertures.length, f.id).toBeGreaterThanOrEqual(2);
      for (const o of f.ouvertures) expect((OUVERTURES_PHOTO_PLEINE as readonly string[]).some((x) => x === o || x === o.split(":")[0]), `${f.id} : ${o}`).toBe(true);
    }
  });
});

describe("aucun vide : une photo qui manque ne laisse pas un grand cadre", () => {
  const ex = 'style="background-image:url(photos/bureau.jpg)"';
  it("une photo et sa légende partent ensemble ; sans aucune photo, la section ne se rend pas", () => {
    const sec = (figs: string) => `<main><section data-ct="s1" class="tn tn-de-pres"><h2>De près.</h2><div class="tn-trois">${figs}</div></section></main>`;
    const ok = '<figure><div class="tn-ph" style="background-image:url(/api/files/a1)"></div><figcaption>Le fil</figcaption></figure>', ko = `<figure><div class="tn-ph" ${ex}></div><figcaption>La pince</figcaption></figure>`;
    const one = withoutMissingPhotos(sec(ok + ko), null, () => false);
    expect(one).toContain("Le fil"); expect(one).not.toContain("La pince"); expect(one).not.toContain("photos/");
    expect(withoutMissingPhotos(sec(ko + ko), null, () => false)).toBe("<main></main>");
  });
  it("à côté d'un texte, le cadre est retiré et le texte reste ; sur une photo qui porte le texte, un panneau sombre", () => {
    const html = `<section data-ct="s2" class="tn tn-texte-photo"><div class="tn-ph tn-cadre" ${ex}></div><div class="tn-txt"><h2>Titre</h2><p>Texte.</p></div></section>`;
    const out = withoutMissingPhotos(html, null, () => false);
    expect(out).toContain('class="tn-ph tn-cadre tn-ph-manque"'); expect(out).toContain("data-tn-photo-manque"); expect(out).toContain("Texte."); expect(out).not.toMatch(/photos\/|data:image/);
    const sur = withoutMissingPhotos(html, { dark: "#221122" }, () => true);
    expect(sur).toContain('data-tn-photo-manque="fond"'); expect(sur).toContain("data:image/svg+xml;base64,"); expect(sur).not.toContain("photos/");
    expect(Buffer.from(/base64,([^)"]+)/.exec(sur)![1], "base64").toString()).toContain("#221122");
  });
  it("le texte se pose sur la photo pour une citation sur photo, pas pour une ouverture dont la photo est à part", () => {
    expect(textOnPhoto({ id: "tn-citation-photo", construction: "voile" })).toBe(true);
    expect(textOnPhoto({ id: "tn-ouverture", construction: "titre-centre" })).toBe(true);
    expect(textOnPhoto({ id: "tn-ouverture", construction: "titre-puis-cadre" })).toBe(false);
    expect(textOnPhoto({ id: "tn-texte-photo", construction: "photo-gauche" })).toBe(false);
  });
});

describe("répétitions : ce qui compte, qui garde, qui retire", () => {
  const S = (uid: string, text: string) => ({ uid, label: `Section ${uid}`, html: `<section><p>${text}</p></section>` });
  it("une ville, les mots de la condition de retour du client et les valeurs d'une option ne sont pas des répétitions", () => {
    const list = ["a", "b", "c", "d", "e"].map((u) => S(u, `Fabriqué à Saint Jean du Gard. Retour sous trente jours après réception du colis. En chêne, noyer ou frêne. Une petite cale de liège dessous.`));
    const all = repeatedPhrases(list).map((r) => r.phrase.toLowerCase());
    expect(all.some((x) => x.includes("jours après réception"))).toBe(true);
    const scoped = repeatedPhrases(list, { ignore: ["Saint Jean du Gard", "Chêne", "Noyer", "Frêne"], facts: ["Retour sous trente jours après réception du colis, s'il n'a pas servi."] }).map((r) => r.phrase.toLowerCase());
    expect(scoped.some((x) => /jours après|saint jean|noyer/.test(x))).toBe(false);
    expect(scoped.some((x) => x.includes("petite cale de liège"))).toBe(true);
  });
  it("au seuil de trois sections, la formule est donnée au rédacteur de la suivante", () => {
    const list = ["a", "b", "c"].map((u) => S(u, "Une petite cale de liège dessous."));
    expect(repeatedPhrases(list)).toEqual([]);
    expect(repeatedPhrases(list, { atLeast: REPEAT_SECTIONS_MAX })[0].phrase.toLowerCase()).toContain("petite cale de liège");
  });
  it("les premières sections gardent la formule, les suivantes la retirent ; le budget des reprises n'est jamais dépassé", () => {
    const rep = repeatedPhrases(["a", "b", "c", "d", "e", "f", "g", "h"].map((u) => S(u, "Une petite cale de liège dessous.")));
    const drops = repeatDrops(rep);
    expect(drops.map((d) => d.uid).sort()).toEqual(["d", "e", "f", "g", "h"]);
    expect(drops[0].drops[0].kept).toEqual(["Section a", "Section b", "Section c"]);
    const review = [1, 2, 3, 4, 5, 6].map((n) => ({ uid: `r${n}`, fixes: ["« x » est un chiffre absent du dossier"] }));
    const plan = planCopyFixes(review, drops);
    expect(plan).toHaveLength(MAX_COPY_FIXES);
    expect(plan.filter((x) => x.repeats)).toHaveLength(3);
    expect(plan.slice(3).map((x) => x.uid)).toEqual(["r1", "r2", "r3"]);
    expect(planCopyFixes([], drops)).toHaveLength(5);
    expect(planCopyFixes([{ uid: "d", fixes: ["corrige le titre"] }], drops).find((x) => x.uid === "d")!.fixes).toHaveLength(2);
    expect(plan[0].fixes[0]).toMatch(/ne l'emploie plus[\s\S]*Section a ; Section b ; Section c/);
  });
});

describe("libellé des fiches et faits du catalogue", () => {
  it("avec une fiche par produit, la première porte aussi le nom de son produit ; un libellé choisi n'est pas touché", () => {
    const t = { version: 1, pages: [{ key: "product", label: "Fiche produit", product: "tabouret-rond", sections: [] }, { key: "product-banc", label: "Banc", product: "banc", sections: [] }] } as unknown as CustomTheme;
    expect(nameProductPages(t, (h) => (h === "tabouret-rond" ? "Tabouret Rond" : "")).pages.map((p) => p.label)).toEqual(["Tabouret Rond", "Banc"]);
    const seul = { version: 1, pages: [{ key: "product", label: "Fiche produit", product: "tabouret-rond", sections: [] }] } as unknown as CustomTheme;
    expect(nameProductPages(seul, () => "Tabouret Rond").pages[0].label).toBe("Fiche produit");
    const choisi = { version: 1, pages: [{ key: "product", label: "Le rond", product: "a", sections: [] }, { key: "product-b", label: "B", product: "b", sections: [] }] } as unknown as CustomTheme;
    expect(nameProductPages(choisi, () => "Tabouret Rond").pages[0].label).toBe("Le rond");
  });
  it("un manque qui nomme une option ou le prix du produit de la page reçoit le fait du catalogue ; le reste n'est pas deviné", () => {
    const f = { site: {}, prestations: [], products: [], notes: [], address: null, discreet: false, catalogue: [{ handle: "tabouret-rond", title: "Tabouret Rond", price: "180 €", options: [{ name: "Bois", values: ["Chêne", "Noyer", "Frêne"] }] }, { handle: "banc", title: "Banc", price: "320 €", options: [] }] } as unknown as SiteFacts;
    expect(catalogueGap("essences de bois proposées", f, "tabouret-rond")).toBe("Chêne, Noyer ou Frêne");
    expect(catalogueGap("teintes proposées", f, "tabouret-rond")).toBe("Chêne, Noyer ou Frêne");
    expect(catalogueGap("prix", f, "banc")).toBe("320 €");
    expect(catalogueGap("prix du Tabouret Rond", f)).toBe("180 €");
    for (const g of ["dimensions du Tabouret Rond", "tarif de livraison en Europe", "moyens de paiement acceptés", "téléphone de l'hébergeur", "teintes proposées"]) expect(catalogueGap(g, f, g.startsWith("teintes") ? "banc" : "tabouret-rond"), g).toBeNull();
    const r = fillKnownGaps("<p>Bois : [À compléter : essences de bois proposées]. Hauteur : [À compléter : dimensions]</p>", f, "product", "tabouret-rond");
    expect(r.html).toBe("<p>Bois : Chêne, Noyer ou Frêne. Hauteur : [À compléter : dimensions]</p>");
    expect(r.filled).toHaveLength(1);
  });
});
