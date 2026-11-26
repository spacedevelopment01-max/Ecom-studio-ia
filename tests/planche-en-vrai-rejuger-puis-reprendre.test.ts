/**
 * REJUGER=1 PUIS REPRENDRE=1 (26 novembre 2026, essai réel de Mouture, étape 5). La passe gardée a reçu ses 17 images et ses
 * 4 relectures avec la consigne d'avant (sans la ligne des étiquettes), puis s'est arrêtée sur une coupure à la reprise de
 * produit-3. Le rejugement gratuit garde 8 images ; la reprise suivante ne repaie aucune image gardée, range à part les
 * reprises reçues avec la consigne d'avant et refait seulement les 9 images encore refusées, avec la consigne corrigée.
 *
 * Appels SIMULÉS (aucun appel payant), sur l'inventaire et les verdicts réels de Mouture (tests/fixtures/torrefacteur-planche-en-vrai).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";

const F = "tests/fixtures/torrefacteur-planche-en-vrai";

describe("REJUGER=1 puis REPRENDRE=1 sur la passe de Mouture (appels simulés)", async () => {
  const billing = await import("@/lib/billing");
  const { withTrace } = await import("@/lib/ai/trace");
  const P = await import("@/lib/syna-agent/planche-en-vrai");
  const { setJsonSetting } = await import("@/lib/settings");
  const O = await import("../scripts/syna-recette/essai-planche-en-vrai-outil");
  await (await import("./tarif-logo-fixture")).tarifDuModeleDesLogos();

  const inventaire = P.InventaireSchema.parse(JSON.parse(fs.readFileSync(`${F}/inventaire-reponse.json`, "utf8")));
  const reels = new Map(P.GROUPES.flatMap((g) => (JSON.parse(fs.readFileSync(`${F}/${g}-1-verdict.json`, "utf8")).verdict as import("@/lib/syna-agent/planche-en-vrai").RelectureDuGroupe).images.map((v) => [v.case, v] as const)));
  const appels: string[] = [], textes = new Map<string, string>();
  const paye = (q: { userId: string; jobId: string }, max: number, task: string) =>
    withTrace({ jobId: q.jobId }, async () => { const rid = billing.reserve(q.userId, max, { task, provider: "openai", model: "simule", jobId: q.jobId }); billing.settle(rid, Math.round(max / 2), null, task); });
  const simule = (panneA?: string) => (q: { userId: string; projectId: string; jobId: string }) => ({
    inventaire: async () => { appels.push("inventaire"); await paye(q, 100_000, "quality_control"); return inventaire; },
    refaire: async (d: { element: string; texte: string; taille: string; jointes: { role: string; data: Buffer }[] }, cle: string) => {
      appels.push(`image:${cle}`); textes.set(cle, d.texte);
      if (cle === panneA) throw new Error("Résultat incertain chez openai:simule (Connection error.) : coût maximal retenu par prudence, aucune relance automatique.");
      await paye(q, 50_000, "image_generation");
      const [w, h] = d.taille.split("x").map(Number);
      return { png: await sharp(d.jointes.find((j) => j.role === "apercu")!.data).resize(w, h, { fit: "fill" }).png().toBuffer(), recu: null };
    },
    // Premier essai : les verdicts réels. Reprise : une image fidèle, ses textes ceux de l'aperçu.
    relire: async (images: { label: string }[], _demande: string, cle: string) => {
      appels.push(`relecture:${cle}`); await paye(q, 60_000, "quality_control");
      const cases = images.map((im) => im.label).filter((l) => l.endsWith(" refaite")).map((l) => l.replace(/ refaite$/, ""));
      return { images: cases.map((c) => (cle.endsWith("-r1") ? {
        case: c, identique: true, textesLus: P.caseLue(inventaire, c)?.textes ?? [], logoPresent: !!P.caseLue(inventaire, c)?.logo, personne: false,
        logoFonceSurFondSombre: false, produitFidele: null, texteCoupe: false, note: 9, pourquoi: "simulé", inventes: [],
      } : reels.get(c)!)) };
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
  afterEach(() => { for (const d of dossiers.splice(0)) fs.rmSync(d, { recursive: true, force: true }); appels.length = 0; textes.clear(); delete process.env.STUDIO_ESSAI_PLAFOND_EUROS; delete process.env.STUDIO_ESSAI_DEBUT; setJsonSetting(P.REGLAGE_PLANCHE_EN_VRAI, false); });

  it("8 images gardées sans appel, 9 refaites une fois avec la ligne des étiquettes et sans texte inventé, les reprises d'avant rangées à part, la planche assemblée", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rejuger-reprendre-"));
    dossiers.push(dir);
    const planche = path.join(dir, "planche-A-gardee.png"), logo = path.join(dir, "esquisse-11-logo-garde.png"), sortie = path.join(dir, "sortie");
    fs.writeFileSync(planche, await sharp(`${F}/apercu-planche-A-gardee.jpg`).resize(1536, 2304, { fit: "fill" }).png().toBuffer());
    fs.writeFileSync(logo, await sharp(`${F}/logo-joint.png`).resize(512).png().toBuffer());
    const client = O.clientDeLEssai({ CLIENT_JSON: "scripts/syna-recette/clients/torrefacteur.json", CLIENT_NOM: "Mouture" });
    const donnees = O.donneesDeLaPlanche(client, { RESULTAT_PLANCHE: `${F}/planche-A-resultat.json` });
    const base = { sortie, plafondEuros: "10", planche, logo, client, donnees, logoHd: true, aiLogos: logos as never };

    // La passe d'essai : les 17 images et les 4 relectures, puis la coupure sur la reprise de produit-3.
    const r1 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule("produit-3-r1") as never });
    expect(r1.arret).toMatch(/Résultat incertain/);
    expect(appels.filter((a) => a.endsWith("-r1") && a.startsWith("image:"))).toEqual(["image:publication-4x5-r1", "image:site-telephone-r1", "image:produit-1-r1", "image:produit-2-r1", "image:produit-3-r1"]);
    // Comme à l'essai réel : ses textes envoyés étaient ceux d'avant la ligne des étiquettes, et ses reprises nommaient les inventions.
    for (const f of fs.readdirSync(path.join(sortie, "cases")).filter((x) => x.endsWith("-texte-envoye.txt"))) {
      const p = path.join(sortie, "cases", f), t = fs.readFileSync(p, "utf8");
      fs.writeFileSync(p, /-2-texte-envoye/.test(f) ? `${P.texteSansLaLigneDesTextes(t, client.produits)} (consigne d'avant)` : P.texteSansLaLigneDesTextes(t, client.produits));
    }

    // Sans rejugement, la reprise refuse avant tout appel : les reprises reçues ne correspondent plus.
    appels.length = 0;
    const refusee = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule() as never, reprendre: true });
    expect(refusee.arret).toMatch(/REJUGER=1 dit lesquelles refaire/);
    expect(appels.filter((a) => a.startsWith("image:") || a === "inventaire")).toEqual([]);

    // Le rejugement gratuit.
    appels.length = 0;
    const rj = await O.rejugerLEssaiEnVrai({ sortie, client, donnees, logoHd: true });
    expect(appels).toEqual([]);
    expect(rj.gardees.map((g) => g.element)).toEqual(["publication-1x1", "publication-9x16", "ouverture-site", "ouverture-planche", "site-ordinateur", "reference-1", "reference-2", "reference-3"]);
    expect(rj.perimees).toEqual(["publication-4x5-2", "site-telephone-2", "produit-1-2", "produit-2-2"]);

    // La reprise : aucune image gardée redemandée, les 9 refusées refaites une fois, relues, LOGO_HD, l'assemblage.
    appels.length = 0;
    const r3 = await O.essaiDeLaPlancheEnVrai({ ...base, ai: simule() as never, reprendre: true });
    expect(r3.arret).toBeUndefined();
    expect(appels).not.toContain("inventaire");
    expect(appels.filter((a) => a.startsWith("image:"))).toEqual(rj.aRefaire.map((x) => `image:${x.element}-r1`));
    expect(appels.filter((a) => a.startsWith("relecture:"))).toEqual(["relecture:relecture-publications-r1", "relecture:relecture-site-r1", "relecture:relecture-produits-r1", "relecture:relecture-references-r1"]);
    for (const x of rj.aRefaire) {
      const t = textes.get(`${x.element}-r1`)!;
      expect(t, x.element).toContain(P.ligneDesTextesEnVrai(client.produits));
      for (const interdit of ["ARABY", "PÉROU", "100%", "ARABICA", "BRÉSIL", "1928", "SIGNATURE"]) expect(t, `${x.element} : ${interdit}`).not.toContain(interdit);
    }
    const n = rj.perimees.length + 0;
    expect(fs.readdirSync(path.join(sortie, `passe-${rj.passe}`, "cases-perimees")).filter((f) => f.endsWith("-hd.png"))).toHaveLength(n);
    expect(r3.cases.filter((c) => c.gardee).length).toBe(17);
    expect(r3.planche).toMatchObject({ w: 3072, h: 4608 });
    expect(r3.reprise!.ecarts.join("\n")).toMatch(/image reçue avant la ligne des étiquettes, reprise telle quelle/);
  }, 600_000);
});
