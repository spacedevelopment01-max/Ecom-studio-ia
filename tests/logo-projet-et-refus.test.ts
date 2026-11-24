/**
 * Les images de la planche, sans le logo (il vient de la méthode des graphistes) : redessin avec toutes les raisons des
 * refus, jamais une planche incomplète, le relecteur des images, les consignes de base des photos. Sans IA.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("logos : redessin avec toutes les raisons des refus (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  it("un redessin de photo reçoit toutes les raisons des refus, jamais une raison technique", () => {
    const une = I.fixLine(["une goutte d'eau, refusée par le client"], 1);
    expect(une).toMatch(/une première image a été refusée pour cette raison : « une goutte d'eau, refusée par le client »/);
    const deux = I.fixLine(["une goutte d'eau, refusée par le client", "trop sage"], 2);
    expect(deux).toMatch(/à corriger TOUTES à la fois/);
    expect(deux).toMatch(/1\. « une goutte d'eau, refusée par le client »\n2\. « trop sage »/);
    expect(deux).toMatch(/Fais plus simple/);
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois"], 1)).toBe("");
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois", "trop sage"], 1)).toMatch(/une première image a été refusée pour cette raison : « trop sage »/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("c.prompt + fix(s, why, attempt)");
  });
});

describe("jamais une planche incomplète : une image refaite et refusée garde celle d'avant (21 novembre 2026)", () => {
  it("le haut du site et la grande scène refaits et refusés restent ceux d'avant ; le haut du site est noté à refaire au choix", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('made.get(k as ImageSlot) ?? (k === "site" || k === "hero" ? before[k] : undefined)');
    expect(img).toContain('const siteGarde = wanted.has("site") && !made.get("site") && !!before.site;');
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain).toContain("if (r.siteGarde) siteGardes.push(x.key);");
    expect(chain).toContain("...seul, ...siteGardes])]");
    // Le logo ne se dessine jamais avec les images de la planche (méthode des graphistes, seule façon de faire).
    expect(img).toContain('wanted.delete("logo");');
    expect(img).not.toMatch(/demandeDuLogo|phraseDeLaSerie|serieLogos|keptLogos/);
    // Sur chaque carte proposée, une ligne visible dit ce qui est créé au choix.
    const cards = fs.readFileSync("src/components/studio/brand-boards.tsx", "utf8");
    expect(cards).toContain("Dès ton choix : l'objet qui porte ton logo, tes signes en photo et tes trois premières publications.");
  });
});

describe("le relecteur des images : le plus fort, une image à la fois, une liste de défauts, 8 sur 10 au moins (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const P = await import("@/lib/syna-agent/brand-prompts");
  it("consigne : décrire d'abord, chercher les défauts vus le 21 novembre, noter sévèrement", () => {
    const sys = P.imageReviewSystem();
    expect(sys).toMatch(/D'abord, seen = ce que tu vois, zone par zone/);
    for (const d of [/une TACHE, une zone sale/, /un texte FLOU, baveux, entouré d'un halo/, /une grande zone VIDE sans raison : un écran de téléphone à moitié vide/, /un cadre arrondi, une ARCHE, une demi-lune ou une vignette ronde/, /un objet VIDE ou posé sans raison \(un carton blanc/, /un bouton coupé, vide ou séparé de son texte/, /ce que le client refuse/]) expect(sys).toMatch(d);
    expect(sys).toMatch(/Une image n'est gardée que sans aucun défaut de la liste ET avec une note d'au moins 8\./);
    expect(sys).not.toMatch(/et seulement ceux-là|même si tu l'aurais composée autrement/);
    expect(I.NOTE_MIN).toBe(8);
  });
  it("une image jugée bonne mais notée sous 8 est refusée ; le relecteur est le modèle fort ; une relecture par image", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    // Toujours, même avec ok = faux ou sans ok (essai réel de Nadia, 23 novembre 2026).
    expect(img).toContain("if (v.score != null && v.score < NOTE_MIN) {");
    expect(img).not.toContain("if (v.ok && v.score != null && v.score < NOTE_MIN)");
    // Une relecture par image (la relecture d'une reprise est à la charge du Studio, 22 novembre 2026).
    expect(img).toContain("for (const s of slots) await reviewOne([s], slots.length > 1 ? `${rt}:${s}` : rt);");
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    // Limite relevée le 23 novembre 2026 (réflexion prévue plus réponse attendue, tests/marque-equipe-coupee.test.ts).
    expect(chain).toContain('look: { tier: "strong", input: 9_000, output: 2_500, reflexion: 6_000, reponse: 3_800, max: 12_000 },');
    expect(chain).toContain('routing: { difficulty: "complex", prefer: modelOf(s, "look") },');
    expect(chain).toContain('return id === "look" ? { ...s.strong, effort: "high" }');
  });
});

describe("consignes de base claires des photos (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const imagery = { look: "calme", logo: "La marque.", signs: "Les signes.", hero: "La scène.", object: "La carte.", site: "Le haut du site.", posts: ["Un.", "Deux.", "Trois."] } as never;
  it("le logo ne se dessine plus avec les images de la planche : sa demande n'existe plus ici", () => {
    expect(() => I.imagePrompt("logo", route("A") as never, imagery)).toThrow(/méthode des graphistes/);
  });
  it("les photos reçoivent les consignes de base, dites en positif", () => {
    for (const sl of ["hero", "object", "signs", "site", "post0"] as const) expect(I.imagePrompt(sl, route("A") as never, imagery)).toContain(I.BORD_A_BORD);
    expect(I.imagePrompt("site", route("A") as never, imagery)).toContain(I.SITE_REMPLI);
    expect(I.imagePrompt("post1", route("A") as never, imagery)).toContain(I.TEXTE_NET);
    expect(I.imagePrompt("object", route("A") as never, imagery)).toContain(I.OBJETS_UTILES);
    expect(I.imagePrompt("hero", route("A") as never, imagery)).not.toContain(I.TEXTE_NET);
  });
});
