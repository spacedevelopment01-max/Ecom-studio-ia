/**
 * Le dessinateur du logo voit seulement les logos de la série en cours (règle du propriétaire), et reçoit ce que le client a dit de
 * l'image qu'il veut (essai réel du 20 novembre 2026 : un plombier refusait « la goutte d'eau et la clé à molette »,
 * ses trois logos portaient une goutte d'eau et étaient construits pareil). Sans IA.
 */
import fs from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { route } from "./sina-routes-fixtures";

process.env.STUDIO_SYNA_AGENT = "1";

describe("logos : seulement ceux de la série en cours montrés, les refus du client transmis", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const { saveAsset } = await import("@/lib/library");
  const { run } = await import("@/lib/db");
  const { account } = await import("./conversation209-fixtures");
  const imagery = { look: "calme", logo: "Ce qu'il faut savoir de la marque.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;

  it("les mots du client ne vont plus au dessinateur du logo (« enlève la 7 »), seulement au relecteur des images", () => {
    expect(I.imagePrompt("logo", route("A") as never, imagery)).not.toMatch(/Ce que le client a dit/);
    // Décision du 23 novembre 2026 : le métier en mots simples et le nom, rien de plus.
    expect(I.imagePrompt("logo", route("A") as never, imagery)).toBe(I.demandeDuLogo(route("A") as never));
  });
  it("la série revient dans la demande nue (le propriétaire, 23 novembre 2026) ; la chaîne transmet les goûts du client au relecteur", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).not.toMatch(/logoSheet|madeLogos/);
    expect(I.phraseDeLaSerie(0, 0)).toBe("");
    expect(I.phraseDeLaSerie(1, 0)).toBe("Je veux un autre logo complètement différent de celui-là.");
    expect(I.phraseDeLaSerie(0, 1)).toBe("Je veux un autre logo complètement différent de celui-là.");
    expect(I.phraseDeLaSerie(2, 0)).toBe("Fais-moi un autre logo complètement différent des deux premiers.");
    expect(I.phraseDeLaSerie(3, 0)).toBe("Fais-moi un autre logo complètement différent des trois premiers.");
    expect(I.phraseDeLaSerie(2, 1)).toBe("Fais-moi un autre logo complètement différent de tous ceux-là.");
    expect(I.phraseDeLaSerie(0, 2)).toBe("Fais-moi un autre logo complètement différent de tous ceux-là.");
    expect(img).toContain("Ce que le client a dit de l'image qu'il veut, avec ses mots : « ${o.gouts.trim()} ». Une image, et surtout le logo, qui montre ce qu'il refuse est un défaut");
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    // Les goûts du client viennent de sa fiche (réponse « image », goûts et refus pour les images) : `goutsDuClient`.
    expect(chain.match(/gouts: goutsDuClient\(j, p\.id\), keptLogos: \[\.\.\.gardesSerie\], serieLogos \}/g)).toHaveLength(1);
    expect(chain).toContain("goutsDuClient(j, p.id, logoOnly ? clientWords(a.guidance) : undefined)");
    expect(chain).not.toMatch(/seriesLogos|redoneLogos|refusDuClientPourLeLogo|ideesSimples/);
  });
  it("le trait près du nom : rien au dessinateur ; le relecteur seul tient « un seul par série » (accord du 23 novembre 2026)", async () => {
    expect(I.imagePrompt("logo", route("A") as never, imagery)).not.toMatch(/trait|filet/);
    expect((I as Record<string, unknown>).LOGO_TRAIT_DEJA_PRIS).toBeUndefined();
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).not.toContain(":sans-trait");
    expect(img).toContain("...(trait ? [TRAIT_DEJA_PRIS_RELECTEUR] : []),");
    // Le contrôle sans IA qui repère un trait (pour dire au relecteur qu'il est déjà pris).
    const lettres = Array.from({ length: 8 }, (_v, i) => ({ input: { create: { width: 40, height: 70, channels: 3 as const, background: "#1F3D2B" } }, left: 100 + i * 55, top: 200 }));
    const fond = () => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } });
    expect((await I.traitHorizontal(await fond().composite([...lettres, { input: { create: { width: 420, height: 4, channels: 3 as const, background: "#1F3D2B" } }, left: 100, top: 300 }]).png().toBuffer())).trouve).toBe(true);
    expect((await I.traitHorizontal(await fond().composite(lettres).png().toBuffer())).trouve).toBe(false);
  });
});

describe("logos refaits seuls : le téléphone de la planche est refait pour l'identité choisie (20 novembre 2026)", async () => {
  const T = await import("@/lib/syna-agent/tools/identity");
  const F = await import("@/lib/syna-agent/brand-finish");
  it("seulement les images demandées ; une planche notée « ancien logo » reçoit sa maquette refaite à la fin de la marque", () => {
    expect(T.redoImages(["logo"])).toEqual(["logo"]);
    expect(T.redoImages(["logo", "logo", "hero"])).toEqual(["logo", "hero"]);
    const j = (ancien: string[]) => ({ keep: [], identityChoice: { key: "A", mix: {}, at: 1 }, identities: { list: [{ key: "A", name: "Aplomb", board: { images: { logo: { id: "l" }, hero: { id: "h" }, site: { id: "s" } } } }], issues: [], comparison: "", at: 1, round: 1, siteAncienLogo: ancien } }) as never;
    expect(F.missingSlots(j(["A"]))).toContain("site");
    expect(F.missingSlots(j([]))).not.toContain("site");
    expect(F.missingSlots(j(["B"]))).not.toContain("site");
  });
});

describe("logos : aucune consigne de style, les 50 logos aimés seulement comme exemples (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const M = await import("@/lib/ai/media-providers");
  const imagery = { look: "Lumière du matin, pierre calcaire.", logo: "Ce qu'il faut savoir de la marque.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;
  it("le dessinateur reçoit le métier en mots simples et le nom, et rien d'autre (décision du 23 novembre 2026)", async () => {
    const p = I.imagePrompt("logo", route("A") as never, imagery);
    expect(p).toBe(`Fais-moi un logo pour ${I.metierEnMotsSimples(route("A").board.descriptor)}. Le nom de la marque : « ${route("A").name} ».`);
    expect(p).not.toMatch(/La marque :|Son ton|Couleurs|Typographie|BLANC|fond|Il ne veut|Ce qu'il faut savoir|Lumière du matin|Direction artistique/);
    expect((I as Record<string, unknown>).LOGO_NIVEAU).toBeUndefined();
    expect((I as Record<string, unknown>).logoRefus).toBeUndefined();
    expect((I as Record<string, unknown>).ligneDeLaMarque).toBeUndefined();
    expect(P.imagerySystem("services")).not.toMatch(/- refus :/);
  });
  it("les 50 logos aimés ne sont plus joints au dessin du logo ; le relecteur les garde comme niveau", async () => {
    expect(await I.planchedesLogosAimes()).toBeInstanceOf(Buffer);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).not.toMatch(/examples:/);
    expect(img).toContain('? { prompt, aspect: SLOT_ASPECT[slot], usage: "logo" as const, ...(refs.serie?.length ? { serie: refs.serie } : {}) }');
    expect(img).toContain('const aimes = slots.includes("logo") ? await planchedesLogosAimes() : null;');
    expect(P.imageReviewSystem()).toMatch(/quand la planche des logos que le propriétaire aime est jointe/);
    void M;
  });
});

describe("logos : redessin avec toutes les raisons des refus (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  it("un redessin de photo reçoit toutes les raisons des refus, jamais une raison technique ; un logo, jamais rien", () => {
    const une = I.fixLine(["une goutte d'eau, refusée par le client"], 1);
    expect(une).toMatch(/une première image a été refusée pour cette raison : « une goutte d'eau, refusée par le client »/);
    const deux = I.fixLine(["une goutte d'eau, refusée par le client", "trop sage"], 2);
    expect(deux).toMatch(/à corriger TOUTES à la fois/);
    expect(deux).toMatch(/1\. « une goutte d'eau, refusée par le client »\n2\. « trop sage »/);
    expect(deux).toMatch(/Fais plus simple/);
    // Un logo : la même demande nue, sans aucune raison (décision du 23 novembre 2026).
    expect(I.fixLine(["une goutte d'eau, refusée par le client", "trop sage"], 2, "logo")).toBe("");
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois"], 1)).toBe("");
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois", "trop sage"], 1)).toMatch(/une première image a été refusée pour cette raison : « trop sage »/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("if (await dessine(`:r${attempt}`)) await review([\"logo\"], `:logo:r${attempt}`);");
    expect(img).toContain("c.prompt + fix(s, why, attempt)");
  });
});

describe("logo refait seul : la consigne de SINA ne va jamais au dessinateur (21 novembre 2026)", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  it("seuls les mots cités du client vont au relecteur ; la fiche du dessin n'a pas la consigne", () => {
    const g = "Le client a dit : « Refais seulement le logo de A. » Direction précise : un logotype sobre, un fil à plomb. Interdit : goutte d'eau, tuyau.";
    expect(C.clientWords(g)).toBe("Refais seulement le logo de A.");
    expect(C.clientWords("Direction : un fil à plomb.")).toBe("");
    const src = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(src).toContain("const imagesBrief = logoOnly ? briefBlock(j, p.id) : brief;");
    expect(src).toContain("brief: imagesBrief, kind");
    expect(src).toContain("logoOnly ? clientWords(a.guidance) : undefined");
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

describe("consignes de base claires et refus du client mot pour mot au dessinateur du logo (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const imagery = { look: "calme", logo: "La marque.", signs: "Les signes.", hero: "La scène.", object: "La carte.", site: "Le haut du site.", posts: ["Un.", "Deux.", "Trois."] } as never;
  const gouts = "Faire sérieux et propre, calme, quelqu'un à qui on confie sa maison sans stress. Il aime les tons de pierre, le blanc cassé, un vert profond. Il ne veut surtout pas : le style plombier avec une goutte d'eau et une clé à molette, de bleu électrique, de photos de stock avec un ouvrier qui sourit.";
  it("le logo ne reçoit plus la phrase de refus du client (décision du 23 novembre 2026) ; ses mots restent au relecteur", () => {
    expect((I as Record<string, unknown>).clientRefusal).toBeUndefined();
    const p = I.imagePrompt("logo", route("A") as never, imagery);
    expect(p).not.toMatch(/Il ne veut|goutte|tons de pierre|sans stress/);
    void gouts;
  });
  it("les photos reçoivent les consignes de base, dites en positif", () => {
    for (const sl of ["hero", "object", "signs", "site", "post0"] as const) expect(I.imagePrompt(sl, route("A") as never, imagery)).toContain(I.BORD_A_BORD);
    expect(I.imagePrompt("site", route("A") as never, imagery)).toContain(I.SITE_REMPLI);
    expect(I.imagePrompt("post1", route("A") as never, imagery)).toContain(I.TEXTE_NET);
    expect(I.imagePrompt("object", route("A") as never, imagery)).toContain(I.OBJETS_UTILES);
    expect(I.imagePrompt("hero", route("A") as never, imagery)).not.toContain(I.TEXTE_NET);
    expect(I.imagePrompt("logo", route("A") as never, imagery)).not.toContain(I.BORD_A_BORD);
  });
});

describe("marque finie, logo refait avec les mots du client : la consigne de SINA ne va pas au dessinateur (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  it("le logo reçoit le métier et le nom ; le relecteur, les mots du client", () => {
    const imagery = { look: "calme", logo: "Piste : un fil à plomb stylisé, vert profond.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;
    const fin = fs.readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8");
    expect(fin).not.toMatch(/logoLine|refusLogo|ideesSimples/);
    expect(fin).toContain("gouts: goutsDuClient(j, o.projectId, clientWords(o.guidance))");
    expect(I.imagePrompt("logo", route("A") as never, imagery)).toBe(I.demandeDuLogo(route("A") as never));
  });
});
