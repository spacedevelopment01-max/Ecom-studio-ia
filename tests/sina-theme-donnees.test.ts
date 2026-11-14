/**
 * Les vraies données des sections à tenue, et leur mise en boutique (14 novembre 2026 ; demande du propriétaire : « tu
 * dois faire tout ce qu'on a dit pour la partie thème avec sina »). Coordonnées, horaires, zone, plan (jamais une image),
 * familles, filtres de la page boutique, comparatif, réassurance, avis (jamais d'exemple), journal ; puis CHAQUE section
 * à tenue convertie pour Shopify et passée au contrôle du Studio. Gratuit, sans IA, aucun appel réel.
 */
import { describe, expect, it } from "vitest";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import { TENUE_SECTIONS, tenueSection, withTenueProducts } from "@/lib/syna-agent/custom-theme/tenue";

process.env.STUDIO_SYNA_AGENT = "1";
const html = (id: string) => tenueSection(id)!.html;
/** Les espaces insécables (heures jamais coupées) lues comme des espaces, pour comparer des textes. */
const sp = (x: string) => x.replace(/\u00a0/g, " ");

describe("sections à tenue : les vraies données du client (sans IA, sans base)", () => {
  it("horaires et zone écrits librement : une ligne par période, une ville par ligne", () => {
    expect(D.hoursRows("Lun–Ven 9 h–18 h ; samedi 9 h–12 h")).toEqual([{ day: "Lun–Ven", text: "9 h–18 h" }, { day: "Samedi", text: "9 h–12 h" }]);
    expect(D.hoursRows("Du mardi au samedi, 9 h - 19 h\nFermé le dimanche")).toEqual([{ day: "Du mardi au samedi", text: "9 h - 19 h" }, { day: null, text: "Fermé le dimanche" }]);
    expect(D.zoneCities("Lyon, Villeurbanne et Bron")).toEqual(["Lyon", "Villeurbanne", "Bron"]);
    // Une phrase n'est pas une liste : elle reste entière.
    expect(D.zoneCities("Dans un rayon de trente kilomètres autour de Lyon, y compris les monts du Lyonnais et la plaine de l'Ain")).toHaveLength(1);
  });

  /** Fragments écrits pour l'essai : les emplacements de données d'une section de services, tels que la bibliothèque les écrit. */
  const LIEN = 'href="#" onclick="return false"';
  const OUVERTURE = `<section class="tn tn-ouverture-metier"><a class="tn-tel" ${LIEN} data-tn-tel>[À compléter : téléphone]</a><ul><li><span data-tn-adresse>[À compléter : adresse]</span></li><li><span data-tn-horaires="ligne">[À compléter : jours et heures d'ouverture]</span></li><li><span data-tn-zone="ligne">[À compléter : villes desservies]</span></li></ul></section>`;
  const ACCES = `<section class="tn tn-acces"><div class="tn-ph" style="background-image:url(photos/carte-contact.jpg)"></div><address data-tn-adresse>[À compléter : adresse]</address><a class="tn-bt" ${LIEN} data-tn-itineraire>Voir l'itinéraire</a><table data-tn-horaires="jours"><tbody><tr><th>Lundi</th><td>[À compléter]</td></tr></tbody></table><ul class="tn-villes" data-tn-zone="villes"><li>[À compléter : ville]</li></ul></section>`;

  it("téléphone, adresse, horaires, zone, itinéraire : ceux du client ; ce qui manque reste « À compléter »", () => {
    const site = { phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Lun–Ven 9 h–18 h ; samedi 9 h–12 h", area: "Lyon, Villeurbanne et Bron" };
    const open = sp(D.withTenueContact(OUVERTURE, site));
    expect(open).toContain('<a class="tn-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    expect(open).toContain("<span data-tn-adresse>12 rue des Lilas, 69003 Lyon</span>");
    expect(open).toContain('<span data-tn-horaires="ligne">Lun–Ven 9 h–18 h, samedi 9 h–12 h</span>');
    // Une plage d'heures ne se coupe jamais en fin de ligne.
    expect(D.hoursLine("Du lundi au vendredi 8 h – 18 h ; samedi 9 h – 12 h")).toBe("Du lundi au vendredi 8\u00a0h\u00a0–\u00a018\u00a0h, samedi 9\u00a0h\u00a0–\u00a012\u00a0h");
    expect(open).toContain('<span data-tn-zone="ligne">Lyon, Villeurbanne et Bron</span>');
    const access = sp(D.withTenueContact(ACCES, site));
    expect(access).toContain('<table data-tn-horaires="jours"><tbody><tr><th>Lun–Ven</th><td>9 h–18 h</td></tr><tr><th>Samedi</th><td>9 h–12 h</td></tr></tbody></table>');
    expect(access).toContain(`<a class="tn-bt" href="https://www.openstreetmap.org/directions?to=12%20rue%20des%20Lilas%2C%2069003%20Lyon" target="_blank" rel="noopener" data-tn-itineraire>Voir l'itinéraire</a>`);
    expect(access).toContain('<ul class="tn-villes" data-tn-zone="villes"><li>Lyon</li><li>Villeurbanne</li><li>Bron</li></ul>');
    // Rien de donné : la section garde ses lignes d'exemple, annoncées en jaune.
    expect(D.withTenueContact(OUVERTURE, {})).toContain('data-tn-tel><mark class="tn-manque">À compléter : téléphone</mark></a>');
    // Un texte du client ne devient jamais du balisage.
    const odd = D.withTenueContact(OUVERTURE, { phone: '06 <b>12</b>"' });
    expect(odd).toContain('href="tel:0612"');
    expect(odd).toContain("06 &lt;b&gt;12&lt;/b&gt;&quot;</a>");
  });

  it("la bibliothèque n'écrit jamais une coordonnée d'exemple : téléphone, adresse, horaires et villes sont à compléter", () => {
    for (const s of TENUE_SECTIONS) {
      // Un numéro de téléphone, un code postal suivi d'une ville, une heure d'ouverture : rien de tel dans un exemple.
      const text = s.html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
      expect(/(?:\+33|\b0)[1-9](?:[\s.]?\d{2}){4}\b/.exec(text)?.[0] ?? null, `${s.id} : téléphone d'exemple`).toBeNull();
      expect(/\b\d{5}\s+\p{Lu}\p{L}+/u.exec(text)?.[0] ?? null, `${s.id} : adresse d'exemple`).toBeNull();
      for (const m of s.html.matchAll(/<([a-z]+)\b[^>]*\sdata-tn-(?:tel|adresse|horaires|zone)(?:="[a-z]+")?[^>]*>([\s\S]*?)<\/\1>/g)) expect(m[2].replace(/<[^>]+>/g, " ").replace(/\[À compléter[^\]]*\]/g, " ").replace(/Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche/g, " ").trim(), `${s.id} : un emplacement de coordonnées ne contient que « À compléter »`).toBe("");
    }
  });

  it("le plan n'est jamais une image : un cadre qui ouvre la vraie carte, ou l'adresse à compléter", () => {
    const real = D.withTenueContact(ACCES, { address: "12 rue des Lilas, 69003 Lyon" });
    expect(real).not.toContain("photos/carte-");
    expect(real).toContain('<a class="tn-ph tn-plan" href="https://www.openstreetmap.org/search?query=12%20rue%20des%20Lilas%2C%2069003%20Lyon" target="_blank" rel="noopener" aria-label="Ouvrir la carte à cette adresse"><i aria-hidden="true"></i><b>12 rue des Lilas, 69003 Lyon</b><em>Voir sur la carte</em></a>');
    const none = D.withTenueContact(ACCES, {});
    expect(none).not.toContain("photos/carte-");
    expect(none).toContain('<div class="tn-ph tn-plan"><i aria-hidden="true"></i><b><mark class="tn-manque">À compléter : adresse</mark></b></div>');
    // Aucune section de la bibliothèque ne garde un plan dessiné sans que le Studio le remplace.
    for (const s of TENUE_SECTIONS) expect(D.withTenueContact(s.html, {}), s.id).not.toMatch(/photos\/(?:carte|map|plan)-/);
  });

  it("le formulaire de rendez-vous propose les vraies prestations", () => {
    const out = D.withTenuePrestationChoices(html("tn-rdv"), [{ name: "Coupe <courte>", duration: null, price: null }, { name: "Barbe", duration: "20 min", price: "18 €" }]);
    expect(out).toContain('<select name="prestation" data-tn-prestations-choix><option>Coupe &lt;courte&gt;</option><option>Barbe</option></select>');
    expect(D.withTenuePrestationChoices(html("tn-rdv"), [])).toBe(html("tn-rdv"));
  });

  it("page boutique : les vraies familles en filtres, rien de choisi d'avance, chaque carte avec ses familles et son prix", () => {
    const products = [
      { title: "Sencha", image: "/api/files/a1", price: "9 €", cents: 900, go: "product", families: ["Thés verts"] },
      { title: "Rooibos", image: null, price: "7,50 €", cents: 750, go: "product-rooibos", families: ["Rooibos"], soldOut: true },
    ];
    const families = [{ name: "Thés verts", to: "shop:Thés verts", image: "/api/files/a1", products: ["Sencha"] }, { name: "Rooibos", to: "shop:Rooibos", image: null, products: ["Rooibos"] }];
    const out = D.withTenueCatalogue(withTenueProducts(html("tn-catalogue"), products), { products, families });
    expect(out).toContain('<div class="tn-filtres"><fieldset><legend>Famille</legend><label><input type="checkbox" data-tn-fam="Thés verts"><span>Thés verts</span></label><label><input type="checkbox" data-tn-fam="Rooibos"><span>Rooibos</span></label></fieldset><fieldset><legend>Disponibilité</legend><label><input type="checkbox" data-tn-stock><span>En stock seulement</span></label></fieldset></div>');
    expect(out).toContain('<div class="tn-choisis"><label class="tn-effacer">'); // aucun filtre d'exemple
    expect(out).not.toMatch(/Le matin|Infusions|Verveine menthe/);
    expect(out).toContain('<a class="tn-carte-p" href="#" onclick="return false" data-go="product" data-tn-fams="Thés verts" data-tn-prix="900"><div class="tn-ph" style="background-image:url(/api/files/a1)"></div><b>Sencha</b><span>9 €</span></a>');
    expect(out).toContain('<a class="tn-carte-p tn-epuise" href="#" onclick="return false" data-go="product-rooibos" data-tn-fams="Rooibos" data-tn-prix="750"><div class="tn-ph"></div><b>Rooibos</b><span>7,50 €</span><em>Épuisé</em></a>');
    // Ni famille ni rupture : rien à filtrer, le bouton « Filtrer » s'en va.
    const plain = [{ title: "Sencha", image: null, price: "9 €", families: [] }];
    const bare = D.withTenueCatalogue(withTenueProducts(html("tn-catalogue"), plain), { products: plain, families: [] });
    expect(bare).not.toMatch(/tn-filtrer|tn-filtres/);
    expect(bare).toContain('class="tn-tri"');
  });

  it("familles : celles du catalogue (deux au moins), la photo d'un de leurs produits ; la ligne écrite pour une famille reste la sienne", () => {
    const families = [{ name: "Rooibos", to: "shop:Rooibos", image: "/api/files/r1", products: ["Rooibos vanille", "Rooibos nature"] }, { name: "Thés noirs", to: "shop:Thés noirs", image: null, products: ["Earl Grey"] }];
    const out = D.withTenueFamilies(html("tn-rayons"), families);
    expect(out).toContain('<a href="#" onclick="return false" data-go="shop:Rooibos"><div class="tn-ph tn-cadre" style="background-image:url(/api/files/r1)"></div><b>Rooibos</b><span>Ronds, sans théine, pour le soir.</span></a>');
    expect(out).toContain('<a href="#" onclick="return false" data-go="shop:Thés noirs"><div class="tn-ph tn-cadre"></div><b>Thés noirs</b><span>Earl Grey</span></a>');
    expect(out).not.toMatch(/Tisanes|photos\//);
    expect(D.withTenueFamilies(html("tn-rayons"), families.slice(0, 1))).toBe(html("tn-rayons")); // une seule famille : rien n'est inventé
  });

  it("comparatif : les vrais noms et les vrais prix ; une colonne en trop s'en va", () => {
    const out = D.withTenueComparison(html("tn-comparatif"), [{ title: "Sencha", image: null, price: "9 €", go: "product" }, { title: "Rooibos", image: null, price: null, go: "product-rooibos" }]);
    expect(out).toContain('<div class="tn-noms"><a href="#" onclick="return false" data-go="product">Sencha</a><a href="#" onclick="return false" data-go="product-rooibos">Rooibos</a></div>');
    expect(out).toContain('<div class="tn-critere"><small>Son moment</small><p><span>L\'après-midi</span><span>Le soir</span></p></div>');
    expect(out).toContain('<div class="tn-critere"><small>Son prix</small><p><span>9 €</span><span><mark class="tn-manque">À compléter : prix</mark></span></p></div>');
    expect(out).not.toContain("Verveine menthe");
  });

  it("réassurance : la livraison et les retours du client ; le paiement, qu'il n'a pas donné, reste à compléter", () => {
    const out = D.withTenueGuarantees(html("tn-garanties"), { shipping: "Colissimo, 48 h, 4,90 €", returns: "14 jours, sachet fermé" });
    expect(out).toMatch(/<li data-tn-cle="livraison"><svg[^]*?<\/svg><b>Livraison<\/b><span>Colissimo, 48 h, 4,90 €<\/span><\/li>/);
    expect(out).toMatch(/<b>Retours<\/b><span>14 jours, sachet fermé<\/span>/);
    expect(out).toMatch(/<b>Paiement<\/b><span><mark class="tn-manque">À compléter : moyens acceptés<\/mark><\/span>/);
  });

  it("avis : jamais un avis d'exemple ; un vrai avis écrit dans la section reste", () => {
    expect(D.withTenueReviews(html("tn-avis"))).toContain('<ul data-tn-avis></ul><div class="tn-premier">');
    const real = html("tn-avis").replace("[À compléter : avis d'un client]", "Un thé qui sent vraiment le jasmin.").replace("[À compléter : prénom et date]", "Lucie, mars");
    const out = D.withTenueReviews(real);
    expect(out).toContain("Un thé qui sent vraiment le jasmin.");
    expect((out.match(/<li>/g) ?? []).length).toBe(1);
  });

  it("conception : une section qui lit le catalogue n'est gardée que si le catalogue peut la remplir", () => {
    expect(D.dataGaps(["tn-ouverture", "tn-rayons", "tn-comparatif"], { products: 1, families: 1 })).toEqual([expect.stringMatching(/tn-rayons\) demande au moins deux familles[^]*il en a 1/), expect.stringMatching(/tn-comparatif\) demande au moins deux produits/)]);
    expect(D.dataGaps(["tn-rayons", "tn-comparatif"], { products: 4, families: 2 })).toEqual([]);
    expect(D.dataGaps(["tn-produits"], { products: 0, families: 0 })).toEqual([]);
  });

  it("journal : les articles écrits dans le Studio, puis la page de l'article", () => {
    const articles = [{ title: "Le thé glacé <maison>", excerpt: "Tout se joue avant le frigo.", tag: "Recette", image: "/api/files/c1", bodyHtml: "<p>De l'eau froide.</p><h2>Du temps</h2>" }, { title: "Une cuillère", excerpt: "Pas deux.", tag: null, image: null, bodyHtml: "<p>…</p>" }];
    const list = D.withTenueArticles(html("tn-journal"), articles);
    expect(list).toContain('<a class="tn-art" href="#" onclick="return false" data-go="article"><div class="tn-ph tn-cadre" style="background-image:url(/api/files/c1)"></div><small>Recette</small><b>Le thé glacé &lt;maison&gt;</b><span>Tout se joue avant le frigo.</span></a>');
    expect(list).not.toMatch(/Ce qu'on boit quand il pleut|photos\//);
    const page = D.withTenueArticles(html("tn-article"), articles);
    expect(page).toMatch(/data-go="journal">Le journal<\/a><small>Recette<\/small><h1>Le thé glacé &lt;maison&gt;<\/h1><p class="tn-chapo">Tout se joue avant le frigo\.<\/p><div class="tn-ph tn-cadre" style="background-image:url\(\/api\/files\/c1\)"><\/div><div class="tn-corps"><p>De l'eau froide\.<\/p><h2>Du temps<\/h2><\/div><\/section>$/);
    expect(D.withTenueArticles(html("tn-journal"), [])).toBe(html("tn-journal")); // sans article : l'exemple, annoncé comme tel
  });
});

describe("thème sur mesure : les vraies données dans l'aperçu du Studio", () => {
  it("un site de services montre le téléphone, les horaires, la zone et les prestations du profil ; le plan ouvre la vraie carte", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveServices, loadProject } = await import("@/lib/projects");
    const { run } = await import("@/lib/db");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const user = await account(), pid = await project(user);
    run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    const before = loadProject(pid);
    saveServices(pid, { ...before.services, services: [{ name: "Tableau électrique", price: "sur devis", duration: "une journée" }] as any, phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Lun–Ven 8 h–18 h", area: "Lyon, Villeurbanne et Bron" });
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, { op: "add", page: "home", section: "tn-ouverture-metier", construction: "appel" }, { op: "add", page: "home", section: "tn-zone" }, { op: "add", page: "home", section: "tn-acces" }, { op: "add", page: "home", section: "tn-rdv" },
      { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }]);
    const out = sp(renderCustomTheme(loadProject(pid), t, { embed: true }));
    expect(out).toContain('href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    // Un site de services sans panier : le bouton « Panier » de l'en-tête ne s'affiche pas.
    expect(out).toContain('"hdCart":"0"');
    expect(out).toContain('<span data-tn-horaires="ligne">Lun–Ven 8 h–18 h</span>');
    expect(out).toContain("<li>Villeurbanne</li>");
    expect(out).toContain("<option>Tableau électrique</option>");
    expect(out).toMatch(/href="https:\/\/www\.openstreetmap\.org\/directions\?to=12%20rue%20des%20Lilas[^"]*" target="_blank" rel="noopener" data-tn-itineraire>/);
    expect(out).not.toContain("photos/carte-");
  });

  it("une boutique montre ses familles, ses filtres et ses cartes ; un lien vers une famille arrive sur la page boutique", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { loadProject } = await import("@/lib/projects");
    const { createProduct } = await import("@/lib/products/catalog");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const user = await account(), pid = await project(user);
    createProduct(pid, { title: "Sencha", price: 900, categories: ["Thés verts"] } as any);
    createProduct(pid, { title: "Rooibos vanille", price: 750, categories: ["Rooibos"] } as any);
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, { op: "add", page: "home", section: "tn-rayons" }, { op: "add", page: "home", section: "tn-comparatif" },
      { op: "page", key: "shop", label: "La boutique" }, { op: "add", page: "shop", section: "tn-catalogue" }, { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }]);
    const out = renderCustomTheme(loadProject(pid), t, { embed: true });
    expect(out).toMatch(/data-go="shop:Thés verts"><div class="tn-ph tn-cadre"><\/div><b>Thés verts<\/b>/);
    expect(out).toContain('<input type="checkbox" data-tn-fam="Rooibos">');
    expect(out).toMatch(/data-tn-fams="Rooibos" data-tn-prix="750"><div class="tn-ph"><\/div><b>Rooibos vanille<\/b><span>7,50 €<\/span>/);
    expect(out).toMatch(/<div class="tn-critere"[^>]*><small>Son prix<\/small><p><span>9 €<\/span><span>7,50 €<\/span><\/p><\/div>/);
    // L'aperçu prévient la page boutique de la famille demandée (le script de la tenue coche le filtre).
    expect(out).toContain('new CustomEvent("tn-go",{detail:{page:k,arg:arg}})');
  });
});

describe("mise en boutique : toutes les sections à tenue partent, avec de vraies fonctions", async () => {
  const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { validateCustomSection } = await import("@/lib/theme/ops");
  const products = [{ handle: "sencha", title: "Sencha", categories: ["Thés verts"] }, { handle: "rooibos-vanille", title: "Rooibos vanille", categories: ["Rooibos"] }, { handle: "earl-grey", title: "Earl Grey", categories: ["Thés noirs"] }];
  const input = (over: Record<string, unknown> = {}) => ({
    name: "Brindi", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "products" as const,
    products, prestations: [{ name: "Coupe et coiffage", duration: "45 min", price: "38 €" }], company: { shipping: "Colissimo, 48 h", returns: "14 jours" },
    site: { phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Lun–Ven 9 h–18 h", area: "Lyon, Villeurbanne" },
    assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: true, base: null, ...over,
  });
  /** Une section du thème, ses photos d'exemple remplacées par des photos du client (les plans gardent leur repère). */
  const sec = (id: string, uid: string) => ({ uid, id, clientTexts: true, html: tenueSection(id)!.html.replace(/photos\/(?!(?:carte|map|plan)-)[\w.-]+/g, "/api/files/a1") });
  const theme = (id: string) => {
    const s = tenueSection(id)!;
    const shell = (slot: string, fallback: string) => sec(s.role === slot ? id : fallback, slot === "en-tête" ? "h" : "f");
    const key = id === "tn-catalogue" ? "shop" : id === "tn-journal" ? "journal" : id === "tn-article" ? "article" : id === "tn-resultats" ? "recherche" : id === "tn-panier" ? "cart" : id === "tn-introuvable" ? "404" : "home";
    const own = s.role === "en-tête" || s.role === "pied de page" || s.group === "bandeau" || s.group === "partout" || id === "tn-achat" ? [] : [sec(id, "s1")];
    const pages = [{ key: "home", label: "Accueil", sections: key === "home" ? own : [] }, { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy")] }, { key: "shop", label: "La boutique", sections: key === "shop" ? own : [] },
      ...(["home", "shop"].includes(key) ? [] : [{ key, label: s.title, sections: own }])];
    return { version: 1, family: "classique", style: "classique", header: shell("en-tête", "tn-entete"), footer: shell("pied de page", "tn-pied"), search: null, pages, rev: 0, at: 0, ...(s.group === "bandeau" || s.group === "partout" ? { extras: [sec(id, "x1")] } : {}) } as any;
  };

  for (const s of TENUE_SECTIONS) {
    it(`${s.id} : une section Shopify valide, sans rien d'exemple ni geste de l'aperçu`, () => {
      const out = customThemeSpec(theme(s.id), input());
      const blocking = out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);
      expect(blocking, blocking.join("\n")).toEqual([]);
      for (const [type, c] of Object.entries(out.spec.customSections)) {
        expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull();
        expect(c.liquid, type).not.toMatch(/À compléter|photos\/|onclick=|onsubmit=|data-go=|href="#"|\/api\/files\/|<script/);
      }
      const notes = out.problems.map((x) => x.text).join("\n");
      if (s.group === "partout") expect(notes).toMatch(/n'est pas envoyée : Shopify a sa propre fenêtre/);
      else if (s.id === "tn-avis") expect(notes).toMatch(/Les avis des clients : section non envoyée/);
      // Une section dont tout l'exemple était « à compléter » est retirée avec l'accord du client, et c'est dit ; sinon elle est là.
      else if (s.id !== "tn-achat") expect(Object.keys(out.spec.customSections).some((k) => out.spec.customSections[k].liquid.includes(`(${s.id})`)) || new RegExp(`${s.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} : section retirée, il ne restait que son titre`).test(notes), `la section est dans le thème, ou son retrait est dit : ${notes}`).toBe(true);
    });
  }

  const liquidOf = (id: string, over: Record<string, unknown> = {}) => { const out = customThemeSpec(theme(id), input(over)); return sp(Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))!.liquid); };

  it("page boutique : produits de la collection, filtres de la boutique, tri, pages suivantes, sans script", () => {
    const out = customThemeSpec(theme("tn-catalogue"), input());
    expect(Object.keys(out.spec.templates)).toContain("collection");
    const l = liquidOf("tn-catalogue");
    expect(l).toContain('<form class="tn-outils" method="get" action="{{ collection.url }}">');
    expect(l).toContain('<select name="sort_by">{%- for option in collection.sort_options -%}');
    expect(l).toContain('<fieldset><legend>Famille</legend><a href="{{ routes.all_products_collection_url }}">Tout voir</a><a href="{{ routes.collections_url }}/thes-verts">Thés verts</a>');
    expect(l).toContain("{%- for filter in collection.filters -%}{%- if filter.type == 'list' -%}");
    expect(l).toContain('<a href="{{ value.url_to_remove }}">{{ value.label }}</a>');
    expect(l).toMatch(/\{%- paginate collection\.products by 48 -%\}<div class="tn-cartes">\{%- for product in collection\.products -%\}<a class="tn-carte-p[^]*<em>Épuisé<\/em>[^]*\{\{ paginate \| default_pagination \}\}/);
    expect(l).toContain('<div class="tn-vide">'); // le mot écrit pour la marque quand rien ne correspond
    expect(out.spec.store.collections!.map((c) => c.handle)).toEqual(["thes-verts", "rooibos", "thes-noirs"]);
  });

  it("familles et comparatif : les collections de la boutique, les vrais prix lus en direct", () => {
    const fam = liquidOf("tn-rayons");
    expect(fam).toMatch(/<a href="\{\{ routes\.collections_url \}\}\/rooibos">\{%- assign famille = collections\['rooibos'\] -%\}<div class="tn-ph tn-cadre"\{% if famille\.featured_image %\}/);
    const cmp = liquidOf("tn-comparatif");
    expect(cmp).toContain('<a href="{{ routes.root_url }}products/sencha">Sencha</a>');
    expect(cmp).toContain("<span>{{ all_products['rooibos-vanille'].price | money }}</span>");
    // Une seule famille, un seul produit : ces sections ne peuvent pas partir.
    const few = customThemeSpec(theme("tn-rayons"), input({ products: products.slice(0, 1) }));
    expect(few.problems.filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).toMatch(/demande au moins deux familles/);
  });

  it("formulaires : de vrais formulaires de contact, chaque champ nommé en clair ; la lettre inscrit un client", () => {
    const rdv = liquidOf("tn-rdv");
    expect(rdv).toMatch(/\{%- form 'contact' -%\}/);
    expect(rdv).toContain('<select data-tn-prestations-choix name="contact[La prestation]"><option>Coupe et coiffage</option></select>');
    expect(rdv).toContain('<input type="date" required name="contact[Le jour souhaité]">');
    expect(rdv).toMatch(/<input type="radio" value="matin" checked name="contact\[Le matin ou l&#39;après-midi\]">|<input type="radio" value="matin" checked name="contact\[Le matin ou l'après-midi\]">/);
    expect(rdv).toMatch(/<input class="tn-champ-i" type="email" name="contact\[email\]"[^>]*required><button type="submit" class="tn-bt">/); // Shopify exige une adresse : elle est demandée
    const letter = liquidOf("tn-infolettre");
    expect(letter).toMatch(/\{%- form 'customer', class: 'tn-form' -%\}<input type="hidden" name="contact\[tags\]" value="newsletter">[^]*<input type="email" placeholder=" " autocomplete="email" name="contact\[email\]">/);
    expect(liquidOf("tn-pied-complet")).toMatch(/\{%- form 'customer', class: 'tn-form' -%\}/);
  });

  it("journal, article, recherche : les pages que la boutique remplit elle-même", () => {
    expect(Object.keys(customThemeSpec(theme("tn-journal"), input()).spec.templates)).toContain("blog");
    expect(liquidOf("tn-journal")).toMatch(/\{%- paginate blog\.articles by 24 -%\}<div class="tn-articles" data-tn-articles>\{%- for article in blog\.articles -%\}<a class="tn-art" href="\{\{ article\.url \}\}">/);
    const article = customThemeSpec(theme("tn-article"), input());
    expect(Object.keys(article.spec.templates)).toContain("article");
    expect(article.spec.store.pages.map((x) => x.handle)).not.toContain("article");
    expect(liquidOf("tn-article")).toMatch(/<a class="tn-retour" href="\{\{ blog\.url \}\}">Le journal<\/a>[^]*<h1>\{\{ article\.title \}\}<\/h1>[^]*<div class="tn-corps">\{\{ article\.content \}\}<\/div>/);
    const search = liquidOf("tn-resultats");
    expect(search).toMatch(/data-tn-resultats\{% if search\.performed and search\.results_count == 0 %\} data-tn-vide\{% endif %\}>/);
    expect(search).toContain('<form class="tn-form" action="{{ routes.search_url }}" method="get" role="search"><label class="tn-cherche"><input type="search" name="q"');
    expect(search).toContain("{%- for item in search.results -%}");
    expect(search).toContain("Rien trouvé."); // le mot écrit pour la marque
  });

  it("coordonnées, paiements : ce que le client a donné s'écrit dans la page ; les paiements sont ceux de la boutique", () => {
    const access = liquidOf("tn-acces");
    expect(access).toContain('<a class="tn-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    expect(access).toContain('href="https://www.openstreetmap.org/directions?to=12%20rue%20des%20Lilas%2C%2069003%20Lyon" target="_blank" rel="noopener" data-tn-itineraire>');
    expect(access).toContain("<tr><th>Lun–Ven</th><td>9 h–18 h</td></tr>");
    expect(liquidOf("tn-garanties")).toMatch(/<b>Livraison<\/b><span>Colissimo, 48 h<\/span>/);
    expect(liquidOf("tn-pied-complet")).toContain("{%- for type in shop.enabled_payment_types -%}{{ type | payment_type_svg_tag }}{%- endfor -%}");
    // Sans coordonnées, la page ne part pas telle quelle : ce qui manque est listé au client.
    const none = customThemeSpec(theme("tn-acces"), input({ site: {}, dropMissing: false }));
    expect(none.problems.filter((x) => x.level === "bloquant").map((x) => x.text).join("\n")).toMatch(/Horaires et accès[^\n]*à compléter/);
  });

  it("près du prix : indice de réparabilité et paiement en plusieurs fois, seulement s'ils sont confirmés ; panier : paiements rapides de la boutique", async () => {
    const { withTenueBuyBlock } = await import("@/lib/syna-agent/custom-theme/tenue");
    const { PRICE_NOTE } = await import("@/lib/syna-agent/custom-theme/render");
    const buy = withTenueBuyBlock(tenueSection("tn-achat")!.html, { images: [], price: "149 €", shipping: null, returns: null, notes: ["Indice de réparabilité : 8,2 sur 10", "Paiement en trois fois sans frais avec <Alma>"] });
    expect(buy).toContain('<div class="tn-prix">149 €</div><ul class="tn-pres-prix"><li>Indice de réparabilité : 8,2 sur 10</li><li>Paiement en trois fois sans frais avec &lt;Alma&gt;</li></ul>');
    expect(withTenueBuyBlock(tenueSection("tn-achat")!.html, { images: [], price: "149 €", shipping: null, returns: null })).not.toContain("tn-pres-prix");
    expect(["Indice de réparabilité", "Paiement en 3 fois", "Payable en plusieurs fois", "Indice de durabilité"].every((x) => PRICE_NOTE.test(x))).toBe(true);
    expect(["Poids", "Livraison en 48 h", "Matière"].some((x) => PRICE_NOTE.test(x))).toBe(false);
    expect(liquidOf("tn-achat", { priceNotes: ["Indice de réparabilité : 8,2 sur 10"] })).toMatch(/\{%- endunless -%\}<ul class="tn-pres-prix"><li>Indice de réparabilité : 8,2 sur 10<\/li><\/ul>/);
    expect(liquidOf("tn-achat")).not.toContain("tn-pres-prix");
    expect(liquidOf("tn-panier")).toContain('{%- if additional_checkout_buttons -%}<div class="tn-rapide">{{ content_for_additional_checkout_buttons }}</div>{%- endif -%}');
  });

  it("tenue « gras » : les titres prennent la plus forte graisse de la police de la marque ; une police à une seule graisse garde la sienne", async () => {
    const { titleWeight } = await import("@/lib/syna-agent/custom-theme/render");
    const { tenueCss } = await import("@/lib/syna-agent/custom-theme/tenue");
    expect(titleWeight("space_grotesk", "gras")).toBe(700);
    expect(titleWeight("archivo_black", "gras")).toBeNull();
    expect(titleWeight("instrument_serif", "gras")).toBeNull();
    expect(titleWeight("space_grotesk", "fins")).toBeNull();
    expect(tenueCss({}, null, "", 700)).toContain("--tn-poids:700");
    expect(tenueCss({}, null, "", null)).not.toContain("--tn-poids");
    // En boutique : la même graisse dans la feuille, et la police des titres du thème la demande.
    const x = customThemeSpec(theme("tn-ouverture"), input({ fonts: { heading: "space_grotesk", body: "work_sans" }, titleWeight: 700 }));
    expect(x.spec.settings.type_heading_font).toBe("space_grotesk_n7");
    expect(Object.values(x.spec.customSections).map((c) => c.liquid).join("\n")).toContain("--tn-poids:700");
    // Un site de services sans page panier n'envoie pas de bouton « Panier ».
    const sv = customThemeSpec(theme("tn-urgence"), input({ business: "services" }));
    expect(Object.values(sv.spec.customSections).find((c) => c.liquid.includes("(tn-entete)"))!.liquid).not.toContain('class="tn-pan"');
    expect(Object.keys(sv.spec.templates)).toContain("product"); // la fiche de base que Shopify exige
  });

  it("la feuille part entière : les règles sous condition (« @supports », dans un « @media » ou non) gardent leur condition", async () => {
    const { parseCss, cssText } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const out = cssText(parseCss("@supports (color:oklch(from red l c h)){.a{color:red}}\n.b{top:0}\n@media (min-width:760px){.c{left:0}@supports (x:y){.d{color:blue}}}"));
    expect(out).toContain("@supports (color:oklch(from red l c h)){.a{color:red}}");
    expect(out).toContain("@media (min-width:760px){.c{left:0}}");
    expect(out).toContain("@media (min-width:760px){@supports (x:y){.d{color:blue}}}");
  });

  it("une information manquante retire son détail, pas la ligne entière ; une phrase écrite en titre reste", () => {
    // « La vitrine du jour » : le pain et sa description restent, seules les heures de fournée (non données) partent.
    const vitrine = customThemeSpec(theme("tn-vitrine"), input());
    const l = Object.values(vitrine.spec.customSections).find((c) => c.liquid.includes("(tn-vitrine)"))?.liquid ?? "";
    expect(l).toMatch(/<li><b>La baguette de tradition<\/b><span>[^<]+<\/span><\/li>/);
    expect(l).not.toMatch(/Fournées/);
    // « Une phrase en très grand » : la phrase est le contenu ; seule la signature manquante part.
    expect(liquidOf("tn-citation")).toMatch(/<h2>«&nbsp;Un thé ne se boit pas vite/);
  });
});
