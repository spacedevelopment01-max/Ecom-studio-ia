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
    expect(I.imagePrompt("logo", route("A") as never, imagery)).toMatch(/Tu es totalement libre du dessin/);
  });

  it("la consigne « complètement différent » vise aussi la disposition, et la chaîne transmet les goûts du client", () => {
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("const already = o.madeLogos ?? [], shown = await logoSheet(already);");
    expect(img).not.toContain("logosDuProjet");
    expect(img).toMatch(/dans un autre style que \$\{n > 1 \? "chacun d'eux" : "lui"\} : une autre façon de faire \(je ne t'impose aucun style\)/);
    expect(img).toContain("Ce que le client a dit de l'image qu'il veut, avec ses mots : « ${o.gouts.trim()} ». Une image, et surtout le logo, qui montre ce qu'il refuse est un défaut");
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain.match(/gouts: j\.start\.image\?\.value \?\? null/g)).toHaveLength(1);
    expect(chain).toContain("[j.start.image?.value, logoOnly ? clientWords(a.guidance) : undefined]");
  });

  it("le trait près du nom avec parcimonie : jamais interdit, un seul par série, repéré sans IA sur l'image", async () => {
    expect(I.imagePrompt("logo", route("A") as never, imagery)).not.toMatch(/trait|filet/);
    expect(I.LOGO_TRAIT_DEJA_PRIS).toMatch(/Un des logos déjà faits a un trait, un filet ou une ligne près du nom : celui-ci n'en a pas/);
    // Un nom (des blocs séparés comme des lettres) avec, puis sans, un filet fin dessous.
    const lettres = Array.from({ length: 8 }, (_v, i) => ({ input: { create: { width: 40, height: 70, channels: 3 as const, background: "#1F3D2B" } }, left: 100 + i * 55, top: 200 }));
    const filet = { input: { create: { width: 420, height: 4, channels: 3 as const, background: "#1F3D2B" } }, left: 100, top: 300 };
    const fond = () => sharp({ create: { width: 640, height: 480, channels: 3, background: "#FFFFFF" } });
    const avec = await fond().composite([...lettres, filet]).png().toBuffer();
    const sans = await fond().composite(lettres).png().toBuffer();
    expect((await I.traitHorizontal(avec)).trouve).toBe(true);
    expect((await I.traitHorizontal(sans)).trouve).toBe(false);
    // Un aplat épais (un bandeau, un toit plein) n'est pas un trait.
    const bandeau = await fond().composite([...lettres, { input: { create: { width: 420, height: 60, channels: 3 as const, background: "#1F3D2B" } }, left: 100, top: 300 }]).png().toBuffer();
    expect((await I.traitHorizontal(bandeau)).trouve).toBe(false);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain("if (drawn && traitPris && (await traitHorizontal(drawn)).trouve) {");
    expect(img).toContain("(traitPris ? `\\n${LOGO_TRAIT_DEJA_PRIS}` : \"\")");
    expect(img).toContain('":sans-trait"');
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
  it("le dessinateur reçoit la marque (nom, métier, idée, couleurs, typographie, format) et rien d'autre", async () => {
    const p = I.imagePrompt("logo", route("A") as never, imagery);
    expect(p).toMatch(/Tu es totalement libre du dessin/);
    expect(p).toContain("La marque : Ce qu'il faut savoir de la marque.");
    expect(p).toMatch(/Typographie de la marque/);
    // « pas de consigne autre que les 50 logos en exemple » : ni phrase de niveau, ni signes interdits, ni lumière des photos.
    expect(p).not.toMatch(/tableau|caractère : jamais|EXPRESSIF|refuse ces signes|Lumière du matin|Direction artistique/);
    expect((I as Record<string, unknown>).LOGO_NIVEAU).toBeUndefined();
    expect((I as Record<string, unknown>).logoRefus).toBeUndefined();
    expect(P.imagerySystem("services")).not.toMatch(/- refus :/);
  });
  it("les 50 logos aimés sont joints au dessin du logo, annoncés seulement comme exemples", async () => {
    expect(await I.planchedesLogosAimes()).toBeInstanceOf(Buffer);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('examples: slot === "logo" ? await planchedesLogosAimes() : null');
    expect(M.imageReferencePrompt("x", ["avoid", "examples"])).toContain("image 2 : exemples de logos que j'aime, seulement comme exemples : n'en recopie aucun");
    // Le relecteur les garde aussi comme niveau.
    expect(img).toContain('const aimes = slots.includes("logo") ? await planchedesLogosAimes() : null;');
    expect(P.imageReviewSystem()).toMatch(/quand la planche des logos que le propriétaire aime est jointe/);
  });
});

describe("logos : redessin avec toutes les raisons des refus (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  it("un redessin reçoit toutes les raisons des refus, jamais une raison technique", () => {
    const une = I.fixLine(["une goutte d'eau, refusée par le client"], 1);
    expect(une).toMatch(/une première image a été refusée pour cette raison : « une goutte d'eau, refusée par le client »/);
    const deux = I.fixLine(["une goutte d'eau, refusée par le client", "trop sage"], 2);
    expect(deux).toMatch(/à corriger TOUTES à la fois/);
    expect(deux).toMatch(/1\. « une goutte d'eau, refusée par le client »\n2\. « trop sage »/);
    expect(deux).toMatch(/Fais plus simple/);
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois"], 1)).toBe("");
    expect(I.fixLine(["je n'ai pas pu la vérifier une seconde fois", "trop sage"], 1)).toMatch(/une première image a été refusée pour cette raison : « trop sage »/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('c.prompt + fix("logo", why)');
    expect(img).toContain("c.prompt + fix(s, why)");
  });
});

describe("logo refait seul : la consigne de SINA ne va jamais au dessinateur (21 novembre 2026)", async () => {
  const C = await import("@/lib/syna-agent/brand-chain");
  it("seuls les mots cités du client vont au relecteur ; la fiche du dessin n'a pas la consigne", () => {
    const g = "Le client a dit : « Refais seulement le logo de A. » Direction précise : un logotype sobre, un fil à plomb. Interdit : goutte d'eau, tuyau.";
    expect(C.clientWords(g)).toBe("Refais seulement le logo de A.");
    expect(C.clientWords("Direction : un fil à plomb.")).toBe("");
    const src = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(src).toContain("const imagesBrief = logoOnly ? briefBlock(j) : brief;");
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
    expect(img).toContain("if (v.ok && v.score != null && v.score < NOTE_MIN) {");
    expect(img).toContain("const review = async (slots: ImageSlot[], rt = \"\") => { for (const s of slots) await reviewOne([s], slots.length > 1 ? `${rt}:${s}` : rt); };");
    const chain = fs.readFileSync("src/lib/syna-agent/brand-chain.ts", "utf8");
    expect(chain).toContain('look: { tier: "strong", input: 9_000, output: 2_500, max: 6_000 },');
    expect(chain).toContain('routing: { difficulty: "complex", prefer: { ...s.strong, effort: "high" } },');
  });
});

describe("consignes de base claires et refus du client mot pour mot au dessinateur du logo (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const imagery = { look: "calme", logo: "La marque.", signs: "Les signes.", hero: "La scène.", object: "La carte.", site: "Le haut du site.", posts: ["Un.", "Deux.", "Trois."] } as never;
  const gouts = "Faire sérieux et propre, calme, quelqu'un à qui on confie sa maison sans stress. Il aime les tons de pierre, le blanc cassé, un vert profond. Il ne veut surtout pas : le style plombier avec une goutte d'eau et une clé à molette, de bleu électrique, de photos de stock avec un ouvrier qui sourit.";
  it("le logo reçoit seulement la phrase de refus du client, telle qu'il l'a écrite", () => {
    expect(I.clientRefusal(gouts)).toBe("Ce que le client refuse, avec ses mots : « Il ne veut surtout pas : le style plombier avec une goutte d'eau et une clé à molette, de bleu électrique, de photos de stock avec un ouvrier qui sourit. »");
    expect(I.clientRefusal("Il aime le vert.")).toBe("");
    const p = I.imagePrompt("logo", route("A") as never, imagery, { logo: true, refusal: gouts });
    expect(p).toContain("Ce que le client refuse, avec ses mots : « Il ne veut surtout pas");
    expect(p).not.toMatch(/tons de pierre|sans stress/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('{ logo: true, refusal: o.gouts })');
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
  it("le logo reçoit ce qu'on savait de la marque avant ; le relecteur, les mots du client", () => {
    const imagery = { look: "calme", logo: "Piste : un fil à plomb stylisé, vert profond.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;
    const fin = fs.readFileSync("src/lib/syna-agent/brand-finish.ts", "utf8");
    expect(fin).toContain('...(slots.includes("logo") && o.guidance ? { logoLine: proposalImagery(j, route)?.logo ?? before?.logoIdea ?? null } : {}),');
    expect(fin).toContain("gouts: [j.start.image?.value, clientWords(o.guidance)]");
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('imagePrompt("logo", x, o.logoLine?.trim() ? { ...imagery, logo: o.logoLine.trim() } : imagery, { logo: true, refusal: o.gouts })');
    expect(I.imagePrompt("logo", route("A") as never, { ...(imagery as object), logo: "Ce qu'on savait de la marque." } as never)).not.toMatch(/fil à plomb/);
  });
});
