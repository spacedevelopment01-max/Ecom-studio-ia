/**
 * LA PLANCHE EN VRAI IDENTIQUE À L'APERÇU (essai réel d'Écume, étape 4, planche B, 26 novembre 2026). Constat du chef
 * d'orchestre : « Les images sont belles, mais la planche en vrai n'est pas identique à l'aperçu. Les défauts viennent
 * surtout de l'assemblage par le code. » Les six points, rejoués sans aucun appel, sur les vrais fichiers de l'essai
 * (tests/fixtures/ecume-planche-en-vrai : la planche B choisie, le logo 10, l'inventaire, les verdicts réels).
 */
import fs from "node:fs";
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";
import * as T from "@/lib/syna-agent/planche-en-vrai-tache";
import type { Route } from "@/lib/syna-agent/brand-routes";

const F = "tests/fixtures/ecume-planche-en-vrai";
const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
const verdict = (f: string, n: string) => (JSON.parse(fs.readFileSync(`${F}/${f}`, "utf8")) as { verdict: P.RelectureDuGroupe }).verdict.images.find((x) => x.case === n)!;
const anciennes = (JSON.parse(fs.readFileSync(`${F}/cases-de-l-essai.json`, "utf8")) as { boites: Record<string, P.Boite> }).boites;
const route = (o: Partial<{ slogan: string }> = {}) => ({ key: "A", name: "Écume", slogan: o.slogan ?? "SAVONNERIE / ARTISANALE", palette: { dark: "#C14706" }, board: { planche: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026 } } }) as unknown as Route;
const uni = (w: number, h: number, c: string) => sharp({ create: { width: w, height: h, channels: 3, background: c } }).png().toBuffer();
const transparent = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
const brut = async (png: Buffer, b: P.Boite) => (await sharp(png).extract({ left: b[0], top: b[1], width: b[2] - b[0], height: b[3] - b[1] }).raw().toBuffer());

async function versionsVides(): Promise<Record<C.VersionDuLogo, Buffer>> {
  const t = await transparent(10, 10);
  return Object.fromEntries(C.VERSIONS_DU_LOGO.map((v) => [v, t])) as Record<C.VersionDuLogo, Buffer>;
}
const police = (cle: string, famille: string, poids: number): C.PoliceChoisie => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });

describe("1. la police manuscrite de la marque ne sert que dans son spécimen", () => {
  it("titres, palette (noms, codes, mots) et blocs : la police de mise en page, la même quelle que soit la police de la marque", async () => {
    const cases = P.lesCases("standard").cases;
    const demo = await uni(P.TAILLE_DEMO.w, P.TAILLE_DEMO.h, "#F6F2EC");
    const entree = (textes: C.PoliceChoisie): C.AssemblageEntree => ({
      demo, boites: new Map([["titre-02", cases["titre-02"]], ["palette", cases.palette], ["typographies", cases.typographies], ["seo", cases.seo]]),
      pastilles: P.lesCases("standard").pastilles, images: new Map(), versions: {} as Record<C.VersionDuLogo, Buffer>,
      palette: [{ hex: "#C44912", nom: "Orange Écume", mots: ["Chaleur", "énergie"] }, { hex: "#D97A52", nom: "Terracotta", mots: ["Authenticité"] }],
      polices: { titres: police("poppins", "Poppins", 700), textes }, signature: [], titres: new Map(), encre: "#1C2A24",
      blocs: new Map([["seo", { lignes: ["Titre SEO", "© 2026 Écume", "ecumefrance.fr — disponible"] }]]),
    });
    // L'ancien titre de l'aperçu, pour que le titre soit redessiné.
    const avecTitre = async (o: C.AssemblageEntree) => {
      const c = createCanvas(P.TAILLE_DEMO.w, P.TAILLE_DEMO.h), x = c.getContext("2d");
      x.fillStyle = "#F6F2EC"; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = "#222222"; x.font = `${21}px sans-serif`; x.textBaseline = "alphabetic";
      x.fillText("PALETTE DE COULEURS", cases["titre-02"][0], cases["titre-02"][3] - 6);
      return { ...o, demo: await c.encode("png"), titres: new Map([["titre-02", "PALETTE DE COULEURS"]]) };
    };
    const manuscrite = await C.assemblerLaPlanche(await avecTitre(entree(police("sacramento", "Sacramento", 400))));
    const lineale = await C.assemblerLaPlanche(await avecTitre(entree(police("inter", "Inter", 400))));
    const X = (b: P.Boite): P.Boite => [b[0] * 2, b[1] * 2, b[2] * 2, b[3] * 2];
    for (const n of ["palette", "seo"] as const) expect((await brut(manuscrite, X(cases[n]))).equals(await brut(lineale, X(cases[n]))), n).toBe(true);
    const bandeTitre: P.Boite = X([cases["titre-02"][0] - 4, cases["titre-02"][1] - 6, cases["titre-02"][2] + 6, cases["titre-02"][3] + 6]);
    expect((await brut(manuscrite, bandeTitre)).equals(await brut(lineale, bandeTitre))).toBe(true);
    // Le spécimen (bloc 03), lui, montre la police de la marque.
    expect((await brut(manuscrite, X(cases.typographies))).equals(await brut(lineale, X(cases.typographies)))).toBe(false);
    expect(C.POLICE_DE_MISE_EN_PAGE.cle).toBe("nunito_sans");
    expect(C.genreDu(C.POLICE_DE_MISE_EN_PAGE.cle)).toBe("sans");
    expect(T.POLICE_DU_BADGE.cle).toBe(C.POLICE_DE_MISE_EN_PAGE.cle);
  });
  it("les phrases de présentation des polices sont lues sous leur nom dans le spécimen, jamais une ligne d'alphabet", () => {
    expect(T.phrasesDesPolices(inventaire)).toEqual(["Moderne, ronde, accessible.", "Chaleureuse, humaine, naturelle."]);
  });
});

describe("2. rien ne s'ajoute sous le logo du haut qui ne soit pas sur l'aperçu", () => {
  it("« SAVONNERIE ARTISANALE », portée par le logo, n'est jamais réécrite ; le haut n'a que le logo", async () => {
    const t = T.textesDeLaPlanche(inventaire, route());
    expect(t.haut).toEqual([]);
    expect(t.hautDansLeLogo).toBe(true);
    // Sans phrase connue de la marque, la lecture du logo par l'inventaire suffit.
    expect(T.textesDeLaPlanche(inventaire, route({ slogan: "" })).haut).toEqual([]);
    // Une vraie ligne de signature, absente du logo, reste écrite.
    const autre = P.InventaireSchema.parse({ ...inventaire, cases: inventaire.cases.map((c) => (c.case === "haut" ? { ...c, textes: [...c.textes, "Depuis 2019 à Lyon"] } : c)) });
    expect(T.textesDeLaPlanche(autre, route()).haut).toEqual(["Depuis 2019 à Lyon"]);
    // L'assemblage : l'encre du haut retirée en entier (son fond d'ombres gardé), un logo vide posé, aucun texte ajouté :
    // plus aucun point de l'orange du logo dans le haut (les ombres brunes du fond restent).
    const demo = fs.readFileSync(`${F}/planche-B-gardee.jpg`), cases = P.lesCases("standard").cases;
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["haut", cases.haut]]), pastilles: [], images: new Map(), versions: await versionsVides(), palette: [], polices: { titres: police("poppins", "Poppins", 700), textes: police("sacramento", "Sacramento", 400) }, signature: t.haut, titres: new Map(), blocs: new Map(), encre: "#1C2A24", hautDansLeLogo: true });
    const { data, info } = await sharp(png).extract({ left: 0, top: 0, width: cases.haut[2] * 2, height: cases.haut[3] * 2 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let vives = 0; for (let i = 0; i < info.width * info.height; i++) { const p = data.subarray(i * 3, i * 3 + 3); if (p[0] - p[2] > 120) vives++; }
    expect(vives).toBe(0);
  });
});

describe("3. un titre redessiné ne laisse aucune encre de l'ancien", () => {
  const cases = P.lesCases("standard").cases, b = cases["titre-08"];
  const demoAvec = async (dessiner: (x: ReturnType<ReturnType<typeof createCanvas>["getContext"]>) => void) => {
    const c = createCanvas(P.TAILLE_DEMO.w, P.TAILLE_DEMO.h), x = c.getContext("2d");
    x.fillStyle = "#F6F2EC"; x.fillRect(0, 0, c.width, c.height); dessiner(x);
    return c.encode("png");
  };
  const rouges = async (png: Buffer, z: P.Boite) => {
    const { data, info } = await sharp(png).extract({ left: z[0], top: z[1], width: z[2] - z[0], height: z[3] - z[1] }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    let n = 0; for (let i = 0; i < info.width * info.height; i++) if (data[i * 3] > 150 && data[i * 3 + 1] < 90 && data[i * 3 + 2] < 90) n++;
    return n;
  };
  const assembler = (demo: Buffer, texte: string) => C.assemblerLaPlanche({ demo, boites: new Map([["titre-08", b]]), pastilles: [], images: new Map(), versions: {} as Record<C.VersionDuLogo, Buffer>, palette: [], polices: { titres: police("poppins", "Poppins", 700), textes: police("sacramento", "Sacramento", 400) }, signature: [], titres: new Map([["titre-08", texte]]), blocs: new Map(), encre: "#1C2A24" });
  it("l'ancien titre posé plus haut que sa case (« coupé en haut ») : toute sa zone est effacée, le nouveau est écrit à sa place", async () => {
    const demo = await demoAvec((x) => { x.fillStyle = "#E00000"; x.font = `800 17px sans-serif`; x.textBaseline = "alphabetic"; x.fillText("SITE WEB", b[0] + 2, b[1] + 9); });
    const avant = await rouges(await sharp(demo).resize(P.TAILLE_EN_VRAI.w, P.TAILLE_EN_VRAI.h).png().toBuffer(), [b[0] * 2 - 20, b[1] * 2 - 30, b[2] * 2 + 40, b[3] * 2 + 20]);
    expect(avant).toBeGreaterThan(200);
    const png = await assembler(demo, "SITE WEB");
    // Aucune encre de l'ancien texte dans la bande, au-delà de la case comprise.
    expect(await rouges(png, [b[0] * 2 - 20, b[1] * 2 - 30, b[2] * 2 + 40, b[3] * 2 + 20])).toBe(0);
    const z = C.zoneDuTitre((await sharp(demo).removeAlpha().raw().toBuffer()), P.TAILLE_DEMO.w, P.TAILLE_DEMO.h, b, "#F6F2EC");
    expect(z[1]).toBeLessThan(b[1]);
  });
  it("l'ancien titre qui dépasse à droite de sa case (lu coupé à l'inventaire) : il est gardé tel quel, jamais remplacé par un texte plus court", async () => {
    const demo = await demoAvec((x) => { x.fillStyle = "#E00000"; x.font = `800 20px sans-serif`; x.textBaseline = "alphabetic"; x.fillText("SITE WEB ET BOUTIQUE", b[0], b[3] - 6); });
    const png = await assembler(demo, "SITE WEB ET BOUTIQ");
    const grand = await sharp(demo).resize(P.TAILLE_EN_VRAI.w, P.TAILLE_EN_VRAI.h, { kernel: "lanczos3" }).png().toBuffer();
    const z: P.Boite = [b[0] * 2 - 10, b[1] * 2 - 10, b[2] * 2 + 200, b[3] * 2 + 10];
    expect((await brut(png, z)).equals(await brut(grand, z))).toBe(true);
  });
});

describe("4. le bloc 01 du vrai logo 10 : les cases fidèles à l'aperçu, sans rien payer", () => {
  it("sans symbole séparable : compact, icône, favicon et badge repris de leur tuile ; horizontal : la marque et sa phrase", async () => {
    const logo = fs.readFileSync(`${F}/esquisse-10-logo-garde-512.png`);
    const det = await (await import("@/lib/syna-agent/brand-images")).logoDetoure(logo, "#C14706");
    expect(det.ok).toBe(true);
    const sep = await C.separerSymbole(det.ok ? det.png : logo);
    expect(sep.fiable).toBe(false);
    const ph = await C.separerLaPhrase(det.ok ? det.png : logo);
    expect(ph).not.toBeNull();
    const mp = await sharp(ph!.phrase).metadata(), mm = await sharp(ph!.marque).metadata();
    // La phrase entière (ses deux lignes), sous la marque.
    expect(mp.width! / mp.height!).toBeGreaterThan(2.5);
    expect(mp.height!).toBeLessThan(mm.height! / 2);
    expect(mp.height! / mp.width!).toBeGreaterThan(0.15);
    const decoupe = await P.decouperLesApercus(fs.readFileSync(`${F}/planche-B-gardee.jpg`), "standard");
    const v = await C.versionsDuLogo({ logo: det.ok ? det.png : logo, separation: sep, couleur: "#C44912", sombre: "#C44912", clair: "#F6E8DA", monoClair: "#A7B89B", nom: "Écume", bas: "SAVONNERIE ARTISANALE", police: T.POLICE_DU_BADGE, tuiles: decoupe.apercus });
    expect(v.depuisLApercu.sort()).toEqual(["badge", "favicon", "icone", "logo-compact"]);
    const hz = await sharp(v.versions["logo-horizontal"]).metadata();
    expect(hz.width! / hz.height!).toBeGreaterThan(1.8);
    // Une version reprise : la tuile agrandie quatre fois, fond retiré (coins transparents).
    for (const k of v.depuisLApercu) {
      const { data, info } = await sharp(v.versions[k]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(info.width).toBeGreaterThan(200);
      expect(data[3]).toBe(0);
    }
    expect(v.symbole.equals(v.versions["logo-compact"])).toBe(true);
    expect(P.phraseDesLogosDeLApercu(v.depuisLApercu)).toContain("reprises de ta planche choisie");
  });
});

describe("5. la palette : les codes écrits sur l'aperçu, que le client a vus", () => {
  it("les codes réels d'Écume sont gardés (écart perceptuel sous 10), la pastille peinte de ce code ; un code loin de la couleur peinte : la mesure", () => {
    const ecrits = C.codesEcritsDeLaPalette(P.caseLue(inventaire, "palette")!.textes);
    expect(ecrits).toEqual(["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"]);
    const mesurees = ["#C7470C", "#E37C52", "#F2E1D1", "#AAB599", "#977450"];
    const r = C.paletteRetenue(mesurees, ecrits);
    expect(r.hex).toEqual(ecrits);
    expect(r.ecarts.every((e) => e != null && e < 4)).toBe(true);
    const faux = C.paletteRetenue(mesurees, ["#C44912", "#2E7D32", "#F6E8DA", "#A7B89B", "#8C6F4E"]);
    expect(faux.hex[1]).toBe("#E37C52");
    expect(faux.source).toEqual(["ecrit", "mesure", "ecrit", "ecrit", "ecrit"]);
    // Sans un code par pastille, la mesure.
    expect(C.paletteRetenue(mesurees, ["#C44912"]).hex).toEqual(mesurees);
    expect(T.paletteDeLaPlanche(mesurees, inventaire).hex).toEqual(ecrits);
    expect(C.SEUIL_DU_CODE_ECRIT).toBe(10);
    expect(C.ecartPerceptuel("#FFFFFF", "#FFFFFF")).toBe(0);
  });
});

describe("6. deux refus faux du relecteur, sur les verdicts réels", () => {
  it("la découpe : la publication portrait ne prend plus le sous-titre du bloc 07 ; la story touche encore la bande", async () => {
    const d = await P.decouperLesApercus(fs.readFileSync(`${F}/planche-B-gardee.jpg`), "standard");
    const bande = P.bandesDesTitres("standard").get("titre-07")!;
    expect(d.boites.get("publication-4x5")![1]).toBeGreaterThan(bande[3]);
    expect(d.debordes).toContain("publication-9x16");
    expect(P.entreDansUneBandeDeTitre("standard", anciennes["publication-4x5"])).toBe(true);
    expect(P.entreDansUneBandeDeTitre("standard", anciennes["reference-1"])).toBe(false);
  });
  it("les textes attendus d'une case sont ceux de sa zone : la story gardée ; la publication portrait refusée pour son seul bord", () => {
    const inv = (n: string) => P.caseLue(inventaire, n);
    // La story, premier essai, note 8 : refusée pour le seul « en » de « quotidien », venu du sous-titre du bloc 07.
    const story = verdict("publications-1-verdict.json", "publication-9x16");
    expect(P.raisonsDuRefusEnVrai(story, { inventaire: inv("publication-9x16"), personnes: false, photo: false })).toEqual(["ses textes ne sont pas ceux de l'aperçu, lettre pour lettre (manquent : « en »)"]);
    expect(P.raisonsDuRefusEnVrai(story, { inventaire: inv("publication-9x16"), personnes: false, photo: false, deborde: true })).toEqual([]);
    // La publication portrait : plus aucun faux manquant ; le texte collé au bord reste un vrai défaut.
    for (const f of ["publications-1-verdict.json", "publications-2-verdict.json"]) {
      const r = P.raisonsDuRefusEnVrai(verdict(f, "publication-4x5"), { inventaire: inv("publication-4x5"), personnes: false, photo: false, deborde: true });
      expect(r.join(" ; ")).not.toMatch(/contenus|inspirent|quoti|naturels|famille/);
      expect(r).toContain("un texte est coupé ou collé au bord");
    }
    // Un vrai titre de la case, qui commence par une majuscule, reste attendu même près d'une bande.
    expect(P.textesDeLaZone(["Grand titre", "Texte"], ["Texte"], { deborde: true }).attendus).toEqual(["Grand titre", "Texte"]);
  });
  it("le téléphone : l'heure de la barre d'état n'est jamais comparée ni reprochée ; la reprise notée 8,5 est gardée", () => {
    const tel = verdict("site-2-verdict.json", "site-telephone");
    expect(tel.note).toBe(8.5);
    expect(P.raisonsDuRefusEnVrai(tel, { inventaire: P.caseLue(inventaire, "site-telephone"), personnes: false, photo: false })).toEqual([]);
    expect(P.estUneHeure("9:41")).toBe(true);
    expect(P.estUneHeure("12.01")).toBe(true);
    // Hors d'une case à barre d'état, une heure reste un texte comme un autre.
    expect(P.textesDeLaZone(["Ouvert"], ["Ouvert", "9:41"], { element: "publication-1x1" }).lus).toContain("9:41");
  });
  it("un mot coupé par le bord de l'aperçu va avec le mot entier lu ; aucun autre mot n'est excusé", () => {
    expect(P.comparerLesTextes(["Des soins vraiment nature", "our une peau"], ["Des soins vraiment naturels", "pour une peau"])).toEqual({ manquants: [], enTrop: [] });
    expect(P.comparerLesTextes(["Et si vous passiez au solide ?"], ["Et si vous passiez en solide ?"])).toEqual({ manquants: ["au"], enTrop: ["en"] });
  });
});

/**
 * LES RETOUCHES GRATUITES DU 26 NOVEMBRE 2026 (chef d'orchestre, puis le propriétaire devant l'onglet Marque d'Écume :
 * « L'ordi et le téléphone ne sont pas obligés d'être découpés si ? Sinon c'est pas trop mal juste mieux découper les
 * images »).
 */
describe("7. les retouches gratuites : recalage élargi, fond du haut gardé, palette entière, site en une image, rognage", () => {
  const demo = fs.readFileSync(`${F}/planche-B-gardee.jpg`);
  it("le recalage élargi : la story, 36 pixels plus à droite que sa case fixe, ne cache plus le sous-titre du bloc 07 ; la publication portrait n'est plus coupée", async () => {
    const d = await P.decouperLesApercus(demo, "standard");
    const story = d.boites.get("publication-9x16")!, portrait = d.boites.get("publication-4x5")!, fixe = P.lesCases("standard").cases["publication-9x16"];
    expect(story[0] - fixe[0]).toBeGreaterThanOrEqual(30);
    expect(story[0] - fixe[0]).toBeLessThanOrEqual(40);
    expect(portrait[2]).toBeGreaterThanOrEqual(1328);
    expect(portrait[2]).toBeLessThan(story[0]);
    // Aucune case d'image n'entre dans la bande d'un titre là où la page porte le titre ou son sous-titre.
    const { data, info } = await sharp(demo).greyscale().raw().toBuffer({ resolveWithObject: true });
    for (const n of P.NOMS_DES_ELEMENTS) expect(P.bandeDeTitreTouchee({ data, w: info.width, h: info.height }, "standard", d.boites.get(n)!), n).toBeNull();
    // Une planche fabriquée où tout est à sa place ne bouge pas.
    const anim = await P.decouperLesApercus(fs.readFileSync("assets/planche-de-marque/disposition-animaux.png"), "animaux");
    for (const n of P.NOMS_DES_ELEMENTS) expect(anim.boites.get(n)!.every((v, i) => Math.abs(v - P.lesCases("animaux").cases[n][i]) <= P.RECALAGE_MAX), n).toBe(true);
  });
  it("le haut : le fond de l'aperçu (une ombre douce) est gardé, seule l'encre vive est retirée", async () => {
    const c = createCanvas(300, 200), x = c.getContext("2d");
    x.fillStyle = "#F6EBDD"; x.fillRect(0, 0, 300, 200);
    x.fillStyle = "#C8BCAE"; x.beginPath(); x.ellipse(60, 100, 50, 80, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#C44912"; x.fillRect(150, 70, 100, 60);
    const raw = await sharp(await c.encode("png")).removeAlpha().raw().toBuffer();
    const net = await C.fondSansEncre(raw, 300, [0, 0, 300, 200], "#F6EBDD");
    const { data, info } = await sharp(net).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([600, 400]);
    const px = (X: number, Y: number) => [...data.subarray((Y * info.width + X) * 3, (Y * info.width + X) * 3 + 3)];
    // L'ombre est restée (plus sombre que le fond) ; l'encre orange est partie (plus de couleur vive).
    expect(px(120, 200)[1]).toBeLessThan(0xEB - 30);
    const centre = px(400, 200);
    expect(Math.max(...centre) - Math.min(...centre)).toBeLessThan(40);
    expect(C.estEncre(0xC8, 0xBC, 0xAE, [0xF6, 0xEB, 0xDD], 40)).toBe(false);
    expect(C.estEncre(0xC4, 0x49, 0x12, [0xF6, 0xEB, 0xDD], 40)).toBe(true);
  });
  it("la palette : les trois mots de l'aperçu sous chaque couleur, à la suite (« Chaleur, énergie, bienveillance »)", () => {
    const x = createCanvas(10, 10).getContext("2d");
    const l = C.lignesDesMots(x, ["Chaleur", "énergie", "bienveillance"], C.fonteDeMiseEnPage(23, 400), 211);
    expect(l.join(" ")).toBe("Chaleur, énergie, bienveillance");
    expect(l.length).toBeLessThanOrEqual(3);
    expect(fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8").match(/\.filter\(Boolean\)\.slice\(0, 3\) \}\)\);/g)).toHaveLength(2);
  });
  it("le rognage au contenu : le fond mesuré autour part, une marge minime reste ; une photo pleine ne change pas", async () => {
    const img = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#F6F2EC" } }).composite([{ input: await sharp({ create: { width: 150, height: 120, channels: 3, background: "#30485A" } }).png().toBuffer(), left: 100, top: 80 }]).png().toBuffer();
    const r = await sharp(await C.rognerAuContenu(img, 6)).metadata();
    expect([r.width, r.height]).toEqual([162, 132]);
    const pleine = await sharp({ create: { width: 64, height: 48, channels: 3, background: "#30485A" } }).png().toBuffer();
    expect((await C.rognerAuContenu(pleine)).equals(pleine)).toBe(true);
    // Les publications et l'ouverture du site gardent leur format exact.
    expect((await T.imageMontree("publication-1x1", img)).equals(img)).toBe(true);
    expect((await sharp(await T.imageMontree("site-ordinateur", img)).metadata()).width).toBe(162);
  });
  it("le site en une seule image : l'onglet Marque et le zip la montrent à la place de l'ordinateur et du téléphone, qui restent en coulisses", async () => {
    const ev = { key: "B", demo: "d", logo: "l", laquelle: "standard", at: 1, planche: { id: "pl", w: 3072, h: 4608 }, logos: [], palette: [], symboleComplet: false, publications: [], issues: [], notes: [],
      elements: P.NOMS_DES_ELEMENTS.map((n) => ({ element: n, id: n === "site-telephone" ? null : `id-${n}`, essais: 1, w: 10, h: 10 })), siteEntier: { id: "site", w: 1698, h: 940 } } as P.EtatPlancheEnVrai;
    const m = P.imagesMontrees(ev);
    expect(m.filter((x) => x.element.startsWith("site"))).toEqual([{ element: "site", id: "site", w: 1698, h: 940 }]);
    expect(m.findIndex((x) => x.element === "site")).toBe(P.NOMS_DES_ELEMENTS.indexOf("site-ordinateur"));
    const { vueEnVrai } = await import("@/lib/syna-agent/brand-sheet");
    const { runWithLang } = await import("@/lib/i18n-server");
    const v = runWithLang({ ui: "fr", content: "fr" }, () => vueEnVrai(ev, "p", (id) => `/f/${id}`))!;
    expect(v.images.find((x) => x.element === "site")!.label).toBe("Le site sur ordinateur et téléphone");
    expect(v.sansFichier.join(" ")).not.toMatch(/téléphone/);
    const { fichiersDeLaMarque } = await import("@/lib/syna-agent/brand-zip");
    const z = Object.keys(fichiersDeLaMarque(ev, "Écume", (id) => Buffer.from(id), () => null));
    expect(z).toContain("images/site-ordinateur-et-telephone.png");
    expect(z.filter((f) => /site-ordinateur\.png|site-telephone\.png/.test(f))).toEqual([]);
    // En coulisses, le site garde ses deux images séparées (`elements`) ; la planche pose l'image d'avant le rognage.
    expect(ev.elements.find((e) => e.element === "site-ordinateur")!.id).toBe("id-site-ordinateur");
  });
  it("sur les vrais fichiers d'Écume, le code seul fait la planche, le site entier (sans titre ni coupure) et les images montrées", async () => {
    const det = await (await import("@/lib/syna-agent/brand-images")).logoDetoure(fs.readFileSync(`${F}/esquisse-10-logo-garde-512.png`), "#C14706");
    const r = await T.plancheEnVraiParLeCode({ demo, laquelle: "standard", inventaire, route: route(), logo: det.ok ? det.png : Buffer.alloc(0), images: new Map() });
    expect(r.palette[0].mots).toEqual(["Chaleur", "énergie", "bienveillance"]);
    const s = await sharp(r.site!).metadata();
    // Tout le bloc du site : plus large que haut, sans le titre (sa hauteur reste sous celle du bloc).
    expect(s.width! / s.height!).toBeGreaterThan(1.5);
    expect(s.height!).toBeLessThan((2119 - 1641) * 2);
    expect(s.height!).toBeGreaterThan((2079 - 1655) * 2 * 0.95);
  });
});
