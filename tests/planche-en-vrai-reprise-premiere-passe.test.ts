/**
 * LA REPRISE D'UNE PREMIÈRE PASSE INTERROMPUE DE LA PLANCHE EN VRAI (REPRENDRE=1, 26 novembre 2026). L'essai réel de Mouture
 * s'est arrêté à la sixième image sur une erreur de connexion du fournisseur (résultat incertain, coût maximal retenu) :
 * l'inventaire et cinq images étaient reçus et payés, rien n'était relu. Règles : ce qui est reçu et payé n'est jamais
 * redemandé ; un appel au résultat incertain n'est jamais relancé tout seul, il n'est refait que parce que le propriétaire
 * relance lui-même avec REPRENDRE=1 ; tout arrêt dit comment reprendre.
 *
 * Appels SIMULÉS (aucun appel payant), sur les vrais fichiers de l'essai d'Écume (tests/fixtures/ecume-planche-en-vrai).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const F = "tests/fixtures/ecume-planche-en-vrai";

describe("la reprise d'une première passe interrompue de la planche en vrai (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const { setJsonSetting } = await import("@/lib/settings");
  const O = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  const { ECUME } = await import("./clients-d-essai");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
  const textes = (n: string) => P.caseLue(inventaire, n)?.textes ?? [];
  const appels: string[] = [];
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  /** `panneA` : la case dont l'appel part sans réponse (résultat incertain chez le fournisseur). */
  const simule = (panneA?: string) => (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async () => { appels.push("inventaire"); await paye(q, 100_000, "quality_control"); return inventaire; },
    refaire: async (d: { element: string; taille: string; jointes: { role: string; data: Buffer }[] }, cle: string) => {
      appels.push(`image:${cle}`);
      if (cle === panneA) throw new Error("Résultat incertain chez openai:simule (Connection error.) : coût maximal retenu par prudence, aucune relance automatique.");
      await paye(q, 50_000, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await sharp(d.jointes.find((j) => j.role === "apercu")!.data).resize(w, h, { fit: "fill" }).png().toBuffer(), recu: null };
    },
    relire: async (images: { label: string }[], _demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); await paye(q, 60_000, "quality_control");
      const cases = images.map((im) => im.label).filter((l) => l.endsWith(" refaite")).map((l) => l.replace(/ refaite$/, ""));
      return { images: cases.map((c) => ({
        case: c, identique: true,
        textesLus: c === "publication-9x16" ? textes(c).filter((t) => t !== "en") : c === "site-telephone" ? ["9:41", ...textes(c)] : textes(c),
        logoPresent: !!P.caseLue(inventaire, c)?.logo, personne: false, logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "simulé",
      })) };
    },
  });
  const logos = (q: { userId: string; jobId: string }) => ({
    refaire: async (d: { jointes: { data: Buffer }[] }, cle: string) => { appels.push(`logo:${cle}`); await paye(q, 50_000, "image_generation"); return { png: await sharp(d.jointes[0].data).resize(1088, 1088, { fit: "contain", background: (await sharp(d.jointes[0].data).stats()).dominant }).png().toBuffer(), recu: null }; },
    relire: async (images: { label: string }[], _d: string, cle: string) => {
      appels.push(`logo:${cle}`); await paye(q, 60_000, "quality_control");
      return { versions: images.filter((i) => i.label.endsWith(" refaite")).map((i) => ({ version: i.label.replace(/ refaite$/, ""), memeForme: true, memesLettres: true, texteCirculaire: "aucun", textesDeLApercu: [], textesLus: [], memesCouleurs: true, ajout: false, texteCoupe: false, note: 9, pourquoi: "" })) };
    },
  });
  const dossiers: string[] = [];
  const preparer = async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "reprise-envrai-"));
    dossiers.push(dir);
    const planche = path.join(dir, "planche-B-gardee.png");
    fs.writeFileSync(planche, await sharp(`${F}/planche-B-gardee.jpg`).png().toBuffer());
    const logo = path.join(dir, "esquisse-10-logo-garde.png");
    fs.copyFileSync(`${F}/esquisse-10-logo-garde-512.png`, logo);
    return { sortie: path.join(dir, "sortie"), planche, logo };
  };
  const donnees = () => O.donneesDeLaPlanche(ECUME, { RESULTAT_PLANCHE: "tests/fixtures/ecume-planches-2/planche-B-resultat.json" });
  afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); appels.length = 0; delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

  it("arrêtée à la sixième image (résultat incertain), la passe dit comment reprendre ; REPRENDRE=1 garde l'inventaire et les cinq images, fait le reste, les relectures, LOGO_HD, l'assemblage et l'état", async () => {
    const e = await preparer();
    const base = { sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), logoHd: true, aiLogos: logos as never };
    // La première passe : l'inventaire, cinq images, puis la sixième part sans réponse.
    const r1 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule("site-ordinateur") as never });
    expect(r1.arret).toMatch(/^un appel a échoué, jamais relancé : Résultat incertain/);
    expect(appels).toEqual(["inventaire", "image:publication-1x1", "image:publication-4x5", "image:publication-9x16", "image:ouverture-site", "image:ouverture-planche", "image:site-ordinateur"]);
    const rapport1 = fs.readFileSync(path.join(e.sortie, "rapport.txt"), "utf8");
    expect(rapport1).toMatch(/Comment reprendre : la même commande, même dossier de sortie, avec REPRENDRE=1/);
    expect(rapport1).toMatch(/Résultat incertain : l'appel de site-ordinateur est parti sans réponse ; son coût maximal est retenu\. Il n'est jamais relancé tout seul/);
    expect(fs.existsSync(path.join(e.sortie, "etat.json"))).toBe(false);

    // Ce que la passe a laissé, relu sans appel ; le devis de ce qui reste ne repaie ni l'inventaire ni les cinq images.
    const prec = O.passePrecedente(e.sortie)!;
    expect(prec.inventaire).toBeTruthy();
    expect([...prec.images.keys()].sort()).toEqual(["ouverture-planche-1", "ouverture-site-1", "publication-1x1-1", "publication-4x5-1", "publication-9x16-1"]);
    expect(prec.sansReponse).toEqual(["site-ordinateur-1"]);
    const d = await O.devisDeLaReprise(prec, { logoHd: true });
    expect(d.faits).toEqual(["brand:envrai:inventaire", "brand:envrai:publication-1x1", "brand:envrai:publication-4x5", "brand:envrai:publication-9x16", "brand:envrai:ouverture-site", "brand:envrai:ouverture-planche"]);
    const plein = await O.devisDuCheminNormal({ logoHd: true });
    expect(d.probableMicro).toBeLessThan(plein.probableMicro);
    expect(d.plafondMinimalMicro).toBeLessThan(plein.plafondMinimalMicro);
    const recue = fs.readFileSync(path.join(e.sortie, "cases/publication-1x1-1-hd.png"));

    // La reprise : le propriétaire relance lui-même, même dossier.
    appels.length = 0;
    const r2 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule() as never, reprendre: true });
    expect(r2.arret).toBeUndefined();
    expect(appels).not.toContain("inventaire");
    for (const n of ["publication-1x1", "publication-4x5", "publication-9x16", "ouverture-site", "ouverture-planche"]) expect(appels).not.toContain(`image:${n}`);
    expect(appels[0]).toBe("image:site-ordinateur");
    expect(appels.filter((a) => a.startsWith("image:"))).toHaveLength(12);
    expect(appels.filter((a) => a.startsWith("relecture:"))).toHaveLength(4);
    expect(appels.filter((a) => a.startsWith("logo:"))).toEqual(["logo:logo-hd-icone", "logo:logo-hd-favicon", "logo:logo-hd-badge", "logo:relecture-logos-hd"]);
    expect(r2.reprise).toMatchObject({ passe: 1, refaits: ["site-ordinateur"], sansReponse: ["site-ordinateur-1"] });
    expect(r2.reprise!.reprises).toEqual(["l'inventaire", "publication-1x1", "publication-4x5", "publication-9x16", "ouverture-site", "ouverture-planche"]);
    // L'image reçue est celle qui est relue et gardée, telle quelle.
    expect(fs.readFileSync(path.join(e.sortie, "cases/publication-1x1-1-hd.png")).equals(recue)).toBe(true);
    expect(r2.cases.find((c) => c.element === "publication-1x1")?.gardee).toBe(true);
    expect(r2.etat!.elements.filter((x) => !x.id).map((x) => x.element)).toEqual([]);
    expect(r2.planche).toMatchObject({ w: 3072, h: 4608 });
    expect(r2.etat!.logosEnHd).toEqual(["icone", "favicon", "badge"]);
    for (const f of ["etat.json", "essai.json", "planche-en-vrai.png", "passe-1/rapport.txt", "passe-1/depense.json", "passe-1/cases/site-ordinateur-1-texte-envoye.txt"]) expect(fs.existsSync(path.join(e.sortie, f)), f).toBe(true);
    expect(r2.conversationId).toBeTruthy();
    const rapport2 = fs.readFileSync(path.join(e.sortie, "rapport.txt"), "utf8");
    expect(rapport2).toMatch(/REPRISE de la passe 1/);
    expect(rapport2).toMatch(/refait\(s\) cette fois : site-ordinateur, seulement parce que le propriétaire a relancé lui-même avec REPRENDRE=1 \(jamais tout seul\)/);
  }, 300_000);

  it("une deuxième reprise sur une reprise déjà interrompue (Mouture, 26 novembre 2026) : passe-1 gardée, passe-2 archivée, seule l'image sans réponse est redemandée, la dépense « en tout » compte les trois passes", async () => {
    const e = await preparer();
    const base = { sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), logoHd: true, aiLogos: logos as never };
    const r1 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule("site-ordinateur") as never });
    expect(r1.arret).toMatch(/Résultat incertain/);
    const passe1 = fs.readFileSync(path.join(e.sortie, "rapport.txt"));
    // La première reprise s'arrête à son tour, sur la dernière image (reference-6).
    appels.length = 0;
    const r2 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule("reference-6") as never, reprendre: true });
    expect(r2.arret).toMatch(/^un appel a échoué, jamais relancé : Résultat incertain/);
    expect(appels.filter((a) => a.startsWith("image:")).at(-1)).toBe("image:reference-6");
    expect(appels.some((a) => a.startsWith("relecture:"))).toBe(false);
    const prec = O.passePrecedente(e.sortie)!;
    expect(prec.numero).toBe(2);
    expect(prec.images.size).toBe(16);
    expect(prec.sansReponse).toEqual(["reference-6-1"]);
    expect(prec.depenseDesPassesArchiveesMicro).toBe(r1.depenseMicro);
    const d = await O.devisDeLaReprise(prec, { logoHd: true });
    expect(d.texte.join("\n")).toMatch(/Restent : 1 image\(s\) \(reference-6\), 4 relecture\(s\)/);
    expect(d.texte.join("\n")).toMatch(/avec les passes d'avant, en tout : /);
    const recues = new Map([...prec.images].map(([k, v]) => [k, v.png]));
    // La deuxième reprise : seule reference-6 est redemandée ; les 16 images reçues sont relues telles quelles.
    appels.length = 0;
    const r3 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule() as never, reprendre: true });
    expect(r3.arret).toBeUndefined();
    expect(appels).not.toContain("inventaire");
    expect(appels.filter((a) => a.startsWith("image:"))).toEqual(["image:reference-6"]);
    expect(appels.filter((a) => a.startsWith("relecture:"))).toHaveLength(4);
    expect(r3.reprise).toMatchObject({ passe: 2, refaits: ["reference-6"], sansReponse: ["reference-6-1"], depensePrecedenteMicro: r2.depenseMicro, depenseDesPassesArchiveesMicro: r1.depenseMicro });
    for (const [k, png] of recues) expect(fs.readFileSync(path.join(e.sortie, "cases", `${k}-hd.png`)).equals(png), k).toBe(true);
    expect(fs.readFileSync(path.join(e.sortie, "passe-1/rapport.txt")).equals(passe1)).toBe(true);
    for (const f of ["passe-2/rapport.txt", "passe-2/depense.json", "passe-2/cases/reference-6-1-texte-envoye.txt", "etat.json", "planche-en-vrai.png"]) expect(fs.existsSync(path.join(e.sortie, f)), f).toBe(true);
    expect(r3.etat!.elements.filter((x) => !x.id).map((x) => x.element)).toEqual([]);
    const euros = (m: number) => `${(m / 1e6).toFixed(4).replace(".", ",")} €`;
    expect(fs.readFileSync(path.join(e.sortie, "rapport.txt"), "utf8")).toContain(`aux passes d'avant (passe-1/) : ${euros(r1.depenseMicro)} ; en tout : ${euros(r1.depenseMicro + r2.depenseMicro + r3.depenseMicro)}`);
  }, 300_000);

  it("REPRENDRE=1 refuse, avant tout appel, une autre planche que celle de la passe d'avant, ou un dossier sans rien à reprendre", async () => {
    const e = await preparer();
    await expect(O.essaiDeLaPlancheEnVrai({ sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), ai: simule() as never, reprendre: true })).rejects.toThrow(/rien à reprendre/);
    fs.mkdirSync(e.sortie, { recursive: true });
    fs.writeFileSync(path.join(e.sortie, "rapport.txt"), `Planche choisie : x (sha256 ${"0".repeat(64)}) ; disposition standard\n`);
    await expect(O.essaiDeLaPlancheEnVrai({ sortie: e.sortie, plafondEuros: "10", planche: e.planche, logo: e.logo, client: ECUME, donnees: donnees(), ai: simule() as never, reprendre: true })).rejects.toThrow(/la planche donnée n'est pas celle de la passe d'avant/);
    expect(appels).toEqual([]);
  });

  it("le script : REPRENDRE=1 sur le chemin normal, son devis sans appel, et la ligne « comment reprendre » à tout arrêt", () => {
    const src = fs.readFileSync("scripts/syna-recette/essai-planche-en-vrai.mts", "utf8");
    expect(src).toMatch(/process\.env\.REPRENDRE\?\.trim\(\) === "1" && !process\.env\.REASSEMBLER/);
    expect(src).toContain("reprendre: reprisePasse");
    expect(src).toContain("devisDeLaReprise(prec, { logoHd })");
    expect(src).toContain("lignesPourReprendre(r, NOMS_DES_ELEMENTS");
  });
});
