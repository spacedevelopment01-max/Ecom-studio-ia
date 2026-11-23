/**
 * Défauts relevés sur le site refait de Bécane (essai réel du 18 novembre 2026), corrigés sans IA :
 *  - deux scènes de vélo dans une cour presque identiques : une photo du site d'avant demandée deux fois était, la
 *    seconde fois, CRÉÉE d'après sa description ;
 *  - les mêmes faits redits de page en page : la même pièce (questions, engagements) posée sur plusieurs pages, son
 *    rédacteur ne voyait pas ce qu'elle disait ailleurs ;
 *  - SINA refusait de montrer des réalisations, alors que la règle du propriétaire (14 novembre 2026) les fait créer
 *    quand le client n'en a pas assez.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

process.env.STUDIO_SYNA_AGENT = "1";

describe("site refait de Bécane : les défauts relevés ne reviennent plus", async () => {
  const B = await import("@/lib/syna-agent/custom-theme/brand");
  const { authenticSection } = await import("@/lib/syna-agent/custom-theme/library");

  it("une photo du site d'avant demandée deux fois : la seconde demande est relevée (déjà prise plus haut, ou déjà sur le site)", () => {
    const reprises = new Map([[2, "asset-r2"], [13, "asset-r13"], [5, "asset-r5"]]);
    const photos = [
      { uid: "a", find: "photos/x.jpg", description: "REPRENDRE R2 : vélo dans une cour", titre: "Réserver" },
      { uid: "b", find: "photos/y.jpg", description: "REPRENDRE R2 : vélo dans une cour", titre: "Ton créneau" },
      { uid: "c", find: "photos/z.jpg", description: "REPRENDRE R13 : étiquette jaune", titre: "Prestations" },
      { uid: "d", find: "photos/w.jpg", description: "REPRENDRE R5 : quai", titre: "Zone" },
      { uid: "e", find: "photos/v.jpg", description: "REPRENDRE R9 : inconnue", titre: "Autre" },
      { uid: "f", find: "photos/u.jpg", description: "Une scène neuve", titre: "Autre" },
    ];
    const d = B.reprisesEnDouble(photos, reprises, new Set(["asset-r5"]));
    expect(d).toEqual([{ uid: "b", find: "photos/y.jpg", n: 2, chez: "Réserver" }, { uid: "d", find: "photos/w.jpg", n: 5, chez: null }]);
    expect(B.repriseEnDoubleFix(d[0])).toMatch(/R2[\s\S]*« Réserver »[\s\S]*photo NEUVE, sans « REPRENDRE »/);
    expect(B.repriseEnDoubleFix(d[1])).toMatch(/déjà prise sur le site/);
  });

  it("la relecture des photos fait redécrire la seconde demande, puis un second passage pour celles créées par une reprise ; jamais recréée à l'identique sans le dire", () => {
    const src = fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8");
    expect(src).toContain("for (const d of reprisesEnDouble(photosDuSite(), reprises, dejaPosees).filter(relue))");
    // Le second passage, à la charge du Studio depuis le 22 novembre 2026 (une erreur de SINA n'est jamais comptée).
    expect(src).toContain('redecrire(uid, encore.filter((d) => d.uid === uid).map((d) => ({ uid, find: d.find, fixes: [repriseEnDoubleFix(d)] })), i, uids2.length, "photo-fix-double")');
    expect(src).toContain("elle reprenait une photo déjà sur le site ; créée avec la consigne d'une scène différente");
    expect(B.MAX_DOUBLES_FIXES).toBe(3);
  });

  it("le rédacteur voit ce que la même pièce dit déjà sur les autres pages, et seulement elle (deux séries de questions comptent pour une même pièce)", () => {
    const VOLET = (q: string) => `<details><summary>${q}</summary><p>Réponse.</p></details>`;
    const ecrites = [
      { uid: "s1", id: "tn-questions-rubriques", page: "Accueil", html: `<section><h2>Tes questions</h2>${VOLET("Et s'il n'est pas prêt le soir&nbsp;?")}${VOLET("Comment je paie ?")}</section>` },
      { uid: "s2", id: "tn-engagements", page: "À propos", html: `<section><h2>Ce que je promets</h2><ul><li>Le prix annoncé avant de commencer</li></ul></section>` },
      { uid: "s3", id: "tn-zone", page: "Accueil", html: `<section><h2>Où je viens</h2></section>` },
    ];
    const q = B.memePieceAilleurs({ uid: "s9", id: "tn-questions" }, ecrites)!;
    expect(q).toMatch(/^CETTE PIÈCE EST DÉJÀ SUR D'AUTRES PAGES/);
    expect(q).toContain("- sur « Accueil » : « Tes questions » ; « Et s'il n'est pas prêt le soir ? » ; « Comment je paie ? »");
    expect(q).not.toContain("Ce que je promets");
    const e = B.memePieceAilleurs({ uid: "s8", id: "tn-engagements" }, ecrites)!;
    expect(e).toContain("« Le prix annoncé avant de commencer »");
    expect(B.memePieceAilleurs({ uid: "s1", id: "tn-questions-rubriques" }, ecrites.slice(0, 1))).toBeNull();
    expect(B.memePieceAilleurs({ uid: "s7", id: "tn-histoire" }, ecrites)).toBeNull();
    // Et c'est donné au rédacteur, dans sa consigne.
    const prompt = B.sectionWritePrompt("DOSSIER", "Aide", "Questions", "répond", "<section></section>", undefined, { ailleurs: q });
    expect(prompt).toContain("CETTE PIÈCE EST DÉJÀ SUR D'AUTRES PAGES");
    expect(fs.readFileSync("src/lib/syna-agent/custom-theme/brand.ts", "utf8")).toContain("ailleurs: memePieceAilleurs({ uid: x.s.uid, id: x.s.id },");
  });

  it("les réalisations d'artisans se créent quand le client n'en a pas : SINA le sait, et le site ne les réserve pas à ses vraies photos", async () => {
    for (const id of ["tn-realisations", "tn-avant-apres", "tn-realisations-types"]) expect(authenticSection(id, "services"), id).toBeNull();
    const { SYNA_SYSTEM } = await import("@/lib/syna-agent/prompt");
    expect(SYNA_SYSTEM).toMatch(/Ses réalisations[^.]*s'il n'en a pas assez en photos, le Studio en crée pour son site, en suivant la règle des personnes \(« Jamais de personne dans une image sans photo fournie par le client ou son accord écrit\. »\)/);
    expect(SYNA_SYSTEM).toMatch(/tu ne lui dis jamais que tu ne peux pas les montrer/);
  });
});
