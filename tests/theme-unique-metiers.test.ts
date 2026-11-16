/**
 * Thème unique du Studio, module des métiers (lot 4, référence partie 15) : les pièces d'immobilier (biens, recherche,
 * fiche d'un bien en cinq pièces), de restaurant (carte, réservation de table), le rendez-vous en trois temps,
 * l'inscription à un atelier, et les façons de bâtir ajoutées aux pièces de services. Gratuit, sans IA, aucun appel réel.
 *
 * 1) Toujours : les pièces existent avec leurs façons, chaque clé est dessinée dans la feuille du module, la feuille
 *    respecte ses règles (aucune couleur en dur hors des étiquettes énergie), aucun exemple chiffré, les vraies données
 *    d'un client d'essai inventé sont posées (trois biens avec leur diagnostic, une carte de trois rubriques, quatre
 *    prestations), un bien sans diagnostic dit « non communiquée », la mise en boutique ne refuse rien.
 * 2) À la demande, METIERS_OUT=<dossier> : chaque pièce et chaque façon nouvelle est rendue avec ces données, dans
 *    plusieurs allures (METIERS_TENUES=calme,brute,vive), sur téléphone et sur ordinateur. Rien ne dépasse de l'écran.
 *    METIERS_ONLY=tn-a,tn-b limite le rendu.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { METIERS_FACONS, METIERS_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-metiers";
import { TENUE_SECTIONS, tenueSection } from "@/lib/syna-agent/custom-theme/tenue";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
const DIR = path.join(process.cwd(), "public", "sections");
const sheet = fs.readFileSync(path.join(DIR, "tenue-metiers.css"), "utf8");
const allSheets = ["tenue.css", "tenue-services.css", "tenue-metiers.css"].map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n");
const selectors = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "").replace(/@supports[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
const html = (id: string) => tenueSection(id)!.html;
const sp = (x: string) => x.replace(/[\u00a0\u202f]/g, " ");
const rootOf = (id: string) => /class="tn (tn-[a-z0-9-]+)/.exec(html(id))![1];

/** Les pièces nouvelles du module et leurs façons, dans l'ordre. */
const NOUVELLES: Record<string, string[]> = {
  "tn-biens": ["grille", "liste", "vedette"],
  "tn-recherche-biens": ["barre", "volet"],
  "tn-bien-galerie": ["mosaique", "defile", "affiche"],
  "tn-bien-caracteristiques": ["lignes", "chiffres"],
  "tn-bien-energie": ["echelles", "reglettes"],
  "tn-bien-quartier": ["photo", "reperes"],
  "tn-bien-visite": ["fiche", "encadre"],
  "tn-carte": ["colonnes", "conduite", "cartes"],
  "tn-table": ["photo", "encadre", "horaires"],
  "tn-rdv-complet": ["etapes", "colonnes"],
  "tn-inscription": ["billet", "photo"],
};
/** Les façons ajoutées aux pièces de services : la première clé reste le rendu d'origine. */
const AJOUTEES: Record<string, string[]> = {
  "tn-aides": ["fiches", "tableau", "reste"],
  "tn-urgence": ["bandeau", "ligne", "carton"],
  "tn-retrait": ["liste", "vignettes"],
  "tn-vitrine": ["ardoise", "etiquettes", "lignes"],
  "tn-origines": ["tableau", "fiches", "mention"],
  "tn-rdv": ["colonne", "photo", "encadre"],
  "tn-devis": ["courte", "etapes", "bande"],
  "tn-zone": ["vue", "villes", "etiquettes"],
  "tn-deroule": ["chiffres", "frise", "cartes"],
  "tn-avant-apres": ["cote-a-cote", "incruste", "decale"],
  "tn-agenda": ["liste", "prochain", "billets"],
};
/** Les clés que ce module dessine pour une pièce de services (les autres étaient déjà dans tenue-services.css). */
const DESSINEES_ICI: Record<string, string[]> = {
  "tn-aides": ["tableau", "reste"], "tn-urgence": ["ligne", "carton"], "tn-retrait": ["vignettes"], "tn-vitrine": ["etiquettes", "lignes"], "tn-origines": ["fiches", "mention"],
  "tn-rdv": ["encadre"], "tn-devis": ["bande"], "tn-zone": ["etiquettes"], "tn-deroule": ["cartes"], "tn-avant-apres": ["decale"], "tn-agenda": ["billets"],
};

// ---------------------------------------------------------------- le client d'essai, inventé pour l'essai

const bien = (over: Partial<D.TenueBien>): D.TenueBien => ({
  ref: "V-0001", title: "Maison de famille et son jardin", type: "maison", transaction: "vente", status: "published", city: "Sète", sector: "Mont Saint-Clair",
  price: 485000, rent: null, charges: null, deposit: null, fees: "Honoraires à la charge du vendeur", surface: 142, land: 620, rooms: 6, bedrooms: 4, floor: "", furnished: null,
  exteriors: ["jardin", "terrasse"], pool: false, features: ["Vue sur l'étang", "Garage", "Cheminée"], availability: "Dès la signature", dpe: "C", ges: "B", propertyTax: "1 480 € par an",
  summary: "Une maison de famille au calme.", description: "Une maison de famille au calme, tournée vers son jardin.\nQuatre chambres, un séjour traversant, une terrasse plein sud.", photos: ["/api/files/b1", "/api/files/b2", "/api/files/b3", "/api/files/b4", "/api/files/b5"], featured: true,
  neighborhood: { text: "Un quartier de maisons et de jardins, à flanc de colline.", photos: ["/api/files/q1"], places: [{ label: "École", detail: "6 min à pied" }, { label: "Halles", detail: "10 min à vélo" }, { label: "Gare", detail: "12 min en bus" }] },
  ...over,
});
const BIENS: D.TenueBien[] = [
  bien({}),
  bien({ ref: "V-0002", title: "Appartement traversant sous les toits", type: "appartement", city: "Montpellier", sector: "Les Arceaux", price: 268000, surface: 74.5, land: null, rooms: 3, bedrooms: 2, floor: "4e et dernier étage", exteriors: ["balcon"], features: [], dpe: "D", ges: "D", featured: false, photos: ["/api/files/b6"], neighborhood: { text: "", photos: [], places: [] } }),
  bien({ ref: "L-0001", title: "Maison de ville et sa cour", transaction: "location", city: "Sète", sector: "", price: null, rent: 1250, charges: 60, deposit: 1250, surface: 96, land: null, rooms: 4, bedrooms: 3, furnished: false, exteriors: ["cour"], dpe: "F", ges: "E", featured: false, photos: ["/api/files/b7"], neighborhood: { text: "", photos: [], places: [] } }),
];
const CARTE: D.TenueRubrique[] = [
  { title: "Les entrées", items: [{ name: "Velouté de potimarron", description: "Noisettes torréfiées, huile de courge.", price: "9 €", allergens: "fruits à coque, lait", vegetarian: true }, { name: "Maquereau mariné", description: "Pickles d'oignon, pain grillé.", price: "11 €", allergens: "poisson, gluten", vegetarian: false }] },
  { title: "Les plats", items: [{ name: "Lieu jaune de ligne", description: "Poireaux fondants, beurre blanc.", price: "24 €", allergens: "poisson, lait", vegetarian: false }, { name: "Épaule d'agneau confite", description: "Pois chiches, citron confit.", price: "26 €", allergens: "", vegetarian: false }, { name: "Risotto d'épeautre", description: "Champignons, vieux comté.", price: null, allergens: "gluten, lait", vegetarian: true }] },
  { title: "Les desserts", items: [{ name: "Tarte fine aux pommes", description: "Crème crue.", price: "8 €", allergens: "gluten, lait, œufs", vegetarian: true }, { name: "Mousse au chocolat", description: "", price: "8 €", allergens: "lait, œufs", vegetarian: true }] },
];
const PRESTATIONS = [{ name: "Coupe et coiffage", duration: "45 min", price: "38 €" }, { name: "Coupe, soin et coiffage", duration: "1 h", price: "52 €" }, { name: "Couleur complète", duration: "1 h 30", price: "72 €" }, { name: "Balayage", duration: null, price: null }];
const EQUIPE: D.TenueMembre[] = [{ name: "Maëlle", role: "Coupe et couleur" }, { name: "Théo", role: "Coupe homme et barbe" }];

// ---------------------------------------------------------------- 1) règles, données, mise en boutique

describe("thème unique, métiers : les pièces et leurs façons de bâtir", () => {
  it("les onze pièces nouvelles existent, chacune avec ses façons, rangées parmi les métiers", async () => {
    const { sectionGroup } = await import("@/lib/syna-agent/custom-theme/section-groups");
    expect(METIERS_SECTIONS.map((s) => s.id)).toEqual(Object.keys(NOUVELLES));
    for (const [id, keys] of Object.entries(NOUVELLES)) {
      const s = tenueSection(id)!;
      expect(s, id).toBeTruthy();
      expect(s.constructions.map((c) => c.key), id).toEqual(keys);
      expect(keys.length, `${id} : deux à quatre façons`).toBeGreaterThanOrEqual(2);
      expect(sectionGroup(s), id).toBe("metiers");
      expect(s.pour, id).toBe("services");
      // Le label dit ce qu'on voit, en une phrase.
      for (const c of s.constructions) expect(c.label.length, `${id} · ${c.key}`).toBeGreaterThan(40);
    }
    // Biens et équipe ne s'inventent pas : ces pièces demandent les vraies données du client.
    for (const id of ["tn-biens", "tn-recherche-biens", "tn-bien-galerie", "tn-bien-caracteristiques", "tn-bien-energie", "tn-bien-quartier", "tn-bien-visite"]) expect(tenueSection(id)!.authentic, id).toBe("tes biens");
    expect(tenueSection("tn-rdv-complet")!.authentic).toBe("ton équipe");
    // Chaque pièce qui lit des données le dit au concepteur.
    for (const id of Object.keys(NOUVELLES).filter((x) => x !== "tn-inscription")) expect(tenueSection(id)!.data, `${id} : ce qu'elle lit`).toBeTruthy();
  });

  it("les pièces de services gagnent des façons : la première reste le rendu d'origine, les nouvelles sont dessinées ici", () => {
    expect(Object.keys(METIERS_FACONS).sort()).toEqual(Object.keys(AJOUTEES).sort());
    const rules = selectors(allSheets), mine = selectors(sheet);
    for (const [id, keys] of Object.entries(AJOUTEES)) {
      const s = tenueSection(id)!, root = rootOf(id);
      expect(s.constructions.map((c) => c.key), id).toEqual(keys);
      // Aucune règle ne cible la première clé : le rendu d'origine ne bouge pas.
      expect(rules.some((sel) => sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${keys[0]}"]`)), `${id} : aucune règle pour « ${keys[0]} »`).toBe(false);
      for (const key of DESSINEES_ICI[id]) expect(mine.some((sel) => sel.includes(`.${root}`) && sel.includes(`"${key}"`)), `${id} : « ${key} » dessinée dans tenue-metiers.css`).toBe(true);
    }
    // Les cinq pièces qui n'avaient qu'une façon en ont au moins deux ; les tarifs ne sont pas touchés.
    for (const id of ["tn-aides", "tn-urgence", "tn-retrait", "tn-vitrine", "tn-origines"]) expect(tenueSection(id)!.constructions.length, id).toBeGreaterThanOrEqual(2);
    expect(tenueSection("tn-tarifs")!.constructions.map((c) => c.key)).toEqual(["tableau", "cartes"]);
  });

  it("chaque clé d'une pièce nouvelle a ses règles dans la feuille du module ; la première n'en a pas", () => {
    const mine = selectors(sheet);
    for (const [id, keys] of Object.entries(NOUVELLES)) {
      const root = rootOf(id);
      expect(mine.some((sel) => sel.includes(`.${root}`)), `${id} : la pièce est dessinée`).toBe(true);
      for (const key of keys.slice(1)) expect(mine.some((sel) => sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${key}"]`)), `${id} : règle [data-tn-c="${key}"]`).toBe(true);
      // (la galerie écrit « :not([data-tn-c="affiche"]) » pour ses deux autres façons : ce n'est pas une règle de la première)
      expect(mine.some((sel) => sel.includes(`.${root}[data-tn-c="${keys[0]}"]`)), `${id} : aucune règle pour « ${keys[0]} »`).toBe(false);
    }
  });

  it("la feuille du module tient ses règles : sélecteurs en .ctw, aucun « !important », aucune couleur en dur hors des étiquettes énergie", () => {
    for (const sel of selectors(sheet)) for (const one of sel.split(/,(?![^(]*\))/)) expect(/^\.ctw[\s:[.]/.test(one.trim()) && /\.tn-[a-z]/.test(one), `sélecteur « ${one.trim().slice(0, 90)} »`).toBe(true);
    expect(sheet).not.toMatch(/!important/);
    // Les seules couleurs écrites : les sept classes de l'étiquette énergie et les deux extrêmes de l'étiquette climat,
    // enfermées dans des variables locales de la pièce « étiquettes énergie ».
    const body = sheet.replace(/\/\*[\s\S]*?\*\//g, "");
    const hex = [...body.matchAll(/(--[a-z-]+)?:?\s*(#[0-9a-fA-F]{3,8})\b/g)];
    expect(hex.length).toBe(9);
    for (const m of [...body.matchAll(/([\w-]+):(#[0-9a-fA-F]{3,8})/g)]) expect(m[1], `couleur ${m[2]}`).toMatch(/^--tn-(?:e-[a-g]|g-[ag])$/);
    expect(body).not.toMatch(/\brgba?\(|\bhsla?\(/);
    expect(/\.ctw \.tn-bien-energie\{--tn-e-a:/.test(body), "les couleurs normées sont des variables de la pièce").toBe(true);
    // Tout grand titre suit l'échelle de la tenue.
    for (const m of body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (/\sh[12](?:[,\s:{]|$)/.test(` ${m[1]} `) && /font-size:/.test(m[2])) expect(m[2], `titre « ${m[1].trim().slice(0, 70)} »`).toMatch(/font-size:calc\([\d.]+px\*var\(--tn-k\)\)/);
  });

  it("aucun exemple chiffré : ni prix, ni téléphone, ni adresse, ni heure, ni surface, ni nom de personne", () => {
    for (const s of METIERS_SECTIONS) {
      const text = s.html.replace(/\[À compléter[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ");
      expect(/\d/.exec(text)?.[0] ?? null, `${s.id} : un chiffre dans l'exemple`).toBeNull();
      expect(text, s.id).not.toMatch(/€|m²|\bh\b/);
      // Un vrai formulaire : chaque champ dans son étiquette, ou dans un groupe nommé.
      for (const m of s.html.matchAll(/<form\b[\s\S]*?<\/form>/g)) {
        const labelled = m[0].replace(/<label\b[\s\S]*?<\/label>/g, "");
        expect(/<(?:input|select|textarea)\b/.test(labelled), `${s.id} : un champ sans étiquette`).toBe(false);
        expect(m[0]).toContain('onsubmit="return false"');
        for (const g of m[0].matchAll(/<div class="tn-moment[^>]*>/g)) expect(g[0], `${s.id} : groupe de choix nommé`).toMatch(/role="radiogroup" aria-label="[^"]+"/);
      }
      // Photos d'exemple : celles de la bibliothèque (immobilier, restaurant, services, atelier), jamais deux fois la même.
      const photos = [...s.html.matchAll(/photos\/([\w.-]+)/g)].map((m) => m[1]);
      expect(new Set(photos).size, `${s.id} : une photo en double`).toBe(photos.length);
      for (const f of photos) expect(f, s.id).toMatch(/^(?:im|rs|sv|ap|be|bi)-[\w-]+\.jpg$/);
    }
  });
});

describe("thème unique, métiers : les vraies données du client d'essai", () => {
  it("les biens : trois cartes avec leur photo, leur ville, leur surface, leur prix ou leur loyer, leur statut", () => {
    const out = sp(D.withTenueBiens(html("tn-biens"), BIENS));
    expect((out.match(/<a class="tn-bien/g) ?? []).length).toBe(3);
    expect(out).toContain('<div class="tn-ph tn-cadre" style="background-image:url(/api/files/b1)"><i>À vendre</i></div><small>Maison · Sète, Mont Saint-Clair</small><b>Maison de famille et son jardin</b><span>142 m² · 6 pièces · 4 chambres</span><em>485 000 €</em>');
    expect(out).toContain("<small>Appartement · Montpellier, Les Arceaux</small><b>Appartement traversant sous les toits</b><span>74,5 m² · 3 pièces · 2 chambres</span><em>268 000 €</em>");
    expect(out).toContain("<i>À louer</i></div><small>Maison · Sète</small><b>Maison de ville et sa cour</b><span>96 m² · 4 pièces · 3 chambres</span><em>1 250 € par mois, hors charges</em>");
    expect(out).not.toMatch(/À compléter|photos\//);
    // Un bien vendu garde sa mention, perd son prix et passe après les autres.
    const vendu = sp(D.withTenueBiens(html("tn-biens"), [{ ...BIENS[0], status: "sold" }, BIENS[1]]));
    expect(vendu.indexOf("Appartement traversant")).toBeLessThan(vendu.indexOf("Maison de famille"));
    expect(vendu).toMatch(/<a class="tn-bien tn-parti"[^>]*><div[^>]*><i>Vendu<\/i><\/div><small>[^<]*<\/small><b>Maison de famille et son jardin<\/b><span>[^<]*<\/span><\/a>/);
    // Sans bien : rien n'est inventé, l'exemple reste, annoncé « À compléter ».
    expect(D.withTenueBiens(html("tn-biens"), [])).toBe(html("tn-biens"));
  });

  it("la recherche : chaque carte porte de quoi être filtrée ; les types et les villes proposés sont ceux des biens", () => {
    const out = sp(D.withTenueBiens(html("tn-recherche-biens"), BIENS));
    expect(out).toContain('data-go="bien" data-tn-tr="vente" data-tn-type="maison" data-tn-ville="Sète" data-tn-prix="485000">');
    expect(out).toContain('data-tn-tr="location" data-tn-type="maison" data-tn-ville="Sète" data-tn-prix="1250">');
    expect(out).toContain('<select name="type" data-tn-biens-types><option value="">Tous les types</option><option value="maison">Maison</option><option value="appartement">Appartement</option></select>');
    expect(out).toContain('<select name="ville" data-tn-biens-villes><option value="">Toutes les villes</option><option value="Montpellier">Montpellier</option><option value="Sète">Sète</option></select>');
    expect(out).toContain('<p class="tn-trouves" aria-live="polite">3 biens en ce moment</p>');
    // Le filtre immédiat est le seul script du module ; sans lui, la pièce reste lisible (tous les biens, message caché).
    expect(out).toContain('<p class="tn-aucun" hidden>');
    const js = fs.readFileSync(path.join(DIR, "tenue-metiers.js"), "utf8");
    expect(js).toMatch(/window\.tnBiens/);
    expect(js).not.toMatch(/https?:\/\/|fetch\(|XMLHttpRequest|eval\(|document\.cookie/);
  });

  it("la fiche d'un bien : galerie, prix, chiffres clés, caractéristiques, quartier, visite, tout vient du bien mis en avant", () => {
    const g = sp(D.withTenueBienFiche(html("tn-bien-galerie"), BIENS));
    expect(g).toContain('<small class="tn-sur">Maison · À vendre · Sète, Mont Saint-Clair</small><h1>Maison de famille et son jardin</h1><em class="tn-prix-bien">485 000 €</em><span class="tn-ref">Référence V-0001</span>');
    expect((g.match(/<div class="tn-ph" style="background-image:url\(\/api\/files\/b\d\)"><\/div>/g) ?? []).length).toBe(5);
    expect(g).toContain('<ul class="tn-cles"><li><b>142 m²</b><small>Surface</small></li><li><b>6</b><small>Pièces</small></li><li><b>4</b><small>Chambres</small></li></ul>');
    expect(g).not.toMatch(/À compléter|photos\//);

    const c = sp(D.withTenueBienFiche(html("tn-bien-caracteristiques"), BIENS));
    expect(c).toContain('<p class="tn-descr">Une maison de famille au calme, tournée vers son jardin.<br>Quatre chambres, un séjour traversant, une terrasse plein sud.</p>');
    expect(c).toContain("<div><dt>Surface habitable</dt><dd>142 m²</dd></div><div><dt>Terrain</dt><dd>620 m²</dd></div><div><dt>Pièces</dt><dd>6</dd></div><div><dt>Chambres</dt><dd>4</dd></div><div><dt>Extérieurs</dt><dd>Jardin, terrasse</dd></div>");
    expect(c).toContain("<div><dt>Taxe foncière</dt><dd>1 480 € par an</dd></div><div><dt>Référence</dt><dd>V-0001</dd></div>");
    expect(c).toContain('<ul class="tn-atouts-b"><li>Vue sur l&#039;étang</li>'.replace("&#039;", "'"));
    // Une valeur que le client n'a pas donnée n'a pas de ligne (ici : l'étage d'une maison, le loyer d'une vente).
    expect(c).not.toMatch(/Étage|Meublé|Charges|Dépôt|À compléter/);
    // Une location dit son loyer, ses charges et son dépôt ; un bien sans atout n'a pas de liste d'atouts.
    const loc = sp(D.withTenueBienFiche(html("tn-bien-caracteristiques"), [BIENS[2]]));
    expect(loc).toContain("<div><dt>Meublé</dt><dd>Non</dd></div><div><dt>Extérieurs</dt><dd>Cour</dd></div>");
    expect(loc).toContain("<div><dt>Charges</dt><dd>60 € par mois</dd></div><div><dt>Dépôt de garantie</dt><dd>1 250 €</dd></div>");
    expect(sp(D.withTenueBienFiche(html("tn-bien-caracteristiques"), [BIENS[1]]))).not.toContain("tn-atouts-b");

    const q = sp(D.withTenueBienFiche(html("tn-bien-quartier"), BIENS));
    expect(q).toContain('<p class="tn-texte-q">Un quartier de maisons et de jardins, à flanc de colline.</p><div class="tn-ph tn-cadre" style="background-image:url(/api/files/q1)"></div><ul class="tn-reperes-q"><li><b>École</b><span>6 min à pied</span></li>');
    // Rien de saisi pour le quartier : la pièce garde son exemple, annoncé comme tel.
    expect(D.withTenueBienFiche(html("tn-bien-quartier"), [BIENS[1]])).toBe(html("tn-bien-quartier"));

    const v = sp(D.withTenueBienFiche(html("tn-bien-visite"), BIENS));
    expect(v).toContain('<div class="tn-rappel"><div class="tn-ph tn-cadre" style="background-image:url(/api/files/b1)"></div><small>Votre visite</small><b class="tn-nom-b">Maison de famille et son jardin</b><span class="tn-lieu-b">Maison · Sète, Mont Saint-Clair</span><em class="tn-prix-bien">485 000 €</em></div>');
    expect(v).toContain("<option selected>Maison de famille et son jardin (V-0001)</option><option>Appartement traversant sous les toits (V-0002)</option><option>Maison de ville et sa cour (L-0001)</option></select>");
    // Sans bien, aucune pièce de la fiche ne bouge.
    for (const id of ["tn-bien-galerie", "tn-bien-caracteristiques", "tn-bien-energie", "tn-bien-quartier", "tn-bien-visite"]) expect(D.withTenueBienFiche(html(id), []), id).toBe(html(id));
  });

  it("étiquettes énergie : la classe du diagnostic mise en avant, de A à G ; sans diagnostic, « non communiquée », jamais une classe supposée", () => {
    const e = D.withTenueBienFiche(html("tn-bien-energie"), BIENS);
    const dpe = /<figure class="tn-etiquette tn-dpe"[^>]*>[\s\S]*?<\/figure>/.exec(e)![0], ges = /<figure class="tn-etiquette tn-ges"[^>]*>[\s\S]*?<\/figure>/.exec(e)![0];
    expect(dpe).toContain('<figure class="tn-etiquette tn-dpe" data-tn-classe="C">');
    expect([...dpe.matchAll(/<li data-l="([A-G])"/g)].map((m) => m[1]).join("")).toBe("ABCDEFG");
    expect([...dpe.matchAll(/<li data-l="([A-G])" class="tn-oui">/g)].map((m) => m[1])).toEqual(["C"]);
    expect(dpe).toContain('<p class="tn-classe">Classe : <strong>C</strong></p>');
    expect([...ges.matchAll(/<li data-l="([A-G])" class="tn-oui">/g)].map((m) => m[1])).toEqual(["B"]);
    expect(e).not.toContain("tn-alerte");
    // Classe F ou G : la mention due dans une annonce s'ajoute.
    const f = D.withTenueBienFiche(html("tn-bien-energie"), [BIENS[2]]);
    expect(f).toContain('<p class="tn-alerte">Logement à consommation énergétique excessive : classe F</p>');
    expect(f).toContain('<figure class="tn-etiquette tn-ges" data-tn-classe="E">');
    // Un bien sans diagnostic : aucune lettre mise en avant, « non communiquée » sur les deux étiquettes.
    const sans = D.withTenueBienFiche(html("tn-bien-energie"), [{ ...BIENS[1], dpe: null, ges: null }]);
    expect((sans.match(/non communiqué/g) ?? []).length).toBe(2);
    expect(sans).not.toMatch(/tn-oui|data-tn-classe=|tn-alerte/);
    // Une seule des deux classes donnée : l'autre reste « non communiquée ».
    const moitie = D.withTenueBienFiche(html("tn-bien-energie"), [{ ...BIENS[1], dpe: "B", ges: null }]);
    expect((moitie.match(/non communiqué/g) ?? []).length).toBe(1);
    expect([...moitie.matchAll(/class="tn-oui"/g)].length).toBe(1);
    // Les sept classes ont chacune leur couleur normée dans la feuille ; la lettre du bien y est agrandie.
    for (const l of "abcdefg") expect(sheet).toContain(`--tn-e-${l}:#`);
    expect(sheet).toMatch(/\.tn-bien-energie ol li\.tn-oui/);
  });

  it("la carte : trois rubriques, les plats, les prix, les allergènes tels que saisis ; un prix absent reste à compléter", () => {
    const out = sp(D.withTenueCarte(html("tn-carte"), CARTE));
    expect([...out.matchAll(/<article class="tn-rubrique"><h3>([^<]*)<\/h3>/g)].map((m) => m[1])).toEqual(["Les entrées", "Les plats", "Les desserts"]);
    expect((out.match(/<li><b>/g) ?? []).length).toBe(7);
    expect(out).toContain("<li><b>Velouté de potimarron<i>Végétarien</i></b><span>Noisettes torréfiées, huile de courge.</span><em>9 €</em><small>Allergènes : fruits à coque, lait</small></li>");
    // Allergènes non saisis : aucune ligne (jamais « sans allergène ») ; prix non saisi : « À compléter ».
    expect(out).toContain("<li><b>Épaule d'agneau confite</b><span>Pois chiches, citron confit.</span><em>26 €</em></li>");
    expect(out).toContain('<li><b>Risotto d\'épeautre<i>Végétarien</i></b><span>Champignons, vieux comté.</span><em><mark class="tn-manque">À compléter : prix</mark></em><small>Allergènes : gluten, lait</small></li>');
    expect(out).toContain("<li><b>Mousse au chocolat<i>Végétarien</i></b><em>8 €</em><small>Allergènes : lait, œufs</small></li>");
    expect(out).not.toContain("Le velouté du moment");
    expect(D.withTenueCarte(html("tn-carte"), [])).toBe(html("tn-carte"));
    expect(D.withTenueCarte(html("tn-carte"), [{ title: "Vide", items: [] }])).toBe(html("tn-carte"));
  });

  it("le rendez-vous en trois temps : les quatre prestations, les vraies personnes de l'équipe, le créneau", () => {
    const out = sp(D.withTenueRdvSteps(html("tn-rdv-complet"), PRESTATIONS, EQUIPE));
    expect((/data-tn-prestations-options>([\s\S]*?)<\/div>/.exec(out)![1].match(/<label>/g) ?? []).length).toBe(4);
    expect(out).toContain('<label><input type="radio" name="prestation" value="Coupe et coiffage" checked><span><b>Coupe et coiffage</b><small>Durée : 45 min</small><em>38 €</em></span></label>');
    expect(out).toContain('<label><input type="radio" name="prestation" value="Balayage"><span><b>Balayage</b><small>Durée : <mark class="tn-manque">À compléter</mark></small><em><mark class="tn-manque">À compléter : prix</mark></em></span></label>');
    expect(out).toContain('data-tn-equipe-options><label><input type="radio" name="avec" value="Sans préférence" checked><span><b>Sans préférence</b><small>La première personne disponible</small></span></label><label><input type="radio" name="avec" value="Maëlle"><span><b>Maëlle</b><small>Coupe et couleur</small></span></label><label><input type="radio" name="avec" value="Théo">');
    // Sans équipe donnée : aucun prénom n'est inventé.
    const sans = D.withTenueRdvSteps(html("tn-rdv-complet"), PRESTATIONS, []);
    expect((sans.match(/À compléter : prénom/g) ?? []).length).toBe(2);
    expect(html("tn-rdv-complet")).toMatch(/<legend>La prestation<\/legend>[\s\S]*<legend>Avec qui<\/legend>[\s\S]*<legend>Le créneau<\/legend>/);
  });

  it("en une passe : la réservation de table lit les horaires, l'adresse et le téléphone du projet", () => {
    const site: D.TenueSite = { phone: "04 67 00 00 00", address: "3 quai de la Marine, 34200 Sète", hours: "Du mardi au samedi 12 h – 14 h ; du mardi au samedi 19 h 30 – 22 h", biens: BIENS, carte: CARTE, prestations: PRESTATIONS, equipe: EQUIPE };
    const t = sp(D.withTenueSite(html("tn-table"), site));
    expect(t).toContain('<table data-tn-horaires="jours"><tbody><tr><th>Du mardi au samedi</th><td>12 h – 14 h</td></tr>');
    expect(t).toContain("<address data-tn-adresse>3 quai de la Marine, 34200 Sète</address>");
    expect(t).toContain('href="tel:0467000000" data-tn-tel>04 67 00 00 00</a>');
    expect(sp(D.withTenueSite(html("tn-biens"), site))).toContain("485 000 €");
    expect(sp(D.withTenueSite(html("tn-carte"), site))).toContain("Lieu jaune de ligne");
    expect(sp(D.withTenueSite(html("tn-rdv-complet"), site))).toContain("<b>Maëlle</b>");
    // Une pièce d'un autre métier n'est pas touchée par ces données.
    expect(D.withTenueSite(html("tn-origines"), { biens: BIENS, carte: CARTE })).toBe(D.withTenueSite(html("tn-origines"), {}));
  });

  it("conception : sans bien publié ou sans plat publié, la pièce ne se pose pas", () => {
    expect(D.dataGaps(["tn-biens", "tn-bien-galerie", "tn-carte"], { products: 0, families: 0, biens: 0, plats: 0 })).toEqual([expect.stringMatching(/tn-biens, tn-bien-galerie\) demandent au moins un bien publié/), expect.stringMatching(/tn-carte\) demande au moins un plat publié/)]);
    expect(D.dataGaps(["tn-biens", "tn-carte"], { products: 0, families: 0, biens: 3, plats: 7 })).toEqual([]);
    // Un appelant qui ne connaît pas ces nombres ne déclenche rien.
    expect(D.dataGaps(["tn-biens", "tn-carte"], { products: 0, families: 0 })).toEqual([]);
  });

  it("le Studio lit la rubrique Biens et la rubrique Carte du client, et l'aperçu les montre", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { run } = await import("@/lib/db");
    const { saveServices, loadProject } = await import("@/lib/projects");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const user = await account(), pid = await project(user);
    run("UPDATE projects SET business_type='services' WHERE id=?", pid);
    await essai(pid, user.id);
    const lu = D.tenueMetiers(pid);
    // Trois biens publiés et un vendu ; le brouillon ne sort pas. Trois rubriques ; le plat indisponible et le brouillon ne sortent pas.
    expect(lu.biens!.map((b) => `${b.ref} ${b.status} ${b.dpe ?? "?"}${b.ges ?? "?"}`)).toEqual(["V-0001 published CB", "V-0002 published DD", "L-0001 published FE", "V-0003 sold ??"]);
    expect(lu.biens![0].photos.length).toBe(5);
    expect(lu.biens![0].photos[0]).toMatch(/^\/api\/files\/[\w-]+$/);
    expect(lu.carte!.map((r) => `${r.title} ${r.items.length}`)).toEqual(["Les entrées 2", "Les plats 3", "Les desserts 2"]);
    expect(lu.carte![1].items.map((i) => i.price)).toEqual(["24 €", "26 €", "selon arrivage"]);
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, ...["tn-biens", "tn-bien-galerie", "tn-bien-energie", "tn-carte", "tn-table", "tn-rdv-complet"].map((section) => ({ op: "add", page: "home", section }) as const),
      { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }] as any);
    saveServices(pid, { ...loadProject(pid).services, services: PRESTATIONS.map((p) => ({ name: p.name, price: p.price ?? "", duration: p.duration ?? "" })) as any, phone: "04 67 00 00 00", address: "3 quai de la Marine, 34200 Sète", hours: "Du mardi au samedi 12 h – 14 h" });
    const out = sp(renderCustomTheme(loadProject(pid), t, { embed: true }));
    expect(out).toContain("<b>Maison de famille et son jardin</b><span>142 m² · 6 pièces · 4 chambres</span><em>485 000 €</em>");
    expect(out).toContain("<h1>Maison de famille et son jardin</h1>");
    expect(out).toContain('<figure class="tn-etiquette tn-dpe" data-tn-classe="C">');
    expect(out).toContain("<h3>Les plats</h3>");
    expect(out).toContain("<b>Coupe, soin et coiffage</b><small>Durée : 1 h</small><em>52 €</em>");
    // Aucune photo d'exemple ne reste dans une pièce de biens : ce sont les photos du client, ou le cadre « Photo à fournir ».
    expect(/<section[^>]*class="tn tn-biens"[\s\S]*?<\/section>/.exec(out)![0]).not.toContain("photos/im-");
  });
});

describe("thème unique, métiers : la mise en boutique ne refuse aucune pièce", async () => {
  const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { validateCustomSection } = await import("@/lib/theme/ops");
  const input = (over: Record<string, unknown> = {}) => ({
    name: "Maison Aubier", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "services" as const,
    products: [], prestations: PRESTATIONS, company: { shipping: null, returns: null },
    site: { phone: "04 67 00 00 00", address: "3 quai de la Marine, 34200 Sète", hours: "Du mardi au samedi 12 h – 14 h", area: "Sète, Frontignan", biens: BIENS, carte: CARTE, equipe: EQUIPE },
    assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: true, base: null, ...over,
  });
  const sec = (id: string, uid: string, construction?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: tenueSection(id)!.html.replace(/photos\/(?!(?:carte|map|plan)-)[\w.-]+/g, "/api/files/a1") });
  const theme = (id: string, construction?: string) => ({ version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0,
    pages: [{ key: "home", label: "Accueil", sections: [sec(id, "s1", construction)] }, { key: "visite", label: "Demander une visite", sections: [sec("tn-bien-visite", "v1")] }, { key: "reservation", label: "Réserver", sections: [sec("tn-table", "r1")] }] }) as any;
  const liquidOf = (id: string, construction?: string, over: Record<string, unknown> = {}) => {
    const out = customThemeSpec(theme(id, construction), input(over));
    const blocking = out.problems.filter((x) => x.level === "bloquant").map((x) => x.text);
    expect(blocking, `${id} : ${blocking.join("\n")}`).toEqual([]);
    for (const [type, c] of Object.entries(out.spec.customSections)) {
      expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull();
      expect(c.liquid, type).not.toMatch(/À compléter|photos\/|onclick=|onsubmit=|data-go=|href="#"|\/api\/files\/|<script/);
    }
    return sp(Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))?.liquid ?? "");
  };

  for (const [id, keys] of Object.entries({ ...NOUVELLES, ...AJOUTEES })) for (const key of keys) {
    it(`${id} · ${key} : une section Shopify valide, sans rien d'exemple`, () => {
      const liquid = liquidOf(id, key);
      // Une pièce dont tout l'exemple était « à compléter » peut être retirée (et c'est dit) ; sinon elle porte sa construction.
      if (liquid) expect(liquid).toContain(`data-tn-c="${key}"`);
    });
  }

  it("les vraies données partent écrites dans la page ; les photos des biens deviennent des fichiers du thème", () => {
    const biens = liquidOf("tn-biens", "liste");
    expect(biens).toContain("<b>Maison de famille et son jardin</b><span>142 m² · 6 pièces · 4 chambres</span><em>485 000 €</em>");
    expect(biens).toContain("{{ 'tn-b1.jpg' | asset_url }}");
    expect(liquidOf("tn-bien-energie")).toContain('<li data-l="C" class="tn-oui"><span>C</span></li>');
    expect(liquidOf("tn-bien-energie", "reglettes", { site: { biens: [{ ...BIENS[0], dpe: null, ges: null }] } })).toContain("Classe : <strong>non communiquée</strong>");
    expect(liquidOf("tn-carte", "conduite")).toContain("<h3>Les desserts</h3>");
    // Un prix que le restaurateur n'a pas donné ne part pas : la ligne garde son nom et sa description.
    expect(liquidOf("tn-carte")).toContain("<li><b>Risotto d'épeautre<i>Végétarien</i></b><span>Champignons, vieux comté.</span><small>Allergènes : gluten, lait</small></li>");
  });

  it("formulaires : de vrais formulaires de contact, chaque champ nommé en clair, les choix groupés", () => {
    const table = liquidOf("tn-table");
    expect(table).toMatch(/\{%- form 'contact' -%\}/);
    for (const name of ["La date", "L'heure", "Couverts", "Votre nom", "Votre téléphone", "Une précision (facultatif)"]) expect(table, name).toContain(`name="contact[${name}]"`);
    expect(table).toContain('name="contact[email]"');
    expect(table).toContain("<address data-tn-adresse>3 quai de la Marine, 34200 Sète</address>");
    const visite = liquidOf("tn-bien-visite");
    expect(visite).toContain('<select data-tn-biens-choix name="contact[Le bien]"><option selected>Maison de famille et son jardin (V-0001)</option>');
    expect((visite.match(/name="contact\[Le moment de la visite\]"/g) ?? []).length).toBe(3);
    expect((visite.match(/name="contact\[email\]"/g) ?? []).length).toBe(1);
    const rdv = liquidOf("tn-rdv-complet");
    expect((rdv.match(/type="radio" value="[^"]*"(?: checked)? name="contact\[La prestation\]"/g) ?? []).length).toBe(4);
    expect(rdv).toContain('<input type="radio" value="Maëlle" name="contact[Avec qui]">');
    expect((rdv.match(/name="contact\[Le moment de la journée\]"/g) ?? []).length).toBe(4);
    const recherche = liquidOf("tn-recherche-biens");
    expect(recherche).toMatch(/\{%- form 'contact', class: 'tn-filtres-b' -%\}/);
    expect(recherche).toContain('name="contact[Type de bien]"');
    expect((recherche.match(/name="contact\[Votre projet\]"/g) ?? []).length).toBe(2);
    expect(liquidOf("tn-inscription")).toContain('name="contact[L\'atelier]"'.replace("\\'", "'"));
  });
});

// ---------------------------------------------------------------- le client d'essai dans la base (biens, carte)

/** Le client d'essai saisi dans le Studio, comme le ferait un vrai client : quatre biens (dont un vendu, sans diagnostic) et un brouillon, une carte. */
async function essai(pid: string, userId: string, photos: string[] = ["im-maison.jpg", "im-salon.jpg", "im-cuisine.jpg", "im-chambre.jpg", "im-2.jpg", "im-1.jpg", "im-quartier.jpg"]) {
  const { saveAsset } = await import("@/lib/library");
  const { createBien, setBienStatus } = await import("@/lib/biens");
  const { addCategory, createItem, setItemStatus } = await import("@/lib/contenus/carte");
  const ids: string[] = [];
  for (const f of photos) ids.push((await saveAsset({ projectId: pid, userId, data: fs.readFileSync(path.join(DIR, "photos", f)), name: f, mime: "image/jpeg", role: "original", origin: "upload" })).id);
  const ph = (...n: number[]) => n.map((i) => ({ assetId: ids[i], alt: "" }));
  const data = (b: D.TenueBien, pics: { assetId: string; alt: string }[], quartier: { assetId: string; alt: string }[] = []) => ({
    title: b.title, type: b.type, summary: b.summary, description: b.description, city: b.city, sector: b.sector, price: b.price, rent: b.rent, charges: b.charges, deposit: b.deposit, fees: b.fees,
    surface: b.surface, land: b.land, rooms: b.rooms, bedrooms: b.bedrooms, floor: b.floor, furnished: b.furnished, exteriors: b.exteriors, pool: b.pool, features: b.features, availability: b.availability,
    dpe: b.dpe, ges: b.ges, propertyTax: b.propertyTax, photos: pics, featured: b.featured, neighborhood: { text: b.neighborhood.text, photos: quartier, places: b.neighborhood.places },
  });
  const put = (b: D.TenueBien, pics: { assetId: string; alt: string }[], status: "published" | "sold" | "draft", quartier: { assetId: string; alt: string }[] = []) => {
    const x = createBien(userId, pid, { transaction: b.transaction, ref: b.ref, data: data(b, pics, quartier) });
    if (status !== "draft") setBienStatus(pid, x.id, status);
  };
  put(BIENS[0], ph(0, 1, 2, 3, 4), "published", ph(6));
  put(BIENS[1], ph(1, 2, 3), "published");
  put(BIENS[2], ph(5, 2), "published");
  put(bien({ ref: "V-0003", title: "Loft d'atelier", type: "loft", city: "Frontignan", sector: "", price: 310000, surface: 88, land: null, rooms: 3, bedrooms: 1, dpe: null, ges: null, featured: false, features: [], neighborhood: { text: "", photos: [], places: [] } }), ph(4, 3), "sold");
  put(bien({ ref: "V-0004", title: "Villa en préparation", featured: false }), ph(0), "draft");
  for (const r of CARTE) {
    const cat = addCategory(pid, r.title);
    for (const p of r.items) {
      const euros = p.price ? Number(p.price.replace(/[^\d,]/g, "").replace(",", ".")) : null;
      const item = createItem(pid, { categoryId: cat.id, name: p.name, description: p.description, price: euros, priceText: euros == null ? "selon arrivage" : "", vegetarian: p.vegetarian, allergens: p.allergens });
      setItemStatus(pid, item.id, "published");
    }
  }
  const hors = addCategory(pid, "Hors carte");
  createItem(pid, { categoryId: hors.id, name: "Plat en brouillon", price: 12 });
  const indispo = createItem(pid, { categoryId: hors.id, name: "Plat indisponible", price: 14, available: false });
  setItemStatus(pid, indispo.id, "published");
}

// ---------------------------------------------------------------- 2) planches en image, à la demande

const VIF_BRAND = {
  name: "Zeste", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Une maison joyeuse et franche.", audience: "", personality: ["joyeuse", "franche"],
  tone: { voice: "Phrases courtes.", do: [], dont: [] }, palette: { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" },
  fonts: { heading: "unbounded_n8", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const TENUES = [
  { key: "calme", brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE } },
  { key: "brute", brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE } },
  { key: "vive", brand: VIF_BRAND, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "le zeste" } as const },
];

describe.runIf(!!process.env.METIERS_OUT)("thème unique, métiers : planches en image avec les données du client d'essai", async () => {
  const only = (process.env.METIERS_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const tenues = (process.env.METIERS_TENUES ?? "calme,vive").split(",").map((x) => x.trim());
  const wanted = [...Object.entries(NOUVELLES).flatMap(([id, keys]) => keys.map((key) => ({ id, key }))), ...Object.entries(DESSINEES_ICI).flatMap(([id, keys]) => keys.map((key) => ({ id, key })))].filter((x) => !only.length || only.includes(x.id));

  it(`${wanted.length} page(s) rendues dans ${tenues.length} allure(s), rien ne dépasse de l'écran`, async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { run } = await import("@/lib/db");
    const { saveBrand, saveServices, loadProject } = await import("@/lib/projects");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const { shootPages } = await import("@/lib/syna-agent/custom-theme/shots");
    const out = process.env.METIERS_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const pages = wanted.map((x) => ({ ...x, page: `${x.id.slice(3)}--${x.key}`.slice(0, 40) }));
    const overflow: string[] = [];
    for (const tn of TENUES.filter((x) => tenues.includes(x.key))) {
      const user = await account(), pid = await project(user);
      run("UPDATE projects SET business_type='services' WHERE id=?", pid);
      saveBrand(pid, tn.brand as any);
      await essai(pid, user.id);
      saveServices(pid, { ...loadProject(pid).services, services: PRESTATIONS.map((p) => ({ name: p.name, price: p.price ?? "", duration: p.duration ?? "" })) as any, phone: "04 67 00 00 00", address: "3 quai de la Marine, 34200 Sète", hours: "Du mardi au samedi 12 h – 14 h ; du mardi au samedi 19 h 30 – 22 h ; dimanche 12 h – 15 h", area: "Sète, Frontignan, Balaruc, Mèze, Marseillan et Bouzigues" });
      let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
      t = S.applyStructure(t, [...pages.flatMap((p) => [{ op: "page", key: p.page, label: p.page } as const, { op: "add", page: p.page, section: p.id, construction: p.key } as const]),
        { op: "shell", slot: "header", section: "tn-entete" }, { op: "shell", slot: "footer", section: "tn-pied" }, { op: "tenue", tenue: tn.tenue }] as any);
      // L'équipe n'a pas encore de rubrique dans le Studio : pour juger le rendez-vous en trois temps avec de vrais
      // prénoms, la pièce est écrite comme le ferait le rédacteur avec ce que le client d'essai a dit.
      for (const pg of t.pages) for (const s of pg.sections) if (s.id === "tn-rdv-complet") { s.html = D.withTenueRdvSteps(tenueSection(s.id)!.html, [], EQUIPE).replace(/<mark class="tn-manque">([\s\S]*?)<\/mark>/g, "[$1]"); s.clientTexts = true; }
      const page = renderCustomTheme(loadProject(pid), t, { embed: true });
      for (const view of ["téléphone", "ordinateur"] as const) {
        const shots = await shootPages(page, pages.map((p) => p.page), { view, maxHeight: 3400, quality: 86 });
        expect(shots, "Chromium présent").not.toBeNull();
        for (const s of shots!) {
          fs.writeFileSync(path.join(out, `${s.key}__${tn.key}__${view === "téléphone" ? "tel" : "ordi"}.jpg`), s.data);
          if (s.overflow > 1) overflow.push(`${s.key} · allure ${tn.key} · ${view} : dépasse de ${s.overflow} px`);
        }
      }
    }
    expect(overflow, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 1_800_000);
});

// Les pièces du module sont bien dans la banque complète (une pièce oubliée dans METIERS_SECTIONS ne serait pas montée).
it("thème unique, métiers : les pièces sont dans la banque des pièces à tenue", () => {
  for (const id of Object.keys(NOUVELLES)) expect(TENUE_SECTIONS.some((s) => s.id === id), id).toBe(true);
});
