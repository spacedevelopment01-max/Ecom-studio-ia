/**
 * Thème unique du Studio, chantier « vente » (lot 4, référence partie 15) : le site entier d'une boutique de vente
 * directe, au-delà de la fiche produit : l'accueil (bandeau à plusieurs messages, ouverture au macaron, cartes de
 * vente, « la différence », guide de choix), la collection en ajout rapide, la page d'arrivée d'une publicité
 * (en-tête et pied minimaux, ouverture d'article, raisons numérotées, équation, témoignages datés, barre du produit
 * collée) et la page des avis. Gratuit, sans IA, aucun appel réel.
 *
 * 1) Toujours : les pièces et leurs façons existent, chaque façon a ses règles dans la feuille du module, la feuille
 *    respecte les règles d'écriture, aucun exemple chiffré ; les vraies données sont posées depuis un catalogue d'essai
 *    inventé (des gourdes) ; sans avis, rien n'est inventé ; Shopify accepte les pièces.
 * 2) À la demande, VENTE_OUT=<dossier> : chaque façon est capturée sur téléphone et sur ordinateur, dans trois allures.
 *    VENTE_ONLY=tn-a,tn-b limite le rendu ; VENTE_ALLURES=calme,vive limite les allures.
 * 3) À la demande, VENTE_DEMO=<dossier> : deux pages entières d'un client inventé (accueil, page d'arrivée), téléphone et
 *    ordinateur.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TENUE_SECTIONS, markMissing, tenueSection, withTenueProducts, type TenueProduct } from "@/lib/syna-agent/custom-theme/tenue";
import { VENTE_FACONS, VENTE_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-vente";
import { PRODUIT_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-produit";
import { RECIT_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue-recit";
import * as D from "@/lib/syna-agent/custom-theme/tenue-data";
import * as F from "./tenue-fauteuil-fixtures";
import * as K from "./tenue-sac-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";
const DIR = path.join(process.cwd(), "public", "sections");
const SHEET = fs.readFileSync(path.join(DIR, "tenue-vente.css"), "utf8");
const html = (id: string) => tenueSection(id)!.html;
const rootOf = (id: string) => /class="tn (tn-[a-z0-9-]+)/.exec(html(id))![1];
const sp = (x: string) => x.replace(/ /g, " ");

/** Les pièces nouvelles et leurs façons : la première est le rendu d'origine. */
const PIECES: Record<string, string[]> = {
  "tn-messages": ["defilent", "tour-a-tour", "rangee"],
  "tn-ouverture-vente": ["photo-pleine", "texte-puis-photo"],
  "tn-produits-vente": ["cartes", "file", "lignes"],
  "tn-difference": ["panneau", "photo-a-cote"],
  "tn-guide-choix": ["volets", "cartes"],
  "tn-entete-arrivee": ["nom-a-gauche", "nom-au-centre"],
  "tn-ouverture-arrivee": ["colonne", "cote-a-cote"],
  "tn-raisons": ["colonne", "alternees"],
  "tn-equation": ["carte", "bande"],
  "tn-temoignages": ["cartes", "en-grand"],
  "tn-barre-produit": ["barre", "carte-flottante"],
  "tn-pied-arrivee": ["centre", "ligne"],
  "tn-avis-page": ["resume-en-haut", "resume-a-cote"],
};
/** Les façons ajoutées à des pièces d'autres modules (elles viennent à la suite de celles de la pièce). */
const AJOUTS: Record<string, string> = { "tn-garanties": "cases", "tn-atouts": "ronds", "tn-comment": "fleches", "tn-catalogue": "ajout-rapide" };

/** Règles de la feuille, hors commentaires et conditions : leurs sélecteurs. */
const selectors = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "").replace(/@(?:media|supports)[^{]*\{/g, "").split("}").map((r) => r.split("{")[0].trim()).filter(Boolean);
const split = (list: string) => { const out: string[] = []; let depth = 0, cur = ""; for (const ch of list) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };

/** Catalogue d'essai INVENTÉ pour les essais (aucun client réel) : des gourdes isothermes, deux familles, quatre produits. */
const GOURDES: TenueProduct[] = [
  { title: "Gourde Halte", image: "/api/files/g1", price: "34 €", cents: 3400, go: "product-gourde-halte", families: ["Les gourdes"] },
  { title: "Gourde Halte grand format", image: "/api/files/g2", price: "42 €", cents: 4200, go: "product-grand-format", families: ["Les gourdes"] },
  { title: "Bouchon sport", image: "/api/files/g3", price: "9 €", cents: 900, go: "product", families: ["Les accessoires"] },
  { title: "Housse de transport", image: null, price: "14 €", cents: 1400, go: "product", families: ["Les accessoires"], soldOut: true },
];
const EXTRAS: NonNullable<D.TenueVitrine["produits"]> = {
  "Gourde Halte": { genre: "Gourde isotherme", compare: "39 €", des: "34 €", versions: 3 },
  "Gourde Halte grand format": { genre: "Gourde isotherme", compare: null, des: null, versions: 2 },
  "Bouchon sport": { genre: "Accessoire", compare: null, des: null, versions: 1 },
  "Housse de transport": { genre: null, compare: null, des: null, versions: 1 },
};
/** Avis D'ESSAI, écrits pour les essais et marqués comme tels : jamais montrés à un vrai visiteur. */
const AVIS: D.TenueAvisVente[] = [
  { text: "Avis d'essai : elle garde le froid toute la journée, je ne pars plus sans.", name: "Client d'essai A", date: "2026-11-05", rating: 5, verified: true, product: "Gourde Halte", photos: ["/api/files/c1"] },
  { text: "Avis d'essai : légère, et elle ne fuit pas dans le sac.", name: "Client d'essai B", date: "2026-11-02", rating: 5, product: "Gourde Halte" },
  { text: "Avis d'essai : très pratique, mais le bouchon est un peu dur à ouvrir.", name: "Client d'essai C", date: "2026-10-14", rating: 3, verified: true, product: "Bouchon sport", reply: "Réponse d'essai : merci, on vous écrit pour l'échanger." },
  { text: "Avis d'essai : conforme, rien à redire.", name: "Client d'essai D", date: "2026-10-20", rating: 4 },
];
const SOURCE = { source: "la boutique d'essai", verifies: true, liste: AVIS };
const NOW = Date.parse("2026-11-16T12:00:00");

describe("thème unique, vente : les pièces et leurs façons, dessinées dans la feuille du module", () => {
  it("les treize pièces nouvelles sont dans la bibliothèque, avec des textes d'exemple neutres et sans chiffre", () => {
    expect(VENTE_SECTIONS.map((s) => s.id)).toEqual(Object.keys(PIECES));
    for (const s of VENTE_SECTIONS) {
      expect(TENUE_SECTIONS.some((x) => x.id === s.id), s.id).toBe(true);
      expect(s.constructions.map((c) => c.key), s.id).toEqual(PIECES[s.id]);
      expect(s.constructions.length, `${s.id} : deux façons au moins`).toBeGreaterThanOrEqual(2);
      // La racine est une « section » ou un « footer » : c'est elle que le rendu du Studio habille.
      expect(s.html, s.id).toMatch(/^<(?:section|footer) class="tn tn-/);
      const text = s.html.replace(/<svg[\s\S]*?<\/svg>/g, " ").replace(/\[À compléter[^\]]*\]/g, " ").replace(/<[^>]+>/g, " ");
      // Aucun texte tiré d'un projet d'essai ni du site lu pour la structure : ni thé, ni literie.
      expect(text, s.id).not.toMatch(/\bthé\b|infusion|tasse|jasmin|rooibos|sachet|couette|housse|oreiller|\bdraps?\b|literie|matelas|\bnuits?\b|dormir/i);
      // Aucun chiffre, prix, date, note ni prénom d'exemple : tout cela s'écrit « [À compléter : …] ».
      expect(text, `${s.id} : aucun chiffre d'exemple`).not.toMatch(/\d/);
      expect(text, s.id).not.toMatch(/€|%|@|★|☆/);
      // Jamais de fausse urgence.
      expect(`${text} ${s.does}`.replace(/jamais de fausse urgence \([^)]*\)/gi, " "), s.id).not.toMatch(/aujourd'hui seulement|dernières? pièces?|plus que \d|vendu à \d|offre limitée|stock (?:limité|part vite)/i);
      // Un seul bouton plein par pièce.
      expect((s.html.match(/class="tn-bt"/g) ?? []).length, `${s.id} : un seul bouton plein`).toBeLessThanOrEqual(1);
    }
    // Les pièces d'avis ne se posent jamais sans de vrais avis.
    for (const id of ["tn-temoignages", "tn-avis-page"]) expect(tenueSection(id)!.authentic, id).toBe("les avis de tes clients");
    // L'en-tête et le pied d'arrivée tiennent la coque d'une page d'arrivée ; le bandeau se pose au-dessus de l'en-tête.
    expect(tenueSection("tn-entete-arrivee")!.role).toBe("en-tête");
    expect(tenueSection("tn-pied-arrivee")!.role).toBe("pied de page");
    expect(tenueSection("tn-messages")!.group).toBe("bandeau");
  });

  it("les quatre façons ajoutées viennent à la suite de celles de la pièce, qui restent les siennes", () => {
    const avant: Record<string, string[]> = {
      "tn-garanties": PRODUIT_SECTIONS.find((s) => s.id === "tn-garanties")!.constructions.map((c) => c.key),
      "tn-comment": RECIT_SECTIONS.find((s) => s.id === "tn-comment")!.constructions.map((c) => c.key),
      "tn-catalogue": PRODUIT_SECTIONS.find((s) => s.id === "tn-catalogue")!.constructions.map((c) => c.key),
      "tn-atouts": ["lignes", "numeros", "cartes", "coches"],
    };
    expect(Object.keys(VENTE_FACONS)).toEqual(Object.keys(AJOUTS));
    for (const [id, key] of Object.entries(AJOUTS)) {
      const keys = tenueSection(id)!.constructions.map((c) => c.key);
      expect(keys, id).toEqual([...avant[id], key]);
      expect(tenueSection(id)!.constructions.at(-1)!.label.length, `${id} : dite en clair`).toBeGreaterThan(40);
    }
  });

  it("chaque façon nouvelle a ses règles dans la feuille du module ; aucune règle ne cible une façon d'origine", () => {
    const sels = selectors(SHEET).flatMap(split);
    const has = (root: string, key: string) => sels.some((s) => s.includes(`.${root}[data-tn-c="${key}"]`));
    for (const [id, keys] of Object.entries(PIECES)) {
      const root = rootOf(id);
      expect(sels.some((s) => s.startsWith(`.ctw .${root}`)), `${id} : dessinée dans la feuille`).toBe(true);
      for (const key of keys.slice(1)) expect(has(root, key), `${id} : règles de « ${key} »`).toBe(true);
      expect(has(root, keys[0]), `${id} : aucune règle pour « ${keys[0]} », son rendu d'origine`).toBe(false);
    }
    for (const [id, key] of Object.entries(AJOUTS)) expect(has(rootOf(id), key), `${id} : règles de « ${key} »`).toBe(true);
    // Une façon nouvelle d'une pièce d'un autre module ne touche à rien d'autre de cette pièce.
    for (const id of Object.keys(AJOUTS)) for (const s of sels.filter((x) => x.includes(`.${rootOf(id)}`))) expect(s, s).toContain(`[data-tn-c="${AJOUTS[id]}"]`);
  });

  it("la feuille respecte les règles : sélecteurs « .ctw .tn-… », une seule pièce par règle, aucune couleur en dur, aucun « !important », titres à l'échelle", () => {
    const css = SHEET.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toContain("!important");
    const hard = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|:\s*(?:white|black|red|gold|gr[ae]y)\b/i.exec(css.replace(/url\("data:[^"]*"\)/g, ""));
    expect(hard?.[0] ?? null, "aucune couleur écrite en dur").toBeNull();
    const roots = new Set(TENUE_SECTIONS.map((s) => /class="tn (tn-[a-z0-9-]+)/.exec(s.html)![1]));
    for (const s of selectors(SHEET).flatMap(split)) {
      expect(s, s).toMatch(/^\.ctw(?:\[data-tn-[a-z]+(?:="[a-z]+")?\]|:not\(\[data-tn-bouton\]\))? (?:\.tb-pg>)?\.tn-[a-z-]+/);
      // Shopify découpe la feuille par pièce : une règle n'appartient qu'à une seule pièce.
      const mine = [...new Set([...s.matchAll(/\.(tn-[a-z0-9-]+)/g)].map((m) => m[1]).filter((c) => roots.has(c)))];
      expect(mine.length, `${s} : une seule pièce`).toBe(1);
    }
    // Toute taille de h1 ou de h2 suit l'échelle des titres.
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      if (!split(m[1]).some((s) => /\sh[12]$/.test(s.trim()))) continue;
      const size = /font-size:([^;}]+)/.exec(m[2])?.[1];
      if (size) expect(size, `${m[1].trim()} : taille de titre à l'échelle`).toMatch(/^calc\(\d+px\*var\(--tn-k\)\)$/);
    }
    // Les classes créées par le module (« tn-v-… ») n'existent dans aucune autre feuille.
    const created = new Set([...SHEET.matchAll(/\.(tn-v-[a-z0-9-]+)/g)].map((m) => m[1]));
    expect(created.size).toBeGreaterThan(30);
    for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".css") && x !== "tenue-vente.css")) {
      const other = fs.readFileSync(path.join(DIR, f), "utf8");
      for (const c of created) expect(new RegExp(`\\.${c}(?![a-z0-9-])`).test(other), `${c} existe déjà dans ${f}`).toBe(false);
    }
    // Les classes des pièces elles-mêmes sont nouvelles, elles aussi.
    for (const id of Object.keys(PIECES)) for (const f of fs.readdirSync(DIR).filter((x) => x.endsWith(".css") && x !== "tenue-vente.css")) expect(new RegExp(`\\.${rootOf(id)}(?![a-z0-9-])`).test(fs.readFileSync(path.join(DIR, f), "utf8")), `${rootOf(id)} dans ${f}`).toBe(false);
  });

  it("le script du module ne fait que trier la page des avis, sans dépendance", () => {
    const js = fs.readFileSync(path.join(DIR, "tenue-vente.js"), "utf8");
    expect(js).toContain("window.tnVente");
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|import\s|require\(|https?:\/\//);
    expect((js.match(/querySelector(?:All)?\("([^"]+)"\)|matches\("([^"]+)"\)|closest\("([^"]+)"\)/g) ?? []).every((x) => /\.tn-/.test(x))).toBe(true);
  });
});

describe("thème unique, vente : les vraies données, depuis un catalogue d'essai inventé", () => {
  const site: D.TenueSite = { shipping: "Colissimo, 48 h, offerte dès 60 € d'achat", returns: "30 jours pour changer d'avis", products: GOURDES, vitrine: { produits: EXTRAS } };

  it("bandeau : la livraison et les retours du client ; l'offre seulement si sa date de fin n'est pas passée ; le paiement non donné s'en va", () => {
    const out = sp(D.withVenteMessages(html("tn-messages"), site, NOW));
    expect(out).toContain('<ul class="tn-v-fil" data-tn-messages data-tn-n="2"><li style="--i:0">Livraison : Colissimo, 48 h, offerte dès 60 € d\'achat</li><li style="--i:1">Retours : 30 jours pour changer d\'avis</li></ul>');
    // La liste est doublée pour un défilement sans fin ; la copie n'est pas lue.
    expect(out).toContain('<ul class="tn-v-fil tn-v-bis" aria-hidden="true"><li style="--i:0">Livraison');
    expect(out).not.toMatch(/À compléter|Paiement/);
    // Une vraie promotion datée : montrée jusqu'à sa date de fin, plus jamais ensuite.
    const offre = { label: "Moins dix pour cent sur les gourdes", fin: "2026-11-30" };
    expect(sp(D.withVenteMessages(html("tn-messages"), { ...site, vitrine: { offre, messages: ["Paiement en trois fois"] } }, NOW))).toContain('<li style="--i:2">Moins dix pour cent sur les gourdes, jusqu\'au 30 novembre 2026</li><li style="--i:3">Paiement en trois fois</li>');
    expect(D.withVenteMessages(html("tn-messages"), { ...site, vitrine: { offre: { ...offre, fin: "2026-11-01" } } }, NOW)).not.toContain("Moins dix");
    expect(D.offreActive({ label: "Offre", fin: "bientôt" }, NOW)).toBe(false);
    // Sans rien : la livraison et les retours restent à compléter (ils sont dus au client), rien d'autre.
    const none = D.withVenteMessages(markMissing(html("tn-messages")), {}, NOW);
    expect(none).toContain('data-tn-n="2"');
    expect(none).toContain('<li style="--i:0">Livraison : <mark class="tn-manque">À compléter : délai et prix</mark></li>');
    // Posée deux fois, la liste n'est pas doublée deux fois.
    expect(D.withVenteMessages(out, site, NOW)).toBe(out);
  });

  it("macaron : le chiffre vrai du client, sinon pas de macaron", () => {
    expect(D.withVenteMacaron(html("tn-ouverture-vente"), {})).not.toContain("tn-v-macaron");
    expect(D.withVenteMacaron(markMissing(html("tn-ouverture-vente")), {})).not.toContain("tn-v-macaron");
    expect(D.withVenteMacaron(html("tn-ouverture-vente"), { vitrine: { macaron: { chiffre: "+ 2 000", quoi: "gourdes en service" } } })).toContain('<div class="tn-v-macaron" data-tn-macaron><b>+ 2 000</b><span>gourdes en service</span></div>');
    // Un chiffre écrit dans la pièce (donné par le client au rédacteur) reste.
    const written = html("tn-ouverture-vente").replace(/<b>\[À compléter : chiffre vrai\]<\/b><span>[^<]*<\/span>/, "<b>12 ans</b><span>d'atelier</span>");
    expect(D.withVenteMacaron(written, {})).toContain("<b>12 ans</b><span>d'atelier</span>");
  });

  it("cartes de vente : genre, « dès », prix barré du catalogue, étiquette d'offre datée, « Épuisé » ; la ligne d'envie est celle écrite pour CE produit", () => {
    const ecrit = html("tn-produits-vente").replace("Nom du premier produit", "Gourde Halte").replace("Une ligne qui donne envie de celui-ci.", "Fraîche jusqu'au soir.");
    const out = sp(D.withVenteCartes(ecrit, site, NOW));
    expect(out).toContain('<a class="tn-v-carte" href="#" onclick="return false" data-go="product-gourde-halte"><div class="tn-ph" style="background-image:url(/api/files/g1)"></div><small>Gourde isotherme</small><b>Gourde Halte</b><span class="tn-v-envie">Fraîche jusqu\'au soir.</span><span class="tn-v-prix">dès 34 € <s>39 €</s></span><i class="tn-v-voir">Découvrir</i></a>');
    // Un produit sans ligne écrite n'en reçoit pas ; sans prix de comparaison, aucun prix barré ; sans genre, aucune étiquette.
    expect(out).toContain('<small>Accessoire</small><b>Bouchon sport</b><span class="tn-v-prix">9 €</span>');
    expect(out).toContain('<a class="tn-v-carte tn-epuise" href="#" onclick="return false" data-go="product"><div class="tn-ph"></div><b>Housse de transport</b><span class="tn-v-prix">Épuisé</span>');
    expect(out).not.toMatch(/Nom du (?:deuxième|troisième) produit|Genre du produit|Une ligne qui donne envie|À compléter|tn-v-offre/);
    expect((out.match(/<s>/g) ?? []).length).toBe(1);
    // L'étiquette d'offre : seulement pour une vraie promotion qui court encore, sur les produits qu'elle concerne, jamais sur un produit épuisé.
    const promo = sp(D.withVenteCartes(ecrit, { ...site, vitrine: { produits: EXTRAS, offre: { label: "Offre de rentrée", fin: "2026-12-01", produits: ["Gourde Halte"] } } }, NOW));
    expect((promo.match(/<em class="tn-v-offre">Offre de rentrée<\/em>/g) ?? []).length).toBe(1);
    expect(D.withVenteCartes(ecrit, { ...site, vitrine: { produits: EXTRAS, offre: { label: "Offre de rentrée", fin: "2026-10-01" } } }, NOW)).not.toContain("tn-v-offre");
    // Sans catalogue : la pièce garde son exemple, annoncé comme tel.
    expect(D.withVenteCartes(html("tn-produits-vente"), {})).toBe(html("tn-produits-vente"));
  });

  it("guide de choix : chaque envie mène au produit qu'elle nomme (photo, prix, fiche) ; une envie sans produit est retirée", () => {
    const ecrit = html("tn-guide-choix").replace("Nom du premier produit", "Bouchon sport").replace("Nom du deuxième produit", "gourde halte").replace("Nom du troisième produit", "Un produit qui n'existe pas");
    const out = sp(D.withVenteGuide(ecrit, site));
    expect((out.match(/<details class="tn-v-besoin"/g) ?? []).length).toBe(2);
    expect(out).toContain('<details class="tn-v-besoin" open><summary>Je veux le plus simple</summary><div class="tn-v-rep"><div class="tn-ph" style="background-image:url(/api/files/g3)"></div>');
    expect(out).toContain('<b data-tn-produit>Bouchon sport</b><span class="tn-v-prix">9 €</span><a class="tn-v-lien" href="#" onclick="return false" data-go="product">Découvrir</a>');
    expect(out).toContain('<b data-tn-produit>Gourde Halte</b><span class="tn-v-prix">34 €</span><a class="tn-v-lien" href="#" onclick="return false" data-go="product-gourde-halte">');
    expect(out).not.toMatch(/n'existe pas|photos\//);
    // Aucune envie ne nomme un produit (exemple de la bibliothèque) : elles suivent le catalogue, sans produit épuisé.
    const ordre = D.withVenteGuide(html("tn-guide-choix"), site);
    expect([...ordre.matchAll(/<b data-tn-produit>([^<]*)<\/b>/g)].map((m) => m[1])).toEqual(["Gourde Halte", "Gourde Halte grand format", "Bouchon sport"]);
    expect((ordre.match(/<details class="tn-v-besoin" open>/g) ?? []).length).toBe(1);
    // Façon « cartes » : toutes les envies sont ouvertes.
    expect((D.withVenteGuide(html("tn-guide-choix"), site, "cartes").match(/<details class="tn-v-besoin" open>/g) ?? []).length).toBe(3);
    expect(D.dataGaps(["tn-guide-choix"], { products: 1, families: 0 }).join(" ")).toMatch(/tn-guide-choix\) demande au moins deux produits/);
    expect(D.dataGaps(["tn-guide-choix"], { products: 2, families: 0 })).toEqual([]);
  });

  it("page d'arrivée : l'en-tête et la barre portent le nom, la photo et la fiche du premier produit en stock", () => {
    expect(D.withVenteArrivee(html("tn-entete-arrivee"), site)).toContain('<a class="tn-v-vers" href="#" onclick="return false" data-go="product-gourde-halte">Découvrir <span data-tn-produit-nom>Gourde Halte</span></a>');
    const bar = D.withVenteArrivee(html("tn-barre-produit"), site);
    expect(bar).toContain('<div class="tn-v-colle"><div class="tn-ph" style="background-image:url(/api/files/g1)"></div><p><b data-tn-produit-nom>Gourde Halte</b>');
    expect(bar).toContain('<a class="tn-bt" href="#" onclick="return false" data-go="product-gourde-halte">Découvrir</a>');
    expect(D.withVenteArrivee(html("tn-barre-produit"), {})).toBe(html("tn-barre-produit"));
  });

  it("sans avis, rien n'est inventé : pas d'avis sur la photo, pas de témoignage, pas de note ; seulement l'invitation à donner le premier", () => {
    for (const marked of [false, true]) {
      const src = (id: string) => (marked ? markMissing(html(id)) : html(id));
      expect(D.withVenteAvisPose(src("tn-ouverture-arrivee"), site), "ouverture").not.toMatch(/tn-v-pose|À compléter/);
      const t = D.withVenteTemoignages(src("tn-temoignages"), site);
      expect(t).toContain('<ul class="tn-v-avis-l"></ul>');
      expect(t).not.toMatch(/À compléter|tn-v-nuance|tn-v-source|tn-v-chapo|tn-v-etoiles/);
      expect(t).toContain("Donner le premier avis");
      const p = D.withVenteAvisPage(src("tn-avis-page"), site);
      expect(p).toContain('<ul class="tn-v-avis-l" data-tn-avis-liste></ul>');
      expect(p).not.toMatch(/À compléter|tn-v-resume|tn-v-barres|tn-v-moyenne|tn-v-tri|tn-v-source|étoiles|tn-v-etoiles/);
      expect(p).toContain("Donner le premier avis");
      // La feuille montre alors l'invitation, et elle seule.
      expect(SHEET).toContain(".ctw .tn-avis-page:not(:has(.tn-v-avis-l li)) .tn-v-premier{display:block");
    }
    // Un avis écrit dans la page des avis, sans source, ne compte pas : la note ne se calcule que sur une source.
    const ecrit = html("tn-avis-page").replace("[À compléter : avis d'un client]", "Très bien.").replace("[À compléter : prénom]", "Quelqu'un");
    expect(D.withVenteAvisPage(ecrit, site)).not.toMatch(/Très bien|Quelqu'un/);
    // La collection ne montre aucune étoile sans avis.
    expect(D.withVenteCatalogue(withTenueProducts(html("tn-catalogue"), GOURDES), site, "ajout-rapide")).not.toContain("tn-v-etoiles");
  });

  it("un vrai avis écrit dans la pièce reste (ouverture d'arrivée, témoignages) ; ses lignes encore à compléter s'en vont", () => {
    const pose = html("tn-ouverture-arrivee").replace("[À compléter : avis d'un client]", "«&nbsp;Je ne pars plus sans.&nbsp;»").replace("[À compléter : prénom et date]", "Client d'essai A");
    const out = D.withVenteAvisPose(pose, {});
    expect(out).toContain('<blockquote class="tn-v-pose"><p>«&nbsp;Je ne pars plus sans.&nbsp;»</p><cite>Client d\'essai A</cite></blockquote>');
    const t = html("tn-temoignages").replace("[À compléter : avis d'un client]", "Je ne pars plus sans.").replace("[À compléter : prénom]", "Client d'essai A").replace("[À compléter : date et note donnée]", "5 novembre 2026");
    const kept = D.withVenteTemoignages(t, {});
    expect(kept).toContain('<ul class="tn-v-avis-l"><li><blockquote>Je ne pars plus sans.</blockquote><b>Client d\'essai A</b><span>5 novembre 2026</span></li></ul>');
    expect(kept).not.toContain("tn-v-nuance");
    expect(kept).toContain("tn-v-source"); // la source reste due : « à compléter » tant qu'elle n'est pas dite
  });

  it("témoignages datés depuis une source : les mieux notés, et l'avis le moins bien noté montré à part quand les notes diffèrent", () => {
    const out = sp(D.withVenteTemoignages(html("tn-temoignages"), { ...site, vitrine: { avis: SOURCE } }));
    expect(out).toContain('<ul class="tn-v-avis-l"><li><blockquote>Avis d\'essai : elle garde le froid toute la journée, je ne pars plus sans.</blockquote><b>Client d\'essai A</b><span>5 novembre 2026 · Note donnée : 5/5</span></li>');
    expect((out.match(/<li>/g) ?? []).length).toBe(3);
    expect(out).toContain('<div class="tn-v-nuance"><b>Les avis ne disent pas tous la même chose.</b><blockquote>Avis d\'essai : très pratique, mais le bouchon est un peu dur à ouvrir.</blockquote><span>Client d\'essai C · 14 octobre 2026 · Note donnée : 3/5</span></div>');
    expect(out).toContain('<p class="tn-v-source">Avis recueillis par la boutique d\'essai, qui vérifie les achats. Ils sont repris tels qu\'ils ont été écrits.</p>');
    // Toutes les notes égales : aucun avis « réservé » n'est fabriqué.
    expect(D.withVenteTemoignages(html("tn-temoignages"), { vitrine: { avis: { source: "x", liste: AVIS.filter((a) => a.rating === 5) } } })).not.toContain("tn-v-nuance");
    // L'avis posé sur la photo : le mieux noté, avec ses étoiles et sa source.
    const pose = sp(D.withVenteAvisPose(html("tn-ouverture-arrivee"), { vitrine: { avis: SOURCE } }));
    expect(pose).toContain('<blockquote class="tn-v-pose"><i class="tn-v-etoiles" style="--note:5" role="img" aria-label="Note : 5 sur 5"></i><p>«&nbsp;Avis d\'essai : légère, et elle ne fuit pas dans le sac.&nbsp;»</p><cite>Client d\'essai B · 2 novembre 2026</cite><small>Avis recueilli par la boutique d\'essai</small></blockquote>');
  });

  it("page des avis : la note, le nombre et la répartition sont calculés ; « Achat vérifié » seulement si la source le dit", () => {
    const out = sp(D.withVenteAvisPage(html("tn-avis-page"), { ...site, vitrine: { avis: SOURCE } }));
    // (5 + 5 + 3 + 4) / 4 = 4,25 → 4,3
    expect(out).toContain('<div class="tn-v-moyenne"><b>4,3</b><i class="tn-v-etoiles" style="--note:4.3" role="img" aria-label="Note : 4,3 sur 5"></i><span>4 avis</span></div>');
    expect(out).toContain('<li><span>Cinq étoiles</span><i style="--part:50%"></i><em>2</em></li><li><span>Quatre étoiles</span><i style="--part:25%"></i><em>1</em></li><li><span>Trois étoiles</span><i style="--part:25%"></i><em>1</em></li><li><span>Deux étoiles</span><i style="--part:0%"></i><em>0</em></li>');
    // Du plus récent au plus ancien ; chaque avis porte sa date et sa note pour le tri.
    expect([...out.matchAll(/<li data-tn-date="([\d-]+)" data-tn-note="(\d)">/g)].map((m) => `${m[1]} ${m[2]}`)).toEqual(["2026-11-05 5", "2026-11-02 5", "2026-10-20 4", "2026-10-14 3"]);
    expect((out.match(/<em class="tn-v-verifie">Achat vérifié<\/em>/g) ?? []).length).toBe(2);
    expect(out).toContain('<div class="tn-v-photos"><div class="tn-ph" style="background-image:url(/api/files/c1)" role="img" aria-label="Photo envoyée par Client d\'essai A"></div></div>');
    // Le produit concerné mène à sa fiche ; la réponse de la marque est à part.
    expect(out).toContain('<a class="tn-v-produit" href="#" onclick="return false" data-go="product-gourde-halte"><i class="tn-ph" style="background-image:url(/api/files/g1)"></i><span>Gourde Halte</span></a>');
    expect(out).toContain('<div class="tn-v-reponse"><small>La réponse de la marque</small><p>Réponse d\'essai : merci, on vous écrit pour l\'échanger.</p></div>');
    expect(out).toContain("Avis recueillis par la boutique d'essai, qui vérifie les achats.");
    expect(out).not.toMatch(/À compléter/);
    // Un texte d'avis n'est jamais lu comme du code.
    expect(D.withVenteAvisPage(html("tn-avis-page"), { vitrine: { avis: { source: "x", liste: [{ text: "<b>gras</b>", name: "A<b>" }] } } })).toContain("<blockquote>&lt;b&gt;gras&lt;/b&gt;</blockquote>");
    expect(D.dateFr("2026-03-01")).toBe("1er mars 2026");
  });

  it("collection en ajout rapide : « Ajouter au panier » pour une seule version, « Choisir des options » sinon, rien pour un produit épuisé ; étoiles seulement avec de vrais avis", () => {
    const cards = D.withTenueCatalogue(withTenueProducts(html("tn-catalogue"), GOURDES), site);
    const out = sp(D.withVenteCatalogue(cards, { ...site, vitrine: { produits: EXTRAS, avis: SOURCE } }, "ajout-rapide"));
    expect(out).toContain('<div class="tn-carte-p" data-tn-fams="Les gourdes" data-tn-prix="3400"><a class="tn-v-vers" href="#" onclick="return false" data-go="product-gourde-halte"><div class="tn-ph" style="background-image:url(/api/files/g1)"></div><b>Gourde Halte</b><span class="tn-v-note"><i class="tn-v-etoiles" style="--note:5" role="img" aria-label="Note : 5 sur 5"></i><u>(2)</u></span><span>34 €</span></a><a class="tn-v-ajout" href="#" onclick="return false" data-go="product-gourde-halte">Choisir des options</a></div>');
    expect(out).toContain('<b>Bouchon sport</b><span class="tn-v-note"><i class="tn-v-etoiles" style="--note:3"');
    expect(out).toContain('<span>9 €</span></a><a class="tn-v-ajout" href="#" onclick="return false" role="button" data-pogo>Ajouter au panier</a></div>');
    expect(out).toMatch(/<div class="tn-carte-p tn-epuise"[^>]*><a class="tn-v-vers"[^>]*>(?:(?!<\/a>)[\s\S])*<em>Épuisé<\/em><\/a><\/div>/);
    // Un produit sans avis n'a aucune étoile.
    expect(out).toMatch(/<b>Gourde Halte grand format<\/b><span>42 €<\/span>/);
    // Les autres façons de la collection ne changent pas ; posée deux fois, la façon ne double rien.
    expect(D.withVenteCatalogue(cards, site, "grille")).toBe(cards);
    expect(D.withVenteCatalogue(out, site, "ajout-rapide")).toBe(out);
    // Le filtre de la page boutique retrouve toujours ses cartes (classe et attributs gardés).
    expect((out.match(/class="tn-carte-p[^"]*" data-tn-fams=/g) ?? []).length).toBe(4);
  });
});

describe("thème unique, vente : dans l'aperçu du Studio et dans Shopify", async () => {
  it("le catalogue du client donne le genre, le prix de comparaison, « dès » et le nombre de versions ; l'aperçu les montre", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { createProduct } = await import("@/lib/products/catalog");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme } = await import("@/lib/syna-agent/custom-theme/render");
    const pid = await project(await account());
    saveBrand(pid, F.FAUTEUIL_BRAND as any);
    createProduct(pid, { title: "Gourde Halte", images: [], price: 3900, compareAt: 4500, productType: "Gourde isotherme", categories: ["Les gourdes"], options: [{ name: "Contenance", values: ["Petite", "Grande"] }], variants: [{ options: ["Petite"], price: 3400 }, { options: ["Grande"], price: 3900 }] } as any);
    createProduct(pid, { title: "Bouchon sport", images: [], price: 900, compareAt: 900, productType: "", categories: ["Les accessoires"] } as any);
    saveCompany(pid, { shipping: "Colissimo, 48 h", returns: "30 jours" });
    const v = JSON.parse(sp(JSON.stringify(D.tenueVitrine(pid)))) as D.TenueVitrine;
    expect(v.produits!["Gourde Halte"]).toEqual({ genre: "Gourde isotherme", compare: "45 €", des: "34 €", versions: 2 });
    // Un prix de comparaison égal au prix n'est pas un prix barré.
    expect(v.produits!["Bouchon sport"]).toEqual({ genre: null, compare: null, des: null, versions: 1 });
    expect(JSON.parse(sp(JSON.stringify(D.tenueMetiers(pid).vitrine)))).toEqual(v);
    expect(v.avis ?? null, "aucune source d'avis dans le Studio pour l'instant").toBeNull();
    let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
    t = S.applyStructure(t, [{ op: "page", key: "home", label: "Accueil" }, { op: "add", page: "home", section: "tn-ouverture-vente" }, { op: "add", page: "home", section: "tn-produits-vente" }, { op: "add", page: "home", section: "tn-guide-choix", construction: "cartes" }, { op: "add", page: "home", section: "tn-avis-page" }, { op: "add", page: "home", section: "tn-barre-produit" },
      { op: "page", key: "shop", label: "La boutique" }, { op: "add", page: "shop", section: "tn-catalogue", construction: "ajout-rapide" },
      { op: "shell", slot: "header", section: "tn-entete-arrivee" }, { op: "shell", slot: "footer", section: "tn-pied-arrivee" }, { op: "extra", section: "tn-messages" }, { op: "tenue", tenue: F.FAUTEUIL_TENUE }]);
    const out = sp(renderCustomTheme(loadProject(pid), t));
    /** Un essai qui échoue dit ce qui manque, sans recopier toute la page. */
    const voit = (x: string | RegExp, quoi: string) => expect(typeof x === "string" ? out.includes(x) : x.test(out), quoi).toBe(true);
    voit('<link rel="stylesheet" href="/sections/tenue-vente.css">', "la feuille du module est chargée");
    voit('<script src="/sections/tenue-vente.js"></script>', "le script du module est chargé");
    voit(/<ul class="tn-v-fil" data-tn-messages data-tn-n="2"><li style="--i:0">Livraison : Colissimo, 48 h<\/li><li style="--i:1">Retours : 30 jours<\/li><\/ul>/, "le bandeau porte la livraison et les retours du client");
    voit('<small>Gourde isotherme</small><b>Gourde Halte</b><span class="tn-v-prix">dès 34 € <s>45 €</s></span>', "la carte de vente : genre, « dès », prix barré du catalogue");
    expect(out.includes("tn-v-macaron"), "aucun chiffre donné : pas de macaron").toBe(false);
    voit('<b data-tn-produit-nom>Gourde Halte</b>', "la barre collée porte le nom du produit");
    expect((out.match(/<details class="tn-v-besoin" open>/g) ?? []).length, "guide de choix en cartes : deux produits, deux envies ouvertes").toBe(2);
    voit(/<a class="tn-v-ajout"[^>]*>Choisir des options<\/a>/, "ajout rapide : choisir des options");
    voit(/<a class="tn-v-ajout"[^>]*data-pogo>Ajouter au panier<\/a>/, "ajout rapide : ajouter au panier");
    // La page des avis, sans source d'avis : ni note, ni étoile, ni avis.
    const avis = /class="tn tn-avis-page"[\s\S]*?<\/section>/.exec(out)![0];
    expect(/tn-v-resume|tn-v-etoiles|À compléter/.exec(avis)?.[0] ?? null).toBeNull();
    // Le contrôle du Studio accepte l'en-tête et le pied d'arrivée à leur place ; pas dans une page.
    const bad = (x: any) => S.checkCustomTheme(x).filter((p) => p.level === "bloquant").map((p) => p.text).join("\n");
    expect(bad(t)).not.toMatch(/en-tête|pied de page/i);
    expect(bad(S.applyStructure(t, [{ op: "add", page: "home", section: "tn-pied-arrivee" }]))).toMatch(/ne se pose pas dans une page/);
  });

  it("Shopify : les pièces partent avec de vraies fonctions de la boutique, sans rien d'exemple ni script", async () => {
    const { customThemeSpec } = await import("@/lib/syna-agent/custom-theme/to-shopify");
    const { validateCustomSection } = await import("@/lib/theme/ops");
    const products = [{ handle: "gourde-halte", title: "Gourde Halte", categories: ["Les gourdes"] }, { handle: "bouchon-sport", title: "Bouchon sport", categories: ["Les accessoires"] }, { handle: "grand-format", title: "Gourde Halte grand format", categories: ["Les gourdes"] }];
    const input = { name: "Halte", palette: { dark: "#1F2A24", primary: "#B4532A", secondary: "#E9D8B8", accent: "#B4532A", light: "#F6F1E7" }, fonts: { heading: "instrument_serif", body: "dm_sans" }, business: "products" as const, products, company: { shipping: "Colissimo, 48 h", returns: "30 jours" }, assetExt: () => "jpg", linkMap: {}, logoAssetId: null, dropMissing: true, base: null };
    const sec = (id: string, uid: string, construction?: string, edit: (h: string) => string = (h) => h) => ({ uid, id, clientTexts: true, ...(construction ? { construction } : {}), html: edit(html(id).replace(/photos\/[\w.-]+/g, "/api/files/a1")) });
    const t: any = { version: 1, family: "classique", style: "classique", header: sec("tn-entete-arrivee", "h"), footer: sec("tn-pied-arrivee", "f"), search: null, rev: 0, at: 0, extras: [sec("tn-messages", "m")],
      pages: [
        { key: "home", label: "Accueil", sections: [sec("tn-ouverture-vente", "o"), sec("tn-garanties", "g", "cases"), sec("tn-produits-vente", "p", "cartes", (h) => h.replace("Nom du premier produit", "Gourde Halte").replace("Une ligne qui donne envie de celui-ci.", "Fraîche jusqu'au soir.")), sec("tn-difference", "d"), sec("tn-atouts", "a", "ronds"), sec("tn-guide-choix", "c", "cartes", (h) => h.replace("Nom du premier produit", "Bouchon sport")), sec("tn-comment", "k", "fleches")] },
        { key: "product", label: "Fiche produit", sections: [sec("tn-achat", "buy")] },
        { key: "shop", label: "La boutique", sections: [sec("tn-catalogue", "cat", "ajout-rapide")] },
        { key: "raisons", label: "Les raisons", sections: [sec("tn-ouverture-arrivee", "oa"), sec("tn-raisons", "r", "alternees"), sec("tn-equation", "e", "bande"), sec("tn-temoignages", "t"), sec("tn-barre-produit", "b", "carte-flottante")] },
        { key: "avis", label: "Les avis", sections: [sec("tn-avis-page", "av")] },
        { key: "legal", label: "Informations légales", sections: [sec("tn-legal", "lg")] },
      ] };
    const out = customThemeSpec(t, input);
    expect(out.problems.filter((x) => x.level === "bloquant").map((x) => x.text)).toEqual([]);
    const liquid = (id: string) => sp(Object.values(out.spec.customSections).find((c) => c.liquid.includes(`(${id})`))!.liquid);
    for (const [type, c] of Object.entries(out.spec.customSections)) {
      if (type === "es-custom-buy") continue; // le bloc d'achat appartient à un autre chantier
      expect(validateCustomSection(c.liquid), `${type} : contrôle du Studio`).toBeNull();
      expect(/À compléter|photos\/|onclick=|onsubmit=|data-go=|href="#"|\/api\/files\/|<script|data-pogo/.exec(c.liquid)?.[0] ?? null, `${type} : rien d'exemple, aucun geste de l'aperçu`).toBeNull();
    }
    // Le bandeau part avec l'en-tête : la livraison et les retours du client, et ses mouvements.
    expect(out.spec.groups.header!.order[0]).toBe("tn-m");
    expect(liquid("tn-messages")).toContain('<li style="--i:0">Livraison : Colissimo, 48 h</li><li style="--i:1">Retours : 30 jours</li>');
    expect(liquid("tn-messages")).toContain("<style>@keyframes tn-v-defile{to{transform:translateX(-100%)}}");
    // L'ouverture sans chiffre : pas de macaron.
    expect(liquid("tn-ouverture-vente")).not.toContain("tn-v-macaron");
    // Cartes de vente : la boutique donne la photo, le genre, le prix (« dès » si les versions diffèrent), le vrai prix de comparaison, le stock.
    const cards = liquid("tn-produits-vente");
    expect(cards).toContain('{%- for product in collections.all.products limit: 8 -%}<a class="tn-v-carte{% unless product.available %} tn-epuise{% endunless %}" href="{{ product.url }}">');
    expect(cards).toContain("{%- if product.type != blank -%}<small>{{ product.type }}</small>{%- endif -%}<b>{{ product.title }}</b>{%- case product.handle -%}{%- when 'gourde-halte' -%}<span class=\"tn-v-envie\">Fraîche jusqu'au soir.</span>{%- endcase -%}");
    expect(cards).toContain("{%- if product.price_varies -%}dès {% endif -%}{{ product.price_min | money }}{%- if product.compare_at_price_min > product.price_min %} <s>{{ product.compare_at_price_min | money }}</s>{%- endif -%}{%- else -%}Épuisé{%- endif -%}");
    // Guide de choix : l'envie qui nomme un produit mène à lui ; les autres, qui n'en nomment aucun du catalogue, sont retirées.
    const guide = liquid("tn-guide-choix");
    expect(guide).toContain(`<details class="tn-v-besoin" open>{%- assign choix1 = all_products['bouchon-sport'] -%}<summary>Je veux le plus simple</summary>`);
    expect(guide).toContain('<b data-tn-produit>{{ choix1.title }}</b><span class="tn-v-prix">{{ choix1.price | money }}</span><a class="tn-v-lien" href="{{ choix1.url }}">Découvrir</a>');
    expect((guide.match(/<details class="tn-v-besoin"/g) ?? []).length).toBe(1);
    // Page d'arrivée : l'en-tête et la barre portent le produit, lu dans la boutique.
    expect(liquid("tn-entete-arrivee")).toContain(`{%- assign vedette = all_products['gourde-halte'] -%}`);
    expect(liquid("tn-entete-arrivee")).toContain('href="{{ vedette.url }}">Découvrir <span data-tn-produit-nom>{{ vedette.title }}</span></a>');
    expect(liquid("tn-barre-produit")).toContain('<b data-tn-produit-nom>{{ vedette.title }}</b>');
    expect(liquid("tn-barre-produit")).toContain('data-tn-c="carte-flottante"');
    expect(/<a class="tn-v-lien" href="\{\{ routes\.root_url \}\}pages\/[a-z-]+">Mentions légales<\/a>/.test(liquid("tn-pied-arrivee")), "le pied mène à la page des mentions légales").toBe(true);
    // Les raisons : le texte part tel quel, les numéros viennent de la feuille.
    expect(liquid("tn-raisons")).toContain('<ol class="tn-v-liste"><li><h2>La première raison, dite en une phrase entière.</h2>');
    // Avis : aucune application d'avis ne remplit ces pièces ; elles partent sans note ni avis, avec la seule invitation.
    for (const id of ["tn-temoignages", "tn-avis-page"]) { expect(liquid(id)).not.toMatch(/tn-v-etoiles|tn-v-resume|tn-v-nuance|<blockquote>/); expect(liquid(id)).toContain("Donner le premier avis"); }
    // Collection en ajout rapide : un vrai formulaire d'achat pour une seule version, sinon le lien vers la fiche.
    const cat = liquid("tn-catalogue");
    expect(cat).toContain('data-tn-c="ajout-rapide"');
    expect(cat).toContain(`<div class="tn-carte-p{% unless product.available %} tn-epuise{% endunless %}"><a class="tn-v-vers" href="{{ product.url }}">`);
    expect(cat).toContain(`{%- if product.available -%}{%- if product.has_only_default_variant -%}{%- form 'product', product, class: 'tn-v-achat' -%}<input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}"><button class="tn-v-ajout" type="submit" name="add">Ajouter au panier</button>{%- endform -%}{%- else -%}<a class="tn-v-ajout" href="{{ product.url }}">Choisir des options</a>{%- endif -%}{%- endif -%}</div>{%- endfor -%}`);
    // La feuille de chaque pièce part avec l'en-tête.
    const head = liquid("tn-entete-arrivee");
    for (const root of ["tn-raisons", "tn-difference", "tn-equation", "tn-barre-produit"]) expect(head, root).toContain(`.ctw .${root}`);
    expect(head).toContain('.ctw .tn-catalogue[data-tn-c="ajout-rapide"] .tn-v-ajout');
  });
});

// ════════════════════════════════════════════════════════════════ captures (à la demande)

/** Trois allures très différentes : une pièce doit tenir dans les trois. */
const VIF_BRAND = {
  name: "Zeste", nameStatus: "validated", alternatives: [], tagline: "", positioning: "Des couleurs franches.", audience: "", personality: ["joyeuse", "franche"],
  tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] },
  palette: { primary: "#FF4F6D", secondary: "#FFD43B", accent: "#FF4F6D", light: "#FFF6DC", dark: "#1D1A3A" },
  fonts: { heading: "unbounded_n8", body: "dm_sans" }, logo: { concept: "", status: "proposed" },
} as const;
const ALLURES = [
  { key: "calme", brand: F.FAUTEUIL_BRAND, tenue: { ...F.FAUTEUIL_TENUE }, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 5), names: ["Fauteuil Alcôve terracotta", "Repose-pieds Alcôve", "Coussin Alcôve", "Plaid Alcôve", "Lampe Alcôve"] },
  { key: "brute", brand: K.SAC_BRAND, tenue: { ...K.SAC_TENUE }, dir: K.SAC_DIR, photos: K.SAC_PRODUCT_PHOTOS, names: ["Sac de voyage Traverse kaki", "Trousse Traverse", "Sangle Traverse"] },
  { key: "vive", brand: VIF_BRAND, tenue: { titres: "capitales", bouton: "ombre", cadre: "penche", fond: "uni", petits: "normal", signe: "le zeste" } as const, dir: undefined as string | undefined, photos: F.PRODUCT_PHOTOS.slice(0, 4), names: ["Infusion pêche", "Infusion fraise", "Infusion citron", "Infusion menthe"] },
];
const ORIGIN = "http://theme.sina";
/** Sert le thème rendu, ses feuilles, ses photos et ses polices depuis le Studio lui-même : aucun appel extérieur. */
async function serve(page: any, body: string, extra: Record<string, string> = {}) {
  const { getAsset, assetData } = await import("@/lib/library");
  const { fontFilePath } = await import("@/lib/theme/render");
  await page.route("**/*", async (route: any) => {
    const u = new URL(route.request().url());
    if (u.origin !== ORIGIN) return route.abort();
    if (u.pathname === "/") return route.fulfill({ body, contentType: "text/html; charset=utf-8" });
    if (extra[u.pathname]) return route.fulfill({ body: fs.readFileSync(extra[u.pathname]), contentType: extra[u.pathname].endsWith(".webp") ? "image/webp" : "image/jpeg" });
    if (u.pathname.startsWith("/sections/")) { const f = path.join(DIR, decodeURIComponent(u.pathname.slice("/sections/".length))); return fs.existsSync(f) ? route.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith(".css") ? "text/css" : f.endsWith(".js") ? "text/javascript" : f.endsWith(".webp") ? "image/webp" : "image/jpeg" }) : route.fulfill({ status: 404 }); }
    const file = /^\/api\/files\/([\w-]+)/.exec(u.pathname);
    if (file) { const x = getAsset(file[1]); return x ? route.fulfill({ body: assetData(x), contentType: x.mime }) : route.fulfill({ status: 404 }); }
    const font = /^\/api\/syna\/fonts\/(.+)$/.exec(u.pathname);
    if (font) { const f = fontFilePath(decodeURIComponent(font[1])); return f ? route.fulfill({ body: fs.readFileSync(f), contentType: "font/ttf" }) : route.fulfill({ status: 404 }); }
    return route.fulfill({ status: 404 });
  });
}
const VUES = [{ key: "tel", width: 390, height: 844 }, { key: "ordi", width: 1280, height: 860 }];

describe.runIf(!!process.env.VENTE_OUT)("thème unique, vente : captures de chaque façon, trois allures, téléphone et ordinateur", () => {
  it("chaque façon est rendue ; rien ne dépasse de l'écran, même à 320 px", async () => {
    const { account, project } = await import("./conversation209-fixtures");
    const { saveBrand, loadProject } = await import("@/lib/projects");
    const { saveCompany } = await import("@/lib/syna-agent/activity");
    const { saveAsset } = await import("@/lib/library");
    const { createProduct } = await import("@/lib/products/catalog");
    const { chromiumPath } = await import("@/lib/theme/snapshot");
    const S = await import("@/lib/syna-agent/custom-theme/theme");
    const { renderCustomTheme, tenueProducts } = await import("@/lib/syna-agent/custom-theme/render");
    const { chromium } = await import("playwright");
    const out = process.env.VENTE_OUT!;
    fs.mkdirSync(out, { recursive: true });
    const only = (process.env.VENTE_ONLY ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const allures = ALLURES.filter((a) => !process.env.VENTE_ALLURES || process.env.VENTE_ALLURES.split(",").includes(a.key));
    const SHELL = ["tn-entete-arrivee", "tn-pied-arrivee", "tn-barre-produit", "tn-messages"];
    const all: Record<string, string[]> = { ...PIECES, ...Object.fromEntries(Object.entries(AJOUTS).map(([id, k]) => [id, [k]])) };
    const ids = Object.keys(all).filter((id) => !SHELL.includes(id) && (!only.length || only.includes(id)));
    const pages = ids.flatMap((id) => all[id].map((c) => ({ key: `${id.slice(3)}--${c}`.slice(0, 40), id, construction: c })));
    const overflow: string[] = [];
    const browser = await chromium.launch({ executablePath: chromiumPath() ?? process.env.CHROMIUM, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    try {
      for (const a of allures) {
        const user = await account();
        const pid = await project(user);
        saveBrand(pid, a.brand as any);
        for (const [i, f] of a.photos.entries()) {
          const asset = await saveAsset({ projectId: pid, userId: user.id, data: await F.photo(f, undefined, a.dir), name: f.replace(".webp", ".jpg"), mime: "image/jpeg", role: "original", origin: "upload" });
          // Le premier produit a deux versions à des prix différents et un vrai prix de comparaison ; le dernier est épuisé.
          createProduct(pid, { title: a.names[i], images: [{ assetId: asset.id }], price: [14900, 3900, 1900, 5900, 8900][i], compareAt: i === 0 ? 17900 : null, productType: ["Pièce phare", "Complément", "Accessoire", "Accessoire", ""][i], categories: [i < 2 ? "La gamme" : "Les accessoires"],
            ...(i === 0 ? { options: [{ name: "Taille", values: ["Petit", "Grand"] }], variants: [{ options: ["Petit"], price: 12900 }, { options: ["Grand"], price: 14900 }] } : {}), ...(i === a.photos.length - 1 && i > 1 ? { variants: [{ options: [], stock: 0 }] } : {}) } as any);
        }
        saveCompany(pid, { shipping: "Colissimo, 48 h, offerte dès 250 € d'achat", returns: "30 jours pour changer d'avis" });
        const products = tenueProducts(pid);
        // Avis d'essai rattachés aux produits de l'allure, pour juger les pièces d'avis remplies (le Studio n'a pas encore de source d'avis).
        const avis = { source: "la boutique d'essai", verifies: true, liste: AVIS.map((x, i) => ({ ...x, product: x.product ? a.names[i % 2] : null, photos: x.photos ? [products[0].image!, products[1].image!] : undefined })) };
        const site: D.TenueSite = { shipping: "Colissimo, 48 h, offerte dès 250 € d'achat", returns: "30 jours pour changer d'avis", products, vitrine: { ...D.tenueVitrine(pid), avis, macaron: { chiffre: "+ 2 000", quoi: "clients d'essai" }, offre: { label: "Offre d'essai", fin: "2099-01-01", produits: [a.names[1]] } } };
        let t: any = { version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages: [], rev: 0, at: Date.now() };
        t = S.applyStructure(t, [
          ...pages.flatMap((p) => [{ op: "page", key: p.key, label: p.key } as const, { op: "add", page: p.key, section: p.id, construction: p.construction } as const]),
          { op: "page", key: "arrivee", label: "arrivee" }, { op: "add", page: "arrivee", section: "tn-ouverture-arrivee" }, { op: "add", page: "arrivee", section: "tn-raisons" }, { op: "add", page: "arrivee", section: "tn-barre-produit" },
          { op: "shell", slot: "header", section: "tn-entete-arrivee" }, { op: "shell", slot: "footer", section: "tn-pied-arrivee" }, { op: "extra", section: "tn-messages" }, { op: "tenue", tenue: a.tenue },
        ]);
        const rendered = renderCustomTheme(loadProject(pid), t, { embed: true });
        for (const view of VUES) {
          const context = await browser.newContext({ viewport: { width: view.width, height: view.height } });
          const page = await context.newPage();
          await serve(page, rendered);
          await page.goto(`${ORIGIN}/`, { waitUntil: "load", timeout: 45_000 });
          const name = (what: string) => path.join(out, `${what}__${a.key}__${view.key}.jpg`);
          const wide = async (what: string) => { const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, vw: innerWidth })); if (m.w - m.vw > 1) overflow.push(`${what} · ${a.key} · ${view.key} (${m.vw} px) : dépasse de ${m.w - m.vw} px`); };
          // Les pièces de coque ne gênent pas la capture d'une pièce seule.
          const hide = await page.addStyleTag({ content: ".tn-entete-arrivee,.tn-pied-arrivee,.tn-messages{display:none}" });
          for (const p of pages) {
            await page.evaluate((k) => { (window as any).ctGo(k); scrollTo(0, 0); }, p.key);
            // Les pièces d'avis et la collection se jugent avec les avis d'essai : le Studio les pose comme il le fera avec une vraie source.
            if (["tn-avis-page", "tn-temoignages", "tn-ouverture-arrivee", "tn-ouverture-vente", "tn-produits-vente", "tn-catalogue"].includes(p.id)) {
              const base = p.id === "tn-catalogue" ? D.withTenueCatalogue(withTenueProducts(html(p.id), products), site) : html(p.id);
              const filled = D.withTenueSite(markMissing(base).replace(/^<section\b/, `<section data-tn-c="${p.construction}"`), site, p.construction);
              await page.evaluate(([k, h]) => { const el = document.querySelector(`.tb-pg[data-pg="${k}"] .tn`)!; el.outerHTML = h; }, [p.key, filled]);
            }
            await page.waitForTimeout(160);
            const h = await page.evaluate(() => document.documentElement.scrollHeight);
            fs.writeFileSync(name(p.key), await page.screenshot({ type: "jpeg", quality: 82, fullPage: true, clip: { x: 0, y: 0, width: view.width, height: Math.min(h, 3600) } }));
            await wide(p.key);
            // Rien ne déborde sur un petit téléphone.
            if (view.key === "tel") { await page.setViewportSize({ width: 320, height: 700 }); await page.waitForTimeout(60); await wide(p.key); await page.setViewportSize({ width: view.width, height: view.height }); }
          }
          // La coque d'une page d'arrivée : bandeau, en-tête, barre collée, pied, dans chacune de leurs façons.
          if (!only.length || only.some((x) => SHELL.includes(x))) {
            await page.evaluate((el) => el.remove(), hide);
            await page.evaluate(() => { (window as any).ctGo("arrivee"); });
            for (let i = 0; i < 3; i++) {
              await page.evaluate((n) => { for (const [sel, keys] of [[".tn-messages", ["defilent", "tour-a-tour", "rangee"]], [".tn-entete-arrivee", ["nom-a-gauche", "nom-au-centre", "nom-a-gauche"]], [".tn-barre-produit", ["barre", "carte-flottante", "barre"]], [".tn-pied-arrivee", ["centre", "ligne", "centre"]]] as [string, string[]][]) document.querySelector(sel)!.setAttribute("data-tn-c", keys[n]); }, i);
              await page.evaluate(() => scrollTo(0, 0));
              await page.waitForTimeout(700);
              fs.writeFileSync(name(`coque-${i + 1}--haut`), await page.screenshot({ type: "jpeg", quality: 84, clip: { x: 0, y: 0, width: view.width, height: 360 } }));
              await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
              await page.waitForTimeout(500);
              fs.writeFileSync(name(`coque-${i + 1}--bas`), await page.screenshot({ type: "jpeg", quality: 84 }));
              await wide(`coque-${i + 1}`);
              if (view.key === "tel") { await page.setViewportSize({ width: 320, height: 700 }); await page.waitForTimeout(60); await wide(`coque-${i + 1}`); await page.setViewportSize({ width: view.width, height: view.height }); }
            }
            // La barre collée reste au bas de l'écran pendant la lecture ; elle ne couvre pas le dernier lien du pied.
            const bar = await page.evaluate(() => { const b = document.querySelector(".tn-barre-produit .tn-v-colle")!.getBoundingClientRect(), l = [...document.querySelectorAll(".tn-pied-arrivee a")].pop()!.getBoundingClientRect(); return { bottom: Math.round(innerHeight - b.bottom), free: l.bottom <= b.top }; });
            expect(bar.bottom, "la barre est au bas de l'écran").toBeLessThanOrEqual(1);
            expect(bar.free, "le pied reste lisible au-dessus de la barre").toBe(true);
            // Zones à toucher : 44 px au moins pour les liens et boutons du module.
            const small = await page.evaluate(() => [...document.querySelectorAll(".tn-entete-arrivee a,.tn-pied-arrivee a,.tn-barre-produit a")].map((x) => ({ t: (x.textContent || "").trim().slice(0, 30), h: Math.round(x.getBoundingClientRect().height) })).filter((x) => x.h < 44));
            expect(small, "zones à toucher").toEqual([]);
          }
          await context.close();
        }
      }
    } finally { await browser.close().catch(() => {}); }
    expect(overflow, "rien ne dépasse de l'écran en largeur").toEqual([]);
  }, 900_000);
});
