/**
 * Tour des sections : les planches des familles (17 novembre 2026). Gratuit : aucun appel à l'IA, aucun réseau.
 *
 *   npx tsx scripts/tour-des-sections/familles.ts --comparaison [--sortie <dossier>]
 *       le même accueil de boutique dans les six familles, côte à côte (téléphone, puis ordinateur)
 *   npx tsx scripts/tour-des-sections/familles.ts --une-famille [--sortie <dossier>]
 *       UNE famille (gourmand et joyeux) dans toutes ses variations : chaque choix d'allure permis, les réglages des
 *       sections (fonds, alignement, taille des titres), les dispositions des pièces et la forme du signe
 *
 * Chaque page est aussi mesurée par les détecteurs du tour : les défauts bloquants et importants sont écrits, et la
 * commande sort en erreur s'il y en a. Le contenu est celui du client d'essai « vrai » (donnees.ts).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

const args = process.argv.slice(2);
const val = (nom: string) => { const i = args.indexOf(`--${nom}`); return i >= 0 ? args[i + 1] : undefined; };
const donnees = fs.mkdtempSync(path.join(os.tmpdir(), "tour-des-sections-familles-"));
process.env.DATA_DIR = donnees;
process.env.STUDIO_SYNA_AGENT = "1";
const sortie = path.resolve(val("sortie") ?? "/tmp/claude-0/-home-user-Ecom-studio-ia/cdd8e871-2fa8-5553-9230-2342b2efce3a/scratchpad/familles");
fs.mkdirSync(sortie, { recursive: true });

const R = await import("./rendu");
const { TENUES_FAMILLES, HAUTEUR } = await import("./donnees");
const { mesurer, onglet, ouvrirNavigateur, servir } = await import("./banc");
const { exampleProductNames } = await import("../../src/lib/syna-agent/custom-theme/tenue");
type Reglages = import("../../src/lib/syna-agent/custom-theme/signatures").Reglages;
type TenueBanc = import("./donnees").TenueBanc;
type Cas = import("./rendu").Cas;

/** Une page à rendre : sa colonne sur la planche. */
type Vue = { titre: string; tenue: TenueBanc; suite: Cas[]; reglages?: (Reglages | null)[] };

const ACCUEIL = R.SITUATIONS.find((s) => s.cle === "boutique-accueil")!;
/** La suite de l'accueil de boutique, avec d'autres pièces ou dispositions (clé de pièce → « pièce:disposition »). */
const suiteAvec = (changes: Record<string, string>): Cas[] => R.suiteValable(ACCUEIL.suite.map((c) => { const x = changes[c.piece]; if (!x) return c; const [piece, construction = ""] = x.split(":"); return { piece, construction }; }));
/** Les réglages par pièce de la suite (dans l'ordre), d'après un tableau pièce → réglages. */
const reglagesDe = (suite: Cas[], r: Record<string, Reglages>): (Reglages | null)[] => suite.map((c) => r[c.piece] ?? null);

function vuesComparaison(): Vue[] {
  return TENUES_FAMILLES.map((t) => ({ titre: t.libelle.replace(/\s*\(.*$/, ""), tenue: t, suite: R.suiteValable(ACCUEIL.suite) }));
}

/**
 * Gourmand et joyeux, choisie parce que c'est la famille qui a le plus de choix permis : titres en capitales ou gras,
 * bouton à ombre ou en pilule, photos penchées ou droites, quatre fonds de section dont la couleur franche de la marque,
 * trois ouvertures, trois en-têtes et trois pieds de page. La marque reste la même : seuls les réglages changent.
 */
function vuesUneFamille(): Vue[] {
  const base = TENUES_FAMILLES.find((t) => t.famille === "gourmand-joyeux")!;
  const avec = (cle: string, tenue: Partial<TenueBanc["tenue"]>): TenueBanc => ({ ...base, cle: `${base.cle}-${cle}`, tenue: { ...base.tenue, ...tenue } });
  const vues: Vue[] = [];
  const v = (titre: string, tenue: TenueBanc, changes: Record<string, string>, r: Record<string, Reglages> = {}) => { const suite = suiteAvec(changes); vues.push({ titre, tenue, suite, reglages: reglagesDe(suite, r) }); };
  v("1. Capitales, boutons à ombre, photos penchées\nfonds orange, rose, clair · titres centrés", avec("a", { titres: "capitales", bouton: "ombre", cadre: "penche", signeForme: "etiquette" }),
    { "tn-ouverture": "tn-ouverture:titre-massif", "tn-produits": "tn-produits:grille", "tn-atouts": "tn-atouts:cartes" },
    { "tn-produits": { fond: "marque", alignement: "centre" }, "tn-atouts": { fond: "doux", alignement: "centre" }, "tn-histoire": { fond: "clair" }, "tn-questions": { fond: "marque" } });
  v("2. Titres gras, boutons pilule, photos droites\nouverture en bande · produits en liste · titres à gauche", avec("b", { titres: "gras", bouton: "pilule", cadre: "droit", signeForme: "tampon" }),
    { "tn-ouverture": "tn-ouverture:bandeau", "tn-produits": "tn-produits:liste", "tn-atouts": "tn-atouts:numeros", "tn-histoire": "tn-histoire:lettrine", "tn-questions": "tn-questions:filets", "tn-entete-liens": "tn-entete:gauche" },
    { "tn-produits": { fond: "doux", alignement: "gauche" }, "tn-atouts": { fond: "marque", alignement: "gauche" }, "tn-histoire": { fond: "clair", alignement: "gauche" }, "tn-questions": { fond: "doux", alignement: "gauche" } });
  v("3. Grands titres, un moment sombre\nun produit vedette · atouts en coches · tout centré", avec("c", { titres: "capitales", bouton: "pilule", cadre: "penche", signeForme: "ruban" }),
    { "tn-produits": "tn-produits:vedette", "tn-atouts": "tn-atouts:coches", "tn-histoire": "tn-histoire:titre-photo-texte", "tn-questions": "tn-questions:deux-colonnes", "tn-final": "tn-final:sombre-centre" },
    { "tn-produits": { fond: "clair", alignement: "centre", titre: "grand" }, "tn-atouts": { fond: "sombre", alignement: "centre", titre: "grand" }, "tn-histoire": { fond: "marque", alignement: "centre", titre: "grand" }, "tn-questions": { fond: "doux", alignement: "centre", titre: "grand" } });
  v("4. Ouverture en carte, boutons à ombre, photos droites\natouts en ronds · histoire en deux colonnes", avec("d", { titres: "gras", bouton: "ombre", cadre: "droit", signeForme: "couture" }),
    { "tn-ouverture": "tn-ouverture-carte", "tn-atouts": "tn-atouts:ronds", "tn-emotion": "tn-emotion:phrase-dessous", "tn-appel-produit": "tn-appel-produit:bande-sombre", "tn-garantie": "tn-garantie:sceau" },
    { "tn-produits": { fond: "doux", alignement: "centre" }, "tn-atouts": { fond: "clair", alignement: "gauche" }, "tn-histoire": { fond: "marque", alignement: "gauche" }, "tn-questions": { fond: "clair", alignement: "centre" } });
  v("5. Capitales, boutons pilule, photos penchées\nfonds rose, orange · en-tête à grand menu", avec("e", { titres: "capitales", bouton: "pilule", cadre: "penche", signeForme: "ligne", signeTexte: "N° 07 · fournée du jour" }),
    { "tn-entete-liens": "tn-entete-liens:mega-produits", "tn-ouverture": "tn-ouverture:titre-massif", "tn-produits": "tn-produits:liste", "tn-atouts": "tn-atouts:lignes", "tn-histoire": "tn-histoire:deux-colonnes", "tn-final": "tn-final:gauche-droite" },
    { "tn-produits": { fond: "doux", alignement: "gauche", titre: "grand" }, "tn-atouts": { fond: "marque", alignement: "gauche" }, "tn-histoire": { fond: "doux", alignement: "gauche" }, "tn-questions": { fond: "marque", alignement: "gauche", titre: "grand" } });
  v("6. Titres gras, boutons à ombre, photos penchées\nfonds clairs et orange · atouts en cartes · questions en cartes", avec("f", { titres: "gras", bouton: "ombre", cadre: "penche", signeForme: "etiquette", signeTexte: "Cuit le matin" }),
    { "tn-ouverture": "tn-ouverture:bandeau", "tn-produits": "tn-produits:grille", "tn-atouts": "tn-atouts:cartes", "tn-histoire": "tn-histoire:lettrine", "tn-questions": "tn-questions:cartes", "tn-garantie": "tn-garantie:sceau" },
    { "tn-produits": { fond: "clair", alignement: "centre" }, "tn-atouts": { fond: "marque", alignement: "centre", titre: "grand" }, "tn-histoire": { fond: "doux", alignement: "centre" }, "tn-questions": { fond: "clair", alignement: "centre" } });
  return vues;
}

const mode = args.includes("--une-famille") ? "une-famille" : "comparaison";
const vues = mode === "une-famille" ? vuesUneFamille() : vuesComparaison();
const banc = await R.monter();
const browser = await ouvrirNavigateur(), service = await servir(R.fichier);
let graves = 0;
const exemples = ["Brindi", ...exampleProductNames()].filter((x) => x.length >= 5);
const captures: Record<number, string[]> = { 390: [], 1280: [] };
try {
  const og = await onglet(browser, service);
  for (const [i, vue] of vues.entries()) for (const largeur of [390, 1280]) {
    const x = R.page(banc, vue.suite, "vrai", vue.tenue, { cleReglages: "home", reglages: vue.reglages });
    await og.montrer(x.html, largeur, HAUTEUR(largeur));
    const m = await mesurer(og.page, { monte: true, titreLourd: vue.tenue.titreLourd, exemples }, {});
    const f = path.join(sortie, `${mode}-${i + 1}-${largeur}.png`);
    await og.page.screenshot({ path: f, fullPage: true });
    captures[largeur].push(f);
    const g = m.defauts.filter((d) => d.gravite !== "mineur");
    graves += g.length;
    console.log(`${vue.titre.split("\n")[0]} · ${largeur} px : ${m.defauts.length} défaut(s), dont ${g.length} bloquant(s) ou important(s)`);
    for (const d of m.defauts) console.log(`    ${d.gravite} ${d.type} ${d.selecteur} :: ${d.detail} « ${d.texte.slice(0, 40)} »`.slice(0, 260));
  }
} finally { await browser.close(); await service.fermer(); }

/** Une planche : les pages côte à côte, chacune titrée, coupées à la même hauteur et réduites. */
async function planche(fichiers: string[], titres: string[], o: { hauteur: number; echelle: number; colonnes: number; sortie: string; titre: string }) {
  const larg = Math.round((await sharp(fichiers[0]).metadata()).width! * o.echelle), haut = Math.round(o.hauteur * o.echelle);
  // Les titres de colonne passent à la ligne pour ne jamais déborder sur la colonne voisine.
  const couper = (texte: string, max: number) => texte.split(/\s+/).reduce<string[]>((acc, mot) => { const l = acc[acc.length - 1]; if (l !== undefined && `${l} ${mot}`.length <= max) acc[acc.length - 1] = `${l} ${mot}`; else acc.push(mot); return acc; }, []);
  const lignesDe = (t: string) => t.split("\n").flatMap((l, k) => couper(l, Math.floor(larg / (k ? 10.8 : 13.6))).map((x) => ({ x, fort: k === 0 })));
  const marge = 36, tete = 24 + Math.max(...titres.map((t) => lignesDe(t).length)) * 28, entete = 96, lignes = Math.ceil(fichiers.length / o.colonnes);
  const W = marge + o.colonnes * (larg + marge), H = entete + lignes * (tete + haut + marge) + marge;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const parts: OverlayOptions[] = [];
  const textes: string[] = [`<text x="${marge}" y="58" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="700" fill="#1d1b18">${esc(o.titre)}</text>`];
  for (const [i, f] of fichiers.entries()) {
    const col = i % o.colonnes, lig = Math.floor(i / o.colonnes), x = marge + col * (larg + marge), y = entete + lig * (tete + haut + marge);
    const meta = await sharp(f).metadata();
    const crop = await sharp(f).extract({ left: 0, top: 0, width: meta.width!, height: Math.min(meta.height!, o.hauteur) }).resize({ width: larg }).png().toBuffer();
    parts.push({ input: crop, left: x, top: y + tete });
    lignesDe(titres[i]).forEach((l, k) => textes.push(`<text x="${x}" y="${y + 26 + k * 28}" font-family="DejaVu Sans, sans-serif" font-size="${l.fort ? 22 : 19}" font-weight="${l.fort ? 700 : 400}" fill="${l.fort ? "#1d1b18" : "#57524b"}">${esc(l.x)}</text>`));
  }
  const fond = await sharp({ create: { width: W, height: H, channels: 3, background: "#ECE8E1" } }).png().toBuffer();
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${textes.join("")}</svg>`);
  await sharp(fond).composite([...parts, { input: svg, left: 0, top: 0 }]).jpeg({ quality: 84 }).toFile(o.sortie);
  console.log(o.sortie);
}
const titres = vues.map((v) => v.titre);
if (mode === "comparaison") {
  await planche(captures[390], titres, { hauteur: 3400, echelle: 1, colonnes: 6, sortie: path.join(sortie, "comparaison-familles.jpg"), titre: "Le même accueil dans les six familles du Studio (téléphone)" });
  await planche(captures[1280], titres, { hauteur: 2600, echelle: 0.5, colonnes: 3, sortie: path.join(sortie, "comparaison-familles-ordi.jpg"), titre: "Le même accueil dans les six familles du Studio (ordinateur)" });
} else {
  await planche(captures[390], titres, { hauteur: 3400, echelle: 1, colonnes: 6, sortie: path.join(sortie, "une-famille-tous-reglages.jpg"), titre: "Une seule famille (gourmand et joyeux), une seule marque : six sites possibles (téléphone)" });
  await planche(captures[1280], titres, { hauteur: 2600, echelle: 0.5, colonnes: 3, sortie: path.join(sortie, "une-famille-tous-reglages-ordi.jpg"), titre: "Une seule famille (gourmand et joyeux), une seule marque : six sites possibles (ordinateur)" });
}
try { fs.rmSync(donnees, { recursive: true, force: true }); } catch { /* le dossier jetable part au prochain ménage */ }
console.log(graves ? `${graves} défaut(s) bloquant(s) ou important(s)` : "aucun défaut bloquant ni important");
process.exit(graves ? 1 : 0);
