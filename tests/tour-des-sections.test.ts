/**
 * Le tour des sections (scripts/tour-des-sections/, 17 novembre 2026) : le banc qui ouvre chaque pièce à tenue, dans
 * chaque construction, trois états de contenu, trois tenues et trois largeurs, et mesure ses défauts de rendu.
 *
 * 1) Toujours (sans navigateur) : le recensement est complet, et les outils qui écrivent le contenu d'essai tiennent.
 * 2) Avec CHROMIUM : chaque détecteur attrape son défaut sur une page fabriquée fautive et se tait sur une page saine ;
 *    puis le tour est fait (détecteurs seuls) et l'essai échoue s'il reste un défaut bloquant absent de
 *    scripts/tour-des-sections/connus.json. TOUR_MODULE=achat ou TOUR_PIECE=tn-rdv limitent le tour ; TOUR=non le saute.
 * Gratuit : aucun appel à l'IA, aucun réseau.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TENUE_SECTIONS } from "@/lib/syna-agent/custom-theme/tenue";
import { recenser, totaux, MODULES } from "../scripts/tour-des-sections/recensement";
import { arbre, avecListes, durcir, listes, remplir, MOT_LONG, TITRE_LONG, BOUTON_LONG } from "../scripts/tour-des-sections/donnees";
import * as B from "../scripts/tour-des-sections/banc";

describe("tour des sections : le recensement et le contenu d'essai (sans navigateur)", () => {
  it("toutes les pièces à tenue sont recensées, chacune avec son module, sa feuille et ses constructions", () => {
    const pieces = recenser(), t = totaux(pieces);
    expect(pieces.map((p) => p.id)).toEqual(TENUE_SECTIONS.map((s) => s.id));
    expect(t.pieces).toBe(TENUE_SECTIONS.length);
    expect(t.constructions).toBe(TENUE_SECTIONS.reduce((a, s) => a + Math.max(1, s.constructions.length), 0));
    expect(Object.values(t.parModule).reduce((a, m) => a + m.pieces, 0)).toBe(t.pieces);
    for (const p of pieces) {
      expect(MODULES, p.id).toContain(p.module);
      expect(fs.existsSync(path.join(process.cwd(), "public", "sections", p.feuille)), `${p.id} : ${p.feuille}`).toBe(true);
      expect(p.constructions.length, p.id).toBeGreaterThan(0);
      // Chaque façon est dessinée quelque part.
      for (const c of p.constructions) expect(c.feuilles.length, `${p.id} : feuille de la façon « ${c.cle} »`).toBeGreaterThan(0);
    }
  });
  it("le contenu difficile : titres longs, bouton de six mots, marques longues, listes à un et à sept éléments", () => {
    expect(MOT_LONG).toHaveLength(24);
    expect(TITRE_LONG.split(" ").length).toBeGreaterThanOrEqual(9);
    expect(BOUTON_LONG.split(" ")).toHaveLength(6);
    const html = `<section class="tn tn-x"><h2>Court</h2><ul class="tn-l"><li>Un [À compléter : prix]</li><li>Deux</li><li>Trois</li></ul><ul data-tn-prestations><li>A</li><li>B</li></ul><p data-tn-fait>[À compléter : délai]</p><a class="tn-bt" href="#">Voir</a></section>`;
    expect(arbre(html).enfants[0].enfants.map((n) => n.tag)).toEqual(["h2", "ul", "ul", "p", "a"]);
    expect(listes(html)).toHaveLength(1); // la liste que le Studio remplit lui-même n'est pas répétée
    expect((avecListes(html, 7).match(/<li>/g) ?? []).length).toBe(7 + 2);
    expect((avecListes(html, 1).match(/<li>/g) ?? []).length).toBe(1 + 2);
    const dur = durcir(html);
    expect(dur).toContain(`<h2>${TITRE_LONG}</h2>`);
    expect(dur).toContain(`>${BOUTON_LONG}</a>`);
    expect(dur).toContain("[À compléter : une information un peu longue à demander au client]");
    expect(dur).toMatch(/<p data-tn-fait>Une réponse longue/); // un fait marqué reçoit une réponse : sinon le Studio retire la pièce
    expect(remplir(html)).not.toContain("[À compléter");
  });
});

// ---------------------------------------------------------------- chaque détecteur, sur une page fabriquée

type Cas = { type: string; quoi: string; largeur?: number; fautive: string; saine: string; css?: string; ctx?: B.Contexte };
const S = (dedans: string, attrs = "") => `<section class="tn tn-essai" data-ct="t0"${attrs}>${dedans}</section>`;
const PHOTO = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#557"/></svg>').toString("base64");
const CAS: Cas[] = [
  { type: "debordement-page", quoi: "la page dépasse de l'écran", fautive: S('<div style="width:520px;height:40px;background:#ccc"></div>'), saine: S('<div style="width:100%;height:40px;background:#ccc"></div>') },
  { type: "plus-large-que-ecran", quoi: "un élément plus large que l'écran", fautive: S('<div style="width:520px;height:40px;background:#ccc"></div>'), saine: S('<div style="overflow-x:auto"><div style="width:520px;height:40px;background:#ccc"></div></div>') },
  { type: "hors-ecran", quoi: "un texte qui sort de l'écran", fautive: S('<p style="white-space:nowrap;margin:0">Une phrase bien trop longue pour tenir sur la largeur d\'un téléphone, sans retour à la ligne.</p>'), saine: S('<p style="margin:0">Une phrase bien trop longue pour tenir sur une ligne, mais qui revient à la ligne.</p>') },
  { type: "hors-section", quoi: "un texte qui sort de sa section", largeur: 1280, fautive: `<div style="width:400px">${S('<p style="white-space:nowrap;margin:0">Une phrase bien trop longue pour tenir dans une section de quatre cents pixels de large.</p>')}</div>`, saine: `<div style="width:400px">${S('<p style="margin:0">Une phrase qui revient à la ligne dans sa section.</p>')}</div>` },
  { type: "texte-coupe", quoi: "un texte rogné par son cadre", fautive: S('<div style="width:120px;overflow:hidden;white-space:nowrap">Un texte beaucoup trop long pour sa case</div>'), saine: S('<div style="width:120px;overflow:hidden">Court</div>') },
  { type: "texte-coupe", quoi: "un texte fini par des points de suspension", fautive: S('<div style="width:120px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Un texte beaucoup trop long pour sa case</div>'), saine: S('<div style="width:320px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">Un texte court</div>') },
  { type: "texte-coupe", quoi: "le choix d'une liste déroulante rogné", fautive: S('<select style="width:120px;font:16px Arial"><option>Coupe, soin profond et coiffage pour cheveux très longs</option></select>'), saine: S('<select style="width:300px;font:16px Arial"><option>Coupe</option></select>') },
  { type: "texte-sort-de-sa-boite", quoi: "un texte qui dépasse de sa pastille (le rond déformé par « À compléter »)", fautive: S('<div style="display:flex;gap:8px"><label style="display:grid;place-items:center;width:56px;height:56px;border:1px solid #111;border-radius:50%;white-space:nowrap"><span>À compléter : dépôt l\'après-midi</span></label></div>'), saine: S('<div style="display:flex;gap:8px"><label style="display:grid;place-items:center;width:56px;height:56px;border:1px solid #111;border-radius:50%"><span>M</span></label></div>') },
  { type: "pastille-deformee", quoi: "une pastille ronde étirée par son texte", fautive: S('<div style="display:flex;gap:10px;align-items:flex-start"><label class="p" style="display:grid;place-items:center;min-width:48px;min-height:48px;padding:4px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>S</span></label><label class="p" style="display:grid;place-items:center;min-width:48px;min-height:48px;padding:4px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>M</span></label><label class="p" style="display:grid;place-items:center;min-width:48px;min-height:48px;max-width:150px;padding:4px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>À compléter : dépôt l\'après-midi, seulement si Karim le propose</span></label></div>'), saine: S('<div style="display:flex;gap:10px"><label class="p" style="display:grid;place-items:center;width:48px;height:48px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>S</span></label><label class="p" style="display:grid;place-items:center;width:48px;height:48px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>M</span></label><label class="p" style="display:grid;place-items:center;width:48px;height:48px;border:1px solid #111;border-radius:999px"><input type="radio" name="a" hidden><span>L</span></label></div>') },
  { type: "bouton-trop-de-lignes", quoi: "un bouton sur plus de deux lignes", fautive: S('<a class="tn-bt" href="#" style="display:block;width:110px;padding:12px;background:#111;color:#fff;text-align:center">Réserver ma place dès maintenant ici</a>'), saine: S('<a class="tn-bt" href="#" style="display:block;width:260px;padding:14px;background:#111;color:#fff;text-align:center">Réserver ma place</a>') },
  { type: "lettres-seules", quoi: "un mot coupé au milieu, des lettres seules sur une ligne", fautive: S('<p style="width:130px;font:16px monospace;overflow-wrap:anywhere;margin:0">Extraordinaires</p>'), saine: S('<p style="width:300px;font:16px Arial;overflow-wrap:anywhere;margin:0">Extraordinaires</p>') },
  { type: "mot-coupe", quoi: "un mot coupé sans trait d'union", fautive: S('<p style="width:90px;font:16px Arial;overflow-wrap:anywhere;margin:0">Extraordinairement</p>'), saine: S('<p style="width:90px;font:16px Arial;margin:0">Un mot et un autre</p>') },
  { type: "colonne-etroite", quoi: "une colonne de moins de 40 px qui porte du texte", fautive: S('<div style="display:flex"><p style="width:28px;overflow-wrap:anywhere;margin:0">Du texte dans une colonne écrasée</p><div style="flex:1;height:10px"></div></div>'), saine: S('<div style="display:flex"><p style="width:200px;margin:0">Du texte dans une colonne normale</p></div>') },
  { type: "chevauchement", quoi: "deux textes l'un sur l'autre", fautive: S('<div style="position:relative;height:80px"><p style="position:absolute;left:0;top:10px;margin:0">Premier texte posé là</p><p style="position:absolute;left:30px;top:16px;margin:0">Second texte posé dessus</p></div>'), saine: S('<p style="margin:0">Premier texte</p><p style="margin:0">Second texte</p>') },
  { type: "chevauchement", quoi: "un bouton sur un texte", fautive: S('<div style="position:relative;height:90px"><p style="margin:0;padding-top:20px">Un texte que le bouton recouvre</p><a class="tn-bt" href="#" style="position:absolute;left:10px;top:12px;display:block;padding:12px 20px;background:#111;color:#fff">Acheter</a></div>'), saine: S('<p style="margin:0 0 20px">Un texte</p><a class="tn-bt" href="#" style="display:inline-block;padding:14px 20px;background:#111;color:#fff">Acheter</a>') },
  { type: "contraste", quoi: "un texte presque de la couleur de son fond", fautive: S('<p style="margin:0;color:#FFD23F;background:#FFF6E0;padding:10px">Du jaune sur du crème</p>'), saine: S('<p style="margin:0;color:#1A1F3A;background:#FFF6E0;padding:10px">Du bleu nuit sur du crème</p>') },
  { type: "contraste", quoi: "un texte clair sur une photo claire (pixels lus sous le texte)", fautive: S(`<div style="background-image:url(${PHOTO.replace("#557", "#eee").replace("%23557", "%23eee")});background-color:#eee;padding:30px"><p style="margin:0;color:#fff">Du blanc sur une photo claire</p></div>`.replace(PHOTO, "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#eee"/></svg>').toString("base64"))), saine: S(`<div style="background-image:url(${PHOTO});background-size:cover;padding:30px"><p style="margin:0;color:#fff">Du blanc sur une photo sombre</p></div>`) },
  { type: "texte-petit", quoi: "un texte de moins de 12 px", fautive: S('<p style="font-size:10px;margin:0">Un texte minuscule</p>'), saine: S('<p style="font-size:13px;margin:0">Un petit texte lisible</p>') },
  { type: "titre-trop-long", quoi: "un grand titre de plus de cinq lignes sur téléphone", fautive: S('<h2 style="font:44px/1 Georgia;margin:0;width:220px">Un titre vraiment long de dix mots avec encore du monde dedans</h2>'), saine: S('<h2 style="font:44px/1 Georgia;margin:0">Un titre court</h2>') },
  { type: "pave-gras", quoi: "des coordonnées en pavé gras dans la police des titres", fautive: S('<address style="font:700 22px/1.2 Georgia,serif;font-style:normal">Maison Essai, 12 rue des Lilas, 69003 Lyon. Du mardi au samedi, de 9 h à 19 h. Téléphone : 04 72 00 00 00. Parking à deux pas.</address>'), saine: S('<address style="font:400 16px/1.4 Arial;font-style:normal">Maison Essai, 12 rue des Lilas, 69003 Lyon. Du mardi au samedi, de 9 h à 19 h. Téléphone : 04 72 00 00 00. Parking à deux pas.</address>') },
  { type: "ombre-coupee", quoi: "un bouton dont l'ombre décalée sort du bas de sa section (recouverte par la suivante)", fautive: `<section class="tn tn-essai" data-ct="t0" style="padding:24px 20px 0"><a class="tn-bt" href="#" style="display:block;padding:14px;background:#FFD23F;border:2px solid #111;box-shadow:5px 5px 0 #111">Acheter</a></section><section class="tn" data-ct="t1" style="background:#eee"><p>La section suivante</p></section>`, saine: `<section class="tn tn-essai" data-ct="t0" style="padding:24px 20px 24px"><a class="tn-bt" href="#" style="display:block;padding:14px;background:#FFD23F;border:2px solid #111;box-shadow:5px 5px 0 #111">Acheter</a></section><section class="tn" data-ct="t1" style="background:#eee"><p>La section suivante</p></section>` },
  { type: "ombre-coupee", quoi: "une ombre décalée rognée par son cadre", fautive: S('<div style="overflow:hidden"><a class="tn-bt" href="#" style="display:block;padding:14px;background:#FFD23F;border:2px solid #111;box-shadow:5px 5px 0 #111">Acheter</a></div>'), saine: S('<div style="overflow:hidden;padding:0 8px 8px 0"><a class="tn-bt" href="#" style="display:block;padding:14px;background:#FFD23F;border:2px solid #111;box-shadow:5px 5px 0 #111">Acheter</a></div>') },
  { type: "bord-recouvert", quoi: "une carte qui dépasse du bas de sa section", fautive: `<section class="tn tn-essai" data-ct="t0" style="height:80px"><div style="height:120px;border:2px solid #111;background:#fafafa">Une carte</div></section>`, saine: S('<div style="height:120px;border:2px solid #111;background:#fafafa">Une carte</div>') },
  { type: "zone-a-toucher", quoi: "un bouton de moins de 40 px de haut sur téléphone", fautive: S('<a class="tn-bt" href="#" style="display:inline-block;padding:4px 12px;background:#111;color:#fff">Voir</a>'), saine: S('<a class="tn-bt" href="#" style="display:inline-block;padding:14px 20px;background:#111;color:#fff">Voir</a>') },
  { type: "boutons-colles", quoi: "deux boutons à moins de 8 px l'un de l'autre", fautive: S('<div><a class="tn-bt" href="#" style="display:block;padding:14px;background:#111;color:#fff;margin-bottom:2px">Un</a><a class="tn-bt" href="#" style="display:block;padding:14px;background:#111;color:#fff">Deux</a></div>'), saine: S('<div><a class="tn-bt" href="#" style="display:block;padding:14px;background:#111;color:#fff;margin-bottom:12px">Un</a><a class="tn-bt" href="#" style="display:block;padding:14px;background:#111;color:#fff">Deux</a></div>') },
  { type: "section-vide", quoi: "une section haute sans rien de visible", fautive: `<section class="tn tn-essai" data-ct="t0" style="height:300px"><div></div></section>`, saine: S("<p>Du contenu</p>") },
  { type: "section-nulle", quoi: "une section rendue de hauteur nulle", fautive: `<section class="tn tn-essai" data-ct="t0" style="height:0;padding:0;overflow:hidden"><p>Caché</p></section>`, saine: S("<p>Du contenu</p>") },
  { type: "trou", quoi: "un vide de plus de 120 px entre deux éléments", fautive: S('<p style="margin:0">En haut</p><div style="height:220px"></div><p style="margin:0">En bas</p>'), saine: S('<p style="margin:0">En haut</p><div style="height:40px"></div><p style="margin:0">En bas</p>') },
  { type: "cadre-vide", quoi: "un cadre de photo vide", fautive: S('<p>Un texte</p><div class="tn-ph" style="height:180px;background-color:#ddd"></div>'), saine: S(`<p>Un texte</p><div class="tn-ph" style="height:180px;background-image:url(${PHOTO})"></div>`) },
  { type: "crochets-bruts", quoi: "des crochets « [À compléter » affichés tels quels dans un site monté", ctx: { monte: true }, fautive: S("<p>Livraison : [À compléter : une information vraiment très longue que le Studio n'a pas su marquer en jaune parce qu'elle dépasse]</p>"), saine: S('<p>Livraison : <mark class="tn-manque">À compléter : délai</mark></p>') },
  { type: "texte-exemple", quoi: "un nom d'exemple de la bibliothèque dans un site monté", ctx: { monte: true, exemples: ["Brindi"] }, fautive: S("<p>Bienvenue chez Brindi</p>"), saine: S("<p>Bienvenue chez Maison Essai</p>") },
  { type: "arche", quoi: "une photo dans une arche", fautive: S(`<div class="tn-ph" style="width:200px;height:280px;border-radius:100px 100px 0 0;background-image:url(${PHOTO})"></div>`), saine: S(`<div class="tn-ph" style="width:200px;height:200px;border-radius:50%;background-image:url(${PHOTO})"></div>`) },
  { type: "sections-collees", quoi: "deux sections de même fond sans rien pour les séparer", fautive: `<section class="tn" data-ct="t0" style="padding:24px 20px 0"><p style="margin:0">La fin de la première</p></section><section class="tn" data-ct="t1" style="padding:0 20px 24px"><h2 style="margin:0">Le titre de la seconde</h2></section>`, saine: `<section class="tn" data-ct="t0" style="padding:24px 20px 44px"><p style="margin:0">La fin de la première</p></section><section class="tn" data-ct="t1" style="padding:44px 20px 24px"><h2 style="margin:0">Le titre de la seconde</h2></section>` },
  { type: "collant-sous-entete", quoi: "un titre collant qui passe sous l'en-tête collant", largeur: 1280, fautive: `<section class="tn" data-ct="t0" data-ct-role="header" style="position:sticky;top:0;height:70px;background:#fff;z-index:5"><b>En-tête</b></section><section class="tn" data-ct="t1"><h2 style="position:sticky;top:24px;margin:0">Titre collant</h2><p style="height:900px">Long texte</p></section>`, saine: `<section class="tn" data-ct="t0" data-ct-role="header" style="position:sticky;top:0;height:70px;background:#fff;z-index:5"><b>En-tête</b></section><section class="tn" data-ct="t1"><h2 style="position:sticky;top:94px;margin:0">Titre collant</h2><p style="height:900px">Long texte</p></section>` },
];

const NAVIGATEUR = !!process.env.CHROMIUM;
describe.runIf(NAVIGATEUR)("tour des sections : chaque détecteur attrape son défaut, et se tait sur une page saine", () => {
  let browser: import("playwright").Browser, service: B.Service, og: Awaited<ReturnType<typeof B.onglet>>;
  beforeAll(async () => { browser = await B.ouvrirNavigateur(); service = await B.servir(() => null); og = await B.onglet(browser, service); }, 60_000);
  afterAll(async () => { await browser?.close(); await service?.fermer(); });
  const types = async (html: string, c: Cas) => { await og.montrer(B.pageFabriquee(html, c.css), c.largeur ?? 390, 844); return (await B.mesurer(og.page, c.ctx ?? {})).defauts; };
  for (const c of CAS) it(`${c.type} : ${c.quoi}`, async () => {
    const fautive = await types(c.fautive, c);
    expect(fautive.map((d) => d.type), `page fautive : ${JSON.stringify(fautive.map((d) => `${d.type} ${d.detail}`))}`).toContain(c.type);
    const d = fautive.find((x) => x.type === c.type)!;
    expect(d.selecteur.length).toBeGreaterThan(0);
    expect(d.cadre).toHaveLength(4);
    const saine = await types(c.saine, c);
    expect(saine.filter((x) => x.type === c.type).map((x) => x.detail), "page saine").toEqual([]);
  }, 30_000);
  it("une page saine ordinaire ne lève aucun défaut bloquant ni important", async () => {
    const html = S('<h2 style="font:32px/1.1 Georgia;margin:0 0 12px">Un titre simple</h2><p style="margin:0 0 20px">Un paragraphe de texte courant, qui revient à la ligne tout seul sur un téléphone.</p><a class="tn-bt" href="#" style="display:inline-block;padding:14px 22px;background:#111;color:#fff;border-radius:999px">Voir la suite</a>');
    for (const largeur of [320, 390, 1280]) { await og.montrer(B.pageFabriquee(html), largeur, 844); expect((await B.mesurer(og.page, { monte: true })).defauts.filter((d) => d.gravite !== "mineur").map((d) => `${largeur} ${d.type} ${d.detail}`)).toEqual([]); }
  }, 30_000);
  it("ce qui est replié s'ouvre pour être regardé (volets)", async () => {
    await og.montrer(B.pageFabriquee(S("<details><summary>Une question</summary><p>Sa réponse</p></details>")), 390, 844);
    expect(await B.ouvrir(og.page)).toEqual(["1 volet(s)"]);
    expect(await og.page.evaluate(() => document.querySelector("details")!.open)).toBe(true);
  }, 30_000);
});

// ---------------------------------------------------------------- le tour : plus un seul défaut bloquant nouveau

describe.runIf(NAVIGATEUR && process.env.TOUR !== "non")("tour des sections : aucun défaut bloquant hors de connus.json", () => {
  it("le tour (détecteurs seuls) ne mesure aucun défaut bloquant nouveau", async () => {
    // La base d'essai : un dossier jetable, posé avant tout import du Studio par le banc.
    const avant = process.env.DATA_DIR, donnees = fs.mkdtempSync(path.join(os.tmpdir(), "tour-des-sections-essai-"));
    process.env.DATA_DIR = donnees; process.env.STUDIO_SYNA_AGENT = "1";
    try {
      const T = await import("../scripts/tour-des-sections/tour-lib");
      const liste = (v: string | undefined) => v?.split(",").map((x) => x.trim()).filter(Boolean);
      const r = await T.tourner({ sortie: path.join(donnees, "sortie"), modules: liste(process.env.TOUR_MODULE), pieces: liste(process.env.TOUR_PIECE), planches: false });
      expect(r.rendus).toBeGreaterThan(0);
      const defauts = r.fiches.flatMap((f) => f.defauts), pieces = r.fiches.map((f) => f.piece);
      expect(T.nouveaux(defauts, T.lireConnus(), pieces), "défauts bloquants absents de scripts/tour-des-sections/connus.json").toEqual([]);
    } finally { if (avant === undefined) delete process.env.DATA_DIR; else process.env.DATA_DIR = avant; fs.rmSync(donnees, { recursive: true, force: true }); }
  }, 3_600_000);
});
