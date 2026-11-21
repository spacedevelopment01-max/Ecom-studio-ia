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
    expect(chain.match(/gouts: j\.start\.image\?\.value \?\? null/g)).toHaveLength(2);
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

describe("logos : le niveau des 50 logos que le propriétaire aime, la façon de faire vient du projet (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const P = await import("@/lib/syna-agent/brand-prompts");
  const imagery = { look: "calme", logo: "Ce qu'il faut savoir de la marque.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""] } as never;
  it("le dessinateur reçoit une phrase de niveau (pas de style), le relecteur la planche des 50, jamais le dessinateur", async () => {
    const p = I.imagePrompt("logo", route("A") as never, imagery);
    expect(p).toContain(I.LOGO_NIVEAU);
    expect(I.LOGO_NIVEAU).toMatch(/C'est un logo, pas un tableau : il se lit et se reconnaît en tout petit/);
    expect(I.LOGO_NIVEAU).toMatch(/Sa façon de faire vient de cette marque-là/);
    // « ça dépend des projets » (21 novembre 2026) : aucune façon de dessiner imposée à toutes les marques.
    expect(I.LOGO_NIVEAU).not.toMatch(/personne|personnage|mascotte|animal|détail|illustr|EXPRESSIF/);
    expect(p).toMatch(/Tu es totalement libre du dessin/);
    const planche = await I.planchedesLogosAimes();
    expect(planche).toBeInstanceOf(Buffer);
    expect(P.imageReviewSystem()).toMatch(/quand la planche des logos que le propriétaire aime est jointe .* nettement plus sage, timide ou banal que ces exemples/);
    expect(P.imageReviewSystem()).not.toMatch(/illustré, coloré ou chargé n'est PAS un défaut/);
    expect(P.imageReviewSystem()).toMatch(/il ne va pas avec CETTE marque .* la planche ne donne jamais un style à suivre/);
    expect(P.imageReviewSystem()).toMatch(/une scène, un décor, un dessin chargé de détails, qui ne se lit plus en tout petit/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('const aimes = slots.includes("logo") ? await planchedesLogosAimes() : null;');
    // La planche n'est jamais jointe au dessin du logo (seulement à la relecture).
    expect(img).not.toMatch(/make\("logo"[^\n]*planchedesLogosAimes/);
    expect(fs.existsSync("docs/sina-savoir/logos-aimes.md")).toBe(true);
  });
});


describe("logos : redessin avec toutes les raisons, signes refusés au dessinateur (21 novembre 2026)", async () => {
  const I = await import("@/lib/syna-agent/brand-images");
  const P = await import("@/lib/syna-agent/brand-prompts");
  it("un redessin reçoit toutes les raisons des refus, pas seulement la dernière", () => {
    const une = I.fixLine(["une goutte d'eau, refusée par le client"], 1);
    expect(une).toMatch(/une première image a été refusée pour cette raison : « une goutte d'eau, refusée par le client »/);
    const deux = I.fixLine(["une goutte d'eau, refusée par le client", "trop sage"], 2);
    expect(deux).toMatch(/à corriger TOUTES à la fois/);
    expect(deux).toMatch(/1\. « une goutte d'eau, refusée par le client »\n2\. « trop sage »/);
    expect(deux).toMatch(/Fais plus simple/);
    const img = fs.readFileSync("src/lib/syna-agent/brand-images.ts", "utf8");
    expect(img).toContain('c.prompt + fix("logo", why)');
    expect(img).toContain("c.prompt + fix(s, why)");
  });
  it("les signes refusés par le client vont au dessinateur du logo, en une ligne, et rien d'autre de ses mots", () => {
    const imagery = { look: "calme", logo: "Ce qu'il faut savoir.", signs: "", hero: "", object: "", site: "", posts: ["", "", ""], refus: ["goutte d'eau", "robinet.", "goutte d'eau"] } as never;
    const p = I.imagePrompt("logo", route("A") as never, imagery);
    expect(p).toContain("Le client refuse ces signes : goutte d'eau, robinet. Aucun ne figure dans le logo");
    expect(I.logoRefus({ refus: [] })).toBe("");
    expect(I.imagePrompt("logo", route("A") as never, { ...(imagery as object), refus: [] } as never)).not.toMatch(/refuse ces signes/);
    // La directrice artistique les relève d'après les mots du client seulement.
    expect(P.imagerySystem("services")).toMatch(/- refus : les signes que le client a REFUSÉS .* seulement ce qu'il a refusé lui-même, jamais une idée à toi/);
    expect(I.ImagerySchema.parse({ logo: "x", hero: "x", object: "x", site: "x", posts: ["a", "b", "c"] }).refus).toEqual([]);
  });
});
