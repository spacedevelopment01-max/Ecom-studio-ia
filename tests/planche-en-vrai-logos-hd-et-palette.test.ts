/**
 * LA PLANCHE EN VRAI D'ÉCUME, 26 NOVEMBRE 2026 (aucun appel payant : appels simulés, vrais fichiers de l'essai dans
 * tests/fixtures/ecume-planche-en-vrai) :
 *  1. les petites versions du logo (icône, favicon, badge ; le compact est retiré le 27 novembre 2026) refaites en haute définition, en option, à partir
 *     de leur tuile de l'aperçu, logo officiel joint ; relues ; une reprise à la charge du Studio ; refusées deux fois,
 *     l'agrandissement reste et SINA le dit ; le fond retiré par le code ; leurs fichiers dans le zip ; sur la planche,
 *     seulement si la case ne change pas visiblement ;
 *  2. constat du chef d'orchestre : « les petits textes sous les couleurs de la palette sont plus pâles que sur l'aperçu » :
 *     leur encre et leur hauteur sont mesurées sur l'aperçu.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import * as P from "@/lib/syna-agent/planche-en-vrai";
import * as C from "@/lib/syna-agent/planche-en-vrai-code";

const F = "tests/fixtures/ecume-planche-en-vrai";
const demo = fs.readFileSync(`${F}/planche-B-gardee.jpg`);
const inv = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
/** Une version « refaite » fidèle, simulée : la tuile de l'aperçu agrandie en 1088 × 1088, sur son propre fond. */
const fidele = async (tuile: Buffer) => sharp(tuile).resize(1088, 1088, { fit: "contain", background: (await sharp(tuile).stats()).dominant, kernel: "lanczos3" }).png().toBuffer();
const verdict = (version: string, o: Partial<P.LogoEnHdRelu> = {}): P.LogoEnHdRelu => ({ version, memeForme: true, memesLettres: true, texteCirculaire: "aucun", textesDeLApercu: [], textesLus: [], memesCouleurs: true, ajout: false, texteCoupe: false, note: 9, pourquoi: "", ...o });

describe("1. les petites versions du logo en haute définition (sans le compact depuis le 27 novembre 2026)", async () => {
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const { chargeDuStudio } = await import("@/lib/ai/trace");
  const { TAILLES_DE_LA_PLANCHE_EN_VRAI } = await import("@/lib/ai/media-providers");
  const decoupe = await P.decouperLesApercus(demo, "standard");
  const logo = fs.readFileSync(`${F}/esquisse-10-logo-garde-512.png`);

  /** Des appels simulés : chaque demande gardée ; le verdict de chaque version, par tour. */
  const simule = (verdicts: (v: string, tour: number) => Partial<P.LogoEnHdRelu> = () => ({})) => {
    const demandes: { d: P.DemandeDeLogoEnHd; cle: string; studio: boolean }[] = [], relectures: { labels: string[]; demande: string; cle: string; studio: boolean }[] = [];
    const ai: import("@/lib/syna-agent/planche-en-vrai-tache").LogosEnHdAi = {
      refaire: async (d, cle) => { demandes.push({ d, cle, studio: chargeDuStudio() }); return { png: await fidele(d.jointes[0].data), recu: null }; },
      relire: async (images, demande, cle) => {
        relectures.push({ labels: images.map((i) => i.label), demande, cle, studio: chargeDuStudio() });
        const tour = cle.endsWith("-r1") ? 2 : 1;
        return { versions: images.filter((i) => i.label.endsWith(" refaite")).map((i) => { const v = i.label.replace(/ refaite$/, ""); return verdict(v, verdicts(v, tour)); }) };
      },
    };
    return { ai, demandes, relectures };
  };

  it("la requête de chaque version : sa tuile de l'aperçu puis le logo officiel joint, la règle mot pour mot et la ligne de l'élément, la taille carrée la plus grande permise", async () => {
    const s = simule();
    const res = await T.refaireLesLogosEnHdDeLaPlanche({ ai: s.ai, nom: "Écume", personnes: false, logo, tuiles: decoupe.apercus });
    expect(s.demandes.map((x) => x.d.element)).toEqual(["icone", "favicon", "badge"]);
    const quoi = { icone: "C'est l'icône seule.", favicon: "C'est le favicon.", badge: "C'est le badge rond." } as const;
    const logoSurBlanc = await sharp(logo).flatten({ background: "#FFFFFF" }).png().toBuffer();
    for (const { d, cle } of s.demandes) {
      expect(cle).toBe(`logo-hd-${d.element}`);
      expect(d.jointes.map((j) => j.role)).toEqual(["apercu", "logo"]);
      expect(d.jointes[0].data.equals(decoupe.apercus.get(P.LOGOS_EN_HD[d.element].tuile)!)).toBe(true);
      expect(d.jointes[1].data.equals(logoSurBlanc)).toBe(true);
      expect(d.texte).toBe(`${P.REGLE_APERCU} ${P.regleDuLogo("Écume")} ${quoi[d.element]} ${P.SANS_PERSONNE_EN_VRAI}`);
      expect(d.taille).toBe("1088x1088");
    }
    // Carrée, et la plus grande des tailles carrées permises.
    const carrees = TAILLES_DE_LA_PLANCHE_EN_VRAI.filter((t) => t.split("x")[0] === t.split("x")[1]).map((t) => Number(t.split("x")[0]));
    expect(Math.max(...carrees)).toBe(1088);
    // Une seule relecture pour toutes, chaque version face à sa tuile, par le relecteur des images de la planche en vrai.
    expect(s.relectures).toHaveLength(1);
    expect(s.relectures[0].labels).toEqual(["icone aperçu", "icone refaite", "favicon aperçu", "favicon refaite", "badge aperçu", "badge refaite"]);
    expect(T.modeleDe("relecture").effort).toBe("high");
    expect(P.RELECTEUR_DES_LOGOS_EN_HD).toMatch(/même forme que l'aperçu/);
    expect(P.RELECTEUR_DES_LOGOS_EN_HD).toMatch(/micro-texte décoratif : ne le juge pas/);
    expect([...res.values()].every((r) => r.ok && r.png)).toBe(true);
  });

  it("le relecteur : une version identique est gardée ; une forme, des lettres, un texte circulaire lisible, des couleurs ou un ajout différents la font refuser", () => {
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("badge", { texteCirculaire: "identique", textesDeLApercu: ["SAVONNERIE", "ARTISANALE"], textesLus: ["SAVONNERIE", "ARTISANALE"] }))).toEqual([]);
    // Un texte circulaire illisible sur l'aperçu est un micro-texte décoratif : jamais jugé.
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("badge", { texteCirculaire: "illisible-sur-l-apercu" }))).toEqual([]);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("icone", { memeForme: false }))).toEqual(["sa forme n'est pas celle de l'aperçu"]);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("favicon", { memesLettres: false }))).toEqual(["ses lettres ne sont pas celles de l'aperçu"]);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("badge", { texteCirculaire: "different" }))).toEqual(["son texte circulaire n'est pas celui de l'aperçu"]);
    // Les textes comparés lettre pour lettre par le code, même quand le relecteur dit « identique ».
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("badge", { texteCirculaire: "identique", textesDeLApercu: ["SAVONNERIE ARTISANALE"], textesLus: ["SAVONERIE ARTISANALE"] }))[0]).toMatch(/lettre pour lettre.*« SAVONNERIE ».*« SAVONERIE »/);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("icone", { memesCouleurs: false }))).toEqual(["ses couleurs ne sont pas celles de l'aperçu"]);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("icone", { ajout: true }))).toEqual(["quelque chose a été ajouté qui n'est pas sur l'aperçu"]);
    expect(P.raisonsDuRefusDuLogoEnHd(verdict("icone", { note: 7 }))).toEqual(["sa fidélité n'est pas au niveau (7/10, il faut 8)"]);
    expect(P.raisonsDuRefusDuLogoEnHd(undefined)).toEqual(["le relecteur ne l'a pas relue"]);
  });

  it("une reprise unique, à la charge du Studio, avec ses raisons au début du texte ; refusée deux fois : l'agrandissement reste, et SINA le dit", async () => {
    // Le badge refusé deux fois, l'icône refusée puis gardée.
    const s = simule((v, tour) => (v === "badge" ? { texteCirculaire: "different", note: 6 } : v === "icone" && tour === 1 ? { ajout: true } : {}));
    const res = await T.refaireLesLogosEnHdDeLaPlanche({ ai: s.ai, nom: "Écume", personnes: false, logo, tuiles: decoupe.apercus });
    expect(s.demandes.map((x) => x.cle)).toEqual(["logo-hd-icone", "logo-hd-favicon", "logo-hd-badge", "logo-hd-icone-r1", "logo-hd-badge-r1"]);
    expect(s.relectures.map((x) => x.cle)).toEqual(["relecture-logos-hd", "relecture-logos-hd-r1"]);
    // La reprise, et elle seule, à la charge du Studio.
    expect(s.demandes.map((x) => x.studio)).toEqual([false, false, false, true, true]);
    expect(s.relectures.map((x) => x.studio)).toEqual([false, true]);
    const reprise = s.demandes.find((x) => x.cle === "logo-hd-badge-r1")!.d.texte;
    expect(reprise).toBe(`${P.texteDuLogoEnHd({ version: "badge", nom: "Écume", personnes: false })}\n\nÀ corriger : son texte circulaire n'est pas celui de l'aperçu ; sa fidélité n'est pas au niveau (6/10, il faut 8).`);
    expect(res.get("icone")).toMatchObject({ ok: true });
    expect(res.get("icone")!.essais).toHaveLength(2);
    expect(res.get("badge")).toMatchObject({ ok: false, png: null });
    expect(res.get("badge")!.essais).toHaveLength(2);
    // Le repli : les versions gardées remplacent l'agrandissement ; le badge refusé deux fois garde le sien, et SINA le dit.
    const gardes = new Map([...res].filter(([, r]) => r.ok).map(([v, r]) => [v, r.png!] as const));
    const det = await (await import("@/lib/syna-agent/brand-images")).logoDetoure(logo, "#C14706");
    const l = det.ok ? det.png : logo, sep = await C.separerSymbole(l);
    const v = await C.versionsDuLogo({ logo: l, separation: sep, couleur: "#C44912", sombre: "#C44912", clair: "#F6E8DA", monoClair: "#A7B89B", nom: "Écume", bas: "SAVONNERIE ARTISANALE", police: T.POLICE_DU_BADGE, tuiles: decoupe.apercus, hd: gardes });
    expect(v.enHd).toEqual(["icone", "favicon"]);
    // Depuis le 27 novembre 2026, ni logo compact ni logo empilé ; le symbole de la marque est l'icône refaite.
    expect(v.depuisLApercu).toEqual(["badge"]);
    expect(v.versions.icone.equals(gardes.get("icone")!)).toBe(true);
    expect(v.symbole.equals(gardes.get("icone")!)).toBe(true);
    const { runWithLang } = await import("@/lib/i18n-server");
    const dit = runWithLang({ ui: "fr", content: "fr" }, () => T.phrasesDesLogos(v, ["badge"]));
    expect(dit).toEqual(["J'ai refait en haute définition le badge, mais cette version n'a pas passé ma relecture, même refaite : elle n'est pas identique à ta planche choisie. Je garde donc celle de ta planche, agrandie, telle que tu l'as vue."]);
    // Sans tentative, la proposition d'avant reste (prix annoncé avant).
    expect(runWithLang({ ui: "fr", content: "fr" }, () => T.phrasesDesLogos(v))[0]).toMatch(/Je peux la refaire en haute définition, je t'annonce le prix avant\./);
    expect(runWithLang({ ui: "fr", content: "fr" }, () => P.phraseDesLogosEnHdRefuses(["icone", "badge"]))).toMatch(/l'icône, le badge, mais ces versions n'ont pas passé ma relecture, même refaites : elles ne sont pas identiques à ta planche choisie\. Je garde donc celles de ta planche, agrandies, telles que tu les as vues\./);
  });

  it("le fond retiré par le code, creux compris ; un fond qu'il ne sait pas retirer fait refuser la version, sans la relire", async () => {
    // Un anneau orange sur fond crème : le fond autour ET dans l'anneau devient transparent, l'anneau reste plein.
    const { createCanvas } = await import("@napi-rs/canvas");
    const cv = createCanvas(400, 400), x = cv.getContext("2d");
    x.fillStyle = "#F6F1E7"; x.fillRect(0, 0, 400, 400); x.strokeStyle = "#C44912"; x.lineWidth = 40; x.beginPath(); x.arc(200, 200, 120, 0, Math.PI * 2); x.stroke();
    const r = await T.sansFondDuLogoEnHd(await cv.encode("png"));
    expect(r.ok).toBe(true);
    const { data, info } = await sharp((r as { png: Buffer }).png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const a = (px: number, py: number) => data[(py * info.width + px) * 4 + 3];
    expect(a(2, 2)).toBe(0);
    expect(a(Math.round(info.width / 2), Math.round(info.height / 2))).toBe(0);
    // L'anneau reste plein : sur la colonne du milieu, le quart du haut le traverse.
    expect(Array.from({ length: Math.round(info.height / 4) }, (_, y) => a(Math.round(info.width / 2), y)).some((v) => v === 255)).toBe(true);
    // Un fond en dégradé : refusée pour son fond, jamais relue, reprise une fois.
    const bruit = await sharp(Buffer.from(Array.from({ length: 64 * 64 * 3 }, (_, i) => (i * 37) % 256)), { raw: { width: 64, height: 64, channels: 3 } }).resize(1088, 1088).png().toBuffer();
    const vus: string[] = [];
    const res = await T.refaireLesLogosEnHdDeLaPlanche({
      ai: { refaire: async (d, cle) => { vus.push(cle); return { png: bruit, recu: null }; }, relire: async (_i, _d, cle) => { vus.push(cle); return { versions: [] }; } },
      nom: "Écume", personnes: false, logo, tuiles: decoupe.apercus, versions: ["icone"],
    });
    expect(vus).toEqual(["logo-hd-icone", "logo-hd-icone-r1"]);
    expect(res.get("icone")!.essais.map((e) => e.raisons[0])).toEqual([expect.stringMatching(/^son fond ne peut pas être retiré proprement/), expect.stringMatching(/^son fond ne peut pas être retiré proprement/)]);
  });

  it("sur la planche : une version fidèle prend sa case ; une version qui change visiblement la case laisse l'aperçu agrandi", async () => {
    const { data, info } = await sharp(demo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const t = decoupe.boites.get("logo-6")!;
    const sansFond = async (png: Buffer) => { const r = await T.sansFondDuLogoEnHd(png); if (!r.ok) throw new Error(r.raison); return r.png; };
    const ok = await C.caseDuLogoEnHd(data, info.width, t, await sansFond(await fidele(decoupe.apercus.get("logo-6")!)));
    expect(ok.garde).toBe(true);
    expect(ok.part).toBeLessThanOrEqual(C.SEUIL_DE_LA_CASE_EN_HD.part);
    // La même version, recolorée en vert : la case change visiblement.
    const vert = await sharp(await sansFond(await fidele(decoupe.apercus.get("logo-6")!))).modulate({ hue: 120 }).png().toBuffer();
    const ko = await C.caseDuLogoEnHd(data, info.width, t, vert);
    expect(ko.garde).toBe(false);
    expect(ko.raison).toMatch(/change visiblement la case|proportions/);
    // Étirée : ses proportions changent la case.
    const etiree = await sharp(await sansFond(await fidele(decoupe.apercus.get("logo-6")!))).resize(900, 500, { fit: "fill" }).png().toBuffer();
    expect((await C.caseDuLogoEnHd(data, info.width, t, etiree)).raison).toMatch(/proportions/);
  });

  it("le réassemblage d'Écume avec LOGO_HD : les petites versions refaites (sans le compact), leurs fichiers dans le zip à la place des agrandissements ; un plafond sous le minimal ne lance rien", async () => {
    const { reassemblerLEssaiEnVrai, chiffresDuReassemblage } = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
    const { ECUME } = await import("./clients-d-essai");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "logos-hd-")), essai = path.join(dir, "essai");
    for (const d of ["apercus", "cases", "relectures"]) fs.mkdirSync(path.join(essai, d), { recursive: true });
    fs.writeFileSync(path.join(essai, "essai.json"), JSON.stringify({ client: ECUME, donnees: { domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, disposition: "standard", phrase: "SAVONNERIE / ARTISANALE" } }));
    fs.copyFileSync(`${F}/inventaire-reponse.json`, path.join(essai, "inventaire-reponse.json"));
    fs.copyFileSync(`${F}/cases-de-l-essai.json`, path.join(essai, "apercus", "cases.json"));
    const planche = path.join(dir, "planche-B.png"); fs.writeFileSync(planche, await sharp(demo).png().toBuffer());
    const logoF = path.join(dir, "logo-10.png"); fs.copyFileSync(`${F}/esquisse-10-logo-garde-512.png`, logoF);
    const sansAppel = { inventaire: async () => { throw new Error("aucun appel"); }, refaire: async () => { throw new Error("aucun appel"); }, relire: async () => { throw new Error("aucun appel"); } };
    const s = simule();
    // Sous la somme des maxima (reprise comprise), l'essai part quand même depuis le 26 novembre 2026 : plus aucun refus.
    const c = await chiffresDuReassemblage([], { logoHd: true });
    expect(c.maxMicro).toBe(T.devisDesLogosEnHd().maxMicro);
    expect(fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai-outil.ts", "utf8")).not.toMatch(/est sous le plafond minimal exact/);
    expect(s.demandes).toHaveLength(0);
    const sortie = path.join(dir, "4c");
    const r = await reassemblerLEssaiEnVrai({ dossier: essai, sortie, planche, logo: logoF, logoHd: true, plafondEuros: (c.maxMicro / 1e6 + 0.01).toFixed(2), ai: () => sansAppel as never, aiLogos: () => s.ai });
    expect(r.logosEnHd).toMatchObject({ versions: ["icone", "favicon", "badge"], gardees: ["icone", "favicon", "badge"], refusees: [] });
    // Depuis le 27 novembre 2026, ni logo compact ni logo empilé : plus rien n'est repris de l'aperçu.
    expect(r.logosDeLApercu ?? []).toEqual([]);
    // Ce qui part et revient est écrit tout de suite.
    expect(fs.existsSync(path.join(sortie, "logos-hd", "logo-hd-badge-texte-envoye.txt"))).toBe(true);
    expect(fs.existsSync(path.join(sortie, "logos-hd", "relecture-logos-hd-verdict.json"))).toBe(true);
    // L'état : les versions en haute définition, plus reprises de l'aperçu ; plus de proposition de les refaire.
    const etat = JSON.parse(fs.readFileSync(path.join(sortie, "etat.json"), "utf8")) as P.EtatPlancheEnVrai;
    expect(etat.logosEnHd).toEqual(["icone", "favicon", "badge"]);
    expect(etat.logosDeLApercu ?? []).toEqual([]);
    expect(etat.issues.join(" ")).not.toMatch(/Je peux les refaire en haute définition/);
    // Le zip : chaque fichier est la version en haute définition (sans fond), jamais l'agrandissement d'environ 460 pixels.
    const { assetData, getAsset } = await import("@/lib/library");
    const { fichiersDeLaMarque } = await import("@/lib/syna-agent/brand-zip");
    const zip = fichiersDeLaMarque(etat, "Écume", (id) => (getAsset(id) ? assetData(getAsset(id)!) : null), () => null);
    expect(Object.keys(zip).join(" ")).not.toMatch(/compact|empile/);
    for (const v of ["icone", "favicon", "badge"] as const) {
      const f = Buffer.from(zip[`logos/${v}.png`]);
      expect(f.equals(fs.readFileSync(path.join(sortie, "logos", `${v}.png`))), v).toBe(true);
      expect(f.equals(fs.readFileSync(path.join(sortie, "logos-hd", `${v}-gardee-sans-fond.png`))), v).toBe(true);
      const m = await sharp(f).metadata();
      expect(Math.max(m.width!, m.height!), v).toBeGreaterThan(600);
      expect(m.hasAlpha, v).toBe(true);
    }
    // Le favicon 512 vient de la version en haute définition.
    expect(zip["logos/favicon-512.png"]).toBeTruthy();
    expect(fs.readFileSync(path.join(sortie, "rapport.txt"), "utf8")).toMatch(/Logos en haute définition : icone, favicon, badge/);

    // Dans le Studio, sur la planche en vrai d'un projet (sans LOGO_HD au réassemblage) : chaque appel a son point de reprise,
    // chaque image reçue est gardée ; le badge refusé deux fois garde son agrandissement, et SINA le dit.
    const r0 = await reassemblerLEssaiEnVrai({ dossier: essai, sortie: path.join(dir, "4b"), planche, logo: logoF, ai: () => sansAppel as never });
    const ev0 = JSON.parse(fs.readFileSync(path.join(dir, "4b", "etat.json"), "utf8")) as P.EtatPlancheEnVrai;
    expect(ev0.logosDeLApercu?.sort()).toEqual(["badge", "favicon", "icone"]);
    const { one } = await import("@/lib/db");
    const who = { userId: one<{ user_id: string }>("SELECT user_id FROM projects WHERE id=?", r0.projectId)!.user_id, projectId: r0.projectId };
    const route = { key: "A", name: "Écume", slogan: "SAVONNERIE / ARTISANALE", palette: { dark: "#C14706" }, board: { planche: { image: { id: ev0.demo, w: 1536, h: 2304 }, logo: "", domaine: "ecumefrance.fr", statut: "disponible", annee: 2026, essais: 1, at: 0 } } } as never;
    const etapes: string[] = [], s2 = simule((v) => (v === "badge" ? { texteCirculaire: "different" } : {}));
    const ev = await T.refaireLesLogosEnHdEnVrai({ ctx: { step: async (k, fn) => { etapes.push(k); return fn(); } }, ai: s2.ai, who, route, etat: { ...ev0, inventaire: inv }, personnes: false });
    expect(etapes).toEqual(["brand:envrai:logo-hd-icone", "brand:envrai:logo-hd-favicon", "brand:envrai:logo-hd-badge", "brand:envrai:relecture-logos-hd", "brand:envrai:logo-hd-badge-r1", "brand:envrai:relecture-logos-hd-r1"]);
    expect(ev.logosEnHd).toEqual(["icone", "favicon"]);
    expect(ev.logosEnHdRefuses).toEqual(["badge"]);
    expect(ev.logosDeLApercu).toEqual(["badge"]);
    expect(ev.planche?.id).not.toBe(ev0.planche?.id);
    const { all } = await import("@/lib/db");
    expect(all<{ meta: string }>("SELECT meta FROM assets WHERE project_id=? AND role='planche-en-vrai-brut'", r0.projectId).filter((a) => /"logoEnHd":true/.test(a.meta))).toHaveLength(4);
    const ditS = ev.issues.join(" ");
    expect(ditS).toMatch(/J'ai refait en haute définition le badge, mais cette version n'a pas passé ma relecture/);
    expect(ditS).not.toMatch(/Je peux les refaire en haute définition/);
    // Une réfection des logos par le code garde les versions en haute définition.
    const ev2 = await T.refaireLesLogosEnVrai({ who, route, etat: ev });
    expect(ev2.logosEnHd).toEqual(["icone", "favicon"]);
    expect(assetData(getAsset(ev2.logos.find((l) => l.version === "icone")!.id)!).equals(assetData(getAsset(ev.logos.find((l) => l.version === "icone")!.id)!))).toBe(true);
  });

  it("le devis : le premier tour au prix d'une image carrée de la planche en vrai, la reprise de toutes comprise dans le plafond minimal", () => {
    const d = T.devisDesLogosEnHd();
    expect(d.images).toBe(3);
    expect(d.relectures).toBe(1);
    expect(d.maxMicro).toBe(2 * d.repriseMicro);
    expect(d.siToutEstRefaitMicro).toBe(2 * d.probableMicro);
    expect(d.probableMicro).toBe(294_421);
  });
});

describe("2. les petits textes sous les couleurs de la palette ont l'encre et la hauteur de l'aperçu", async () => {
  const T = await import("@/lib/syna-agent/planche-en-vrai-tache");
  const police = (cle: string, famille: string, poids: number): C.PoliceChoisie => ({ cle, famille, fichier: "", poids, handle: `${cle}_n${String(poids)[0]}`, lue: famille, remplacee: false });
  function contraste(a: string, b: string) {
    const lum = (hx: string) => { const c = C.rgbDe(hx).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  }
  const cases = P.lesCases("standard");
  async function lignes(png: Buffer, k: number) {
    const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const b = cases.cases.palette.map((v) => v * k) as P.Boite, fond = C.fondDe(data, info.width, b);
    return { fond, colonnes: C.lignesSousLesPastilles(data, info.width, b, cases.pastilles.map(([x, y, r]) => [x * k, y * k, r * k] as [number, number, number]), fond) };
  }

  it("les lignes de mots lues à l'inventaire, coupées comme sur l'aperçu", () => {
    expect(T.lignesDesMotsLues(inv)).toEqual([["Chaleur, énergie", "bienveillance"], ["Authenticité", "naturel, terre"], ["Douceur", "pureté"], ["Nature, fraîcheur", "équilibre"], ["Matière, artisanat", "confiance"]]);
  });

  it("sur l'aperçu réel de B : chaque ligne (le nom, le code, les mots) au moins aussi contrastée que sur l'aperçu, à sa hauteur à ±15 %", async () => {
    const palette = ["#C44912", "#D97A52", "#F6E8DA", "#A7B89B", "#8C6F4E"].map((hex, i) => ({ hex, nom: inv.couleurs[i].nom, mots: inv.couleurs[i].mots }));
    const png = await C.assemblerLaPlanche({ demo, boites: new Map([["palette", cases.cases.palette]]), pastilles: cases.pastilles, images: new Map(), versions: {} as Record<C.VersionDuLogo, Buffer>, palette,
      polices: { titres: police("poppins", "Poppins", 700), textes: police("sacramento", "Sacramento", 400) }, signature: [], titres: new Map(), blocs: new Map(), encre: "#1C2A24", motsLus: T.lignesDesMotsLues(inv) });
    const avant = await lignes(demo, 1), apres = await lignes(png, 2);
    // Le nom, le code et deux lignes de mots sous chaque pastille, sur l'aperçu comme sur la planche en vrai.
    expect(avant.colonnes.map((c) => c?.length)).toEqual([4, 4, 4, 4, 4]);
    expect(apres.colonnes.map((c) => c?.length)).toEqual([4, 4, 4, 4, 4]);
    for (let i = 0; i < 5; i++) for (let k = 0; k < 4; k++) {
      const a = avant.colonnes[i]![k], b = apres.colonnes[i]![k], quoi = `${inv.couleurs[i].nom}, ligne ${k + 1}`;
      expect(contraste(b.couleur, apres.fond), quoi).toBeGreaterThanOrEqual(contraste(a.couleur, avant.fond) * 0.98);
      expect(Math.abs((b.bas - b.haut) / 2 - (a.bas - a.haut)) / (a.bas - a.haut), quoi).toBeLessThanOrEqual(0.15);
    }
    // Jamais le gris pâle fixe d'avant sous les pastilles.
    expect(apres.colonnes.flatMap((c) => c!.map((l) => l.couleur))).not.toContain("#5A605C");
  });

  it("sans lignes lisibles sous les pastilles (un fond uni), la mise en page d'avant est gardée", async () => {
    const uni = await sharp({ create: { width: P.TAILLE_DEMO.w, height: P.TAILLE_DEMO.h, channels: 3, background: "#F6F2EC" } }).png().toBuffer();
    const { data, info } = await sharp(uni).raw().toBuffer({ resolveWithObject: true });
    expect(C.lignesSousLesPastilles(data, info.width, cases.cases.palette, cases.pastilles, "#F6F2EC")).toEqual([null, null, null, null, null]);
    expect(C.motsSurNLignes(["Chaleur", "énergie", "bienveillance"], 2)).toEqual(["Chaleur, énergie,", "bienveillance"]);
    expect(C.motsSurNLignes(["Chaleur", "énergie", "bienveillance"], 2, ["Chaleur, énergie", "bienveillance"])).toEqual(["Chaleur, énergie", "bienveillance"]);
  });
});
