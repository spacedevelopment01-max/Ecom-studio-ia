/**
 * LA PLANCHE EN VRAI D'ÉCUME APRÈS LE RÉASSEMBLAGE (26 novembre 2026). Constats du chef d'orchestre, rejoués sans aucun
 * appel sur les vrais fichiers de l'essai (tests/fixtures/ecume-planche-en-vrai : la planche B choisie, le logo 10,
 * l'inventaire, les verdicts réels) :
 *  1. « Le spécimen du bloc 03 est trop pâle. Sacramento est presque illisible, et les lignes sous Poppins sont plus pâles
 *     et plus petites que sur l'aperçu. Le spécimen doit avoir la couleur, la taille et le contraste de l'aperçu. »
 *  2. « L'écran ne suit pas le réassemblage. » Un réassemblage ou un rejugement met à jour l'état et le projet ; l'onglet
 *     Marque montre exactement la planche réassemblée et ses images gardées.
 */
vi.mock("next/navigation", () => ({ usePathname: () => "/studio/p1/marque", useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }) }));
vi.mock("@/components/studio/project-context", () => ({ useProject: () => ({ id: "p1", data: null, reload: async () => {}, error: null }), useOptionalProject: () => null }));
vi.mock("@/components/ui", async (orig) => ({ ...(await orig<any>()), useApi: () => ({ data: etatDeLEcran.sheet, reload: () => {}, error: null, loading: false }) }));
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";
import type { BrandSheet } from "@/lib/syna-agent/brand-sheet";

const etatDeLEcran: { sheet: BrandSheet | null } = { sheet: null };
const F = "tests/fixtures/ecume-planche-en-vrai";
const police = (cle: string, famille: string, poids: number): C.PoliceChoisie => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
/** Le contraste d'une encre sur son fond (rapport des luminances relatives, comme pour l'accessibilité). */
function contraste(a: string, b: string) {
  const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
/** Les lignes du spécimen d'une planche (aperçu : k = 1 ; planche en vrai : k = 2), mesurées par le code du Studio. */
async function lignes(png: Buffer, k: number) {
  const b = P.lesCases("standard").cases.typographies, { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const bk = b.map((v) => v * k) as P.Boite, fond = C.fondDe(data, info.width, bk);
  const l = C.lignesDuSpecimen(data, info.width, bk, fond);
  return { fond, colonnes: l!.map((c) => c!.map((x) => ({ hauteur: (x.bas - x.haut) / k, couleur: x.couleur, epaisseur: x.epaisseur / k }))) };
}

describe("1. le spécimen du bloc 03 a la couleur, la taille et le contraste de l'aperçu", () => {
  it("sur l'aperçu réel de B : chaque ligne redessinée au moins aussi contrastée que sur l'aperçu, à sa hauteur à ±15 %, d'un trait aussi épais", async () => {
    const demo = fs.readFileSync(`${F}/planche-B-gardee.jpg`), cases = P.lesCases("standard");
    // La palette est posée d'abord (écrite centrée) : le spécimen ne dépend pas de l'alignement laissé par le bloc d'avant.
    const png = await C.assemblerLaPlanche({
      demo, boites: new Map([["palette", cases.cases.palette], ["typographies", cases.cases.typographies]]), pastilles: cases.pastilles, images: new Map(), versions: {} as Record<C.VersionDuLogo, Buffer>,
      palette: [{ hex: "#C44912", nom: "Orange Écume", mots: ["Chaleur"] }], polices: { titres: police("poppins", "Poppins", 700), textes: police("sacramento", "Sacramento", 400) },
      signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", typos: ["Moderne, ronde, accessible.", "Chaleureuse, humaine, naturelle."],
    });
    const avant = await lignes(demo, 1), apres = await lignes(png, 2);
    // Les cinq lignes de chaque colonne : le nom, sa phrase, les capitales, les minuscules, les chiffres.
    expect(avant.colonnes.map((c) => c.length)).toEqual([5, 5]);
    expect(apres.colonnes.map((c) => c.length)).toEqual([5, 5]);
    for (const k of [0, 1]) for (let i = 0; i < 5; i++) {
      const a = avant.colonnes[k][i], b = apres.colonnes[k][i], quoi = `${k ? "Sacramento" : "Poppins"}, ligne ${i + 1}`;
      // Le contraste, à l'adoucissement des bords près (2 %), jamais plus pâle que sur l'aperçu.
      expect(contraste(b.couleur, apres.fond), quoi).toBeGreaterThanOrEqual(contraste(a.couleur, avant.fond) * 0.98);
      expect(Math.abs(b.hauteur - a.hauteur) / a.hauteur, quoi).toBeLessThanOrEqual(0.15);
      // Le trait : une écriture déliée épaissie jusqu'à celui de l'aperçu (jamais presque invisible).
      expect(b.epaisseur, quoi).toBeGreaterThanOrEqual(a.epaisseur * 0.85);
    }
    // L'encre de l'aperçu, jamais un gris pâle fixe : la phrase sous Poppins n'est plus #5A605C.
    expect(apres.colonnes[0][1].couleur).not.toBe("#5A605C");
    expect(contraste(apres.colonnes[0][1].couleur, apres.fond)).toBeGreaterThan(10);
  });
  it("sans spécimen lisible sur l'aperçu (un fond uni), la mise en page d'avant est gardée, la police de la marque y est montrée", async () => {
    const cases = P.lesCases("standard").cases, demo = await sharp({ create: { width: P.TAILLE_DEMO.w, height: P.TAILLE_DEMO.h, channels: 3, background: "#F6F2EC" } }).png().toBuffer();
    const { data, info } = await sharp(demo).raw().toBuffer({ resolveWithObject: true });
    expect(C.lignesDuSpecimen(data, info.width, cases.typographies, "#F6F2EC")).toBeNull();
    const entree = (t: C.PoliceChoisie): C.AssemblageEntree => ({ demo, boites: new Map([["typographies", cases.typographies]]), pastilles: [], images: new Map(), versions: {} as Record<C.VersionDuLogo, Buffer>, palette: [], polices: { titres: police("poppins", "Poppins", 700), textes: t }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24" });
    const zone = async (png: Buffer) => sharp(png).extract({ left: cases.typographies[0] * 2, top: cases.typographies[1] * 2, width: (cases.typographies[2] - cases.typographies[0]) * 2, height: (cases.typographies[3] - cases.typographies[1]) * 2 }).raw().toBuffer();
    expect((await zone(await C.assemblerLaPlanche(entree(police("sacramento", "Sacramento", 400))))).equals(await zone(await C.assemblerLaPlanche(entree(police("inter", "Inter", 400)))))).toBe(false);
  });
  it("l'épaisseur d'un trait : un filet d'un pixel vaut 1, un trait de quatre pixels vaut 4", () => {
    const trait = (e: number) => (x: number, y: number) => (y >= 10 && y < 10 + e && x >= 5 && x < 95 ? 1 : 0);
    expect(C.epaisseurDuTrait(trait(1), 0, 0, 100, 30)).toBeCloseTo(1, 1);
    expect(C.epaisseurDuTrait(trait(4), 0, 0, 100, 30)).toBeCloseTo(4, 0);
  });
});

describe("2. l'écran suit le réassemblage : etat.json et le projet portent la planche réassemblée et ses images gardées", async () => {
  const { reassemblerLEssaiEnVrai } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { ECUME } = await import("./clients-d-essai");
  const { journeyOfProject } = await import("@/lib/syna-agent/construction");
  const { brandSheetOf } = await import("@/lib/syna-agent/brand-sheet");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { getAsset } = await import("@/lib/library");
  const { LangProvider } = await import("@/components/i18n");
  const TabMarque = (await import("@/components/studio/tab-marque")).default;
  const uni = (w: number, hh: number, c: string) => sharp({ create: { width: w, height: hh, channels: 3, background: c } }).png().toBuffer();
  const sansAppel = { inventaire: async () => { throw new Error("aucun appel"); }, refaire: async () => { throw new Error("aucun appel"); }, relire: async () => { throw new Error("aucun appel"); } };

  /** Le dossier d'un essai d'Écume : les verdicts réels ; la story et le téléphone, refusés à l'essai, regagnés au rejugement. */
  async function dossierDeLEssai() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ecran-reassemblage-"));
    const essai = path.join(dir, "essai");
    for (const d of ["apercus", "cases", "relectures"]) fs.mkdirSync(path.join(essai, d), { recursive: true });
    fs.writeFileSync(path.join(essai, "essai.json"), JSON.stringify({ client: ECUME, donnees: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "SAVONNERIE / ARTISANALE" } }));
    fs.copyFileSync(`${F}/inventaire-reponse.json`, path.join(essai, "inventaire-reponse.json"));
    fs.copyFileSync(`${F}/cases-de-l-essai.json`, path.join(essai, "apercus", "cases.json"));
    for (const [f, g] of [["publications-1-verdict.json", "publications-1"], ["publications-2-verdict.json", "publications-2"], ["site-2-verdict.json", "site-2"]]) fs.copyFileSync(`${F}/${f}`, path.join(essai, "relectures", `${g}-verdict.json`));
    for (const [n, t, w, hh, c] of [["publication-1x1", 1, 1088, 1088, "#8899AA"], ["publication-4x5", 1, 1088, 1360, "#8899AA"], ["publication-4x5", 2, 1088, 1360, "#8899AA"], ["publication-9x16", 1, 1088, 1936, "#AA5522"], ["publication-9x16", 2, 1088, 1936, "#8899AA"], ["site-telephone", 2, 1024, 1536, "#2255AA"]] as const)
      fs.writeFileSync(path.join(essai, "cases", `${n}-${t}-hd.png`), await uni(w, hh, c));
    const planche = path.join(dir, "planche-B.png"); fs.writeFileSync(planche, await sharp(fs.readFileSync(`${F}/planche-B-gardee.jpg`)).png().toBuffer());
    const logo = path.join(dir, "logo-10.png"); fs.copyFileSync(`${F}/esquisse-10-logo-garde-512.png`, logo);
    return { dir, essai, planche, logo };
  }

  it("après un réassemblage simulé : etat.json et le parcours portent les images regagnées et la nouvelle planche ; l'onglet Marque, rendu, les montre", async () => {
    const d = await dossierDeLEssai(), sortie = path.join(d.dir, "4b");
    const r = await reassemblerLEssaiEnVrai({ dossier: d.essai, sortie, planche: d.planche, logo: d.logo, ai: () => sansAppel as never });
    expect(r.projetCree).toBe(true);
    // etat.json et essai.json écrits à côté de la planche réassemblée, pour l'écran.
    const etat = JSON.parse(fs.readFileSync(path.join(sortie, "etat.json"), "utf8")) as P.EtatPlancheEnVrai;
    expect(JSON.parse(fs.readFileSync(path.join(sortie, "essai.json"), "utf8"))).toMatchObject({ projectId: r.projectId, conversationId: r.conversationId });
    const el = (n: string) => etat.elements.find((e) => e.element === n)!;
    // La story et le téléphone, regagnés au rejugement, ont leur fichier en haute définition ; la portrait garde l'aperçu.
    for (const n of ["publication-1x1", "publication-9x16", "site-telephone"]) expect(el(n).id && getAsset(el(n).id!), n).toBeTruthy();
    expect(el("publication-9x16").essais).toBe(1);
    expect(el("site-telephone").essais).toBe(2);
    expect(el("publication-4x5").id).toBeNull();
    expect(etat.elements.filter((e) => e.id)).toHaveLength(r.gardees);
    // La story gardée est bien l'image de l'essai (orange), mise à son format final.
    const story = await sharp((await import("@/lib/library")).assetData(getAsset(el("publication-9x16").id!)!)).metadata();
    expect([story.width, story.height]).toEqual([1080, 1920]);
    // La planche réassemblée, rangée dans le projet, est celle de l'état ; la même que le fichier écrit.
    expect(etat.planche).toMatchObject({ w: 3072, h: 4608 });
    const { assetData } = await import("@/lib/library");
    expect(assetData(getAsset(etat.planche!.id)!).equals(fs.readFileSync(path.join(sortie, "planche-en-vrai.png")))).toBe(true);
    expect(etat.siteEntier?.id).toBeTruthy();
    expect(etat.palette.map((p) => p.hex)).toEqual(["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"]);
    // Ce que SINA dit : la portrait garde l'aperçu ; la story et le téléphone, regagnés, ne sont plus dits refusés.
    const dit = etat.issues.join(" ");
    expect(dit).toMatch(/Publication portrait/);
    expect(dit).not.toMatch(/Story|Site sur téléphone/);
    // Le parcours du projet porte ce nouvel état ; la marque du projet est relue sur la planche (palette, polices, symbole).
    const j = journeyOfProject(r.projectId)!;
    expect(j.plancheEnVrai?.planche?.id).toBe(etat.planche!.id);
    expect(j.plancheEnVrai?.elements.map((e) => e.id)).toEqual(etat.elements.map((e) => e.id));
    expect(j.brandFinish?.issues).toEqual(etat.issues);
    const brand = loadProject(r.projectId).brand!;
    expect(brand.fonts).toEqual({ heading: etat.polices!.titres.handle, body: etat.polices!.textes.handle });
    expect(brand.logo.markAssetId && getAsset(brand.logo.markAssetId)?.role).toBe("logo-mark");
    // L'onglet Marque, rendu : la planche réassemblée et chaque image gardée, la story comprise ; jamais la portrait refusée.
    const sheet = runWithLang({ ui: "fr", content: "fr" }, () => brandSheetOf(r.projectId));
    etatDeLEcran.sheet = sheet;
    const html = renderToStaticMarkup(h(LangProvider, { initial: "fr", children: h(TabMarque) }));
    expect(html).toContain(etat.planche!.id);
    for (const n of ["publication-1x1", "publication-9x16"]) expect(html, n).toContain(el(n).id!);
    expect(html).toContain(etat.siteEntier!.id);
    const idDe = (u: string) => u.split("/").pop()!.split("?")[0];
    // Ici, les seules images de l'essai : la carrée, la story et le site (le téléphone regagné, montré avec l'ordinateur en une image).
    expect(sheet.enVrai?.images.map((i) => idDe(i.url))).toEqual([el("publication-1x1").id, el("publication-9x16").id, etat.siteEntier!.id]);
  });

  it("un second réassemblage dans le même projet : l'état et le parcours sont remplacés, jamais l'ancien gardé à l'écran", async () => {
    const d = await dossierDeLEssai();
    const r1 = await reassemblerLEssaiEnVrai({ dossier: d.essai, sortie: path.join(d.dir, "4b"), planche: d.planche, logo: d.logo, ai: () => sansAppel as never });
    // Le dossier de l'essai désigne maintenant ce projet (comme l'essai réel : essai.json et etat.json de l'étape 4).
    const e1 = JSON.parse(fs.readFileSync(path.join(d.dir, "4b", "essai.json"), "utf8"));
    fs.writeFileSync(path.join(d.essai, "essai.json"), JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(d.essai, "essai.json"), "utf8")), projectId: e1.projectId }));
    fs.copyFileSync(path.join(d.dir, "4b", "etat.json"), path.join(d.essai, "etat.json"));
    const r2 = await reassemblerLEssaiEnVrai({ dossier: d.essai, sortie: path.join(d.dir, "4b-bis"), planche: d.planche, logo: d.logo, ai: () => sansAppel as never });
    expect(r2.projetCree).toBe(false);
    expect(r2.projectId).toBe(r1.projectId);
    const etat2 = JSON.parse(fs.readFileSync(path.join(d.dir, "4b-bis", "etat.json"), "utf8")) as P.EtatPlancheEnVrai;
    const etat1 = JSON.parse(fs.readFileSync(path.join(d.dir, "4b", "etat.json"), "utf8")) as P.EtatPlancheEnVrai;
    expect(etat2.planche!.id).not.toBe(etat1.planche!.id);
    expect(etat2.demo).toBe(etat1.demo);
    expect(etat2.logo).toBe(etat1.logo);
    expect(journeyOfProject(r2.projectId)!.plancheEnVrai?.planche?.id).toBe(etat2.planche!.id);
    const rapport = fs.readFileSync(path.join(d.dir, "4b-bis", "rapport.txt"), "utf8");
    expect(rapport).toMatch(/État et projet mis à jour : etat\.json et essai\.json \(projet [a-z0-9]+\)/);
  });

  it("dans le Studio, la tâche et le réassemblage rangent de la même façon (images, logos, marque, publications, planche)", () => {
    const src = fs.readFileSync("src/lib/syna-agent/planche-en-vrai-tache.ts", "utf8");
    const corps = (nom: string) => { const i = src.indexOf(`export async function ${nom}(`); return src.slice(i, src.indexOf("\nexport ", i + 10)); };
    for (const f of ["rangerLesImages(", "rangerLesLogos(", "marqueRelueSurLaPlanche(", "publicationsDeLaPlanche("]) {
      expect(corps("plancheEnVrai"), f).toContain(f);
      expect(corps("enregistrerLaPlancheReassemblee"), f).toContain(f);
    }
    expect(corps("enregistrerLaPlancheReassemblee")).toContain("rangerLaPlanche(");
    expect(fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8")).toContain("T.enregistrerLaPlancheReassemblee(");
  });
});
