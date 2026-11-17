/**
 * Tour des sections : le rendu d'une pièce, hors du Studio, avec les fonctions du Studio.
 *
 * - La page (en-tête du document, feuilles, scripts, réglages, polices et couleurs de la marque) est celle que
 *   `renderCustomTheme` écrit pour un thème vide : le banc n'en réécrit rien.
 * - Le contenu de la page est monté comme le fait `renderCustomTheme` (mêmes fonctions, même ordre) : `sectionMarkup`,
 *   `withTenueBuyBlock`, `withTenueProducts`, `withTenuePrestations`, `withTenueSite`, `realMap`, `withTenueAchat`,
 *   `withMenu`, puis `withoutExampleProducts` et `withoutMissingPhotos`. La fonction `memeQueLeStudio` vérifie que ce
 *   montage rend, au caractère près, ce que le Studio rend (elle est appelée par l'essai).
 * - Les données viennent d'une base d'essai jetable (DATA_DIR, hors dépôt), remplie par les fonctions du Studio, et de
 *   quelques données posées à la main là où le Studio n'a pas encore de source facile à remplir (biens, carte, réseaux,
 *   articles, avis du client « difficile »).
 *
 * IMPORTANT : `process.env.DATA_DIR` doit pointer vers un dossier jetable AVANT le premier import de ce fichier
 * (voir tour.ts) : le banc n'écrit jamais dans les données du Studio.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createUser } from "../../src/lib/auth";
import { id as newId, now, run } from "../../src/lib/db";
import { getSubscription, alignPeriod, syncAllowance } from "../../src/lib/billing";
import { createProjectWithSubscription } from "../../src/lib/project-billing";
import { saveBrand, saveServices, loadProject } from "../../src/lib/projects";
import { saveCompany } from "../../src/lib/syna-agent/activity";
import { saveAsset, getAsset } from "../../src/lib/library";
import { storagePath } from "../../src/lib/storage";
import { createProduct } from "../../src/lib/products/catalog";
import { saveShopOffers } from "../../src/lib/syna-agent/product-features";
import * as S from "../../src/lib/syna-agent/custom-theme/theme";
import * as M from "../../src/lib/syna-agent/custom-theme/menu";
import * as R from "../../src/lib/syna-agent/custom-theme/render";
import * as D from "../../src/lib/syna-agent/custom-theme/tenue-data";
import * as G from "../../src/lib/syna-agent/custom-theme/signatures";
import { withTenueAchat } from "../../src/lib/syna-agent/custom-theme/buy-block";
import { withoutMissingPhotos } from "../../src/lib/syna-agent/custom-theme/library";
import { withTextesLongs, listedProducts, tenueSection, withTenueBuyBlock, withTenuePrestations, withTenueProducts, withoutExampleProducts, validConstruction, type TenueSection } from "../../src/lib/syna-agent/custom-theme/tenue";
import { CLIENTS, MARQUE, SCENE, TENUES, TENUES_FAMILLES, avecListes, durcir, enScenes, listes, photoProduitSvg, remplir, type Client, type Etat, type TenueBanc } from "./donnees";

if (!process.env.DATA_DIR || path.resolve(process.env.DATA_DIR).startsWith(path.resolve(process.cwd()) + path.sep)) throw new Error("Tour des sections : DATA_DIR doit être un dossier jetable hors du dépôt (voir tour.ts).");

type Projet = ReturnType<typeof loadProject>;
type Monte = { pid: string; projet: Projet; site: D.TenueSite; produits: ReturnType<typeof R.tenueProducts>; prestations: ReturnType<typeof R.tenuePrestations>; achat: ReturnType<typeof R.tenueBuyData>; menu: S.CustomTheme["menu"]; adresse: string | null; coquilles: Map<string, { avant: string; apres: string }> };
export type Banc = { clients: Record<Client, Monte> };

/** Les pages qu'un vrai site aurait : elles donnent ses liens au menu et ses familles à la boutique. */
const PAGES = [["home", "Accueil"], ["shop", "Boutique"], ["product", "Fiche produit"], ["about", "À propos"], ["contact", "Contact"], ["prestations", "Prestations"], ["journal", "Journal"], ["legal", "Informations légales"]] as const;
const themeVide = (tenue: TenueBanc, pages: S.CtPage[] = []): S.CustomTheme => ({ version: 1, family: "classique", style: "classique", header: null, footer: null, search: null, pages, tenue: tenue.tenue, rev: 0, at: 0, ...(tenue.famille ? { famille: tenue.famille } : {}) } as S.CustomTheme);
const themeDuSite = (tenue: TenueBanc) => themeVide(tenue, [...PAGES.map(([key, label]) => ({ key, label, sections: [] })), { key: "tour", label: "Tour", sections: [] }]);

/** Remplit la base d'essai : un compte, et un projet par client d'essai. */
export async function monter(): Promise<Banc> {
  process.env.STUDIO_SYNA_AGENT = "1";
  const clients = {} as Record<Client, Monte>;
  for (const cle of Object.keys(CLIENTS) as Client[]) {
    const c = CLIENTS[cle];
    // Un compte abonné par client d'essai (un abonnement porte un projet).
    const u = await createUser(`tour-${newId()}@example.invalid`, "Mot-de-passe-fictif", "Tour des sections");
    run("UPDATE users SET role='client' WHERE id=?", u.id);
    getSubscription(u.id);
    run("UPDATE subscriptions SET status='manual',plan='dominer',billing='monthly',owner_user_id=?,project_id=NULL WHERE user_id=?", u.id, u.id);
    alignPeriod(u.id, now()); syncAllowance(u.id);
    const pid = await createProjectWithSubscription(u.id, null, () => { const p = newId(); run("INSERT INTO projects(id,user_id,name,settings_json,business_type,created_at,updated_at) VALUES(?,?,?,'{\"language\":\"fr\"}',?,?,?)", p, u.id, MARQUE, "products", now(), now()); return { projectId: p, result: p }; });
    saveBrand(pid, { name: MARQUE, nameStatus: "validated", alternatives: [], tagline: "", positioning: "Client d'essai du tour des sections.", audience: "", personality: [], tone: { voice: "Tutoiement, phrases courtes.", do: [], dont: [] }, palette: TENUES[0].palette, fonts: TENUES[0].fonts, logo: { concept: "", status: "proposed" } } as never);
    for (const p of c.produits) {
      const images: { assetId: string }[] = [];
      for (const [i, ph] of p.photos.entries()) images.push({ assetId: (await saveAsset({ projectId: pid, userId: u.id, data: await sharp(Buffer.from(photoProduitSvg(ph))).jpeg({ quality: 88 }).toBuffer(), name: `produit-${i + 1}.jpg`, mime: "image/jpeg", role: "original", origin: "upload" })).id });
      const combos = (p.options ?? []).reduce<string[][]>((acc, o) => acc.flatMap((a) => o.values.map((v) => [...a, v])), [[]]);
      createProduct(pid, { title: p.titre, images, price: p.prix, compareAt: p.compare ?? null, productType: p.genre ?? "", categories: [p.famille], options: p.options ?? [], variants: combos.map((o, i) => {
        // Chaque couleur a sa photo (quand le produit en a assez) : la pièce des coloris en scène se montre.
        const ci = (p.options ?? []).findIndex((x) => /couleur/i.test(x.name)), rang = ci < 0 ? -1 : p.options![ci].values.indexOf(o[ci]);
        return { options: o, stock: p.stock == null ? null : i === 1 ? 0 : p.stock, ...(rang >= 0 && images.length >= 2 ? { image: images[rang % images.length].assetId } : {}) };
      }) } as never);
    }
    saveServices(pid, { ...loadProject(pid).services, services: c.prestations.map((s) => ({ ...s, source: "client" })), phone: c.phone, address: c.address, hours: c.hours, area: c.area } as never);
    saveCompany(pid, { shipping: c.shipping, returns: c.returns, phone: c.phone, address: c.address });
    const long = cle === "difficile";
    saveShopOffers(pid, {
      quantity: { kind: "lots", tiers: [{ qty: 2, pct: 10 }, { qty: 3, pct: 15 }] },
      packs: cle === "seul" ? [] : [{ quantite: 1, nom: long ? "Le pack découverte pour essayer sans se tromper" : "Pour essayer" }, { quantite: 2, nom: long ? "Le pack duo à partager avec quelqu'un qu'on aime" : "Le duo", remisePct: 10, populaire: true }, { quantite: 3, nom: "Le trio", remisePct: 15 }],
      seuilStock: 5, stockDepart: 50, delaiLivraison: long ? "Expédié sous 24 heures, chez toi en 2 à 4 jours ouvrés selon le transporteur" : "2 à 4 jours ouvrés",
      promo: { pct: 15, endsAt: Date.now() + 5 * 86_400_000, nom: long ? "L'offre de rentrée sur toute la boutique, sans minimum" : "L'offre de rentrée" },
      fenetreOffre: { titre: long ? "Dix pour cent sur ta toute première commande chez nous" : "10 % sur ta première commande", texte: long ? "Laisse ton e-mail : tu reçois tout de suite ton code, valable trente jours sur toute la boutique, sans minimum d'achat et cumulable avec la livraison offerte." : "Laisse ton e-mail, tu reçois ton code.", code: long ? "BIENVENUE-RENTREE-2026" : "BIENVENUE" },
    } as never);
    const projet = loadProject(pid);
    const t = themeDuSite(TENUES[0]);
    const produits = R.tenueProducts(pid, t), prestations = R.tenuePrestations(pid);
    const base = R.tenueSite(projet, t, produits, prestations);
    const site: D.TenueSite = { ...base, biens: c.biens, carte: c.carte, equipe: c.equipe, reseaux: D.reseauxDansTexte(c.reseaux), articles: c.articles, vitrine: { ...base.vitrine, ...(c.vitrine ?? {}) } };
    const menu = M.validMenu(t, M.proposeMenu(t, R.menuProducts(pid), "products")).menu;
    clients[cle] = { pid, projet, site, produits, prestations, achat: R.tenueBuyData(pid), menu, adresse: c.address, coquilles: new Map() };
  }
  return { clients };
}

/** La page du Studio autour du contenu, pour un client et une tenue : ce que `renderCustomTheme` écrit pour un thème vide. */
function coquille(m: Monte, tenue: TenueBanc): { avant: string; apres: string } {
  const deja = m.coquilles.get(tenue.cle);
  if (deja) return deja;
  const html = R.renderCustomTheme({ ...m.projet, brand: { ...m.projet.brand!, palette: tenue.palette, fonts: tenue.fonts } } as never, themeVide(tenue, [{ key: "tour", label: "Tour", sections: [] }]), { embed: true });
  const a = html.indexOf('<div class="frame">'), b = html.indexOf("</div></div>", a);
  if (a < 0 || b < 0) throw new Error("Tour des sections : la page du Studio a changé de forme (cadre « frame » introuvable dans renderCustomTheme).");
  const c = { avant: html.slice(0, a + '<div class="frame">'.length), apres: html.slice(b) };
  m.coquilles.set(tenue.cle, c);
  return c;
}

export type Cas = { piece: string; construction: string };
/** Où le Studio pose la pièce : dans la coque du site, au-dessus, en fenêtre, ou dans la page. */
export function placeDe(s: TenueSection): "en-tête" | "pied de page" | "recherche" | "bandeau" | "partout" | "page" {
  if (s.role === "en-tête" || s.role === "pied de page" || s.role === "recherche") return s.role;
  return s.group === "bandeau" ? "bandeau" : s.group === "partout" ? "partout" : "page";
}
const affaire = (s: TenueSection): "products" | "services" => (s.pour === "services" ? "services" : "products");

/** Le HTML de la pièce écrit pour le client d'essai, selon l'état de contenu (avant les vraies données du Studio). */
export function ecrire(s: TenueSection, etat: Etat): string | undefined {
  if (etat === "exemple") return undefined;
  let h = s.html.replace(/Brindi/g, MARQUE);
  // Les photos que seul le client peut donner (équipe, réalisations, biens) : le client d'essai les a données.
  if (s.authentic) h = enScenes(h);
  if (etat === "difficile") return durcir(avecListes(h, 7));
  if (etat === "seul") return remplir(avecListes(h, 1));
  return remplir(h);
}
/** L'état « seul » n'a de sens que pour une pièce qui porte une liste (écrite, ou remplie par le Studio). */
export const aUneListe = (s: TenueSection) => listes(s.html).length > 0 || /\sdata-tn-(?:prestations|produits|rayons|comparatif|articles|biens|carte|lignes|suggestions|versions|lots|looks|coloris|packs|messages|cartes-vente|guide|reseaux|horaires|zone|prestations-choix|prestations-options)\b/.test(s.html);

/**
 * Les photos d'exemple encore là après les vraies données deviennent les photos « créées » pour le client d'essai,
 * sauf une dans l'état difficile (la photo qui manque) et sauf le bloc d'achat d'un produit sans photo (« Ta photo ici »).
 */
function photosCreees(html: string, etat: Etat, sansPhotoProduit: boolean): string {
  let garde = etat === "difficile" ? 1 : 0;
  const hors = sansPhotoProduit && /^\s*<section\b[^>]*\sdata-tn-(?:achat|appel-produit)\b/.test(html);
  if (hors) return html;
  return html.replace(/(?:\/sections\/|\.\/)?photos\/([\w.-]+\.(?:webp|png|jpe?g))/g, (m, f: string) => (garde-- > 0 ? m : `${SCENE}${f}`));
}

/**
 * Le contenu de la page pour une pièce seule (ou une suite de pièces), monté comme le Studio le monte.
 * Rend `null` quand le Studio ne rendrait rien du tout (pièce sans sa vraie donnée).
 */
export function contenu(banc: Banc, suite: Cas[], etat: Etat, o: { cle?: string; /** Sans les photos « créées » du client d'essai (pour comparer au Studio). */ sansPhotosCreees?: boolean; /** La famille du site et son signe (signatures.ts) : fonds de section, alignement, signe posés comme au Studio. */ famille?: string | null; signe?: G.Signe | null; /** La page telle que la voient les réglages et le signe (« home » : l'accueil). */ cleReglages?: string; /** Réglages imposés, pièce par pièce (dans l'ordre de la suite) : pour essayer chaque fond. */ reglages?: (G.Reglages | null)[] } = {}): { html: string; rendues: string[] } {
  const client: Client = etat === "exemple" ? "vrai" : etat, m = banc.clients[client], monte = etat !== "exemple";
  const pg = o.cle ?? "tour";
  const fiches = new Map<string, string>();
  const sansPhoto = !m.achat?.images.length;
  const brutes = suite.map((c, i) => { const s = tenueSection(c.piece)!; return { s, cs: { uid: `t${i}`, id: s.id, construction: c.construction || undefined, html: ecrire(s, etat), clientTexts: monte, ...(o.reglages?.[i] ? { reglages: o.reglages[i] } : {}) } as S.CtSection, place: placeDe(s) }; });
  // Les réglages de la page comme au Studio (render.ts) : seulement sur les pièces posées dans la page.
  const dansPage = brutes.filter((x) => x.place === "page"), regles = G.reglagesDePage(o.famille, o.cleReglages ?? pg, dansPage.map((x) => x.cs));
  const sections = brutes.map((x) => { const k = dansPage.indexOf(x); return k < 0 ? x : { ...x, cs: regles[k] }; });
  const versions = sections.some((x) => x.s.id === "tn-versions");
  const rendre = (x: (typeof sections)[number]): string => {
    const role = x.place === "en-tête" ? "header" : x.place === "pied de page" ? "footer" : x.place === "recherche" ? "search" : "page";
    const sm = R.sectionMarkup(x.cs, MARQUE, role, affaire(x.s));
    if (!monte) return sm; // l'exemple : le HTML d'origine de la pièce, sans aucune donnée
    let out: string;
    if (x.place === "en-tête") out = D.withVenteArrivee(D.withTenueSite(M.withMenu(sm, m.menu, { boutique: affaire(x.s) !== "services", families: m.site.families, products: m.produits }), { phone: m.site.phone }), m.site);
    else if (x.place === "pied de page" || x.place === "recherche") out = D.withTenueSite(sm, m.site);
    else if (x.place === "bandeau" || x.place === "partout") out = withTenueAchat(D.withTenueSite(sm, m.site), m.pid);
    else out = withTenueAchat(R.realMap(D.withTenueSite(withTenuePrestations(withTenueProducts(withTenueBuyBlock(sm, m.achat), listedProducts(m.produits, pg)), m.prestations), m.site), m.adresse), m.pid, undefined, { selecteur: !versions, fiches });
    return o.sansPhotosCreees ? out : photosCreees(out, etat, sansPhoto);
  };
  const de = (place: string) => sections.filter((x) => x.place === place).map(rendre);
  const fenetres = de("partout").join("\n");
  let html = `${de("bandeau").join("\n")}${de("en-tête").join("")}${de("recherche").join("")}\n<main class="tb-pg" data-pg="${pg}">${G.signeSurPage(o.cleReglages ?? pg, de("page"), o.signe ?? null).join("\n")}</main>\n${de("pied de page").join("")}${fenetres ? `<div class="tn-fixes">${fenetres}</div>` : ""}`;
  if (monte) {
    const surPhoto = new Map(sections.map((x) => [x.cs.uid, R.textOnPhoto(x.cs)] as const));
    html = withoutMissingPhotos(withoutExampleProducts(html, m.produits.map((p) => p.title)), TENUES[0].palette, (uid) => surPhoto.get(uid) === true);
  }
  html = withTextesLongs(html); // le dernier passage du rendu du Studio : les textes longs sont marqués
  const rendues = sections.filter((x) => new RegExp(`\\sdata-ct="${x.cs.uid}"`).test(html)).map((x) => x.s.id);
  return { html, rendues };
}

/** La page complète (le document que le navigateur charge) : la page du Studio, avec ce contenu. */
export function page(banc: Banc, suite: Cas[], etat: Etat, tenue: TenueBanc, o: { cleReglages?: string; reglages?: (G.Reglages | null)[] } = {}): { html: string; rendues: string[] } {
  const client: Client = etat === "exemple" ? "vrai" : etat, c = coquille(banc.clients[client], tenue), x = contenu(banc, suite, etat, { famille: tenue.famille ?? null, signe: G.signeDe(tenue.tenue), cleReglages: o.cleReglages, reglages: o.reglages });
  return { html: `${c.avant}${x.html}${c.apres}`, rendues: x.rendues };
}

/** Une construction valable pour la pièce (« » : la pièce n'en déclare aucune). */
export const constructionsDe = (s: TenueSection): string[] => (s.constructions.length ? s.constructions.map((c) => c.key).filter((k) => validConstruction(s.id, k) === k) : [""]);

// ---------------------------------------------------------------- les pages en situation

/** Deux sites composés (une suite de pièces avec en-tête collant et pied) : ce qui ne se voit qu'entre deux sections. */
export const SITUATIONS: { cle: string; titre: string; /** La page vue par les réglages et le signe (« home » : l'accueil). */ page: string; suite: Cas[] }[] = [
  { cle: "boutique-accueil", titre: "En situation : l'accueil d'une boutique", page: "home", suite: [
    { piece: "tn-bandeau", construction: "" }, { piece: "tn-entete-liens", construction: "" }, { piece: "tn-ouverture", construction: "titre-en-bas" }, { piece: "tn-produits", construction: "grille" }, { piece: "tn-atouts", construction: "cartes" },
    { piece: "tn-emotion", construction: "phrase-sur-photo" }, { piece: "tn-appel-produit", construction: "carte" }, { piece: "tn-histoire", construction: "deux-colonnes" }, { piece: "tn-questions", construction: "cartes" }, { piece: "tn-garantie", construction: "bande" },
    { piece: "tn-final", construction: "encadre" }, { piece: "tn-pied-lettre", construction: "" }] },
  { cle: "boutique-fiche", titre: "En situation : la fiche produit d'une boutique", page: "product", suite: [
    { piece: "tn-entete-annonce", construction: "" }, { piece: "tn-achat", construction: "vente-directe" }, { piece: "tn-versions", construction: "pastilles" }, { piece: "tn-lots", construction: "cartes" }, { piece: "tn-sous-bouton", construction: "" },
    { piece: "tn-atouts", construction: "coches" }, { piece: "tn-probleme-reponse", construction: "" }, { piece: "tn-livraison", construction: "frise" }, { piece: "tn-questions", construction: "filets" }, { piece: "tn-appel-produit", construction: "bande-sombre" },
    { piece: "tn-pied-reassurance", construction: "" }] },
  { cle: "services-accueil", titre: "En situation : l'accueil d'un métier de services", page: "home", suite: [
    { piece: "tn-entete-services", construction: "" }, { piece: "tn-ouverture-metier", construction: "photo-pleine" }, { piece: "tn-prestations", construction: "" }, { piece: "tn-tarifs", construction: "cartes" }, { piece: "tn-deroule", construction: "" },
    { piece: "tn-delais", construction: "frise" }, { piece: "tn-zone", construction: "" }, { piece: "tn-horaires", construction: "encadre" }, { piece: "tn-rdv", construction: "" }, { piece: "tn-reseaux", construction: "pastilles" },
    { piece: "tn-pied-services", construction: "" }] },
];
/** Une suite dont chaque pièce et chaque construction existent (une clé inconnue prend la première façon de la pièce). */
export function suiteValable(suite: Cas[]): Cas[] {
  return suite.flatMap((c) => { const s = tenueSection(c.piece); if (!s) return []; const k = constructionsDe(s); return [{ piece: c.piece, construction: k.includes(c.construction) ? c.construction : k[0] }]; });
}

// ---------------------------------------------------------------- le banc rend-il comme le Studio ?

/**
 * Monte un petit site par le vrai chemin du Studio (`applyStructure`, `renderCustomTheme`) et par le banc, et compare
 * le contenu de la page au caractère près. Rend la liste des écarts (vide : le banc rend comme le Studio).
 */
export function memeQueLeStudio(banc: Banc): string[] {
  // Sans famille, puis avec une famille et un signe (fonds de section, alignement, signe posés au rendu).
  return [TENUES[0], TENUES_FAMILLES[2]].flatMap((tenue) => memeQueLeStudioDans(banc, tenue));
}
function memeQueLeStudioDans(banc: Banc, tenue: TenueBanc): string[] {
  const ecarts: string[] = [], m = banc.clients.vrai;
  const suites: Cas[][] = [
    [{ piece: "tn-ouverture", construction: "titre-en-bas" }, { piece: "tn-produits", construction: "grille" }, { piece: "tn-atouts", construction: "cartes" }, { piece: "tn-questions", construction: "cartes" }, { piece: "tn-contact", construction: "deux-colonnes" }],
    [{ piece: "tn-achat", construction: "simple" }, { piece: "tn-lots", construction: "cartes" }, { piece: "tn-appel-produit", construction: "carte" }, { piece: "tn-prestations", construction: "" }, { piece: "tn-tarifs", construction: "cartes" }],
  ];
  for (const brute of suites) {
    const suite = suiteValable(brute), etat: Etat = "vrai";
    let t = themeDuSite(tenue);
    t.pages = t.pages.filter((p) => p.key !== "tour");
    t = S.applyStructure(t, [{ op: "page", key: "tour", label: "Tour" }, ...suite.map((c) => ({ op: "add", page: "tour", section: c.piece, ...(c.construction ? { construction: c.construction } : {}) }) as const)] as never);
    t.pages.find((p) => p.key === "tour")!.sections.forEach((s, i) => { s.uid = `t${i}`; s.html = ecrire(tenueSection(s.id)!, etat); s.clientTexts = true; });
    const main = (h: string) => { const a = h.indexOf('<main class="tb-pg" data-pg="tour"'), b = h.indexOf("</main>", a); return a < 0 ? "" : h.slice(a, b + 7).replace(/^<main[^>]*>/, "<main>"); };
    const x = main(R.renderCustomTheme(m.projet as never, t, { embed: true }));
    // Le banc, avec les seules données que le Studio lit dans la base, et sans ses photos « créées ».
    const y = main(contenu({ clients: { ...banc.clients, vrai: { ...m, site: R.tenueSite(m.projet, t, m.produits, m.prestations) } } }, suite, etat, { sansPhotosCreees: true, famille: tenue.famille ?? null, signe: G.signeDe(tenue.tenue) }).html);
    if (!x || x !== y) { let i = 0; while (i < x.length && x[i] === y[i]) i++; ecarts.push(`${suite.map((c) => c.piece).join(", ")} : le banc s'écarte du Studio au signe ${i} — Studio « ${x.slice(Math.max(0, i - 60), i + 80)} » ; banc « ${y.slice(Math.max(0, i - 60), i + 80)} »`); }
  }
  return ecarts;
}

// ---------------------------------------------------------------- ce que le navigateur demande

const SECTIONS = path.join(process.cwd(), "public", "sections"), FONTS = path.join(process.cwd(), "assets", "fonts");
const TYPES: Record<string, string> = { ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".html": "text/html; charset=utf-8" };
const cache = new Map<string, { body: Buffer; contentType: string } | null>();
/** Un fichier demandé par la page : feuilles, scripts et photos de public/sections, polices du dépôt, médias de la base d'essai. Rien d'autre (aucun réseau). */
export function fichier(pathname: string): { body: Buffer; contentType: string } | null {
  const deja = cache.get(pathname);
  if (deja !== undefined) return deja;
  const lire = (f: string, type?: string) => (fs.existsSync(f) && fs.statSync(f).isFile() ? { body: fs.readFileSync(f), contentType: type ?? TYPES[path.extname(f).toLowerCase()] ?? "application/octet-stream" } : null);
  let out: { body: Buffer; contentType: string } | null = null;
  const p = decodeURIComponent(pathname);
  if (p.startsWith("/sections/")) {
    const rel = path.normalize(p.slice("/sections/".length)).replace(/^(\.\.[/\\])+/, "");
    // TOUR_FEUILLES=<dossier> : les fichiers de ce dossier passent devant ceux de public/sections (pour rejouer un ancien état d'une feuille).
    out = (process.env.TOUR_FEUILLES ? lire(path.join(process.env.TOUR_FEUILLES, rel)) : null) ?? lire(path.join(SECTIONS, rel));
  }
  else if (/^\/api\/syna\/fonts\//.test(p)) out = lire(path.join(FONTS, path.basename(p)));
  else if (p.startsWith(SCENE)) out = lire(path.join(SECTIONS, "photos", path.basename(p.slice(SCENE.length))));
  else if (p.startsWith("/api/files/")) { const a = getAsset(path.basename(p)); out = a ? lire(storagePath(a.storage_key), a.mime) : null; }
  cache.set(pathname, out);
  return out;
}
