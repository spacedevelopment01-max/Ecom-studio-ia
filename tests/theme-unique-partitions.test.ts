/**
 * Thème unique du Studio, module « partitions » (17 novembre 2026) : les pièces qui manquaient aux moments du cahier
 * `docs/sina-savoir/theme-ordre-et-variete.md`, la page contact et la fiche d'un bien moment par moment, le titre d'une
 * page, l'ouverture d'un service en grande photo pleine (ville et téléphone cliquable), et la taille du site calculée
 * d'après les partitions. Gratuit, sans IA, aucun appel réel.
 *
 * 1) Toujours : chaque pièce existe, a deux à quatre constructions dessinées dans la feuille du module, des textes
 *    d'exemple neutres, ne se montre JAMAIS sans sa vraie donnée, et part dans Shopify sans refus.
 * 2) À la demande, PARTITIONS_OUT=<dossier> : chaque construction est capturée sur téléphone (390 px) et sur ordinateur
 *    (1280 px) dans deux palettes (une calme, une difficile : couleur de marque jaune vif), puis contrôlée dans le
 *    navigateur : aucun texte sous un contraste de 3 avec son fond, rien ne dépasse à 320 px. Une planche JPEG par
 *    pièce et une planche d'ensemble (« pieces-nouvelles.jpg ») sont assemblées dans le dossier.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TENUE_FILES, TENUE_SECTIONS, markMissing, tenueAttrs, tenueCss, tenueSection, type Tenue } from "@/lib/syna-agent/custom-theme/tenue";
import { OUVERTURES_SERVICES, PARTITIONS_FACONS, PARTITIONS_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-partitions";
import { MEME_CONTENU, doublonsDe, type PreuveId } from "@/lib/syna-agent/custom-theme/tenue-ordre";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import * as M from "@/lib/syna-agent/custom-theme/familles";
import * as O from "@/lib/syna-agent/custom-theme/ordre";
import * as P from "@/lib/syna-agent/custom-theme/partitions";
import * as PR from "@/lib/syna-agent/custom-theme/preuves";

process.env.STUDIO_SYNA_AGENT = "1";
const DIR = path.join(process.cwd(), "public", "sections");
const SHEET = fs.readFileSync(path.join(DIR, "tenue-partitions.css"), "utf8");
const sp = (x: string) => x.replace(/[\u00a0\u202f]/g, " ");
const rootOf = (id: string) => /class="tn (tn-[a-z0-9-]+)/.exec(tenueSection(id)!.html)![1];
const selectors = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@(?:media|supports)[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);

/** Toutes les constructions attendues : la première est le rendu de base de la pièce. */
const FACONS: Record<string, string[]> = {
  "tn-offre-visite": ["encadre", "bande", "billet"],
  "tn-delais": ["lignes", "frise", "cartes"],
  "tn-annulation": ["lignes", "cartes", "encadre"],
  "tn-privatisation": ["photo-pleine", "cote-a-cote", "sombre"],
  "tn-realisations-types": ["grille", "bandes", "liste"],
  "tn-reseaux": ["lignes", "pastilles", "sombre"],
  "tn-delai-reponse": ["colonnes", "bande"],
  "tn-horaires": ["tableau", "encadre"],
  "tn-adresse": ["carte-dessus", "adresse-en-grand"],
  "tn-venir": ["lignes", "cartes"],
  "tn-bien-description": ["avec-photo", "colonne"],
  "tn-bien-surfaces": ["chiffres", "tableau"],
  "tn-bien-equipements": ["coches", "etiquettes"],
  "tn-bien-frais": ["lignes", "cartes"],
  "tn-presentation": ["centre", "gauche", "bande"],
};
/** Les pièces qui ne valent que par un fait du client : sans lui, elles ne rendent rien. */
const SANS_DONNEE_RIEN = Object.keys(FACONS).filter((id) => !["tn-realisations-types", "tn-presentation"].includes(id));

// ---------------------------------------------------------------- le client d'essai, inventé pour l'essai

/** Ce qu'un client d'essai aurait répondu : chaque « [À compléter : …] » reçoit une réponse (la première règle qui va). */
const REPONSES: [RegExp, string][] = [
  [/ton offre pour une première visite/, "Ta première séance à moitié prix"],
  [/les conditions de l'offre/, "Pour toute nouvelle personne, sur la première visite seulement."],
  [/tu rappelles$/, "Le jour même"], [/tu viens voir/, "Dans la semaine"], [/tu l'envoies/, "Sous trois jours ouvrés"], [/quand il peut commencer/, "Quatre à six semaines après ton accord"],
  [/jusqu'à quand, et comment prévenir/, "Sans frais jusqu'à la veille, par téléphone ou par message."], [/arrive en retard/, "Au-delà d'un quart d'heure, la séance est raccourcie d'autant."],
  [/s'il y en a un/, "Aucun acompte n'est demandé."], [/^ce qui se passe$/, "La séance manquée est due."],
  [/ce que tu proposes pour un groupe/, "La salle entière pour un anniversaire, un repas d'équipe ou une fête de famille, avec un menu choisi ensemble."],
  [/de combien à combien/, "De 15 à 40 personnes"], [/les jours et les moments possibles/, "Du mardi au samedi, midi et soir"], [/ce qui est proposé/, "Trois menus au choix, boissons à part"],
  [/un premier type/, "Cuisines"], [/un deuxième type/, "Salles de bains"], [/un troisième type/, "Extérieurs"], [/^ville$/, "Lyon"], [/mois et année/, "mars 2026"],
  [/quand tu décroches/, "Du lundi au vendredi, rappel dans l'heure"], [/tu réponds$/, "Sous 24 heures"],
  [/où se garer/, "Parking public à 100 m, gratuit le samedi"], [/l'arrêt le plus proche/, "Tram T1, arrêt Liberté, à 3 minutes à pied"], [/étage, ascenseur/, "Rez-de-chaussée, de plain-pied"], [/ce qu'on voit depuis la rue/, "La porte verte, à côté de la boulangerie"],
];
const remplir = (html: string) => html.replace(/\[À compléter(?:\s*:\s*([^\]]*))?\]/g, (m, quoi: string | undefined) => REPONSES.find(([rx]) => rx.test((quoi ?? "").trim()))?.[1] ?? m);
const BIEN: D.TenueBien = {
  ref: "V-0001", title: "Maison de famille et son jardin", type: "maison", transaction: "location", status: "published", city: "Sète", sector: "Mont Saint-Clair",
  price: null, rent: 1450, charges: 80, deposit: 1450, fees: "Honoraires à la charge du locataire : 870 €", surface: 142, land: 620, rooms: 6, bedrooms: 4, floor: "De plain-pied", furnished: true,
  exteriors: ["jardin", "terrasse"], pool: true, features: ["Vue sur l'étang", "Garage", "Cheminée", "Cuisine équipée", "Fibre"], availability: "Dès la signature", dpe: "C", ges: "B", propertyTax: "1 480 € par an",
  summary: "Une maison de famille au calme.", description: "Une maison de famille au calme, tournée vers son jardin.\nQuatre chambres, un séjour traversant, une terrasse plein sud où l'on déjeune dès le printemps.", photos: ["photos/im-maison.jpg", "photos/im-salon.jpg", "photos/im-cuisine.jpg"], featured: true,
  neighborhood: { text: "", photos: [], places: [] },
};
const RESEAUX: D.TenueReseau[] = D.reseauxDansTexte("Instagram : @atelier.essai ; https://www.facebook.com/atelier.essai ; https://www.youtube.com/@atelieressai");
const SITE: D.TenueSite = { phone: "04 72 00 00 00", address: "12 rue des Lilas, 69003 Lyon", hours: "Du mardi au vendredi 9 h – 19 h ; samedi 9 h – 17 h", area: "Lyon, Villeurbanne, Bron et Caluire", reseaux: RESEAUX, biens: [BIEN] };
const construit = (html: string, c: string) => html.replace(/^<([a-z]+) /, `<$1 data-tn-c="${c}" `);
/** Une pièce telle que le Studio la rend pour le client d'essai, dans une construction. */
const rendu = (id: string, c: string, site: D.TenueSite = SITE) => D.withTenueSite(construit(remplir(tenueSection(id)!.html), c), site);

describe("thème unique, partitions : les pièces nouvelles, leurs constructions et leur feuille", () => {
  it("chaque pièce existe dans la bibliothèque, avec deux à quatre constructions dites en clair et des textes d'exemple neutres", () => {
    expect(PARTITIONS_SECTIONS.map((s) => s.id)).toEqual(Object.keys(FACONS));
    for (const s of PARTITIONS_SECTIONS) {
      expect(TENUE_SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
      expect(s.constructions.map((c) => c.key), s.id).toEqual(FACONS[s.id]);
      expect(s.constructions.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.constructions.length, s.id).toBeLessThanOrEqual(4);
      for (const c of s.constructions) expect(c.label.length, `${s.id} · ${c.key}`).toBeGreaterThan(24);
      // Aucun fait d'exemple : ni chiffre, ni prix, ni coordonnée, ni prénom ; rien d'un projet d'essai ni d'un métier.
      const text = s.html.replace(/\[À compléter[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ");
      expect(text, `${s.id} : aucun chiffre d'exemple`).not.toMatch(/\d/);
      expect(text, s.id).not.toMatch(/€|@|https?:/);
      expect(text, s.id).not.toMatch(/\bthé\b|infusion|vélo|coiff|électric|toilett|fauteuil|Bécane|Lunex/i);
      // Elle a son trait pour l'ordre des pages, et sa place dans la banque.
      expect(tenueSection(s.id)!.ordre, s.id).toBeTruthy();
    }
    // Les pièces qui ne valent que par un fait du client l'écrivent « à compléter » et le marquent.
    for (const id of SANS_DONNEE_RIEN.filter((x) => x !== "tn-reseaux")) { const marque = /<([a-z0-9]+)\b[^>]*\sdata-tn-fait(?=[\s>])[^>]*>([\s\S]*?)<\/\1>/.exec(tenueSection(id)!.html); expect(marque?.[2] ?? "", id).toContain("[À compléter"); }
    expect(tenueSection("tn-reseaux")!.html).toContain("data-tn-reseaux");
  });

  it("chaque construction est dessinée dans la feuille du module ; aucune règle ne cible la construction de base", () => {
    const mine = selectors(SHEET);
    for (const [id, keys] of Object.entries({ ...FACONS, "tn-ouverture-metier": ["lieu", "photo-pleine", "photo-centre", "photo-bandeau"] })) {
      const root = rootOf(id);
      expect(mine.some((sel) => sel.includes(`.ctw .${root}`)) || id === "tn-ouverture-metier", `${id} : règles de base`).toBe(true);
      for (const key of keys.slice(1)) expect(mine.some((sel) => sel.includes(`.${root}[data-tn-c="${key}"]`)), `${id} : règle [data-tn-c="${key}"]`).toBe(true);
      for (const sel of mine) expect(sel.includes(`.${root}`) && sel.includes(`[data-tn-c="${keys[0]}"]`), `${id} : aucune règle pour « ${keys[0]} »`).toBe(false);
    }
    // Les façons d'origine de l'ouverture d'un métier ne sont pas redessinées ici.
    for (const sel of mine) if (sel.includes(".tn-ouverture-metier")) expect(sel, sel).toMatch(/\[data-tn-c="photo-(?:pleine|centre|bandeau)"\]/);
  });

  it("la feuille respecte les règles d'écriture : sélecteurs en « .ctw .tn-… », une seule pièce par règle, aucune couleur en dur, titres à l'échelle", () => {
    const css = SHEET.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/!important/);
    expect(css.match(/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|:\s*(?:white|black|red|grey|gray)\b/gi) ?? []).toEqual([]);
    const roots = new Set(TENUE_SECTIONS.map((s) => rootOf(s.id)));
    for (const list of selectors(SHEET)) for (const sel of list.split(/,(?![^(]*\))/)) {
      expect(sel.trim(), "sélecteur").toMatch(/^\.ctw(?:\[data-tn-[a-z]+(?:="[a-z]+")?\])? \.tn-[a-z0-9-]+/);
      const named = [...sel.matchAll(/\.(tn-[a-z0-9-]+)/g)].map((m) => m[1]).filter((c) => roots.has(c));
      expect(new Set(named).size, `une seule pièce par règle : ${sel}`).toBe(1);
    }
    for (const rule of css.split("}")) {
      const [sel, body] = rule.split("{");
      if (!body || !/(?:^|[\s>,])h[12](?:$|[\s,.[]|:(?!:))/.test(sel.split(",").map((x) => x.trim().split(/\s+/).pop()).join(" , "))) continue;
      const size = /font-size:([^;]+)/.exec(body)?.[1];
      if (size) expect(size, sel.trim().slice(0, 70)).toContain("var(--tn-k)");
    }
    // Tout texte posé sur la couleur de la marque prend la couleur calculée pour s'y lire.
    for (const rule of css.split("}")) if (/background(?:-color)?:var\(--tn-accent\)/.test(rule) && /(?:^|[;{])color:/.test(rule.split("{")[1] ?? "")) expect(rule, rule.slice(0, 90)).toMatch(/(?:^|[;{])color:var\(--tn-sur-accent\)/);
    // Les classes intérieures du module portent son préfixe : aucune n'existe dans une autre feuille.
    const autres = TENUE_FILES.css.filter((f) => f !== "tenue-partitions.css").map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n");
    expect(autres).not.toMatch(/tn-pt-/);
    expect(TENUE_FILES.css).toContain("tenue-partitions.css");
  });
});

describe("thème unique, partitions : jamais une pièce sans sa vraie donnée", () => {
  it("sans donnée, la pièce ne rend rien ; avec la réponse du client, elle se montre", () => {
    for (const id of SANS_DONNEE_RIEN) {
      expect(D.withTenueSite(tenueSection(id)!.html, {}), `${id} sans donnée`).toBe("");
      const plein = rendu(id, FACONS[id][0]);
      expect(plein, `${id} avec ses données`).toContain(`class="tn ${rootOf(id)}"`);
      expect(plein, `${id} : plus rien à compléter`).not.toMatch(/À compléter/);
    }
  });

  it("une ligne dont le fait manque s'en va seule ; les autres restent", () => {
    const html = tenueSection("tn-delais")!.html.replace("[À compléter : sous combien de temps tu rappelles]", "Le jour même");
    const out = D.withTenueSite(html, {});
    expect(out.match(/<li data-tn-fait>/g)).toHaveLength(1);
    expect(out).toContain("<small>Premier contact</small><b>Le jour même</b>");
    expect(out).not.toMatch(/À compléter|Devis|Chantier/);
    // L'offre de première visite : sans l'offre elle-même, rien, même si ses conditions sont écrites.
    expect(D.withTenueSite(tenueSection("tn-offre-visite")!.html.replace(/\[À compléter : les conditions[^\]]*\]/, "Pour tous."), {})).toBe("");
  });

  it("horaires, adresse, téléphone : ceux du profil ; adresse discrète : la pièce de l'adresse ne se montre pas", () => {
    const h = sp(D.withTenueSite(tenueSection("tn-horaires")!.html, SITE));
    expect(h).toContain("<tr><th>Du mardi au vendredi</th><td>9 h – 19 h</td></tr><tr><th>Samedi</th><td>9 h – 17 h</td></tr>");
    expect(h).toContain('<a class="tn-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
    // Sans téléphone au profil : pas de trou, le lien s'en va.
    expect(D.withTenueSite(tenueSection("tn-horaires")!.html, { hours: SITE.hours })).not.toMatch(/tn-tel|À compléter/);
    const a = D.withTenueSite(tenueSection("tn-adresse")!.html, SITE);
    expect(a).toContain("<address data-tn-adresse data-tn-fait>12 rue des Lilas, 69003 Lyon</address>");
    expect(a).toMatch(/<a class="tn-ph tn-plan" href="https:\/\/www\.openstreetmap\.org\/search\?query=/); // jamais un plan dessiné
    expect(a).toMatch(/href="https:\/\/www\.openstreetmap\.org\/directions\?to=[^"]+" target="_blank" rel="noopener" data-tn-itineraire>/);
    expect(D.withTenueSite(tenueSection("tn-adresse")!.html, { ...SITE, address: null, addressDiscreet: true })).toBe("");
    expect(D.withTenueSite(tenueSection("tn-adresse")!.html, { area: "Lyon" })).toBe("");
  });

  it("réseaux : seulement les vrais comptes, chacun avec son lien ; rien n'est deviné", () => {
    expect(RESEAUX.map((r) => [r.cle, r.url, r.compte])).toEqual([["instagram", "https://www.instagram.com/atelier.essai/", "@atelier.essai"], ["facebook", "https://www.facebook.com/atelier.essai", "facebook.com/atelier.essai"], ["youtube", "https://www.youtube.com/@atelieressai", "youtube.com/@atelieressai"]]);
    // Un lien de partage, une publication, un réseau cité sans compte : rien.
    expect(D.reseauxDansTexte("Partage : https://www.facebook.com/sharer/sharer.php?u=x ; https://www.instagram.com/p/Abc123/ ; je suis sur Instagram et TikTok")).toEqual([]);
    expect(D.reseauxDansTexte("tiktok @mon.compte")).toEqual([{ cle: "tiktok", nom: "TikTok", url: "https://www.tiktok.com/@mon.compte", compte: "@mon.compte" }]);
    const out = D.withTenueSite(tenueSection("tn-reseaux")!.html, { reseaux: RESEAUX });
    expect(out.match(/<li><a href="https:\/\/[^"]+" target="_blank" rel="noopener"><small>[^<]+<\/small><b>[^<]+<\/b><\/a><\/li>/g)).toHaveLength(3);
    expect(out).not.toMatch(/Nom du réseau|À compléter|href="#"/);
    // Un texte écrit dans la pièce ne suffit pas : sans compte connu du Studio, elle ne se montre pas.
    expect(D.withTenueSite(remplir(tenueSection("tn-reseaux")!.html).replace(/\[À compléter[^\]]*\]/g, "@invente"), {})).toBe("");
  });

  it("la fiche d'un bien, moment par moment : seulement ce que l'agence a saisi", () => {
    const d = sp(D.withTenueSite(tenueSection("tn-bien-description")!.html, SITE));
    expect(d).toContain("Une maison de famille au calme, tournée vers son jardin.<br>Quatre chambres");
    expect(d).toContain('<div class="tn-ph tn-cadre" style="background-image:url(photos/im-salon.jpg)"></div>'); // la deuxième photo du bien
    const s = sp(D.withTenueSite(tenueSection("tn-bien-surfaces")!.html, SITE));
    expect(s).toContain("<li data-tn-fait><b>142 m²</b><small>Surface habitable</small></li><li data-tn-fait><b>620 m²</b><small>Terrain</small></li><li data-tn-fait><b>6</b><small>Pièces</small></li><li data-tn-fait><b>4</b><small>Chambres</small></li>");
    expect(s).toContain("<div><dt>Étage</dt><dd>De plain-pied</dd></div><div><dt>Disponibilité</dt><dd>Dès la signature</dd></div><div><dt>Référence</dt><dd>V-0001</dd></div>");
    const e = D.withTenueSite(tenueSection("tn-bien-equipements")!.html, SITE);
    expect([...e.matchAll(/<li data-tn-fait>([^<]+)<\/li>/g)].map((m) => m[1])).toEqual(["Vue sur l'étang", "Garage", "Cheminée", "Cuisine équipée", "Fibre", "Jardin", "Terrasse", "Piscine", "Meublé"]);
    const f = sp(D.withTenueSite(tenueSection("tn-bien-frais")!.html, SITE));
    expect([...f.matchAll(/<div data-tn-fait><dt>([^<]+)<\/dt><dd>([^<]+)<\/dd><\/div>/g)].map((m) => `${m[1]} : ${m[2]}`)).toEqual(["Charges : 80 € par mois", "Dépôt de garantie : 1 450 €", "Honoraires : Honoraires à la charge du locataire : 870 €", "Taxe foncière : 1 480 € par an"]);
    // Un bien sans équipement ni frais saisis : ces deux pièces ne se montrent pas ; sans photo de plus, la description reste, sans cadre vide.
    const nu: D.TenueSite = { biens: [{ ...BIEN, transaction: "vente", features: [], exteriors: [], pool: false, furnished: null, charges: null, deposit: null, fees: "", propertyTax: "", photos: ["photos/im-maison.jpg"] }] };
    expect(D.withTenueSite(tenueSection("tn-bien-equipements")!.html, nu)).toBe("");
    expect(D.withTenueSite(tenueSection("tn-bien-frais")!.html, nu)).toBe("");
    expect(D.withTenueSite(tenueSection("tn-bien-description")!.html, nu)).not.toContain("tn-ph");
    // Le contrôle de la conception refuse déjà ces pièces sans bien publié.
    expect(D.dataGaps(["tn-bien-description", "tn-bien-frais"], { products: 0, families: 0, biens: 0 }).join("\n")).toMatch(/tn-bien-description, tn-bien-frais\) demandent au moins un bien publié/);
  });

  it("réalisations filtrées par type : des filtres qui marchent sans script, seulement pour de vrais types", () => {
    // Sans type nommé : la liste, sans filtres ni phrase qui les annonce.
    const sans = D.withTenueSite(tenueSection("tn-realisations-types")!.html, {});
    expect(sans).not.toMatch(/tn-pt-filtres|tn-pt-aide|type="radio"/);
    expect(sans.match(/<figure data-tn-t="[abc]">/g)).toHaveLength(6);
    // Un seul type nommé : pas de filtres non plus (il faut au moins deux types).
    expect(D.withTenueSite(tenueSection("tn-realisations-types")!.html.replace("[À compléter : un premier type de réalisation]", "Cuisines"), {})).not.toContain("tn-pt-filtres");
    // Trois types nommés : « Tout voir » et un bouton radio par type, du même groupe ; chaque réalisation porte son type.
    const avec = rendu("tn-realisations-types", "grille");
    expect([...avec.matchAll(/<label(?: data-tn-t="([a-d])")?><input type="radio" name="tn-pt-type" value="([a-z]+)"( checked)?><span>([^<]+)<\/span><\/label>/g)].map((m) => `${m[2]}${m[3] ? "*" : ""}:${m[4]}`)).toEqual(["tous*:Tout voir", "a:Cuisines", "b:Salles de bains", "c:Extérieurs"]);
    expect(avec).toContain("<small>Lyon · mars 2026</small>"); // le lieu et la date
    // Un type nommé sans aucune réalisation n'a pas de filtre.
    const troue = D.withTenueSite(remplir(tenueSection("tn-realisations-types")!.html).replace(/<figure data-tn-t="c">[\s\S]*?<\/figure>/g, ""), {});
    expect(troue).not.toContain("Extérieurs");
    expect(troue.match(/type="radio"/g)).toHaveLength(3);
    // La feuille : le type choisi cache les réalisations des autres types (quatre types au plus), sans script.
    for (const t of ["a", "b", "c", "d"]) expect(SHEET).toContain(`.ctw .tn-realisations-types:has(input[value="${t}"]:checked) figure:not([data-tn-t="${t}"]){display:none}`);
    expect(fs.existsSync(path.join(DIR, "tenue-partitions.js"))).toBe(false);
  });
});

describe("thème unique, partitions : les moments du cahier, les doublons, le premier écran d'un service", () => {
  const SERVICE: O.OrdreFacts = { business: "services", products: 1, types: ["service-proximite"], mobile: true, zoneConnue: true, preuves: new Set<PreuveId>() };
  const pg = (key: string, ids: string[], label?: string) => ({ key, label: label ?? key, sections: ids.map((section) => ({ section })) });
  const pourquoi = "Parce que ses clients appellent d'abord pour savoir s'il vient jusque chez eux.";

  it("chaque moment du cahier a une pièce ; chaque pièce nouvelle tient son moment", () => {
    expect(P.momentsSansPiece()).toEqual([]);
    const tenu = (key: string) => P.MOMENTS[key].pieces;
    expect(tenu("offre-visite")).toEqual(["tn-offre-visite"]);
    expect(tenu("delais")).toEqual(["tn-delais"]);
    expect(tenu("annulation")).toEqual(["tn-annulation"]);
    expect(tenu("privatisation")).toEqual(["tn-privatisation"]);
    expect(tenu("filtres-type")).toEqual(["tn-realisations-types"]);
    expect(tenu("reseaux")).toEqual(["tn-reseaux"]);
    expect(tenu("delai-reponse")).toEqual(["tn-delai-reponse"]);
    expect(tenu("horaires")[0]).toBe("tn-horaires");
    expect(tenu("adresse-carte")[0]).toBe("tn-adresse");
    expect(tenu("acces")[0]).toBe("tn-venir");
    expect(tenu("presentation")[0]).toBe("tn-presentation");
    for (const k of ["bien-description", "bien-plans", "bien-equipements", "bien-frais"]) expect(tenu(k)[0], k).toMatch(/^tn-bien-(?:description|surfaces|equipements|frais)$/);
    // Un moment qui dépend d'un fait du client le dit : sans lui, il est sauté.
    for (const k of ["offre-visite", "delais", "annulation", "privatisation", "reseaux", "delai-reponse"]) expect(P.MOMENTS[k].preuves?.length, k).toBeGreaterThan(0);
    // Toute pièce nouvelle (sauf aucune) est branchée sur un moment.
    const branchees = new Set(Object.values(P.MOMENTS).flatMap((x) => x.pieces));
    for (const s of PARTITIONS_SECTIONS) expect(branchees.has(s.id), s.id).toBe(true);
  });

  it("une pièce qui dépend d'un fait absent du dossier est refusée ; avec le fait, elle passe", () => {
    const contact = (ids: string[]) => ({ pages: [pg("contact", ids, "Contact")], partitions: [{ page: "contact", partition: "contact:formulaire-ensuite", why: pourquoi }] });
    const sans = O.ordreGaps(contact(["tn-urgence", "tn-contact", "tn-horaires", "tn-zone", "tn-reseaux", "tn-questions", "tn-final"]), SERVICE).refus.join("\n");
    expect(sans).toMatch(/« Les réseaux du client » \(tn-reseaux\) demande ses comptes sur les réseaux, que le dossier n'a pas : saute ce moment/);
    expect(sans).toMatch(/« Les horaires seuls » \(tn-horaires\) demande ses horaires/);
    const avec = O.ordreGaps(contact(["tn-urgence", "tn-contact", "tn-horaires", "tn-zone", "tn-reseaux", "tn-questions", "tn-final"]), { ...SERVICE, preuves: new Set<PreuveId>(["reseaux", "horaires"]) });
    expect(avec.refus).toEqual([]);
    // Les faits se lisent dans les notes du client, avec ses mots ; « aucun » n'en est jamais un.
    const p = PR.preuvesDe([
      { title: "délais", value: "je rappelle le jour même, devis sous 3 jours" }, { title: "annulation", value: "gratuite jusqu'à la veille, pas d'acompte" },
      { title: "offre de première visite", value: "aucune" }, { title: "réseaux", value: "Instagram : @atelier.essai" },
    ], { horaires: "Du mardi au samedi" });
    expect([...p.ids].sort()).toEqual(["annulation", "delais", "horaires", "reseaux"]);
    expect(p.faitsAbsents.map((x) => x.id)).toEqual(expect.arrayContaining(["offre-visite", "privatisation", "adresse", "acces"]));
    expect(p.a).toEqual([]); // ce ne sont pas des preuves : la liste des preuves n'en parle pas
    expect(PR.preuvesBrief(p)).toMatch(/CE QUE LE CLIENT A DONNÉ D'AUTRE[^\n]*ses délais réels[^\n]*NON DONNÉ : une offre de première visite/);
    expect(PR.QUESTION_DES_PREUVES).toMatch(/s'il fait une offre à ceux qui viennent pour la première fois, et laquelle \(sans lui en suggérer\)/);
  });

  it("jamais deux pièces qui montrent la même chose sur une page : ni acceptées, ni proposées", () => {
    expect(MEME_CONTENU.map(([a]) => a)).toEqual(["tn-acces", "tn-realisations", "tn-bien-caracteristiques"]);
    expect(doublonsDe("tn-horaires")).toEqual(["tn-acces"]);
    const f = { ...SERVICE, preuves: new Set<PreuveId>(["horaires", "adresse", "acces"]) };
    const contact = { pages: [pg("contact", ["tn-urgence", "tn-contact", "tn-acces", "tn-horaires", "tn-questions", "tn-final"], "Contact")], partitions: [{ page: "contact", partition: "contact:formulaire-ensuite", why: pourquoi }] };
    expect(O.ordreGaps(contact, f).refus.join("\n")).toMatch(/« Horaires et accès » \(tn-acces\) et « Les horaires seuls » \(tn-horaires\) montrent la même chose : garde l'une des deux/);
    const p = P.partitionById("contact:formulaire-ensuite")!;
    expect(O.momentsLibres(p, ["tn-urgence", "tn-contact", "tn-acces"], f).flatMap((x) => x.pieces)).not.toEqual(expect.arrayContaining(["tn-horaires"]));
    expect(O.momentsLibres(P.partitionById("realisations:toutes-dabord")!, ["tn-presentation", "tn-realisations"], f).flatMap((x) => x.pieces)).not.toContain("tn-realisations-types");
    // La page contact d'un service qui reçoit, dossier complet : dix pièces réelles, sans doublon.
    const complet = { ...SERVICE, mobile: false, preuves: new Set<PreuveId>(["horaires", "adresse", "acces", "reseaux", "delais"]) };
    expect(O.piecesPossibles(p, complet)).toEqual(["tn-urgence", "tn-contact", "tn-delai-reponse", "tn-horaires", "tn-adresse", "tn-zone", "tn-venir", "tn-reseaux", "tn-questions"]);
    // Un service à domicile, dossier ordinaire : pas d'adresse à montrer, pas de compte connu : les moments sont sautés.
    expect(O.piecesPossibles(p, { ...SERVICE, preuves: new Set<PreuveId>(["horaires"]) })).toEqual(["tn-urgence", "tn-contact", "tn-horaires", "tn-zone", "tn-questions"]);
  });

  it("l'ouverture d'un service : grande photo pleine, permise dans les six familles, avec la ville, la zone et le téléphone cliquable", () => {
    expect(tenueSection("tn-ouverture-metier")!.constructions.map((c) => c.key)).toEqual(["lieu", "appel", "promesse", "photo-pleine", "photo-centre", "photo-bandeau"]);
    expect(PARTITIONS_FACONS["tn-ouverture-metier"].slice(0, 3).map((c) => c.label)).toEqual(TENUE_SECTIONS.find((s) => s.id === "tn-ouverture-metier")!.constructions.slice(0, 3).map((c) => c.label));
    expect([...OUVERTURES_SERVICES]).toEqual(["tn-ouverture-metier:photo-pleine", "tn-ouverture-metier:photo-centre", "tn-ouverture-metier:photo-bandeau"]);
    for (const r of OUVERTURES_SERVICES) expect(M.OUVERTURES_PHOTO_PLEINE as readonly string[]).toContain(r);
    const tenue = (f: M.Famille): Tenue => ({ titres: f.tenue.titres[0], bouton: f.tenue.bouton[0], cadre: f.tenue.cadre[0], fond: f.tenue.fond[0], petits: f.tenue.petits[0], signe: "" });
    for (const f of M.FAMILLES) {
      const choix = M.choixDeLaFamille(f.id, { business: "services" })!;
      expect(choix.ouvertures.slice(0, 3), f.id).toEqual([...OUVERTURES_SERVICES]);
      // Une boutique ne l'a pas.
      expect(M.choixDeLaFamille(f.id, { business: "products" })!.ouvertures.join(" "), f.id).not.toContain("tn-ouverture-metier");
      const d = (section: string, construction: string | null) => ({ famille: f.id, tenue: tenue(f), header: M.ENTETE_SERVICES, headerConstruction: null, footer: M.PIED_SERVICES, footerConstruction: null, pages: [{ key: "home", label: "Accueil", journey: "", sections: [{ section, construction, why: "", says: "", photos: "" }] }] }) as never;
      for (const r of OUVERTURES_SERVICES) expect(M.familleGaps(d("tn-ouverture-metier", r.split(":")[1]), { business: "services" }), `${f.id} ${r}`).toEqual([]);
      expect(M.familleGaps(d("tn-ouverture-metier", "appel"), { business: "services" }).join("\n"), f.id).toMatch(/n'est pas dans ses ouvertures/); // pas de photo pleine : toujours refusée
      expect(M.familleGaps(d("tn-ouverture-metier", "photo-pleine"), { business: "products" }).join("\n"), f.id).toMatch(/n'est pas dans ses ouvertures/);
      // Dernier recours sans IA : un site de services est ramené à l'ouverture de métier en photo pleine.
      const fit = M.fitFamille(d("tn-ouverture-nom", null), { business: "services" });
      expect((fit.d as any).pages[0].sections[0]).toMatchObject({ section: "tn-ouverture-metier", construction: "photo-pleine" });
    }
    expect(M.famillesBrief()).toMatch(/L'OUVERTURE de l'accueil d'un site de services est « tn-ouverture-metier »[^\n]*tn-ouverture-metier:photo-pleine ou tn-ouverture-metier:photo-centre ou tn-ouverture-metier:photo-bandeau/);
    // Le Studio y pose le téléphone cliquable et la zone du profil ; la pièce garde la ville dans sa petite ligne.
    for (const c of ["photo-pleine", "photo-centre", "photo-bandeau"]) {
      const html = sp(D.withTenueSite(construit(tenueSection("tn-ouverture-metier")!.html, c), { phone: "04 72 00 00 00", area: "Lyon, Villeurbanne" }));
      expect(html, c).toContain('<a class="tn-tel" href="tel:0472000000" data-tn-tel>04 72 00 00 00</a>');
      expect(html, c).toContain('<li class="tn-zon"><small>Zone</small><span data-tn-zone="ligne">Lyon, Villeurbanne</span></li>');
      expect(html, c).toMatch(/<small>[^<]*<mark class="tn-manque">À compléter : ville<\/mark><\/small><h1>/);
      // Le premier écran ne montre jamais un trou : l'adresse et les horaires, que ce profil ne connaît pas, s'en vont.
      expect(html, c).not.toMatch(/tn-adr|tn-hor|À compléter : (?:adresse|jours|téléphone|villes)/);
      // Sans téléphone au profil : pas de numéro à compléter dans le premier écran.
      expect(D.withTenueSite(construit(tenueSection("tn-ouverture-metier")!.html, c), { area: "Lyon" }), c).not.toMatch(/data-tn-tel|tn-hor|tn-adr/);
    }
    // Les façons d'origine gardent leur comportement (ce qui manque reste « à compléter »).
    expect(D.withTenueSite(construit(tenueSection("tn-ouverture-metier")!.html, "appel"), { area: "Lyon" })).toMatch(/data-tn-tel>\[À compléter : téléphone\]|data-tn-tel><mark/);
  });

  it("contrôle sans IA : l'accueil d'un service ouvre par une pièce qui porte la zone et le téléphone, quand le profil les connaît", () => {
    const accueil = (ouverture: string) => ({ pages: [pg("home", [ouverture, "tn-zone", "tn-prestations", "tn-atouts", "tn-avant-apres", "tn-deroule", "tn-texte-photo", "tn-engagements", "tn-questions", "tn-final"], "Accueil")], partitions: [{ page: "home", partition: "service-proximite:zone-dabord", why: pourquoi }] });
    const connu = { ...SERVICE, profil: { zone: true, telephone: true } };
    expect(O.ordreGaps(accueil("tn-ouverture"), connu).refus.join("\n")).toMatch(/le premier écran d'un service dit la ville et porte le téléphone cliquable \(règle d'or 1\) ; l'ouverture tn-ouverture ne porte pas la ville ou la zone desservie ni le téléphone cliquable, que le profil du client connaît : ouvre l'accueil par tn-ouverture-metier:photo-pleine ou tn-ouverture-metier:photo-centre ou tn-ouverture-metier:photo-bandeau/);
    expect(O.ordreGaps(accueil("tn-ouverture-metier"), connu).refus).toEqual([]);
    // Le profil ne connaît que le téléphone : seule cette absence est dite.
    const tel = O.ordreGaps(accueil("tn-ouverture"), { ...SERVICE, profil: { zone: false, telephone: true } }).refus.join("\n");
    expect(tel).toMatch(/ne porte pas le téléphone cliquable, que le profil/);
    expect(tel).not.toMatch(/la ville ou la zone desservie/);
    // Le profil ne connaît ni l'un ni l'autre, ou le site est une boutique : rien n'est réclamé.
    expect(O.ordreGaps(accueil("tn-ouverture"), { ...SERVICE, profil: { zone: false, telephone: false } }).refus.join("\n")).not.toMatch(/règle d'or 1/);
    expect(O.ordreGaps(accueil("tn-ouverture"), SERVICE).refus.join("\n")).not.toMatch(/règle d'or 1/);
  });
});

describe("thème unique, partitions : la taille du site et son devis, d'après les partitions", async () => {
  const X = await import("@/lib/syna-agent/custom-theme/site-job");
  const T = await import("@/lib/syna-agent/custom-theme/tools");

  it("un site de services et une boutique d'un produit : sections et photos, au plus et d'ordinaire", () => {
    const services = { business: "services" as const, products: 1 }, boutique = { business: "products" as const, products: 1 };
    expect(X.pagesImportantes(services)).toEqual(["accueil", "prestation", "a-propos", "contact", "questions"]);
    expect(X.pagesImportantes(boutique)).toEqual(["accueil", "fiche", "a-propos", "contact", "questions"]);
    expect(X.pagesImportantes({ business: "products", products: 3 })).toContain("boutique");
    for (const o of [services, boutique]) {
      const g = X.siteSizeGuess(o), pages = X.pagesImportantes(o).map((k) => X.pageSizeGuess(k, o));
      // L'accueil et la page qui vend : au moins dix d'ordinaire (le minimum bloquant), jamais plus que le plafond.
      expect(pages[0].sectionsUsual).toBeGreaterThanOrEqual(10);
      for (const p of pages) { expect(p.sectionsUsual).toBeLessThanOrEqual(p.sections); expect(p.photosUsual).toBeLessThanOrEqual(p.photos); expect(p.sections).toBeLessThanOrEqual(13); }
      // Le site : ses pages importantes, plus les pages utilitaires et la coque (neuf sections au plus).
      expect(g.sections).toBe(pages.reduce((n, p) => n + p.sections, 0) + 9);
      expect(g.sectionsUsual).toBeLessThan(g.sections);
      expect(g.photosUsual).toBeLessThan(g.photos);
    }
    // Les nombres d'aujourd'hui (ils suivent les partitions : un changement du cahier les fait bouger, et c'est voulu).
    expect(X.siteSizeGuess(services)).toEqual(TAILLE.services);
    expect(X.siteSizeGuess(boutique)).toEqual(TAILLE.boutique);
    // Chaque fiche de plus compte ses sections, jamais ses photos (celles de son produit).
    const quatre = X.siteSizeGuess({ business: "products", products: 6 }), deux = X.siteSizeGuess({ business: "products", products: 4 });
    expect(quatre.sections - deux.sections).toBe(2 * X.pageSizeGuess("fiche", { business: "products", products: 4 }).sections);
    expect(quatre.photos).toBe(deux.photos);
  });

  it("le devis suit la taille : il monte avec les sections et les photos, le probable ne dépasse jamais le plafond", () => {
    T.customPhotoDeps.unit = () => 150_000;
    try {
      const petit = X.siteQuoteFor({ sections: 32, sectionsUsual: 32, photos: 12, photosUsual: 12 }), svc = X.siteQuote({ business: "services", products: 1 }), shop = X.siteQuote({ business: "products", products: 1 });
      for (const q of [petit, svc, shop]) expect(q.probableMicro!).toBeLessThanOrEqual(q.maxMicro);
      expect(svc.maxMicro).toBeGreaterThan(petit.maxMicro);
      expect(svc.sections).toBe(TAILLE.services.sections);
      expect(shop.photos).toBe(TAILLE.boutique.photos);
    } finally { delete T.customPhotoDeps.unit; }
  });
});
/** La taille calculée le 17 novembre 2026 (voir le compte rendu du chantier). */
const TAILLE = {
  services: { sections: 64, sectionsUsual: 42, photos: 27, photosUsual: 19 },
  boutique: { sections: 58, sectionsUsual: 43, photos: 29, photosUsual: 15 },
};

describe("thème unique, partitions : la mise en boutique (Shopify)", async () => {
  const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
  const { validateCustomSection } = await import("@/lib/theme/ops");
  const input = (over: Record<string, unknown> = {}) => ({
    name: "Essai", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "services" as const,
    products: [], prestations: [], company: { shipping: null, returns: null }, site: SITE, assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: false, base: null, ...over,
  });
  const sec = (id: string, uid: string, construction?: string, html?: string) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: (html ?? tenueSection(id)!.html).replace(/photos\/(?!(?:carte|map|plan)-)[\w.-]+/g, "/api/files/a1") });
  const theme = (sections: ReturnType<typeof sec>[], home = sec("tn-ouverture", "o", "dans-la-photo", tenueSection("tn-ouverture")!.html)) => ({ version: 1, family: "classique", style: "classique", header: sec("tn-entete", "h"), footer: sec("tn-pied", "f"), search: null, rev: 0, at: 0, pages: [{ key: "home", label: "Accueil", sections: [home] }, { key: "contact", label: "Contact", sections }] }) as any;
  const liquidOf = (out: ReturnType<typeof customThemeSpec>, id: string) => Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))?.liquid ?? null;

  for (const [id, keys] of Object.entries(FACONS)) for (const c of keys) {
    it(`${id} · ${c} : une section Shopify valide, sans refus, sans rien d'exemple`, () => {
      const out = customThemeSpec(theme([sec(id, "s1", c, remplir(tenueSection(id)!.html))]), input({ site: { ...SITE, biens: [{ ...BIEN, photos: ["/api/files/b1", "/api/files/b2"] }] } }));
      const mine = out.problems.filter((x) => x.text.includes(tenueSection(id)!.title));
      expect(mine.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
      const l = liquidOf(out, id);
      expect(l, `${id} : envoyée`).toBeTruthy();
      expect(validateCustomSection(l!), `${id} · ${c} : contrôle du Studio`).toBeNull();
      expect(l!).toContain(`data-tn-c="${c}"`);
      expect(l!).not.toMatch(/À compléter|photos\/|onclick=|href="#"|\/api\/files\/|<script/);
    });
  }

  it("sans la donnée du client, la pièce n'est pas envoyée, et c'est dit", () => {
    for (const id of SANS_DONNEE_RIEN) {
      const out = customThemeSpec(theme([sec(id, "s1")]), input({ site: {} }));
      expect(liquidOf(out, id), id).toBeNull();
      expect(out.problems.map((x) => x.text).join("\n"), id).toMatch(new RegExp(`${tenueSection(id)!.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} : section non envoyée \\(elle ne se montre qu'avec l'information du client, qui manque\\)`));
      expect(out.problems.filter((x) => x.level === "bloquant" && x.text.includes(tenueSection(id)!.title))).toEqual([]);
    }
  });

  it("les filtres des réalisations et les liens des réseaux partent tels quels ; l'ouverture d'un service en photo pleine aussi", () => {
    const out = customThemeSpec(theme([sec("tn-realisations-types", "s1", "grille", remplir(tenueSection("tn-realisations-types")!.html)), sec("tn-reseaux", "s2", "pastilles")],
      sec("tn-ouverture-metier", "o", "photo-bandeau", tenueSection("tn-ouverture-metier")!.html.replace("[À compléter : ville]", "Lyon"))), input());
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    const filtres = liquidOf(out, "tn-realisations-types")!;
    expect(filtres.match(/<input type="radio" name="tn-pt-type" value="(?:tous|[abc])"/g)).toHaveLength(4); // le même groupe : un seul choix à la fois
    expect(filtres.match(/<figure data-tn-t="[abc]">/g)).toHaveLength(6);
    expect(liquidOf(out, "tn-reseaux")!).toContain('<a href="https://www.instagram.com/atelier.essai/" target="_blank" rel="noopener"><small>Instagram</small><b>@atelier.essai</b></a>');
    const ouverture = sp(liquidOf(out, "tn-ouverture-metier")!);
    expect(validateCustomSection(ouverture)).toBeNull();
    expect(ouverture).toContain('data-tn-c="photo-bandeau"');
    expect(ouverture).toContain('href="tel:0472000000"');
    expect(ouverture).toContain("Lyon, Villeurbanne, Bron et Caluire");
    // La feuille du site emporte les règles de ces pièces.
    const css = Object.values(out.spec.customSections).map((c) => c.liquid).join("\n");
    expect(css).toContain('.tn-ouverture-metier[data-tn-c="photo-bandeau"]');
    expect(css).toContain(".tn-realisations-types:has(input[value=");
  });
});

// ---------------------------------------------------------------- la planche de contrôle (à la demande)

const PALETTES = [
  { key: "calme", label: "palette calme", palette: { light: "#F6F1E7", dark: "#1F2A24", primary: "#2F4A3C", secondary: "#E9D8B8", accent: "#2F4A3C" }, tenue: { titres: "fins", bouton: "pilule", cadre: "droit", fond: "uni", petits: "normal", signe: "" } as Tenue, titre: "InstrumentSerif-400.ttf", italique: "InstrumentSerif-400italic.ttf" },
  { key: "difficile", label: "palette difficile (jaune vif)", palette: { light: "#FFF6E0", dark: "#1A1F3A", primary: "#FFD23F", secondary: "#2A3157", accent: "#FFD23F" }, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "" } as Tenue, titre: "Unbounded-800.ttf", italique: "Unbounded-400.ttf" },
];
const VUES = [{ key: "tel", label: "téléphone", width: 390, height: 844 }, { key: "ordi", label: "ordinateur", width: 1280, height: 860 }];

describe.runIf(!!process.env.PARTITIONS_OUT)("thème unique, partitions : la planche de contrôle (deux palettes, téléphone et ordinateur, contraste et débordement)", () => {
  it("chaque construction est rendue ; aucun texte sous un contraste de 3 ; rien ne dépasse à 320 px", async () => {
    const { chromium } = await import("playwright");
    const sharp = (await import("sharp")).default;
    const out = process.env.PARTITIONS_OUT!;
    fs.mkdirSync(path.join(out, "captures"), { recursive: true });
    const ouverture = remplir(tenueSection("tn-ouverture-metier")!.html.replace(/<small>[^<]*\[À compléter : ville\]<\/small>/, "<small>Le métier · Lyon</small>").replace(/<h1>[\s\S]*?<\/h1>/, "<h1>Le titre<br>de l'accueil.</h1>").replace(/<p>[\s\S]*?<\/p>/, "<p>Une phrase qui dit ce qui est fait, pour qui, et où.</p>"));
    const cases = [
      ...Object.entries(FACONS).flatMap(([id, keys]) => keys.map((c) => ({ id, c, key: `${id.slice(3)}--${c}`, html: rendu(id, c) }))),
      ...["photo-pleine", "photo-centre", "photo-bandeau"].map((c) => ({ id: "tn-ouverture-metier", c, key: `ouverture-metier--${c}`, html: D.withTenueSite(construit(ouverture, c), SITE) })),
    ];
    // (Sur la planche, les trois constructions des réalisations sont sur une même page : chacune garde son propre groupe de boutons.)
    for (const x of cases) { expect(x.html, x.key).toContain('class="tn '); x.html = x.html.replace(/name="tn-pt-type"/g, `name="tn-pt-type-${x.c}"`); }
    const css = TENUE_FILES.css.map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n");
    const page0 = (p: (typeof PALETTES)[number]) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
@font-face{font-family:"PlTitre";src:url(/fonts/${p.titre})}@font-face{font-family:"PlTitre";font-style:italic;src:url(/fonts/${p.italique})}
@font-face{font-family:"PlTexte";font-weight:400;src:url(/fonts/DMSans-400.ttf)}@font-face{font-family:"PlTexte";font-weight:600;src:url(/fonts/DMSans-700.ttf)}@font-face{font-family:"PlTexte";font-weight:800;src:url(/fonts/DMSans-700.ttf)}
html,body{margin:0}body{background:${p.palette.light}}:root{--f-title:"PlTitre",serif;--f-ui:"PlTexte",sans-serif}.pl-case{display:flow-root;padding-bottom:44px}
${tenueCss(p.palette, p.tenue)}
${css}</style></head><body><div class="ctw"${tenueAttrs(p.tenue)}>${cases.map((x) => `<div class="pl-case" data-case="${x.key}">${markMissing(x.html)}</div>`).join("")}</div></body></html>`;
    const ORIGIN = "http://planche.sina";
    const problemes: string[] = [];
    const browser = await chromium.launch();
    try {
      for (const p of PALETTES) {
        const html = page0(p);
        for (const vue of [...VUES, { key: "etroit", label: "320 px", width: 320, height: 700 }]) {
          const context = await browser.newContext({ viewport: { width: vue.width, height: vue.height }, reducedMotion: "reduce" });
          const page = await context.newPage();
          await page.route("**/*", async (route) => {
            const u = new URL(route.request().url());
            if (u.origin !== ORIGIN) return route.abort();
            if (u.pathname === "/") return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
            const f = u.pathname.startsWith("/fonts/") ? path.join(process.cwd(), "assets", "fonts", path.basename(u.pathname)) : path.join(DIR, decodeURIComponent(u.pathname.slice(1)));
            return fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".ttf") ? "font/ttf" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }) : route.fulfill({ status: 404 });
          });
          await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 45_000 });
          await page.evaluate(() => (document as any).fonts.ready);
          await page.waitForTimeout(200);
          const ou = `${p.key} · ${vue.label}`;
          // ── rien ne dépasse : ni la page, ni un texte hors de l'écran
          const large = await page.evaluate(() => {
            const out: string[] = [], vw = innerWidth;
            if (document.documentElement.scrollWidth - vw > 1) out.push(`la page dépasse de ${document.documentElement.scrollWidth - vw} px`);
            for (const el of Array.from(document.querySelectorAll<HTMLElement>(".pl-case"))) {
              const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
              for (let n = w.nextNode(); n; n = w.nextNode()) {
                if (!n.textContent || !n.textContent.trim()) continue;
                const r = document.createRange(); r.selectNodeContents(n);
                for (const b of Array.from(r.getClientRects())) if (b.width > 0 && (b.right > vw + 1 || b.left < -1)) { out.push(`${el.dataset.case} : « ${n.textContent.trim().slice(0, 40)} » sort de l'écran (${Math.round(b.left)} à ${Math.round(b.right)} px)`); break; }
              }
            }
            return out;
          });
          for (const x of large) problemes.push(`${ou} : ${x}`);
          // ── le contraste de chaque texte avec son fond
          const textes = await page.evaluate(() => {
            const parse = (c: string): number[] | null => {
              let m = /^rgba?\(([^)]+)\)/.exec(c);
              if (m) { const v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] ?? 1]; }
              m = /^color\(srgb ([^)]+)\)/.exec(c);
              if (m) { const v = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1]; }
              return null;
            };
            const over = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
            const pageBg = parse(getComputedStyle(document.body).backgroundColor) ?? [255, 255, 255, 1];
            const out: { cas: string; texte: string; fg: number[]; bg: number[] | null; rects: number[][] }[] = [];
            for (const el of Array.from(document.querySelectorAll<HTMLElement>(".pl-case"))) {
              const photos = Array.from(el.querySelectorAll<HTMLElement>(".tn-ph")).map((x) => x.getBoundingClientRect()).filter((b) => b.width > 0 && b.height > 0).map((b) => [b.left + scrollX, b.top + scrollY, b.width, b.height]);
              const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
              for (let n = w.nextNode(); n; n = w.nextNode()) {
                const texte = (n.textContent ?? "").trim(), parent = n.parentElement;
                if (!texte || !parent) continue;
                const cs = getComputedStyle(parent);
                if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
                const r = document.createRange(); r.selectNodeContents(n);
                const rects = Array.from(r.getClientRects()).filter((b) => b.width > 1 && b.height > 1).map((b) => [b.left + scrollX, b.top + scrollY, b.width, b.height]);
                if (!rects.length) continue;
                const fg = parse(cs.color);
                if (!fg) continue;
                // Le fond : les couleurs empilées sous le texte ; une image ou un dégradé demande de regarder les pixels.
                const layers: number[][] = []; let image = false, opaque = false;
                for (let a: HTMLElement | null = parent; a && !opaque; a = a.parentElement) {
                  const s = getComputedStyle(a);
                  for (const pseudo of ["::before", "::after"]) { const ps = getComputedStyle(a, pseudo); if (ps.content !== "none" && ps.backgroundImage !== "none" && a !== parent) image = true; }
                  if (s.backgroundImage !== "none") { image = true; break; }
                  const c = parse(s.backgroundColor);
                  if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) opaque = true; }
                }
                // Un texte posé sur une photo de la même pièce (ou qui la touche) : on regarde les pixels aussi.
                if (rects.some((t) => photos.some((ph) => t[0] < ph[0] + ph[2] && t[0] + t[2] > ph[0] && t[1] < ph[1] + ph[3] && t[1] + t[3] > ph[1]))) image = true;
                let bg: number[] | null = null;
                if (!image) { bg = opaque ? layers.pop()! : pageBg; for (const l of layers.reverse()) bg = over(l, bg); }
                out.push({ cas: el.dataset.case!, texte: texte.slice(0, 40), fg, bg, rects });
              }
            }
            return out;
          });
          const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
          const ratio = (a: number[], b: number[]) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
          const melange = (top: number[], under: number[]) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
          // Les textes posés sur une image : la page est capturée sans ses textes, et les pixels sous chaque ligne sont lus.
          const surImage = textes.filter((t) => !t.bg);
          let fond: { data: Buffer; width: number; height: number } | null = null;
          if (surImage.length) {
            const style = await page.addStyleTag({ content: ".pl-case *{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}" });
            const png = await page.screenshot({ type: "png", fullPage: true });
            await style.evaluate((n) => (n as HTMLElement).remove());
            const raw = await sharp(png, { limitInputPixels: false }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            fond = { data: raw.data, width: raw.info.width, height: raw.info.height };
          }
          const pixel = (x: number, y: number) => { const i = (Math.min(fond!.height - 1, Math.max(0, Math.round(y))) * fond!.width + Math.min(fond!.width - 1, Math.max(0, Math.round(x)))) * 4; return [fond!.data[i], fond!.data[i + 1], fond!.data[i + 2]]; };
          const vus = new Set<string>();
          for (const t of textes) {
            let pire = 99;
            if (t.bg) pire = ratio(melange(t.fg, t.bg), t.bg);
            else for (const [x, y, w, h] of t.rects) for (let i = 0; i <= 6; i++) for (const j of [0.18, 0.5, 0.78]) { const b = pixel(x + (w * i) / 6, y + h * j); /* jamais le bord : un soulignement à la couleur du texte s'y trouve */ pire = Math.min(pire, ratio(melange(t.fg, [...b, 1]), b)); }
            const k = `${t.cas}|${t.texte}`;
            if (pire < 3 && !vus.has(k)) { vus.add(k); problemes.push(`${ou} : ${t.cas} : « ${t.texte} » a un contraste de ${pire.toFixed(2)} avec son fond`); }
          }
          // ── les filtres des réalisations marchent pour de vrai : un toucher sur un type, il ne reste que ses réalisations
          for (const c of FACONS["tn-realisations-types"]) {
            const el = page.locator(`.pl-case[data-case="realisations-types--${c}"]`);
            const visibles = () => el.locator("figure").evaluateAll((list) => list.filter((f) => (f as HTMLElement).offsetParent !== null).map((f) => f.getAttribute("data-tn-t")));
            await el.locator('label[data-tn-t="b"]').click();
            const apres = await visibles();
            if (apres.join("") !== "bb") problemes.push(`${ou} : realisations-types--${c} : le filtre « b » laisse ${apres.join(",") || "rien"}`);
            await el.locator("label").first().click();
            if ((await visibles()).length !== 6) problemes.push(`${ou} : realisations-types--${c} : « Tout voir » ne remet pas les six réalisations`);
          }
          // ── les captures (téléphone et ordinateur)
          if (vue.key !== "etroit") for (const x of cases) {
            const el = page.locator(`.pl-case[data-case="${x.key}"]`);
            await el.scrollIntoViewIfNeeded();
            fs.writeFileSync(path.join(out, "captures", `${x.key}__${p.key}__${vue.key}.jpg`), await el.screenshot({ type: "jpeg", quality: 86 }));
          }
          await context.close();
        }
      }
    } finally { await browser.close(); }
    fs.writeFileSync(path.join(out, "controle.txt"), problemes.length ? problemes.join("\n") : "Aucun texte sous un contraste de 3 ; rien ne dépasse à 320 px.");

    // ── les planches : une par pièce (une ligne par construction : téléphone calme, téléphone difficile, ordinateur calme, ordinateur difficile), puis l'ensemble
    const W = 2400, GAP = 20, TEL = 250, ORDI = 915;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const bande = (texte: string, h: number, size: number, fill: string, bg: string) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="${GAP}" y="${Math.round(h * 0.68)}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${esc(texte)}</text></svg>`)).png().toBuffer();
    const ids = [...Object.keys(FACONS), "tn-ouverture-metier"];
    const planches: { buf: Buffer; h: number }[] = [];
    for (const id of ids) {
      const rows: { buf: Buffer; h: number }[] = [{ buf: await bande(`${tenueSection(id)!.title} (${id})`, 64, 30, "#ffffff", "#1b1a17"), h: 64 }];
      for (const x of cases.filter((c) => c.id === id)) {
        rows.push({ buf: await bande(`${x.c} : ${tenueSection(id)!.constructions.find((k) => k.key === x.c)!.label}`.slice(0, 170), 40, 19, "#1b1a17", "#e9e6df"), h: 40 });
        const cells: { input: Buffer; left: number; top: number }[] = []; let left = GAP, hmax = 0;
        for (const vue of VUES) for (const p of PALETTES) {
          const w = vue.key === "tel" ? TEL : ORDI;
          const img = await sharp(fs.readFileSync(path.join(out, "captures", `${x.key}__${p.key}__${vue.key}.jpg`))).resize({ width: w }).toBuffer({ resolveWithObject: true });
          cells.push({ input: img.data, left, top: GAP }); left += w + GAP; hmax = Math.max(hmax, img.info.height);
        }
        const h = hmax + GAP * 2;
        rows.push({ buf: await sharp({ create: { width: W, height: h, channels: 3, background: "#bdb9b0" } }).composite(cells).png().toBuffer(), h });
      }
      const H = rows.reduce((n, r) => n + r.h, 0); let top = 0;
      const buf = await sharp({ create: { width: W, height: H, channels: 3, background: "#bdb9b0" } }).composite(rows.map((r) => { const o = { input: r.buf, left: 0, top }; top += r.h; return o; })).jpeg({ quality: 84 }).toBuffer();
      fs.writeFileSync(path.join(out, `piece-${id.slice(3)}.jpg`), buf);
      planches.push({ buf, h: H });
    }
    const H = planches.reduce((n, r) => n + r.h, 0); let top = 0;
    await sharp({ create: { width: W, height: H, channels: 3, background: "#bdb9b0" }, limitInputPixels: false }).composite(planches.map((r) => { const o = { input: r.buf, left: 0, top }; top += r.h; return o; })).jpeg({ quality: 80 }).toFile(path.join(out, "pieces-nouvelles.jpg"));
    expect(problemes, problemes.join("\n")).toEqual([]);
  }, 900_000);
});
